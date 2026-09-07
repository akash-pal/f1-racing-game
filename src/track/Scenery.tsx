import { Instance, Instances } from '@react-three/drei'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { getCircuit } from './circuit'

// Trackside scenery: pine trees, grandstands (with a speckled crowd),
// advertising hoardings and tyre stacks. All placed procedurally from the
// circuit geometry so it follows any track edit.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- trees ----------
function Trees() {
  const items = useMemo(() => {
    const t = getCircuit()
    const rand = mulberry32(1337)
    const out: { pos: [number, number, number]; s: number; tint: number }[] = []
    const { minX, maxX, minZ, maxZ } = t.bounds
    const tries = 6000
    for (let i = 0; i < tries && out.length < 460; i++) {
      const x = minX - 110 + rand() * (maxX - minX + 220)
      const z = minZ - 110 + rand() * (maxZ - minZ + 220)
      const d = t.sample(x, z).distToCenter
      if (d < t.halfWidth + 24) continue // well clear of track + barriers + runoff
      if (d > 130 && rand() > 0.4) continue // thin the far field
      out.push({ pos: [x, 0, z], s: 0.55 + rand() * 0.8, tint: rand() })
    }
    return out
  }, [])

  return (
    <group>
      <Instances limit={items.length} range={items.length} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 5]} />
        <meshStandardMaterial color="#4b3a26" roughness={1} />
        {items.map((it, i) => (
          <Instance key={i} position={[it.pos[0], 0.6 * it.s, it.pos[2]]} scale={it.s} />
        ))}
      </Instances>
      <Instances limit={items.length} range={items.length} castShadow>
        <coneGeometry args={[1.05, 2.9, 6]} />
        <meshStandardMaterial color="#2c5a2b" roughness={1} />
        {items.map((it, i) => (
          <Instance
            key={i}
            position={[it.pos[0], (1.2 + 1.35) * it.s, it.pos[2]]}
            scale={it.s}
            color={it.tint > 0.5 ? '#356b32' : '#274d26'}
          />
        ))}
      </Instances>
    </group>
  )
}

// ---------- grandstand ----------
function Grandstand({
  position,
  yaw,
  width = 34,
}: {
  position: [number, number, number]
  yaw: number
  width?: number
}) {
  const rows = 7
  const seats = useMemo(() => {
    const rand = mulberry32(Math.floor(position[0] * 13 + position[2] * 7))
    const arr: { p: [number, number, number]; c: string }[] = []
    const cols = Math.floor(width / 1.3)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() > 0.82) continue // empty seats
        const palette = ['#d94f4f', '#4f7fd9', '#e0c24d', '#e8e8e8', '#5bbd6b']
        arr.push({
          p: [-width / 2 + 0.65 + c * 1.3, 0.6 + r * 0.62, -r * 1.15],
          c: palette[Math.floor(rand() * palette.length)],
        })
      }
    }
    return arr
  }, [position, width])

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* raked concrete base */}
      {Array.from({ length: rows }).map((_, r) => (
        <mesh key={r} position={[0, 0.3 + r * 0.62, -r * 1.15]} receiveShadow castShadow>
          <boxGeometry args={[width, 0.62, 1.2]} />
          <meshStandardMaterial color="#8b8f96" roughness={0.9} />
        </mesh>
      ))}
      {/* crowd */}
      <Instances limit={seats.length} range={seats.length}>
        <boxGeometry args={[0.5, 0.7, 0.5]} />
        <meshStandardMaterial roughness={1} />
        {seats.map((s, i) => (
          <Instance key={i} position={s.p} color={s.c} />
        ))}
      </Instances>
      {/* back wall + roof */}
      <mesh position={[0, 3.0, -rows * 1.15 - 0.4]} castShadow>
        <boxGeometry args={[width + 2, 6, 0.6]} />
        <meshStandardMaterial color="#33373d" />
      </mesh>
      <mesh position={[0, 6.2, -rows * 0.6]} castShadow>
        <boxGeometry args={[width + 3, 0.5, rows * 1.6]} />
        <meshStandardMaterial color="#20242a" metalness={0.3} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2, 3.2, -rows * 1.15]} castShadow>
          <boxGeometry args={[0.5, 6.4, 0.5]} />
          <meshStandardMaterial color="#20242a" />
        </mesh>
      ))}
    </group>
  )
}

// ---------- hoardings + tyre stacks ----------
function TracksideProps() {
  const { tyreClusters } = useMemo(() => {
    const t = getCircuit()
    const n = t.samples.length
    const up = new Vector3(0, 1, 0)
    const tc: [number, number, number][] = []

    for (let i = 0; i < n; i += 7) {
      const p = t.samples[i]
      const tan = t.tangents[i]
      const nrm = new Vector3().crossVectors(up, tan).normalize() // left
      const a = t.tangents[i]
      const b = t.tangents[(i + 8) % n]
      const curv = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z)))
      // tyre stacks tucked on the inside of the tight corners
      if (curv > 0.22 && i % 21 === 0) {
        tc.push([
          p.x - nrm.x * (t.halfWidth + 1.4),
          0,
          p.z - nrm.z * (t.halfWidth + 1.4),
        ])
      }
    }
    return { tyreClusters: tc }
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

export function Scenery() {
  const stands = useMemo(() => {
    const t = getCircuit()
    const n = t.samples.length
    const up = new Vector3(0, 1, 0)
    // place stands on the straighter parts, pushed far enough out that they
    // never sit on the track (checked against the whole centre-line)
    const specs: { frac: number; side: 1 | -1; width: number }[] = [
      { frac: 0.015, side: 1, width: 48 }, // main grandstand, pit straight
      { frac: 0.05, side: -1, width: 30 }, // opposite the pits
      { frac: 0.22, side: 1, width: 34 }, // back straight
      { frac: 0.72, side: 1, width: 30 }, // Sector 3
    ]
    return specs.map((s) => {
      const i = Math.round(s.frac * n) % n
      const p = t.samples[i]
      const tan = t.tangents[i]
      const nrm = new Vector3().crossVectors(up, tan).normalize()
      // step outward until the stand front is well clear of every track leg
      let dist = t.halfWidth + 12
      for (let k = 0; k < 12; k++) {
        const x = p.x + nrm.x * s.side * dist
        const z = p.z + nrm.z * s.side * dist
        if (t.sample(x, z).distToCenter > t.halfWidth + 9) break
        dist += 6
      }
      return {
        position: [p.x + nrm.x * s.side * dist, 0, p.z + nrm.z * s.side * dist] as [
          number,
          number,
          number,
        ],
        yaw: Math.atan2(-nrm.x * s.side, -nrm.z * s.side), // face the track
        width: s.width,
      }
    })
  }, [])

  return (
    <group>
      <Trees />
      <TracksideProps />
      {stands.map((s, i) => (
        <Grandstand key={i} position={s.position} yaw={s.yaw} width={s.width} />
      ))}
    </group>
  )
}
