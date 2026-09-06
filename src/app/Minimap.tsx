import { useEffect, useRef } from 'react'
import { ghostHasData, ghostSampleAt } from '../car/ghost'
import { getSilverstone } from '../track/silverstone'
import { useGameStore } from '../state/useGameStore'
import { useLiveStore } from '../state/useLiveStore'

// Track-map inset with a live car blip (and the ghost's), drawn on a <canvas>
// from its own rAF loop so it never re-renders React.

const SIZE = 168
const PAD = 12

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    ctx.scale(dpr, dpr)

    const track = getSilverstone()
    const b = track.bounds
    const span = Math.max(b.width, b.depth)
    const toXY = (x: number, z: number): [number, number] => [
      PAD + ((x - b.centerX) / span + 0.5) * (SIZE - 2 * PAD),
      PAD + ((z - b.centerZ) / span + 0.5) * (SIZE - 2 * PAD),
    ]
    const pts = track.samples.filter((_, i) => i % 4 === 0).map((p) => toXY(p.x, p.z))
    const [sx, sy] = toXY(track.start.position.x, track.start.position.z)

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, SIZE, SIZE)

      // track ribbon
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 7
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // start/finish tick
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(sx - 2, sy - 2, 4, 4)

      // ghost blip
      const g = useGameStore.getState()
      if (g.assists.ghost && ghostHasData()) {
        const gp = ghostSampleAt(useLiveStore.getState().lapMs)
        if (gp) {
          const [gx, gy] = toXY(gp.position.x, gp.position.z)
          ctx.fillStyle = '#8fd8ff'
          ctx.beginPath()
          ctx.arc(gx, gy, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // car blip
      const live = useLiveStore.getState()
      const [cx, cy] = toXY(live.x, live.z)
      ctx.fillStyle = '#ff4136'
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className="minimap" style={{ width: SIZE, height: SIZE }} />
}
