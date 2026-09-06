import { describe, expect, it } from 'vitest'
import { getSilverstone, makeFinishLine, spawn2D, spawn3D } from './silverstone'

describe('Silverstone track model', () => {
  const t = getSilverstone()

  it('is a closed loop of a sensible length', () => {
    expect(t.length).toBeGreaterThan(1200)
    expect(t.length).toBeLessThan(4000)
    const first = t.samples[0]
    const last = t.samples[t.samples.length - 1]
    expect(first.distanceTo(last)).toBeLessThan(t.length / t.samples.length + 1)
  })

  it('edges stay a consistent width from the centre-line', () => {
    for (const i of [10, 200, 500, 800]) {
      expect(t.leftEdge[i].distanceTo(t.samples[i])).toBeCloseTo(t.halfWidth, 3)
      expect(t.rightEdge[i].distanceTo(t.samples[i])).toBeCloseTo(t.halfWidth, 3)
    }
  })

  it('does not visibly self-intersect (no two far-apart samples nearly coincide)', () => {
    const s = t.samples
    const n = s.length
    let minGap = Infinity
    // compare samples that are far apart along the lap but close in space
    for (let i = 0; i < n; i += 3) {
      for (let j = i + 40; j < n - 5; j += 3) {
        const along = Math.min(j - i, n - (j - i))
        if (along < 40) continue
        const d = s[i].distanceTo(s[j])
        if (d < minGap) minGap = d
      }
    }
    // legs of the track must stay at least ~1.2 track-widths apart
    expect(minGap).toBeGreaterThan(t.halfWidth * 2.2)
  })

  it('spawn poses sit on the start/finish line', () => {
    const p2 = spawn2D()
    expect(Math.hypot(p2.x - t.start.position.x, p2.z - t.start.position.z)).toBeLessThan(1)
    const p3 = spawn3D()
    expect(p3.position[1]).toBeGreaterThan(0)
    expect(p3.heading).toBeCloseTo(t.start.heading, 5)
  })

  it('finish line: signed distance flips as you drive through in racing direction', () => {
    const line = makeFinishLine()
    const p = t.start.position
    const f = t.start.forward
    const before = line.signedDist(p.x - f.x * 5, p.z - f.z * 5)
    const after = line.signedDist(p.x + f.x * 5, p.z + f.z * 5)
    expect(before).toBeLessThan(0)
    expect(after).toBeGreaterThan(0)
    expect(line.withinWidth(p.x, p.z)).toBe(true)
    // step sideways (perpendicular to racing direction) well beyond the track
    const left = { x: -f.z, z: f.x }
    expect(line.withinWidth(p.x + left.x * 60, p.z + left.z * 60)).toBe(false)
  })
})
