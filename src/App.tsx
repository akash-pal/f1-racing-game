import { Leva } from 'leva'
import { Hud } from './app/Hud'
import { ModeSwitcher } from './app/ModeSwitcher'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { useResetOnKey } from './hooks/useResetOnKey'
import { Prototype2D } from './prototype2d/Prototype2D'
import { Sandbox } from './sandbox/Sandbox'
import { Game3D } from './game3d/Game3D'
import { useGameStore } from './state/useGameStore'

// Store-driven scene toggle. Input + reset hooks run here (outside any <Canvas>)
// so they keep working across scene switches. Each scene owns its own <Canvas>.

export default function App() {
  useKeyboardInput()
  useResetOnKey()
  const mode = useGameStore((s) => s.mode)

  return (
    <div className="app">
      {mode === 'sandbox' && <Sandbox />}
      {mode === '2d' && <Prototype2D />}
      {mode === '3d' && <Game3D />}

      <ModeSwitcher />
      <Hud />
      <Leva collapsed hidden={mode !== '3d'} />
      <div className="overlay overlay--top-right">
        <div className="help">
          <div>
            <kbd>W</kbd>/<kbd>↑</kbd> throttle · <kbd>S</kbd>/<kbd>↓</kbd> brake·reverse
          </div>
          <div>
            <kbd>A</kbd>/<kbd>D</kbd> steer · <kbd>Space</kbd> handbrake · <kbd>R</kbd> reset
          </div>
        </div>
      </div>
    </div>
  )
}
