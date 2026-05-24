import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function create(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export async function update(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

export async function upsert(id: string, createData: Prisma.UserCreateInput) {
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: createData,
  });
}

export async function getProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      userBadges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
      userSetProgress: { include: { set: true } },
      ratingHistory: { orderBy: { recordedAt: "asc" }, take: 30 },
    },
  });
}

/** Unique questions attempted vs unique questions answered correctly */
export async function getSolveCounts(userId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    select: { questionId: true, isCorrect: true },
  });
  const attempted = new Set<string>();
  const correct = new Set<string>();
  for (const a of attempts) {
    attempted.add(a.questionId);
    if (a.isCorrect) correct.add(a.questionId);
  }
  return { attempted: attempted.size, correct: correct.size };
}

export async function getStats(id: string) {
  const [attempts, activity] = await Promise.all([
    prisma.attempt.aggregate({
      where: { userId: id },
      _count: { id: true },
      _sum: { timeTakenSec: true },
    }),
    prisma.dailyActivity.findMany({
      where: { userId: id },
      orderBy: { activityDate: "desc" },
      take: 90,
    }),
  ]);

  const correctAttempts = await prisma.attempt.count({
    where: { userId: id, isCorrect: true },
  });

  return {
    totalAttempts: attempts._count.id,
    correctAttempts,
    accuracy: attempts._count.id > 0
      ? Math.round((correctAttempts / attempts._count.id) * 100)
      : 0,
    totalTimeSpentSec: attempts._sum.timeTakenSec ?? 0,
    recentActivity: activity,
  };
}

export async function getLeaderboard(limit = 50, offset = 0) {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      handle: true,
      city: true,
      rating: true,
      rankAllIndia: true,
      totalSolved: true,
      streakCurrent: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { rating: "desc" },
    take: limit,
    skip: offset,
  });
}
