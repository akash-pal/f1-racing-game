import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { resetTouchInput, setTouchInput } from '../state/touchInput'
import { useGameStore } from '../state/useGameStore'

// On-screen controls for phones/tablets (shown only on coarse-pointer devices).
//   Left:  steering pad — slide your thumb left/right for analog steering.
//   Right: GAS / BRAKE pedals (multi-touch, so you can steer and accelerate).
//   Top:   small buttons for handbrake, camera, restart, pause.
// Everything writes into `touchInput`, which useKeyboardInput folds into the
// same analog axes the keyboard and gamepad drive.

const STEER_RANGE = 0.8 // fraction of the half-width that gives full lock

const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function holdHandlers(set: (down: boolean) => void) {
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      set(true)
    },
    onPointerUp: () => set(false),
    onPointerCancel: () => set(false),
    onLostPointerCapture: () => set(false),
    onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
  }
}

export function TouchControls() {
  const [visible, setVisible] = useState(isTouchDevice)
  const mode = useGameStore((s) => s.mode)
  const paused = useGameStore((s) => s.paused)
  const [knob, setKnob] = useState(0)
  const padRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = () => setVisible(mq.matches)
    mq.addEventListener('change', onChange)
    // a real touch on a hybrid device (e.g. laptop with touchscreen) enables it too
    const onTouch = () => setVisible(true)
    window.addEventListener('touchstart', onTouch, { once: true, passive: true })
    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('touchstart', onTouch)
      resetTouchInput()
    }
  }, [])

  useEffect(() => {
    const onHide = () => {
      resetTouchInput()
      setKnob(0)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  if (!visible) return null

  const steerFrom = (clientX: number) => {
    const r = padRef.current?.getBoundingClientRect()
    if (!r) return
    const half = r.width / 2
    const v = Math.max(-1, Math.min(1, (clientX - (r.left + half)) / (half * STEER_RANGE)))
    setTouchInput({ steer: v })
    setKnob(v)
  }
  const steerEnd = () => {
    setTouchInput({ steer: 0 })
    setKnob(0)
  }

  const g = useGameStore.getState
  const tap = (fn: () => void) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault()
      fn()
    },
  })

  const gas = holdHandlers((d) => setTouchInput({ throttle: d }))
  const brake = holdHandlers((d) => setTouchInput({ brake: d }))
  const hand = holdHandlers((d) => setTouchInput({ handbrake: d }))

  return (
    <div className="touch" onContextMenu={(e) => e.preventDefault()}>
      <div className="touch__top">
        <button type="button" className="touch__small" {...hand}>
          HAND<br />BRAKE
        </button>
        <button type="button" className="touch__small" {...tap(() => g().cycleCameraView())}>
          📷
        </button>
        <button type="button" className="touch__small" {...tap(() => g().requestReset())}>
          ↺
        </button>
        <button type="button" className="touch__small" {...tap(() => g().togglePause())}>
          {paused ? '▶' : '⏸'}
        </button>
        {mode === '3d' && (
          <button type="button" className="touch__small" {...tap(() => g().cycleTimeOfDay())}>
            ☀
          </button>
        )}
      </div>

      <div
        ref={padRef}
        className="touch__pad"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          steerFrom(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) steerFrom(e.clientX)
        }}
        onPointerUp={steerEnd}
        onPointerCancel={steerEnd}
        onLostPointerCapture={steerEnd}
      >
        <span className="touch__arrow">◀</span>
        <div className="touch__knob" style={{ left: `${50 + knob * 36}%` }} />
        <span className="touch__arrow">▶</span>
      </div>

      <div className="touch__pedals">
        <button type="button" className="touch__pedal touch__pedal--brake" {...brake}>
          BRAKE
        </button>
        <button type="button" className="touch__pedal touch__pedal--gas" {...gas}>
          GAS
        </button>
      </div>
    </div>
  )
}
