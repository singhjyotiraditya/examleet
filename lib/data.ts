export const SUBJECTS = {
  phy:  { id: "phy",  name: "Physics",   short: "Phy",  color: "var(--phy)",  cls: "phy"  },
  chem: { id: "chem", name: "Chemistry", short: "Chem", color: "var(--chem)", cls: "chem" },
  math: { id: "math", name: "Maths",     short: "Math", color: "var(--math)", cls: "math" },
} as const;

export type SubjectId = keyof typeof SUBJECTS;

export interface Problem {
  id: string; code: string; title: string; subject: SubjectId; chapter: string;
  difficulty: "Easy" | "Medium" | "Hard"; exam: string; year: number;
  acceptance: number; avgTime: string; avgTimeSec: number; attempts: string;
  solved: boolean;
  answeredCorrect: boolean;
  bookmarked: boolean;
  body: string; figure?: { caption: string };
  options: { id: string; text: string }[];
  correct: string;
  hint: string;
  solution: string[];
  tags: string[];
}

export interface MasteryEntry {
  subject: SubjectId;
  pct: number;
  level: string;
  solved: number;
  total: number;
  trend: string;
}

export interface User {
  name: string;
  handle: string;
  city: string;
  joined: string;
  target: string;
  rating: number | string;
  rank: number | string;
  delta: string;
  solved: number;
  correct: number;
  total: number;
  streak: number;
  streakMax: number;
  todayMinutes: number;
  weeklyGoal: number;
  weeklyDone: number;
  badges: string[];
  mastery: MasteryEntry[];
  recent: Array<{ id: string; verdict: string; when: string }>;
  email?: string;
  authMethod?: string;
  signedUpAt?: string;
  examType?: string | null;
  currentLevel?: string | null;
  targetYear?: number | null;
  dailyGoalMinutes?: number;
}

// Maps a DB question (Prisma shape) to the Problem interface used by UI components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbQuestionToProblem(q: Record<string, any>): Problem {
  const attemptCount = q.attemptCount ?? 0;
  const correctCount = q.correctCount ?? 0;
  const acceptance = attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0;
  const avgSec = q.avgTimeSec ?? 0;
  const avgTime = avgSec > 0 ? `${Math.floor(avgSec / 60)}m ${avgSec % 60}s` : "—";
  const attStr = attemptCount >= 100000
    ? `${(attemptCount / 100000).toFixed(1)}L`
    : attemptCount >= 1000
      ? `${(attemptCount / 1000).toFixed(1)}k`
      : String(attemptCount);

  return {
    id: q.id,
    code: q.code,
    title: q.title,
    subject: q.subject as SubjectId,
    chapter: q.chapter,
    difficulty: q.difficulty as "Easy" | "Medium" | "Hard",
    exam: q.exam,
    year: q.year,
    acceptance,
    avgTime,
    avgTimeSec: avgSec,
    attempts: attStr,
    solved: Boolean(q.solved),
    answeredCorrect: Boolean(q.answeredCorrect),
    bookmarked: Boolean(q.bookmarked),
    body: q.body ?? q.questionText ?? "",
    figure: q.figure ?? undefined,
    options: (q.options as { id: string; text: string }[]) ?? [],
    correct: (q.correct as string) ?? "",
    hint: "",
    solution: (q.solution ?? q.solutionSteps ?? []) as string[],
    tags: (q.tags ?? []) as string[],
  };
}
