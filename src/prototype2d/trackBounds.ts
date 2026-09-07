import { getCircuit } from '../track/circuit'
import type { TrackSample } from '../lib/types'

// Track-surface sampling for the 2D prototype — delegates to the shared
// Buddh circuit model. Off-track lowers grip, which the arcade model turns into a
// hard speed scrub (no teleport, no wall).
export function sampleTrack(x: number, z: number): TrackSample {
  const s = getCircuit().sample(x, z)
  return { onTrack: s.onTrack, grip: s.grip }
}
