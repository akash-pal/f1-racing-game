import { useEffect } from 'react'
import { pseudoGear } from '../lib/pseudoGear'
import { KMH_PER_MS } from '../lib/constants'
import { useInputStore } from '../state/useInputStore'
import { useLiveStore } from '../state/useLiveStore'

// Engine audio for the 3D car: a recorded loop (public/audio/engine.mp3) whose
// playback rate rises with revs and whose level follows throttle + road speed,
// so it's near-silent at rest and builds as you accelerate.
//
// Browsers block audio until a user gesture, so the graph is created and the
// sample fetched on the first key / pointer down, and torn down on unmount.

const SRC = '/audio/engine.mp3'
const IDLE_RPM = 3800
const MAX_RPM = 15500

export function useEngineSound(enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    let ctx: AudioContext | null = null
    let src: AudioBufferSourceNode | null = null
    let rateParam: AudioParam | null = null
    let gain: GainNode | null = null
    let raf = 0
    let disposed = false
    let starting = false

    const start = async () => {
      if (ctx || starting || disposed) return
      starting = true
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const c = new Ctor()
      try {
        const buf = await fetch(SRC).then((r) => r.arrayBuffer())
        const audio = await c.decodeAudioData(buf)
        if (disposed) {
          c.close()
          return
        }
        const s = c.createBufferSource()
        s.buffer = audio
        s.loop = true

        const g = c.createGain()
        g.gain.value = 0
        s.connect(g)
        g.connect(c.destination)
        s.start()

        ctx = c
        src = s
        rateParam = s.playbackRate
        gain = g
        loop()
      } catch {
        c.close()
      } finally {
        starting = false
      }
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!ctx || !gain || !rateParam || ctx.state === 'suspended') return

      const live = useLiveStore.getState()
      const input = useInputStore.getState()
      const speedKmh = live.speedMs * KMH_PER_MS
      const reversing = live.speedMs > 0.3 && input.brake > 0.1 && speedKmh < 3
      const gear = pseudoGear(speedKmh, reversing)

      // revs follow the gear; a throttle stab lifts them even before the car has
      // picked up speed (standing revs / launch / wheelspin)
      const revFrac = Math.min(1, Math.max(0.05, gear.rpm * 0.72 + input.throttle * 0.45))
      const rpm = IDLE_RPM + (MAX_RPM - IDLE_RPM) * revFrac

      const t = ctx.currentTime
      // map revs to playback rate around the clip's natural pitch
      const rate = 0.62 + (rpm / MAX_RPM) * 1.25
      rateParam.setTargetAtTime(rate, t, 0.05)

      // level: silent at rest off throttle, opens up with load; a little
      // trailing note on the overrun when you lift at speed
      const moving = Math.min(1, live.speedMs / 8)
      const overrun = (1 - input.throttle) * moving * 0.14
      const idleBed = 0.09 * moving
      const target = Math.min(1, 0.85 * input.throttle + overrun + idleBed)
      const cur = gain.gain.value
      gain.gain.setTargetAtTime(target, t, target > cur ? 0.04 : 0.14)
    }

    const unlock = () => {
      if (disposed) return
      if (!ctx) void start()
      else void ctx.resume()
    }
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
      try {
        if (gain && ctx) {
          gain.gain.cancelScheduledValues(ctx.currentTime)
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
        }
        src?.stop(ctx ? ctx.currentTime + 0.2 : 0)
        const c = ctx
        setTimeout(() => c?.close(), 300)
      } catch {
        /* already closing */
      }
    }
  }, [enabled])
}
