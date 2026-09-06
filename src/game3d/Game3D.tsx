import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { PHYSICS_TIMESTEP } from '../lib/constants'
import { useGameStore } from '../state/useGameStore'
import { Track3D } from '../track/Track3D'
import { ChaseCamera } from './ChaseCamera'
import { Ground3D } from './Ground3D'
import { Vehicle } from './Vehicle'
import { useVehicleTuning } from './vehicleConfig'

// 3D driving: Rapier raycast vehicle on the Silverstone circuit with barriers,
// plus a chase camera.

export function Game3D() {
  const tuning = useVehicleTuning()
  const debugColliders = useGameStore((s) => s.debug.colliders)
  const chassisRef = useRef<RapierRigidBody>(null)

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={['#afc4e0']} />
      <fog attach="fog" args={['#afc4e0', 260, 900]} />

      <hemisphereLight args={['#dcecff', '#4a5535', 0.8]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[120, 160, 60]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-far={520}
      />

      <Suspense fallback={null}>
        <Physics timeStep={PHYSICS_TIMESTEP} debug={debugColliders}>
          <Ground3D />
          <Track3D />
          <Vehicle tuning={tuning} chassisRef={chassisRef} />
        </Physics>
      </Suspense>

      <ChaseCamera targetRef={chassisRef} />
    </Canvas>
  )
}
