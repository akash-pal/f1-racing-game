import { getCircuit } from './circuit'

// Where the grandstands sit, as fractions around the lap, matched to the Buddh
// International Circuit map: the main-straight stand opposite the pits, T1, the
// long BP1 stand down the back straight, T4, the SC1 bank, the BP2 chicane, the
// BP3 "Currybolica" arc, and the T13-16 return. Shared by the 3D grandstands
// and the 2D top-down markers so the two views stay in sync.

export interface GrandstandSpec {
  /** fraction around the lap from the start line, in the racing direction */
  t: number
  /** +1 = spectator side is track-left, -1 = track-right */
  side: 1 | -1
  /** gap from the track edge to the front of the stand */
  gap: number
  /** stand length along the track */
  length: number
  /** stand depth (front-to-back) */
  depth: number
}

export const GRANDSTAND_SPECS: GrandstandSpec[] = [
  { t: 0.015, side: 1, gap: 16, length: 100, depth: 14 }, // main straight, opposite the pits
  { t: 0.1, side: 1, gap: 13, length: 42, depth: 12 }, // Turn 1
  { t: 0.185, side: 1, gap: 15, length: 46, depth: 12 }, // Turn 2-3
  { t: 0.31, side: 1, gap: 18, length: 130, depth: 15 }, // BP1, down the back straight
  { t: 0.4, side: 1, gap: 13, length: 40, depth: 12 }, // Turn 4
  { t: 0.47, side: -1, gap: 13, length: 54, depth: 13 }, // SC1 diagonal bank
  { t: 0.54, side: 1, gap: 12, length: 40, depth: 11 }, // BP2 chicane
  { t: 0.65, side: 1, gap: 17, length: 84, depth: 14 }, // BP3 "Currybolica"
  { t: 0.76, side: 1, gap: 16, length: 58, depth: 13 }, // Turn 13-14
  { t: 0.84, side: 1, gap: 13, length: 44, depth: 12 }, // Turn 15
  { t: 0.92, side: 1, gap: 12, length: 34, depth: 11 }, // Turn 16
]

export interface PlacedGrandstand {
  /** centre of the stand footprint, world XZ */
  cx: number
  cz: number
  /** Y rotation so local +X runs along the track, +Z points away from it */
  rotY: number
  length: number
  depth: number
}

export function placedGrandstands(): PlacedGrandstand[] {
  const track = getCircuit()
  const n = track.samples.length
  return GRANDSTAND_SPECS.map((s) => {
    const i = Math.min(n - 1, Math.max(0, Math.round(s.t * (n - 1))))
    const p = track.samples[i]
    const tan = track.tangents[i]
    // unit normal (up x tan) = (tz, 0, -tx); spectator side is `side` along it
    const nx = tan.z * s.side
    const nz = -tan.x * s.side
    const front = track.halfWidth + s.gap + s.depth / 2
    return {
      cx: p.x + nx * front,
      cz: p.z + nz * front,
      rotY: Math.atan2(nx, nz),
      length: s.length,
      depth: s.depth,
    }
  })
}
