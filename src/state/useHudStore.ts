import { create } from 'zustand'

// Telemetry snapshot for the HUD. Written from useFrame loops but THROTTLED
// (see Car2D / Vehicle): flush ~10 Hz so the HUD repaints 10x/s, not 60x/s.
// The <Hud> component is the only intended subscriber.

interface HudStore {
  speedKph: number
  offTrack: boolean
  lap: number
  lastLapMs: number | null
  bestLapMs: number | null
  set: (patch: Partial<Omit<HudStore, 'set' | 'reset'>>) => void
  reset: () => void
}

const ZERO = {
  speedKph: 0,
  offTrack: false,
  lap: 0,
  lastLapMs: null as number | null,
  bestLapMs: null as number | null,
}

export const useHudStore = create<HudStore>((set) => ({
  ...ZERO,
  set: (patch) => set(patch),
  reset: () => set({ ...ZERO }),
}))
