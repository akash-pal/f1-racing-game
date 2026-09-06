import { RigidBody, CuboidCollider } from '@react-three/rapier'

// Big flat grass plane the whole circuit sits on. Thick collider so a fast car
// can't tunnel through if it flies off over a barrier.
export function Ground3D() {
  return (
    <RigidBody type="fixed" colliders={false} friction={0.9}>
      <CuboidCollider args={[600, 2, 600]} position={[0, -2, 0]} />
      <mesh position={[0, -2, 0]} receiveShadow>
        <boxGeometry args={[1200, 4, 1200]} />
        <meshStandardMaterial color="#3f6130" roughness={1} />
      </mesh>
    </RigidBody>
  )
}
