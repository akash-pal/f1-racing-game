import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { Color, Vector3 } from 'three'
import { getCircuit } from './circuit'

// GT-style guide line down the middle of the track, coloured by how hard the
// next bit of track is: green = flat out, amber = lift/turn-in, red = brake.
// Toggled by the "racing line" assist (key L).

export function RacingLine() {
  const { points, colors } = useMemo(() => {
    const t = getCircuit()
    const n = t.samples.length
    const pts: Vector3[] = []
    const cols: [number, number, number][] = []
    const green = new Color('#26d367')
    const amber = new Color('#f2c53d')
    const red = new Color('#e8402e')
    const tmp = new Color()

    for (let i = 0; i < n; i++) {
      pts.push(new Vector3(t.samples[i].x, 0.12, t.samples[i].z))
      // curvature: angle between tangents a few samples apart
      const a = t.tangents[i]
      const b = t.tangents[(i + 8) % n]
      const dot = Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z))
      const curv = Math.acos(dot) // 0 straight .. ~0.5+ tight
      let c: Color
      if (curv < 0.08) c = green
      else if (curv < 0.22) c = tmp.copy(green).lerp(amber, (curv - 0.08) / 0.14)
      else c = tmp.copy(amber).lerp(red, Math.min(1, (curv - 0.22) / 0.25))
      cols.push([c.r, c.g, c.b])
    }
    return { points: pts, colors: cols }
  }, [])

  return <Line points={points} vertexColors={colors} lineWidth={4} transparent opacity={0.9} />
}
