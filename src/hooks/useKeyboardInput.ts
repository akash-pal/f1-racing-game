import { useEffect } from 'react'
import { KEY_MAP } from '../lib/constants'
import { dampTowards } from '../lib/math'
import { useInputStore } from '../state/useInputStore'

// Maps the keyboard AND a gamepad (PS5 DualSense / Xbox / any "standard"
// controller) to the analog input axes in useInputStore.
//
// - Runs its OWN requestAnimationFrame loop (not useFrame) so it can be mounted
//   once in <App>, outside any <Canvas>, and keep working across scene switches.
// - Keyboard: A/D (or ←/→) steer, W/↑ gas, S/↓/Space brake, Shift handbrake.
// - Gamepad: left stick X = steer, R2 = gas, L2 = brake, ✕ or R1 = handbrake.
//   Whichever device you touch takes over; steering eases back to centre on
//   release (light caster), it doesn't snap.
// - Contract: steer axis is +1 for RIGHT, -1 for LEFT (see constants STEER_SIGN).

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

const STICK_DEADZONE = 0.12
const TRIGGER_DEADZONE = 0.04

/** First connected gamepad, preferring one with the "standard" mapping. */
function activePad(): Gamepad | null {
  const pads = navigator.getGamepads?.() ?? []
  let fallback: Gamepad | null = null
  for (const p of pads) {
    if (!p) continue
    if (p.mapping === 'standard') return p
    fallback ??= p
  }
  return fallback
}

export function useKeyboardInput(): void {
  useEffect(() => {
    const held = freshHeld()
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
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    let raf = 0
    let prev = performance.now()
    let padSteer = 0 // low-passed stick value

    const tick = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.1)
      prev = now
      const s = useInputStore.getState()

      // --- gamepad (standard mapping): axes[0] stick X, buttons 6/7 = L2/R2 ---
      const pad = activePad()
      let padThrottle = 0
      let padBrake = 0
      let padHandbrake = false
      let padSteerTarget = 0
      let padSteering = false
      if (pad) {
        const sx = pad.axes[0] ?? 0
        padSteerTarget =
          Math.abs(sx) < STICK_DEADZONE
            ? 0
            : Math.sign(sx) * ((Math.abs(sx) - STICK_DEADZONE) / (1 - STICK_DEADZONE))
        const rt = pad.buttons[7]?.value ?? 0
        const lt = pad.buttons[6]?.value ?? 0
        padThrottle = rt < TRIGGER_DEADZONE ? 0 : rt
        padBrake = lt < TRIGGER_DEADZONE ? 0 : lt
        padHandbrake = !!(pad.buttons[0]?.pressed || pad.buttons[5]?.pressed) // ✕ or R1
        padSteering = Math.abs(padSteerTarget) > 0.02
      }
      // low-pass the stick a touch so raw jitter near centre isn't steering noise
      padSteer += (padSteerTarget - padSteer) * Math.min(1, 18 * dt)

      // --- combine: gamepad and keyboard coexist, larger input wins ---
      const keySteer = (held.right ? 1 : 0) - (held.left ? 1 : 0)
      const throttleTarget = Math.max(held.fwd ? 1 : 0, padThrottle)
      const brakeTarget = Math.max(held.back ? 1 : 0, padBrake)
      const handbrake = held.handbrake || padHandbrake

      // steering: keyboard key wins while held; else follow the stick; else ease
      // gently back to centre
      let steerTarget: number
      let steerRate: number
      if (keySteer !== 0) {
        steerTarget = keySteer
        steerRate = 11
      } else if (padSteering) {
        steerTarget = padSteer
        steerRate = 16 // the stick is already analog — track it fairly directly
      } else {
        steerTarget = 0
        steerRate = 0.9
      }

      s.set({
        throttle: dampTowards(s.throttle, throttleTarget, RAMP, dt),
        brake: dampTowards(s.brake, brakeTarget, RAMP, dt),
        steer: dampTowards(s.steer, steerTarget, steerRate, dt),
        handbrake,
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
