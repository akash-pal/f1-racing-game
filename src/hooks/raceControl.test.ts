import { describe, expect, it } from 'vitest'
import { countdownInfo, GO_MS, LIGHT_INTERVAL_MS } from './useRaceControl'

describe('countdownInfo', () => {
  it('no lights before the sequence', () => {
    expect(countdownInfo(0, 0).litCount).toBe(1) // first light on at t=0..interval
  })

  it('lights come on one at a time', () => {
    expect(countdownInfo(LIGHT_INTERVAL_MS * 0.5, 0).litCount).toBe(1)
    expect(countdownInfo(LIGHT_INTERVAL_MS * 2.5, 0).litCount).toBe(3)
    expect(countdownInfo(LIGHT_INTERVAL_MS * 4.5, 0).litCount).toBe(5)
  })

  it('all five stay on through the hold, then GO', () => {
    expect(countdownInfo(GO_MS - 50, 0)).toMatchObject({ litCount: 5, go: false })
    expect(countdownInfo(GO_MS + 10, 0).go).toBe(true)
  })

  it('sinceGoMs measures time past GO', () => {
    expect(countdownInfo(GO_MS + 500, 0).sinceGoMs).toBeCloseTo(500, 0)
  })
})
