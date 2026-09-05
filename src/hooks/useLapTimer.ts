import { useRef } from 'react'
import { useHudStore } from '../state/useHudStore'

// Shared lap timing for the ring track (2D and 3D). The start/finish line is the
// +Z half-axis (x = 0, z > 0), where both cars spawn.
//
// Crossing rule: count a lap when x goes negative -> positive while z > 0, but
// only if "armed" — the car must have visited the far half (z < 0) since the
// last count. This rejects jitter at the line and reversing back over it.

interface LapTracker {
  /** Call every frame with the car's world XZ and the current time in ms. */
  update: (x: number, z: number, nowMs: number) => void
  reset: (nowMs: number) => void
}

export function useLapTimer(): LapTracker {
  const ref = useRef<LapTracker | null>(null)
  if (ref.current === null) {
    let prevX = 0
    let armed = false
    let lapStartMs = performance.now()
    let started = false // ignore the very first crossing (leaving the grid)

    ref.current = {
      update: (x, z, nowMs) => {
        if (z < -5) armed = true
        const crossed = prevX < 0 && x >= 0 && z > 0
        if (crossed && armed) {
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
        prevX = x
      },
      reset: (nowMs) => {
        prevX = 0
        armed = false
        started = false
        lapStartMs = nowMs
        useHudStore.getState().reset()
      },
    }
  }
  return ref.current
}
