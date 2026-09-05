import { create } from 'zustand'
import type { InputAxes } from '../lib/types'

// Analog input axes. Written every frame by useKeyboardInput (and later the G29).
// HOT PATH RULE: read this with useInputStore.getState() inside useFrame loops.
// Never subscribe with a selector hook in a component that also runs useFrame.

interface InputStore extends InputAxes {
  set: (patch: Partial<InputAxes>) => void
  reset: () => void
}

const ZERO: InputAxes = { throttle: 0, brake: 0, steer: 0, handbrake: false }

export const useInputStore = create<InputStore>((set) => ({
  ...ZERO,
  set: (patch) => set(patch),
  reset: () => set(ZERO),
}))
