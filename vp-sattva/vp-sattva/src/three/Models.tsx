import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { C, S, angDelta, clamp, lerp, seg, sms } from '../lib/store'
import { cartonTexture, glowTexture, labelTexture, ribTexture } from '../lib/textures'

type Ref<T> = MutableRefObject<T>
const sh = { castShadow: true, receiveShadow: true }

/* ───────────────────────── shared materials ───────────────────────── */
let _m: ReturnType<typeof build> | null = null
function build() {
  const std = (color: string, metalness = 0.4, roughness = 0.5, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra })
  return {
    navy: std(C.navy, 0.55, 0.32),
    royal: std(C.royal, 0.5, 0.35),
    gold: std(C.gold, 0.85, 0.28),
    white: std('#f2f5f9', 0.2, 0.5),
    dark: std('#0b1118', 0.5, 0.55),
    steel: std('#9aa6b5', 0.9, 0.3),
    tire: std('#0a0c10', 0.1, 0.85),
    glass: std('#06101c', 1, 0.06),
    wood: std('#7a5c3c', 0, 0.8),
    black: std('#05070a', 0.2, 0.6),
    skin: std('#c58c6b', 0, 0.8),
    head: new THREE.MeshBasicMaterial({ color: '#fff6d8' }),
    tail: new THREE.MeshBasicMaterial({ color: '#ff3b30' }),
    amber: new THREE.MeshBasicMaterial({ color: '#ffb020' }),
    tireGeo: new THREE.CylinderGeometry(0.55, 0.55, 0.36, 24).rotateX(Math.PI / 2),
    hubGeo: new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16).rotateX(Math.PI / 2),
    box: new THREE.BoxGeometry(1, 1, 1),
  }
}
export const mats = () => (_m ??= build())

/* ───────────────────────── instanced boxes ───────────────────────── */
export interface BoxItem {
  p: [number, number, number]
  s: [number, number, number]
  r?: number
  c?: string
}
export function Boxes({ items, material, shadow = true, frustumCulled = false }: { items: BoxItem[]; material: THREE.Material; shadow?: boolean; frustumCulled?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const m = ref.current
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.scale.set(...it.s)
      o.rotation.set(0, it.r ?? 0, 0)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.c) m.setColorAt(i, col.set(it.c))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  return <instancedMesh ref={ref} args={[mats().box, material, items.length]} castShadow={shadow} receiveShadow={shadow} frustumCulled={frustumCulled} />
}

export function Glow({ color = C.gold, size = 4, opacity = 0.8, position = [0, 0, 0] as [number, number, number] }) {
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  )
}

/* ───────────────────────── worker ───────────────────────── */
export function Worker({ carry = false, walk = 1, seated = false, phase = 0, vest = C.gold, shirt = C.royal, scale = 1 }: { carry?: boolean; walk?: number; seated?: boolean; phase?: number; vest?: string; shirt?: string; scale?: number }) {
  const m = mats()
  const lL = useRef<THREE.Group>(null!)
  const lR = useRef<THREE.Group>(null!)
  const aL = useRef<THREE.Group>(null!)
  const aR = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const shirtM = useMemo(() => new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 }), [shirt])
  const vestM = useMemo(() => new THREE.MeshStandardMaterial({ color: vest, roughness: 0.6, emissive: vest, emissiveIntensity: 0.12 }), [vest])
  useFrame(() => {
    if (seated) return
    const t = S.t * 5 + phase
    const k = walk
    lL.current.rotation.z = Math.sin(t) * 0.55 * k
    lR.current.rotation.z = -Math.sin(t) * 0.55 * k
    if (!carry) {
      aL.current.rotation.z = -Math.sin(t) * 0.5 * k
      aR.current.rotation.z = Math.sin(t) * 0.5 * k
    }
    body.current.position.y = Math.abs(Math.sin(t)) * 0.03 * k
  })
  const legY = seated ? 0.5 : 0.85
  return (
    <group scale={scale}>
      <group ref={body}>
        <group ref={lL} position={[0, legY, 0.11]} rotation={seated ? [0, 0, Math.PI / 2 - 0.1] : [0, 0, 0]}>
          <mesh material={m.navy} position={[0, -0.4, 0]} scale={[0.16, 0.8, 0.17]} geometry={m.box} />
        </group>
        <group ref={lR} position={[0, legY, -0.11]} rotation={seated ? [0, 0, Math.PI / 2 - 0.1] : [0, 0, 0]}>
          <mesh material={m.navy} position={[0, -0.4, 0]} scale={[0.16, 0.8, 0.17]} geometry={m.box} />
        </group>
        <mesh material={shirtM} position={[0, legY + 0.33, 0]} scale={[0.26, 0.62, 0.46]} geometry={m.box} />
        <mesh material={vestM} position={[0, legY + 0.36, 0]} scale={[0.29, 0.42, 0.48]} geometry={m.box} />
        <mesh material={m.skin} position={[0, legY + 0.8, 0]}>
          <sphereGeometry args={[0.125, 14, 12]} />
        </mesh>
        <mesh material={m.white} position={[0, legY + 0.84, 0]}>
          <sphereGeometry args={[0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <group ref={aL} position={[0, legY + 0.58, 0.28]} rotation={carry ? [0, 0, -1.35] : seated ? [0, 0, -1.2] : [0, 0, 0]}>
          <mesh material={shirtM} position={[0, -0.28, 0]} scale={[0.11, 0.56, 0.11]} geometry={m.box} />
        </group>
        <group ref={aR} position={[0, legY + 0.58, -0.28]} rotation={carry ? [0, 0, -1.35] : seated ? [0, 0, -1.2] : [0, 0, 0]}>
          <mesh material={shirtM} position={[0, -0.28, 0]} scale={[0.11, 0.56, 0.11]} geometry={m.box} />
        </group>
        {carry && (
          <mesh position={[0.42, legY + 0.3, 0]} scale={[0.4, 0.34, 0.5]} geometry={m.box}>
            <meshStandardMaterial map={cartonTexture()} roughness={0.9} />
          </mesh>
        )}
      </group>
    </group>
  )
}

/* ───────────────────────── container (hollow, with doors) ───────────────────────── */
export function Container({
  L = 6.06,
  W = 2.44,
  H = 2.59,
  color = C.navy,
  label = 'V&P SATTVA',
  doors,
  children,
  position,
  rotation,
}: {
  L?: number
  W?: number
  H?: number
  color?: string
  label?: string | null
  doors?: Ref<number>
  children?: ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  const m = mats()
  const { side, end, labelTex } = useMemo(() => {
    const a = ribTexture().clone()
    a.repeat.set(L / 1.2, 1)
    a.needsUpdate = true
    const b = ribTexture().clone()
    b.repeat.set(W / 1.2, 1)
    b.needsUpdate = true
    const dark = (() => { const h = { h: 0, s: 0, l: 0 }; new THREE.Color(color).getHSL(h); return h.l < 0.3 })()
    return {
      side: new THREE.MeshStandardMaterial({ color, map: a, metalness: 0.55, roughness: 0.42 }),
      end: new THREE.MeshStandardMaterial({ color, map: b, metalness: 0.55, roughness: 0.42 }),
      labelTex: label ? labelTexture(label, null, dark ? C.gold : C.navy, { w: 1024, h: 200, font: '700 110px Manrope, Arial, sans-serif', spacing: 22 }) : null,
    }
  }, [L, W, color, label])
  const lA = useRef<THREE.Group>(null!)
  const lB = useRef<THREE.Group>(null!)
  useFrame(() => {
    const a = (doors ? doors.current : 0) * 1.78
    lA.current.rotation.y = a
    lB.current.rotation.y = -a
  })
  const post = (x: number, z: number, k: string) => <mesh key={k} material={m.steel} position={[x, H / 2, z]} scale={[0.14, H, 0.14]} geometry={m.box} {...sh} />
  return (
    <group position={position} rotation={rotation}>
      <mesh material={m.wood} position={[0, 0.06, 0]} scale={[L, 0.12, W]} geometry={m.box} receiveShadow />
      <mesh material={side} position={[0, H - 0.04, 0]} scale={[L, 0.08, W]} geometry={m.box} {...sh} />
      <mesh material={side} position={[0, H / 2, W / 2 - 0.03]} scale={[L, H, 0.06]} geometry={m.box} {...sh} />
      <mesh material={side} position={[0, H / 2, -W / 2 + 0.03]} scale={[L, H, 0.06]} geometry={m.box} {...sh} />
      <mesh material={end} position={[L / 2 - 0.03, H / 2, 0]} scale={[0.06, H, W]} geometry={m.box} {...sh} />
      {post(L / 2, W / 2, 'a')}
      {post(L / 2, -W / 2, 'b')}
      {post(-L / 2, W / 2, 'c')}
      {post(-L / 2, -W / 2, 'd')}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={m.steel} position={[0, 0.08, (s * W) / 2]} scale={[L, 0.16, 0.12]} geometry={m.box} />
          <mesh material={m.steel} position={[0, H - 0.08, (s * W) / 2]} scale={[L, 0.16, 0.12]} geometry={m.box} />
        </group>
      ))}
      {labelTex && (
        <>
          <mesh position={[0, H * 0.62, W / 2 + 0.005]}>
            <planeGeometry args={[Math.min(L * 0.62, 6.2), (Math.min(L * 0.62, 6.2) * 200) / 1024]} />
            <meshBasicMaterial map={labelTex} transparent toneMapped={false} />
          </mesh>
          <mesh position={[0, H * 0.62, -W / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[Math.min(L * 0.62, 6.2), (Math.min(L * 0.62, 6.2) * 200) / 1024]} />
            <meshBasicMaterial map={labelTex} transparent toneMapped={false} />
          </mesh>
        </>
      )}
      {/* doors at -x end */}
      <group ref={lA} position={[-L / 2, 0, W / 2]}>
        <mesh material={end} position={[0, H / 2, -W / 4]} scale={[0.07, H, W / 2 - 0.02]} geometry={m.box} {...sh} />
        <mesh material={m.steel} position={[-0.05, H / 2, -W / 4 + 0.35]} scale={[0.04, H, 0.05]} geometry={m.box} />
        <mesh material={m.steel} position={[-0.05, H / 2, -W / 4 - 0.35]} scale={[0.04, H, 0.05]} geometry={m.box} />
      </group>
      <group ref={lB} position={[-L / 2, 0, -W / 2]}>
        <mesh material={end} position={[0, H / 2, W / 4]} scale={[0.07, H, W / 2 - 0.02]} geometry={m.box} {...sh} />
        <mesh material={m.steel} position={[-0.05, H / 2, W / 4 + 0.35]} scale={[0.04, H, 0.05]} geometry={m.box} />
        <mesh material={m.steel} position={[-0.05, H / 2, W / 4 - 0.35]} scale={[0.04, H, 0.05]} geometry={m.box} />
      </group>
      {children}
    </group>
  )
}

/* ───────────────────────── pallet + cartons ───────────────────────── */
export function PalletLoad({ w = 1.2, d = 1.0, h = 1.15, tint = '#ffffff' }: { w?: number; d?: number; h?: number; tint?: string }) {
  const m = mats()
  const tex = useMemo(() => {
    const t = cartonTexture().clone()
    t.repeat.set(1.5, Math.max(1, Math.round(h / 0.45) / 2))
    t.needsUpdate = true
    return t
  }, [h])
  return (
    <group>
      {[-0.4, 0, 0.4].map((z) => (
        <mesh key={z} material={m.wood} position={[0, 0.05, z * (d / 1)]} scale={[w, 0.1, 0.16]} geometry={m.box} {...sh} />
      ))}
      <mesh material={m.wood} position={[0, 0.12, 0]} scale={[w, 0.04, d]} geometry={m.box} {...sh} />
      <mesh position={[0, 0.14 + h / 2, 0]} scale={[w - 0.06, h, d - 0.06]} geometry={m.box} {...sh}>
        <meshStandardMaterial map={tex} color={tint} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.14 + h / 2, 0]} scale={[w - 0.02, h + 0.01, d - 0.02]} geometry={m.box}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.1} roughness={0.1} metalness={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ───────────────────────── forklift ───────────────────────── */
export const FORK_REACH = 1.75
export function Forklift({ fork, spin, scale = 1, children }: { fork: Ref<number>; spin: Ref<number>; scale?: number; children?: ReactNode }) {
  const m = mats()
  const carriage = useRef<THREE.Group>(null!)
  const beacon = useRef<THREE.Mesh>(null!)
  const wheels = useRef<THREE.Group[]>([])
  const wheelGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2), [])
  useFrame(() => {
    carriage.current.position.y = fork.current
    const a = -spin.current / 0.3
    for (const w of wheels.current) if (w) w.rotation.z = a
    ;(beacon.current.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(S.t * 8) > 0 ? 0xffb020 : 0x7a4a00)
  })
  const wheel = (i: number, x: number, z: number, r: number) => (
    <group key={i} position={[x, r, z]} scale={[r, r, 0.14]} ref={(o) => o && (wheels.current[i] = o)}>
      <mesh geometry={wheelGeo} material={m.tire} castShadow />
      <mesh geometry={wheelGeo} material={m.steel} scale={[0.55, 0.55, 1.05]} />
    </group>
  )
  return (
    <group scale={scale}>
      <RoundedBox args={[1.9, 0.6, 1.1]} radius={0.06} position={[-0.1, 0.6, 0]} material={m.gold} {...sh} />
      <RoundedBox args={[0.75, 0.85, 1.1]} radius={0.08} position={[-1.05, 0.8, 0]} material={m.navy} {...sh} />
      <mesh material={m.black} position={[-0.4, 1.05, 0]} scale={[0.5, 0.12, 0.55]} geometry={m.box} />
      <mesh material={m.black} position={[-0.68, 1.35, 0]} scale={[0.1, 0.5, 0.55]} geometry={m.box} />
      <mesh material={m.steel} position={[0.25, 1.15, 0]} rotation={[0, 0, -0.5]} scale={[0.04, 0.6, 0.04]} geometry={m.box} />
      <group position={[-0.28, 0.45, 0]}>
        <Worker seated scale={0.95} shirt={C.royal} />
      </group>
      {[
        [-0.9, -0.5],
        [-0.9, 0.5],
        [0.5, -0.5],
        [0.5, 0.5],
      ].map(([x, z], i) => (
        <mesh key={i} material={m.dark} position={[x, 1.45, z]} scale={[0.06, 1.2, 0.06]} geometry={m.box} />
      ))}
      <mesh material={m.navy} position={[-0.2, 2.06, 0]} scale={[1.7, 0.06, 1.15]} geometry={m.box} {...sh} />
      <mesh ref={beacon} position={[-0.9, 2.18, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#ffb020" />
      </mesh>
      {[-0.28, 0.28].map((z) => (
        <mesh key={z} material={m.steel} position={[0.98, 1.25, z]} scale={[0.1, 2.2, 0.1]} geometry={m.box} {...sh} />
      ))}
      <mesh material={m.dark} position={[0.98, 1.6, 0]} scale={[0.1, 0.1, 0.7]} geometry={m.box} />
      <group ref={carriage} position={[1.02, 0.1, 0]}>
        <mesh material={m.dark} position={[0, 0.45, 0]} scale={[0.08, 0.9, 1.0]} geometry={m.box} />
        {[-0.3, 0.3].map((z) => (
          <mesh key={z} material={m.steel} position={[0.72, 0.03, z]} scale={[1.4, 0.06, 0.13]} geometry={m.box} {...sh} />
        ))}
        <mesh material={m.steel} position={[0.04, 0.4, -0.3]} scale={[0.04, 0.8, 0.13]} geometry={m.box} />
        <mesh material={m.steel} position={[0.04, 0.4, 0.3]} scale={[0.04, 0.8, 0.13]} geometry={m.box} />
      </group>
      {wheel(0, 0.55, -0.55, 0.32)}
      {wheel(1, 0.55, 0.55, 0.32)}
      {wheel(2, -0.95, -0.5, 0.26)}
      {wheel(3, -0.95, 0.5, 0.26)}
      <mesh material={m.head} position={[0.9, 0.7, -0.4]} scale={[0.05, 0.1, 0.18]} geometry={m.box} />
      <mesh material={m.head} position={[0.9, 0.7, 0.4]} scale={[0.05, 0.1, 0.18]} geometry={m.box} />
      {children}
    </group>
  )
}

/* ───────────────────────── trip choreography for a forklift ───────────────────────── */
export interface Trip {
  x: number
  z: number
  yaw: number
  fork: number
  carrying: boolean
  pallet: { x: number; y: number; z: number; yaw: number }
  dist: number
}
export const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx)

/** One pick-and-place trip as a pure function of u∈[0,1]. H = home, PA = pallet pick-up, PD = drop. */
export function forkTrip(u: number, H: [number, number], PA: [number, number], PD: [number, number], restYaw?: number): Trip {
  const yA = yawOf(PA[0] - H[0], PA[1] - H[1])
  const yD = yawOf(PD[0] - H[0], PD[1] - H[1])
  const SA: [number, number] = [PA[0] - Math.cos(yA) * FORK_REACH, PA[1] + Math.sin(yA) * FORK_REACH]
  const SD: [number, number] = [PD[0] - Math.cos(yD) * FORK_REACH, PD[1] + Math.sin(yD) * FORK_REACH]
  const lo = 0.12
  const hi = 0.6
  let x = H[0]
  let z = H[1]
  let yaw = yA
  let fork = lo
  let dist = 0
  const mix = (a: [number, number], b: [number, number], t: number) => {
    x = lerp(a[0], b[0], t)
    z = lerp(a[1], b[1], t)
  }
  const len = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const e = (a: number, b: number) => sms(u, a, b)
  if (u < 0.2) {
    mix(H, SA, e(0, 0.2))
    dist = len(H, SA) * e(0, 0.2)
  } else if (u < 0.28) {
    mix(SA, SA, 0)
    fork = lerp(lo, hi, e(0.2, 0.28))
    dist = len(H, SA)
  } else if (u < 0.46) {
    mix(SA, H, e(0.28, 0.46))
    fork = hi
    dist = len(H, SA) - len(SA, H) * e(0.28, 0.46)
  } else if (u < 0.54) {
    mix(H, H, 0)
    fork = hi
    yaw = yA + angDelta(yA, yD) * e(0.46, 0.54)
  } else if (u < 0.74) {
    mix(H, SD, e(0.54, 0.74))
    yaw = yD
    fork = hi
    dist = len(H, SD) * e(0.54, 0.74)
  } else if (u < 0.8) {
    mix(SD, SD, 0)
    yaw = yD
    fork = lerp(hi, lo, e(0.74, 0.8))
    dist = len(H, SD)
  } else if (u < 0.95) {
    mix(SD, H, e(0.8, 0.95))
    yaw = yD
    dist = len(H, SD) - len(SD, H) * e(0.8, 0.95)
  } else {
    mix(H, H, 0)
    yaw = yD + angDelta(yD, restYaw ?? yA) * e(0.95, 1)
  }
  const carrying = u >= 0.28 && u < 0.78
  const f = { x: Math.cos(yaw), z: -Math.sin(yaw) }
  let pallet = { x: PA[0], y: 0, z: PA[1], yaw: yA }
  if (carrying) pallet = { x: x + f.x * FORK_REACH, y: fork, z: z + f.z * FORK_REACH, yaw }
  else if (u >= 0.78) pallet = { x: PD[0], y: 0, z: PD[1], yaw: yD }
  return { x, z, yaw, fork, carrying, pallet, dist }
}

/* ───────────────────────── truck ───────────────────────── */
export function Truck({ spin, doors, children, paint = '#0d3157', lights = true, cargoColor = C.navy }: { spin: Ref<number>; doors?: Ref<number>; children?: ReactNode; paint?: string; lights?: boolean; cargoColor?: string }) {
  const m = mats()
  const wheels = useRef<THREE.Group[]>([])
  const body = useRef<THREE.Group>(null!)
  const paintM = useMemo(() => new THREE.MeshStandardMaterial({ color: paint, metalness: 0.7, roughness: 0.22 }), [paint])
  useFrame(() => {
    const a = -spin.current / 0.55
    for (const w of wheels.current) if (w) w.rotation.z = a
    body.current.rotation.z = Math.sin(S.t * 2.1) * 0.0035
    body.current.position.y = Math.sin(S.t * 3.3) * 0.006
  })
  const wheel = (i: number, x: number, z: number) => (
    <group key={i} position={[x, 0.55, z]} ref={(o) => o && (wheels.current[i] = o)}>
      <mesh geometry={m.tireGeo} material={m.tire} castShadow />
      <mesh geometry={m.hubGeo} material={m.steel} scale={[1, 1, 0.9]} />
    </group>
  )
  let wi = 0
  const w: ReturnType<typeof wheel>[] = []
  w.push(wheel(wi++, 4.25, 1.05), wheel(wi++, 4.25, -1.05))
  for (const x of [-0.2, -1.5]) for (const z of [0.78, 1.16, -0.78, -1.16]) w.push(wheel(wi++, x, z))
  for (const x of [-8.4, -9.7]) for (const z of [0.78, 1.16, -0.78, -1.16]) w.push(wheel(wi++, x, z))
  return (
    <group ref={body}>
      {w}
      {/* chassis */}
      <mesh material={m.dark} position={[1.4, 0.95, 0]} scale={[8.2, 0.34, 1.1]} geometry={m.box} {...sh} />
      <mesh material={m.dark} position={[-4.6, 1.02, 0]} scale={[11.8, 0.26, 2.3]} geometry={m.box} {...sh} />
      <mesh material={m.steel} position={[0.9, 1.2, 0]} scale={[1.5, 0.1, 1.7]} geometry={m.box} />
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={m.steel} position={[2.4, 0.95, s * 1.16]} rotation={[0, 0, Math.PI / 2]} {...sh}>
            <cylinderGeometry args={[0.32, 0.32, 1.5, 14]} />
          </mesh>
          <mesh material={m.dark} position={[-0.85, 1.42, s * 1.0]} scale={[2.3, 0.07, 0.6]} geometry={m.box} />
          <mesh material={m.dark} position={[-9.05, 1.42, s * 1.0]} scale={[2.3, 0.07, 0.6]} geometry={m.box} />
          <mesh material={m.tail} position={[-10.72, 1.05, s * 1.0]} scale={[0.06, 0.2, 0.34]} geometry={m.box} />
        </group>
      ))}
      {/* cab */}
      <RoundedBox args={[2.3, 2.7, 2.5]} radius={0.14} position={[4.0, 2.45, 0]} material={paintM} {...sh} />
      <RoundedBox args={[2.0, 0.85, 2.3]} radius={0.12} position={[2.75, 4.1, 0]} rotation={[0, 0, -0.22]} material={paintM} {...sh} />
      <mesh material={m.glass} position={[5.15, 3.2, 0]} rotation={[0, 0, -0.1]} scale={[0.06, 1.2, 2.2]} geometry={m.box} />
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={m.glass} position={[4.15, 3.2, s * 1.26]} scale={[1.2, 1.0, 0.04]} geometry={m.box} />
          <mesh material={m.gold} position={[4.0, 2.3, s * 1.27]} scale={[2.28, 0.09, 0.02]} geometry={m.box} />
          <mesh material={m.gold} position={[4.0, 2.05, s * 1.27]} scale={[2.28, 0.03, 0.02]} geometry={m.box} />
          <mesh material={m.dark} position={[5.0, 3.35, s * 1.5]} scale={[0.14, 0.6, 0.1]} geometry={m.box} />
          <mesh material={lights ? m.head : m.dark} position={[5.17, 1.6, s * 0.95]} scale={[0.06, 0.26, 0.55]} geometry={m.box} />
        </group>
      ))}
      <mesh material={m.black} position={[5.17, 1.9, 0]} scale={[0.08, 1.0, 1.4]} geometry={m.box} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={m.gold} position={[5.22, 1.55 + i * 0.22, 0]} scale={[0.04, 0.05, 1.35]} geometry={m.box} />
      ))}
      <mesh material={m.steel} position={[5.35, 0.85, 0]} scale={[0.34, 0.38, 2.55]} geometry={m.box} {...sh} />
      <mesh material={m.gold} position={[5.18, 2.75, 0]} scale={[0.04, 0.1, 1.6]} geometry={m.box} />
      {lights && <pointLight position={[7, 1.5, 0]} intensity={14} distance={16} color="#ffe9b8" />}
      {/* cargo */}
      <Container position={[-4.6, 1.2, 0]} L={12.19} color={cargoColor} doors={doors}>
        {children}
      </Container>
    </group>
  )
}
