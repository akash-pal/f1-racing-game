import { useEffect } from 'react'
import { pseudoGear } from '../lib/pseudoGear'
import { KMH_PER_MS } from '../lib/constants'
import { useInputStore } from '../state/useInputStore'
import { useLiveStore } from '../state/useLiveStore'

// Synthesised engine note for the 3D car, roughly voiced like a current-spec
// (1.6 L V6 turbo-hybrid) F1 power unit: a hard sawtooth stack at the firing
// frequency, a filtered induction rasp, and a turbo whistle that comes up with
// revs. Everything is Web Audio — no samples to ship.
//
// Browsers block audio until a user gesture, so the graph is built and started
// on the first keydown / pointerdown and torn down on unmount.

type Nodes = {
  ctx: AudioContext
  master: GainNode
  oscA: OscillatorNode
  oscB: OscillatorNode
  sub: OscillatorNode
  bright: OscillatorNode
  engineGain: GainNode
  lp: BiquadFilterNode
  noiseGain: GainNode
  bp: BiquadFilterNode
  whistle: OscillatorNode
  whistleGain: GainNode
}

const IDLE_RPM = 3500
const MAX_RPM = 15500

export function useEngineSound(enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    let nodes: Nodes | null = null
    let raf = 0
    let disposed = false

    const build = () => {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()

      const master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)

      // --- engine: sawtooth stack through a tracking low-pass ---
      const engineGain = ctx.createGain()
      engineGain.gain.value = 0.5
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1200
      lp.Q.value = 6
      engineGain.connect(lp)
      lp.connect(master)

      const mkOsc = (type: OscillatorType, detune: number, gain: number) => {
        const o = ctx.createOscillator()
        o.type = type
        o.detune.value = detune
        const g = ctx.createGain()
        g.gain.value = gain
        o.connect(g)
        g.connect(engineGain)
        o.start()
        return o
      }
      const oscA = mkOsc('sawtooth', -7, 0.5)
      const oscB = mkOsc('sawtooth', 6, 0.5)
      const sub = mkOsc('square', 0, 0.28)
      const bright = mkOsc('sawtooth', 12, 0.12)

      // --- induction / exhaust rasp: white noise through a tracking band-pass ---
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const nd = noiseBuf.getChannelData(0)
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuf
      noise.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 600
      bp.Q.value = 7
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0
      noise.connect(bp)
      bp.connect(noiseGain)
      noiseGain.connect(master)
      noise.start()

      // --- turbo whistle ---
      const whistle = ctx.createOscillator()
      whistle.type = 'sine'
      whistle.frequency.value = 1000
      const whistleGain = ctx.createGain()
      whistleGain.gain.value = 0
      whistle.connect(whistleGain)
      whistleGain.connect(master)
      whistle.start()

      nodes = {
        ctx,
        master,
        oscA,
        oscB,
        sub,
        bright,
        engineGain,
        lp,
        noiseGain,
        bp,
        whistle,
        whistleGain,
      }
      loop()
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const n = nodes
      if (!n) return
      const { ctx } = n
      if (ctx.state === 'suspended') return

      const live = useLiveStore.getState()
      const input = useInputStore.getState()
      const speedKmh = live.speedMs * KMH_PER_MS
      const reversing = live.speedMs > 0.3 && input.brake > 0.1 && speedKmh < 3
      const gear = pseudoGear(speedKmh, reversing)

      // revs: gear fraction gives the up-shift "bark"; blow-up a little on
      // throttle even when speed hasn't caught up yet (wheelspin / launch)
      const revFrac = Math.min(1, gear.rpm * 0.82 + input.throttle * 0.18 + 0.06)
      const rpm = IDLE_RPM + (MAX_RPM - IDLE_RPM) * revFrac
      const fire = (rpm / 60) * 3 // V6 four-stroke: 3 firing events / rev

      const t = ctx.currentTime
      const glide = (p: AudioParam, v: number, tau = 0.06) => p.setTargetAtTime(v, t, tau)

      glide(n.oscA.frequency, fire)
      glide(n.oscB.frequency, fire)
      glide(n.sub.frequency, fire * 0.5)
      glide(n.bright.frequency, fire * 2)
      glide(n.lp.frequency, Math.min(9000, fire * 6 + input.throttle * 2600 + 500))
      glide(n.bp.frequency, Math.min(6000, fire * 3 + 300))
      glide(n.noiseGain.gain, 0.015 + 0.05 * revFrac + 0.03 * input.throttle)
      glide(n.whistle.frequency, 800 + revFrac * 3200)
      glide(n.whistleGain.gain, (0.006 + 0.02 * input.throttle) * revFrac)

      // overall level: always-on idle, opens up with load and revs
      const level = 0.05 + 0.14 * input.throttle + 0.05 * revFrac
      glide(n.master.gain, level, 0.08)
    }

    const unlock = () => {
      if (disposed) return
      if (!nodes) build()
      nodes?.ctx.resume()
    }
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
      const n = nodes
      if (n) {
        try {
          n.master.gain.cancelScheduledValues(n.ctx.currentTime)
          n.master.gain.setTargetAtTime(0, n.ctx.currentTime, 0.05)
          setTimeout(() => n.ctx.close(), 250)
        } catch {
          /* context already closing */
        }
      }
    }
  }, [enabled])
}
