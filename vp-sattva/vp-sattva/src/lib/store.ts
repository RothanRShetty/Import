import * as THREE from 'three'

export const C = {
  navy: '#071B33',
  royal: '#123B64',
  gold: '#C9A45C',
  white: '#FFFFFF',
  grey: '#F4F6F8',
}

/** Shared, mutable animation state. Read inside useFrame — never stored in React state. */
export const S = {
  p: 0, // smoothed story progress 0..1
  target: 0, // raw scroll progress
  t: 0, // elapsed seconds
  mobile: false,
  low: false,
  reduced: false,
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a))
export const sm = (t: number) => t * t * (3 - 2 * t)
export const sms = (p: number, a: number, b: number) => sm(seg(p, a, b))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt))

/** Piecewise smooth track: pts = [[u, value], ...] sorted by u. */
export function track(u: number, pts: [number, number][]) {
  if (u <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (u <= pts[i][0]) {
      const [u0, v0] = pts[i - 1]
      const [u1, v1] = pts[i]
      return lerp(v0, v1, sm((u - u0) / (u1 - u0)))
    }
  }
  return pts[pts.length - 1][1]
}

export function angDelta(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/** Story boundaries (progress values where one area hands over to the next, hidden by the veil). */
export const B = {
  hero: 0.125,
  map: 0.255,
  wh: 0.53,
  port: 0.69,
  globe: 0.81,
  del: 0.925,
}
export const BOUNDS = [B.hero, B.map, B.wh, B.port, B.globe, B.del]

export const RANGE = {
  hero: [0, B.hero],
  map: [B.hero, B.map],
  wh: [B.map, B.wh],
  port: [B.wh, B.port],
  globe: [B.port, B.globe],
  del: [B.globe, B.del],
  brand: [B.del, 1],
} as const
export type AreaKey = keyof typeof RANGE

export const AREA_X: Record<AreaKey, number> = {
  hero: 0,
  map: 1000,
  wh: 2000,
  port: 3000,
  globe: 4000,
  del: 5000,
  brand: 6000,
}

export const VEIL_HALF = 0.012
export const inArea = (p: number, k: AreaKey, margin = VEIL_HALF) =>
  p >= RANGE[k][0] - margin && p <= RANGE[k][1] + margin

export const veilAmount = (p: number) => {
  let v = 0
  for (const b of BOUNDS) v = Math.max(v, sm(clamp(1 - Math.abs(p - b) / VEIL_HALF)))
  return v
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

/** Story chapters (used by overlay + progress rail). */
export const CHAPTERS = [
  { id: 'hero', label: 'Arrival', p: 0.0 },
  { id: 'map', label: 'Sourcing', p: 0.17 },
  { id: 'warehouse', label: 'Warehouse', p: 0.3 },
  { id: 'loading', label: 'Loading', p: 0.45 },
  { id: 'port', label: 'Port', p: 0.6 },
  { id: 'globe', label: 'Ocean', p: 0.74 },
  { id: 'delivery', label: 'Delivery', p: 0.86 },
  { id: 'brand', label: 'Connection', p: 0.985 },
]
