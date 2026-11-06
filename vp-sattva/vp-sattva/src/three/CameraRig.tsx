import * as THREE from 'three'
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AREA_X, B, BOUNDS, S, damp, lerp, seg, sm } from '../lib/store'
import { heroTruckX } from './HeroArea'

type V = [number, number, number]
interface KF {
  p: number
  pos: V
  look: V
  fov?: number
}
const at = (k: keyof typeof AREA_X, list: KF[]): KF[] =>
  list.map((f) => ({ ...f, pos: [f.pos[0] + AREA_X[k], f.pos[1], f.pos[2]], look: [f.look[0] + AREA_X[k], f.look[1], f.look[2]] }))

const SHOTS: { end: number; kf: KF[] }[] = [
  {
    end: BOUNDS[1],
    kf: at('map', [
      { p: 0.125, pos: [-30, 46, 78], look: [-5, 0, 0], fov: 40 },
      { p: 0.19, pos: [10, 40, 70], look: [20, 0, 2] },
      { p: 0.24, pos: [40, 34, 62], look: [38, 0, 2] },
      { p: 0.255, pos: [50, 32, 58], look: [42, 0, 2] },
    ]),
  },
  {
    end: BOUNDS[2],
    kf: at('wh', [
      { p: 0.255, pos: [2, 2.4, 64], look: [0, 5, 0], fov: 50 },
      { p: 0.3, pos: [0, 3.0, 30], look: [0, 4.6, 0] },
      { p: 0.335, pos: [0, 3.3, 10], look: [0, 4, -20], fov: 58 },
      { p: 0.36, pos: [0.5, 3.6, -8], look: [3, 3, -30] },
      { p: 0.385, pos: [-3, 4.0, -17], look: [4, 2, -34] },
      { p: 0.42, pos: [-9, 3.4, -23], look: [-1, 1.4, -39] },
      { p: 0.47, pos: [-8, 3.2, -26.5], look: [0, 1.3, -40] },
      { p: 0.53, pos: [4, 2.6, -25], look: [0, 1.3, -41] },
    ]),
  },
  {
    end: BOUNDS[3],
    kf: at('port', [
      { p: 0.53, pos: [-75, 22, 72], look: [-12, 8, 0], fov: 44 },
      { p: 0.57, pos: [-42, 15, 62], look: [-4, 10, 2] },
      { p: 0.61, pos: [2, 36, 62], look: [0, 12, 0] },
      { p: 0.65, pos: [48, 21, 54], look: [14, 10, 6] },
      { p: 0.665, pos: [88, 17, 56], look: [70, 6, 8] },
      { p: 0.69, pos: [150, 13, 50], look: [172, 5, 8] },
    ]),
  },
  {
    end: BOUNDS[4],
    kf: at('globe', [
      { p: 0.69, pos: [0, 4, 36], look: [0, 0, 0], fov: 36 },
      { p: 0.75, pos: [-3, 2, 31], look: [0, 0, 0] },
      { p: 0.81, pos: [2, 3, 27], look: [0, 0, 0] },
    ]),
  },
  {
    end: BOUNDS[5],
    kf: at('del', [
      { p: 0.81, pos: [-120, 3.2, 15], look: [-140, 2.6, 0], fov: 42 },
      { p: 0.84, pos: [-58, 3.8, 17], look: [-40, 2.8, 0] },
      { p: 0.866, pos: [-8, 4.4, 21], look: [2, 2.4, -2] },
      { p: 0.89, pos: [-16, 3.4, 9], look: [-5, 1.8, -6] },
      { p: 0.925, pos: [-24, 4.6, 7], look: [-9, 1.6, -12] },
    ]),
  },
  {
    end: 2,
    kf: at('brand', [
      { p: 0.925, pos: [0, 0.5, 30], look: [0, 0, 0], fov: 38 },
      { p: 1, pos: [0, 0, 24], look: [0, 0, 0] },
    ]),
  },
]

const cr = (a: number, b: number, c: number, d: number, t: number) => {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
}
function sample(kf: KF[], p: number, out: { pos: THREE.Vector3; look: THREE.Vector3; fov: number }) {
  p = Math.min(Math.max(p, kf[0].p), kf[kf.length - 1].p)
  let i = 0
  while (i < kf.length - 2 && p > kf[i + 1].p) i++
  const a = kf[Math.max(0, i - 1)]
  const b = kf[i]
  const c = kf[i + 1]
  const d = kf[Math.min(kf.length - 1, i + 2)]
  const t = (p - b.p) / (c.p - b.p)
  for (let k = 0; k < 3; k++) {
    out.pos.setComponent(k, cr(a.pos[k], b.pos[k], c.pos[k], d.pos[k], t))
    out.look.setComponent(k, cr(a.look[k], b.look[k], c.look[k], d.look[k], t))
  }
  let f = b.fov ?? 40
  // carry fov forward from the last keyframe that defined it
  for (let j = i; j >= 0; j--) if (kf[j].fov) { f = kf[j].fov!; break }
  const f2 = c.fov ?? f
  out.fov = lerp(f, f2, sm(t))
}

function heroShot(p: number, out: { pos: THREE.Vector3; look: THREE.Vector3; fov: number }) {
  const t = seg(p, 0, B.hero)
  const tx = heroTruckX(p)
  const th = lerp(0.62, Math.PI, sm(seg(t, 0, 0.72))) + Math.sin(S.t * 0.25) * 0.06
  const R = lerp(17, 22, t)
  const h = lerp(3.4, 6.5, sm(seg(t, 0, 0.7)))
  const lift = sm(seg(t, 0.74, 1))
  out.pos.set(tx - 2 + Math.cos(th) * R, h + lift * 46, Math.sin(th) * R)
  out.look.set(tx - 2, 2.3 + lift * 85, 0)
  out.fov = lerp(36, 46, t)
}

export function CameraRig() {
  const { camera, pointer } = useThree()
  const tgt = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 }), [])
  const cur = useMemo(() => ({ look: new THREE.Vector3(), init: false }), [])
  useFrame((_, dt) => {
    const p = S.p
    const d = Math.min(dt, 0.05)
    if (p < BOUNDS[0]) heroShot(p, tgt)
    else {
      const s = SHOTS.find((sh) => p < sh.end) ?? SHOTS[SHOTS.length - 1]
      sample(s.kf, p, tgt)
    }
    if (!S.reduced) {
      tgt.pos.x += pointer.x * 0.5
      tgt.pos.y += pointer.y * 0.25
    }
    const cam = camera as THREE.PerspectiveCamera
    if (!cur.init || cam.position.distanceTo(tgt.pos) > 60) {
      cam.position.copy(tgt.pos)
      cur.look.copy(tgt.look)
      cur.init = true
    } else {
      const k = S.reduced ? 20 : 8
      cam.position.x = damp(cam.position.x, tgt.pos.x, k, d)
      cam.position.y = damp(cam.position.y, tgt.pos.y, k, d)
      cam.position.z = damp(cam.position.z, tgt.pos.z, k, d)
      cur.look.x = damp(cur.look.x, tgt.look.x, k, d)
      cur.look.y = damp(cur.look.y, tgt.look.y, k, d)
      cur.look.z = damp(cur.look.z, tgt.look.z, k, d)
    }
    cam.lookAt(cur.look)
    const fov = damp(cam.fov, S.mobile ? tgt.fov + 8 : tgt.fov, 4, d)
    if (Math.abs(fov - cam.fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    ;(S as unknown as { focus: THREE.Vector3 }).focus = cur.look
  })
  return null
}
