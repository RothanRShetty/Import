import * as THREE from 'three'
import { useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { AREA_X, S, inArea, type AreaKey } from '../lib/store'

/** Lazily mounts an area just before it is needed, then shows/hides it by scroll range. */
export function Area({ k, children }: { k: AreaKey; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  const [mounted, setMounted] = useState(k === 'hero')
  useFrame(() => {
    if (!mounted && inArea(S.p, k, 0.1)) setMounted(true)
    g.current.visible = inArea(S.p, k)
  })
  return (
    <group ref={g} position={[AREA_X[k], 0, 0]} visible={k === 'hero'}>
      {mounted && children}
    </group>
  )
}
