import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useRef, type RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { PerspectiveCamera as ThreePerspectiveCamera, Quaternion, Vector3 } from 'three'
import { dampTowards } from '../lib/math'

// Manual chase camera: follows the car's YAW ONLY (ignoring pitch/roll so
// brake-dive and kerb-hops don't swing the view), with framerate-independent
// smoothing and a speed-proportional look-ahead into corners.

interface Props {
  targetRef: RefObject<RapierRigidBody | null>
}

const OFFSET = new Vector3(0, 3.6, 8.5) // above and behind (car forward = -Z)
const MIN_Y = 1.4
const POS_RATE = 6 // camera position e-folds per second

const yawQuat = new Quaternion()
const desired = new Vector3()
const lookAt = new Vector3()
const fwd = new Vector3()
const carPos = new Vector3()

export function ChaseCamera({ targetRef }: Props) {
  const camRef = useRef<ThreePerspectiveCamera>(null)

  useFrame((_, dt) => {
    const cam = camRef.current
    const body = targetRef.current
    if (!cam || !body) return

    const t = body.translation()
    const r = body.rotation()
    carPos.set(t.x, t.y, t.z)

    const yaw = Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x))
    yawQuat.setFromAxisAngle(new Vector3(0, 1, 0), yaw)

    desired.copy(OFFSET).applyQuaternion(yawQuat).add(carPos)
    if (desired.y < carPos.y + MIN_Y) desired.y = carPos.y + MIN_Y

    cam.position.set(
      dampTowards(cam.position.x, desired.x, POS_RATE, dt),
      dampTowards(cam.position.y, desired.y, POS_RATE, dt),
      dampTowards(cam.position.z, desired.z, POS_RATE, dt),
    )

    const lv = body.linvel()
    const speed = Math.hypot(lv.x, lv.y, lv.z)
    fwd.set(0, 0, -1).applyQuaternion(yawQuat)
    lookAt.copy(carPos).addScaledVector(fwd, Math.min(speed * 0.12, 6))
    lookAt.y += 0.6
    cam.lookAt(lookAt)
  })

  return (
    <PerspectiveCamera
      ref={camRef}
      makeDefault
      fov={62}
      near={0.2}
      far={800}
      position={[0, 5, 40]}
    />
  )
}
