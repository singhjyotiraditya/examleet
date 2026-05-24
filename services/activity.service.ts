import { prisma } from "@/lib/prisma";

export async function recordAttempt(
  userId: string,
  isCorrect: boolean,
  timeTakenSec: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get yesterday's activity to compute streak
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [existing, yesterdayActivity] = await Promise.all([
    prisma.dailyActivity.findUnique({
      where: { userId_activityDate: { userId, activityDate: today } },
    }),
    prisma.dailyActivity.findUnique({
      where: { userId_activityDate: { userId, activityDate: yesterday } },
    }),
  ]);

  const streakDay = existing
    ? existing.streakDay
    : (yesterdayActivity ? yesterdayActivity.streakDay + 1 : 1);

  await prisma.dailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    create: {
      userId,
      activityDate: today,
      questionsSolved: 1,
      correctCount: isCorrect ? 1 : 0,
      timeSpentSec: timeTakenSec,
      streakDay,
    },
    update: {
      questionsSolved: { increment: 1 },
      correctCount: { increment: isCorrect ? 1 : 0 },
      timeSpentSec: { increment: timeTakenSec },
    },
  });
}

export async function getLast90Days(userId: string) {
  return getActivity(userId, 90);
}

export async function getActivity(userId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  return prisma.dailyActivity.findMany({
    where: { userId, activityDate: { gte: since } },
    orderBy: { activityDate: "asc" },
  });
}

export async function getCurrentStreak(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latest = await prisma.dailyActivity.findFirst({
    where: { userId },
    orderBy: { activityDate: "desc" },
  });

  if (!latest) return 0;
  return latest.streakDay;
}
