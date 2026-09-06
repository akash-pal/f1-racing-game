import { useEffect } from 'react'
import { useGameStore } from '../state/useGameStore'

// Drives the race-start state machine: on entering 3D (or after a reset) a
// 5-light countdown runs, then it flips to 'racing'. Throttle is locked until
// GO (enforced in vehicleControls via raceState).

export const LIGHT_INTERVAL_MS = 650
export const GO_MS = LIGHT_INTERVAL_MS * 5 + 900 // last light + hold

export interface CountdownInfo {
  litCount: number // 0..5 red lights currently on
  go: boolean // lights out -> GO
  sinceGoMs: number // ms since GO (for the "GO!" flash)
}

export function countdownInfo(nowMs: number, startedAt: number): CountdownInfo {
  const t = nowMs - startedAt
  if (t >= GO_MS) return { litCount: 0, go: true, sinceGoMs: t - GO_MS }
  const litCount = Math.max(0, Math.min(5, Math.floor(t / LIGHT_INTERVAL_MS) + 1))
  return { litCount, go: false, sinceGoMs: 0 }
}

// Single source of truth for "are we go?" — derived from the countdown clock so
// it is correct even if the tab was hidden (timers frozen) during the lights.
export function raceGo(nowMs = performance.now()): boolean {
  const g = useGameStore.getState()
  if (g.mode !== '3d') return true
  if (g.raceState === 'racing') return true
  return countdownInfo(nowMs, g.countdownStartedAt).go
}

export function useRaceControl(): void {
  const mode = useGameStore((s) => s.mode)
  const resetNonce = useGameStore((s) => s.resetNonce)

  // (re)start the countdown when the 3D race begins or is reset
  useEffect(() => {
    if (mode === '3d') useGameStore.getState().beginCountdown()
  }, [mode, resetNonce])

  // tick the countdown to GO (setInterval keeps running even when the tab is hidden)
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useGameStore.getState()
      if (s.mode !== '3d' || s.raceState !== 'countdown') return
      if (performance.now() - s.countdownStartedAt >= GO_MS) s.setRaceState('racing')
    }, 90)
    return () => window.clearInterval(id)
  }, [])
}
