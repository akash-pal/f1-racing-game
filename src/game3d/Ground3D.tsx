import { RigidBody, CuboidCollider } from '@react-three/rapier'

// Big flat driving surface + a ramp and a scatter of cones to feel out momentum,
// jumps and braking. Thick collider so a fast car can't tunnel through.

const CONES: [number, number][] = [
  [6, -14],
  [-6, -14],
  [10, -28],
  [-10, -28],
  [0, -40],
  [14, 6],
  [-14, 10],
]

export function Ground3D() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false} friction={1}>
        <CuboidCollider args={[150, 1, 150]} position={[0, -1, 0]} />
        <mesh position={[0, -1, 0]} receiveShadow>
          <boxGeometry args={[300, 2, 300]} />
          <meshStandardMaterial color="#40474f" />
        </mesh>
        <gridHelper args={[300, 150, '#59616c', '#4b525b']} position={[0, 0.02, 0]} />
      </RigidBody>

      {/* ramp */}
      <RigidBody type="fixed" colliders="cuboid" friction={1}>
        <mesh position={[0, 0.9, -60]} rotation={[-0.22, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[10, 0.6, 12]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      </RigidBody>

      {/* start line marker */}
      <mesh position={[0, 0.03, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 1.4]} />
        <meshBasicMaterial color="#e8e8e8" />
      </mesh>

      {/* cones */}
      {CONES.map(([x, z], i) => (
        <RigidBody key={i} position={[x, 0.35, z]} colliders="hull" mass={2} friction={0.6}>
          <mesh castShadow>
            <coneGeometry args={[0.32, 0.7, 12]} />
            <meshStandardMaterial color="#e8873c" />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}
