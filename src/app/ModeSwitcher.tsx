import { useGameStore } from '../state/useGameStore'
import type { Mode } from '../lib/types'

// Plain fixed-position HTML overlay (lives outside every <Canvas>).
// Flips the mounted scene via useGameStore.mode.

const MODES: { id: Mode; label: string }[] = [
  { id: '2d', label: '2D Prototype' },
  { id: '3d', label: '3D Driving' },
]

export function ModeSwitcher() {
  const mode = useGameStore((s) => s.mode)
  const setMode = useGameStore((s) => s.setMode)
  const requestReset = useGameStore((s) => s.requestReset)

  return (
    <div className="overlay overlay--top-left">
      <div className="mode-switcher">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === mode ? 'is-active' : ''}
            onClick={() => {
              setMode(m.id)
              // drop focus so Space doesn't re-trigger this button
              ;(document.activeElement as HTMLElement | null)?.blur()
            }}
          >
            {m.label}
          </button>
        ))}
        <button type="button" className="mode-switcher__reset" onClick={() => requestReset()}>
          Reset (R)
        </button>
      </div>
    </div>
  )
}
