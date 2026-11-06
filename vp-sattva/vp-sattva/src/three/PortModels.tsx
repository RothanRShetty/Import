import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { C, S, seg, sms, track } from '../lib/store'
import { ribTexture } from '../lib/textures'
import { Boxes, Container, mats, type BoxItem } from './Models'

export const WATER_Y = -3
export const SHIP_Z = 8.5
export const CARGO_X = Array.from({ length: 10 }, (_, k) => -25.6 + 6.4 * k)
export const ROWS = [-5.2, -2.6, 0, 2.6, 5.2]
export const DECK_Y = 1
export const CRANE_COLS = [1, 4, 8] // bay indexes under the three cranes → x = -19.2, 0 (≈-0.0), 25.6
export const CRANE_X = CRANE_COLS.map((i) => CARGO_X[i])
export const PICK_Z = -9
export const DROP_Z = SHIP_Z + ROWS[1]
export const DROP_Y = DECK_Y + 2 * 2.6
export const shipX = (p: number) => 170 * sms(p, 0.645, 0.69)

const PALETTE = ['#123B64', '#C9A45C', '#eef2f6', '#7f93aa', '#0d2a4a', '#3c6e9f', '#a8763b', '#1b4f82']

/* ───────────────────────── ship-to-shore gantry crane ───────────────────────── */
export function Crane({ x, range, color = '#123B64', tint = PALETTE[2] }: { x: number; range: [number, number]; color?: string; tint?: string }) {
  const m = mats()
  const trolley = useRef<THREE.Group>(null!)
  const spreader = useRef<THREE.Group>(null!)
  const cable = useRef<THREE.Group>(null!)
  const cont = useRef<THREE.Group>(null!)
  const mCargo = useMemo(() => {
    const t = ribTexture().clone()
    t.repeat.set(5, 1)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ color: tint, map: t, metalness: 0.5, roughness: 0.4 })
  }, [tint])
  useFrame(() => {
    const u = seg(S.p, range[0], range[1])
    const ySp = track(u, [[0, 22], [0.18, 2.79], [0.28, 2.79], [0.45, 22], [0.75, 22], [0.92, DROP_Y + 2.79], [1, 22]])
    const z = track(u, [[0, PICK_Z], [0.45, PICK_Z], [0.75, DROP_Z], [1, DROP_Z]])
    trolley.current.position.z = z
    spreader.current.position.y = ySp
    const len = 35 - (ySp + 0.3)
    cable.current.position.y = ySp + 0.3 + len / 2
    cable.current.scale.y = len
    // container: on quay → hangs from spreader → set on ship
    if (u < 0.28) cont.current.position.set(0, 0, PICK_Z)
    else if (u < 0.92) cont.current.position.set(0, ySp - 2.79, z)
    else cont.current.position.set(shipX(S.p), DROP_Y, DROP_Z)
  })
  const leg = (lx: number, lz: number) => (
    <group key={`${lx}${lz}`} position={[lx, 17, lz]}>
      <mesh material={m.white} scale={[1.1, 34, 1.1]} geometry={m.box} castShadow />
      <mesh material={m.gold} position={[0, -16.6, 0]} scale={[1.6, 0.6, 1.6]} geometry={m.box} />
    </group>
  )
  return (
    <group position={[x, 0, 0]}>
      {[-7.5, 7.5].map((lx) => [-2, -18].map((lz) => leg(lx, lz)))}
      {/* portal beams */}
      {[-2, -18].map((z) => (
        <mesh key={z} material={m.royal} position={[0, 33.6, z]} scale={[16.4, 1.8, 1.5]} geometry={m.box} castShadow />
      ))}
      {[-7.5, 7.5].map((lx) => (
        <mesh key={lx} material={m.royal} position={[lx, 33.6, -10]} scale={[1.5, 1.8, 17]} geometry={m.box} castShadow />
      ))}
      {[-7.5, 7.5].map((lx) => (
        <mesh key={lx} material={m.steel} position={[lx, 1.2, -10]} scale={[1.2, 0.5, 17]} geometry={m.box} />
      ))}
      {/* boom */}
      <group position={[0, 36.6, 6]}>
        <mesh material={m.royal} scale={[3.2, 3.2, 60]} geometry={m.box} castShadow />
        <mesh material={m.gold} position={[0, 1.65, 0]} scale={[3.3, 0.12, 60]} geometry={m.box} />
        <mesh material={m.gold} position={[0, 0, 30]} scale={[3.6, 3.6, 0.5]} geometry={m.box} />
      </group>
      {/* backstay */}
      <mesh material={m.white} position={[0, 40, -4]} rotation={[0.35, 0, 0]} scale={[0.6, 0.6, 30]} geometry={m.box} />
      <mesh material={m.royal} position={[0, 38, -13]} scale={[6, 4, 7]} geometry={m.box} castShadow />
      <mesh material={m.gold} position={[0, 40.2, -13]} scale={[6.1, 0.3, 7.1]} geometry={m.box} />
      {/* trolley, cables, spreader */}
      <group ref={trolley} position={[0, 0, PICK_Z]}>
        <mesh material={m.navy} position={[0, 35.4, 0]} scale={[3.6, 1.0, 3.2]} geometry={m.box} castShadow />
        <mesh material={m.gold} position={[0, 36, 0]} scale={[3.7, 0.15, 3.3]} geometry={m.box} />
        <group ref={cable}>
          {[-1.2, 1.2].map((px) =>
            [-0.8, 0.8].map((pz) => (
              <mesh key={`${px}${pz}`} material={m.steel} position={[px, 0, pz]} scale={[0.07, 1, 0.07]} geometry={m.box} />
            )),
          )}
        </group>
        <group ref={spreader}>
          <mesh material={m.dark} position={[0, 0, 0]} scale={[6.2, 0.4, 2.5]} geometry={m.box} castShadow />
          <mesh material={m.gold} position={[0, 0.22, 0]} scale={[6.3, 0.06, 2.6]} geometry={m.box} />
        </group>
      </group>
      {/* the container being moved */}
      <group ref={cont}>
        <mesh material={mCargo} position={[0, 1.295, 0]} scale={[6.0, 2.59, 2.44]} geometry={m.box} castShadow receiveShadow />
      </group>
    </group>
  )
}

/* ───────────────────────── cargo ship ───────────────────────── */
export function Ship({ L = 96, B = 15, cranesSlots = true }: { L?: number; B?: number; cranesSlots?: boolean }) {
  const m = mats()
  const hull = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-L / 2, -B / 2)
    s.lineTo(L / 2 - 24, -B / 2)
    s.quadraticCurveTo(L / 2 - 5, -B / 2, L / 2, 0)
    s.quadraticCurveTo(L / 2 - 5, B / 2, L / 2 - 24, B / 2)
    s.lineTo(-L / 2, B / 2)
    s.lineTo(-L / 2, -B / 2)
    const g = new THREE.ExtrudeGeometry(s, { depth: 9, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    g.translate(0, -8, 0)
    return g
  }, [L, B])
  const stripe = useMemo(() => {
    const s = new THREE.Shape()
    const l = L + 0.2
    const b = B + 0.2
    s.moveTo(-l / 2, -b / 2)
    s.lineTo(l / 2 - 24, -b / 2)
    s.quadraticCurveTo(l / 2 - 5, -b / 2, l / 2, 0)
    s.quadraticCurveTo(l / 2 - 5, b / 2, l / 2 - 24, b / 2)
    s.lineTo(-l / 2, b / 2)
    s.lineTo(-l / 2, -b / 2)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    g.translate(0, -3.4, 0)
    return g
  }, [L, B])
  const items = useMemo(() => {
    const out: BoxItem[] = []
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    CARGO_X.forEach((x, k) => {
      ROWS.forEach((rz, ri) => {
        for (let layer = 0; layer < 3; layer++) {
          const craneSlot = layer === 2 && ri === 1 && CRANE_COLS.includes(k)
          if (layer === 2 && (craneSlot || rnd() < 0.45)) continue
          out.push({ p: [x, DECK_Y + 1.3 + layer * 2.6, SHIP_Z * 0 + rz], s: [6.0, 2.55, 2.4], c: PALETTE[Math.floor(rnd() * PALETTE.length)] })
        }
      })
    })
    return out
  }, [])
  const cargoMat = useMemo(() => {
    const t = ribTexture().clone()
    t.repeat.set(5, 1)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ color: '#ffffff', map: t, metalness: 0.5, roughness: 0.42 })
  }, [])
  return (
    <group>
      <mesh geometry={hull} material={m.navy} castShadow receiveShadow />
      <mesh geometry={stripe} material={m.gold} />
      <mesh material={m.dark} position={[-1, DECK_Y + 0.03, 0]} scale={[L - 26, 0.08, B - 1.5]} geometry={m.box} receiveShadow />
      {/* bridge + accommodation */}
      <group position={[-L / 2 + 9, DECK_Y, 0]}>
        <mesh material={m.white} position={[0, 6, 0]} scale={[9, 12, 12]} geometry={m.box} castShadow />
        {[2.5, 5, 7.5, 10].map((y) => (
          <mesh key={y} material={m.glass} position={[4.55, y, 0]} scale={[0.1, 0.9, 10.5]} geometry={m.box} />
        ))}
        <mesh material={m.white} position={[1.4, 12.8, 0]} scale={[6, 1.6, 15.4]} geometry={m.box} castShadow />
        <mesh material={m.glass} position={[4.45, 12.9, 0]} scale={[0.1, 0.9, 15]} geometry={m.box} />
        <mesh material={m.royal} position={[-1.5, 14.6, 0]} scale={[3.4, 2.4, 4]} geometry={m.box} />
        <mesh material={m.gold} position={[-1.5, 16.1, 0]} scale={[3.5, 0.5, 4.1]} geometry={m.box} />
        <mesh material={m.steel} position={[2, 15, 0]} scale={[0.15, 5, 0.15]} geometry={m.box} />
      </group>
      <mesh material={m.gold} position={[L / 2 - 14, DECK_Y + 0.9, 0]} scale={[1.6, 1.8, 3]} geometry={m.box} />
      {/* deck cargo (instanced) */}
      <Boxes items={items} material={cargoMat} />
    </group>
  )
}

/* ───────────────────────── tiny ship for the globe ───────────────────────── */
export function MiniShip() {
  const m = mats()
  return (
    <group scale={0.045}>
      <mesh material={m.navy} position={[0, 0.6, 0]} scale={[9, 1.4, 2.6]} geometry={m.box} />
      <mesh material={m.gold} position={[0, 1.35, 0]} scale={[9.1, 0.15, 2.7]} geometry={m.box} />
      <mesh material={m.white} position={[-3.4, 2.4, 0]} scale={[1.6, 2.2, 2.2]} geometry={m.box} />
      {[-1.8, -0.4, 1, 2.4].map((x, i) => (
        <mesh key={x} position={[x, 2.0, 0]} scale={[1.2, 1.2, 2]} geometry={m.box}>
          <meshStandardMaterial color={PALETTE[i % PALETTE.length]} />
        </mesh>
      ))}
    </group>
  )
}
