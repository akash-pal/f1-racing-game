import { useEffect } from 'react'
import { useGameStore } from '../state/useGameStore'

// Global hotkeys (keyboard) and a few gamepad buttons.
//   R  reset / restart the lap        P  pause
//   C  cycle camera view              T  cycle time of day
//   L  toggle racing line             G  toggle ghost car
//   K  toggle traction control        M  mute / unmute engine
//   Gamepad: ▲ camera · ■ reset · Options pause · D-pad ↑ time of day
const isTyping = () => {
  const el = document.activeElement
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
}

export function useResetOnKey(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTyping()) return
      const g = useGameStore.getState()
      switch (e.code) {
        case 'KeyR':
          g.requestReset()
          break
        case 'KeyP':
          g.togglePause()
          break
        case 'KeyC':
          g.cycleCameraView()
          break
        case 'KeyT':
          g.cycleTimeOfDay()
          break
        case 'KeyL':
          g.toggleAssist('racingLine')
          break
        case 'KeyG':
          g.toggleAssist('ghost')
          break
        case 'KeyK':
          g.toggleAssist('tcs')
          break
        case 'KeyM':
          g.toggleSound()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)

    // --- gamepad buttons: poll with rising-edge detection ---
    // standard mapping: 2 = ■ (Square), 3 = ▲ (Triangle), 9 = Options, 12 = D-pad up
    const wasDown: Record<number, boolean> = {}
    let raf = 0
    const poll = () => {
      raf = requestAnimationFrame(poll)
      const pads = navigator.getGamepads?.() ?? []
      const pad = [...pads].find((p) => p) ?? null
      if (!pad) return
      const g = useGameStore.getState()
      const edge = (i: number, fn: () => void) => {
        const down = !!pad.buttons[i]?.pressed
        if (down && !wasDown[i]) fn()
        wasDown[i] = down
      }
      edge(3, () => g.cycleCameraView())
      edge(2, () => g.requestReset())
      edge(9, () => g.togglePause())
      edge(12, () => g.cycleTimeOfDay())
    }
    raf = requestAnimationFrame(poll)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
    }
  }, [])
}
