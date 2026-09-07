import { useEffect } from 'react'
import { KEY_MAP } from '../lib/constants'
import { dampTowards } from '../lib/math'
import { useInputStore } from '../state/useInputStore'

// Maps the keyboard AND the mouse to the analog input axes in useInputStore.
//
// - Runs its OWN requestAnimationFrame loop (not useFrame) so it can be mounted
//   once in <App>, outside any <Canvas>, and keep working across scene switches.
// - Steering: keyboard A/D (or ←/→) ramp the steer axis toward ±1. Moving the
//   mouse steers by absolute horizontal position — pointer at the left edge =
//   full left lock, centre = straight, right edge = full right. Mouse steering
//   only counts while the pointer is actually moving; once it's been still for
//   MOUSE_IDLE_MS the wheel eases back to centre, so a parked cursor off to one
//   side doesn't pull the car. A key press overrides the mouse while held.
// - Contract: steer axis is +1 for RIGHT, -1 for LEFT (see constants STEER_SIGN).
// - A window 'blur' handler clears held keys so a key can't get "stuck".

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

const MOUSE_DEADZONE = 0.08
const MOUSE_IDLE_MS = 700 // mouse steering releases after the pointer stops moving

export function useKeyboardInput(): void {
  useEffect(() => {
    const held = freshHeld()
    let mouseSteer = 0
    let mouseInWindow = false
    let lastMouseMoveAt = -Infinity
    const RAMP = 8 // axis e-folds per second

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const action = KEY_MAP[e.code]
      if (!action) return
      if (e.code === 'Space' && isTyping()) return
      if (e.code === 'Space') e.preventDefault()
      held[action] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action) held[action] = false
    }
    const onBlur = () => {
      Object.assign(held, freshHeld())
      mouseInWindow = false
    }
    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1 // -1 .. 1
      const dz = Math.abs(nx) < MOUSE_DEADZONE ? 0 : (nx - Math.sign(nx) * MOUSE_DEADZONE) / (1 - MOUSE_DEADZONE)
      const raw = Math.max(-1, Math.min(1, dz))
      // lowpass the pointer position so hand tremor / sensor jitter near centre
      // doesn't turn into steering wobble
      mouseSteer += (raw - mouseSteer) * 0.3
      mouseInWindow = true
      lastMouseMoveAt = performance.now()
    }
    const onMouseLeave = () => {
      mouseInWindow = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)

    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.1)
      prev = now
      const s = useInputStore.getState()

      // Steering does NOT auto-centre. While a key is held (or the mouse is
      // steering) it moves briskly toward the target; when you let go it HOLDS,
      // easing back to centre only very gently (like light caster) so the car
      // never "corrects itself" out from under you.
      const keySteer = (held.right ? 1 : 0) - (held.left ? 1 : 0)
      // the mouse only steers while it's actually being moved
      const mouseActive = mouseInWindow && now - lastMouseMoveAt < MOUSE_IDLE_MS
      const engaging = keySteer !== 0 || mouseActive
      const steerTarget = keySteer !== 0 ? keySteer : mouseActive ? mouseSteer : 0
      const steerRate = engaging ? 11 : 0.9

      s.set({
        throttle: dampTowards(s.throttle, held.fwd ? 1 : 0, RAMP, dt),
        brake: dampTowards(s.brake, held.back ? 1 : 0, RAMP, dt),
        steer: dampTowards(s.steer, steerTarget, steerRate, dt),
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
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      useInputStore.getState().reset()
    }
  }, [])
}
