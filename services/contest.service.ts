import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

export async function findById(id: string) {
  return prisma.contest.findUnique({ where: { id } });
}

const getCachedContests = unstable_cache(
  async (status: string, limit: number, offset: number) => {
    const where: Prisma.ContestWhereInput = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.contest.findMany({ where, orderBy: { startsAt: "asc" }, take: limit, skip: offset }),
      prisma.contest.count({ where }),
    ]);
    return { items, total, limit, offset };
  },
  ["contests-list"],
  { revalidate: 300 }
);

export async function findMany(status?: string, limit = 20, offset = 0) {
  return getCachedContests(status ?? "", limit, offset);
}

export async function create(data: Prisma.ContestCreateInput) {
  return prisma.contest.create({ data });
}

export async function update(id: string, data: Prisma.ContestUpdateInput) {
  return prisma.contest.update({ where: { id }, data });
}

export async function register(contestId: string, userId: string) {
  const [contest] = await Promise.all([
    prisma.contest.findUnique({ where: { id: contestId } }),
    prisma.contestRegistration.findUnique({
      where: { contestId_userId: { contestId, userId } },
    }),
  ]);

  if (!contest) throw new Error("Contest not found");
  if (contest.status !== "upcoming") throw new Error("Registration closed");

  const registration = await prisma.contestRegistration.create({
    data: { contestId, userId },
  });

  await prisma.contest.update({
    where: { id: contestId },
    data: { participantCount: { increment: 1 } },
  });

  return registration;
}

export async function unregister(contestId: string, userId: string) {
  await prisma.contestRegistration.delete({
    where: { contestId_userId: { contestId, userId } },
  });
  await prisma.contest.update({
    where: { id: contestId },
    data: { participantCount: { decrement: 1 } },
  });
}

export async function getRegistration(contestId: string, userId: string) {
  return prisma.contestRegistration.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });
}

export async function getLeaderboard(contestId: string) {
  return prisma.contestRegistration.findMany({
    where: { contestId, finalRank: { not: null } },
    include: { user: { select: { id: true, name: true, city: true } } },
    orderBy: { finalRank: "asc" },
    take: 100,
  });
}
