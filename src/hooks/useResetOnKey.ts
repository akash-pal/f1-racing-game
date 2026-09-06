import { useEffect } from 'react'
import { useGameStore } from '../state/useGameStore'

// Global hotkeys:
//   R  reset / restart the lap        P  pause
//   C  cycle camera view              T  cycle time of day
//   L  toggle racing line             G  toggle ghost car
//   K  toggle traction control
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
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
