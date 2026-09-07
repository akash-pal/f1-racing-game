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
// Circuit spectator map. The built stands are modelled on a typical F1
// grandstand (cf. Sketchfab "Grandstand Type 1"): stepped concrete seating
// terraces with coloured seat bands, an open steel back frame with diagonal
// bracing, and a cantilever roof with a fascia banner. The green "picnic" /
// "natural" stands stay grassy banks. Every stand has a fixed collider so the
// car can't drive through it; spectators are one shared instanced mesh.

const BANK_HEIGHT = 8
const GRASS_HEIGHT = 4
const STEEL = '#3b3f45'
const CONCRETE = '#8d9196'
const SEAT = '#23509c'
const FASCIA = '#e2c14e'

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
    const grass = s.kind === 'grass'
    const h = grass ? GRASS_HEIGHT : BANK_HEIGHT
    const density = grass ? 0.5 : 0.24
    q.setFromEuler(e.set(0, s.rotY, 0))
    m.makeRotationFromQuaternion(q).setPosition(s.cx, 0, s.cz)
    const cols = Math.max(6, Math.floor(s.length / 1.5))
    const rows = grass ? 5 : Math.min(9, Math.max(5, Math.round(s.depth / 1.15)))
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() < density) continue
        const f = rows === 1 ? 0.5 : r / (rows - 1)
        const lx = -s.length / 2 + 0.9 + (c / (cols - 1)) * (s.length - 1.8)
        // sit them on the terrace treads (or the grass slope)
        const lz = grass ? -s.depth / 2 + 2 + f * (s.depth - 3) : -s.depth / 2 + (r + 0.55) * (s.depth / rows) // prettier-ignore
        const ly = grass ? 0.8 + f * (h - 1.4) : (r + 0.95) * (h / rows)
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

function GrassBank({ cx, cz, rotY, length, depth }: PlacedGrandstand) {
  const wedge = useMemo(() => wedgeGeometry(length, depth, GRASS_HEIGHT), [length, depth])
  return (
    <RigidBody type="fixed" colliders={false} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      {/* a shallow collider so you can't drive up onto the picnic bank */}
      <CuboidCollider args={[length / 2, 1.6, depth / 2]} position={[0, 1.4, 0]} />
      <mesh geometry={wedge} receiveShadow castShadow>
        <meshStandardMaterial color="#4e7a3c" roughness={1} />
      </mesh>
      <mesh position={[0, 0.45, -depth / 2 + 0.25]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.9, 0.4]} />
        <meshStandardMaterial color="#5a5f66" roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}

function Stand({ cx, cz, rotY, length, depth, kind }: PlacedGrandstand) {
  const geo = useMemo(() => {
    if (kind === 'grass') return null
    const steps = Math.min(9, Math.max(5, Math.round(depth / 1.15)))
    const stepD = depth / steps
    const stepH = BANK_HEIGHT / steps
    const nCol = Math.min(9, Math.max(3, Math.round(length / 12)))
    const colH = BANK_HEIGHT + 3
    const colZ = depth / 2 - 0.3
    const colXs = Array.from({ length: nCol }, (_, i) =>
      nCol === 1 ? 0 : -length / 2 + (i / (nCol - 1)) * length,
    )
    // one diagonal brace per bay, alternating direction
    const bayW = length / Math.max(1, nCol - 1)
    const braceLen = Math.hypot(bayW, colH)
    const braceAng = Math.atan2(colH, bayW)
    const braces = colXs.slice(0, -1).map((x, i) => ({
      x: x + bayW / 2,
      rot: (i % 2 === 0 ? 1 : -1) * braceAng,
      len: braceLen,
    }))
    // three roof struts, back column top -> roof front
    const strutLen = Math.hypot(depth + 1, 2)
    const strutAng = Math.atan2(2, depth + 1)
    const strutXs = [-length / 2 + length * 0.15, 0, length / 2 - length * 0.15]
    return { steps, stepD, stepH, colH, colZ, colXs, braces, strutLen, strutAng, strutXs }
  }, [kind, length, depth])

  if (kind === 'grass') return <GrassBank {...{ cx, cz, rotY, length, depth, kind, name: '' }} />
  if (!geo) return null
  const { steps, stepD, stepH, colH, colZ, colXs, braces, strutLen, strutAng, strutXs } = geo

  return (
    <RigidBody type="fixed" colliders={false} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      <CuboidCollider args={[length / 2, BANK_HEIGHT / 2, depth / 2]} position={[0, BANK_HEIGHT / 2, 0]} />

      {/* stepped seating terraces + coloured seat bands */}
      {Array.from({ length: steps }, (_, i) => {
        const y = (i + 0.5) * stepH
        const z = -depth / 2 + (i + 0.5) * stepD
        return (
          <group key={i}>
            <mesh position={[0, y, z]} castShadow receiveShadow>
              <boxGeometry args={[length, stepH * 1.3, stepD * 0.98]} />
              <meshStandardMaterial color={CONCRETE} roughness={0.95} />
            </mesh>
            <mesh position={[0, (i + 1) * stepH + 0.06, z + stepD * 0.05]}>
              <boxGeometry args={[length * 0.98, 0.16, stepD * 0.62]} />
              <meshStandardMaterial color={SEAT} roughness={0.8} />
            </mesh>
          </group>
        )
      })}

      {/* front concourse wall */}
      <mesh position={[0, 0.9, -depth / 2 - 0.1]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.6, 1.8, 0.6]} />
        <meshStandardMaterial color="#33383e" roughness={0.9} />
      </mesh>

      {/* open steel back frame: columns + diagonal bracing */}
      {colXs.map((x, i) => (
        <mesh key={`c${i}`} position={[x, colH / 2, colZ]} castShadow>
          <boxGeometry args={[0.4, colH, 0.4]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {braces.map((b, i) => (
        <mesh key={`b${i}`} position={[b.x, colH / 2, colZ]} rotation={[0, 0, b.rot]} castShadow>
          <boxGeometry args={[b.len, 0.18, 0.18]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* horizontal tie along the top of the columns */}
      <mesh position={[0, colH - 0.2, colZ]} castShadow>
        <boxGeometry args={[length, 0.3, 0.3]} />
        <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* cantilever roof + struts + fascia banner */}
      {strutXs.map((x, i) => (
        <mesh
          key={`s${i}`}
          position={[x, colH + 1, -0.5]}
          rotation={[strutAng, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.28, 0.28, strutLen]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, colH + 2, -0.5]} rotation={[-0.05, 0, 0]} castShadow>
        <boxGeometry args={[length + 2, 0.35, depth + 5]} />
        <meshStandardMaterial color="#26292e" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, colH + 1.6, -depth / 2 - 2]} castShadow>
        <boxGeometry args={[length + 2.2, 1, 0.2]} />
        <meshStandardMaterial color={FASCIA} roughness={0.6} />
      </mesh>
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
