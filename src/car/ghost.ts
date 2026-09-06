import { Quaternion, Vector3 } from 'three'

// Best-lap ghost recorder/player. Frame-rate independent: frames are keyed by
// milliseconds-into-lap, and playback interpolates. The best lap persists to
// localStorage so the ghost survives reloads (a Gran Turismo staple).

export interface GhostFrame {
  t: number // ms into the lap
  px: number
  py: number
  pz: number
  qx: number
  qy: number
  qz: number
  qw: number
}

const STORAGE_KEY = 'ghost:silverstone:v1'
const MIN_FRAME_GAP = 40 // ms

let recording: GhostFrame[] = []
let best: { frames: GhostFrame[]; lapMs: number } | null = null

try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as { frames: GhostFrame[]; lapMs: number }
    if (parsed?.frames?.length) best = parsed
  }
} catch {
  /* private mode / disabled storage */
}

export function ghostStartRecording(): void {
  recording = []
}

export function ghostRecordFrame(
  t: number,
  pos: { x: number; y: number; z: number },
  quat: { x: number; y: number; z: number; w: number },
): void {
  const last = recording[recording.length - 1]
  if (last && t - last.t < MIN_FRAME_GAP) return
  recording.push({
    t,
    px: pos.x,
    py: pos.y,
    pz: pos.z,
    qx: quat.x,
    qy: quat.y,
    qz: quat.z,
    qw: quat.w,
  })
}

/** Call on lap completion; keeps the recording only if it is a new best. */
export function ghostCommitLap(lapMs: number): boolean {
  const isBest = recording.length > 4 && (best === null || lapMs < best.lapMs)
  if (isBest) {
    best = { frames: recording, lapMs }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(best))
    } catch {
      /* ignore */
    }
  }
  recording = []
  return isBest
}

export function ghostBestLapMs(): number | null {
  return best?.lapMs ?? null
}

export function ghostHasData(): boolean {
  return !!best && best.frames.length > 1
}

const _a = new Quaternion()
const _b = new Quaternion()
const _p = new Vector3()

/** Interpolated ghost pose at `t` ms into the lap, or null if no data / past the end. */
export function ghostSampleAt(
  t: number,
): { position: Vector3; quaternion: Quaternion } | null {
  const f = best?.frames
  if (!f || f.length < 2) return null
  if (t <= f[0].t) return frameToPose(f[0])
  if (t >= f[f.length - 1].t) return null // ghost finished its lap

  // binary search for the segment
  let lo = 0
  let hi = f.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (f[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = f[lo]
  const b = f[hi]
  const k = (t - a.t) / (b.t - a.t || 1)
  _p.set(a.px + (b.px - a.px) * k, a.py + (b.py - a.py) * k, a.pz + (b.pz - a.pz) * k)
  _a.set(a.qx, a.qy, a.qz, a.qw)
  _b.set(b.qx, b.qy, b.qz, b.qw)
  _a.slerp(_b, k)
  return { position: _p.clone(), quaternion: _a.clone() }
}

export function ghostClear(): void {
  best = null
  recording = []
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function frameToPose(fr: GhostFrame) {
  return {
    position: new Vector3(fr.px, fr.py, fr.pz),
    quaternion: new Quaternion(fr.qx, fr.qy, fr.qz, fr.qw),
  }
}
