import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useLayoutEffect, useRef } from 'react'
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three'
import { getCircuit } from '../track/circuit'
import { Car2D } from './Car2D'
import { Track2D } from './Track2D'

// Phase 2: top-down 2D prototype. Orthographic camera straight down, framed to
// fit the whole circuit outline. The arcade car (no physics engine) drives.

function FitCamera() {
  const camRef = useRef<ThreeOrthographicCamera>(null)
  const size = useThree((s) => s.size)
  const b = getCircuit().bounds

  useLayoutEffect(() => {
    const cam = camRef.current
    if (!cam) return
    const margin = 90
    const w = size.width || 1280
    const hh = size.height || 720
    const zoom = Math.min(w / (b.width + margin), hh / (b.depth + margin))
    cam.zoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
    cam.updateProjectionMatrix()
  }, [size, b])

  return (
    <OrthographicCamera
      ref={camRef}
      makeDefault
      position={[b.centerX, 100, b.centerZ]}
      near={0.1}
      far={500}
      zoom={1.1}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  )
}

export function Prototype2D() {
  return (
    <Canvas dpr={[1, 2]}>
      <color attach="background" args={['#1a2416']} />
      <FitCamera />
      <ambientLight intensity={1} />
      <directionalLight position={[40, 80, 20]} intensity={0.8} />
      <Track2D />
      <Car2D />
    </Canvas>
  )
}
