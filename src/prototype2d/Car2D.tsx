import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { KMH_PER_MS } from '../lib/constants'
import { spawn2D } from '../track/silverstone'
import { F1Car } from '../car/F1Car'
import { useLapTimer } from '../hooks/useLapTimer'
import { useGameStore } from '../state/useGameStore'
import { useHudStore } from '../state/useHudStore'
import { useInputStore } from '../state/useInputStore'
import type { ArcadeCarState } from '../lib/types'
import { stepCar } from './arcadeModel'
import { sampleTrack } from './trackBounds'

// Top-down car for the 2D prototype. Scaled up so it reads on the full-circuit
// map view. Uses the pure arcade model (no physics engine).

const CAR_SCALE = 3.4

const spawnState = (): ArcadeCarState => {
  const s = spawn2D()
  return { x: s.x, z: s.z, h: s.h, v: 0 }
}

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
      group.current.position.set(car.current.x, 0.4, car.current.z)
      group.current.rotation.y = car.current.h
    }
  }, [resetNonce, lap])

  useFrame((_, rawDt) => {
    if (paused) return
    const dt = Math.min(rawDt, 1 / 30)
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
    <group ref={group} position={[0, 0.4, 0]}>
      <group scale={CAR_SCALE}>
        <F1Car primary="#d23b3b" accent="#f4d03f" />
      </group>
    </group>
  )
}
