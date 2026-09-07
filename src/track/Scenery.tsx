import { useMemo } from 'react'
import { Vector3 } from 'three'
import { getCircuit } from './circuit'

// Minimal trackside dressing: tyre stacks tucked on the inside of the tight
// corners. Placed procedurally from the circuit geometry.

export function Scenery() {
  const tyreClusters = useMemo(() => {
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
        tc.push([p.x - nrm.x * (t.halfWidth + 1.4), 0, p.z - nrm.z * (t.halfWidth + 1.4)])
      }
    }
    return tc
  }, [])

  return (
    <group>
      {tyreClusters.map((c, i) => (
        <group key={i} position={c}>
          {[
            [0, 0],
            [0.7, 0],
            [-0.7, 0],
            [0.35, 0.6],
            [-0.35, 0.6],
          ].map(([dx, dz], j) => (
            <mesh key={j} position={[dx, 0.35, dz]} castShadow>
              <cylinderGeometry args={[0.36, 0.36, 0.7, 12]} />
              <meshStandardMaterial color="#161616" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
