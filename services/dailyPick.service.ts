import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { enrichWithUserProgress, QUESTION_SELECT } from "./question.service";

/** Deterministic index from calendar day (UTC) — same pick for everyone each day */
function daySeed(date: Date): number {
  const [y, m, d] = date.toISOString().slice(0, 10).split("-").map(Number);
  return ((y * 372 + m * 31 + d) | 0) >>> 0;
}

function seededOffset(seed: number, total: number): number {
  let s = seed ^ 0x9e3779b9;
  s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
  s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
  return ((s ^ (s >>> 16)) >>> 0) % total;
}

// Cache the base question per UTC date — same for all users, changes once per day
const getCachedDailyQuestion = unstable_cache(
  async (dateStr: string) => {
    const forDate = new Date(dateStr);
    const where = { difficulty: { in: ["Medium", "Hard"] } };
    const total = await prisma.question.count({ where });
    if (total === 0) return null;
    const offset = seededOffset(daySeed(forDate), total);
    const rows = await prisma.question.findMany({
      where,
      orderBy: { code: "asc" },
      skip: offset,
      take: 1,
      select: QUESTION_SELECT,
    });
    return rows[0] ?? null;
  },
  ["daily-pick-question"],
  { revalidate: 86400 }
);

/** Today's featured question — Medium or Hard only, stable per UTC day */
export async function getToday(userId?: string, forDate = new Date()) {
  const dateStr = forDate.toISOString().slice(0, 10);
  const q = await getCachedDailyQuestion(dateStr);
  if (!q) return null;

  if (userId) {
    const [enriched] = await enrichWithUserProgress([q], userId);
    return enriched;
  }
  return { ...q, solved: false, answeredCorrect: false };
}
