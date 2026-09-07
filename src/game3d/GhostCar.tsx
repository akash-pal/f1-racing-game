import { useFrame } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import type { Group } from 'three'
import { F1Car } from '../car/F1Car'
import { F1CarModel } from '../car/F1CarModel'
import { ghostHasData, ghostSampleAt } from '../car/ghost'
import { raceGo } from '../hooks/useRaceControl'
import { useGameStore } from '../state/useGameStore'
import { useLiveStore } from '../state/useLiveStore'

// Translucent replay of the best lap, played in sync with the player's current
// lap time. Toggle with G.

export function GhostCar() {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const { assists } = useGameStore.getState()
    if (!assists.ghost || !raceGo() || !ghostHasData()) {
      g.visible = false
      return
    }
    const pose = ghostSampleAt(useLiveStore.getState().lapMs)
    if (!pose) {
      g.visible = false
      return
    }
    g.visible = true
    g.position.copy(pose.position)
    g.quaternion.copy(pose.quaternion)
  })

  return (
    <group ref={groupRef} visible={false}>
      <Suspense fallback={<F1Car primary="#8fd8ff" accent="#ffffff" dark="#3a63c0" opacity={0.32} />}>
        <F1CarModel opacity={0.3} />
      </Suspense>
    </group>
  )
}
