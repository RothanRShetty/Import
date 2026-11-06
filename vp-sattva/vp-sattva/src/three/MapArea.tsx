import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { B, C, S, sms } from '../lib/store'
import { HUBS, isLand } from '../lib/geo'
import { glowTexture, labelTexture } from '../lib/textures'
import { Glow } from './Models'

const K = 160 / 360
const mp = (lon: number, lat: number, out = new THREE.Vector3()) => out.set(lon * K, (lat - 12) * K, 0)

export function MapArea() {
  const root = useRef<THREE.Group>(null!)
  const dotMat = useRef<THREE.MeshBasicMaterial>(null!)
  const inst = useRef<THREE.InstancedMesh>(null!)
  const A = B.hero + 0.004

  const dots = useMemo(() => {
    const st = S.mobile || S.low ? 2.6 : 1.8
    const out: { p: THREE.Vector3; hot: number }[] = []
    const hubs = HUBS.map((h) => mp(h.lon, h.lat))
    for (let lon = -179; lon < 180; lon += st)
      for (let lat = -57; lat < 80; lat += st) {
        if (!isLand(lon, lat)) continue
        const p = mp(lon, lat)
        let hot = 0
        for (const h of hubs) hot = Math.max(hot, 1 - p.distanceTo(h) / 9)
        out.push({ p, hot: Math.max(0, hot) })
      }
    return { out, st }
  }, [])

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    const base = new THREE.Color('#2c5d94')
    const hi = new THREE.Color(C.gold)
    dots.out.forEach((d, i) => {
      o.position.copy(d.p)
      const s = (dots.st / 1.8) * (0.8 + d.hot * 0.5)
      o.scale.setScalar(s)
      o.updateMatrix()
      inst.current.setMatrixAt(i, o.matrix)
      col.copy(base).multiplyScalar(0.75 + Math.random() * 0.5).lerp(hi, d.hot * 0.8)
      inst.current.setColorAt(i, col)
    })
    inst.current.instanceMatrix.needsUpdate = true
    inst.current.instanceColor!.needsUpdate = true
  }, [dots])

  const graticule = useMemo(() => {
    const pts: number[] = []
    for (let lon = -180; lon <= 180; lon += 30) {
      const a = mp(lon, -57)
      const b = mp(lon, 80)
      pts.push(a.x, a.y, -0.05, b.x, b.y, -0.05)
    }
    for (let lat = -50; lat <= 80; lat += 30) {
      const a = mp(-180, lat)
      const b = mp(180, lat)
      pts.push(a.x, a.y, -0.05, b.x, b.y, -0.05)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  const hq = HUBS[0]
  const hubData = useMemo(() => {
    const N = 56
    const a = mp(hq.lon, hq.lat)
    return HUBS.map((h, i) => {
      const p = mp(h.lon, h.lat)
      let arc: THREE.Vector3[] | null = null
      if (i > 0) {
        const mid = a.clone().add(p).multiplyScalar(0.5)
        mid.z = 6 + a.distanceTo(p) * 0.32
        const c = new THREE.QuadraticBezierCurve3(a, mid, p)
        arc = c.getPoints(N)
      }
      return { h, p, arc }
    })
  }, [])

  const lines = useRef<(THREE.Line | null)[]>([])
  const pulses = useRef<(THREE.Sprite | null)[]>([])
  const glows = useRef<(THREE.Group | null)[]>([])
  const lineGeos = useMemo(
    () =>
      hubData.map((d) => {
        if (!d.arc) return null
        const g = new THREE.BufferGeometry().setFromPoints(d.arc)
        g.setDrawRange(0, 0)
        return g
      }),
    [hubData],
  )
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: C.gold, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const lineObjs = useMemo(() => lineGeos.map((g) => (g ? new THREE.Line(g, lineMat) : null)), [lineGeos, lineMat])

  useFrame(() => {
    const p = S.p
    const t = S.t
    dotMat.current.opacity = sms(p, A, A + 0.03) * 0.95
    root.current.rotation.x = -0.95 + sms(p, A, B.map) * 0.28
    root.current.position.y = -2 + sms(p, A, B.map) * 1.5
    hubData.forEach((d, i) => {
      const r = sms(p, A + 0.025 + i * 0.006, A + 0.045 + i * 0.006)
      const gl = glows.current[i]
      if (gl) {
        gl.scale.setScalar(Math.max(0.0001, r) * (d.h.hq ? 1.5 : 1) * (1 + Math.sin(t * 2.4 + i) * 0.12))
      }
      const line = lines.current[i]
      if (line && d.arc) {
        const rr = sms(p, A + 0.035 + i * 0.007, A + 0.075 + i * 0.007)
        const n = Math.floor(57 * rr)
        line.geometry.setDrawRange(0, n)
        const pl = pulses.current[i]
        if (pl) {
          pl.visible = rr > 0.98
          const k = (t * 0.28 + i * 0.173) % 1
          const idx = Math.min(d.arc.length - 1, Math.floor(k * (d.arc.length - 1)))
          pl.position.copy(d.arc[idx])
        }
      }
    })
  })

  return (
    <group ref={root}>
      <lineSegments geometry={graticule}>
        <lineBasicMaterial color="#1c4a7c" transparent opacity={0.35} />
      </lineSegments>
      <instancedMesh ref={inst} args={[undefined, undefined, dots.out.length]} frustumCulled={false}>
        <circleGeometry args={[0.36, 6]} />
        <meshBasicMaterial ref={dotMat} transparent toneMapped={false} />
      </instancedMesh>
      {hubData.map((d, i) => (
        <group key={d.h.name}>
          <group ref={(o) => (glows.current[i] = o)} position={d.p}>
            <Glow size={d.h.hq ? 9 : 6} opacity={0.9} />
            <mesh position={[0, 0, 0.05]}>
              <circleGeometry args={[d.h.hq ? 0.9 : 0.55, 24]} />
              <meshBasicMaterial color={d.h.hq ? '#ffe2a0' : '#ffffff'} toneMapped={false} />
            </mesh>
            <sprite position={[0, d.h.hq ? 3.2 : 2.4, 0.2]} scale={[7, 1.75, 1]}>
              <spriteMaterial map={labelTexture(d.h.hq ? 'V&P SATTVA · INDIA' : d.h.name.toUpperCase(), null, d.h.hq ? C.gold : '#dbe7f5', { w: 512, h: 128, font: '600 54px Manrope, Arial, sans-serif', spacing: 8 })} transparent depthWrite={false} toneMapped={false} />
            </sprite>
          </group>
          {lineObjs[i] && <primitive object={lineObjs[i]!} ref={(o: THREE.Line | null) => (lines.current[i] = o)} />}
          {d.arc && (
            <sprite ref={(o) => (pulses.current[i] = o)} scale={[3, 3, 1]} visible={false}>
              <spriteMaterial map={glowTexture()} color="#fff3d0" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          )}
        </group>
      ))}
    </group>
  )
}
