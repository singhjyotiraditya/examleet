import { prisma } from "@/lib/prisma";
import { computeDelta as computeDeltaFormula, type DeltaOpts } from "@/lib/ratingFormula";

const RATING_FLOOR = 800;

export function computeDelta(opts: DeltaOpts): number {
  return computeDeltaFormula(opts);
}

export async function applyPracticeRating(
  userId: string,
  delta: number
): Promise<{ newRating: number; actualDelta: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rating: true },
  });
  if (!user) return { newRating: 1200, actualDelta: delta };

  const newRating = Math.max(RATING_FLOOR, user.rating + delta);
  const actualDelta = newRating - user.rating;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { rating: newRating, ratingDelta: actualDelta },
    }),
    prisma.ratingHistory.create({
      data: { userId, rating: newRating, delta: actualDelta },
    }),
  ]);

  return { newRating, actualDelta };
}

// Rating system explanation for the UI info tooltip
export const RATING_SYSTEM_DESCRIPTION = {
  start: 1200,
  floor: 800,
  maxGain: 40,
  maxLoss: 25,
  factors: [
    { name: "Correctness", desc: "Correct → positive delta. Wrong → negative (proportional to how likely you were to get it right)." },
    { name: "Difficulty", desc: "Easy questions → smaller swing. Hard questions → bigger swing. Solving a Hard question correctly is worth far more than an Easy one." },
    { name: "Speed", desc: "Finishing in under half the community average time gives +30% weight. Twice as slow gives −30% weight." },
    { name: "Question type", desc: "Numerical questions carry a 15% weight bonus — they cannot be guessed, so they're a stronger signal of mastery." },
    { name: "Hints used", desc: "Using 1 hint before submitting reduces your gain by 15%. Using 2 hints reduces it by 30%. The last hint is locked until after you submit — it never counts against you." },
    { name: "Rating decay", desc: "Your rating does not passively decay. However, if others improve while you stay idle, your percentile rank will naturally fall." },
  ],
};
