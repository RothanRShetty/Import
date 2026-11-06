import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { B, C, S, seg, sm } from '../lib/store'
import { asphaltTexture, ribTexture } from '../lib/textures'
import { Boxes, Glow, Truck, mats, type BoxItem } from './Models'

export const heroTruckX = (p: number) => 190 * sm(seg(p, 0, B.hero))

const SP = 40 // treadmill period
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

export function Road({ length = 900, x0 = -300 }: { length?: number; x0?: number }) {
  const asphalt = useMemo(() => {
    const t = asphaltTexture().clone()
    t.repeat.set(length / 8, 2)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, color: '#9aa7b8', metalness: 0.25, roughness: 0.38 })
  }, [length])
  const cx = x0 + length / 2
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, 0]} material={asphalt} receiveShadow>
        <planeGeometry args={[length, 15]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.02, 0]} receiveShadow>
        <planeGeometry args={[length, 900]} />
        <meshStandardMaterial color="#071a30" roughness={0.9} metalness={0.05} />
      </mesh>
      {[-6.8, 6.8].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.012, z]}>
          <planeGeometry args={[length, 0.16]} />
          <meshBasicMaterial color={C.gold} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export function HeroArea() {
  const truck = useRef<THREE.Group>(null!)
  const tread = useRef<THREE.Group>(null!)
  const spin = useRef(0)
  const m = mats()

  const { dashes, poles, heads, barrier } = useMemo(() => {
    const dashes: BoxItem[] = []
    const poles: BoxItem[] = []
    const heads: BoxItem[] = []
    const barrier: BoxItem[] = []
    for (let x = -140; x < 340; x += 10) dashes.push({ p: [x, 0.02, 0], s: [4.5, 0.02, 0.22] })
    for (let x = -140; x < 340; x += SP) {
      for (const s of [1, -1]) {
        poles.push({ p: [x, 4.5, s * 8.6], s: [0.16, 9, 0.16] })
        poles.push({ p: [x, 9, s * 7.2], s: [0.14, 0.14, 3] })
        heads.push({ p: [x, 8.85, s * 5.8], s: [0.9, 0.12, 0.5] })
      }
    }
    for (let x = -140; x < 340; x += 6) for (const s of [1, -1]) barrier.push({ p: [x, 0.45, s * 7.6], s: [5.6, 0.5, 0.12] })
    return { dashes, poles, heads, barrier }
  }, [])

  const { towers, windows, stacks } = useMemo(() => {
    const r = rng(11)
    const towers: BoxItem[] = []
    const windows: BoxItem[] = []
    const stacks: BoxItem[] = []
    const n = S.low ? 40 : 70
    for (let i = 0; i < n; i++) {
      const x = -250 + r() * 800
      const z = -130 - r() * 200
      const h = 12 + r() * 70
      const w = 8 + r() * 16
      towers.push({ p: [x, h / 2, z], s: [w, h, w], c: r() > 0.5 ? '#0e2d52' : '#0a2240' })
      for (let k = 0; k < (S.low ? 4 : 9); k++)
        windows.push({ p: [x + (r() - 0.5) * w * 0.8, 2 + r() * (h - 3), z + w / 2 + 0.05], s: [0.9, 0.5, 0.05], c: r() > 0.3 ? '#f1d18b' : '#cfe0f5' })
    }
    const pal = ['#123B64', '#C9A45C', '#e8edf3', '#6e86a3', '#0d2a4a', '#3c6e9f']
    for (let x = -120; x < 340; x += 6.4)
      for (const row of [-34, -37, -40])
        for (let l = 0; l < 1 + Math.floor(r() * 3); l++) stacks.push({ p: [x, 1.3 + l * 2.6, row], s: [6, 2.55, 2.4], c: pal[Math.floor(r() * pal.length)] })
    return { towers, windows, stacks }
  }, [])
  const cargoMat = useMemo(() => {
    const t = ribTexture().clone()
    t.repeat.set(5, 1)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ color: '#fff', map: t, metalness: 0.5, roughness: 0.45 })
  }, [])
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.6, metalness: 0.2 }), [])
  const winMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false }), [])
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe3a8', toneMapped: false }), [])

  useFrame(() => {
    const x = heroTruckX(S.p)
    truck.current.position.x = x
    spin.current = x + S.t * 7
    tread.current.position.x = -((S.t * 7) % SP)
  })

  return (
    <group>
      <Road />
      <group ref={tread}>
        <Boxes items={dashes} material={m.white} shadow={false} />
        <Boxes items={barrier} material={m.steel} shadow={false} />
        <Boxes items={poles} material={m.steel} />
        <Boxes items={heads} material={headMat} shadow={false} />
        {Array.from({ length: 12 }, (_, i) => (
          <group key={i}>
            <Glow position={[-140 + i * SP, 8.6, 5.8]} size={9} opacity={0.5} />
            <Glow position={[-140 + i * SP, 8.6, -5.8]} size={9} opacity={0.5} />
          </group>
        ))}
      </group>
      <Boxes items={towers} material={towerMat} shadow={false} />
      <Boxes items={windows} material={winMat} shadow={false} />
      <Boxes items={stacks} material={cargoMat} />
      <Glow position={[260, 35, -420]} size={700} color="#c9a45c" opacity={0.28} />
      <Glow position={[-60, 60, -500]} size={900} color="#2c6cb0" opacity={0.22} />
      <group ref={truck}>
        <Truck spin={spin} />
      </group>
    </group>
  )
}
