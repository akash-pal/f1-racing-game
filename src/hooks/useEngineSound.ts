import { useEffect } from 'react'
import { pseudoGear } from '../lib/pseudoGear'
import { KMH_PER_MS } from '../lib/constants'
import { useGameStore } from '../state/useGameStore'
import { useInputStore } from '../state/useInputStore'
import { useLiveStore } from '../state/useLiveStore'

// Engine audio for the 3D car: a single recorded loop (public/audio/engine.mp3)
// whose playback rate rises with revs and whose level follows throttle + road
// speed — near-silent at rest, building as you accelerate. Muted via the sound
// toggle (M).
//
// Browsers block audio until a gesture, so the graph is built on the first
// key / pointer down (or when sound is switched on, which is itself a click).

const SRC = `${import.meta.env.BASE_URL}audio/engine.mp3`
const IDLE_RPM = 3800
const MAX_RPM = 15500

export function useEngineSound(): void {
  useEffect(() => {
    let ctx: AudioContext | null = null
    let master: GainNode | null = null
    let src: AudioBufferSourceNode | null = null
    let raf = 0
    let disposed = false
    let starting = false

    const start = async () => {
      if (ctx || starting || disposed || !useGameStore.getState().soundOn) return
      starting = true
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) {
        starting = false
        return
      }
      const c = new Ctor()
      try {
        const buf = await fetch(SRC)
          .then((r) => r.arrayBuffer())
          .then((b) => c.decodeAudioData(b))
        if (disposed) {
          c.close()
          return
        }
        const m = c.createGain()
        m.gain.value = 0
        m.connect(c.destination)

        const s = c.createBufferSource()
        s.buffer = buf
        s.loop = true
        s.connect(m)
        s.start()

        ctx = c
        master = m
        src = s
        loop()
      } catch {
        c.close()
      } finally {
        starting = false
      }
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!ctx || !master || !src || ctx.state !== 'running') return

      const live = useLiveStore.getState()
      const input = useInputStore.getState()
      const speedKmh = live.speedMs * KMH_PER_MS
      const reversing = live.speedMs > 0.3 && input.brake > 0.1 && speedKmh < 3
      const gear = pseudoGear(speedKmh, reversing)

      // revs follow the gear; a throttle stab lifts them even before the car has
      // picked up speed (standing revs / launch / wheelspin)
      const revFrac = Math.min(1, Math.max(0.05, gear.rpm * 0.72 + input.throttle * 0.45))
      const rpm = IDLE_RPM + (MAX_RPM - IDLE_RPM) * revFrac
      const moving = Math.min(1, live.speedMs / 6)
      const thr = input.throttle

      const t = ctx.currentTime
      const glide = (p: AudioParam, v: number, tau = 0.06) => p.setTargetAtTime(v, t, tau)

      // map revs to playback rate around the clip's natural pitch
      glide(src.playbackRate, 0.62 + (rpm / MAX_RPM) * 1.25)

      // level: silent parked + off throttle, builds with load & speed, small
      // trailing note on the overrun. Kept well under 1 so throttle isn't harsh.
      const overrun = (1 - thr) * moving * 0.12
      const target = Math.min(0.6, 0.46 * thr + 0.3 * moving + overrun)
      const cur = master.gain.value
      glide(master.gain, target, target > cur ? 0.04 : 0.14)
    }

    const applySoundOn = (on: boolean) => {
      if (disposed) return
      if (on) {
        if (!ctx) void start()
        else void ctx.resume()
      } else {
        void ctx?.suspend()
      }
    }

    const unlock = () => applySoundOn(useGameStore.getState().soundOn)
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.soundOn !== prev.soundOn) applySoundOn(s.soundOn)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
      unsub()
      try {
        if (master && ctx) {
          master.gain.cancelScheduledValues(ctx.currentTime)
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
        }
        src?.stop(ctx ? ctx.currentTime + 0.2 : 0)
        const c = ctx
        setTimeout(() => c?.close(), 300)
      } catch {
        /* already closing */
      }
    }
  }, [])
}
