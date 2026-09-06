import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, type RefObject } from 'react'
import { Vector3, Quaternion, type Group } from 'three'
import { KMH_PER_MS, WHEEL_POSITIONS } from '../lib/constants'
import { spawn3D } from '../track/silverstone'
import { F1Car } from '../car/F1Car'
import { useLapTimer } from '../hooks/useLapTimer'
import { useGameStore } from '../state/useGameStore'
import { useHudStore } from '../state/useHudStore'
import type { VehicleTuning } from '../lib/types'
import { useRaycastVehicle } from './useRaycastVehicle'

interface Props {
  tuning: VehicleTuning
  /** chassis ref is lifted so the chase camera can follow it */
  chassisRef: RefObject<RapierRigidBody | null>
}

const Y_AXIS = new Vector3(0, 1, 0)
const spawnQuat = new Quaternion()
const SPAWN = spawn3D()

function Tyre({ radius }: { radius: number }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, 0.42, 22]} />
        <meshStandardMaterial color="#141414" roughness={0.85} />
      </mesh>
      {/* rim */}
      <mesh>
        <cylinderGeometry args={[radius * 0.55, radius * 0.55, 0.44, 18]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* spoke marker so wheel spin is visible */}
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
  const lap = useLapTimer()
  const resetNonce = useGameStore((s) => s.resetNonce)

  useEffect(() => {
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
  }, [resetNonce, lap, chassisRef])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const controller = controllerRef.current
    const b = chassisRef.current
    if (!controller || !b) return

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

    const lv = b.linvel()
    const p = b.translation()
    lap.update(p.x, p.z, performance.now())

    hudAccum.current += dt
    if (hudAccum.current >= 0.1) {
      hudAccum.current = 0
      useHudStore.getState().set({
        speedKph: Math.hypot(lv.x, lv.y, lv.z) * KMH_PER_MS,
        offTrack: false,
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
      angularDamping={0.7}
    >
      {/* chassis collider; mass placed low for rollover resistance */}
      <CuboidCollider
        args={[0.55, 0.28, 2.3]}
        position={[0, -0.05, 0.1]}
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
