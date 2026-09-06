import { TIME_OF_DAY, TIME_ORDER } from '../lib/timeOfDay'
import { useGameStore } from '../state/useGameStore'

// Segmented control for the time of day (also cycled with the T key).
export function TimeOfDayPicker() {
  const mode = useGameStore((s) => s.mode)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)

  if (mode !== '3d') return null

  return (
    <div className="overlay overlay--top-center">
      <div className="tod-picker">
        {TIME_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={t === timeOfDay ? 'is-active' : ''}
            onClick={() => {
              setTimeOfDay(t)
              ;(document.activeElement as HTMLElement | null)?.blur()
            }}
          >
            {TIME_OF_DAY[t].label}
          </button>
        ))}
      </div>
    </div>
  )
}
