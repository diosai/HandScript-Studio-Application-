/**
 * Non-cryptographic string hashing (FNV-1a, 32-bit).
 * Used to derive stable per-glyph seeds from document position + character.
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Combine multiple numeric seeds into one 32-bit seed. */
export function combineSeeds(...seeds: number[]): number {
  let hash = 0x811c9dc5;
  for (const seed of seeds) {
    hash ^= seed >>> 0;
    hash = Math.imul(hash, 0x01000193);
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}
