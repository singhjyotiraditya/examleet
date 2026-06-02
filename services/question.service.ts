import { prisma } from "@/lib/prisma";
import { combineSeed, seededShuffle } from "@/lib/seededShuffle";
import { computeForYouPrimary, forYouFeedMode } from "@/lib/for-you";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

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

function applyExamFilter(conditions: Prisma.QuestionWhereInput, exam?: string) {
  if (!exam) return;
  const e = exam.toLowerCase();
  if (e === "mains" || e === "jee_mains") {
    conditions.exam = { contains: "Mains", mode: "insensitive" };
  } else if (e === "advanced" || e === "adv" || e === "jee_adv") {
    conditions.exam = { contains: "Advanced", mode: "insensitive" };
  } else {
    conditions.exam = { contains: exam, mode: "insensitive" };
  }
}

export async function findMany(filters: QuestionFilters = {}) {
  const { limit = 20, offset = 0, q, userId, seed, exam, ...where } = filters;
  const { verified, year, subject, ...rest } = where;

  const conditions: Prisma.QuestionWhereInput = { ...rest };
  if (verified !== undefined) conditions.verified = verified;
  if (year !== undefined) conditions.year = year;
  applyExamFilter(conditions, exam);
  if (q) {
    const trimmed = q.trim();
    const or: Prisma.QuestionWhereInput[] = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { chapter: { contains: trimmed, mode: "insensitive" } },
      { topic: { contains: trimmed, mode: "insensitive" } },
      { code: { contains: trimmed, mode: "insensitive" } },
      { exam: { contains: trimmed, mode: "insensitive" } },
    ];
    if (/^\d{4}$/.test(trimmed)) or.push({ year: Number(trimmed) });
    conditions.OR = or;
  }

  // No subject filter → random mix (no phy / chem / math interleaving)
  if (!subject) {
    const [total, idRows] = await Promise.all([
      prisma.question.count({ where: conditions }),
      prisma.question.findMany({
        where: conditions,
        select: { id: true },
        take: 500,
      }),
    ]);

    const filterKey = JSON.stringify({
      q: q ?? null,
      verified: verified ?? null,
      year: year ?? null,
      exam: exam ?? null,
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

export async function getStats(subject?: string, userId?: string) {
  const groups = await prisma.question.groupBy({
    by: ["subject", "chapter"],
    where: subject ? { subject } : undefined,
    _count: { id: true },
    orderBy: [{ subject: "asc" }, { chapter: "asc" }],
  });

  const stats: Record<string, { total: number; solved: number; chapters: Record<string, number> }> = {};
  for (const g of groups) {
    if (!stats[g.subject]) stats[g.subject] = { total: 0, solved: 0, chapters: {} };
    stats[g.subject].total += g._count.id;
    stats[g.subject].chapters[g.chapter] = g._count.id;
  }

  if (userId) {
    const where = subject ? { userId, question: { subject } } : { userId };
    const solvedGroups = await prisma.attempt.groupBy({
      by: ["questionId"],
      where: { ...where, isCorrect: true },
      _count: { questionId: true },
    });
    const solvedQuestionIds = solvedGroups.map(g => g.questionId);
    if (solvedQuestionIds.length > 0) {
      const questions = await prisma.question.findMany({
        where: { id: { in: solvedQuestionIds } },
        select: { subject: true },
      });
      for (const q of questions) {
        if (stats[q.subject]) stats[q.subject].solved++;
      }
    }
  }

  return stats;
}

// ─── PYQ Browser data ───────────────────────────────────────────────────────

const HIST_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

type QuestionGroup = { subject: string; chapter: string; year: number; _count: { id: number } };
type YearGroup = { year: number; exam: string; _count: { id: number } };

const getCachedQuestionGroups = unstable_cache(
  async () => {
    const rows = await prisma.question.groupBy({
      by: ["subject", "chapter", "year"],
      _count: { id: true },
      orderBy: [{ subject: "asc" }, { chapter: "asc" }, { year: "asc" }],
    });
    return rows as QuestionGroup[];
  },
  ["pyq-question-groups"],
  { revalidate: 300 }
);

const getCachedYearGroups = unstable_cache(
  async () => {
    const rows = await prisma.question.groupBy({
      by: ["year", "exam"],
      _count: { id: true },
      where: { year: { gte: 2015, lte: 2025 } },
      orderBy: { year: "desc" },
    });
    return rows as YearGroup[];
  },
  ["pyq-year-groups"],
  { revalidate: 300 }
);

export interface ChapterStat {
  name: string;
  total: number;
  /** Distinct questions answered correctly at least once */
  solved: number;
  /** Distinct questions with any submission */
  attempted: number;
  /** Coverage: correct / total PYQs in chapter */
  pct: number;
  /** Accuracy on attempted questions; null when attempted === 0 */
  accuracyPct: number | null;
  mastery: "Beginner" | "Intermediate" | "Advanced";
  hist: number[];
}
export interface SubjectPYQStat {
  name: string;
  total: number;
  solved: number;
  attempted: number;
  chapters: ChapterStat[];
}

export interface PYQStatsPayload {
  subjects: Record<string, SubjectPYQStat>;
  solvedPyqs: number;
  attemptedPyqs: number;
}

export async function getPYQStats(userId?: string): Promise<PYQStatsPayload> {
  const groups = await getCachedQuestionGroups();

  const subjectData: Record<string, Record<string, { total: number; hist: number[] }>> = {};
  for (const g of groups) {
    if (!subjectData[g.subject]) subjectData[g.subject] = {};
    if (!subjectData[g.subject][g.chapter])
      subjectData[g.subject][g.chapter] = { total: 0, hist: new Array(HIST_YEARS.length).fill(0) };
    const ch = subjectData[g.subject][g.chapter];
    ch.total += g._count.id;
    const yIdx = HIST_YEARS.indexOf(g.year);
    if (yIdx >= 0) ch.hist[yIdx] += g._count.id;
  }

  const solvedPerChapter: Record<string, Record<string, number>> = {};
  const attemptedPerChapter: Record<string, Record<string, number>> = {};

  if (userId) {
    const attempts = await prisma.attempt.findMany({
      where: { userId },
      select: { questionId: true, isCorrect: true },
    });
    if (attempts.length > 0) {
      const correctIds = new Set<string>();
      const attemptedIds = new Set<string>();
      for (const a of attempts) {
        attemptedIds.add(a.questionId);
        if (a.isCorrect) correctIds.add(a.questionId);
      }
      const qs = await prisma.question.findMany({
        where: { id: { in: [...attemptedIds] } },
        select: { id: true, subject: true, chapter: true },
      });
      for (const q of qs) {
        if (!attemptedPerChapter[q.subject]) attemptedPerChapter[q.subject] = {};
        attemptedPerChapter[q.subject][q.chapter] = (attemptedPerChapter[q.subject][q.chapter] ?? 0) + 1;
        if (correctIds.has(q.id)) {
          if (!solvedPerChapter[q.subject]) solvedPerChapter[q.subject] = {};
          solvedPerChapter[q.subject][q.chapter] = (solvedPerChapter[q.subject][q.chapter] ?? 0) + 1;
        }
      }
    }
  }

  const NAMES: Record<string, string> = { phy: "Physics", chem: "Chemistry", math: "Maths" };
  const subjects: Record<string, SubjectPYQStat> = {};
  let solvedPyqs = 0;
  let attemptedPyqs = 0;

  for (const [subj, chapters] of Object.entries(subjectData)) {
    let subjTotal = 0;
    let subjSolved = 0;
    let subjAttempted = 0;
    const chapterList: ChapterStat[] = [];
    for (const [name, data] of Object.entries(chapters)) {
      const solved = solvedPerChapter[subj]?.[name] ?? 0;
      const attempted = attemptedPerChapter[subj]?.[name] ?? 0;
      const pct = data.total > 0 ? Math.round((solved / data.total) * 100) : 0;
      const accuracyPct = attempted > 0 ? Math.round((solved / attempted) * 100) : null;
      const mastery: ChapterStat["mastery"] = pct >= 60 ? "Advanced" : pct >= 25 ? "Intermediate" : "Beginner";
      subjTotal += data.total;
      subjSolved += solved;
      subjAttempted += attempted;
      chapterList.push({ name, total: data.total, solved, attempted, pct, accuracyPct, mastery, hist: data.hist });
    }
    solvedPyqs += subjSolved;
    attemptedPyqs += subjAttempted;
    subjects[subj] = {
      name: NAMES[subj] ?? subj,
      total: subjTotal,
      solved: subjSolved,
      attempted: subjAttempted,
      chapters: chapterList,
    };
  }
  return { subjects, solvedPyqs, attemptedPyqs };
}

export async function getForYouFeed(userId?: string) {
  const { subjects, solvedPyqs, attemptedPyqs } = await getPYQStats(userId);
  const primary = computeForYouPrimary(subjects, solvedPyqs, attemptedPyqs);
  const mode = forYouFeedMode(attemptedPyqs);

  const freshResult = await findMany({ year: 2024, limit: 12, userId });
  const fresh = freshResult.items.filter(q => !(q as { solved?: boolean }).solved);

  return {
    primary,
    fresh: fresh.slice(0, 6),
    mode,
    solvedPyqs,
    attemptedPyqs,
  };
}

export interface YearStat {
  year: number;
  mains: { total: number; solved: number };
  advanced: { total: number; solved: number };
}

export async function getPYQYears(userId?: string): Promise<YearStat[]> {
  const groups = await getCachedYearGroups();

  const solvedMap: Record<string, number> = {};
  if (userId) {
    const attempts = await prisma.attempt.findMany({
      where: { userId, isCorrect: true },
      select: { questionId: true },
      distinct: ["questionId"],
    });
    if (attempts.length > 0) {
      const qs = await prisma.question.findMany({
        where: { id: { in: attempts.map(a => a.questionId) }, year: { gte: 2015, lte: 2025 } },
        select: { year: true, exam: true },
      });
      for (const q of qs) {
        const k = `${q.year}::${q.exam}`;
        solvedMap[k] = (solvedMap[k] ?? 0) + 1;
      }
    }
  }

  const yearMap: Record<number, { mains: { total: number; solved: number }; advanced: { total: number; solved: number } }> = {};
  for (const g of groups) {
    if (!yearMap[g.year]) yearMap[g.year] = { mains: { total: 0, solved: 0 }, advanced: { total: 0, solved: 0 } };
    const isAdv = g.exam.toLowerCase().includes("advanced");
    const type = isAdv ? "advanced" : "mains";
    yearMap[g.year][type].total += g._count.id;
    yearMap[g.year][type].solved += solvedMap[`${g.year}::${g.exam}`] ?? 0;
  }

  return Object.entries(yearMap)
    .map(([year, data]) => ({ year: Number(year), ...data }))
    .sort((a, b) => b.year - a.year);
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

export interface QuestionReport {
  userId?: string;
  category: string;
  text: string;
  reportedAt: string;
}

export async function addReport(id: string, report: Omit<QuestionReport, "reportedAt">) {
  const q = await prisma.question.findUnique({ where: { id }, select: { reports: true } });
  if (!q) return null;
  const existing = Array.isArray(q.reports) ? (q.reports as unknown[]) : [];
  const entry: QuestionReport = { ...report, reportedAt: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.question.update({ where: { id }, data: { reports: [...existing, entry] as any } });
  return true;
}

