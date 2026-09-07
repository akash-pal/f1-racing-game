import { Environment, Sky, Stars } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { DirectionalLight } from 'three'
import { useGameStore } from '../state/useGameStore'
import { todConfig } from '../lib/timeOfDay'

// Sky, stars and all scene lighting, driven by the time-of-day setting (cycled
// with T). The key light tracks the car so shadows land near the action on a
// circuit far larger than one shadow frustum.

interface Props {
  targetRef: React.RefObject<{ translation: () => { x: number; y: number; z: number } } | null>
}

export function SkyDome({ targetRef }: Props) {
  const tod = useGameStore((s) => s.timeOfDay)
  const cfg = todConfig(tod)
  const lightRef = useRef<DirectionalLight>(null)

  useFrame(() => {
    const l = lightRef.current
    const body = targetRef.current
    if (!l) return
    const c = body?.translation?.()
    const cx = c?.x ?? 0
    const cz = c?.z ?? 0
    l.position.set(cx + cfg.sun[0] * 0.5, cfg.sun[1], cz + cfg.sun[2] * 0.5)
    l.target.position.set(cx, 0, cz)
    l.target.updateMatrixWorld()
  })

  return (
    <>
      <color attach="background" args={[cfg.background]} />
      <fog attach="fog" args={[cfg.fog, 220, 1100]} />

      <Sky
        distance={4000}
        sunPosition={cfg.sun}
        turbidity={cfg.skyTurbidity}
        rayleigh={cfg.skyRayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      {cfg.stars && (
        <Stars radius={800} depth={120} count={2600} factor={6} saturation={0} fade speed={0.5} />
      )}

      {/* real image-based lighting: Zwartkops racetrack HDRI (Poly Haven, CC0),
          2K, used for reflections/ambient only — the visible sky stays <Sky> */}
      <Suspense fallback={null}>
        <Environment
          files="/env/zwartkops_2k.hdr"
          environmentIntensity={cfg.envIntensity}
        />
      </Suspense>

      <hemisphereLight args={[cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity]} />
      <ambientLight color={cfg.ambientColor} intensity={cfg.ambientIntensity} />
      <directionalLight
        ref={lightRef}
        color={cfg.sunColor}
        intensity={cfg.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
    </>
  )
}
