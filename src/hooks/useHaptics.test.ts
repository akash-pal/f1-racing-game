import { describe, expect, it } from 'vitest'
import { computeRumble } from './useHaptics'

const base = {
  speedMs: 0,
  slip: 0,
  onKerb: false,
  offTrack: false,
  paused: false,
  impact: false,
  now: 0,
}

describe('computeRumble', () => {
  it('is silent when parked or paused', () => {
    expect(computeRumble(base)).toEqual({ strong: 0, weak: 0 })
    expect(computeRumble({ ...base, speedMs: 30, paused: true })).toEqual({ strong: 0, weak: 0 })
  })

  it('adds a faint speed-scaled hum on the road, no thump', () => {
    const slow = computeRumble({ ...base, speedMs: 10 })
    const fast = computeRumble({ ...base, speedMs: 60 })
    expect(slow.strong).toBe(0)
    expect(fast.strong).toBe(0)
    expect(fast.weak).toBeGreaterThan(slow.weak)
    expect(fast.weak).toBeLessThan(0.12) // stays subtle
  })

  it('buzzes hard on a kerb, much stronger than the road', () => {
    const road = computeRumble({ ...base, speedMs: 30 })
    // sample the kerb pulse at its peak
    const kerb = computeRumble({ ...base, speedMs: 30, onKerb: true, now: Math.PI / 2 / 0.055 })
    expect(kerb.strong).toBeGreaterThan(0.4)
    expect(kerb.strong).toBeGreaterThan(road.strong + 0.3)
  })

  it('rumbles on grass, between road and kerb', () => {
    const grass = computeRumble({ ...base, speedMs: 30, offTrack: true })
    expect(grass.strong).toBeGreaterThan(0.15)
    expect(grass.strong).toBeLessThan(0.5)
  })

  it('kicks with slip and clamps to 1', () => {
    const grip = computeRumble({ ...base, speedMs: 30, slip: 0.1 })
    const slide = computeRumble({ ...base, speedMs: 30, slip: 0.9 })
    expect(slide.strong).toBeGreaterThan(grip.strong)
    const maxed = computeRumble({ ...base, speedMs: 30, onKerb: true, slip: 1, now: 40 })
    expect(maxed.strong).toBeLessThanOrEqual(1)
    expect(maxed.weak).toBeLessThanOrEqual(1)
  })

  it('impact overrides everything with a hard thump', () => {
    expect(computeRumble({ ...base, impact: true })).toEqual({ strong: 1, weak: 0.85 })
    expect(computeRumble({ ...base, paused: true, impact: true })).toEqual({ strong: 1, weak: 0.85 })
  })
})
