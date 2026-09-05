import { TRACK, TRACK_CENTER_RADIUS } from '../lib/constants'

// Flat painted ring track + infield/outfield grass + start/finish stripe.
// Purely visual — boundaries live in trackBounds.ts.
//
// Every piece is a flat geometry (built in local XY) rotated -90deg about X so
// its front face points up (+Y) toward the top-down camera. After that rotation
// local +Y maps to world -Z, so world positions are given directly on each mesh.

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0]

export function Track2D() {
  return (
    <group>
      {/* grass / out of bounds */}
      <mesh rotation={FLAT} position={[0, -0.03, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#26361f" />
      </mesh>

      {/* tarmac ring */}
      <mesh rotation={FLAT} position={[0, -0.01, 0]}>
        <ringGeometry args={[TRACK.innerRadius, TRACK.outerRadius, 96]} />
        <meshBasicMaterial color="#3b3f45" />
      </mesh>

      {/* inner & outer edge lines */}
      <mesh rotation={FLAT} position={[0, 0, 0]}>
        <ringGeometry args={[TRACK.innerRadius - 0.25, TRACK.innerRadius, 96]} />
        <meshBasicMaterial color="#dcdcdc" />
      </mesh>
      <mesh rotation={FLAT} position={[0, 0, 0]}>
        <ringGeometry args={[TRACK.outerRadius, TRACK.outerRadius + 0.25, 96]} />
        <meshBasicMaterial color="#dcdcdc" />
      </mesh>

      {/* infield fill (covers the ring's centre hole) */}
      <mesh rotation={FLAT} position={[0, -0.02, 0]}>
        <circleGeometry args={[TRACK.innerRadius - 0.25, 96]} />
        <meshBasicMaterial color="#26361f" />
      </mesh>

      {/* start/finish stripe where the car spawns (world +Z) */}
      <mesh rotation={FLAT} position={[0, 0.01, TRACK_CENTER_RADIUS]}>
        <planeGeometry args={[TRACK.outerRadius - TRACK.innerRadius, TRACK.stripeHalfWidth * 2]} />
        <meshBasicMaterial color="#eaeaea" />
      </mesh>
    </group>
  )
}
