import { useGameStore } from '../state/useGameStore'
import { useHudStore } from '../state/useHudStore'

// Fixed HTML overlay. The ONLY intended subscriber to useHudStore, which is
// written throttled (~10 Hz) by the active scene.

const fmtLap = (ms: number | null): string => {
  if (ms === null) return '--:--.---'
  const total = ms / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

export function Hud() {
  const mode = useGameStore((s) => s.mode)
  const speedKph = useHudStore((s) => s.speedKph)
  const offTrack = useHudStore((s) => s.offTrack)
  const lap = useHudStore((s) => s.lap)
  const lastLapMs = useHudStore((s) => s.lastLapMs)
  const bestLapMs = useHudStore((s) => s.bestLapMs)

  const showLaps = mode === '2d' || mode === '3d'

  return (
    <div className="overlay overlay--bottom-left">
      <div className="hud">
        <div className="hud__speed">
          <span className="hud__speed-value">{Math.round(Math.abs(speedKph))}</span>
          <span className="hud__speed-unit">km/h</span>
        </div>
        {showLaps && (
          <div className="hud__laps">
            <div>
              Lap <strong>{lap}</strong>
            </div>
            <div>Last {fmtLap(lastLapMs)}</div>
            <div>Best {fmtLap(bestLapMs)}</div>
          </div>
        )}
        {offTrack && <div className="hud__warn">OFF TRACK</div>}
      </div>
    </div>
  )
}
