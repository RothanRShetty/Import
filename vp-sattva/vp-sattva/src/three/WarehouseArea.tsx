import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { C, S, lerp, seg, sms } from '../lib/store'
import { beltTexture, cartonTexture, labelTexture, markingsTexture } from '../lib/textures'
import { Boxes, Container, FORK_REACH, Forklift, PalletLoad, Worker, forkTrip, mats, yawOf, type BoxItem } from './Models'

/* choreography windows (story progress) */
export const WH = {
  open: [0.275, 0.33] as const,
  cOpen: [0.385, 0.405] as const,
  load: [0.405, 0.46] as const,
  f1: [0.458, 0.49] as const,
  f2: [0.49, 0.518] as const,
  close: [0.518, 0.53] as const,
}
const K = 30
const BELT_X = -5
const BELT_LEN = 26
const CONT_Z = -41.7
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const slotPos = (k: number): [number, number, number] => {
  const layer = Math.floor(k / 21)
  const j = k % 21
  return [((j % 3) - 1) * 0.8, 0.12 + 0.3 + layer * 0.62, -47.15 + Math.floor(j / 3) * 0.88]
}
const beltD = (p: number) => 1.8 * seg(p, 0.255, 0.385) + 56 * seg(p, WH.load[0], WH.load[1])

function Walker({ path, carry = false, phase = 0, walk = 1 }: { path: (t: number) => [number, number, number]; carry?: boolean; phase?: number; walk?: number }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    const [x, z, yaw] = path(S.t + S.p * 40)
    g.current.position.set(x, 0, z)
    g.current.rotation.y = yaw
  })
  return (
    <group ref={g}>
      <Worker carry={carry} phase={phase} walk={walk} />
    </group>
  )
}
const pingpong = (a: [number, number], b: [number, number], speed: number, off = 0) => (t: number): [number, number, number] => {
  const ph = t * speed + off
  const s = 0.5 - 0.5 * Math.cos(ph)
  const fwd = Math.sin(ph) >= 0
  return [lerp(a[0], b[0], s), lerp(a[1], b[1], s), fwd ? yawOf(b[0] - a[0], b[1] - a[1]) : yawOf(a[0] - b[0], a[1] - b[1])]
}

function Conveyor({ x, z0, z1, drive }: { x: number; z0: number; z1: number; drive: () => number }) {
  const m = mats()
  const len = Math.abs(z1 - z0)
  const zc = (z0 + z1) / 2
  const tex = useMemo(() => {
    const t = beltTexture().clone()
    t.repeat.set(1, len / 1.1)
    t.needsUpdate = true
    return t
  }, [len])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.1 }), [tex])
  useFrame(() => {
    tex.offset.y = -drive() / 1.1
  })
  return (
    <group position={[x, 0, zc]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.9, 0]} material={mat} receiveShadow>
        <planeGeometry args={[1.0, len]} />
      </mesh>
      {[-0.55, 0.55].map((px) => (
        <mesh key={px} material={m.gold} position={[px, 0.82, 0]} scale={[0.08, 0.28, len]} geometry={m.box} />
      ))}
      <mesh material={m.dark} position={[0, 0.7, 0]} scale={[0.95, 0.12, len]} geometry={m.box} />
      {Array.from({ length: Math.floor(len / 3) + 1 }, (_, i) => (
        <group key={i} position={[0, 0, -len / 2 + i * 3]}>
          {[-0.45, 0.45].map((px) => (
            <mesh key={px} material={m.steel} position={[px, 0.35, 0]} scale={[0.08, 0.7, 0.08]} geometry={m.box} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** Cartons that travel on belt B and then slide into the open container. */
function LoadingCartons() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const o = useMemo(() => new THREE.Object3D(), [])
  const slots = useMemo(() => Array.from({ length: K }, (_, i) => slotPos(i)), [])
  useLayoutEffect(() => {
    const col = new THREE.Color()
    const r = rng(5)
    for (let i = 0; i < K; i++) ref.current.setColorAt(i, col.set(r() > 0.75 ? '#e9edf2' : r() > 0.5 ? '#d6b98c' : '#ffffff'))
    ref.current.instanceColor!.needsUpdate = true
  }, [])
  useFrame(() => {
    const D = beltD(S.p)
    for (let i = 0; i < K; i++) {
      const s = 24 - 1.2 * i + D
      const sl = slots[i]
      let x = BELT_X
      let y = 1.24
      let z = -8 - s
      if (s < 0) {
        o.scale.setScalar(0.0001)
      } else {
        o.scale.set(0.6, 0.6, 0.8)
        if (s > BELT_LEN) {
          const E = [BELT_X, 1.24, -8 - BELT_LEN]
          const Dr = [0, 0.7, -35.9]
          const l1 = Math.hypot(Dr[0] - E[0], Dr[2] - E[2])
          const l2 = Math.hypot(sl[0] - Dr[0], sl[2] - Dr[2])
          const d = s - BELT_LEN
          if (d < l1) {
            const t = d / l1
            x = lerp(E[0], Dr[0], t)
            y = lerp(E[1], Dr[1], t)
            z = lerp(E[2], Dr[2], t)
          } else {
            const t = Math.min(1, (d - l1) / l2)
            x = lerp(Dr[0], sl[0], t)
            y = lerp(Dr[1], sl[1], t) + Math.sin(Math.PI * t) * (sl[1] > 0.6 ? 0.45 : 0)
            z = lerp(Dr[2], sl[2], t)
          }
        }
      }
      o.position.set(x, y, z)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[mats().box, undefined, K]} castShadow frustumCulled={false}>
      <meshStandardMaterial map={cartonTexture()} roughness={0.85} />
    </instancedMesh>
  )
}

/** Cartons looping on belt A (warehouse operations). */
function LoopingCartons({ x, z0, len, n }: { x: number; z0: number; len: number; n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const o = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    const col = new THREE.Color()
    const r = rng(9)
    for (let i = 0; i < n; i++) ref.current.setColorAt(i, col.set(r() > 0.7 ? '#e9edf2' : '#ffffff'))
    ref.current.instanceColor!.needsUpdate = true
  }, [n])
  useFrame(() => {
    const ph = S.t * 0.9 + S.p * 40
    for (let i = 0; i < n; i++) {
      const s = (i * (len / n) + ph) % len
      const h = 0.4 + ((i * 37) % 5) * 0.08
      o.position.set(x, 0.94 + h / 2, z0 - s)
      o.scale.set(0.6, h, 0.55 + ((i * 13) % 4) * 0.08)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[mats().box, undefined, n]} castShadow frustumCulled={false}>
      <meshStandardMaterial map={cartonTexture()} roughness={0.85} />
    </instancedMesh>
  )
}

function Racks() {
  const m = mats()
  const { ups, beams, cartons } = useMemo(() => {
    const r = rng(21)
    const ups: BoxItem[] = []
    const beams: BoxItem[] = []
    const cartons: BoxItem[] = []
    const levels = [0.9, 3.0, 5.1, 7.2]
    const pal = ['#d6b98c', '#c9a679', '#eef2f6', '#123B64', '#e7d2ad', '#ffffff', '#C9A45C']
    for (const x0 of [-17, -12.5, 12.5, 17]) {
      for (let j = 0; j <= 15; j++) {
        const z = -8 - 2.6 * j
        for (const dx of [-0.55, 0.55]) ups.push({ p: [x0 + dx, 4.3, z], s: [0.12, 8.6, 0.12] })
      }
      for (let k = 0; k < 15; k++) {
        const zc = -9.3 - 2.6 * k
        for (const lv of levels) {
          for (const dx of [-0.5, 0.5]) beams.push({ p: [x0 + dx, lv, zc], s: [0.1, 0.16, 2.6] })
          const nC = 2 + Math.floor(r() * 2)
          for (let c = 0; c < nC; c++) {
            const h = 0.5 + r() * 1.1
            const w = 0.8 + r() * 0.2
            cartons.push({ p: [x0 + (r() - 0.5) * 0.15, lv + 0.08 + h / 2, zc + (c - (nC - 1) / 2) * (2.4 / nC)], s: [w, h, (2.3 / nC) * 0.92], c: pal[Math.floor(r() * pal.length)] })
          }
        }
      }
    }
    return { ups, beams, cartons }
  }, [])
  const cartonMat = useMemo(() => new THREE.MeshStandardMaterial({ map: cartonTexture(), roughness: 0.85 }), [])
  return (
    <group>
      <Boxes items={ups} material={m.royal} shadow={false} />
      <Boxes items={beams} material={m.gold} shadow={false} />
      <Boxes items={cartons} material={cartonMat} shadow={false} />
    </group>
  )
}

function Shell({ children }: { children?: ReactNode }) {
  const m = mats()
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfd8e3', metalness: 0.25, roughness: 0.55 }), [])
  const floorTex = useMemo(() => {
    const t = markingsTexture().clone()
    t.repeat.set(8, 10)
    t.needsUpdate = true
    return t
  }, [])
  const sign = useMemo(() => labelTexture('V&P SATTVA', C.navy, C.gold, { w: 1400, h: 220, font: '700 130px Manrope, Arial, sans-serif', spacing: 34 }), [])
  const beamItems = useMemo<BoxItem[]>(() => Array.from({ length: 9 }, (_, i) => ({ p: [0, 11.5, -4 - i * 5.8], s: [40, 0.45, 0.5] })), [])
  const lightItems = useMemo<BoxItem[]>(() => {
    const out: BoxItem[] = []
    for (const x of [-12, -4, 4, 12]) for (let i = 0; i < 6; i++) out.push({ p: [x, 11.2, -7 - i * 8], s: [0.5, 0.1, 5] })
    return out
  }, [])
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff4dc', toneMapped: false }), [])
  return (
    <group>
      {/* floor + apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -26]} receiveShadow>
        <planeGeometry args={[40, 52]} />
        <meshStandardMaterial map={floorTex} color="#9db2cb" metalness={0.45} roughness={0.28} />
      </mesh>
      {[-9, 9].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -26]}>
          <planeGeometry args={[0.18, 50]} />
          <meshBasicMaterial color={C.gold} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 40]} receiveShadow>
        <planeGeometry args={[220, 240]} />
        <meshStandardMaterial color="#13273f" roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, -100]}>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#071a30" roughness={1} />
      </mesh>
      {/* walls */}
      <mesh material={wall} position={[-13.75, 6, 0]} scale={[12.5, 12, 0.5]} geometry={m.box} castShadow receiveShadow />
      <mesh material={wall} position={[13.75, 6, 0]} scale={[12.5, 12, 0.5]} geometry={m.box} castShadow receiveShadow />
      <mesh material={wall} position={[0, 10.25, 0]} scale={[15, 3.5, 0.5]} geometry={m.box} castShadow />
      <mesh material={m.navy} position={[0, 0.7, 0.01]} scale={[40.2, 1.4, 0.56]} geometry={m.box} />
      <mesh material={m.gold} position={[0, 11.75, 0.02]} scale={[40.3, 0.35, 0.6]} geometry={m.box} />
      <mesh position={[0, 10.1, 0.28]}>
        <planeGeometry args={[13, 2.05]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <mesh material={wall} position={[-20, 6, -26]} scale={[0.5, 12, 52]} geometry={m.box} castShadow receiveShadow />
      <mesh material={wall} position={[20, 6, -26]} scale={[0.5, 12, 52]} geometry={m.box} castShadow receiveShadow />
      <mesh material={wall} position={[0, 6, -52]} scale={[40.5, 12, 0.5]} geometry={m.box} receiveShadow />
      <mesh material={m.navy} position={[0, 12.3, -26]} scale={[41.5, 0.6, 53.5]} geometry={m.box} castShadow />
      <Boxes items={beamItems} material={m.dark} shadow={false} />
      <Boxes items={lightItems} material={lightMat} shadow={false} />
      {children}
    </group>
  )
}

export function WarehouseArea() {
  const m = mats()
  const doorL = useRef<THREE.Mesh>(null!)
  const doorR = useRef<THREE.Mesh>(null!)
  const doors = useRef(0)
  const scan = useRef<THREE.Mesh>(null!)
  const f1 = useRef<THREE.Group>(null!)
  const f2 = useRef<THREE.Group>(null!)
  const f3 = useRef<THREE.Group>(null!)
  const p1 = useRef<THREE.Group>(null!)
  const p2 = useRef<THREE.Group>(null!)
  const fork1 = useRef(1.25)
  const fork2 = useRef(0.12)
  const fork3 = useRef(0.12)
  const spin1 = useRef(0)
  const spin2 = useRef(0)
  const spin3 = useRef(0)
  const H: [number, number] = [0, -31]
  const trip1 = { PA: [8.5, -31] as [number, number], PD: [0, -40.2] as [number, number] }
  const trip2 = { PA: [11.5, -31] as [number, number], PD: [0, -38.6] as [number, number] }
  const wallDoorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.navy, metalness: 0.6, roughness: 0.3 }), [])

  useFrame(() => {
    const p = S.p
    const dOpen = sms(p, WH.open[0], WH.open[1])
    doorL.current.position.x = -3.75 - dOpen * 7.4
    doorR.current.position.x = 3.75 + dOpen * 7.4
    doors.current = sms(p, WH.cOpen[0], WH.cOpen[1]) - sms(p, WH.close[0], WH.close[1])
    scan.current.position.x = 5 + Math.sin(S.t * 2.2) * 0.0
    ;(scan.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.abs(Math.sin(S.t * 3)) * 0.25

    // ambient forklifts in the racking aisles
    const a1 = S.t * 0.35 + S.p * 30
    f1.current.position.set(15, 0, -28 + 15 * Math.sin(a1))
    f1.current.rotation.y = Math.cos(a1) > 0 ? -Math.PI / 2 : Math.PI / 2
    spin1.current = a1 * 15 * 0.64
    const a2 = S.t * 0.28 + S.p * 26 + 2
    f2.current.position.set(-15, 0, -28 + 15 * Math.sin(a2))
    f2.current.rotation.y = Math.cos(a2) > 0 ? -Math.PI / 2 : Math.PI / 2
    spin2.current = a2 * 15 * 0.64

    // loading forklift (two trips)
    const u1 = seg(p, WH.f1[0], WH.f1[1])
    const u2 = seg(p, WH.f2[0], WH.f2[1])
    const t1 = forkTrip(u1, H, trip1.PA, trip1.PD)
    const t2 = forkTrip(u2, H, trip2.PA, trip2.PD)
    const act = p < WH.f2[0] ? t1 : t2
    f3.current.position.set(act.x, 0, act.z)
    f3.current.rotation.y = act.yaw
    fork3.current = act.fork
    spin3.current = act.dist
    p1.current.position.set(t1.pallet.x, t1.pallet.y, t1.pallet.z)
    p1.current.rotation.y = t1.pallet.yaw
    p2.current.position.set(t2.pallet.x, t2.pallet.y, t2.pallet.z)
    p2.current.rotation.y = t2.pallet.yaw
  })

  const D = () => beltD(S.p)

  return (
    <group>
      <Shell />
      {/* sliding doors */}
      <mesh ref={doorL} material={wallDoorMat} position={[-3.75, 4.25, 0.45]} scale={[7.5, 8.5, 0.25]} geometry={m.box} castShadow>
        <mesh material={m.gold} position={[0.4, 0, 0.55]} scale={[0.01, 1, 0.1]} geometry={m.box} />
      </mesh>
      <mesh ref={doorR} material={wallDoorMat} position={[3.75, 4.25, 0.45]} scale={[7.5, 8.5, 0.25]} geometry={m.box} castShadow>
        <mesh material={m.gold} position={[-0.4, 0, 0.55]} scale={[0.01, 1, 0.1]} geometry={m.box} />
      </mesh>
      {/* lights inside */}
      {(S.low ? [-26] : [-10, -26, -42]).map((z) => [-9, 9].map((x) => <pointLight key={`${x}${z}`} position={[x, 9, z]} intensity={S.low ? 90 : 55} distance={34} decay={2} color="#fff0d6" />))}
      <Racks />
      {/* belts and cartons */}
      <Conveyor x={BELT_X} z0={-8} z1={-8 - BELT_LEN} drive={D} />
      <LoadingCartons />
      <Conveyor x={5} z0={-8} z1={-26} drive={() => S.t * 0.9 + S.p * 40} />
      <LoopingCartons x={5} z0={-8} len={18} n={12} />
      {/* scanning arch on belt A */}
      <group position={[5, 0, -17]}>
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} material={m.royal} position={[x, 1.25, 0]} scale={[0.14, 2.5, 0.2]} geometry={m.box} castShadow />
        ))}
        <mesh material={m.royal} position={[0, 2.5, 0]} scale={[2.1, 0.2, 0.3]} geometry={m.box} />
        <mesh material={m.gold} position={[0, 2.62, 0]} scale={[2.1, 0.05, 0.32]} geometry={m.box} />
        <mesh ref={scan} position={[0, 1.7, 0]}>
          <planeGeometry args={[1.8, 1.5]} />
          <meshBasicMaterial color="#4dffc0" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      {/* inspection table */}
      <group position={[10, 0, -14]}>
        <mesh material={m.steel} position={[0, 0.9, 0]} scale={[2.6, 0.08, 1.1]} geometry={m.box} castShadow />
        {[-1.1, 1.1].map((x) => [-0.4, 0.4].map((z) => <mesh key={`${x}${z}`} material={m.dark} position={[x, 0.45, z]} scale={[0.08, 0.9, 0.08]} geometry={m.box} />))}
        <mesh position={[-0.4, 1.25, 0]} scale={[0.6, 0.6, 0.6]} geometry={m.box} castShadow>
          <meshStandardMaterial map={cartonTexture()} />
        </mesh>
        <mesh material={m.white} position={[0.5, 0.96, 0]} scale={[0.5, 0.02, 0.35]} geometry={m.box} />
        <group position={[0, 0, 0.95]} rotation={[0, -Math.PI / 2, 0]}>
          <Worker walk={0} phase={1} />
        </group>
        <group position={[-1.5, 0, 0]} rotation={[0, 0, 0]}>
          <Worker walk={0} phase={2} />
        </group>
      </group>
      <Walker path={pingpong([8, -20], [8, -30], 0.35, 0)} carry phase={0.5} />
      <Walker path={pingpong([-15, -12], [-15, -40], 0.22, 1.2)} phase={2} />
      <Walker path={pingpong([-5, -6], [3, -6], 0.4, 0.4)} carry phase={3.2} />
      <Walker path={pingpong([-8, -33], [-3, -33], 0.5, 2)} phase={1} />
      {/* forklifts */}
      <group ref={f1}>
        <Forklift fork={fork1} spin={spin1}>
          <group position={[FORK_REACH, 1.3, 0]}>
            <PalletLoad />
          </group>
        </Forklift>
      </group>
      <group ref={f2}>
        <Forklift fork={fork2} spin={spin2} />
      </group>
      <group ref={f3}>
        <Forklift fork={fork3} spin={spin3} />
      </group>
      {/* pallets (choreographed) */}
      <group ref={p1}>
        <PalletLoad />
      </group>
      <group ref={p2}>
        <PalletLoad tint="#f3e9d8" />
      </group>
      {/* container + chute */}
      <Container position={[0, 0, CONT_Z]} rotation={[0, Math.PI / 2, 0]} L={12.19} color={C.royal} doors={doors}>
        <pointLight position={[3, 2.1, 0]} intensity={7} distance={9} color="#ffe6b8" />
      </Container>
      <group position={[-2.5, 0.78, -34.95]} rotation={[0, 0.363, 0]}>
        <mesh rotation={[0, 0, -0.084]} material={m.steel} scale={[5.4, 0.06, 1.1]} geometry={m.box} />
      </group>
    </group>
  )
}
