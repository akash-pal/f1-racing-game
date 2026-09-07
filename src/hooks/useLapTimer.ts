import { useRef } from 'react'
import { makeFinishLine } from '../track/circuit'
import { useHudStore } from '../state/useHudStore'

// Shared lap timing for the circuit (2D and 3D).
//
// The start/finish line is perpendicular to the racing direction at the spawn
// point. A lap counts when the car crosses that line moving forwards (signed
// distance goes negative -> positive) while within the track width, and only if
// "armed" — the car must have travelled well past the line since the previous
// count. This rejects line jitter and reversing back over it.

export interface LapCrossing {
  crossed: boolean
  lapMs?: number
  isRecord?: boolean
}

export interface LapTracker {
  /** Advance the tracker. Returns whether the finish line was crossed this call. */
  update: (x: number, z: number, nowMs: number) => LapCrossing
  /** Milliseconds elapsed in the current lap. */
  elapsed: (nowMs: number) => number
  /** Restart timing from `nowMs` (call at GO, and on car reset). */
  reset: (nowMs: number) => void
}

const ARM_DISTANCE = 80

export function useLapTimer(): LapTracker {
  const ref = useRef<LapTracker | null>(null)
  if (ref.current === null) {
    const line = makeFinishLine()
    let prevD = 0
    let armed = false
    let lapStartMs = performance.now()
    let started = false // ignore the first crossing (leaving the grid)

    ref.current = {
      update: (x, z, nowMs): LapCrossing => {
        const d = line.signedDist(x, z)
        if (d < -ARM_DISTANCE || d > ARM_DISTANCE) armed = true
        const crossedForward = prevD < 0 && d >= 0 && Math.abs(d) < 20
        prevD = d
        if (!(crossedForward && armed && line.withinWidth(x, z))) return { crossed: false }

        armed = false
        if (!started) {
          started = true
          lapStartMs = nowMs
          return { crossed: true }
        }
        const lapMs = nowMs - lapStartMs
        lapStartMs = nowMs
        const hud = useHudStore.getState()
        const isRecord = hud.bestLapMs === null || lapMs < hud.bestLapMs
        useHudStore.setState({
          lap: hud.lap + 1,
          lastLapMs: lapMs,
          bestLapMs: isRecord ? lapMs : hud.bestLapMs,
          newRecord: isRecord,
        })
        return { crossed: true, lapMs, isRecord }
      },
      elapsed: (nowMs) => nowMs - lapStartMs,
      reset: (nowMs) => {
        prevD = 0
        armed = false
        started = false
        lapStartMs = nowMs
        useHudStore.getState().reset()
      },
    }
  }
  return ref.current
}
