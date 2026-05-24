import { prisma } from "@/lib/prisma";
import { combineSeed, seededShuffle } from "@/lib/seededShuffle";
import { Prisma } from "@prisma/client";

export interface QuestionFilters {
  q?: string;
  exam?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  year?: number;
  verified?: boolean;
  limit?: number;
  offset?: number;
  userId?: string;
  /** Client session seed — keeps randomized list order stable across requests. */
  seed?: number;
}

export async function findById(id: string, includeHints = false) {
  return prisma.question.findUnique({
    where: { id },
    include: { hints: includeHints ? { orderBy: { orderIndex: "asc" } } : false },
  });
}

export const QUESTION_SELECT = {
  id: true, code: true, title: true, exam: true, year: true, subject: true,
  chapter: true, topic: true, difficulty: true, body: true,
  figure: true, options: true, correct: true, tags: true,
  marksCorrect: true, marksWrong: true, attemptCount: true,
  correctCount: true, verified: true,
} as const;

/** `solved` = attempted; `answeredCorrect` = got right at least once */
export async function enrichWithUserProgress<T extends { id: string }>(
  items: T[],
  userId: string
): Promise<(T & { solved: boolean; answeredCorrect: boolean })[]> {
  if (items.length === 0) return [];
  const ids = items.map(i => i.id);
  const attempts = await prisma.attempt.findMany({
    where: { userId, questionId: { in: ids } },
    select: { questionId: true, isCorrect: true },
  });
  const attempted = new Set<string>();
  const answeredCorrect = new Set<string>();
  for (const a of attempts) {
    attempted.add(a.questionId);
    if (a.isCorrect) answeredCorrect.add(a.questionId);
  }
  return items.map(i => ({
    ...i,
    solved: attempted.has(i.id),
    answeredCorrect: answeredCorrect.has(i.id),
  }));
}

export async function findMany(filters: QuestionFilters = {}) {
  const { limit = 20, offset = 0, q, userId, seed, ...where } = filters;
  const { verified, year, subject, ...rest } = where;

  const conditions: Prisma.QuestionWhereInput = { ...rest };
  if (verified !== undefined) conditions.verified = verified;
  if (year !== undefined) conditions.year = year;
  if (q) {
    conditions.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { chapter: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
    ];
  }

  // No subject filter → random mix (no phy / chem / math interleaving)
  if (!subject) {
    const [total, idRows] = await Promise.all([
      prisma.question.count({ where: conditions }),
      prisma.question.findMany({
        where: conditions,
        select: { id: true },
      }),
    ]);

    const filterKey = JSON.stringify({
      q: q ?? null,
      verified: verified ?? null,
      year: year ?? null,
      exam: rest.exam ?? null,
      chapter: rest.chapter ?? null,
      topic: rest.topic ?? null,
      difficulty: rest.difficulty ?? null,
    });
    const shuffleSeed = combineSeed(seed ?? 1, filterKey);
    const pageIds = seededShuffle(idRows, shuffleSeed).slice(offset, offset + limit).map(r => r.id);
    let items = pageIds.length
      ? await prisma.question.findMany({
          where: { id: { in: pageIds } },
          select: QUESTION_SELECT,
        })
      : [];
    const order = new Map(pageIds.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    if (userId) items = await enrichWithUserProgress(items, userId);
    return { items, total, limit, offset };
  }

  // Subject-filtered → single query
  conditions.subject = subject;
  const [rawItems, total] = await Promise.all([
    prisma.question.findMany({
      where: conditions,
      orderBy: { attemptCount: "desc" },
      take: limit,
      skip: offset,
      select: QUESTION_SELECT,
    }),
    prisma.question.count({ where: conditions }),
  ]);

  let items = rawItems;
  if (userId) items = await enrichWithUserProgress(items, userId);

  return { items, total, limit, offset };
}

export async function create(data: Prisma.QuestionCreateInput) {
  return prisma.question.create({ data });
}

export async function update(id: string, data: Prisma.QuestionUpdateInput) {
  return prisma.question.update({ where: { id }, data });
}

export async function remove(id: string) {
  return prisma.question.delete({ where: { id } });
}

export async function getHints(questionId: string) {
  return prisma.hint.findMany({
    where: { questionId },
    orderBy: { orderIndex: "asc" },
  });
}

export async function addHint(data: Prisma.HintCreateInput) {
  return prisma.hint.create({ data });
}

export async function getSolution(questionId: string) {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: { solution: true, correctOptions: true },
  });
}

export async function getStats(subject?: string) {
  const groups = await prisma.question.groupBy({
    by: ["subject", "chapter"],
    where: subject ? { subject } : undefined,
    _count: { id: true },
    orderBy: [{ subject: "asc" }, { chapter: "asc" }],
  });

  const stats: Record<string, { total: number; chapters: Record<string, number> }> = {};
  for (const g of groups) {
    if (!stats[g.subject]) stats[g.subject] = { total: 0, chapters: {} };
    stats[g.subject].total += g._count.id;
    stats[g.subject].chapters[g.chapter] = g._count.id;
  }
  return stats;
}

export async function incrementAttemptCount(id: string, isCorrect: boolean) {
  return prisma.question.update({
    where: { id },
    data: {
      attemptCount: { increment: 1 },
      ...(isCorrect ? { correctCount: { increment: 1 } } : {}),
    },
  });
}
