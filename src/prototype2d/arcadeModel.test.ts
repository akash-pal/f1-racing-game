import { describe, expect, it } from 'vitest'
import { stepCar } from './arcadeModel'
import type { ArcadeCarState, InputAxes } from '../lib/types'

const NEUTRAL: InputAxes = { throttle: 0, brake: 0, steer: 0, handbrake: false }
const start = (): ArcadeCarState => ({ x: 0, z: 0, h: 0, v: 0 })

/** Run stepCar for `seconds` at 60 Hz with a fixed input. */
function run(s: ArcadeCarState, input: Partial<InputAxes>, seconds: number, grip = 1) {
  const dt = 1 / 60
  let state = s
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    state = stepCar(state, { ...NEUTRAL, ...input }, grip, dt)
  }
  return state
}

describe('arcade car', () => {
  it('accelerates forward under throttle (moves toward -Z)', () => {
    const after = run(start(), { throttle: 1 }, 2)
    expect(after.v).toBeGreaterThan(10)
    expect(after.z).toBeLessThan(-5) // forward is -Z
    expect(Math.abs(after.x)).toBeLessThan(0.01) // no drift with steer=0
  })

  it('coasts to a gradual stop, not instantly', () => {
    const moving = run(start(), { throttle: 1 }, 3)
    const half = run({ ...moving }, {}, 0.5)
    const later = run({ ...moving }, {}, 6)
    expect(half.v).toBeLessThan(moving.v) // decelerating
    expect(half.v).toBeGreaterThan(1) // but still rolling after 0.5s
    expect(later.v).toBeLessThan(0.5) // eventually stopped
  })

  it('brake from rest engages reverse with inverted steering', () => {
    const rev = run(start(), { brake: 1 }, 2)
    expect(rev.v).toBeLessThan(-2)
    expect(rev.z).toBeGreaterThan(1) // reversing = +Z

    // steering right while reversing should turn heading the opposite way vs forward
    const revTurn = run(start(), { brake: 1, steer: 1 }, 2)
    const fwdTurn = run(start(), { throttle: 1, steer: 1 }, 2)
    expect(Math.sign(revTurn.h)).toBe(-Math.sign(fwdTurn.h))
  })

  it('steering RIGHT (steer = +1) curves the car toward its right (+X, clockwise from above)', () => {
    // car starts facing -Z; a right turn should push it toward +X and turn the
    // heading negative (see STEER_SIGN in constants)
    const after = run(start(), { throttle: 1, steer: 1 }, 2.5)
    expect(after.x).toBeGreaterThan(2)
    expect(after.h).toBeLessThan(0)
    // and steering LEFT is the mirror image
    const left = run(start(), { throttle: 1, steer: -1 }, 2.5)
    expect(left.x).toBeLessThan(-2)
    expect(left.h).toBeGreaterThan(0)
  })

  it('does not rotate when stationary (no pivot in place)', () => {
    const after = run(start(), { steer: 1 }, 1)
    expect(Math.abs(after.h)).toBeLessThan(1e-6)
  })

  it('steering is weaker (per unit speed) at high speed than low speed', () => {
    const slow = run(start(), { throttle: 0.32, steer: 1 }, 1.5)
    const fast = run(start(), { throttle: 1, steer: 1 }, 3)
    expect(Math.abs(slow.v)).toBeGreaterThan(1)
    expect(Math.abs(fast.v)).toBeGreaterThan(Math.abs(slow.v) + 5)
    const slowYawRate = Math.abs(slow.h) / Math.abs(slow.v)
    const fastYawRate = Math.abs(fast.h) / Math.abs(fast.v)
    expect(slowYawRate).toBeGreaterThan(fastYawRate)
  })

  it('off-track grip scrubs speed hard', () => {
    const moving = run(start(), { throttle: 1 }, 3)
    const onTrack = run({ ...moving }, { throttle: 1 }, 1, 1)
    const offTrack = run({ ...moving }, { throttle: 1 }, 1, 0.35)
    expect(offTrack.v).toBeLessThan(onTrack.v * 0.6)
  })

  it('is framerate-independent (same distance at 30 vs 120 Hz)', () => {
    const sim = (hz: number) => {
      const dt = 1 / hz
      let st = start()
      for (let i = 0; i < Math.round(4 * hz); i++) {
        st = stepCar(st, { ...NEUTRAL, throttle: 1 }, 1, dt)
      }
      return st
    }
    const a = sim(30)
    const b = sim(120)
    expect(Math.abs(a.z - b.z) / Math.abs(b.z)).toBeLessThan(0.05) // within 5%
    expect(Math.abs(a.v - b.v) / Math.abs(b.v)).toBeLessThan(0.05)
  })
})
