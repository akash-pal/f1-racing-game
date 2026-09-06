import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { DoubleSide, Vector3 } from 'three'
import { getSilverstone } from '../track/silverstone'
import { buildKerbGeometries, buildRoadGeometry } from '../track/trackMesh'

// Top-down Silverstone outline for the 2D prototype. Same centre-line and edges
// as the 3D scene — the tarmac ribbon, kerbs, edge lines and barrier lines
// (offset just outside each edge) that give the "3D" track its footprint.

const BARRIER_OFFSET = 1.2

export function Track2D() {
  const track = getSilverstone()
  const road = useMemo(() => buildRoadGeometry(0.0), [])
  const [kerbA, kerbB] = useMemo(() => buildKerbGeometries(1.4), [])

  const flat = (pts: Vector3[], y = 0.03) => pts.map((p) => new Vector3(p.x, y, p.z))

  const outerBarrier = useMemo(() => {
    const t = getSilverstone()
    return t.leftEdge.map((e, i) => {
      const out = new Vector3().copy(e).sub(t.samples[i]).normalize()
      return new Vector3(e.x + out.x * BARRIER_OFFSET, 0.05, e.z + out.z * BARRIER_OFFSET)
    })
  }, [])
  const innerBarrier = useMemo(() => {
    const t = getSilverstone()
    return t.rightEdge.map((e, i) => {
      const out = new Vector3().copy(e).sub(t.samples[i]).normalize()
      return new Vector3(e.x + out.x * BARRIER_OFFSET, 0.05, e.z + out.z * BARRIER_OFFSET)
    })
  }, [])

  const startYaw = Math.atan2(track.start.forward.x, track.start.forward.z)

  return (
    <group>
      {/* grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[track.bounds.centerX, -0.05, track.bounds.centerZ]}>
        <planeGeometry args={[track.bounds.width + 200, track.bounds.depth + 200]} />
        <meshBasicMaterial color="#25361d" />
      </mesh>

      {/* tarmac */}
      <mesh geometry={road}>
        <meshBasicMaterial color="#3a3e44" side={DoubleSide} />
      </mesh>

      {/* kerbs */}
      <mesh geometry={kerbA}>
        <meshBasicMaterial color="#c33636" side={DoubleSide} />
      </mesh>
      <mesh geometry={kerbB}>
        <meshBasicMaterial color="#e6e6e6" side={DoubleSide} />
      </mesh>

      {/* edge lines */}
      <Line points={flat(track.leftEdge)} color="#dddddd" lineWidth={1.5} />
      <Line points={flat(track.rightEdge)} color="#dddddd" lineWidth={1.5} />

      {/* centre line (racing line reference) */}
      <Line points={flat(track.samples, 0.04)} color="#e0c060" lineWidth={1} dashed dashSize={5} gapSize={5} />

      {/* barriers */}
      <Line points={outerBarrier} color="#b7bcc4" lineWidth={2.5} />
      <Line points={innerBarrier} color="#b7bcc4" lineWidth={2.5} />

      {/* start / finish */}
      <mesh
        position={[track.start.position.x, 0.06, track.start.position.z]}
        rotation={[-Math.PI / 2, 0, startYaw]}
      >
        <planeGeometry args={[track.halfWidth * 2, 3]} />
        <meshBasicMaterial color="#f0f0f0" />
      </mesh>
    </group>
  )
}
