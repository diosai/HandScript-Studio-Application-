/**
 * Deterministic, seedable pseudo-random number generation.
 *
 * The handwriting engine must be fully deterministic for a given seed so that
 * previews, exports and re-opened projects render identically. All randomness
 * in the codebase flows through this module — never `Math.random()`.
 */

/** A deterministic source of pseudo-random numbers in [0, 1). */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  uniform(min: number, max: number): number;
  /** Approximately normal-distributed value (mean 0, stdDev 1), clamped to ±3σ. */
  gaussian(): number;
  /** Uniform integer in [0, exclusiveMax). */
  int(exclusiveMax: number): number;
  /** Pick one element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/**
 * mulberry32 — small, fast, well-distributed 32-bit PRNG.
 * Suitable for visual jitter; NOT for cryptography.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    uniform: (min, max) => min + (max - min) * next(),
    gaussian: () => {
      // Box–Muller transform; clamp tails so a single glyph never looks broken.
      const u1 = Math.max(next(), 1e-12);
      const u2 = next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.min(3, Math.max(-3, z));
    },
    int: (exclusiveMax) => Math.floor(next() * exclusiveMax),
    pick: (items) => {
      if (items.length === 0) throw new Error('Rng.pick called with an empty array');
      return items[Math.floor(next() * items.length)] as never;
    },
  };
}
