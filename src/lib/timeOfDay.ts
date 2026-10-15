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
  /** how strongly the HDRI image-based lighting contributes at this time */
  envIntensity: number
  /** Zwartkops HDRI (Poly Haven, CC0) used for reflections at this time */
  hdri: string
}

export const TIME_OF_DAY: Record<TimeOfDay, TodConfig> = {
  morning: {
    label: 'Morning',
    sun: [-150, 70, 80],
    sunColor: '#ffe0b8',
    sunIntensity: 2.5,
    ambientColor: '#a9bce6',
    ambientIntensity: 0.248,
    hemiSky: '#e9d6bd',
    hemiGround: '#586044',
    hemiIntensity: 0.4,
    fog: '#cfd8e0',
    background: '#c3cfdd',
    stars: false,
    skyTurbidity: 5,
    skyRayleigh: 1.7,
    envIntensity: 0.55,
    hdri: `${import.meta.env.BASE_URL}env/zwartkops_morning_2k.hdr`,
  },
  noon: {
    label: 'Noon',
    sun: [120, 190, 40],
    sunColor: '#fff6e8',
    sunIntensity: 3.7,
    ambientColor: '#cfe0ff',
    ambientIntensity: 0.383,
    hemiSky: '#dcecff',
    hemiGround: '#5a6540',
    hemiIntensity: 0.52,
    fog: '#afc4e0',
    background: '#afc4e0',
    stars: false,
    skyTurbidity: 3,
    skyRayleigh: 1,
    envIntensity: 0.7,
    hdri: `${import.meta.env.BASE_URL}env/zwartkops_morning_2k.hdr`,
  },
  afternoon: {
    label: 'Afternoon',
    sun: [170, 90, -70],
    sunColor: '#ffe6c4',
    sunIntensity: 2.8,
    ambientColor: '#c1cbe0',
    ambientIntensity: 0.248,
    hemiSky: '#f0dcc0',
    hemiGround: '#55603d',
    hemiIntensity: 0.38,
    fog: '#c2c3c0',
    background: '#bcc6cf',
    stars: false,
    skyTurbidity: 6,
    skyRayleigh: 1.6,
    envIntensity: 0.6,
    hdri: `${import.meta.env.BASE_URL}env/zwartkops_afternoon_2k.hdr`,
  },
  sunset: {
    label: 'Sunset',
    sun: [200, 18, -60],
    sunColor: '#ff9050',
    sunIntensity: 2.2,
    ambientColor: '#7d6b9c',
    ambientIntensity: 0.225,
    hemiSky: '#ff9d6a',
    hemiGround: '#33262a',
    hemiIntensity: 0.34,
    fog: '#a8748a',
    background: '#8a5a72',
    stars: false,
    skyTurbidity: 10,
    skyRayleigh: 3,
    envIntensity: 0.35,
    hdri: `${import.meta.env.BASE_URL}env/zwartkops_sunset_2k.hdr`,
  },
  night: {
    label: 'Night',
    sun: [-80, 60, -120],
    sunColor: '#9fb6e0',
    sunIntensity: 0.45,
    ambientColor: '#2a3350',
    ambientIntensity: 0.108,
    hemiSky: '#20263c',
    hemiGround: '#0c0c14',
    hemiIntensity: 0.16,
    fog: '#10131f',
    background: '#0a0c15',
    stars: true,
    skyTurbidity: 0.2,
    skyRayleigh: 0.4,
    envIntensity: 0.12,
    hdri: `${import.meta.env.BASE_URL}env/zwartkops_sunset_2k.hdr`,
  },
}

/** Safe lookup — tolerates a stale value persisted from an older preset list. */
export function todConfig(t: string): TodConfig {
  return (TIME_OF_DAY as Record<string, TodConfig>)[t] ?? TIME_OF_DAY.noon
}
