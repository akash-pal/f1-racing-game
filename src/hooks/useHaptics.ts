import { useEffect } from 'react'
import { useGameStore } from '../state/useGameStore'
import { useLiveStore } from '../state/useLiveStore'

// Gamepad haptics (PS5 DualSense / Xbox). A dual-rumble effect is re-issued
// every ~80 ms and sustained from game state:
//   - a faint high-frequency hum on the road that grows with speed
//   - a hard buzz on the kerbs
//   - a coarser rumble on the grass
//   - a kick on slides / wheelspin
//   - a one-shot thump on a heavy impact
// Does nothing (harmlessly) when no gamepad is connected.

const REISSUE_MS = 80
const EFFECT_MS = 110

interface RumbleInput {
  speedMs: number
  slip: number
  onKerb: boolean
  offTrack: boolean
  paused: boolean
  /** true for the ~200 ms after a heavy impact */
  impact: boolean
  /** monotonic time (ms) — drives the kerb buzz oscillation */
  now: number
}

/** Pure: game state -> { strong, weak } dual-rumble magnitudes, each 0..1. */
export function computeRumble(i: RumbleInput): { strong: number; weak: number } {
  if (i.impact) return { strong: 1, weak: 0.85 }
  if (i.paused || i.speedMs <= 1) return { strong: 0, weak: 0 }

  let strong = 0
  // road texture — subtle, speed-scaled high-frequency hum
  let weak = Math.min(0.09, (i.speedMs - 1) * 0.0032)

  if (i.onKerb) {
    const pulse = 0.55 + 0.45 * Math.sin(i.now * 0.055)
    strong += 0.5 * pulse
    weak += 0.42 * pulse
  } else if (i.offTrack) {
    strong += 0.22
    weak += 0.16
  }

  // sliding / locking / wheelspin
  strong += Math.min(0.4, Math.max(0, i.slip - 0.15) * 0.7)

  return { strong: Math.min(1, strong), weak: Math.min(1, weak) }
}

function activePad(): Gamepad | null {
  const pads = navigator.getGamepads?.() ?? []
  let fallback: Gamepad | null = null
  for (const p of pads) {
    if (!p) continue
    if (p.mapping === 'standard') return p
    fallback ??= p
  }
  return fallback
}

type RumblePad = Gamepad & {
  vibrationActuator?: {
    playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>
    reset?: () => Promise<unknown>
  }
  hapticActuators?: { pulse?: (value: number, duration: number) => Promise<unknown> }[]
}

function rumble(pad: RumblePad, strong: number, weak: number, duration: number) {
  const va = pad.vibrationActuator
  if (va?.playEffect) {
    void va
      .playEffect('dual-rumble', {
        duration,
        startDelay: 0,
        strongMagnitude: strong,
        weakMagnitude: weak,
      })
      .catch(() => {})
    return
  }
  const legacy = pad.hapticActuators?.[0]
  if (legacy?.pulse) void legacy.pulse(Math.max(strong, weak), duration).catch(() => {})
}

function stopRumble(pad: RumblePad) {
  pad.vibrationActuator?.reset?.().catch(() => {})
}

export function useHaptics(): void {
  useEffect(() => {
    let raf = 0
    let lastIssue = 0
    let prevSpeed = 0
    let impactUntil = 0
    let wasSilent = true

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - lastIssue < REISSUE_MS) return

      const pad = activePad() as RumblePad | null
      if (!pad || document.hidden) {
        prevSpeed = 0
        return
      }

      const live = useLiveStore.getState()
      const paused = useGameStore.getState().paused

      // heavy impact: a sudden loss of speed since the last issue
      const decel = (prevSpeed - live.speedMs) / (REISSUE_MS / 1000)
      if (prevSpeed > 6 && decel > 45) impactUntil = now + 220
      prevSpeed = live.speedMs

      const { strong, weak } = computeRumble({
        speedMs: live.speedMs,
        slip: live.slip,
        onKerb: live.onKerb,
        offTrack: live.offTrack,
        paused,
        impact: now < impactUntil,
        now,
      })

      if (strong < 0.02 && weak < 0.02) {
        if (!wasSilent) {
          stopRumble(pad)
          wasSilent = true
        }
      } else {
        rumble(pad, strong, weak, EFFECT_MS)
        wasSilent = false
      }
      lastIssue = now
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      const pad = activePad() as RumblePad | null
      if (pad) stopRumble(pad)
    }
  }, [])
}
