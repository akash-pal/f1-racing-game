import { beforeAll, describe, expect, it } from 'vitest'
import RAPIER from '@dimforge/rapier3d-compat'
import { DEFAULT_TUNING } from '../lib/constants'
import type { InputAxes } from '../lib/types'
import {
  applyVehicleControls,
  setupVehicleController,
  type VehicleStepState,
} from './vehicleControls'

// Headless integration test for the Phase 3 raycast vehicle: a real Rapier world
// + DynamicRayCastVehicleController driven by the SAME applyVehicleControls used
// in the game. Verifies acceleration, coasting, braking and handbrake yaw
// without a browser / R3F render loop.

const NEUTRAL: InputAxes = { throttle: 0, brake: 0, steer: 0, handbrake: false }

beforeAll(async () => {
  await RAPIER.init()
})

function makeRig() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = 1 / 60

  const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(200, 1, 200).setTranslation(0, -1, 0).setFriction(1),
    ground,
  )

  const chassis = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 1.0, 0)
      .setCanSleep(false)
      .setLinearDamping(0.15)
      .setAngularDamping(0.9)
      .enabledRotations(false, true, false),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.55, 0.3, 2.35)
      .setTranslation(0, -0.02, 0.1)
      .setMass(DEFAULT_TUNING.chassisMass)
      .setFriction(0.7),
    chassis,
  )

  const controller = world.createVehicleController(chassis)
  setupVehicleController(controller, DEFAULT_TUNING)

  const state: VehicleStepState = { steer: 0 }
  const step = (input: Partial<InputAxes>, steps: number) => {
    for (let i = 0; i < steps; i++) {
      applyVehicleControls(
        controller,
        chassis as never,
        { ...NEUTRAL, ...input },
        DEFAULT_TUNING,
        false,
        state,
        1 / 60,
      )
      world.step()
    }
  }
  const speed = () => {
    const v = chassis.linvel()
    return Math.hypot(v.x, v.y, v.z)
  }
  const yaw = () => {
    const r = chassis.rotation()
    return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x))
  }
  return { world, chassis, controller, step, speed, yaw }
}

describe('raycast vehicle (headless Rapier)', () => {
  it('settles on its wheels with all four in contact', () => {
    const rig = makeRig()
    rig.step({}, 90)
    const contacts = [0, 1, 2, 3].map((i) => rig.controller.wheelIsInContact(i))
    expect(contacts.every(Boolean)).toBe(true)
    const y = rig.chassis.translation().y
    expect(y).toBeGreaterThan(0.1)
    expect(y).toBeLessThan(1.0)
  })

  it('accelerates forward (toward -Z, the chassis nose) under throttle', () => {
    const rig = makeRig()
    rig.step({}, 60) // settle
    rig.step({ throttle: 1 }, 180) // 3s full throttle
    const p = rig.chassis.translation()
    expect(p.z).toBeLessThan(-8) // moved forward = -Z
    expect(rig.speed()).toBeGreaterThan(6)
  })

  it('has momentum: coasts a long way after throttle is released', () => {
    const rig = makeRig()
    rig.step({}, 60)
    rig.step({ throttle: 1 }, 180)
    const vTop = rig.speed()
    rig.step({}, 30) // 0.5s later
    const vHalfSec = rig.speed()
    expect(vHalfSec).toBeGreaterThan(vTop * 0.5) // still rolling, not braked
  })

  it('braking scrubs speed much faster than coasting', () => {
    const coast = makeRig()
    coast.step({}, 60)
    coast.step({ throttle: 1 }, 180)
    const v0 = coast.speed()
    coast.step({}, 60) // coast 1s

    const brake = makeRig()
    brake.step({}, 60)
    brake.step({ throttle: 1 }, 180)
    brake.step({ brake: 1 }, 60) // brake 1s

    expect(brake.speed()).toBeLessThan(coast.speed())
    expect(brake.speed()).toBeLessThan(v0 * 0.5)
  })

  it('handbrake while cornering induces more yaw than steering alone', () => {
    const plain = makeRig()
    plain.step({}, 60)
    plain.step({ throttle: 1 }, 120)
    const y0p = plain.yaw()
    plain.step({ throttle: 0.3, steer: 1 }, 90)
    const plainYaw = Math.abs(plain.yaw() - y0p)

    const hand = makeRig()
    hand.step({}, 60)
    hand.step({ throttle: 1 }, 120)
    const y0h = hand.yaw()
    hand.step({ throttle: 0.3, steer: 1, handbrake: true }, 90)
    const handYaw = Math.abs(hand.yaw() - y0h)

    expect(handYaw).toBeGreaterThan(plainYaw)
  })
})
