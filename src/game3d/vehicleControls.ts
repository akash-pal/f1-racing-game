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

  // off-track: much less drive and grip (grass), so cutting corners costs you
  engineForce *= 0.25 + 0.55 * grip

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

  // progressive lateral grip (softer than the rapier default) so turn-in isn't
  // snappy — a big contributor to the wobble
  for (let i = 0; i < n; i++) controller.setWheelSideFrictionStiffness(i, 0.8 * grip)

  // steering: rate-limited, gently reduced at speed (not numbed), front only
  const speedFactor = 1 / (1 + Math.abs(forwardSpeed) * 0.02)
  const target = STEER_SIGN * clamp(input.steer, -1, 1) * t.maxSteer * speedFactor
  state.steer = moveTowards(state.steer, target, t.steerRate * dt)
  for (const i of FRONT_WHEELS) controller.setWheelSteering(i, state.steer)

  // --- yaw-rate stability control ---
  // Nudge the car's actual yaw rate toward the rate the steering angle implies
  // (bicycle model). This kills the corner-entry oscillation and the "turns the
  // wrong way for a moment" transient without adding steady-state understeer.
  // Skipped under handbrake so deliberate slides still rotate freely; a small
  // always-on yaw damping term remains to settle the tail.
  const yawRate = chassis.angvel().y
  const stepScale = dt / (1 / 60)
  if (input.handbrake) {
    chassis.applyTorqueImpulse({ x: 0, y: -yawRate * 6 * stepScale, z: 0 }, true)
  } else {
    const WHEELBASE = 3.2
    let targetYaw = 0
    if (Math.abs(state.steer) > 1e-3 && Math.abs(forwardSpeed) > 1) {
      targetYaw = (forwardSpeed * Math.tan(state.steer)) / WHEELBASE
      const cap = (grip * 11) / Math.max(6, Math.abs(forwardSpeed)) // ~lateral-accel limit
      targetYaw = clamp(targetYaw, -cap, cap)
    }
    const yawErr = targetYaw - yawRate
    const yawImpulse = clamp(yawErr * 48 * stepScale, -220, 220)
    chassis.applyTorqueImpulse({ x: 0, y: yawImpulse, z: 0 }, true)
  }

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
