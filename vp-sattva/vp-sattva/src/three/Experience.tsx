import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { BOUNDS, S, damp, type AreaKey } from '../lib/store'
import { Area } from './Area'
import { CameraRig } from './CameraRig'
import { HeroArea } from './HeroArea'
import { MapArea } from './MapArea'
import { WarehouseArea } from './WarehouseArea'
import { PortArea } from './PortArea'
import { StoryGlobeArea } from './GlobeArea'
import { BrandArea, DeliveryArea } from './FinalAreas'

interface Env {
  bg: string
  fog: string
  dens: number
  sun: string
  sunI: number
  hemi: number
  sunDir: [number, number, number]
}
const ENV: Record<AreaKey, Env> = {
  hero: { bg: '#071B33', fog: '#0b2748', dens: 0.0075, sun: '#ffd9a0', sunI: 1.7, hemi: 0.75, sunDir: [-30, 40, 30] },
  map: { bg: '#030d1c', fog: '#030d1c', dens: 0.0, sun: '#9cc3ff', sunI: 0.4, hemi: 0.5, sunDir: [0, 40, 30] },
  wh: { bg: '#0a2240', fog: '#0f2d52', dens: 0.0035, sun: '#ffe0b0', sunI: 1.1, hemi: 0.55, sunDir: [-30, 50, 40] },
  port: { bg: '#102a4b', fog: '#25446c', dens: 0.0042, sun: '#ffcf94', sunI: 2.5, hemi: 0.7, sunDir: [-70, 38, -30] },
  globe: { bg: '#02060f', fog: '#02060f', dens: 0.0, sun: '#cfe2ff', sunI: 2.2, hemi: 0.45, sunDir: [-30, 18, 30] },
  del: { bg: '#0a2240', fog: '#143258', dens: 0.0045, sun: '#ffe1ae', sunI: 1.9, hemi: 0.7, sunDir: [-40, 40, 30] },
  brand: { bg: '#030a17', fog: '#030a17', dens: 0.0, sun: '#fff0c8', sunI: 0.3, hemi: 0.35, sunDir: [10, 20, 30] },
}
const ORDER: AreaKey[] = ['hero', 'map', 'wh', 'port', 'globe', 'del', 'brand']
const areaAt = (p: number): AreaKey => {
  let i = 0
  while (i < BOUNDS.length && p >= BOUNDS[i]) i++
  return ORDER[i]
}

/** Drives shared time + smoothed scroll progress. Runs before every other frame callback. */
function Clock() {
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    S.t += d
    S.p = S.reduced ? S.target : damp(S.p, S.target, 7, d)
    if (Math.abs(S.p - S.target) < 0.00005) S.p = S.target
  }, -10)
  return null
}

function Atmosphere() {
  const { scene } = useThree()
  const sun = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const bg = useMemo(() => new THREE.Color('#071B33'), [])
  const fog = useMemo(() => new THREE.FogExp2('#0b2748', 0.007), [])
  const tmp = useMemo(() => ({ c: new THREE.Color(), off: new THREE.Vector3(), f: new THREE.Vector3() }), [])
  useMemo(() => {
    scene.background = bg
    scene.fog = fog
  }, [scene, bg, fog])
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const e = ENV[areaAt(S.p)]
    const k = 3.5
    bg.lerp(tmp.c.set(e.bg), 1 - Math.exp(-k * d))
    fog.color.lerp(tmp.c.set(e.fog), 1 - Math.exp(-k * d))
    fog.density = damp(fog.density, e.dens, k, d)
    sun.current.intensity = damp(sun.current.intensity, e.sunI, k, d)
    sun.current.color.lerp(tmp.c.set(e.sun), 1 - Math.exp(-k * d))
    hemi.current.intensity = damp(hemi.current.intensity, e.hemi, k, d)
    // keep the shadow frustum glued to what the camera is looking at
    const focus = (S as unknown as { focus?: THREE.Vector3 }).focus
    if (focus) {
      tmp.f.copy(focus)
      tmp.off.set(...e.sunDir)
      sun.current.target.position.copy(tmp.f)
      sun.current.position.copy(tmp.f).add(tmp.off)
      sun.current.target.updateMatrixWorld()
    }
  })
  const size = S.low ? 1024 : S.mobile ? 1024 : 2048
  return (
    <>
      <hemisphereLight ref={hemi} args={['#6f9ad2', '#08162b', 0.7]} />
      <directionalLight
        ref={sun}
        intensity={1.5}
        castShadow={!S.low}
        shadow-mapSize={[size, size]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {sun.current && <primitive object={sun.current.target} />}
    </>
  )
}

export default function Experience({ active, onReady }: { active: boolean; onReady: () => void }) {
  const maxDpr = S.mobile ? 1.5 : 2
  const [dpr, setDpr] = useState(S.low ? 1 : Math.min(maxDpr, 1.75))
  return (
    <Canvas
      dpr={dpr}
      shadows={!S.low}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 38, near: 0.2, far: 3000, position: [14, 3.4, 10] }}
      gl={{ antialias: !S.mobile, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        onReady()
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.25))} onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.15))} flipflops={3} />
      <Clock />
      <Atmosphere />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 7, -10]} scale={[26, 4, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.4} position={[-9, 3, 5]} scale={[8, 6, 1]} color="#8fb8ff" />
        <Lightformer form="rect" intensity={1.8} position={[9, 2, 7]} scale={[7, 4, 1]} color="#ffd9a0" />
        <Lightformer form="rect" intensity={0.8} position={[0, -3, 6]} scale={[20, 2, 1]} color="#123B64" />
      </Environment>
      <CameraRig />
      <Area k="hero">
        <HeroArea />
      </Area>
      <Area k="map">
        <MapArea />
      </Area>
      <Area k="wh">
        <WarehouseArea />
      </Area>
      <Area k="port">
        <PortArea />
      </Area>
      <Area k="globe">
        <StoryGlobeArea />
      </Area>
      <Area k="del">
        <DeliveryArea />
      </Area>
      <Area k="brand">
        <BrandArea />
      </Area>
    </Canvas>
  )
}
