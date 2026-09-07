import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import type { RapierRigidBody } from '@react-three/rapier'
import { FRONT_WHEELS, REAR_WHEELS, STEER_SIGN, WHEEL_POSITIONS } from '../lib/constants'
import { clamp, moveTowards } from '../lib/math'
import type { InputAxes, VehicleTuning } from '../lib/types'

const DOWN = { x: 0, y: -1, z: 0 }
// axle axis (car's right). With down=(0,-1,0) this makes the wheel's forward
// direction cross(axle,down) = -Z, matching the chassis nose (see constants.ts).
const AXLE = { x: 1, y: 0, z: 0 }

/** Attach 4 wheels + initial suspension/grip to a fresh vehicle controller. */
export function setupVehicleController(
  controller: DynamicRayCastVehicleController,
  t: VehicleTuning,
): void {
  for (const pos of WHEEL_POSITIONS) {
    controller.addWheel(
      { x: pos[0], y: pos[1], z: pos[2] },
      DOWN,
      AXLE,
      t.suspensionRestLength,
      t.wheelRadius,
    )
  }
  for (let i = 0; i < controller.numWheels(); i++) {
    controller.setWheelSuspensionStiffness(i, t.suspensionStiffness)
    controller.setWheelFrictionSlip(i, t.frictionSlip)
  }
}

// Pure-ish per-step control application for the raycast vehicle. Called from
// useBeforePhysicsStep in normal play, and from a headless stepper in tests.
// Mutates the controller; returns diagnostics.

export interface VehicleStepState {
  steer: number
}

export interface VehicleStepResult {
  forwardSpeed: number
  engineForce: number
  vehSpeed: number
  steer: number
  wantReverse: boolean
  tcsCut: number // 0..1 how much power TCS removed this step
}

export interface VehicleStepOpts {
  tcs?: boolean
  /** surface grip multiplier (1 = tarmac, < 1 = grass / off-track) */
  grip?: number
}

export function applyVehicleControls(
  controller: DynamicRayCastVehicleController,
  chassis: RapierRigidBody,
  input: InputAxes,
  tuning: VehicleTuning,
  paused: boolean,
  state: VehicleStepState,
  dt: number,
  opts: VehicleStepOpts = {},
): VehicleStepResult {
  const t = tuning
  const n = controller.numWheels()
  const grip = opts.grip ?? 1

  // keep suspension/grip in sync with live tuning every step
  for (let i = 0; i < n; i++) {
    controller.setWheelSuspensionStiffness(i, t.suspensionStiffness)
    controller.setWheelSuspensionCompression(i, t.suspensionCompression)
    controller.setWheelSuspensionRelaxation(i, t.suspensionRelaxation)
    controller.setWheelMaxSuspensionTravel(i, t.suspensionTravel)
  }

  if (paused) {
    for (let i = 0; i < n; i++) {
      controller.setWheelEngineForce(i, 0)
      controller.setWheelBrake(i, t.brakeForce)
    }
    controller.updateVehicle(dt)
    return {
      forwardSpeed: 0,
      engineForce: 0,
      vehSpeed: 0,
      steer: state.steer,
      wantReverse: false,
      tcsCut: 0,
    }
  }

  // forward speed (m/s) along chassis -Z
  const rot = chassis.rotation()
  const lv = chassis.linvel()
  const fx = 2 * (rot.x * rot.z + rot.w * rot.y)
  const fy = 2 * (rot.y * rot.z - rot.w * rot.x)
  const fz = 1 - 2 * (rot.x * rot.x + rot.y * rot.y)
  const forwardSpeed = -(lv.x * fx + lv.y * fy + lv.z * fz)

  const wantReverse = input.brake > 0.05 && forwardSpeed < 0.6
  let engineForce = wantReverse
    ? -input.brake * t.engineForce * 0.5
    : input.throttle * t.engineForce
  const footBrake = wantReverse ? 0 : input.brake * t.brakeForce

  // traction / stability control: bleed power when the car is yawing hard under
  // throttle (spinning up / sliding), and soften the launch.
  let tcsCut = 0
  if (opts.tcs && !wantReverse && input.throttle > 0.15 && !input.handbrake) {
    const yawRate = Math.abs(chassis.angvel().y)
    const yawCut = clamp((yawRate - 0.9) * 0.7, 0, 0.7)
    const launchCut = Math.abs(forwardSpeed) < 5 ? 0.35 * (1 - Math.abs(forwardSpeed) / 5) : 0
    tcsCut = Math.max(yawCut, launchCut)
    engineForce *= 1 - tcsCut
  }

  // off-track: less drive and grip (grass), so cutting corners costs you time —
  // but you can still power out of it, it's not a tar pit
  engineForce *= 0.5 + 0.5 * grip

  for (const i of REAR_WHEELS) controller.setWheelEngineForce(i, engineForce)
  for (const i of FRONT_WHEELS) controller.setWheelEngineForce(i, 0)
  for (let i = 0; i < n; i++) controller.setWheelBrake(i, footBrake)

  const slip = t.frictionSlip * grip
  if (input.handbrake) {
    for (const i of REAR_WHEELS) {
      controller.setWheelBrake(i, t.handbrakeForce)
      controller.setWheelFrictionSlip(i, slip * 0.4)
    }
    for (const i of FRONT_WHEELS) controller.setWheelFrictionSlip(i, slip)
  } else {
    for (let i = 0; i < n; i++) controller.setWheelFrictionSlip(i, slip)
  }

  // lateral grip: a touch more on the front axle so the car turns in cleanly
  // instead of washing wide, rear slightly softer to keep the balance calm.
  for (const i of FRONT_WHEELS) controller.setWheelSideFrictionStiffness(i, 1.15 * grip)
  for (const i of REAR_WHEELS) controller.setWheelSideFrictionStiffness(i, 0.95 * grip)

  // steering: front only. Full lock and a quick rack at low speed (hairpins need
  // it); above ~14 m/s both the max angle AND how fast the rack moves scale down
  // with speedFactor, so you can't slam the wheel into a snap on turn-in.
  const speedFactor = 1 / (1 + Math.max(0, Math.abs(forwardSpeed) - 14) * 0.032)
  const target = STEER_SIGN * clamp(input.steer, -1, 1) * t.maxSteer * speedFactor
  const rack = t.steerRate * dt * (0.35 + 0.65 * speedFactor)
  state.steer = moveTowards(state.steer, target, rack)
  for (const i of FRONT_WHEELS) controller.setWheelSteering(i, state.steer)

  // --- yaw damping ---
  // Bleed off yaw the steering isn't asking for. The reference yaw rate is the
  // bicycle-model value the wheel angle implies, but CAPPED to a speed-scaled
  // grip limit — without that cap the implied rate at speed is huge and the
  // damper spins the car up into a snap-then-understeer. Damps hard when the car
  // over-rotates, assists gently when it's below the reference. Weak under
  // handbrake so deliberate slides still rotate.
  const yawRate = chassis.angvel().y
  const stepScale = dt / (1 / 60)
  const WHEELBASE = 3.2
  const speedAbs = Math.abs(forwardSpeed)
  const impliedYaw = speedAbs > 1 ? (forwardSpeed * Math.tan(state.steer)) / WHEELBASE : 0
  const yawCap = (grip * 22) / Math.max(12, speedAbs)
  const refYaw = clamp(impliedYaw, -yawCap, yawCap)
  const err = yawRate - refYaw
  const overRotating = Math.abs(yawRate) > Math.abs(refYaw) && Math.sign(err) === Math.sign(yawRate)
  const k = input.handbrake ? 6 : overRotating ? 30 : 12
  chassis.applyTorqueImpulse({ x: 0, y: clamp(-err * k * stepScale, -150, 150), z: 0 }, true)

  controller.updateVehicle(dt)

  return {
    forwardSpeed,
    engineForce,
    vehSpeed: controller.currentVehicleSpeed(),
    steer: state.steer,
    wantReverse,
    tcsCut,
  }
}
