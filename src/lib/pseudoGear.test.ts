import { describe, expect, it } from 'vitest'
import { pseudoGear } from './pseudoGear'

describe('pseudoGear', () => {
  it('neutral at a standstill', () => {
    expect(pseudoGear(0, false).label).toBe('N')
    expect(pseudoGear(1, false).gear).toBe(0)
  })

  it('reverse when reversing', () => {
    expect(pseudoGear(15, true).label).toBe('R')
    expect(pseudoGear(15, true).gear).toBe(-1)
  })

  it('climbs through the gears with speed', () => {
    expect(pseudoGear(30, false).gear).toBe(1)
    expect(pseudoGear(60, false).gear).toBe(2)
    expect(pseudoGear(100, false).gear).toBe(3)
    expect(pseudoGear(300, false).gear).toBe(6) // capped
  })

  it('rpm rises within a gear and resets after a shift', () => {
    const lowInThird = pseudoGear(85, false)
    const highInThird = pseudoGear(120, false)
    expect(lowInThird.gear).toBe(3)
    expect(highInThird.gear).toBe(3)
    expect(highInThird.rpm).toBeGreaterThan(lowInThird.rpm)
    const lowInFourth = pseudoGear(130, false)
    expect(lowInFourth.gear).toBe(4)
    expect(lowInFourth.rpm).toBeLessThan(highInThird.rpm)
  })
})
