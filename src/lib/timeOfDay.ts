// Time-of-day presets: everything a scene needs to relight itself.

export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night'

export const TIME_ORDER: TimeOfDay[] = ['morning', 'noon', 'afternoon', 'sunset', 'night']

export interface TodConfig {
  label: string
  /** Sun direction, also used to place the key light. */
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
  skyTurbidity: number
  skyRayleigh: number
}

export const TIME_OF_DAY: Record<TimeOfDay, TodConfig> = {
  morning: {
    label: 'Morning',
    sun: [-150, 70, 80],
    sunColor: '#ffe0b8',
    sunIntensity: 2.5,
    ambientColor: '#a9bce6',
    ambientIntensity: 0.55,
    hemiSky: '#e9d6bd',
    hemiGround: '#586044',
    hemiIntensity: 1.0,
    fog: '#cfd8e0',
    background: '#c3cfdd',
    stars: false,
    skyTurbidity: 5,
    skyRayleigh: 1.7,
  },
  noon: {
    label: 'Noon',
    sun: [120, 190, 40],
    sunColor: '#fff6e8',
    sunIntensity: 3.7,
    ambientColor: '#cfe0ff',
    ambientIntensity: 0.85,
    hemiSky: '#dcecff',
    hemiGround: '#5a6540',
    hemiIntensity: 1.3,
    fog: '#afc4e0',
    background: '#afc4e0',
    stars: false,
    skyTurbidity: 3,
    skyRayleigh: 1,
  },
  afternoon: {
    label: 'Afternoon',
    sun: [170, 90, -70],
    sunColor: '#ffe6c4',
    sunIntensity: 2.8,
    ambientColor: '#c1cbe0',
    ambientIntensity: 0.55,
    hemiSky: '#f0dcc0',
    hemiGround: '#55603d',
    hemiIntensity: 0.95,
    fog: '#c2c3c0',
    background: '#bcc6cf',
    stars: false,
    skyTurbidity: 6,
    skyRayleigh: 1.6,
  },
  sunset: {
    label: 'Sunset',
    sun: [200, 18, -60],
    sunColor: '#ff9050',
    sunIntensity: 2.2,
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
    ambientIntensity: 0.24,
    hemiSky: '#20263c',
    hemiGround: '#0c0c14',
    hemiIntensity: 0.4,
    fog: '#10131f',
    background: '#0a0c15',
    stars: true,
    skyTurbidity: 0.2,
    skyRayleigh: 0.4,
  },
}

/** Safe lookup — tolerates a stale value persisted from an older preset list. */
export function todConfig(t: string): TodConfig {
  return (TIME_OF_DAY as Record<string, TodConfig>)[t] ?? TIME_OF_DAY.noon
}
