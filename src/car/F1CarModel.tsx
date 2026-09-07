import { useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo } from 'react'
import { DoubleSide, Mesh, MeshStandardMaterial } from 'three'

// Real F1 model (Sketchfab "Formula 1 Car Midpoly" by LWDream, CC-BY-4.0).
//
// As loaded, the GLB's root node already converts to Y-up: the model sits
// length-along-X (nose at -X), up = +Y, width along Z. A single -90 deg Y
// rotation puts it in the game convention (forward = -Z). Raw local bounds
// (scale 1), measured once: X [-6.12, 4.78], Y [-0.82, 1.33], Z [-1.33, 2.76].
// Wheels are baked into the body so they don't spin.

const URL = '/models/f1.glb'
useGLTF.preload(URL)

// raw bounds at scale 1
const RAW = {
  xMin: -6.12,
  xMax: 4.78,
  yMin: -0.82,
  zMin: -1.33,
  zMax: 2.76,
}
const RAW_LEN = RAW.xMax - RAW.xMin // ~10.9
const GROUND_Y = -0.52 // where the tyres should rest (matches suspension travel)

interface Props {
  /** target length in game units (nose tip to rear-wing tip) */
  length?: number
  /** < 1 -> translucent (ghost car) */
  opacity?: number
}

export function F1CarModel({ length = 6.6, opacity = 1 }: Props) {
  const { scene } = useGLTF(URL)

  // clone the graph AND the materials so the player car and the translucent
  // ghost don't stomp each other's material settings (Object3D.clone shares them)
  const model = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      if (o instanceof Mesh && o.material) {
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone()
        o.castShadow = true
        o.receiveShadow = false
      }
    })
    return c
  }, [scene])

  const s = length / RAW_LEN
  // after Ry(-90): model (px,py,pz) -> game (-pz, py, px)
  const offX = -((RAW.zMin + RAW.zMax) / 2) * -s // centre width (game X = -pz)
  const offZ = -((RAW.xMin + RAW.xMax) / 2) * s // centre length (game Z = px)
  const offY = GROUND_Y - RAW.yMin * s // drop the tyres to the ground

  useLayoutEffect(() => {
    model.traverse((o) => {
      if (!(o instanceof Mesh)) return
      o.castShadow = opacity >= 1
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (!(m instanceof MeshStandardMaterial)) continue
        if (!m.userData.tuned) {
          // the packed metallic-roughness + emissive maps make the body a
          // glowing mirror without an HDRI — strip them, keep just the painted
          // livery + normal map, matte and non-metallic
          m.metalnessMap = null
          m.roughnessMap = null
          m.emissiveMap = null
          m.emissive.setScalar(0)
          m.emissiveIntensity = 0
          m.metalness = 0
          m.roughness = 0.72
          m.envMapIntensity = 0.6
          m.side = DoubleSide
          m.userData.tuned = true
        }
        m.transparent = opacity < 1
        m.opacity = opacity
        m.depthWrite = opacity >= 1
        m.needsUpdate = true
      }
    })
  }, [model, opacity])

  return (
    <group position={[offX, offY, offZ]} rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={model} scale={s} />
    </group>
  )
}
