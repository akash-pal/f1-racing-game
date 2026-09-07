import { describe, expect, it } from 'vitest'
import { sampleTrack } from './trackBounds'
import { getCircuit } from '../track/circuit'

describe('sampleTrack (Buddh circuit)', () => {
  const track = getCircuit()

  it('the centre-line is on track with full grip', () => {
    for (const i of [0, 100, 250, 450, 700]) {
      const p = track.samples[i]
      const s = sampleTrack(p.x, p.z)
      expect(s.onTrack).toBe(true)
      expect(s.grip).toBe(1)
    }
  })

  it('a point far from the ribbon is off track with low grip', () => {
    const s = sampleTrack(0, 0) // infield centre — nowhere near the ribbon
    expect(s.onTrack).toBe(false)
    expect(s.grip).toBeLessThan(0.5)
  })

  it('just outside the edge is off track but only mildly slower (kerb zone)', () => {
    const p = track.samples[300]
    const tan = track.tangents[300]
    // step perpendicular to the track by just over half-width
    const offX = p.x + -tan.z * (track.halfWidth + 2)
    const offZ = p.z + tan.x * (track.halfWidth + 2)
    const s = sampleTrack(offX, offZ)
    expect(s.onTrack).toBe(false)
    expect(s.grip).toBeGreaterThan(0.5) // still in the runoff band
  })

  it('the start/finish sits on the centre-line', () => {
    const s = sampleTrack(track.start.position.x, track.start.position.z)
    expect(s.onTrack).toBe(true)
  })
})
