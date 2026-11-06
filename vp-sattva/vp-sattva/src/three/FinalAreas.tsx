import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { B, C, S, lerp, seg, sm, sms } from '../lib/store'
import { labelTexture } from '../lib/textures'
import { Boxes, Container, FORK_REACH, Forklift, Glow, PalletLoad, Truck, Worker, forkTrip, mats, yawOf, type BoxItem } from './Models'
import { Road } from './HeroArea'
import { Stars } from './GlobeArea'

export const DEL = {
  arrive: [0.815, 0.866] as const,
  doors: [0.866, 0.874] as const,
  trips: [
    [0.874, 0.8893],
    [0.8893, 0.9047],
    [0.9047, 0.92],
  ] as const,
}
const STOP_X = 9
export const delTruckX = (p: number) => lerp(-170, STOP_X, 1 - Math.pow(1 - seg(p, DEL.arrive[0], DEL.arrive[1]), 2.2))

const H: [number, number] = [-9, 0]
const PA = [0, 1.5, 3].map((x) => [x, 0] as [number, number])
const PD = [-12.4, -10, -7.6].map((x) => [x, -16.6] as [number, number])

export function DeliveryArea() {
  const m = mats()
  const truck = useRef<THREE.Group>(null!)
  const doors = useRef(0)
  const spin = useRef(0)
  const fk = useRef<THREE.Group>(null!)
  const fork = useRef(0.12)
  const fspin = useRef(0)
  const pal = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)]
  const shutter = useRef<THREE.Mesh>(null!)
  const sign = useMemo(() => labelTexture('DESTINATION', null, '#dfe8f3', { w: 1200, h: 160, font: '600 84px Manrope, Arial, sans-serif', spacing: 46 }), [])
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a2036', metalness: 1, roughness: 0.08 }), [])
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9e1ea', metalness: 0.25, roughness: 0.5 }), [])
  const mull = useMemo<BoxItem[]>(() => Array.from({ length: 21 }, (_, i) => ({ p: [-26 + i * 3, 6, -13.9], s: [0.12, 3.2, 0.14] })), [])
  const poles = useMemo<BoxItem[]>(() => {
    const out: BoxItem[] = []
    for (let x = -200; x < 60; x += 30) out.push({ p: [x, 4.5, 8.8], s: [0.16, 9, 0.16] })
    return out
  }, [])
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe3a8', toneMapped: false }), [])

  useFrame(() => {
    const p = S.p
    const tx = delTruckX(p)
    truck.current.position.x = tx
    spin.current = tx
    doors.current = sms(p, DEL.doors[0], DEL.doors[1])
    const off = tx - STOP_X
    const trips = DEL.trips.map(([a, b], i) => ({ u: seg(p, a, b), t: forkTrip(seg(p, a, b), H, PA[i], PD[i], 0) }))
    let act = trips[0]
    if (p >= DEL.trips[1][0]) act = trips[1]
    if (p >= DEL.trips[2][0]) act = trips[2]
    fk.current.position.set(act.t.x, 0, act.t.z)
    fk.current.rotation.y = act.t.yaw
    fork.current = act.t.fork
    fspin.current = act.t.dist
    trips.forEach((tr, i) => {
      const g = pal[i].current
      const pp = tr.t.pallet
      g.position.set(pp.x + (tr.u < 0.28 ? off : 0), pp.y, pp.z)
      g.rotation.y = pp.yaw
    })
    shutter.current.position.y = 2.3 + sms(p, 0.87, 0.884) * 4.2 - sms(p, 0.92, 0.925) * 0
  })

  return (
    <group>
      <Road length={900} x0={-650} />
      {/* facility */}
      <mesh material={wall} position={[4, 4.5, -25]} scale={[72, 9, 22]} geometry={m.box} castShadow receiveShadow />
      <mesh material={glass} position={[4, 6, -13.95]} scale={[62, 3.2, 0.1]} geometry={m.box} />
      <Boxes items={mull} material={m.gold} shadow={false} />
      <mesh material={m.navy} position={[4, 9.25, -19]} scale={[74, 0.5, 12]} geometry={m.box} castShadow />
      <mesh material={m.gold} position={[4, 9.0, -13.1]} scale={[74, 0.06, 0.2]} geometry={m.box} />
      <mesh material={m.navy} position={[4, 1.0, -13.9]} scale={[72.2, 2, 0.2]} geometry={m.box} />
      <mesh position={[4, 8.2, -13.82]}>
        <planeGeometry args={[18, 2.4]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      {[-10, 8, 26].map((x, i) => (
        <group key={x}>
          <mesh material={m.dark} position={[x, 2.3, -13.85]} scale={[4.1, 4.6, 0.2]} geometry={m.box} />
          <mesh material={m.gold} position={[x, 4.7, -13.75]} scale={[4.3, 0.12, 0.2]} geometry={m.box} />
          <mesh position={[x, 2.3, -14.05]}>
            <planeGeometry args={[3.6, 4.2]} />
            <meshBasicMaterial color="#ffcf86" toneMapped={false} />
          </mesh>
          {i === 0 ? (
            <mesh ref={shutter} material={m.steel} position={[x, 2.3, -13.7]} scale={[3.8, 4.2, 0.12]} geometry={m.box} />
          ) : (
            <mesh material={m.steel} position={[x, 2.3, -13.7]} scale={[3.8, 4.2, 0.12]} geometry={m.box} />
          )}
        </group>
      ))}
      <Boxes items={poles} material={m.steel} />
      {poles.map((p, i) => (
        <Glow key={i} position={[p.p[0], 8.8, 7]} size={9} opacity={0.5} />
      ))}
      {/* approaching truck */}
      <group ref={truck}>
        <Truck spin={spin} doors={doors} cargoColor={C.royal} />
      </group>
      {/* pallets + forklift */}
      {pal.map((r, i) => (
        <group key={i} ref={r}>
          <PalletLoad tint={i === 1 ? '#f3e9d8' : '#ffffff'} />
        </group>
      ))}
      <group ref={fk}>
        <Forklift fork={fork} spin={fspin} />
      </group>
      <group position={[-1.2, 0, 2.2]} rotation={[0, yawOf(-1, -1), 0]}>
        <Worker walk={0} phase={1} />
      </group>
      <Walker />
    </group>
  )
}

function Walker() {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    const ph = S.t * 0.45 + S.p * 60
    const s = 0.5 - 0.5 * Math.cos(ph)
    g.current.position.set(lerp(-3.2, -4.6, s), 0, lerp(2.6, -12, s))
    g.current.rotation.y = Math.sin(ph) >= 0 ? yawOf(-1.4, -14.6) : yawOf(1.4, 14.6)
    g.current.visible = S.p > DEL.doors[1]
  })
  return (
    <group ref={g}>
      <Worker carry phase={0} />
    </group>
  )
}

/** Cinematic finale: dark navy, floating gold dust and a slow halo. */
export function BrandArea() {
  const halo = useRef<THREE.Mesh>(null!)
  const halo2 = useRef<THREE.Mesh>(null!)
  const sweep = useRef<THREE.Group>(null!)
  const dust = useRef<THREE.Points>(null!)
  const geo = useMemo(() => {
    const n = S.low ? 260 : 700
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) a.set([(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 34, (Math.random() - 0.5) * 30 - 6], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }, [])
  useFrame(() => {
    const t = S.t
    halo.current.rotation.z = t * 0.06
    halo2.current.rotation.z = -t * 0.04
    const k = sms(S.p, B.del + 0.012, 1)
    halo.current.scale.setScalar(0.85 + k * 0.15)
    sweep.current.position.x = -18 + ((t * 7) % 44)
    dust.current.rotation.y = t * 0.012
    dust.current.position.y = Math.sin(t * 0.2) * 0.4
  })
  return (
    <group>
      <Stars n={700} r={160} />
      <points ref={dust} geometry={geo}>
        <pointsMaterial color={C.gold} size={2.4} sizeAttenuation={false} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh ref={halo} position={[0, 0, -8]}>
        <torusGeometry args={[9.5, 0.04, 8, 200]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh ref={halo2} position={[0, 0, -8.5]} rotation={[0.35, 0.2, 0]}>
        <torusGeometry args={[12.5, 0.02, 8, 200]} />
        <meshBasicMaterial color="#6f9ad2" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <group ref={sweep} position={[-18, 0, -6]}>
        <Glow size={26} opacity={0.35} />
        <Glow size={9} opacity={0.5} color="#fff0c8" />
      </group>
      <Glow position={[0, 0, -12]} size={70} color="#123B64" opacity={0.7} />
    </group>
  )
}

void sm
void FORK_REACH
