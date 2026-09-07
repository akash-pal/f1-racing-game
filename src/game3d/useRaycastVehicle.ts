import { useEffect, useRef, type RefObject } from 'react'
import { useRapier, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import { useGameStore } from '../state/useGameStore'
import { useInputStore } from '../state/useInputStore'
import { raceGo } from '../hooks/useRaceControl'
import { getCircuit } from '../track/circuit'
import type { VehicleTuning } from '../lib/types'

const track = getCircuit()
import {
  applyVehicleControls,
  setupVehicleController,
  type VehicleStepState,
} from './vehicleControls'

// Wraps Rapier's DynamicRayCastVehicleController.
//
// The controller is created lazily inside the first physics step where the
// chassis RigidBody ref is populated (a parent effect can run before the body
// attaches). Teardown is a bare unmount effect.

export function useRaycastVehicle(
  chassisRef: RefObject<RapierRigidBody | null>,
  tuning: VehicleTuning,
): RefObject<DynamicRayCastVehicleController | null> {
  const { world } = useRapier()
  const controllerRef = useRef<DynamicRayCastVehicleController | null>(null)
  const madeForWorld = useRef<object | null>(null)
  const stepState = useRef<VehicleStepState>({ steer: 0 })
  const gripRef = useRef(1)
  const dampRef = useRef(0.15)
  const kerbTick = useRef(0)
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning

  const ensureController = () => {
    const chassis = chassisRef.current
    if (!chassis) return null
    if (controllerRef.current && madeForWorld.current === world) return controllerRef.current

    const controller = world.createVehicleController(chassis)
    setupVehicleController(controller, tuningRef.current)
    controllerRef.current = controller
    madeForWorld.current = world
    return controller
  }

  const destroy = () => {
    const c = controllerRef.current
    if (c) {
      try {
        world.removeVehicleController(c)
      } catch {
        /* world already gone (HMR) */
      }
    }
    controllerRef.current = null
    madeForWorld.current = null
    stepState.current.steer = 0
  }

  useEffect(() => destroy, [])

  useBeforePhysicsStep(() => {
    const controller = ensureController()
    const chassis = chassisRef.current
    if (!controller || !chassis) return
    const game = useGameStore.getState()
    const input = useInputStore.getState()
    // throttle is locked until the countdown finishes
    const gated = raceGo()
      ? input
      : { throttle: 0, brake: input.brake, steer: input.steer, handbrake: true }
    // surface grip: full on tarmac, reduced on the grass either side.
    // Use a generous full-grip band so a car tracking mid-lane never sees the
    // value flicker (a source of the wobble), and lerp toward the target so
    // crossing the edge is a smooth handover, not a per-frame step change.
    const p = chassis.translation()
    const surf = track.sample(p.x, p.z)
    const onTrack = surf.onTrack || surf.distToCenter < track.halfWidth * 0.9
    const targetGrip = onTrack
      ? 1
      : surf.distToCenter < track.halfWidth + 3
        ? 0.85 // kerb / edge — still mostly planted
        : 0.6 // grass — slower and a bit loose, but not a crawl
    gripRef.current += (targetGrip - gripRef.current) * 0.1
    // extra rolling resistance on the grass — enough to feel draggy, eased so
    // it doesn't thrash frame to frame near the edge
    const targetDamp = onTrack ? 0.15 : 0.5
    dampRef.current += (targetDamp - dampRef.current) * 0.1
    chassis.setLinearDamping(dampRef.current)
    applyVehicleControls(
      controller,
      chassis,
      gated,
      tuningRef.current,
      game.paused,
      stepState.current,
      world.timestep,
      { tcs: game.assists.tcs, grip: gripRef.current },
    )

    // --- kerb rumble: a buzz through the car while a wheel is on a corner kerb.
    // Deliberately light — a vibration, not a hit — so using the kerbs on the
    // racing line doesn't feel like the car is breaking loose.
    if (surf.onKerb && !game.paused && raceGo()) {
      const lv = chassis.linvel()
      const spd = Math.hypot(lv.x, lv.z)
      if (spd > 3) {
        kerbTick.current++
        const buzz = (kerbTick.current % 2 === 0 ? 1 : -1) * (0.7 + 0.3 * Math.random())
        const t = Math.min(1, spd / 22)
        // vertical shudder only — no lateral skip (that read as "unstable")
        chassis.applyImpulse({ x: 0, y: buzz * (55 + 120 * t), z: 0 }, true)
        chassis.applyTorqueImpulse({ x: 0, y: buzz * (12 + 22 * t), z: 0 }, true)
        // kerbs are a touch slippery, not ice
        gripRef.current = Math.min(gripRef.current, 0.9)
      }
    }
  })

  // --- headless test harness (dev only) ---
  if (import.meta.env.DEV) {
    const w = window as unknown as Record<string, unknown>
    w.__vehHarness = {
      get controller() {
        return controllerRef.current
      },
      get chassis() {
        return chassisRef.current
      },
      world,
      /** run N control+physics steps with a fixed input; returns final chassis pos + speed */
      drive(input: Partial<VehicleTuning> & Record<string, number | boolean>, steps = 60) {
        const controller = ensureController()
        const chassis = chassisRef.current
        if (!controller || !chassis) return { error: 'no controller/chassis' }
        const merged = {
          throttle: 0,
          brake: 0,
          steer: 0,
          handbrake: false,
          ...(input as Record<string, number | boolean>),
        }
        let last
        for (let i = 0; i < steps; i++) {
          last = applyVehicleControls(
            controller,
            chassis,
            merged as never,
            tuningRef.current,
            false,
            stepState.current,
            1 / 60,
          )
          world.step()
        }
        const p = chassis.translation()
        const lv = chassis.linvel()
        return {
          pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
          speed: +Math.hypot(lv.x, lv.y, lv.z).toFixed(2),
          contacts: [0, 1, 2, 3].map((i) => controller.wheelIsInContact(i)),
          last,
        }
      },
    }
  }

  return controllerRef
}
