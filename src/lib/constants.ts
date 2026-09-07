// Project-wide constants and conventions.
//
// COORDINATE CONVENTION (obeyed by every module):
//   - World is right-handed Y-up (Three.js default).
//   - Car forward = local -Z. Car right = local +X.
//   - Heading `h` (radians): 0 = facing -Z; positive rotates toward +X (right).
//     Position integrates as:  x += -sin(h) * v * dt;  z += -cos(h) * v * dt

import type { VehicleTuning } from './types'

/** Physics fixed timestep for Rapier. */
export const PHYSICS_TIMESTEP = 1 / 60

export const KMH_PER_MS = 3.6

/** Keyboard code -> logical action. Uses KeyboardEvent.code (layout-independent). */
export const KEY_MAP: Record<string, 'fwd' | 'back' | 'left' | 'right' | 'handbrake'> = {
  ArrowUp: 'fwd',
  KeyW: 'fwd',
  ArrowDown: 'back',
  KeyS: 'back',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'handbrake',
}

// Input contract: `steer` axis is +1 when the driver wants to go RIGHT, -1 for
// LEFT (keyboard D / mouse right). The physics consumers (arcade model, Rapier
// vehicle) multiply by STEER_SIGN to match their own turn-direction convention.
// Flip this one constant if steering ever feels mirrored.
export const STEER_SIGN = -1

/** Default vehicle tuning (Phase 3). Overridable live via leva. */
export const DEFAULT_TUNING: VehicleTuning = {
  chassisMass: 800,
  engineForce: 5400,
  brakeForce: 2900,
  handbrakeForce: 5200,
  maxSteer: 0.4,
  steerRate: 2.6, // slower rack -> smoother, less darty
  suspensionRestLength: 0.3,
  suspensionStiffness: 34,
  suspensionCompression: 1.6, // heavy damping -> no bounce/wobble
  suspensionRelaxation: 1.8,
  suspensionTravel: 0.1,
  frictionSlip: 1.7, // planted but not snappy
  wheelRadius: 0.34,
}

// F1 proportions (game units ~ metres): wheelbase ~3.2, track ~1.55.
/** Wheel positions in chassis-local space. Order: FL, FR, RL, RR. */
export const WHEEL_POSITIONS: readonly [number, number, number][] = [
  [-0.78, -0.2, -1.58], // front-left
  [0.78, -0.2, -1.58], // front-right
  [-0.82, -0.2, 1.62], // rear-left  (rear track slightly wider)
  [0.82, -0.2, 1.62], // rear-right
]

export const FRONT_WHEELS = [0, 1] as const
export const REAR_WHEELS = [2, 3] as const
