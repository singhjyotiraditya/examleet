import type { Problem } from "@/lib/data";
import { appendListSeed } from "@/lib/sessionSeed";

export type SolveFilter = "all" | "solved" | "unsolved";

export interface QuestionListFilters {
  q?: string;
  subject?: string;
  difficulty?: string;
  chapter?: string;
}

/** Snapshot of the filtered list order when the user opened a problem. */
export interface ProblemPlayQueue {
  ids: string[];
  index: number;
  filters?: QuestionListFilters;
  solveFilter?: SolveFilter;
}

export function applySolveFilter(problems: Problem[], solveFilter?: SolveFilter): Problem[] {
  if (solveFilter === "solved") return problems.filter(p => p.solved);
  if (solveFilter === "unsolved") return problems.filter(p => !p.solved);
  return problems;
}

export function buildPlayQueue(
  list: Problem[],
  currentId: string,
  opts?: { filters?: QuestionListFilters; solveFilter?: SolveFilter },
): ProblemPlayQueue {
  const ids = list.map(p => p.id);
  const index = ids.indexOf(currentId);
  return {
    ids,
    index: index >= 0 ? index : 0,
    filters: opts?.filters,
    solveFilter: opts?.solveFilter,
  };
}

export function filtersToSearchParams(
  filters: QuestionListFilters,
  limit: number,
  offset: number,
): URLSearchParams {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (filters.q) params.set("q", filters.q);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.chapter) params.set("chapter", filters.chapter);
  return appendListSeed(params);
}
