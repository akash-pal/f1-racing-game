import { Leva } from 'leva'
import { Hud } from './app/Hud'
import { ModeSwitcher } from './app/ModeSwitcher'
import { TimeOfDayPicker } from './app/TimeOfDayPicker'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { useRaceControl } from './hooks/useRaceControl'
import { useResetOnKey } from './hooks/useResetOnKey'
import { Prototype2D } from './prototype2d/Prototype2D'
import { Sandbox } from './sandbox/Sandbox'
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

  return (
    <div className="app">
      {mode === 'sandbox' && <Sandbox />}
      {mode === '2d' && <Prototype2D />}
      {mode === '3d' && <Game3D />}

      <ModeSwitcher />
      <TimeOfDayPicker />
      <Hud />
      <Leva collapsed hidden={mode !== '3d'} />
      <div className="overlay overlay--top-right">
        <div className="help">
          <div>
            <kbd>W</kbd>/<kbd>↑</kbd> gas · <kbd>S</kbd>/<kbd>↓</kbd>/<kbd>Space</kbd> brake · <kbd>A</kbd>/<kbd>D</kbd>/mouse steer · <kbd>Shift</kbd> handbrake
          </div>
          <div>
            <kbd>C</kbd> camera · <kbd>T</kbd> time · <kbd>L</kbd> line · <kbd>G</kbd> ghost · <kbd>K</kbd> TCS · <kbd>M</kbd> sound · <kbd>R</kbd> restart · <kbd>P</kbd> pause
          </div>
        </div>
      </div>
    </div>
  )
}
