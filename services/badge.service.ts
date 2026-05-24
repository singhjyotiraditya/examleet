import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findAll() {
  return prisma.badge.findMany({ orderBy: { conditionValue: "asc" } });
}

export async function findById(id: string) {
  return prisma.badge.findUnique({ where: { id } });
}

export async function create(data: Prisma.BadgeCreateInput) {
  return prisma.badge.create({ data });
}

export async function getUserBadges(userId: string) {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });
}

export async function awardBadge(userId: string, badgeId: string) {
  return prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId } },
    create: { userId, badgeId },
    update: {},
  });
}

// Check and award any eligible badges after an attempt
export async function checkAndAward(userId: string) {
  const [badges, userStats] = await Promise.all([
    prisma.badge.findMany(),
    prisma.attempt.aggregate({
      where: { userId },
      _count: { id: true },
    }),
  ]);

  const alreadyEarned = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const earnedIds = new Set(alreadyEarned.map((b) => b.badgeId));

  const toAward = badges.filter((badge) => {
    if (earnedIds.has(badge.id)) return false;
    if (badge.conditionType === "attempts_count") {
      return userStats._count.id >= badge.conditionValue;
    }
    return false;
  });

  if (toAward.length > 0) {
    await prisma.userBadge.createMany({
      data: toAward.map((b) => ({ userId, badgeId: b.id })),
      skipDuplicates: true,
    });
  }

  return toAward;
}
