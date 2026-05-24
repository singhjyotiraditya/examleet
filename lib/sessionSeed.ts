const SESSION_LIST_SEED_KEY = "examleet_list_seed_v1";

/** One random order per browser tab session (cleared when the tab closes). */
export function getSessionListSeed(): number {
  if (typeof window === "undefined") return 1;
  try {
    const stored = sessionStorage.getItem(SESSION_LIST_SEED_KEY);
    if (stored) {
      const n = Number(stored);
      if (Number.isFinite(n) && n > 0) return n >>> 0;
    }
    const seed = ((Math.random() * 0x7fffffff) | 0) + 1;
    sessionStorage.setItem(SESSION_LIST_SEED_KEY, String(seed));
    return seed >>> 0;
  } catch {
    return 1;
  }
}

export function appendListSeed(params: URLSearchParams): URLSearchParams {
  params.set("seed", String(getSessionListSeed()));
  return params;
}
