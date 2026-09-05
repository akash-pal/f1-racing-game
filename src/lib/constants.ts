// Project-wide constants and conventions.
//
// COORDINATE CONVENTION (obeyed by every module):
//   - World is right-handed Y-up (Three.js default).
//   - Car forward = local -Z. Car right = local +X.
//   - Heading `h` (radians): 0 = facing -Z; positive rotates toward +X (right).
//     Position integrates as:  x += -sin(h) * v * dt;  z += -cos(h) * v * dt

import type { VehicleTuning } from './types'

/** Physics fixed timestep for Rapier (Phase 3). */
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

/** Phase 2 ring track dimensions (metres), centred on the origin. */
export const TRACK = {
  innerRadius: 26,
  outerRadius: 44,
  /** Half-width (metres) of the start/finish stripe, placed on the +Z side where the car spawns. */
  stripeHalfWidth: 1.6,
} as const

export const TRACK_CENTER_RADIUS = (TRACK.innerRadius + TRACK.outerRadius) / 2
export const TRACK_HALF_WIDTH = (TRACK.outerRadius - TRACK.innerRadius) / 2

/** Default Phase 3 vehicle tuning. Overridable live via leva. */
export const DEFAULT_TUNING: VehicleTuning = {
  chassisMass: 850,
  engineForce: 5200,
  brakeForce: 2600,
  handbrakeForce: 6000,
  maxSteer: 0.55,
  steerRate: 3.0,
  suspensionRestLength: 0.32,
  suspensionStiffness: 24,
  suspensionCompression: 0.82,
  suspensionRelaxation: 0.88,
  suspensionTravel: 0.16,
  frictionSlip: 1.6,
  wheelRadius: 0.36,
}

/** Wheel positions in chassis-local space (metres). Order: FL, FR, RL, RR. */
export const WHEEL_POSITIONS: readonly [number, number, number][] = [
  [-0.85, -0.25, -1.35], // front-left
  [0.85, -0.25, -1.35], // front-right
  [-0.85, -0.25, 1.35], // rear-left
  [0.85, -0.25, 1.35], // rear-right
]

export const FRONT_WHEELS = [0, 1] as const
export const REAR_WHEELS = [2, 3] as const

/** Spawn pose for the 3D car: on the start line facing -Z. */
export const SPAWN_3D = { position: [0, 1.2, 30] as [number, number, number], heading: 0 }

/** Spawn pose for the 2D car: bottom of the ring, facing -Z (counter-clockwise lap). */
export const SPAWN_2D: { x: number; z: number; h: number } = {
  x: 0,
  z: TRACK_CENTER_RADIUS,
  h: 0,
}
