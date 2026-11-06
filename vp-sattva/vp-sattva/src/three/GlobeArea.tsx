import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { B, C, S, angDelta, clamp, damp, seg, sms } from '../lib/store'
import { HUBS, arcBetween, landPointsOnSphere, llToVec, routeCurve } from '../lib/geo'
import { Glow } from './Models'
import { MiniShip } from './PortModels'

export interface GlobeCtl {
  dx: number
  dy: number
  active: boolean
  focus: [number, number] | null
}

const atmosphere = {
  vertex: /* glsl */ `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragment: /* glsl */ `varying vec3 vN; void main(){ float i = pow(0.74 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.30,0.55,0.95,1.0) * i * 1.15; }`,
}

export function Stars({ n = 1400, r = 220 }: { n?: number; r?: number }) {
  const geo = useMemo(() => {
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const rr = r * (0.7 + Math.random() * 0.5)
      a.set([rr * s * Math.cos(t), rr * u, rr * s * Math.sin(t)], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }, [n, r])
  return (
    <points geometry={geo}>
      <pointsMaterial color="#cfe0ff" size={1.6} sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} />
    </points>
  )
}

/** Dotted globe with hubs, arcs and (optionally) the ocean voyage of the cargo ship. */
export function GlobeModel({ radius = 10, voyage, arcs = false, ctl, autoSpeed = 0.12 }: { radius?: number; voyage?: () => number; arcs?: boolean; ctl?: MutableRefObject<GlobeCtl>; autoSpeed?: number }) {
  const root = useRef<THREE.Group>(null!)
  const inst = useRef<THREE.InstancedMesh>(null!)
  const ship = useRef<THREE.Group>(null!)
  const trail = useRef<THREE.Line>(null!)
  const glows = useRef<(THREE.Sprite | null)[]>([])
  const pulses = useRef<(THREE.Sprite | null)[]>([])

  const land = useMemo(() => landPointsOnSphere(S.mobile || S.low ? 15000 : 26000), [])
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const q = new THREE.Quaternion()
    const z = new THREE.Vector3(0, 0, 1)
    const col = new THREE.Color()
    const dotR = (S.mobile || S.low ? 1.35 : 1) * radius * 0.0092
    land.forEach((v, i) => {
      o.position.copy(v).multiplyScalar(radius * 1.002)
      o.quaternion.copy(q.setFromUnitVectors(z, v))
      o.scale.setScalar(dotR / 0.0092 / radius)
      o.updateMatrix()
      inst.current.setMatrixAt(i, o.matrix)
      inst.current.setColorAt(i, col.set('#4f86c6').multiplyScalar(0.7 + Math.random() * 0.6))
    })
    inst.current.instanceMatrix.needsUpdate = true
    inst.current.instanceColor!.needsUpdate = true
  }, [land, radius])

  const hubVecs = useMemo(() => HUBS.map((h) => llToVec(h.lon, h.lat, radius * 1.006)), [radius])
  const arcData = useMemo(() => {
    if (!arcs) return []
    const a = llToVec(HUBS[0].lon, HUBS[0].lat, 1)
    return HUBS.slice(1).map((h) => {
      const pts = arcBetween(a, llToVec(h.lon, h.lat, 1), radius * 1.004, 0.22, 60)
      return { pts, geo: new THREE.BufferGeometry().setFromPoints(pts) }
    })
  }, [arcs, radius])
  const arcMat = useMemo(() => new THREE.LineBasicMaterial({ color: C.gold, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const arcObjs = useMemo(() => arcData.map((d) => new THREE.Line(d.geo, arcMat)), [arcData, arcMat])

  const route = useMemo(() => {
    if (!voyage) return null
    const curve = routeCurve(radius * 1.012)
    const pts = curve.getPoints(260)
    const full = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#8fb4e8', transparent: true, opacity: 0.35, depthWrite: false }))
    const tr = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: C.gold, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }))
    return { curve, full, tr }
  }, [voyage, radius])

  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), m: new THREE.Matrix4() }), [])

  useFrame((_, dt) => {
    const g = root.current
    const t = S.t
    const d = Math.min(dt, 0.05)
    let faceLon: number | null = null
    let faceLat = 0
    if (route && voyage) {
      const u = clamp(voyage())
      route.curve.getPointAt(Math.max(0.0005, u), tmp.a)
      route.curve.getPointAt(Math.min(1, u + 0.004), tmp.b)
      tmp.up.copy(tmp.a).normalize()
      tmp.f.copy(tmp.b).sub(tmp.a)
      tmp.f.addScaledVector(tmp.up, -tmp.f.dot(tmp.up)).normalize()
      tmp.r.crossVectors(tmp.f, tmp.up)
      tmp.m.makeBasis(tmp.f, tmp.up, tmp.r)
      ship.current.position.copy(tmp.a).addScaledVector(tmp.up, 0.12)
      ship.current.quaternion.setFromRotationMatrix(tmp.m)
      trail.current.geometry.setDrawRange(0, Math.floor(261 * u))
      faceLon = (Math.atan2(tmp.a.x, tmp.a.z) * 180) / Math.PI
      faceLat = (Math.asin(tmp.up.y) * 180) / Math.PI
    } else if (ctl) {
      const c = ctl.current
      if (c.focus) {
        faceLon = c.focus[0]
        faceLat = c.focus[1]
      } else if (!c.active) g.rotation.y += autoSpeed * d
      g.rotation.y += c.dx
      g.rotation.x = clamp(g.rotation.x + c.dy, -1.1, 1.1)
      c.dx = 0
      c.dy = 0
    } else g.rotation.y += autoSpeed * d
    if (faceLon !== null) {
      const ty = (-faceLon * Math.PI) / 180
      const tx = clamp((faceLat * Math.PI) / 180, -1, 1) * 0.9
      g.rotation.y += angDelta(g.rotation.y, ty) * (1 - Math.exp(-3.2 * d))
      g.rotation.x = damp(g.rotation.x, tx, 3.2, d)
    }
    HUBS.forEach((h, i) => {
      const s = glows.current[i]
      if (s) s.scale.setScalar((h.hq ? 2.6 : 1.5) * (1 + Math.sin(t * 2.2 + i) * 0.18))
    })
    arcData.forEach((a, i) => {
      const pl = pulses.current[i]
      if (pl) pl.position.copy(a.pts[Math.floor(((t * 0.3 + i * 0.17) % 1) * (a.pts.length - 1))])
    })
  })

  return (
    <group ref={root}>
      <mesh>
        <sphereGeometry args={[radius * 0.995, 64, 48]} />
        <meshStandardMaterial color="#0b2547" emissive="#061a33" emissiveIntensity={0.9} roughness={0.55} metalness={0.35} />
      </mesh>
      <instancedMesh ref={inst} args={[undefined, undefined, land.length]} frustumCulled={false}>
        <circleGeometry args={[radius * 0.0092, 5]} />
        <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh scale={1.16}>
        <sphereGeometry args={[radius, 48, 32]} />
        <shaderMaterial vertexShader={atmosphere.vertex} fragmentShader={atmosphere.fragment} side={THREE.BackSide} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {HUBS.map((h, i) => (
        <group key={h.name} position={hubVecs[i]}>
          <mesh>
            <sphereGeometry args={[h.hq ? 0.2 : 0.11, 12, 12]} />
            <meshBasicMaterial color={h.hq ? '#ffe2a0' : '#ffffff'} toneMapped={false} />
          </mesh>
          <Glow size={1} opacity={0.9} />
          <sprite ref={(o) => (glows.current[i] = o)} scale={[1.5, 1.5, 1]}>
            <spriteMaterial color={C.gold} transparent opacity={0.0} />
          </sprite>
        </group>
      ))}
      {arcObjs.map((o, i) => (
        <group key={i}>
          <primitive object={o} />
          <Pulse refCb={(s) => (pulses.current[i] = s)} />
        </group>
      ))}
      {route && (
        <>
          <primitive object={route.full} />
          <primitive object={route.tr} ref={trail} />
          <group ref={ship}>
            <MiniShip />
            <Glow size={1.4} opacity={0.7} />
          </group>
        </>
      )}
    </group>
  )
}

function Pulse({ refCb }: { refCb: (s: THREE.Sprite | null) => void }) {
  return (
    <sprite ref={refCb} scale={[0.9, 0.9, 1]}>
      <spriteMaterial color="#fff3d0" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  )
}

/** Story scene: the cargo ship crosses the ocean on the globe. */
export function StoryGlobeArea() {
  const ring = useRef<THREE.Mesh>(null!)
  const grp = useRef<THREE.Group>(null!)
  const voyage = useMemo(() => () => sms(S.p, B.port + 0.02, B.globe - 0.012), [])
  useFrame(() => {
    ring.current.rotation.z = S.t * 0.05
    const s = 0.82 + sms(S.p, B.port, B.port + 0.04) * 0.18
    grp.current.scale.setScalar(s)
  })
  return (
    <group>
      <Stars />
      <group ref={grp}>
        <GlobeModel radius={10} voyage={voyage} />
      </group>
      <mesh ref={ring} rotation={[1.25, 0.2, 0]}>
        <torusGeometry args={[15.5, 0.025, 8, 160]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.45} />
      </mesh>
    </group>
  )
}

void seg
