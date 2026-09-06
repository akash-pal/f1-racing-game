import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { PHYSICS_TIMESTEP } from '../lib/constants'
import { useGameStore } from '../state/useGameStore'
import { RacingLine } from '../track/RacingLine'
import { Scenery } from '../track/Scenery'
import { Track3D } from '../track/Track3D'
import { CameraRig } from './CameraRig'
import { GhostCar } from './GhostCar'
import { Ground3D } from './Ground3D'
import { SkyDome } from './SkyDome'
import { StartLights } from './StartLights'
import { Vehicle } from './Vehicle'
import { useVehicleTuning } from './vehicleConfig'

// 3D driving: Rapier raycast vehicle on the Silverstone circuit, with scenery,
// grandstands, time-of-day lighting, a start-light countdown, a best-lap ghost,
// a racing-line assist and four camera views.

export function Game3D() {
  const tuning = useVehicleTuning()
  const debugColliders = useGameStore((s) => s.debug.colliders)
  const racingLine = useGameStore((s) => s.assists.racingLine)
  const chassisRef = useRef<RapierRigidBody>(null)

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.15 }}>
      <SkyDome targetRef={chassisRef} />

      <Suspense fallback={null}>
        <Physics timeStep={PHYSICS_TIMESTEP} debug={debugColliders}>
          <Ground3D />
          <Track3D />
          <Vehicle tuning={tuning} chassisRef={chassisRef} />
          <StartLights />
        </Physics>

        <Scenery />
        {racingLine && <RacingLine />}
        <GhostCar />
      </Suspense>

      <CameraRig targetRef={chassisRef} />
    </Canvas>
  )
}
