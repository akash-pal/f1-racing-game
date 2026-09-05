import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { Car2D } from './Car2D'
import { Track2D } from './Track2D'

// Phase 2: top-down 2D prototype. Orthographic camera straight down; the arcade
// car (no physics engine) drives the ring track.

export function Prototype2D() {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <color attach="background" args={['#1a2416']} />
      {/* straight-down ortho view — zoom/frustum MUST be set or the screen is black */}
      <OrthographicCamera
        makeDefault
        position={[0, 100, 0]}
        zoom={11}
        near={0.1}
        far={500}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <ambientLight intensity={0.85} />
      <directionalLight position={[20, 40, 10]} intensity={1.1} castShadow />
      <Track2D />
      <Car2D />
    </Canvas>
  )
}
