import { CatmullRomCurve3, Vector2, Vector3 } from 'three'

// A recognisable Silverstone-shaped closed circuit.
//
// These are hand-authored anchor points tracing the circuit's outline (not
// surveyed data) — the fast Copse / Maggotts-Becketts esses along the top, the
// Hangar straight down the right, Stowe / Vale / Club into the pit straight, then
// Abbey and the Brooklands / Village hairpin bulge on the left. Coordinates are
// game units in the ground plane: +x east, +z south. One lap ~ 1.9 km.

// prettier-ignore
const ANCHORS: [number, number][] = [
  // --- start/finish + pit straight (dead straight, heading east +x) ---
  [  -70,  206], [   30,  206], [  130,  206],
  // --- Club / Vale (SE), sweeping right then left up the east side ---
  [  210,  188], [  256,  140], [  272,   80], [  270,   20],
  // --- east side / Hangar Straight (heading north) ---
  [  256,  -40], [  230, -100],
  // --- Stowe (NE), turning west along the top ---
  [  188, -146], [  120, -168],
  // --- Maggotts / Becketts / Chapel: shallow S along the north edge ---
  [   68, -150], [   28, -178], [  -30, -180], [  -95, -158],
  // --- Copse (NW), turning down toward the west point ---
  [ -160, -122], [ -215,  -70],
  // --- Wellington Straight, running west out to the far point ---
  [ -250,  -30], [ -278,    6],
  // --- The Loop: tight ~180° left hairpin at the western extreme ---
  [ -282,   46], [ -254,   74], [ -214,   66],
  // --- Aintree, the return leg running back east, well south of Wellington ---
  [ -172,   48], [ -134,   42], [  -98,   46],
  // --- long, open left sweeping up the west side of the infield ---
  [  -74,   72], [  -66,  116], [  -92,  140],
  // --- final corner: a smooth ~100 deg left onto the pit straight (no cusp) ---
  [ -105,  171], [  -95,  196],
]

export interface TrackModel {
  /** Smooth closed centre-line. */
  curve: CatmullRomCurve3
  /** Densely resampled centre-line points (XZ, y = 0). */
  samples: Vector3[]
  /** Per-sample unit tangent (XZ). */
  tangents: Vector3[]
  /** Per-sample left/right edge points at ±halfWidth. */
  leftEdge: Vector3[]
  rightEdge: Vector3[]
  /** Half the drivable width, game units. */
  halfWidth: number
  /** Total centre-line length. */
  length: number
  /** XZ bounding box of the drivable surface (includes edges). */
  bounds: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    centerX: number
    centerZ: number
    width: number
    depth: number
  }
  /** Start/finish: world position, forward unit vector, and game heading. */
  start: { position: Vector3; forward: Vector3; heading: number }
  /** Nearest-point query for on-track / grip tests. */
  sample: (x: number, z: number) => { onTrack: boolean; grip: number; distToCenter: number; t: number }
}

const HALF_WIDTH = 7
const SAMPLE_COUNT = 900

let cached: TrackModel | null = null

export function getSilverstone(): TrackModel {
  if (cached) return cached

  const pts = ANCHORS.map(([x, z]) => new Vector3(x, 0, z))
  const curve = new CatmullRomCurve3(pts, true, 'catmullrom', 0.5)

  const samples = curve.getSpacedPoints(SAMPLE_COUNT)
  const length = curve.getLength()

  const tangents: Vector3[] = []
  const leftEdge: Vector3[] = []
  const rightEdge: Vector3[] = []
  const up = new Vector3(0, 1, 0)
  for (let i = 0; i < samples.length; i++) {
    const t = i / (samples.length - 1)
    const tan = curve.getTangentAt(t % 1)
    tan.y = 0
    tan.normalize()
    tangents.push(tan)
    // left = up × tangent  (points to the driver's left along racing direction)
    const left = new Vector3().crossVectors(up, tan).normalize()
    leftEdge.push(new Vector3().copy(samples[i]).addScaledVector(left, HALF_WIDTH))
    rightEdge.push(new Vector3().copy(samples[i]).addScaledVector(left, -HALF_WIDTH))
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of [...leftEdge, ...rightEdge]) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  const bounds = {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    depth: maxZ - minZ,
  }

  const startForward = tangents[0].clone()
  const start = {
    position: samples[0].clone(),
    forward: startForward,
    // heading (radians) in the game's convention: 0 = facing -Z, +ve toward +X
    heading: Math.atan2(-startForward.x, -startForward.z),
  }

  // 2D acceleration structure for nearest-point queries: bucket sample indices
  // by a coarse grid cell so sample() stays O(1)-ish.
  const CELL = 24
  const grid = new Map<string, number[]>()
  const key = (gx: number, gz: number) => `${gx},${gz}`
  samples.forEach((p, i) => {
    const gx = Math.floor(p.x / CELL)
    const gz = Math.floor(p.z / CELL)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const k = key(gx + dx, gz + dz)
        const arr = grid.get(k)
        if (arr) arr.push(i)
        else grid.set(k, [i])
      }
    }
  })

  const sample = (x: number, z: number) => {
    const gx = Math.floor(x / CELL)
    const gz = Math.floor(z / CELL)
    const candidates = grid.get(key(gx, gz))
    let best = Infinity
    let bestI = 0
    if (candidates) {
      for (const i of candidates) {
        const p = samples[i]
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z)
        if (d < best) {
          best = d
          bestI = i
        }
      }
    } else {
      // fall back to full scan (rare — far off track)
      for (let i = 0; i < samples.length; i++) {
        const p = samples[i]
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z)
        if (d < best) {
          best = d
          bestI = i
        }
      }
    }
    const distToCenter = Math.sqrt(best)
    const onTrack = distToCenter < HALF_WIDTH
    const grip = onTrack ? 1 : distToCenter < HALF_WIDTH + 3 ? 0.7 : 0.32
    return { onTrack, grip, distToCenter, t: bestI / (samples.length - 1) }
  }

  cached = {
    curve,
    samples,
    tangents,
    leftEdge,
    rightEdge,
    halfWidth: HALF_WIDTH,
    length,
    bounds,
    start,
    sample,
  }
  return cached
}

/** 2D polyline (x,z) of the centre-line for the top-down view. */
export function centerlinePolyline2D(): Vector2[] {
  return getSilverstone().samples.map((p) => new Vector2(p.x, p.z))
}

/** Spawn pose for the 2D arcade car (on the start/finish line, racing direction). */
export function spawn2D(): { x: number; z: number; h: number } {
  const s = getSilverstone().start
  return { x: s.position.x, z: s.position.z, h: s.heading }
}

/** Spawn pose for the 3D car. */
export function spawn3D(): { position: [number, number, number]; heading: number } {
  const s = getSilverstone().start
  return { position: [s.position.x, 1.0, s.position.z], heading: s.heading }
}

/**
 * Start/finish line crossing test. Returns the signed distance along the racing
 * direction from the line (negative = before, positive = after) and whether the
 * point is within the track's lateral width of the line.
 */
export function makeFinishLine() {
  const { start, halfWidth } = getSilverstone()
  const f = start.forward // along racing direction
  const p0 = start.position
  return {
    signedDist: (x: number, z: number) => (x - p0.x) * f.x + (z - p0.z) * f.z,
    withinWidth: (x: number, z: number) => {
      // lateral offset = perpendicular component
      const dx = x - p0.x
      const dz = z - p0.z
      const along = dx * f.x + dz * f.z
      const latX = dx - along * f.x
      const latZ = dz - along * f.z
      return Math.hypot(latX, latZ) < halfWidth + 4
    },
  }
}
