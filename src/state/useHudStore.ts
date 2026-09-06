import { create } from 'zustand'

// Telemetry snapshot for the HUD + minimap. Written from useFrame loops, mostly
// throttled (~15 Hz). <Hud> and <Minimap> are the intended subscribers.

interface HudStore {
  speedKph: number
  gearLabel: string
  rpm: number // 0..1
  throttle: number // 0..1
  brake: number // 0..1
  offTrack: boolean

  lap: number
  currentLapMs: number
  lastLapMs: number | null
  bestLapMs: number | null
  deltaMs: number | null // vs best/ghost at the same track position
  newRecord: boolean

  // car pose for the minimap
  carX: number
  carZ: number
  carHeading: number

  set: (patch: Partial<Omit<HudStore, 'set' | 'reset'>>) => void
  reset: () => void
}

const ZERO = {
  speedKph: 0,
  gearLabel: 'N',
  rpm: 0,
  throttle: 0,
  brake: 0,
  offTrack: false,
  lap: 0,
  currentLapMs: 0,
  lastLapMs: null as number | null,
  bestLapMs: null as number | null,
  deltaMs: null as number | null,
  newRecord: false,
  carX: 0,
  carZ: 0,
  carHeading: 0,
}

export const useHudStore = create<HudStore>((set) => ({
  ...ZERO,
  set: (patch) => set(patch),
  // keep best lap + record flag across a car reset; wipe the rest
  reset: () =>
    set((s) => ({
      ...ZERO,
      bestLapMs: s.bestLapMs,
    })),
}))
