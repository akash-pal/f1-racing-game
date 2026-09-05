import { describe, expect, it } from 'vitest'
import { sampleTrack } from './trackBounds'
import { TRACK, TRACK_CENTER_RADIUS } from '../lib/constants'

describe('sampleTrack (ring)', () => {
  it('centre of the ring band is on track with full grip', () => {
    const s = sampleTrack(0, TRACK_CENTER_RADIUS)
    expect(s.onTrack).toBe(true)
    expect(s.grip).toBe(1)
  })

  it('infield is off track with reduced grip', () => {
    const s = sampleTrack(0, TRACK.innerRadius - 5)
    expect(s.onTrack).toBe(false)
    expect(s.grip).toBeLessThan(1)
  })

  it('outside the outer edge is off track', () => {
    const s = sampleTrack(0, TRACK.outerRadius + 5)
    expect(s.onTrack).toBe(false)
  })

  it('is rotationally symmetric', () => {
    const a = sampleTrack(TRACK_CENTER_RADIUS, 0)
    const b = sampleTrack(-TRACK_CENTER_RADIUS, 0)
    const c = sampleTrack(0, -TRACK_CENTER_RADIUS)
    expect(a.onTrack).toBe(true)
    expect(b.onTrack).toBe(true)
    expect(c.onTrack).toBe(true)
  })
})
