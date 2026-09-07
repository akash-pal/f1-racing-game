import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, type RefObject } from 'react'
import { Group, Vector3, Quaternion } from 'three'
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import {
  FRONT_WHEELS,
  KMH_PER_MS,
  WHEEL_VISUAL_POSITIONS,
  WHEEL_VISUAL_RADIUS,
} from '../lib/constants'
import { pseudoGear } from '../lib/pseudoGear'
import { spawn3D, getCircuit } from '../track/circuit'
import { F1Car } from '../car/F1Car'
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

// Visible wheels. The GLB body has no separate wheel meshes, so these are drawn
// on top: steer angle + suspension travel come from the raycast controller, and
// the rolling spin is integrated from the chassis' forward speed (the driven
// rear wheels don't report a usable rotation from Rapier).
function Wheels({
  controllerRef,
  chassisRef,
  restLength,
}: {
  controllerRef: RefObject<DynamicRayCastVehicleController | null>
  chassisRef: RefObject<RapierRigidBody | null>
  restLength: number
}) {
  const steer = useRef<(Group | null)[]>([])
  const roll = useRef<(Group | null)[]>([])
  const spin = useRef(0)
  const isFront = (i: number) => (FRONT_WHEELS as readonly number[]).includes(i)

  useFrame((_, rawDt) => {
    const c = controllerRef.current
    const b = chassisRef.current
    if (!c || !b) return
    const dt = Math.min(rawDt, 1 / 30)

    // signed forward speed along the chassis nose (-Z)
    const lv = b.linvel()
    const r = b.rotation()
    const fx = 2 * (r.x * r.z + r.w * r.y)
    const fz = 1 - 2 * (r.x * r.x + r.y * r.y)
    const fwd = -(lv.x * fx + lv.z * fz)
    spin.current += (fwd / WHEEL_VISUAL_RADIUS) * dt

    for (let i = 0; i < 4; i++) {
      const s = steer.current[i]
      const w = roll.current[i]
      if (!s || !w) continue
      const susp = c.wheelSuspensionLength(i) || restLength
      s.position.y = WHEEL_VISUAL_POSITIONS[i][1] + (restLength - susp)
      s.rotation.y = isFront(i) ? c.wheelSteering(i) || 0 : 0
      w.rotation.x = spin.current
    }
  })

  return (
    <>
      {WHEEL_VISUAL_POSITIONS.map((p, i) => {
        const R = WHEEL_VISUAL_RADIUS
        const W = 0.34 // tyre width
        const outboard = p[0] < 0 ? -1 : 1 // rim face points away from the car
        return (
          <group key={i} ref={(el) => (steer.current[i] = el)} position={p}>
            <group ref={(el) => (roll.current[i] = el)}>
              {/* slick tyre */}
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[R, R, W, 24]} />
                <meshStandardMaterial color="#101011" roughness={0.9} metalness={0} />
              </mesh>
              {/* rim face on the outboard side, with a couple of spokes so the
                  spin reads */}
              <group position={[outboard * (W / 2 - 0.01), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <mesh>
                  <cylinderGeometry args={[R * 0.62, R * 0.62, 0.015, 18]} />
                  <meshStandardMaterial color="#3a3d42" metalness={0.3} roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.01, 0]}>
                  <cylinderGeometry args={[R * 0.18, R * 0.18, 0.05, 10]} />
                  <meshStandardMaterial color="#1c1d1f" metalness={0.4} roughness={0.55} />
                </mesh>
                {[0, 1, 2].map((k) => (
                  <mesh key={k} position={[0, 0.012, 0]} rotation={[0, (k * Math.PI) / 3, 0]}>
                    <boxGeometry args={[R * 1.05, 0.012, 0.045]} />
                    <meshStandardMaterial color="#2a2c30" metalness={0.3} roughness={0.6} />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        )
      })}
    </>
  )
}

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
      angularDamping={1.4}
      enabledRotations={[false, true, false]}
      additionalSolverIterations={4}
    >
      <CuboidCollider
        args={[0.55, 0.3, 2.35]}
        position={[0, -0.02, 0.1]}
        mass={tuning.chassisMass}
        friction={0.7}
      />

      {/* The photoreal GLB bakes its wheels into the body mesh, so they can't be
          spun without a doubled-up wheel showing through. Use the built-in F1
          body, which is authored to take separate wheels. */}
      <F1Car />

      <Wheels
        controllerRef={controllerRef}
        chassisRef={chassisRef}
        restLength={tuning.suspensionRestLength}
      />
    </RigidBody>
  )
}
