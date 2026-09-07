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
 * A vertical wall ribbon that follows one edge, offset `offset` units further
 * out from the centre-line, rising to `height`.
 */
export function buildWallGeometry(side: 'left' | 'right', offset: number, height: number): BufferGeometry {
  const track = getCircuit()
  const edge = side === 'left' ? track.leftEdge : track.rightEdge
  const center = track.samples
  const n = edge.length
  const positions = new Float32Array(n * 2 * 3)
  const normals = new Float32Array(n * 2 * 3)
  const uvs = new Float32Array(n * 2 * 2)
  const out = new Vector3()
  for (let i = 0; i < n; i++) {
    out.copy(edge[i]).sub(center[i]).normalize()
    const bx = edge[i].x + out.x * offset
    const bz = edge[i].z + out.z * offset
    positions.set([bx, 0, bz], i * 6)
    positions.set([bx, height, bz], i * 6 + 3)
    // normal faces the track (inward)
    normals.set([-out.x, 0, -out.z, -out.x, 0, -out.z], i * 6)
    const u = i / (n - 1)
    uvs.set([u * 90, 0, u * 90, 1], i * 4)
  }
  const indices: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = i * 2 + 2
    const d = i * 2 + 3
    // face inward
    indices.push(a, b, c, b, d, c)
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
 * edges. Split into two geometries by segment parity for the red/white stripe.
 */
export function buildKerbGeometries(width = 1.4): [BufferGeometry, BufferGeometry] {
  const track = getCircuit()
  const n = track.samples.length
  const inward = new Vector3()

  const make = (parity: 0 | 1) => {
    const positions: number[] = []
    const indices: number[] = []
    let v = 0
    for (let i = 0; i < n - 1; i++) {
      if (i % 2 !== parity) continue
      if (!track.isCorner[i]) continue // straights get no kerb
      for (const edge of [track.leftEdge, track.rightEdge]) {
        inward.copy(track.samples[i]).sub(edge[i]).setY(0).normalize()
        const y = 0.05
        positions.push(
          edge[i].x, y, edge[i].z,
          edge[i].x + inward.x * width, y, edge[i].z + inward.z * width,
          edge[i + 1].x, y, edge[i + 1].z,
          edge[i + 1].x + inward.x * width, y, edge[i + 1].z + inward.z * width,
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
  return [make(0), make(1)]
}
