import { useTexture } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useLayoutEffect } from 'react'
import { RepeatWrapping, SRGBColorSpace } from 'three'

// The grass the whole circuit sits on: one large textured plane, coplanar with
// the road so there's no lip or shadow line at the track edge, plus a thick
// collider so a fast car can't tunnel through if it leaves the island.
export function Ground3D() {
  const grass = useTexture('/textures/grass_diff.jpg')

  useLayoutEffect(() => {
    grass.wrapS = grass.wrapT = RepeatWrapping
    grass.repeat.set(100, 100)
    grass.anisotropy = 16
    grass.colorSpace = SRGBColorSpace
    grass.needsUpdate = true
  }, [grass])

  return (
    <RigidBody type="fixed" colliders={false} friction={0.9}>
      <CuboidCollider args={[900, 2, 900]} position={[0, -2, 0]} />
      {/* y just under the road (0.02) — polygonOffset keeps the road on top
          without a visible step or edge shadow */}
      <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1800, 1800]} />
        <meshStandardMaterial
          map={grass}
          color="#e2e8d4"
          roughness={1}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>
    </RigidBody>
  )
}
