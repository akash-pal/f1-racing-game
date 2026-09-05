import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { PHYSICS_TIMESTEP } from '../lib/constants'
import { useGameStore } from '../state/useGameStore'
import { ChaseCamera } from './ChaseCamera'
import { Ground3D } from './Ground3D'
import { Vehicle } from './Vehicle'
import { useVehicleTuning } from './vehicleConfig'

// Phase 3: 3D car with a real Rapier raycast vehicle + chase camera.

export function Game3D() {
  const tuning = useVehicleTuning()
  const debugColliders = useGameStore((s) => s.debug.colliders)
  const chassisRef = useRef<RapierRigidBody>(null)

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={['#0f1420']} />
      <fog attach="fog" args={['#0f1420', 70, 260]} />

      <hemisphereLight args={['#bcd3ff', '#3a3320', 0.6]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[40, 60, 20]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-far={220}
      />

      <Suspense fallback={null}>
        <Physics timeStep={PHYSICS_TIMESTEP} debug={debugColliders}>
          <Ground3D />
          <Vehicle tuning={tuning} chassisRef={chassisRef} />
        </Physics>
      </Suspense>

      <ChaseCamera targetRef={chassisRef} />
    </Canvas>
  )
}
