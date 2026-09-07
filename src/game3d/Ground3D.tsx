import { useTexture } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useLayoutEffect } from 'react'
import { RepeatWrapping, SRGBColorSpace } from 'three'

// Big flat grass plane the whole circuit sits on. Thick collider so a fast car
// can't tunnel through if it flies off. Textured mowed grass tiled across it.
export function Ground3D() {
  const grass = useTexture('/textures/grass_diff.jpg')

  useLayoutEffect(() => {
    grass.wrapS = grass.wrapT = RepeatWrapping
    grass.repeat.set(220, 220)
    grass.anisotropy = 8
    grass.colorSpace = SRGBColorSpace
    grass.needsUpdate = true
  }, [grass])

  return (
    <RigidBody type="fixed" colliders={false} friction={0.9}>
      <CuboidCollider args={[600, 2, 600]} position={[0, -2, 0]} />
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1600, 1600]} />
        <meshStandardMaterial map={grass} color="#cfd8c2" roughness={1} metalness={0} />
      </mesh>
      {/* opaque skirt below so there's no gap under the grass plane */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[1600, 4, 1600]} />
        <meshStandardMaterial color="#33502a" roughness={1} />
      </mesh>
    </RigidBody>
  )
}
