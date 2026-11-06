import * as THREE from 'three'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'

/** Land mask rasterised from Natural Earth (world-atlas) — bundled, no network needed. */
const W = 720
const H = 360
let mask: Uint8Array | null = null

export function getLandMask() {
  if (mask) return { mask, W, H }
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const land: any = feature(landTopo as any, (landTopo as any).objects.land)
  const polys: number[][][][] = []
  const feats = land.type === 'FeatureCollection' ? land.features : [land]
  for (const f of feats) {
    const g = f.geometry
    if (g.type === 'Polygon') polys.push(g.coordinates)
    else if (g.type === 'MultiPolygon') for (const pc of g.coordinates) polys.push(pc)
  }
  for (const rings of polys) {
    ctx.beginPath()
    for (const ring of rings) {
      ring.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * W
        const y = ((90 - lat) / 180) * H
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
    }
    ctx.fill('evenodd')
  }
  const d = ctx.getImageData(0, 0, W, H).data
  mask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mask[i] = d[i * 4] > 128 ? 1 : 0
  return { mask, W, H }
}

export function isLand(lon: number, lat: number) {
  const { mask: m, W: w, H: h } = getLandMask()
  const x = Math.min(w - 1, Math.max(0, Math.floor(((lon + 180) / 360) * w)))
  const y = Math.min(h - 1, Math.max(0, Math.floor(((90 - lat) / 180) * h)))
  return m[y * w + x] === 1
}

export function llToVec(lon: number, lat: number, r = 1, out = new THREE.Vector3()) {
  const phi = (lat * Math.PI) / 180
  const lam = (lon * Math.PI) / 180
  return out.set(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam))
}

export interface Hub {
  name: string
  lon: number
  lat: number
  hq?: boolean
}

/** Sourcing / trade hubs (illustrative network). */
export const HUBS: Hub[] = [
  { name: 'India', lon: 74.8, lat: 13.3, hq: true },
  { name: 'Dubai', lon: 55.3, lat: 25.2 },
  { name: 'Shanghai', lon: 121.5, lat: 31.2 },
  { name: 'Singapore', lon: 103.8, lat: 1.35 },
  { name: 'Tokyo', lon: 139.7, lat: 35.7 },
  { name: 'Sydney', lon: 151.2, lat: -33.9 },
  { name: 'Rotterdam', lon: 4.5, lat: 51.9 },
  { name: 'Durban', lon: 31.0, lat: -29.9 },
  { name: 'New York', lon: -74, lat: 40.7 },
  { name: 'Los Angeles', lon: -118.2, lat: 34 },
  { name: 'Santos', lon: -46.3, lat: -23.9 },
]

/** Sea-lane waypoints used by the ocean voyage on the globe (India → Rotterdam → New York). */
export const ROUTE_LL: [number, number][] = [
  [74.8, 13.3],
  [66, 15],
  [55, 13.2],
  [46, 12.4],
  [41, 16],
  [35, 26],
  [32.5, 31.2],
  [24, 34.2],
  [10, 37.3],
  [-6, 36],
  [-12, 43],
  [-3, 49.5],
  [4.4, 51.9],
  [-8, 50],
  [-30, 47],
  [-55, 43.5],
  [-74, 40.4],
]

export function routeCurve(r: number) {
  const pts = ROUTE_LL.map(([lo, la]) => llToVec(lo, la, r))
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

/** Even sphere sampling (Fibonacci) filtered by land mask → points on unit sphere. */
export function landPointsOnSphere(n: number) {
  const out: THREE.Vector3[] = []
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const rr = Math.sqrt(1 - y * y)
    const th = ga * i
    const x = Math.sin(th) * rr
    const z = Math.cos(th) * rr
    const lat = (Math.asin(y) * 180) / Math.PI
    const lon = (Math.atan2(x, z) * 180) / Math.PI
    if (isLand(lon, lat)) out.push(new THREE.Vector3(x, y, z))
  }
  return out
}

/** Great-circle arc lifted off the surface. */
export function arcBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, lift: number, n = 64) {
  const pts: THREE.Vector3[] = []
  const ang = a.angleTo(b)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const v = new THREE.Vector3().copy(a).multiplyScalar(Math.sin((1 - t) * ang)).addScaledVector(b, Math.sin(t * ang)).divideScalar(Math.sin(ang) || 1)
    v.normalize().multiplyScalar(r + Math.sin(t * Math.PI) * lift * r)
    pts.push(v)
  }
  return pts
}
