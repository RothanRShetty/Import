import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { GlobeModel, Stars, type GlobeCtl } from '../three/GlobeArea'
import { HUBS } from '../lib/geo'
import { S } from '../lib/store'

function Tick() {
  useFrame((_, dt) => {
    S.t += Math.min(dt, 0.05)
  })
  return null
}

export default function NetworkGlobe({ focus }: { focus: number | null }) {
  const ctl = useRef<GlobeCtl>({ dx: 0, dy: 0, active: false, focus: null })
  const last = useRef<[number, number] | null>(null)
  useEffect(() => {
    ctl.current.focus = focus === null ? null : [HUBS[focus].lon, HUBS[focus].lat]
  }, [focus])
  return (
    <Canvas
      dpr={[1, S.mobile ? 1.5 : 2]}
      camera={{ fov: 34, position: [0, 0, 31] }}
      gl={{ antialias: true, alpha: true }}
      style={{ cursor: 'grab', touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        ctl.current.active = true
        ctl.current.focus = null
        last.current = [e.clientX, e.clientY]
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!ctl.current.active || !last.current) return
        const [lx, ly] = last.current
        ctl.current.dx += (e.clientX - lx) * 0.006
        ctl.current.dy += (e.clientY - ly) * 0.006
        last.current = [e.clientX, e.clientY]
      }}
      onPointerUp={() => {
        ctl.current.active = false
        last.current = null
      }}
      onPointerLeave={() => {
        ctl.current.active = false
      }}
    >
      <Tick />
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 20]} intensity={1.4} />
      <Stars n={600} r={120} />
      <GlobeModel radius={10} arcs ctl={ctl} />
    </Canvas>
  )
}
