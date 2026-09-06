import { useEffect, useRef, useState } from 'react'
import { getSilverstone } from '../track/silverstone'
import { countdownInfo, raceGo } from '../hooks/useRaceControl'
import { useGameStore } from '../state/useGameStore'
import { useHudStore } from '../state/useHudStore'
import { useLiveStore } from '../state/useLiveStore'
import { Minimap } from './Minimap'

const fmtLap = (ms: number | null): string => {
  if (ms === null || ms <= 0) return '--:--.---'
  const total = ms / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

const fmtDelta = (ms: number): string => `${ms >= 0 ? '+' : '-'}${(Math.abs(ms) / 1000).toFixed(2)}`

export function Hud() {
  const mode = useGameStore((s) => s.mode)
  const cameraView = useGameStore((s) => s.cameraView)
  const assists = useGameStore((s) => s.assists)

  const speedKph = useHudStore((s) => s.speedKph)
  const gearLabel = useHudStore((s) => s.gearLabel)
  const rpm = useHudStore((s) => s.rpm)
  const throttle = useHudStore((s) => s.throttle)
  const brake = useHudStore((s) => s.brake)
  const offTrack = useHudStore((s) => s.offTrack)
  const lap = useHudStore((s) => s.lap)
  const lastLapMs = useHudStore((s) => s.lastLapMs)
  const bestLapMs = useHudStore((s) => s.bestLapMs)

  const is3D = mode === '3d'
  const showRace = is3D || mode === '2d'

  // live lap clock + delta, updated on a local rAF (smooth, no React churn)
  const curLapRef = useRef<HTMLSpanElement>(null)
  const deltaRef = useRef<HTMLSpanElement>(null)
  const [banner, setBanner] = useState<string>('')

  useEffect(() => {
    if (!showRace) return
    const track = getSilverstone()
    let raf = 0
    let lastBanner = ''
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const live = useLiveStore.getState()
      if (curLapRef.current) curLapRef.current.textContent = fmtLap(live.lapMs)

      const g = useGameStore.getState()
      // countdown banner
      let b = ''
      const info = countdownInfo(performance.now(), g.countdownStartedAt)
      if (is3D && !raceGo()) b = 'GET READY'
      else if (is3D && info.sinceGoMs < 900) b = 'GO!'
      if (useHudStore.getState().newRecord) b = 'NEW RECORD'
      if (b !== lastBanner) {
        lastBanner = b
        setBanner(b)
      }

      // delta vs best lap, projected by track progress
      const d = deltaRef.current
      const best = useHudStore.getState().bestLapMs
      if (d) {
        if (best && raceGo()) {
          const t = track.sample(live.x, live.z).t
          const delta = live.lapMs - best * t
          d.textContent = fmtDelta(delta)
          d.className = 'hud__delta ' + (delta <= 0 ? 'is-ahead' : 'is-behind')
        } else {
          d.textContent = ''
          d.className = 'hud__delta'
        }
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [showRace, is3D])

  return (
    <>
      {banner && (
        <div className={'race-banner' + (banner === 'GO!' ? ' race-banner--go' : '') + (banner === 'NEW RECORD' ? ' race-banner--record' : '')}>
          {banner}
        </div>
      )}

      <div className="overlay overlay--bottom-left">
        <div className="hud">
          <div className="hud__cluster">
            <div className="hud__gear">{gearLabel}</div>
            <div className="hud__speed">
              <span className="hud__speed-value">{Math.round(Math.abs(speedKph))}</span>
              <span className="hud__speed-unit">km/h</span>
            </div>
          </div>
          <div className="hud__rpm">
            <div className="hud__rpm-fill" style={{ width: `${Math.round(rpm * 100)}%` }} />
          </div>
          <div className="hud__pedals">
            <div className="hud__pedal">
              <div className="hud__pedal-fill hud__pedal-fill--throttle" style={{ height: `${Math.round(throttle * 100)}%` }} />
            </div>
            <div className="hud__pedal">
              <div className="hud__pedal-fill hud__pedal-fill--brake" style={{ height: `${Math.round(brake * 100)}%` }} />
            </div>
          </div>
          {offTrack && <div className="hud__warn">OFF TRACK</div>}
        </div>
      </div>

      {showRace && (
        <div className="overlay overlay--bottom-right">
          <div className="hud-timing">
            <div className="hud-timing__lap">LAP {lap}</div>
            <div className="hud-timing__row">
              <span>CUR</span>
              <span ref={curLapRef} className="hud-timing__cur">
                --:--.---
              </span>
            </div>
            <div className="hud-timing__row">
              <span>LAST</span>
              <span>{fmtLap(lastLapMs)}</span>
            </div>
            <div className="hud-timing__row hud-timing__row--best">
              <span>BEST</span>
              <span>{fmtLap(bestLapMs)}</span>
            </div>
            <span ref={deltaRef} className="hud__delta" />
            {is3D && <Minimap />}
          </div>
        </div>
      )}

      {is3D && (
        <div className="overlay overlay--chips">
          <div className="hud-chips">
            <span className="chip">📷 {cameraView}</span>
            {assists.racingLine && <span className="chip chip--on">LINE</span>}
            {assists.tcs && <span className="chip chip--on">TCS</span>}
            {assists.ghost && <span className="chip chip--on">GHOST</span>}
          </div>
        </div>
      )}

    </>
  )
}
