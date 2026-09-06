import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mode } from '../lib/types'
import { TIME_ORDER, type TimeOfDay } from '../lib/timeOfDay'

// Low-frequency store that drives React re-renders: scene, pause, reset nonce,
// camera view, time of day, driving assists, and the race-start state machine.

export type CameraView = 'chase' | 'cockpit' | 'hood' | 'top'
export const CAMERA_VIEWS: CameraView[] = ['chase', 'cockpit', 'hood', 'top']

export type RaceState = 'countdown' | 'racing' | 'finished'

export interface Assists {
  racingLine: boolean
  ghost: boolean
  tcs: boolean
}

interface GameStore {
  mode: Mode
  paused: boolean
  resetNonce: number
  cameraView: CameraView
  timeOfDay: TimeOfDay
  assists: Assists
  raceState: RaceState
  /** performance.now() when the countdown began; GO time is derived from it. */
  countdownStartedAt: number
  debug: { colliders: boolean; telemetry: boolean }

  setMode: (m: Mode) => void
  togglePause: () => void
  requestReset: () => void
  cycleCameraView: () => void
  setCameraView: (v: CameraView) => void
  cycleTimeOfDay: () => void
  setTimeOfDay: (t: TimeOfDay) => void
  toggleAssist: (k: keyof Assists) => void
  beginCountdown: () => void
  setRaceState: (s: RaceState) => void
  setDebug: (patch: Partial<GameStore['debug']>) => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      mode: '3d',
      paused: false,
      resetNonce: 0,
      cameraView: 'chase',
      timeOfDay: 'noon',
      assists: { racingLine: false, ghost: true, tcs: true },
      raceState: 'countdown',
      countdownStartedAt: 0,
      debug: { colliders: false, telemetry: true },

      setMode: (mode) => set({ mode }),
      togglePause: () => set((s) => ({ paused: !s.paused })),
      requestReset: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),
      cycleCameraView: () =>
        set((s) => ({
          cameraView: CAMERA_VIEWS[(CAMERA_VIEWS.indexOf(s.cameraView) + 1) % CAMERA_VIEWS.length],
        })),
      setCameraView: (cameraView) => set({ cameraView }),
      cycleTimeOfDay: () =>
        set((s) => ({
          timeOfDay: TIME_ORDER[(TIME_ORDER.indexOf(s.timeOfDay) + 1) % TIME_ORDER.length],
        })),
      setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
      toggleAssist: (k) => set((s) => ({ assists: { ...s.assists, [k]: !s.assists[k] } })),
      beginCountdown: () =>
        set({ raceState: 'countdown', countdownStartedAt: performance.now() }),
      setRaceState: (raceState) => set({ raceState }),
      setDebug: (patch) => set((s) => ({ debug: { ...s.debug, ...patch } })),
    }),
    {
      name: 'racing-game',
      partialize: (s) => ({
        mode: s.mode,
        debug: s.debug,
        cameraView: s.cameraView,
        timeOfDay: s.timeOfDay,
        assists: s.assists,
      }),
    },
  ),
)
