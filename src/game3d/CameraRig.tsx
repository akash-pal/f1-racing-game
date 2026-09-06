import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { PerspectiveCamera as ThreePerspectiveCamera, Quaternion, Vector3 } from 'three'
import { dampTowards } from '../lib/math'
import { spawn3D } from '../track/silverstone'
import { useGameStore } from '../state/useGameStore'

const SPAWN = spawn3D()

// One camera, four Gran Turismo-style views (cycled with C): chase, cockpit,
// hood/bonnet, and overhead. Chase follows yaw only (so the locked-flat chassis
// doesn't make the view wobble); cockpit/hood ride the full car transform.

interface Props {
  targetRef: RefObject<RapierRigidBody | null>
}

const CHASE_OFFSET = new Vector3(0, 3.4, 8.2)
const COCKPIT_OFFSET = new Vector3(0, 0.62, 0.45)
const HOOD_OFFSET = new Vector3(0, 0.34, -1.05)

const yawQ = new Quaternion()
const fullQ = new Quaternion()
const desired = new Vector3()
const look = new Vector3()
const fwd = new Vector3()
const carPos = new Vector3()

// snap instead of easing when we're way off (spawn, reset, view change, or
// resuming after the tab was hidden)
function follow(cam: ThreePerspectiveCamera, target: Vector3, rate: number, dt: number) {
  if (cam.position.distanceToSquared(target) > 900) {
    cam.position.copy(target)
    return
  }
  cam.position.set(
    dampTowards(cam.position.x, target.x, rate, dt),
    dampTowards(cam.position.y, target.y, rate, dt),
    dampTowards(cam.position.z, target.z, rate, dt),
  )
}

export function CameraRig({ targetRef }: Props) {
  const camRef = useRef<ThreePerspectiveCamera>(null)
  const yawRef = useRef(0)
  const initialised = useRef(false)

  // place the camera sensibly before the first frame loop runs
  useLayoutEffect(() => {
    const cam = camRef.current
    if (!cam) return
    const s = new Vector3(...SPAWN.position)
    const back = new Vector3(-Math.sin(SPAWN.heading), 0, -Math.cos(SPAWN.heading)).multiplyScalar(-8.2)
    cam.position.set(s.x + back.x, s.y + 3.4, s.z + back.z)
    cam.lookAt(s)
    yawRef.current = SPAWN.heading
    initialised.current = true
  }, [])

  useFrame((_, dtRaw) => {
    const cam = camRef.current
    const body = targetRef.current
    if (!cam || !body) return
    const dt = Math.min(dtRaw, 1 / 20)
    const view = useGameStore.getState().cameraView

    const t = body.translation()
    const r = body.rotation()
    carPos.set(t.x, t.y, t.z)
    fullQ.set(r.x, r.y, r.z, r.w)
    const yaw = Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x))

    if (!initialised.current) {
      yawRef.current = yaw
      initialised.current = true
    }
    // shortest-path damp of the follow yaw
    let dy = yaw - yawRef.current
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    yawRef.current += dy * (1 - Math.exp(-9 * dt))
    yawQ.setFromAxisAngle({ x: 0, y: 1, z: 0 } as never, yawRef.current)

    const lv = body.linvel()
    const speed = Math.hypot(lv.x, lv.y, lv.z)

    if (view === 'top') {
      cam.fov = 45
      desired.set(carPos.x, carPos.y + 46, carPos.z + 0.001)
      follow(cam, desired, 8, dt)
      cam.up.set(0, 0, -1)
      cam.lookAt(carPos)
      cam.updateProjectionMatrix()
      return
    }

    cam.up.set(0, 1, 0)

    if (view === 'cockpit' || view === 'hood') {
      const off = view === 'cockpit' ? COCKPIT_OFFSET : HOOD_OFFSET
      desired.copy(off).applyQuaternion(fullQ).add(carPos)
      follow(cam, desired, view === 'cockpit' ? 22 : 26, dt)
      fwd.set(0, 0, -1).applyQuaternion(fullQ)
      look.copy(cam.position).addScaledVector(fwd, 12)
      cam.lookAt(look)
      cam.fov = view === 'cockpit' ? 80 : 74
      cam.updateProjectionMatrix()
      return
    }

    // chase
    desired.copy(CHASE_OFFSET).applyQuaternion(yawQ).add(carPos)
    if (desired.y < carPos.y + 1.4) desired.y = carPos.y + 1.4
    follow(cam, desired, 6, dt)
    fwd.set(0, 0, -1).applyQuaternion(yawQ)
    look.copy(carPos).addScaledVector(fwd, Math.min(speed * 0.12, 6))
    look.y += 0.7
    cam.lookAt(look)
    cam.fov = 64
    cam.updateProjectionMatrix()

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__cam = {
        pos: [+cam.position.x.toFixed(1), +cam.position.y.toFixed(1), +cam.position.z.toFixed(1)],
        view,
        carPos: [+carPos.x.toFixed(1), +carPos.y.toFixed(1), +carPos.z.toFixed(1)],
      }
    }
  })

  return (
    <PerspectiveCamera ref={camRef} makeDefault fov={64} near={0.2} far={1400} position={[0, 5, 40]} />
  )
}
