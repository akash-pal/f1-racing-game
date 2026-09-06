// Time-of-day presets: everything a scene needs to relight itself.

export type TimeOfDay = 'dawn' | 'noon' | 'dusk' | 'night'

export const TIME_ORDER: TimeOfDay[] = ['dawn', 'noon', 'dusk', 'night']

export interface TodConfig {
  label: string
  /** Sun direction (normalised-ish), also used to place the key light. */
  sun: [number, number, number]
  sunColor: string
  sunIntensity: number
  ambientColor: string
  ambientIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  fog: string
  background: string
  stars: boolean
  /** drei <Sky> tuning */
  skyTurbidity: number
  skyRayleigh: number
}

export const TIME_OF_DAY: Record<TimeOfDay, TodConfig> = {
  dawn: {
    label: 'Dawn',
    sun: [-120, 34, 90],
    sunColor: '#ffd0a0',
    sunIntensity: 2.1,
    ambientColor: '#8a9bd0',
    ambientIntensity: 0.5,
    hemiSky: '#f0c9a8',
    hemiGround: '#4a4535',
    hemiIntensity: 0.95,
    fog: '#d9c3b0',
    background: '#c9b3a6',
    stars: false,
    skyTurbidity: 8,
    skyRayleigh: 2.4,
  },
  noon: {
    label: 'Midday',
    sun: [120, 180, 60],
    sunColor: '#fff6e8',
    sunIntensity: 3.1,
    ambientColor: '#cfe0ff',
    ambientIntensity: 0.65,
    hemiSky: '#dcecff',
    hemiGround: '#5a6540',
    hemiIntensity: 1.1,
    fog: '#afc4e0',
    background: '#afc4e0',
    stars: false,
    skyTurbidity: 3,
    skyRayleigh: 1,
  },
  dusk: {
    label: 'Sunset',
    sun: [140, 24, -40],
    sunColor: '#ff9868',
    sunIntensity: 2.3,
    ambientColor: '#7d6b9c',
    ambientIntensity: 0.5,
    hemiSky: '#ff9d6a',
    hemiGround: '#33262a',
    hemiIntensity: 0.85,
    fog: '#a8748a',
    background: '#8a5a72',
    stars: false,
    skyTurbidity: 10,
    skyRayleigh: 3,
  },
  night: {
    label: 'Night',
    sun: [-80, 60, -120],
    sunColor: '#9fb6e0',
    sunIntensity: 0.45,
    ambientColor: '#2a3350',
    ambientIntensity: 0.22,
    hemiSky: '#20263c',
    hemiGround: '#0c0c14',
    hemiIntensity: 0.35,
    fog: '#10131f',
    background: '#0a0c15',
    stars: true,
    skyTurbidity: 0.2,
    skyRayleigh: 0.4,
  },
}
