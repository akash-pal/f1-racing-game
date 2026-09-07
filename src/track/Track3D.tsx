import { useTexture } from '@react-three/drei'
import { useLayoutEffect, useMemo } from 'react'
import {
  DoubleSide,
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { getCircuit } from './circuit'
import { buildKerbGeometries, buildRoadGeometry } from './trackMesh'

// The Buddh International Circuit in 3D: photo-textured tarmac ribbon, red/white
// kerbs at the corners, and the start/finish line. No trackside walls — running
// wide just puts you on the grass (which is slow); see Vehicle for the off-track
// grip penalty and the far-off rescue.

export function Track3D() {
  const track = getCircuit()

  // real asphalt (Poly Haven "asphalt_track", downscaled to 1K)
  const asphalt = useTexture({
    map: '/textures/asphalt_diff.jpg',
    normalMap: '/textures/asphalt_nor.jpg',
    roughnessMap: '/textures/asphalt_rough.jpg',
  })
  useLayoutEffect(() => {
    for (const tex of Object.values(asphalt) as Texture[]) {
      tex.wrapS = tex.wrapT = RepeatWrapping
      tex.anisotropy = 8
      tex.needsUpdate = true
    }
    asphalt.map.colorSpace = SRGBColorSpace
    asphalt.normalMap.colorSpace = LinearSRGBColorSpace
    asphalt.roughnessMap.colorSpace = LinearSRGBColorSpace
  }, [asphalt])

  const road = useMemo(() => buildRoadGeometry(0.02), [])
  const [kerbA, kerbB] = useMemo(() => buildKerbGeometries(1.4), [])

  const start = track.start
  const startYaw = Math.atan2(start.forward.x, start.forward.z)

  return (
    <group>
      {/* tarmac */}
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial
          {...asphalt}
          color="#ffffff"
          roughness={1}
          metalness={0}
          envMapIntensity={0.4}
          normalScale={[0.6, 0.6]}
          side={DoubleSide}
        />
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
    </group>
  )
}
