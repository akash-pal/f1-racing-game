import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { placedGrandstands, type PlacedGrandstand } from './grandstandLayout'

// Trackside grandstands, placed to match the Buddh International Circuit map.
// Each is a raked concrete bank with a cantilever roof and a scattering of
// spectators (one shared instanced mesh for the whole crowd).

const RAKE_TILT = -0.34 // seating bank rakes up away from the track
const BANK_HEIGHT = 8

const CROWD_COLORS = ['#d94f4f', '#e0c05a', '#5a7fd0', '#e8e8e8', '#4fae72', '#c8763f', '#8a8f97']

interface Person {
  pos: [number, number, number]
  rot: [number, number, number]
  color: Color
}

function buildCrowd(stands: PlacedGrandstand[]): Person[] {
  const crowd: Person[] = []
  const m = new Matrix4()
  const q = new Quaternion()
  const e = new Euler()
  const local = new Vector3()
  const world = new Vector3()

  for (const s of stands) {
    q.setFromEuler(e.set(0, s.rotY, 0))
    m.makeRotationFromQuaternion(q).setPosition(s.cx, 0, s.cz)
    const cols = Math.max(6, Math.floor(s.length / 1.5))
    const rows = 7
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() < 0.22) continue // gaps in the crowd
        const lx = -s.length / 2 + 0.75 + (c / (cols - 1)) * (s.length - 1.5)
        const lz = -s.depth / 2 + 2 + (r / (rows - 1)) * (s.depth - 3)
        const ly = 0.9 + (r / (rows - 1)) * (BANK_HEIGHT - 1.4)
        local.set(lx + (Math.random() - 0.5) * 0.5, ly, lz)
        world.copy(local).applyMatrix4(m)
        crowd.push({
          pos: [world.x, world.y, world.z],
          rot: [0, s.rotY + (Math.random() - 0.5) * 0.6, 0],
          color: new Color(CROWD_COLORS[(Math.random() * CROWD_COLORS.length) | 0]),
        })
      }
    }
  }
  return crowd
}

function Stand({ cx, cz, rotY, length, depth }: PlacedGrandstand) {
  const postXs = useMemo(() => {
    const k = Math.max(2, Math.round(length / 16))
    return Array.from({ length: k }, (_, i) => -length / 2 + 2 + (i / (k - 1)) * (length - 4))
  }, [length])

  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      {/* raked seating bank */}
      <mesh
        position={[0, BANK_HEIGHT / 2 - 0.5, 0]}
        rotation={[RAKE_TILT, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[length, BANK_HEIGHT, depth]} />
        <meshStandardMaterial color="#9a9ea3" roughness={0.95} />
      </mesh>
      {/* front wall / advertising band, on the track side */}
      <mesh position={[0, 0.8, -depth / 2 + 0.3]} castShadow receiveShadow>
        <boxGeometry args={[length, 1.6, 0.5]} />
        <meshStandardMaterial color="#3a3f45" roughness={0.8} />
      </mesh>
      {/* roof */}
      <mesh position={[0, BANK_HEIGHT + 3.2, depth * 0.1]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[length + 3, 0.5, depth + 3]} />
        <meshStandardMaterial color="#c9ccd0" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* roof posts at the back */}
      {postXs.map((x, i) => (
        <mesh key={i} position={[x, (BANK_HEIGHT + 3) / 2, depth / 2 + 0.8]} castShadow>
          <boxGeometry args={[0.5, BANK_HEIGHT + 3, 0.5]} />
          <meshStandardMaterial color="#6a6f76" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export function Grandstands() {
  const { stands, crowd } = useMemo(() => {
    const stands = placedGrandstands()
    return { stands, crowd: buildCrowd(stands) }
  }, [])

  return (
    <group>
      {stands.map((s, i) => (
        <Stand key={i} {...s} />
      ))}

      {crowd.length > 0 && (
        <Instances limit={crowd.length} range={crowd.length} castShadow>
          <boxGeometry args={[0.5, 0.9, 0.5]} />
          <meshStandardMaterial roughness={1} />
          {crowd.map((c, i) => (
            <Instance key={i} position={c.pos} rotation={c.rot} color={c.color} />
          ))}
        </Instances>
      )}
    </group>
  )
}
