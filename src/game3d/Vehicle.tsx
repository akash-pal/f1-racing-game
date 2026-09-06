import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, type RefObject } from 'react'
import { Vector3, Quaternion, type Group } from 'three'
import { KMH_PER_MS, WHEEL_POSITIONS } from '../lib/constants'
import { pseudoGear } from '../lib/pseudoGear'
import { spawn3D, getSilverstone } from '../track/silverstone'
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
const track = getSilverstone()

function Tyre({ radius }: { radius: number }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, 0.42, 22]} />
        <meshStandardMaterial color="#141414" roughness={0.85} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.55, radius * 0.55, 0.44, 18]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.02, radius * 1.5]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
    </group>
  )
}

export function Vehicle({ tuning, chassisRef }: Props) {
  const controllerRef = useRaycastVehicle(chassisRef, tuning)
  const steerRefs = useRef<(Group | null)[]>([])
  const rollRefs = useRef<(Group | null)[]>([])
  const hudAccum = useRef(0)
  const wasRacing = useRef(false)
  const recordClearAt = useRef(0)
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

    // wheel visuals
    for (let i = 0; i < WHEEL_POSITIONS.length; i++) {
      const steerGroup = steerRefs.current[i]
      const rollGroup = rollRefs.current[i]
      if (!steerGroup) continue
      const conn = controller.wheelChassisConnectionPointCs(i)
      const susp = controller.wheelSuspensionLength(i) ?? tuning.suspensionRestLength
      steerGroup.position.set(
        conn ? conn.x : WHEEL_POSITIONS[i][0],
        (conn ? conn.y : WHEEL_POSITIONS[i][1]) - susp,
        conn ? conn.z : WHEEL_POSITIONS[i][2],
      )
      steerGroup.rotation.y = controller.wheelSteering(i) ?? 0
      if (rollGroup) rollGroup.rotation.x = controller.wheelRotation(i) ?? 0
    }

    // telemetry
    const lv = b.linvel()
    const p = b.translation()
    const r = b.rotation()
    const speedMs = Math.hypot(lv.x, lv.z)
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
        offTrack: !track.sample(p.x, p.z).onTrack,
        currentLapMs: lapMs,
      })
    }
  })

  const rearRadius = tuning.wheelRadius * 1.05

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

      <F1Car />

      {WHEEL_POSITIONS.map((pos, i) => (
        <group
          key={i}
          ref={(g) => {
            steerRefs.current[i] = g
          }}
          position={pos}
        >
          <group
            ref={(g) => {
              rollRefs.current[i] = g
            }}
          >
            <Tyre radius={i < 2 ? tuning.wheelRadius : rearRadius} />
          </group>
        </group>
      ))}
    </RigidBody>
  )
}
