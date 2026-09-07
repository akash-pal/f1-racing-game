import { getCircuit } from './circuit'

// Grandstands around the circuit, named and placed to match the official Buddh
// International Circuit spectator map. Each is positioned by a fraction around
// the lap (racing direction from the start line) and whether it sits on the
// outside or the inside of the track. The 3D scene and the 2D prototype both
// read this so the two views stay in sync.

export type StandKind = 'stand' | 'grass'

export interface GrandstandSpec {
  name: string
  /** fraction around the lap from the start line, racing direction */
  t: number
  /** which side of the track the stand sits on */
  side: 'out' | 'in'
  /** gap from the track edge to the front of the stand */
  gap: number
  /** stand length along the track */
  length: number
  /** stand depth (front-to-back) */
  depth: number
  /** 'stand' = raked structure with a roof; 'grass' = a green spectator bank */
  kind: StandKind
  /** for a curved stand: number of segments and how far round the lap they span */
  arc?: { segments: number; span: number }
}

export const GRANDSTAND_SPECS: GrandstandSpec[] = [
  { name: 'Main Grandstand', t: 0.025, side: 'in', gap: 16, length: 122, depth: 15, kind: 'stand' },
  { name: 'Premium Grandstand North', t: 0.078, side: 'in', gap: 15, length: 46, depth: 13, kind: 'stand' }, // prettier-ignore
  { name: 'Picnic Stand North', t: 0.12, side: 'out', gap: 18, length: 62, depth: 22, kind: 'grass' },
  { name: 'Classic Grandstand North', t: 0.2, side: 'out', gap: 14, length: 46, depth: 12, kind: 'stand' },
  { name: 'Star Grandstand 1 East', t: 0.285, side: 'out', gap: 16, length: 48, depth: 12, kind: 'stand' }, // prettier-ignore
  { name: 'Star Grandstand 2 East', t: 0.365, side: 'out', gap: 14, length: 42, depth: 12, kind: 'stand' }, // prettier-ignore
  { name: 'Star Grandstand 3 East', t: 0.43, side: 'out', gap: 13, length: 44, depth: 12, kind: 'stand' },
  { name: 'Classic Grandstand 1 East', t: 0.462, side: 'out', gap: 13, length: 46, depth: 12, kind: 'stand' }, // prettier-ignore
  { name: 'Classic Grandstand 2 East', t: 0.5, side: 'out', gap: 13, length: 48, depth: 13, kind: 'stand' },
  { name: 'Natural Stand South', t: 0.55, side: 'out', gap: 14, length: 34, depth: 20, kind: 'grass', arc: { segments: 3, span: 0.05 } }, // prettier-ignore
  { name: 'Premium Grandstand South', t: 0.665, side: 'out', gap: 15, length: 32, depth: 13, kind: 'stand', arc: { segments: 4, span: 0.06 } }, // prettier-ignore
  { name: 'Picnic Stand South/West', t: 0.72, side: 'in', gap: 20, length: 34, depth: 22, kind: 'grass', arc: { segments: 4, span: 0.06 } }, // prettier-ignore
  { name: 'Classic Grandstand 1 West', t: 0.775, side: 'out', gap: 14, length: 48, depth: 13, kind: 'stand' }, // prettier-ignore
  { name: 'Classic Grandstand 2 West', t: 0.83, side: 'out', gap: 13, length: 44, depth: 12, kind: 'stand' },
]

export interface PlacedGrandstand {
  name: string
  kind: StandKind
  /** centre of the footprint, world XZ */
  cx: number
  cz: number
  /** Y rotation so local +X runs along the track, +Z points away from it */
  rotY: number
  length: number
  depth: number
}

/** nearest distance from (x,z) to any point on the centre-line */
function distToTrack(x: number, z: number): number {
  const s = getCircuit().samples
  let best = Infinity
  for (let i = 0; i < s.length; i += 2) {
    const d = (s[i].x - x) ** 2 + (s[i].z - z) ** 2
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

function place(spec: GrandstandSpec, t: number): PlacedGrandstand {
  const track = getCircuit()
  const n = track.samples.length
  const i = Math.min(n - 1, Math.max(0, Math.round((((t % 1) + 1) % 1) * (n - 1))))
  const p = track.samples[i]
  const tan = track.tangents[i]
  // the +normal (up x tan) = (tz, 0, -tx)
  let nx = tan.z
  let nz = -tan.x
  // does +normal point away from the circuit centre? if not, flip so `side`
  // is measured consistently as outside / inside of the track loop
  const toCentreX = track.bounds.centerX - p.x
  const toCentreZ = track.bounds.centerZ - p.z
  const outward = nx * toCentreX + nz * toCentreZ < 0
  if ((spec.side === 'out') !== outward) {
    nx = -nx
    nz = -nz
  }
  let front = track.halfWidth + spec.gap + spec.depth / 2
  const rotY = Math.atan2(nx, nz)
  // slide the stand out until its whole footprint clears the track — the
  // centre-line can curve back under a stand placed tangent to one point
  const minClear = track.halfWidth + 6
  const half = spec.length / 2
  const ax = nz // unit vector along the stand's length (perpendicular to the normal)
  const az = -nx
  for (let guard = 0; guard < 30; guard++) {
    const cx = p.x + nx * front
    const cz = p.z + nz * front
    let worst = Infinity
    for (let s = -1; s <= 1; s += 0.5) {
      // front edge of the footprint, sampled along its length
      const ex = cx + ax * half * s - nx * (spec.depth / 2)
      const ez = cz + az * half * s - nz * (spec.depth / 2)
      worst = Math.min(worst, distToTrack(ex, ez))
    }
    if (worst >= minClear) break
    front += minClear - worst + 1
  }
  return {
    name: spec.name,
    kind: spec.kind,
    cx: p.x + nx * front,
    cz: p.z + nz * front,
    rotY,
    length: spec.length,
    depth: spec.depth,
  }
}

export function placedGrandstands(): PlacedGrandstand[] {
  const out: PlacedGrandstand[] = []
  for (const spec of GRANDSTAND_SPECS) {
    if (spec.arc) {
      const { segments, span } = spec.arc
      for (let k = 0; k < segments; k++) {
        out.push(place(spec, spec.t + (k / (segments - 1) - 0.5) * span))
      }
    } else {
      out.push(place(spec, spec.t))
    }
  }
  if (import.meta.env?.DEV) {
    ;(globalThis as unknown as Record<string, unknown>).__grandstands = out
  }
  return out
}
