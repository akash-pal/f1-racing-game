import { useControls, folder } from 'leva'
import { DEFAULT_TUNING } from '../lib/constants'
import type { VehicleTuning } from '../lib/types'

// Live-tunable vehicle parameters. Kept in its own module so editing tuning does
// not force <Vehicle> to remount. Returns a plain VehicleTuning object each render.

export function useVehicleTuning(): VehicleTuning {
  const t = useControls('Vehicle', {
    drivetrain: folder({
      engineForce: { value: DEFAULT_TUNING.engineForce, min: 1000, max: 12000, step: 100 },
      brakeForce: { value: DEFAULT_TUNING.brakeForce, min: 500, max: 8000, step: 100 },
      handbrakeForce: { value: DEFAULT_TUNING.handbrakeForce, min: 1000, max: 12000, step: 100 },
    }),
    steering: folder({
      maxSteer: { value: DEFAULT_TUNING.maxSteer, min: 0.2, max: 0.9, step: 0.01 },
      steerRate: { value: DEFAULT_TUNING.steerRate, min: 1, max: 8, step: 0.1 },
    }),
    suspension: folder({
      suspensionRestLength: {
        value: DEFAULT_TUNING.suspensionRestLength,
        min: 0.1,
        max: 0.6,
        step: 0.01,
      },
      suspensionStiffness: {
        value: DEFAULT_TUNING.suspensionStiffness,
        min: 10,
        max: 60,
        step: 1,
      },
      suspensionCompression: {
        value: DEFAULT_TUNING.suspensionCompression,
        min: 0.1,
        max: 1.5,
        step: 0.01,
      },
      suspensionRelaxation: {
        value: DEFAULT_TUNING.suspensionRelaxation,
        min: 0.1,
        max: 1.5,
        step: 0.01,
      },
      suspensionTravel: {
        value: DEFAULT_TUNING.suspensionTravel,
        min: 0.05,
        max: 0.4,
        step: 0.01,
      },
    }),
    grip: folder({
      frictionSlip: { value: DEFAULT_TUNING.frictionSlip, min: 0.5, max: 4, step: 0.05 },
    }),
  })

  return {
    chassisMass: DEFAULT_TUNING.chassisMass,
    wheelRadius: DEFAULT_TUNING.wheelRadius,
    ...t,
  }
}
