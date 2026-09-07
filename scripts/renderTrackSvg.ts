// Dev-only: dump the circuit centre-line + edges to an SVG for eyeballing.
// Run: node --experimental-strip-types scripts/renderTrackSvg.ts
import { writeFileSync } from 'node:fs'
import { getCircuit } from '../src/track/circuit.ts'

const t = getCircuit()
const all = [...t.samples, ...t.leftEdge, ...t.rightEdge]
const minX = Math.min(...all.map((p) => p.x))
const maxX = Math.max(...all.map((p) => p.x))
const minZ = Math.min(...all.map((p) => p.z))
const maxZ = Math.max(...all.map((p) => p.z))
const pad = 30
const W = maxX - minX + pad * 2
const H = maxZ - minZ + pad * 2
const tx = (p: { x: number }) => p.x - minX + pad
const tz = (p: { z: number }) => p.z - minZ + pad

const path = (pts: { x: number; z: number }[], close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${tx(p).toFixed(1)} ${tz(p).toFixed(1)}`).join(' ') +
  (close ? ' Z' : '')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#1a2416"/>
<path d="${path(t.leftEdge)}" fill="none" stroke="#888" stroke-width="1"/>
<path d="${path(t.rightEdge)}" fill="none" stroke="#888" stroke-width="1"/>
<path d="${path([...t.leftEdge, ...[...t.rightEdge].reverse()])}" fill="#3b3f45" stroke="none" opacity="0.9"/>
<path d="${path(t.samples)}" fill="none" stroke="#e0c060" stroke-width="1.4" stroke-dasharray="6 6"/>
<circle cx="${tx(t.start.position).toFixed(1)}" cy="${tz(t.start.position).toFixed(1)}" r="6" fill="#e8e8e8"/>
<text x="10" y="20" fill="#fff" font-family="sans-serif" font-size="14">Buddh Int'l Circuit — ${(t.length / 1000).toFixed(2)} km/lap, width ${(t.halfWidth * 2).toFixed(0)}u</text>
</svg>`

const outPath = process.argv[2] ?? '/tmp/track.svg'
writeFileSync(outPath, svg)
console.log('wrote', outPath, `${W.toFixed(0)}x${H.toFixed(0)}`)
