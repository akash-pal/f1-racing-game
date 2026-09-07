import { CatmullRomCurve3, Vector2, Vector3 } from 'three'

// A stylised Buddh International Circuit (Indian GP) — hand-authored anchor
// points, not surveyed data: the long main straight and T1 downhill right, the
// T3 parabolic hairpin, the back straight to T4, the Sector-2 esses up the west
// side, the huge double-apex T10-11-12 left, then T13-16 through the stadium
// back onto the straight. Coordinates: +x east, +z south. ~16 corners.

// prettier-ignore
const ANCHORS: [number, number][] = [
  // --- main straight, from S/F heading east (+x) toward Turn 1 (dead flat) ---
  [  -60,  181], [   70,  181], [  185,  181],
  // --- T1: downhill right off the end of the straight ---
  [  252,  168], [  300,  150],
  // --- T2: long right, heading round to the south ---
  [  332,  120], [  342,  155],
  // --- T3: long parabolic right hairpin sweeping onto the back straight ---
  [  335,  195], [  305,  225], [  258,  240],
  // --- back straight (2nd DRS zone), heading west (-x) ---
  [  130,  245], [  -20,  246], [ -165,  243],
  // --- T4: hard braking left at the west end ---
  [ -240,  230], [ -286,  196], [ -288,  156],
  // --- T5-T6: quick right-left ---
  [ -262,  124], [ -222,  104], [ -198,   66],
  // --- T7-T8-T9: Sector-2 esses ---
  [ -200,   30], [ -186,   -2], [ -180,  -30],
  // --- T10-T11-T12: the huge double-apex left, hanging south-west ---
  [ -232,  -42], [ -292,  -34], [ -334,  -74], [ -324, -122],
  [ -272, -146], [ -210, -132], [ -172,  -98],
  // --- T13-T14: right then left, running east along the base of the loop ---
  [ -110, -106], [  -40,  -92], [   30, -104], [   92,  -86],
  // --- T15: right-hander, swinging the car south ---
  [  116,  -22], [  144,   18], [  150,   62],
  // --- T15 -> T16 link: long left sweep back west while descending ---
  [  128,  100], [   82,  122], [   24,  126], [  -36,  116],
  // --- T16: slow left onto the main straight ---
  [  -96,  130], [ -138,  156], [ -146,  181],
  // --- short link into the pit straight, heading east ---
  [ -108,  181],
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
  sample: (x: number, z: number) => { onTrack: boolean; grip: number; distToCenter: number; t: number }
}

const HALF_WIDTH = 7
const SAMPLE_COUNT = 900

let cached: TrackModel | null = null

export function getCircuit(): TrackModel {
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
    const grip = onTrack ? 1 : distToCenter < HALF_WIDTH + 3 ? 0.7 : 0.32
    return { onTrack, grip, distToCenter, t: bestI / (samples.length - 1) }
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
