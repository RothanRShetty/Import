import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { C, S } from '../lib/store'
import { concreteTexture, ribTexture } from '../lib/textures'
import { Boxes, Glow, Truck, mats, type BoxItem } from './Models'
import { CRANE_X, Crane, SHIP_Z, Ship, WATER_Y, shipX } from './PortModels'

const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const PAL = ['#123B64', '#C9A45C', '#eef2f6', '#7f93aa', '#0d2a4a', '#3c6e9f', '#a8763b', '#1b4f82']
export const CRANE_RANGES: [number, number][] = [
  [0.545, 0.6],
  [0.565, 0.62],
  [0.585, 0.64],
]

function Water() {
  const ref = useRef<THREE.Mesh>(null!)
  const geo = useMemo(() => new THREE.PlaneGeometry(900, 300, S.low ? 40 : 90, S.low ? 16 : 36).rotateX(-Math.PI / 2), [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo])
  const skip = useRef(0)
  useFrame(() => {
    if (S.low && (skip.current++ & 1)) return
    const pos = geo.attributes.position as THREE.BufferAttribute
    const t = S.t
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]
      pos.setY(i, Math.sin(x * 0.07 + t * 0.9) * 0.22 + Math.cos(z * 0.1 + t * 1.2) * 0.18 + Math.sin((x + z) * 0.2 + t * 1.9) * 0.06)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return (
    <mesh ref={ref} geometry={geo} position={[0, WATER_Y, 150]} receiveShadow>
      <meshStandardMaterial color="#0a2b50" metalness={0.8} roughness={0.2} envMapIntensity={1.4} />
    </mesh>
  )
}

function LaneTruck({ off, color }: { off: number; color: string }) {
  const g = useRef<THREE.Group>(null!)
  const spin = useRef(0)
  useFrame(() => {
    const d = S.t * 4 + S.p * 500 + off
    spin.current = d
    g.current.position.set(((d % 150) + 150) % 150 - 75, 0, -22)
  })
  return (
    <group ref={g}>
      <Truck spin={spin} lights={false} cargoColor={color} />
    </group>
  )
}

export function PortArea() {
  const m = mats()
  const ship = useRef<THREE.Group>(null!)
  const conc = useMemo(() => {
    const t = concreteTexture().clone()
    t.repeat.set(40, 14)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, color: '#8da2bb', roughness: 0.6, metalness: 0.2 })
  }, [])
  const stacks = useMemo(() => {
    const r = rng(3)
    const out: BoxItem[] = []
    const rows = S.low ? 5 : 9
    for (let x = -64; x <= 64; x += 6.4)
      for (let i = 0; i < rows; i++) {
        const n = 1 + Math.floor(r() * 3)
        if (r() < 0.12) continue
        for (let l = 0; l < n; l++) out.push({ p: [x, 1.3 + l * 2.6, -27.5 - i * 2.7], s: [6, 2.55, 2.4], c: PAL[Math.floor(r() * PAL.length)] })
      }
    return out
  }, [])
  const cargoMat = useMemo(() => {
    const t = ribTexture().clone()
    t.repeat.set(5, 1)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ color: '#fff', map: t, metalness: 0.5, roughness: 0.42 })
  }, [])
  useFrame(() => {
    ship.current.position.set(shipX(S.p), Math.sin(S.t * 0.8) * 0.06, SHIP_Z)
    ship.current.rotation.z = Math.sin(S.t * 0.7) * 0.0025
  })
  return (
    <group>
      <Water />
      <mesh position={[0, -1.5, -35]} material={conc} receiveShadow castShadow>
        <boxGeometry args={[220, 3, 70]} />
      </mesh>
      <mesh material={m.gold} position={[0, 0.03, -0.3]} scale={[220, 0.06, 0.4]} geometry={m.box} />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={m.dark} position={[-90 + i * 16.4, 0.25, -0.9]} scale={[0.6, 0.5, 0.6]} geometry={m.box} />
      ))}
      <Boxes items={stacks} material={cargoMat} />
      {CRANE_X.map((x, i) => (
        <Crane key={x} x={x} range={CRANE_RANGES[i]} tint={PAL[(i * 3 + 2) % PAL.length]} />
      ))}
      <group ref={ship}>
        <Ship />
      </group>
      <LaneTruck off={0} color={C.navy} />
      <LaneTruck off={75} color="#C9A45C" />
      {[-48, 48].map((x) => (
        <group key={x} position={[x, 0, -24]}>
          <mesh material={m.steel} position={[0, 15, 0]} scale={[0.6, 30, 0.6]} geometry={m.box} castShadow />
          <mesh material={m.head} position={[0, 30.4, 1]} scale={[3.5, 0.5, 1.2]} geometry={m.box} />
          <Glow position={[0, 30.4, 2]} size={22} opacity={0.55} color="#ffe2a8" />
        </group>
      ))}
    </group>
  )
}
