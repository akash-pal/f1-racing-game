import { Leva } from 'leva'
import { useState } from 'react'
import { Hud } from './app/Hud'
import { ModeSwitcher } from './app/ModeSwitcher'
import { TouchControls } from './app/TouchControls'
import { TimeOfDayPicker } from './app/TimeOfDayPicker'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { useRaceControl } from './hooks/useRaceControl'
import { useResetOnKey } from './hooks/useResetOnKey'
import { Prototype2D } from './prototype2d/Prototype2D'
import { Game3D } from './game3d/Game3D'
import { useGameStore } from './state/useGameStore'

// Store-driven scene toggle. Input, hotkey and race-control hooks run here
// (outside any <Canvas>) so they survive scene switches. Each scene owns its
// own <Canvas>.

export default function App() {
  useKeyboardInput()
  useResetOnKey()
  useRaceControl()
  const mode = useGameStore((s) => s.mode)
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="app">
      {mode === '2d' && <Prototype2D />}
      {mode === '3d' && <Game3D />}

      <ModeSwitcher />
      <TimeOfDayPicker />
      <Hud />
      <TouchControls />
      <Leva collapsed hidden={mode !== '3d' || window.matchMedia?.('(pointer: coarse)').matches} />
      <div className="overlay overlay--top-right">
        <button
          type="button"
          className="help-toggle"
          onClick={() => {
            setShowHelp((v) => !v)
            ;(document.activeElement as HTMLElement | null)?.blur()
          }}
        >
          {showHelp ? '✕' : 'Controls'}
        </button>
        {showHelp && (
          <div className="help">
            <div>
              <kbd>W</kbd>/<kbd>↑</kbd> gas · <kbd>S</kbd>/<kbd>↓</kbd>/<kbd>Space</kbd> brake · <kbd>A</kbd>/<kbd>D</kbd> steer · <kbd>Shift</kbd> handbrake
            </div>
            <div>
              <kbd>C</kbd> camera · <kbd>T</kbd> time · <kbd>L</kbd> line · <kbd>G</kbd> ghost · <kbd>K</kbd> TCS · <kbd>M</kbd> sound · <kbd>R</kbd> restart · <kbd>P</kbd> pause
            </div>
            <div>Touch: slide the left pad to steer · GAS / BRAKE on the right</div>
            <div>
              Gamepad: left stick steer · <kbd>R2</kbd> gas · <kbd>L2</kbd> brake · <kbd>✕</kbd>/<kbd>R1</kbd> handbrake · <kbd>▲</kbd> camera · <kbd>■</kbd> restart · <kbd>Options</kbd> pause
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
