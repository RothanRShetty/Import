import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

function make(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const hit = cache.get(key)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(cv)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  cache.set(key, t)
  return t
}

export function labelTexture(text: string, bg: string | null, fg: string, opts: { w?: number; h?: number; font?: string; spacing?: number } = {}) {
  const { w = 1024, h = 256, font = '600 120px Manrope, Arial, sans-serif', spacing = 18 } = opts
  return make(`label:${text}:${bg}:${fg}:${w}x${h}:${font}`, w, h, (c) => {
    if (bg) {
      c.fillStyle = bg
      c.fillRect(0, 0, w, h)
    } else c.clearRect(0, 0, w, h)
    c.fillStyle = fg
    c.font = font
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    ;(c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`
    c.fillText(text, w / 2 + spacing / 2, h / 2 + 6)
  })
}

export function glowTexture() {
  return make('glow', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
  })
}

/** Corrugated steel look (vertical ribs). Tinted by material colour. */
export function ribTexture() {
  const t = make('ribs', 128, 32, (c, w, h) => {
    for (let i = 0; i < 16; i++) {
      const g = c.createLinearGradient(i * 8, 0, i * 8 + 8, 0)
      g.addColorStop(0, '#9aa0a8')
      g.addColorStop(0.5, '#ffffff')
      g.addColorStop(1, '#8a9099')
      c.fillStyle = g
      c.fillRect(i * 8, 0, 8, h)
    }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Cardboard stack with tape lines; carton grid repeated 3 x 3. */
export function cartonTexture() {
  const t = make('carton', 256, 256, (c, w, h) => {
    c.fillStyle = '#c8a679'
    c.fillRect(0, 0, w, h)
    const n = 2
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (i * w) / n
        const y = (j * h) / n
        const g = c.createLinearGradient(x, y, x + w / n, y + h / n)
        g.addColorStop(0, i % 2 ? '#d2b184' : '#c29f70')
        g.addColorStop(1, '#b9946a')
        c.fillStyle = g
        c.fillRect(x + 3, y + 3, w / n - 6, h / n - 6)
        c.fillStyle = 'rgba(245,235,215,0.9)'
        c.fillRect(x + w / n / 2 - 7, y + 3, 14, h / n - 6)
        c.fillStyle = 'rgba(7,27,51,0.8)'
        c.fillRect(x + 14, y + h / n - 34, 34, 18)
      }
    }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Steel truss lattice on transparent bg for crane booms. */
export function latticeTexture() {
  const t = make('lattice', 256, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    c.strokeStyle = '#ffffff'
    c.lineWidth = 5
    c.strokeRect(2, 2, w - 4, h - 4)
    c.lineWidth = 4
    const step = 32
    c.beginPath()
    for (let x = 0; x < w; x += step) {
      c.moveTo(x, h)
      c.lineTo(x + step / 2, 0)
      c.lineTo(x + step, h)
    }
    c.stroke()
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function asphaltTexture() {
  const t = make('asphalt', 256, 256, (c, w, h) => {
    c.fillStyle = '#10161f'
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      const v = 18 + Math.random() * 28
      c.fillStyle = `rgba(${v},${v + 4},${v + 10},${0.35 + Math.random() * 0.4})`
      c.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function concreteTexture() {
  const t = make('concrete', 256, 256, (c, w, h) => {
    c.fillStyle = '#2a3a4e'
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 2000; i++) {
      const v = 50 + Math.random() * 40
      c.fillStyle = `rgba(${v},${v + 12},${v + 28},0.25)`
      c.fillRect(Math.random() * w, Math.random() * h, 3, 3)
    }
    c.strokeStyle = 'rgba(255,255,255,0.07)'
    c.lineWidth = 2
    c.strokeRect(0, 0, w, h)
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function beltTexture() {
  const t = make('belt', 64, 64, (c, w, h) => {
    c.fillStyle = '#12161c'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = '#3b4656'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(0, h * 0.55)
    c.lineTo(w / 2, h * 0.35)
    c.lineTo(w, h * 0.55)
    c.stroke()
    c.fillStyle = '#1b2230'
    c.fillRect(0, h - 4, w, 4)
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function markingsTexture() {
  return make('floor', 512, 512, (c, w, h) => {
    c.fillStyle = '#3b4d63'
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 6000; i++) {
      const v = 60 + Math.random() * 40
      c.fillStyle = `rgba(${v},${v + 14},${v + 30},0.18)`
      c.fillRect(Math.random() * w, Math.random() * h, 3, 3)
    }
    c.strokeStyle = 'rgba(255,255,255,0.08)'
    c.lineWidth = 2
    c.strokeRect(0, 0, w, h)
  })
}
