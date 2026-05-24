import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findById(id: string) {
  return prisma.problemSet.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          question: {
            select: {
              id: true, subject: true, chapter: true, difficulty: true,
              title: true, body: true, options: true,
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
}

export async function findMany(
  subject?: string,
  isCurated?: boolean,
  limit = 20,
  offset = 0
) {
  const where: Prisma.ProblemSetWhereInput = {};
  if (subject) where.subject = subject;
  if (isCurated !== undefined) where.isCurated = isCurated;

  const [items, total] = await Promise.all([
    prisma.problemSet.findMany({
      where,
      orderBy: [{ isCurated: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.problemSet.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function create(data: Prisma.ProblemSetCreateInput) {
  return prisma.problemSet.create({ data });
}

export async function addQuestion(setId: string, questionId: string, orderIndex: number) {
  return prisma.problemSetQuestion.create({
    data: { setId, questionId, orderIndex },
  });
}

export async function removeQuestion(setId: string, questionId: string) {
  return prisma.problemSetQuestion.delete({
    where: { setId_questionId: { setId, questionId } },
  });
}

export async function getProgress(setId: string, userId: string) {
  return prisma.userSetProgress.findUnique({
    where: { userId_setId: { userId, setId } },
  });
}

export async function updateProgress(
  setId: string,
  userId: string,
  isCorrect: boolean
) {
  const set = await prisma.problemSet.findUnique({ where: { id: setId } });
  if (!set) throw new Error("Problem set not found");

  const existing = await prisma.userSetProgress.findUnique({
    where: { userId_setId: { userId, setId } },
  });

  const newSolvedCount = (existing?.solvedCount ?? 0) + 1;
  const newCorrectCount = (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0);
  const completed = newSolvedCount >= set.totalQuestions;

  return prisma.userSetProgress.upsert({
    where: { userId_setId: { userId, setId } },
    create: {
      userId, setId,
      solvedCount: newSolvedCount,
      correctCount: newCorrectCount,
      lastAttemptedAt: new Date(),
      completed,
    },
    update: {
      solvedCount: { increment: 1 },
      correctCount: { increment: isCorrect ? 1 : 0 },
      lastAttemptedAt: new Date(),
      completed,
    },
  });
}
