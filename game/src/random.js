// Seeded random numbers for DESERT THUNDER. One clear job: deterministic randomness
// so the canyon, the gusts and every screenshot are the same on every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic 1-D value-noise function: smooth, repeatable, seed-free per call. */
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash1(i);
  const b = hash1(i + 1);
  return a + (b - a) * s;
}

export function hash1(n) {
  let h = (n * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
}

/** Pick a deterministic element from an array by index. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
