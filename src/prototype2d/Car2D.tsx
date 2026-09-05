import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { KMH_PER_MS, SPAWN_2D } from '../lib/constants'
import { useLapTimer } from '../hooks/useLapTimer'
import { useGameStore } from '../state/useGameStore'
import { useHudStore } from '../state/useHudStore'
import { useInputStore } from '../state/useInputStore'
import type { ArcadeCarState } from '../lib/types'
import { stepCar } from './arcadeModel'
import { sampleTrack } from './trackBounds'

const spawnState = (): ArcadeCarState => ({ x: SPAWN_2D.x, z: SPAWN_2D.z, h: SPAWN_2D.h, v: 0 })

export function Car2D() {
  const group = useRef<Group>(null)
  const car = useRef<ArcadeCarState>(spawnState())
  const hudAccum = useRef(0)
  const lap = useLapTimer()
  const resetNonce = useGameStore((s) => s.resetNonce)
  const paused = useGameStore((s) => s.paused)

  useEffect(() => {
    car.current = spawnState()
    hudAccum.current = 0
    lap.reset(performance.now())
    if (group.current) {
      group.current.position.set(SPAWN_2D.x, 0.35, SPAWN_2D.z)
      group.current.rotation.y = SPAWN_2D.h
    }
  }, [resetNonce, lap])

  useFrame((_, rawDt) => {
    if (paused) return
    const dt = Math.min(rawDt, 1 / 30) // clamp huge frames (tab refocus)
    const input = useInputStore.getState()
    const { onTrack, grip } = sampleTrack(car.current.x, car.current.z)
    car.current = stepCar(car.current, input, grip, dt)

    const g = group.current
    if (g) {
      g.position.x = car.current.x
      g.position.z = car.current.z
      g.rotation.y = car.current.h
    }

    lap.update(car.current.x, car.current.z, performance.now())

    hudAccum.current += dt
    if (hudAccum.current >= 0.1) {
      hudAccum.current = 0
      useHudStore.getState().set({
        speedKph: car.current.v * KMH_PER_MS,
        offTrack: !onTrack,
      })
    }
  })

  return (
    <group ref={group} position={[SPAWN_2D.x, 0.35, SPAWN_2D.z]}>
      {/* body */}
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.5, 3.2]} />
        <meshStandardMaterial color="#d23b3b" />
      </mesh>
      {/* nose marker (points -Z = forward) */}
      <mesh position={[0, 0.05, -1.5]}>
        <boxGeometry args={[1.2, 0.55, 0.5]} />
        <meshStandardMaterial color="#f4d03f" />
      </mesh>
      {/* cockpit */}
      <mesh position={[0, 0.35, 0.3]}>
        <boxGeometry args={[1.0, 0.4, 1.1]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
    </group>
  )
}
