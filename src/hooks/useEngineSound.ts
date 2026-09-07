import { useEffect } from 'react'
import { pseudoGear } from '../lib/pseudoGear'
import { KMH_PER_MS } from '../lib/constants'
import { useGameStore } from '../state/useGameStore'
import { useInputStore } from '../state/useInputStore'
import { useLiveStore } from '../state/useLiveStore'

// Engine audio for the 3D car: two looped field recordings of a 2012 F1 V8
// (Freesound #181187 by Ears68, CC0) — an idle bed and an on-power layer —
// crossfaded by throttle and pitched with revs, so it idles low, screams on
// power, and is silent when parked. Muted via the sound toggle (M).
//
// Browsers block audio until a gesture, so the graph is built on the first
// key / pointer down (or when sound is switched on, which is itself a click).

const IDLE_SRC = '/audio/f1_idle.mp3'
const ONPOWER_SRC = '/audio/f1_onpower.mp3'
const IDLE_RPM = 4000
const MAX_RPM = 15500

export function useEngineSound(): void {
  useEffect(() => {
    let ctx: AudioContext | null = null
    let master: GainNode | null = null
    let idle: { src: AudioBufferSourceNode; gain: GainNode } | null = null
    let power: { src: AudioBufferSourceNode; gain: GainNode } | null = null
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
        const [idleBuf, powerBuf] = await Promise.all(
          [IDLE_SRC, ONPOWER_SRC].map((u) =>
            fetch(u)
              .then((r) => r.arrayBuffer())
              .then((b) => c.decodeAudioData(b)),
          ),
        )
        if (disposed) {
          c.close()
          return
        }
        const m = c.createGain()
        m.gain.value = 0
        m.connect(c.destination)

        const layer = (buf: AudioBuffer) => {
          const s = c.createBufferSource()
          s.buffer = buf
          s.loop = true
          const g = c.createGain()
          g.gain.value = 0
          s.connect(g)
          g.connect(m)
          s.start()
          return { src: s, gain: g }
        }

        ctx = c
        master = m
        idle = layer(idleBuf)
        power = layer(powerBuf)
        loop()
      } catch {
        c.close()
      } finally {
        starting = false
      }
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!ctx || !master || !idle || !power || ctx.state !== 'running') return

      const live = useLiveStore.getState()
      const input = useInputStore.getState()
      const speedKmh = live.speedMs * KMH_PER_MS
      const reversing = live.speedMs > 0.3 && input.brake > 0.1 && speedKmh < 3
      const gear = pseudoGear(speedKmh, reversing)

      // revs follow the gear; a throttle stab lifts them even before the car has
      // picked up speed (standing revs / launch / wheelspin)
      const revFrac = Math.min(1, Math.max(0.05, gear.rpm * 0.72 + input.throttle * 0.45))
      const rpm = IDLE_RPM + (MAX_RPM - IDLE_RPM) * revFrac
      const norm = rpm / MAX_RPM
      const moving = Math.min(1, live.speedMs / 6)
      const thr = input.throttle

      const t = ctx.currentTime
      const glide = (p: AudioParam, v: number, tau = 0.06) => p.setTargetAtTime(v, t, tau)

      // pitch each layer around its recorded rpm
      glide(idle.src.playbackRate, 0.85 + norm * 0.5)
      glide(power.src.playbackRate, 0.7 + norm * 0.95)

      // idle bed while the engine is "running", ducking as you get on the power;
      // on-power layer rises with throttle and revs
      glide(idle.gain.gain, 0.32 * Math.min(1, 0.25 + moving * 1.6) * (1 - 0.8 * thr))
      glide(power.gain.gain, Math.min(1, 0.9 * thr + 0.3 * Math.max(0, revFrac - 0.15) * (0.4 + moving)))

      // master: silent parked + off throttle, builds with load & speed, small
      // trailing note on the overrun
      const overrun = (1 - thr) * moving * 0.14
      const target = Math.min(1, 0.9 * thr + 0.5 * moving + overrun)
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
        idle?.src.stop(ctx ? ctx.currentTime + 0.2 : 0)
        power?.src.stop(ctx ? ctx.currentTime + 0.2 : 0)
        const c = ctx
        setTimeout(() => c?.close(), 300)
      } catch {
        /* already closing */
      }
    }
  }, [])
}
