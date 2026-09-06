// Fake gearbox derived from speed — enough for a GT-style gear + rev readout
// without simulating a drivetrain.

const SHIFT_KMH = [0, 42, 82, 125, 170, 220, 290] // top of each gear

export interface GearReadout {
  gear: number // 0 = neutral/standstill, -1 = reverse
  label: string // 'N' | 'R' | '1'..'6'
  rpm: number // 0..1 within the current gear
}

export function pseudoGear(speedKmh: number, reversing: boolean): GearReadout {
  if (reversing && speedKmh > 1) return { gear: -1, label: 'R', rpm: Math.min(1, speedKmh / 40) }
  if (speedKmh < 1.5) return { gear: 0, label: 'N', rpm: 0.12 }
  let g = 1
  for (let i = 1; i < SHIFT_KMH.length; i++) {
    if (speedKmh >= SHIFT_KMH[i - 1]) g = i
  }
  g = Math.min(g, 6)
  const lo = SHIFT_KMH[g - 1]
  const hi = SHIFT_KMH[g] ?? lo + 60
  const rpm = Math.max(0.15, Math.min(1, (speedKmh - lo) / (hi - lo)))
  return { gear: g, label: String(g), rpm }
}
