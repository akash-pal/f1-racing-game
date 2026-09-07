import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useRef, type RefObject } from 'react'
import { Vector3, Quaternion } from 'three'
import { KMH_PER_MS } from '../lib/constants'
import { pseudoGear } from '../lib/pseudoGear'
import { spawn3D, getCircuit } from '../track/circuit'
import { F1Car } from '../car/F1Car'
import { F1CarModel } from '../car/F1CarModel'
import { ghostCommitLap, ghostRecordFrame, ghostStartRecording } from '../car/ghost'
import { useLapTimer } from '../hooks/useLapTimer'
import { raceGo } from '../hooks/useRaceControl'
import { useGameStore } from '../state/useGameStore'
import { useHudStore } from '../state/useHudStore'
import { useInputStore } from '../state/useInputStore'
import { useLiveStore } from '../state/useLiveStore'
import type { VehicleTuning } from '../lib/types'
import { useRaycastVehicle } from './useRaycastVehicle'

interface Props {
  tuning: VehicleTuning
  chassisRef: RefObject<RapierRigidBody | null>
}

const Y_AXIS = new Vector3(0, 1, 0)
const spawnQuat = new Quaternion()
const SPAWN = spawn3D()
const track = getCircuit()

export function Vehicle({ tuning, chassisRef }: Props) {
  const controllerRef = useRaycastVehicle(chassisRef, tuning)
  const hudAccum = useRef(0)
  const wasRacing = useRef(false)
  const recordClearAt = useRef(0)
  const rescueTimer = useRef(0)
  const lap = useLapTimer()
  const resetNonce = useGameStore((s) => s.resetNonce)

  const respawn = () => {
    const b = chassisRef.current
    if (b) {
      spawnQuat.setFromAxisAngle(Y_AXIS, SPAWN.heading)
      b.setTranslation({ x: SPAWN.position[0], y: SPAWN.position[1], z: SPAWN.position[2] }, true)
      b.setRotation(spawnQuat, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    hudAccum.current = 0
    lap.reset(performance.now())
    ghostStartRecording()
    useLiveStore.getState().set({ lapMs: 0, x: SPAWN.position[0], z: SPAWN.position[2] })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(respawn, [resetNonce])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const controller = controllerRef.current
    const b = chassisRef.current
    if (!controller || !b) return

    const now = performance.now()
    const racing = raceGo(now)

    // GO edge: (re)start lap clock + ghost recording exactly at lights-out
    if (racing && !wasRacing.current) {
      lap.reset(now)
      ghostStartRecording()
    }
    wasRacing.current = racing

    // hold the car still on the grid during the countdown
    if (!racing) {
      b.setLinvel({ x: 0, y: b.linvel().y, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    // telemetry
    const lv = b.linvel()
    const p = b.translation()
    const r = b.rotation()
    const speedMs = Math.hypot(lv.x, lv.z)

    // far-off rescue: with no walls, if the car ends up well out in the grass
    // for a moment, drop it back onto the nearest bit of track facing forward
    const surf = track.sample(p.x, p.z)
    if (racing && surf.distToCenter > 55) {
      rescueTimer.current += dt
      if (rescueTimer.current > 2.2) {
        rescueTimer.current = 0
        const n = track.samples.length
        const i = Math.min(n - 1, Math.max(0, Math.round(surf.t * (n - 1))))
        const rp = track.samples[i]
        const rtan = track.tangents[i]
        spawnQuat.setFromAxisAngle(Y_AXIS, Math.atan2(-rtan.x, -rtan.z))
        b.setTranslation({ x: rp.x, y: 1.2, z: rp.z }, true)
        b.setRotation(spawnQuat, true)
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    } else {
      rescueTimer.current = 0
    }
    // forward / lateral split for slip + gear
    const fx = 2 * (r.x * r.z + r.w * r.y)
    const fz = 1 - 2 * (r.x * r.x + r.y * r.y)
    const fwdSpeed = -(lv.x * fx + lv.z * fz)
    const latSpeed = lv.x * fz - lv.z * fx
    const heading = Math.atan2(-fx, -fz)
    const input = useInputStore.getState()
    const slip = Math.min(
      1,
      Math.abs(latSpeed) / Math.max(6, speedMs) + (input.handbrake ? 0.4 : 0),
    )

    const lapMs = racing ? lap.elapsed(now) : 0
    useLiveStore.getState().set({
      lapMs,
      x: p.x,
      y: p.y,
      z: p.z,
      heading,
      speedMs,
      slip,
    })

    // ghost recording
    if (racing) ghostRecordFrame(lapMs, p, r)

    // lap line
    const crossing = lap.update(p.x, p.z, now)
    if (crossing.crossed && crossing.lapMs !== undefined) {
      const isBest = ghostCommitLap(crossing.lapMs)
      ghostStartRecording()
      if (isBest || crossing.isRecord) recordClearAt.current = now + 2600
    }
    if (recordClearAt.current && now > recordClearAt.current) {
      recordClearAt.current = 0
      useHudStore.setState({ newRecord: false })
    }

    // HUD (throttled ~15 Hz)
    hudAccum.current += dt
    if (hudAccum.current >= 0.066) {
      hudAccum.current = 0
      const speedKph = speedMs * KMH_PER_MS
      const g = pseudoGear(speedKph, fwdSpeed < -0.5)
      useHudStore.getState().set({
        speedKph,
        gearLabel: g.label,
        rpm: g.rpm,
        throttle: racing ? input.throttle : 0,
        brake: input.brake,
        offTrack: !surf.onTrack,
        currentLapMs: lapMs,
      })
    }
  })

  return (
    <RigidBody
      ref={chassisRef}
      position={SPAWN.position}
      colliders={false}
      canSleep={false}
      ccd
      linearDamping={0.15}
      angularDamping={0.9}
      enabledRotations={[false, true, false]}
      additionalSolverIterations={4}
    >
      <CuboidCollider
        args={[0.55, 0.3, 2.35]}
        position={[0, -0.02, 0.1]}
        mass={tuning.chassisMass}
        friction={0.7}
      />

      <Suspense fallback={<F1Car />}>
        <F1CarModel />
      </Suspense>
    </RigidBody>
  )
}
