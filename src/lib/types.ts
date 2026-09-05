// Shared types for the racing game.
// Coordinate convention (see constants.ts): car forward = local -Z, up = +Y.

export type Mode = 'menu' | 'sandbox' | '2d' | '3d'

/** Analog control axes, produced by keyboard now and the G29 wheel later. */
export interface InputAxes {
  throttle: number // 0..1
  brake: number // 0..1
  steer: number // -1..1  (left negative, right positive)
  handbrake: boolean
}

/** Phase 2 arcade car state, integrated in the XZ plane. */
export interface ArcadeCarState {
  x: number
  z: number
  h: number // heading in radians, 0 = facing -Z
  v: number // signed forward speed (m/s); negative = reversing
}

/** Result of sampling the track surface at a world position. */
export interface TrackSample {
  onTrack: boolean
  grip: number // 1 on tarmac, < 1 off-track
}

/** Live-tunable parameters for the Phase 3 Rapier vehicle. */
export interface VehicleTuning {
  chassisMass: number
  engineForce: number
  brakeForce: number
  handbrakeForce: number
  maxSteer: number // radians at full lock, low speed
  steerRate: number // radians/sec the virtual steering wheel moves
  suspensionRestLength: number
  suspensionStiffness: number
  suspensionCompression: number
  suspensionRelaxation: number
  suspensionTravel: number
  frictionSlip: number
  wheelRadius: number
}
