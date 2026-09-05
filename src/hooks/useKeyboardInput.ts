import { useEffect } from 'react'
import { KEY_MAP } from '../lib/constants'
import { dampTowards } from '../lib/math'
import { useInputStore } from '../state/useInputStore'

// Maps the keyboard to the analog input axes in useInputStore.
//
// - Runs its OWN requestAnimationFrame loop (not useFrame) so it can be mounted
//   once in <App>, outside any <Canvas>, and keep working across scene switches.
// - Keys ramp the axes toward their targets (dampTowards) instead of snapping —
//   instant full-lock steering feels awful, and Phase 2's speed-scaled steering
//   wants a continuous input.
// - A window 'blur' handler clears held keys so a key can't get "stuck" when the
//   tab loses focus mid-press.
// - isTyping() stops Space from both handbraking and activating a focused button.

type Held = { fwd: boolean; back: boolean; left: boolean; right: boolean; handbrake: boolean }

const freshHeld = (): Held => ({
  fwd: false,
  back: false,
  left: false,
  right: false,
  handbrake: false,
})

const isTyping = (): boolean => {
  const el = document.activeElement
  return (
    el instanceof HTMLElement &&
    (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  )
}

export function useKeyboardInput(): void {
  useEffect(() => {
    const held = freshHeld()
    const RAMP = 7 // axis e-folds per second

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const action = KEY_MAP[e.code]
      if (!action) return
      if (e.code === 'Space' && isTyping()) return
      if (e.code === 'Space') e.preventDefault() // stop page scroll
      held[action] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action) held[action] = false
    }
    const onBlur = () => Object.assign(held, freshHeld())

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.1)
      prev = now
      const s = useInputStore.getState()
      const steerTarget = (held.right ? 1 : 0) - (held.left ? 1 : 0)
      s.set({
        throttle: dampTowards(s.throttle, held.fwd ? 1 : 0, RAMP, dt),
        brake: dampTowards(s.brake, held.back ? 1 : 0, RAMP, dt),
        steer: dampTowards(s.steer, steerTarget, RAMP, dt),
        handbrake: held.handbrake,
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      useInputStore.getState().reset()
    }
  }, [])
}
