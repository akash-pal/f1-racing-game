import { useMemo } from 'react'
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'

// Low-poly F1 2026-concept car body, modelled after the reference USDZ:
// long pointed nose, low multi-element front wing, raised tub, halo + airbox
// scoop, undercut sidepods, shark-fin engine cover, high rear wing.
//
// Local space: forward = -Z (nose), up = +Y. Origin at roughly the centre of
// mass / floor. Wheels are added separately by <Vehicle>.

interface Props {
  primary?: string
  accent?: string
  dark?: string
}

export function F1Car({ primary = '#1b3a7a', accent = '#33d1e0', dark = '#0f1622' }: Props) {
  // halo hoop: a tube arcing over the cockpit
  const haloGeo = useMemo(() => {
    const pts = [
      new Vector3(-0.34, 0.16, -0.35),
      new Vector3(-0.4, 0.5, 0.05),
      new Vector3(0, 0.62, 0.05),
      new Vector3(0.4, 0.5, 0.05),
      new Vector3(0.34, 0.16, -0.35),
    ]
    return new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.032, 6, false)
  }, [])

  return (
    <group>
      {/* ---------- floor / plank ---------- */}
      <mesh position={[0, -0.33, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.06, 4.4]} />
        <meshStandardMaterial color={dark} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* floor side edges */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.82, -0.3, 0.2]} castShadow>
          <boxGeometry args={[0.12, 0.14, 3.4]} />
          <meshStandardMaterial color={dark} roughness={0.8} />
        </mesh>
      ))}

      {/* ---------- monocoque / tub ---------- */}
      <mesh position={[0, -0.05, 0.35]} castShadow>
        <boxGeometry args={[0.82, 0.5, 2.5]} />
        <meshStandardMaterial color={primary} roughness={0.45} metalness={0.25} />
      </mesh>
      {/* tapered top deck of the tub toward the nose */}
      <mesh position={[0, 0.02, -0.7]} castShadow>
        <boxGeometry args={[0.6, 0.34, 1.2]} />
        <meshStandardMaterial color={primary} roughness={0.45} metalness={0.25} />
      </mesh>

      {/* ---------- nose cone ---------- */}
      <mesh position={[0, -0.12, -1.75]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.2, 1.9, 14]} />
        <meshStandardMaterial color={primary} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.12, -2.55]} castShadow>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color={accent} roughness={0.4} />
      </mesh>

      {/* ---------- front wing ---------- */}
      <mesh position={[0, -0.28, -2.35]} castShadow>
        <boxGeometry args={[1.9, 0.05, 0.62]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.16, -2.42]} rotation={[-0.32, 0, 0]} castShadow>
        <boxGeometry args={[1.86, 0.04, 0.4]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {/* front wing endplates */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.94, -0.16, -2.34]} rotation={[0, 0, s * 0.12]} castShadow>
          <boxGeometry args={[0.05, 0.34, 0.7]} />
          <meshStandardMaterial color={primary} roughness={0.5} />
        </mesh>
      ))}
      {/* nose-to-wing pylons */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, -0.24, -2.15]} castShadow>
          <boxGeometry args={[0.05, 0.16, 0.5]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}

      {/* ---------- cockpit surround + headrest ---------- */}
      <mesh position={[0, 0.16, 0.55]} castShadow>
        <boxGeometry args={[0.66, 0.26, 1.0]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 1.02]} castShadow>
        <boxGeometry args={[0.6, 0.34, 0.34]} />
        <meshStandardMaterial color={primary} roughness={0.5} />
      </mesh>
      {/* halo */}
      <mesh geometry={haloGeo} castShadow>
        <meshStandardMaterial color="#15181d" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, -0.32]} castShadow>
        <boxGeometry args={[0.06, 0.28, 0.06]} />
        <meshStandardMaterial color="#15181d" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* ---------- airbox scoop ---------- */}
      <mesh position={[0, 0.4, 1.28]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.34, 0.34, 0.5]} />
        <meshStandardMaterial color={primary} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.44, 1.12]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.04, 8, 16]} />
        <meshStandardMaterial color={dark} />
      </mesh>

      {/* ---------- engine cover + shark fin ---------- */}
      <mesh position={[0, 0.16, 1.95]} castShadow>
        <boxGeometry args={[0.5, 0.44, 1.7]} />
        <meshStandardMaterial color={primary} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.42, 2.15]} castShadow>
        <boxGeometry args={[0.03, 0.4, 1.4]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>

      {/* ---------- sidepods (undercut) ---------- */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.62, -0.04, 0.95]} castShadow>
            <boxGeometry args={[0.5, 0.36, 1.7]} />
            <meshStandardMaterial color={primary} roughness={0.45} metalness={0.25} />
          </mesh>
          {/* inlet */}
          <mesh position={[s * 0.62, -0.02, 0.05]} castShadow>
            <boxGeometry args={[0.42, 0.3, 0.16]} />
            <meshStandardMaterial color={dark} />
          </mesh>
          {/* accent flash */}
          <mesh position={[s * 0.88, -0.02, 0.9]}>
            <boxGeometry args={[0.02, 0.22, 1.5]} />
            <meshStandardMaterial color={accent} />
          </mesh>
        </group>
      ))}

      {/* ---------- rear wing ---------- */}
      <mesh position={[0, 0.5, 2.55]} castShadow>
        <boxGeometry args={[1.0, 0.05, 0.5]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 2.62]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[1.0, 0.04, 0.34]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, 0.5, 2.56]} castShadow>
          <boxGeometry args={[0.04, 0.42, 0.6]} />
          <meshStandardMaterial color={primary} roughness={0.5} />
        </mesh>
      ))}
      {/* swan-neck mount */}
      <mesh position={[0, 0.34, 2.5]} castShadow>
        <boxGeometry args={[0.06, 0.32, 0.16]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* diffuser */}
      <mesh position={[0, -0.24, 2.42]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[1.3, 0.28, 0.4]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
    </group>
  )
}
