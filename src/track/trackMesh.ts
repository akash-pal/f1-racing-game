import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { getCircuit } from './circuit'

// Geometry builders for the circuit. All pure — return BufferGeometry the R3F
// components memoize and render.

/** Flat road ribbon between the left and right edges, lying at y = `y`. */
export function buildRoadGeometry(y = 0.02): BufferGeometry {
  const { leftEdge, rightEdge, length } = getCircuit()
  const n = leftEdge.length
  const tilesAlong = length / 6 // ~6 m asphalt tile
  const positions = new Float32Array(n * 2 * 3)
  const normals = new Float32Array(n * 2 * 3)
  const uvs = new Float32Array(n * 2 * 2)
  for (let i = 0; i < n; i++) {
    const l = leftEdge[i]
    const r = rightEdge[i]
    positions.set([l.x, y, l.z], i * 6)
    positions.set([r.x, y, r.z], i * 6 + 3)
    normals.set([0, 1, 0, 0, 1, 0], i * 6)
    // u = 0..~2 across the ~14 m width, v tiled along the length so the asphalt
    // reads roughly square
    const v = (i / (n - 1)) * tilesAlong
    uvs.set([0, v, 2, v], i * 4)
  }
  const indices: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = i * 2 + 2
    const d = i * 2 + 3
    indices.push(a, c, b, b, c, d)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(positions, 3))
  g.setAttribute('normal', new BufferAttribute(normals, 3))
  g.setAttribute('uv', new BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

/**
 * Kerb strips — ONLY at corners (per the circuit's isCorner mask), hugging both
 * edges. A raised, rippled rumble-strip profile: near-flush on the track side,
 * up to a rippling crest, then a lower outer lip. Split into two geometries by
 * segment parity so they render as alternating red / white blocks.
 */
export function buildKerbGeometries(width = 1.7): [BufferGeometry, BufferGeometry] {
  const track = getCircuit()
  const n = track.samples.length
  const inward = new Vector3()

  const BASE_Y = 0.02 // flush with the road
  const CREST = 0.085 // crest height above the road
  const RIPPLE = 0.02 // saw-tooth along the strip -> the "rumble"

  // one cross-section point: `across` = fraction from the track edge inward,
  // returns [x, y, z] for sample index i on the given edge
  const pt = (edge: Vector3[], i: number, across: number, y: number): [number, number, number] => [
    edge[i].x + inward.x * width * across,
    y,
    edge[i].z + inward.z * width * across,
  ]

  const make = (parity: 0 | 1) => {
    const positions: number[] = []
    const indices: number[] = []
    let v = 0
    for (let i = 0; i < n - 1; i++) {
      if (i % 2 !== parity) continue
      if (!track.isCorner[i]) continue // straights get no kerb
      for (const edge of [track.leftEdge, track.rightEdge]) {
        inward.copy(track.samples[i]).sub(edge[i]).setY(0).normalize()
        const rip0 = (i % 4 < 2 ? 1 : -1) * RIPPLE
        const rip1 = ((i + 1) % 4 < 2 ? 1 : -1) * RIPPLE
        const crest0 = BASE_Y + CREST + rip0
        const crest1 = BASE_Y + CREST + rip1
        // 4 lines across: outer lip (just past the edge) -> crest -> track side
        const ring = (j: 0 | 1, e: Vector3[]) => {
          const idx = i + j
          const crest = j === 0 ? crest0 : crest1
          positions.push(
            ...pt(e, idx, -0.18, BASE_Y + 0.01), // outer lip, a hair past the edge
            ...pt(e, idx, 0.3, crest), // crest
            ...pt(e, idx, 1.0, BASE_Y + 0.012), // track side, near flush
          )
        }
        ring(0, edge)
        ring(1, edge)
        // two quads (lip->crest, crest->trackside) between the j=0 and j=1 rings
        indices.push(v, v + 3, v + 1, v + 1, v + 3, v + 4)
        indices.push(v + 1, v + 4, v + 2, v + 2, v + 4, v + 5)
        v += 6
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }
  return [make(0), make(1)]
}

/**
 * Continuous painted white edge lines down BOTH sides of the track — a thin
 * `width`-wide strip set `gap` metres in from each edge (leaving a sliver of
 * bare tarmac between the line and the grass), running the whole lap.
 */
export function buildEdgeLineGeometry(width = 0.18, gap = 0.35, y = 0.035): BufferGeometry {
  const track = getCircuit()
  const n = track.samples.length
  const inward = new Vector3()
  const positions: number[] = []
  const indices: number[] = []
  let v = 0
  for (let i = 0; i < n - 1; i++) {
    for (const edge of [track.leftEdge, track.rightEdge]) {
      inward.copy(track.samples[i]).sub(edge[i]).setY(0).normalize()
      const o = gap // outboard offset of the line from the edge
      positions.push(
        edge[i].x + inward.x * o, y, edge[i].z + inward.z * o,
        edge[i].x + inward.x * (o + width), y, edge[i].z + inward.z * (o + width),
        edge[i + 1].x + inward.x * o, y, edge[i + 1].z + inward.z * o,
        edge[i + 1].x + inward.x * (o + width), y, edge[i + 1].z + inward.z * (o + width),
      )
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3)
      v += 4
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}
