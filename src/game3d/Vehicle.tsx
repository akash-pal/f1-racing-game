import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, type RefObject } from 'react'
import { Vector3, Quaternion, type Group } from 'three'
import { KMH_PER_MS, SPAWN_3D, WHEEL_POSITIONS } from '../lib/constants'
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
      spawnQuat.setFromAxisAngle(Y_AXIS, SPAWN_3D.heading)
      b.setTranslation(
        { x: SPAWN_3D.position[0], y: SPAWN_3D.position[1], z: SPAWN_3D.position[2] },
        true,
      )
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

  return (
    <RigidBody
      ref={chassisRef}
      position={SPAWN_3D.position}
      colliders={false}
      canSleep={false}
      ccd
      linearDamping={0.15}
      angularDamping={0.6}
    >
      {/* single chassis collider; mass placed slightly low for rollover resistance */}
      <CuboidCollider
        args={[0.9, 0.4, 1.9]}
        position={[0, -0.12, 0]}
        mass={tuning.chassisMass}
        friction={0.8}
      />

      {/* visual chassis */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.8, 0.6, 3.9]} />
        <meshStandardMaterial color="#2f6fd0" metalness={0.25} roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 0.45, 0.35]}>
        <boxGeometry args={[1.1, 0.45, 1.5]} />
        <meshStandardMaterial color="#12233b" />
      </mesh>
      <mesh position={[0, 0, -2.05]}>
        <boxGeometry args={[1.2, 0.35, 0.4]} />
        <meshStandardMaterial color="#f4d03f" />
      </mesh>

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
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[tuning.wheelRadius, tuning.wheelRadius, 0.34, 20]} />
              <meshStandardMaterial color="#171717" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.36, tuning.wheelRadius * 1.7, 0.08]} />
              <meshStandardMaterial color="#8f8f8f" />
            </mesh>
          </group>
        </group>
      ))}
    </RigidBody>
  )
}
