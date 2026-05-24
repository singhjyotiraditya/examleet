// Pure rating math — no Prisma, safe to import in client components.
// The server-side rating.service.ts imports from here to stay in sync.

export const QUESTION_RATING: Record<string, number> = {
  Easy: 900,
  Medium: 1300,
  Hard: 1600,
};

export const K_BASE = 32;

/** Rating swing multiplier when solving today's daily pick (first rated attempt) */
export const DAILY_PICK_RATING_WEIGHT = 1.5;

// Gain multiplier per hint used before submitting (only applied on correct answers)
export const HINT_GAIN_MULT: Record<number, number> = { 0: 1.0, 1: 0.85, 2: 0.70 };

export function eloExpected(userRating: number, qRating: number): number {
  return 1 / (1 + Math.pow(10, (qRating - userRating) / 400));
}

export function timeFactor(takenSec: number, avgSec: number): number {
  if (avgSec <= 0) return 1.0;
  const r = takenSec / avgSec;
  if (r <= 0.5) return 1.3;
  if (r <= 0.8) return 1.15;
  if (r <= 1.2) return 1.0;
  if (r <= 2.0) return 0.85;
  return 0.7;
}

export interface DeltaOpts {
  userRating: number;
  difficulty: string;
  isCorrect: boolean;
  isNumerical: boolean;
  timeTakenSec: number | null;
  avgTimeSec: number | null;
  hintsUsed?: number;
  ratingWeight?: number;
}

export function computeDelta(opts: DeltaOpts): number {
  const qRating = QUESTION_RATING[opts.difficulty] ?? 1300;
  const exp = eloExpected(opts.userRating, qRating);
  const actual = opts.isCorrect ? 1 : 0;
  const typeMult = opts.isNumerical ? 1.15 : 1.0;
  const tFactor =
    opts.timeTakenSec != null && opts.avgTimeSec != null
      ? timeFactor(opts.timeTakenSec, opts.avgTimeSec)
      : 1.0;
  const K = K_BASE * typeMult * tFactor;
  const raw = K * (actual - exp);
  const hints = Math.min(opts.hintsUsed ?? 0, 2);
  const hintMult = opts.isCorrect ? (HINT_GAIN_MULT[hints] ?? 0.7) : 1.0;
  const weight = opts.ratingWeight ?? 1;
  return Math.max(-25, Math.min(40, Math.round(raw * hintMult * weight)));
}

// Convenience: compute both correct and wrong outcomes at once
export function computePreview(opts: Omit<DeltaOpts, "isCorrect">): {
  correct: number;
  wrong: number;
} {
  return {
    correct: computeDelta({ ...opts, isCorrect: true }),
    wrong: computeDelta({ ...opts, isCorrect: false }),
  };
}
