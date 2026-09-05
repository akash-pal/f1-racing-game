import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/useGameStore'
import { useInputStore } from '../state/useInputStore'

// Phase 1 learning sandbox: prove that R3F + Rapier + the Rapier wasm all load,
// gravity + colliders work, and keyboard input reaches a body every frame.

const PUSH = 9 // impulse magnitude per second of hold

function KeyBox() {
  const body = useRef<RapierRigidBody>(null)
  const resetNonce = useGameStore((s) => s.resetNonce)

  useEffect(() => {
    const b = body.current
    if (!b) return
    b.setTranslation({ x: 0, y: 4, z: 0 }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }, [resetNonce])

  useFrame((_, dt) => {
    const b = body.current
    if (!b) return
    const { throttle, brake, steer } = useInputStore.getState()
    const fwd = throttle - brake // ArrowUp/Down
    if (fwd !== 0 || steer !== 0) {
      b.applyImpulse({ x: steer * PUSH * dt, y: 0, z: -fwd * PUSH * dt }, true)
    }
  })

  return (
    <RigidBody ref={body} position={[0, 4, 0]} colliders="cuboid" restitution={0.3} friction={0.8}>
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e6663d" />
      </mesh>
    </RigidBody>
  )
}

function Ground() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[20, 0.5, 20]} position={[0, -0.5, 0]} />
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[40, 1, 40]} />
        <meshStandardMaterial color="#3a4048" />
      </mesh>
      <gridHelper args={[40, 40, '#5c636e', '#4a505a']} position={[0, 0.01, 0]} />
    </RigidBody>
  )
}

export function Sandbox() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 8, 12], fov: 50 }}>
      <color attach="background" args={['#12151a']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 8]} intensity={1.4} castShadow />
      <Physics>
        <Ground />
        <KeyBox />
      </Physics>
      <OrbitControls makeDefault />
    </Canvas>
  )
}
