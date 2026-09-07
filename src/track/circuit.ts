import { CatmullRomCurve3, Vector2, Vector3 } from 'three'

// A stylised Buddh International Circuit (Indian GP), clockwise like the real
// track. Hand-authored anchors, not surveyed data, but following the real
// layout's landmarks in order: the ~1 km main straight into the sharp T1 right,
// the flat-out T2 left and the slow, blind T3 right that curl onto the equally
// long back straight; the T4 heavy-braking hairpin at the far end; the Sector-2
// esses (T5-T9); the fast banked multi-apex "Currybolica" T10-11-12 right; the
// T13-14 chicane and the T15/T16 complex back onto the straight.
// Coordinates: +x east, +z south. ~16 corners.

// prettier-ignore
const ANCHORS: [number, number][] = [
  // --- MAIN STRAIGHT: S/F just after T16, heading east (+x), DRS zone ---
  [   46,   66], [  120,   62], [  195,   56],
  // --- T1: sharp right off the end of the straight, car turns south ---
  [  252,   46], [  274,   72],
  // --- T2: right, tightening, dropping toward the bottom of the map ---
  [  285,  112], [  294,  142],
  // --- T3: long, slow, blind right hairpin onto the bottom straight ---
  [  304,  162], [  288,  180], [  246,  186], [  186,  184],
  // --- BOTTOM STRAIGHT: the long one, heading west, main overtaking spot ---
  [   60,  180], [  -70,  178], [ -182,  176],
  // --- T4: heavy-braking hairpin at the far west end ---
  [ -218,  170], [ -226,  140], [ -206,  118],
  // --- SC1: diagonal climb north-east into Sector 2 ---
  [ -150,   84], [  -98,   40],
  // --- T5: right kink ---
  [  -72,   10],
  // --- T6-T7: the SC2 chicane, right then left ---
  [  -58,  -30], [  -98,  -38],
  // --- T8-T9: quick left-right, drifting west ---
  [ -150,  -32], [ -184,  -54],
  // --- T10-T11-T12: BP3 "Currybolica", the big multi-apex left loop ---
  [ -244,  -80], [ -292, -120], [ -266, -172], [ -208, -188],
  [ -166, -156], [ -158, -110],
  // --- T13-T14: chicane heading south-east off the loop ---
  [ -120,  -92], [  -78,  -96], [  -40,  -78],
  // --- long run south-east to Turn 15 ---
  [   -6,  -58], [   22,  -44],
  // --- T15: right-hander, tips the car onto the run down to T16 ---
  [   32,  -18], [   18,   16],
  // --- T16: long diagonal approach into a broad ~110-degree left ---
  [   -8,   40], [  -46,   58], [  -22,   70],
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
  /** Per-sample turn rate (radians of heading change per ~few samples). */
  curvature: number[]
  /** Per-sample flag: is this bit of track a corner (kerbs) vs a straight. */
  isCorner: boolean[]
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
  sample: (
    x: number,
    z: number,
  ) => { onTrack: boolean; onKerb: boolean; grip: number; distToCenter: number; t: number }
}

const HALF_WIDTH = 7
const SAMPLE_COUNT = 900
/** How far in from the edge the kerb reaches (matches buildKerbGeometries width). */
export const KERB_BAND = 1.7
// the anchors above are traced off the real circuit map at a compact scale;
// blow them up so the straights are a proper stretch of road to drive
const ANCHOR_SCALE = 1.25

let cached: TrackModel | null = null

export function getCircuit(): TrackModel {
  if (cached) return cached

  const pts = ANCHORS.map(([x, z]) => new Vector3(x * ANCHOR_SCALE, 0, z * ANCHOR_SCALE))
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

  // Per-sample local turn radius, used to decide where kerbs go: only the
  // genuinely tight corners get kerbs — straights and flowing sweeps stay bare.
  const n = samples.length
  const seg = length / n
  const LOOK = 5
  const arc = LOOK * seg
  const curvature: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const a = tangents[i]
    const b = tangents[(i + LOOK) % n]
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z))
    curvature[i] = Math.acos(dot)
  }
  const RADIUS_MAX = 52 // game units — tighter than this counts as a "corner"
  const PAD = 6 // bracket the apex with a little kerb on entry/exit
  const radiusAt = (i: number) => (curvature[i] > 1e-4 ? arc / curvature[i] : Infinity)
  const isCorner: boolean[] = new Array(n)
  for (let i = 0; i < n; i++) {
    let hot = false
    for (let d = -PAD; d <= PAD && !hot; d++) {
      if (radiusAt((i + d + n) % n) < RADIUS_MAX) hot = true
    }
    isCorner[i] = hot
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
    // the kerb band hugs the edge at corners (matches buildKerbGeometries):
    // from ~KERB_BAND inside the edge to a touch beyond it
    const onKerb =
      isCorner[bestI] && distToCenter > HALF_WIDTH - KERB_BAND && distToCenter < HALF_WIDTH + 0.9
    const grip = onTrack ? 1 : distToCenter < HALF_WIDTH + 3 ? 0.7 : 0.32
    return { onTrack, onKerb, grip, distToCenter, t: bestI / (samples.length - 1) }
  }

  cached = {
    curve,
    samples,
    tangents,
    leftEdge,
    rightEdge,
    curvature,
    isCorner,
    halfWidth: HALF_WIDTH,
    length,
    bounds,
    start,
    sample,
  }
  if (import.meta.env?.DEV) {
    ;(globalThis as unknown as Record<string, unknown>).__circuit = cached
  }
  return cached
}

/** 2D polyline (x,z) of the centre-line for the top-down view. */
export function centerlinePolyline2D(): Vector2[] {
  return getCircuit().samples.map((p) => new Vector2(p.x, p.z))
}

/** Spawn pose for the 2D arcade car (on the start/finish line, racing direction). */
export function spawn2D(): { x: number; z: number; h: number } {
  const s = getCircuit().start
  return { x: s.position.x, z: s.position.z, h: s.heading }
}

/** Spawn pose for the 3D car. */
export function spawn3D(): { position: [number, number, number]; heading: number } {
  const s = getCircuit().start
  return { position: [s.position.x, 1.0, s.position.z], heading: s.heading }
}

/**
 * Start/finish line crossing test. Returns the signed distance along the racing
 * direction from the line (negative = before, positive = after) and whether the
 * point is within the track's lateral width of the line.
 */
export function makeFinishLine() {
  const { start, halfWidth } = getCircuit()
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
