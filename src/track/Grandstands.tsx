import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BufferAttribute, BufferGeometry, Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { placedGrandstands, type PlacedGrandstand } from './grandstandLayout'

// A ramp prism: low at the track side (-Z), rising to `h` at the back (+Z),
// `length` wide along X. Used for the green "picnic" / "natural" spectator banks.
function wedgeGeometry(length: number, depth: number, h: number): BufferGeometry {
  const x = length / 2
  const z = depth / 2
  // 6 verts: front-low pair, back-low pair, back-high pair
  const v = [
    -x, 0.2, -z, x, 0.2, -z, // front edge (track side)
    -x, 0, z, x, 0, z, // back bottom
    -x, h, z, x, h, z, // back top
  ]
  const idx = [
    0, 2, 1, 1, 2, 3, // ground underside
    0, 1, 5, 0, 5, 4, // sloped top face
    1, 3, 5, // right end cap
    0, 4, 2, // left end cap
    2, 4, 5, 2, 5, 3, // back face
  ]
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// Trackside grandstands, named and placed to match the Buddh International
// Circuit spectator map. Yellow stands are a raked concrete bank with a
// cantilever roof; the green "picnic"/"natural" stands are grassy banks. Every
// stand has a fixed collider so the car can't drive through it. Spectators are
// one shared instanced mesh.

const BANK_HEIGHT = 8
const GRASS_HEIGHT = 4

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
    const h = s.kind === 'grass' ? GRASS_HEIGHT : BANK_HEIGHT
    const density = s.kind === 'grass' ? 0.5 : 0.22 // grass banks are sparser
    q.setFromEuler(e.set(0, s.rotY, 0))
    m.makeRotationFromQuaternion(q).setPosition(s.cx, 0, s.cz)
    const cols = Math.max(6, Math.floor(s.length / 1.6))
    const rows = s.kind === 'grass' ? 5 : 7
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() < density) continue
        const lx = -s.length / 2 + 0.9 + (c / (cols - 1)) * (s.length - 1.8)
        const lz = -s.depth / 2 + 2 + (r / (rows - 1)) * (s.depth - 3)
        const ly = 0.8 + (r / (rows - 1)) * (h - 1.4)
        local.set(lx + (Math.random() - 0.5) * 0.6, ly, lz)
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

function Stand({ cx, cz, rotY, length, depth, kind }: PlacedGrandstand) {
  const postXs = useMemo(() => {
    const k = Math.max(2, Math.round(length / 16))
    return Array.from({ length: k }, (_, i) => -length / 2 + 2 + (i / (k - 1)) * (length - 4))
  }, [length])
  const wedge = useMemo(
    () => (kind === 'grass' ? wedgeGeometry(length, depth, GRASS_HEIGHT) : null),
    [kind, length, depth],
  )

  if (kind === 'grass' && wedge) {
    return (
      <RigidBody type="fixed" colliders={false} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
        {/* a shallow collider so you can't drive up onto the picnic bank */}
        <CuboidCollider args={[length / 2, 1.6, depth / 2]} position={[0, 1.4, 0]} />
        {/* grassy spectator bank, rising away from the track */}
        <mesh geometry={wedge} receiveShadow castShadow>
          <meshStandardMaterial color="#4e7a3c" roughness={1} />
        </mesh>
        {/* low retaining wall at the front */}
        <mesh position={[0, 0.45, -depth / 2 + 0.25]} castShadow receiveShadow>
          <boxGeometry args={[length, 0.9, 0.4]} />
          <meshStandardMaterial color="#5a5f66" roughness={0.9} />
        </mesh>
      </RigidBody>
    )
  }

  return (
    <RigidBody type="fixed" colliders={false} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      <CuboidCollider args={[length / 2, BANK_HEIGHT / 2, depth / 2]} position={[0, BANK_HEIGHT / 2, 0]} />
      {/* raked seating bank */}
      <mesh position={[0, BANK_HEIGHT / 2 - 0.5, 0]} rotation={[-0.34, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, BANK_HEIGHT, depth]} />
        <meshStandardMaterial color="#9a9ea3" roughness={0.95} />
      </mesh>
      {/* front wall / advertising band, track side */}
      <mesh position={[0, 0.8, -depth / 2 + 0.3]} castShadow receiveShadow>
        <boxGeometry args={[length, 1.6, 0.5]} />
        <meshStandardMaterial color="#e0c05a" roughness={0.7} />
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
    </RigidBody>
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
