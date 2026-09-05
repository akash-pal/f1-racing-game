import { useEffect } from 'react'
import { useGameStore } from '../state/useGameStore'

// Global 'R' -> requestReset(). The mounted scene watches resetNonce to respawn.
export function useResetOnKey(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'KeyR') useGameStore.getState().requestReset()
      if (e.code === 'KeyP') useGameStore.getState().togglePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
