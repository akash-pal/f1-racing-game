import { STEER_SIGN } from '../lib/constants'
import { clamp } from '../lib/math'
import type { ArcadeCarState, InputAxes } from '../lib/types'

// Phase 2 top-down arcade car. Pure: no React, no Three objects.
// "On-rails" model — the car has a heading and a signed forward speed, no lateral
// velocity. That is all Phase 2 needs (drive a loop, stay in bounds, feel like a
// car under accel/brake/coast). Slip comes with the Rapier vehicle in Phase 3.
//
// Units: metres, seconds. Heading 0 = facing -Z (see constants.ts).

const ENGINE_ACCEL = 28 // m/s^2 at full throttle (forward)
const REVERSE_ACCEL = 14 // m/s^2 driving into / while in reverse
const BRAKE_DECEL = 46 // m/s^2 at full brake (forward motion only)
const DRAG = 0.7 // speed-proportional drag, per second
const ROLL_RESIST = 3 // constant decel opposing motion, m/s^2
const MAX_SPEED_FWD = 42
const MAX_SPEED_REV = 12
const MAX_STEER_RATE = 2.6 // rad/s at the speed where steering peaks
const STEER_FALLOFF = 0.055 // higher -> steering weakens faster with speed

export function stepCar(
  s: ArcadeCarState,
  input: InputAxes,
  grip: number,
  dt: number,
): ArcadeCarState {
  let { x, z, h, v } = s

  // --- longitudinal ---
  // throttle always pushes the nose forward (weaker while still reversing)
  let a = input.throttle * (v >= -0.1 ? ENGINE_ACCEL : REVERSE_ACCEL)
  // brake decelerates real forward motion; at rest / in reverse it drives reverse
  if (v > 0.3) {
    a -= input.brake * BRAKE_DECEL
  } else {
    a -= input.brake * REVERSE_ACCEL
  }
  v += a * dt

  // resistance: drag ~ v, rolling ~ const (clamped so it never crosses zero)
  v -= v * DRAG * dt
  const roll = ROLL_RESIST * dt
  v -= Math.abs(v) > roll ? Math.sign(v) * roll : v

  // off-track: scrub speed hard
  if (grip < 1) v *= Math.pow(0.25, dt)

  v = clamp(v, -MAX_SPEED_REV, MAX_SPEED_FWD)

  // --- steering ---
  // Angular rate falls with speed, fades to 0 near standstill (no pivot in
  // place), and inverts in reverse so the car steers like a real car backwards.
  const speedFactor = 1 / (1 + Math.abs(v) * STEER_FALLOFF)
  const lowSpeedGate = clamp(Math.abs(v) / 3, 0, 1)
  const turnRate =
    STEER_SIGN * input.steer * MAX_STEER_RATE * speedFactor * lowSpeedGate * Math.sign(v || 1)
  h += turnRate * dt

  // --- integrate position along heading (0 rad = -Z) ---
  x += -Math.sin(h) * v * dt
  z += -Math.cos(h) * v * dt

  return { x, z, h, v }
}
