import { useRef } from 'react'
import { makeFinishLine } from '../track/silverstone'
import { useHudStore } from '../state/useHudStore'

// Shared lap timing for the Silverstone circuit (2D and 3D).
//
// The start/finish line is perpendicular to the racing direction at the spawn
// point. A lap counts when the car crosses that line moving forwards (signed
// distance goes negative -> positive) while within the track width, and only if
// "armed" — the car must have travelled well past the line (signed distance
// beyond a threshold) since the previous count. This rejects line jitter and
// reversing back over it.

interface LapTracker {
  update: (x: number, z: number, nowMs: number) => void
  reset: (nowMs: number) => void
}

const ARM_DISTANCE = 80 // how far past the line before another lap can count

export function useLapTimer(): LapTracker {
  const ref = useRef<LapTracker | null>(null)
  if (ref.current === null) {
    const line = makeFinishLine()
    let prevD = 0
    let armed = false
    let lapStartMs = performance.now()
    let started = false // ignore the first crossing (leaving the grid)

    ref.current = {
      update: (x, z, nowMs) => {
        const d = line.signedDist(x, z)
        if (d < -ARM_DISTANCE || d > ARM_DISTANCE) armed = true
        const crossedForward = prevD < 0 && d >= 0 && Math.abs(d) < 20
        if (crossedForward && armed && line.withinWidth(x, z)) {
          armed = false
          if (started) {
            const lapMs = nowMs - lapStartMs
            const hud = useHudStore.getState()
            useHudStore.setState({
              lap: hud.lap + 1,
              lastLapMs: lapMs,
              bestLapMs: hud.bestLapMs === null ? lapMs : Math.min(hud.bestLapMs, lapMs),
            })
          } else {
            started = true
          }
          lapStartMs = nowMs
        }
        prevD = d
      },
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
