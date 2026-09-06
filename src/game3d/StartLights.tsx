import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, MeshStandardMaterial } from 'three'
import { getSilverstone } from '../track/silverstone'
import { useGameStore } from '../state/useGameStore'
import { countdownInfo, raceGo } from '../hooks/useRaceControl'

// F1-style 5-light start gantry over the start/finish line. Reads the countdown
// clock from the game store; hides itself a moment after GO.

export function StartLights() {
  const start = getSilverstone().start
  const bulbs = useRef<(MeshStandardMaterial | null)[]>([])
  const groupRef = useRef<Group>(null)

  const { pos, yaw } = useMemo(() => {
    return {
      pos: [start.position.x, 0, start.position.z] as [number, number, number],
      yaw: Math.atan2(start.forward.x, start.forward.z),
    }
  }, [start])

  useFrame(() => {
    const g = useGameStore.getState()
    const grp = groupRef.current
    if (!grp) return

    if (raceGo() || g.mode !== '3d') {
      const info = countdownInfo(performance.now(), g.countdownStartedAt)
      // keep visible & green for ~1s after GO, then hide
      const showGreen = info.sinceGoMs < 1100
      grp.visible = showGreen
      bulbs.current.forEach((m) => {
        if (!m) return
        m.color.set(showGreen ? '#28d152' : '#101010')
        m.emissive.set(showGreen ? '#1c9c3c' : '#000000')
        m.emissiveIntensity = showGreen ? 1.4 : 0
      })
      return
    }

    grp.visible = true
    const info = countdownInfo(performance.now(), g.countdownStartedAt)
    bulbs.current.forEach((m, i) => {
      if (!m) return
      const on = i < info.litCount
      m.color.set(on ? '#e02020' : '#101010')
      m.emissive.set(on ? '#c01010' : '#000000')
      m.emissiveIntensity = on ? 1.6 : 0
    })
  })

  return (
    <group ref={groupRef} position={pos} rotation={[0, yaw, 0]}>
      {/* posts */}
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 3, 0]} castShadow>
          <boxGeometry args={[0.4, 6, 0.4]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* cross beam */}
      <mesh position={[0, 6, 0]} castShadow>
        <boxGeometry args={[19, 0.7, 0.7]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* 5 light housings */}
      {[-4, -2, 0, 2, 4].map((x, i) => (
        <group key={x} position={[x, 5.5, 0.4]}>
          <mesh castShadow>
            <boxGeometry args={[1.3, 1.3, 0.5]} />
            <meshStandardMaterial color="#0e0e0e" />
          </mesh>
          <mesh position={[0, 0, 0.32]}>
            <circleGeometry args={[0.42, 20]} />
            <meshStandardMaterial
              ref={(m) => {
                bulbs.current[i] = m
              }}
              color="#101010"
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
