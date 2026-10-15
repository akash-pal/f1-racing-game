// Mutable touch-control state. Written by <TouchControls> pointer handlers,
// read every frame by useKeyboardInput, which merges it with keyboard/gamepad.
// Plain object (not zustand): it is only ever read from rAF loops.
export const touchInput = {
  steer: 0, // -1 left … +1 right (analog)
  throttle: false,
  brake: false,
  handbrake: false,
}

export function resetTouchInput(): void {
  touchInput.steer = 0
  touchInput.throttle = false
  touchInput.brake = false
  touchInput.handbrake = false
}

export function setTouchInput(patch: Partial<typeof touchInput>): void {
  Object.assign(touchInput, patch)
}
