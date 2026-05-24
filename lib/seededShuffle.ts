/** Mulberry32 PRNG — fast, deterministic shuffle per seed. */
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle with a fixed seed (same input order → same output order). */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const a = [...items];
  const random = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mix session seed with filter fingerprint so each filter combo has its own stable order. */
export function combineSeed(baseSeed: number, ...parts: string[]): number {
  let h = baseSeed >>> 0;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h = Math.imul(h ^ part.charCodeAt(i), 0x5bd1e995);
      h ^= h >>> 15;
    }
  }
  return h >>> 0;
}
