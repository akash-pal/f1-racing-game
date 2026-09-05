// Small math helpers. Pure, no dependencies.

export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Framerate-independent approach of `a` toward `b`.
 * `rate` is roughly "how many e-folds per second" — higher is snappier.
 */
export const dampTowards = (a: number, b: number, rate: number, dt: number): number =>
  b + (a - b) * Math.exp(-rate * dt)

/** Move `a` toward `b` by at most `maxDelta`. */
export const moveTowards = (a: number, b: number, maxDelta: number): number => {
  const d = b - a
  if (Math.abs(d) <= maxDelta) return b
  return a + Math.sign(d) * maxDelta
}

/** Sign of x, but 0 stays 0. */
export const signOrZero = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0)

/** Wrap an angle to (-PI, PI]. */
export const wrapAngle = (a: number): number => {
  let r = a % (Math.PI * 2)
  if (r > Math.PI) r -= Math.PI * 2
  if (r <= -Math.PI) r += Math.PI * 2
  return r
}
