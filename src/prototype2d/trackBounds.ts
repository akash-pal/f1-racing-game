import { TRACK } from '../lib/constants'
import type { TrackSample } from '../lib/types'

// Pure track-surface sampling for the Phase 2 ring. Off-track lowers grip, which
// the arcade model turns into a hard speed scrub — no teleport, no wall.
export function sampleTrack(x: number, z: number): TrackSample {
  const r = Math.hypot(x, z)
  const onTrack = r > TRACK.innerRadius && r < TRACK.outerRadius
  return { onTrack, grip: onTrack ? 1 : 0.35 }
}
