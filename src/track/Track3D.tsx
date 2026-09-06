import { Line } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { DoubleSide, Vector3 } from 'three'
import { getSilverstone } from './silverstone'
import { buildKerbGeometries, buildRoadGeometry, buildWallGeometry } from './trackMesh'

// The Silverstone circuit in 3D: tarmac ribbon + red/white kerbs + a
// start/finish line + Armco-style barriers on BOTH sides (with trimesh colliders
// that keep the car on the island and give the scene real depth).

const WALL_HEIGHT = 2.1
const WALL_OFFSET = 1.4 // how far outside the painted edge the barrier sits

export function Track3D() {
  const track = getSilverstone()

  const road = useMemo(() => buildRoadGeometry(0.02), [])
  const [kerbA, kerbB] = useMemo(() => buildKerbGeometries(1.4), [])
  const leftWall = useMemo(() => buildWallGeometry('left', WALL_OFFSET, WALL_HEIGHT), [])
  const rightWall = useMemo(() => buildWallGeometry('right', WALL_OFFSET, WALL_HEIGHT), [])

  const start = track.start
  // yaw so a plane's +Z faces along the racing direction
  const startYaw = Math.atan2(start.forward.x, start.forward.z)

  // bright rails riding the top of each barrier (visual depth cue)
  const [leftRail, rightRail] = useMemo(() => {
    const t = getSilverstone()
    const rail = (edge: Vector3[]) =>
      edge.map((e, i) => {
        const out = new Vector3().copy(e).sub(t.samples[i]).setY(0).normalize()
        return new Vector3(e.x + out.x * WALL_OFFSET, WALL_HEIGHT, e.z + out.z * WALL_OFFSET)
      })
    return [rail(t.leftEdge), rail(t.rightEdge)]
  }, [])

  return (
    <group>
      {/* tarmac */}
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#33373d" roughness={0.95} metalness={0} side={DoubleSide} />
      </mesh>

      {/* kerbs */}
      <mesh geometry={kerbA}>
        <meshStandardMaterial color="#c33636" roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh geometry={kerbB}>
        <meshStandardMaterial color="#e8e8e8" roughness={0.7} side={DoubleSide} />
      </mesh>

      {/* start / finish line */}
      <mesh
        position={[start.position.x, 0.05, start.position.z]}
        rotation={[-Math.PI / 2, 0, startYaw]}
      >
        <planeGeometry args={[track.halfWidth * 2, 2.4]} />
        <meshBasicMaterial color="#f0f0f0" />
      </mesh>

      {/* barriers — trimesh colliders keep the car contained */}
      <RigidBody type="fixed" colliders="trimesh" friction={0.2} restitution={0.1}>
        <mesh geometry={leftWall} castShadow receiveShadow>
          <meshStandardMaterial color="#c9ccd2" roughness={0.6} metalness={0.2} side={DoubleSide} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="trimesh" friction={0.2} restitution={0.1}>
        <mesh geometry={rightWall} castShadow receiveShadow>
          <meshStandardMaterial color="#c9ccd2" roughness={0.6} metalness={0.2} side={DoubleSide} />
        </mesh>
      </RigidBody>

      {/* barrier top rails */}
      <Line points={leftRail} color="#d23b3b" lineWidth={3} />
      <Line points={rightRail} color="#d23b3b" lineWidth={3} />
    </group>
  )
}
