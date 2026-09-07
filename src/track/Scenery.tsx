import { useMemo } from 'react'
import { Vector3 } from 'three'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import { getCircuit } from './circuit'

// Minimal trackside dressing: stacks of loose tyres tucked on the inside of the
// tight corners. Each tyre is its own dynamic body, so clipping a stack sends
// them tumbling instead of driving straight through.

// slightly more than a tyre-diameter apart so they don't jostle themselves at spawn
const TYRE_OFFSETS: [number, number][] = [
  [0, 0],
  [0.82, 0.04],
  [-0.82, -0.04],
  [0.41, 0.78],
  [-0.41, 0.74],
]

export function Scenery() {
  const clusters = useMemo(() => {
    const t = getCircuit()
    const n = t.samples.length
    const up = new Vector3(0, 1, 0)
    const tc: [number, number, number][] = []
    for (let i = 0; i < n; i += 7) {
      const p = t.samples[i]
      const tan = t.tangents[i]
      const nrm = new Vector3().crossVectors(up, tan).normalize()
      const a = t.tangents[i]
      const b = t.tangents[(i + 8) % n]
      const curv = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z)))
      if (curv > 0.22 && i % 21 === 0) {
        tc.push([p.x - nrm.x * (t.halfWidth + 1.6), 0, p.z - nrm.z * (t.halfWidth + 1.6)])
      }
    }
    return tc
  }, [])

  return (
    <group>
      {clusters.map((c, ci) =>
        TYRE_OFFSETS.map(([dx, dz], j) => (
          <RigidBody
            key={`${ci}-${j}`}
            type="dynamic"
            colliders={false}
            position={[c[0] + dx, 0.36, c[2] + dz]}
            mass={9}
            friction={0.9}
            restitution={0.15}
            linearDamping={0.6}
            angularDamping={0.7}
          >
            <CylinderCollider args={[0.34, 0.35]} />
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.68, 14]} />
              <meshStandardMaterial color="#161616" roughness={1} />
            </mesh>
          </RigidBody>
        )),
      )}
    </group>
  )
}
