import type { ChapterStat, SubjectPYQStat } from "@/services/question.service";

export type ForYouReason = "start" | "weak" | "frequent" | "continue";

export type ChapterWithSubject = ChapterStat & {
  subjectId: string;
  subjectName: string;
};

export interface ForYouPrimaryPick {
  reason: ForYouReason;
  chapter: ChapterWithSubject;
  badge: string;
  icon: string;
  color: string;
  cta: string;
  hint: string;
  /** 0–100 for weak/continue accuracy; null = show exam-frequency instead */
  progressPct: number | null;
  progressLabel: string;
}

const REASON_STYLE: Record<
  ForYouReason,
  { badge: string; icon: string; color: string; cta: string }
> = {
  start: {
    badge: "START HERE",
    icon: "★",
    color: "var(--accent)",
    cta: "Start this chapter",
  },
  weak: {
    badge: "WEAK SPOT",
    icon: "⚡",
    color: "var(--hard)",
    cta: "Drill this chapter",
  },
  frequent: {
    badge: "HIGH YIELD",
    icon: "★",
    color: "var(--accent)",
    cta: "Practice this chapter",
  },
  continue: {
    badge: "KEEP GOING",
    icon: "↻",
    color: "var(--chem)",
    cta: "Continue chapter",
  },
};

function allChapters(pyqStats: Record<string, SubjectPYQStat>): ChapterWithSubject[] {
  const out: ChapterWithSubject[] = [];
  for (const [subjectId, sdata] of Object.entries(pyqStats)) {
    for (const ch of sdata.chapters) {
      out.push({ ...ch, subjectId, subjectName: sdata.name });
    }
  }
  return out;
}

/** PYQs in the last N years of the 2015–2024 histogram */
export function recentPyqCount(hist: number[], years = 3): number {
  const start = Math.max(0, hist.length - years);
  return hist.slice(start).reduce((a, b) => a + b, 0);
}

/** Years (of 10) in which this chapter appeared at least once */
export function yearsActiveInHist(hist: number[]): number {
  return hist.filter(n => n > 0).length;
}

function pickMaxBy<T>(items: T[], score: (x: T) => number): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestScore = score(best);
  for (let i = 1; i < items.length; i++) {
    const s = score(items[i]);
    if (s > bestScore) {
      bestScore = s;
      best = items[i];
    }
  }
  return bestScore > 0 ? best : null;
}

function buildPick(
  reason: ForYouReason,
  chapter: ChapterWithSubject,
  hint: string,
  progressPct: number | null,
  progressLabel: string
): ForYouPrimaryPick {
  const style = REASON_STYLE[reason];
  return {
    reason,
    chapter,
    hint,
    progressPct,
    progressLabel,
    ...style,
  };
}

/**
 * Primary "For you" chapter card.
 * Cold start (no solves): high-yield by recent exam frequency, never "weak spot".
 * With history: real weak chapters, then frequent untouched, then continue in-progress.
 */
export function computeForYouPrimary(
  pyqStats: Record<string, SubjectPYQStat>,
  solvedPyqs: number,
  attemptedPyqs: number
): ForYouPrimaryPick | null {
  const chapters = allChapters(pyqStats);
  if (chapters.length === 0) return null;

  const coldStart = attemptedPyqs === 0;

  if (coldStart) {
    const ch =
      pickMaxBy(chapters, c => recentPyqCount(c.hist, 3) * 1000 + c.total) ?? chapters[0];
    const recent = recentPyqCount(ch.hist, 3);
    return buildPick(
      "start",
      ch,
      "Most asked in recent JEE papers — a strong first chapter",
      null,
      recent > 0 ? `${recent} PYQs · '22–'24` : `${ch.total} PYQs in archive`
    );
  }

  const attemptedChapters = chapters.filter(c => c.attempted > 0);
  const untouched = chapters.filter(c => c.attempted === 0);

  const weakCandidates = attemptedChapters
    .filter(c => c.attempted >= 2 && (c.accuracyPct ?? 100) < 40)
    .sort((a, b) => (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0) || b.total - a.total);

  if (weakCandidates.length > 0) {
    const ch = weakCandidates[0];
    const acc = ch.accuracyPct ?? 0;
    return buildPick(
      "weak",
      ch,
      "Low accuracy on questions you've tried here",
      acc,
      `${acc}% accuracy`
    );
  }

  const frequentUntouched = untouched.filter(c => yearsActiveInHist(c.hist) >= 3);
  const frequentPick = pickMaxBy(
    frequentUntouched,
    c => yearsActiveInHist(c.hist) * 1000 + recentPyqCount(c.hist, 3)
  );
  if (frequentPick) {
    const yrs = yearsActiveInHist(frequentPick.hist);
    return buildPick(
      "frequent",
      frequentPick,
      `Came up in ${yrs} of the last 10 years — not started yet`,
      null,
      `${yrs} yrs active`
    );
  }

  const inProgress = attemptedChapters
    .filter(c => c.pct > 0 && c.pct < 70)
    .sort((a, b) => b.solved - a.solved || a.pct - b.pct);
  if (inProgress.length > 0) {
    const ch = inProgress[0];
    return buildPick(
      "continue",
      ch,
      "Pick up where you left off",
      ch.accuracyPct ?? ch.pct,
      `${ch.solved}/${ch.total} solved`
    );
  }

  if (untouched.length > 0) {
    const ch =
      pickMaxBy(untouched, c => recentPyqCount(c.hist, 3) * 1000 + c.total) ?? untouched[0];
    const recent = recentPyqCount(ch.hist, 3);
    return buildPick(
      "frequent",
      ch,
      "High-yield chapter you haven't opened yet",
      null,
      recent > 0 ? `${recent} recent PYQs` : `${ch.total} total`
    );
  }

  const fallback = pickMaxBy(attemptedChapters, c => c.total - c.solved) ?? attemptedChapters[0];
  if (!fallback) return null;
  return buildPick(
    "continue",
    fallback,
    "Keep building coverage",
    fallback.accuracyPct ?? fallback.pct,
    `${fallback.accuracyPct ?? fallback.pct}% accuracy`
  );
}

export function forYouFeedMode(attemptedPyqs: number): "cold" | "warm" {
  return attemptedPyqs === 0 ? "cold" : "warm";
}
