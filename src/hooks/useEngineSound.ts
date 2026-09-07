import { useEffect } from 'react'
import { pseudoGear } from '../lib/pseudoGear'
import { KMH_PER_MS } from '../lib/constants'
import { useInputStore } from '../state/useInputStore'
import { useLiveStore } from '../state/useLiveStore'

// Synthesised engine note for the 3D car, voiced after a current-spec F1 power
// unit (1.6 L V6 turbo-hybrid): the loudest partials sit at 2x-3x the cylinder
// firing rate so the "note" screams up around 1.5 kHz at max revs, run through
// two sweeping resonant peaks and a soft-clip for the metallic edge, plus an
// induction rasp and an MGU-H / turbo whine that come up on throttle.
//
// It is near-silent off throttle and at rest — the sound builds as you
// accelerate. Everything is Web Audio; nothing is streamed. Browsers block
// audio until a gesture, so the graph is built on the first key / pointer down.

type Nodes = {
  ctx: AudioContext
  master: GainNode
  osc: OscillatorNode[]
  peak1: BiquadFilterNode
  peak2: BiquadFilterNode
  rasp: BiquadFilterNode
  raspGain: GainNode
  whine: OscillatorNode
  whineGain: GainNode
}

const IDLE_RPM = 4000
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

      // engine bus -> two sweeping resonant peaks -> soft clip -> highpass -> master
      const bus = ctx.createGain()
      bus.gain.value = 0.5

      const peak1 = ctx.createBiquadFilter()
      peak1.type = 'peaking'
      peak1.Q.value = 9
      peak1.gain.value = 13

      const peak2 = ctx.createBiquadFilter()
      peak2.type = 'peaking'
      peak2.frequency.value = 4200
      peak2.Q.value = 6
      peak2.gain.value = 9

      const shaper = ctx.createWaveShaper()
      const curve = new Float32Array(1024)
      for (let i = 0; i < curve.length; i++) {
        const x = (i / 512) - 1
        curve[i] = Math.tanh(x * 2.4)
      }
      shaper.curve = curve
      shaper.oversample = '2x'

      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 130

      bus.connect(peak1)
      peak1.connect(peak2)
      peak2.connect(shaper)
      shaper.connect(hp)
      hp.connect(master)

      const mkOsc = (type: OscillatorType, detune: number, gain: number) => {
        const o = ctx.createOscillator()
        o.type = type
        o.detune.value = detune
        const g = ctx.createGain()
        g.gain.value = gain
        o.connect(g)
        g.connect(bus)
        o.start()
        return o
      }
      // [sub, growl, mid (main), top (scream), air]
      const osc = [
        mkOsc('square', 0, 0.14),
        mkOsc('sawtooth', -6, 0.22),
        mkOsc('sawtooth', 5, 0.5),
        mkOsc('sawtooth', -9, 0.34),
        mkOsc('sawtooth', 14, 0.16),
      ]

      // induction / exhaust rasp
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const nd = noiseBuf.getChannelData(0)
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuf
      noise.loop = true
      const rasp = ctx.createBiquadFilter()
      rasp.type = 'bandpass'
      rasp.frequency.value = 1800
      rasp.Q.value = 4.5
      const raspGain = ctx.createGain()
      raspGain.gain.value = 0
      noise.connect(rasp)
      rasp.connect(raspGain)
      raspGain.connect(master)
      noise.start()

      // MGU-H / turbo whine
      const whine = ctx.createOscillator()
      whine.type = 'sine'
      whine.frequency.value = 3000
      const whineGain = ctx.createGain()
      whineGain.gain.value = 0
      whine.connect(whineGain)
      whineGain.connect(master)
      whine.start()

      nodes = { ctx, master, osc, peak1, peak2, rasp, raspGain, whine, whineGain }
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

      // revs follow the gear, but a throttle stab lifts them even before the car
      // has picked up speed (standing revs / launch / wheelspin)
      const revFrac = Math.min(1, Math.max(0.03, gear.rpm * 0.7 + input.throttle * 0.5))
      const rpm = IDLE_RPM + (MAX_RPM - IDLE_RPM) * revFrac
      const fire = rpm / 20 // V6 4-stroke: 3 firing events / rev -> rpm/60*3

      const t = ctx.currentTime
      const glide = (p: AudioParam, v: number, tau = 0.05) => p.setTargetAtTime(v, t, tau)

      glide(n.osc[0].frequency, fire * 0.5)
      glide(n.osc[1].frequency, fire)
      glide(n.osc[2].frequency, fire * 2)
      glide(n.osc[3].frequency, fire * 3)
      glide(n.osc[4].frequency, fire * 4)

      glide(n.peak1.frequency, Math.min(9000, fire * 3))
      glide(n.peak2.frequency, Math.min(11000, 3600 + revFrac * 3400))
      glide(n.rasp.frequency, Math.min(7000, fire * 2.5 + 400))
      glide(n.raspGain.gain, 0.01 + (0.06 * revFrac + 0.05 * input.throttle))
      glide(n.whine.frequency, 2600 + revFrac * 6200)
      glide(n.whineGain.gain, (0.004 + 0.026 * input.throttle) * revFrac)

      // Level: silent at rest off throttle; comes alive with load. A little
      // trailing note on the overrun when you lift at speed.
      const moving = Math.min(1, live.speedMs / 8)
      const overrun = (1 - input.throttle) * moving * 0.1
      const idleBed = 0.028 * moving
      const target = 0.32 * input.throttle + overrun + idleBed
      // fast to open, slower to fall away
      const cur = n.master.gain.value
      glide(n.master.gain, target, target > cur ? 0.03 : 0.13)
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
