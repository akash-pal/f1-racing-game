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
  onKerb: boolean // a wheel is on a corner kerb
  offTrack: boolean // the car is off the tarmac (on grass)
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
  onKerb: false,
  offTrack: false,
  set: (patch) => set(patch),
}))

if (import.meta.env?.DEV) {
  ;(globalThis as unknown as Record<string, unknown>).__liveStore = useLiveStore
}
