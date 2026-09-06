import { create } from 'zustand'

// High-frequency, subscription-free telemetry written every frame by the active
// car and read via getState() inside other useFrame loops (ghost, minimap,
// live lap clock). Never subscribe to this with a selector hook.

interface LiveStore {
  lapMs: number
  x: number
  y: number
  z: number
  heading: number // radians, game convention
  speedMs: number
  slip: number // 0..1 lateral slip / handbrake amount (for skid marks)
  set: (patch: Partial<Omit<LiveStore, 'set'>>) => void
}

export const useLiveStore = create<LiveStore>((set) => ({
  lapMs: 0,
  x: 0,
  y: 0,
  z: 0,
  heading: 0,
  speedMs: 0,
  slip: 0,
  set: (patch) => set(patch),
}))
