import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mode } from '../lib/types'

// Low-frequency store that drives React re-renders: which scene is mounted,
// pause state, and a reset nonce the active scene watches to respawn the car.

interface GameStore {
  mode: Mode
  paused: boolean
  resetNonce: number
  debug: {
    colliders: boolean
    telemetry: boolean
  }
  setMode: (m: Mode) => void
  togglePause: () => void
  requestReset: () => void
  setDebug: (patch: Partial<GameStore['debug']>) => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      mode: '3d',
      paused: false,
      resetNonce: 0,
      debug: { colliders: false, telemetry: true },
      setMode: (mode) => set({ mode }),
      togglePause: () => set((s) => ({ paused: !s.paused })),
      requestReset: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),
      setDebug: (patch) => set((s) => ({ debug: { ...s.debug, ...patch } })),
    }),
    {
      name: 'racing-game',
      // Only persist the user's scene choice and debug toggles.
      partialize: (s) => ({ mode: s.mode, debug: s.debug }),
    },
  ),
)
