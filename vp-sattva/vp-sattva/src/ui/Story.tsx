import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { B, BOUNDS, CHAPTERS, S, clamp, sm, veilAmount } from '../lib/store'
import { Logo } from './Logo'
import { WHATSAPP_URL } from './config'

gsap.registerPlugin(ScrollTrigger)
const Experience = lazy(() => import('../three/Experience'))

interface Cap {
  a: number
  b: number
  text: string
  sub?: string
  align?: 'left' | 'right' | 'center'
  index: string
}
const CAPS: Cap[] = [
  { a: 0.145, b: 0.245, index: '01 — Global Sourcing', text: 'Everything begins with the right connection.', sub: 'Trusted suppliers across continents, brought into one seamless chain.', align: 'left' },
  { a: 0.29, b: 0.385, index: '02 — Warehouse Operations', text: 'Precision at every step.', sub: 'Inspected, counted and prepared before anything leaves the floor.', align: 'left' },
  { a: 0.425, b: 0.525, index: '03 — Packaging & Loading', text: 'Every shipment, handled with care.', sub: 'Palletised, sealed and secured for the long journey.', align: 'right' },
  { a: 0.555, b: 0.68, index: '04 — Port & Shipping', text: 'Connecting businesses across borders.', sub: 'From quayside to vessel, coordinated to the minute.', align: 'left' },
  { a: 0.705, b: 0.805, index: '05 — Global Transportation', text: 'Across oceans. Beyond boundaries.', sub: 'Every route planned. Every milestone tracked.', align: 'left' },
  { a: 0.835, b: 0.915, index: '06 — Final Delivery', text: 'From origin to destination. Seamlessly.', sub: 'Unloaded, verified and delivered to your door.', align: 'right' },
]

export function useCapabilities() {
  const [state, setState] = useState<{ webgl: boolean; reduced: boolean; low: boolean; mobile: boolean }>({ webgl: true, reduced: false, low: false, mobile: false })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 820px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent)
    const nav = navigator as Navigator & { deviceMemory?: number }
    const low = (nav.hardwareConcurrency ?? 8) <= 3 || (nav.deviceMemory ?? 8) <= 2
    let webgl = false
    try {
      const c = document.createElement('canvas')
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch {
      webgl = false
    }
    const force = new URLSearchParams(location.search)
    S.mobile = mobile
    S.low = low || force.get('quality') === 'low'
    S.reduced = reduced
    setState({ webgl: webgl && force.get('fallback') !== '1', reduced, low: S.low, mobile })
    setReady(true)
  }, [])
  return { ...state, ready }
}

export default function Story({ caps }: { caps: ReturnType<typeof useCapabilities> }) {
  const wrap = useRef<HTMLDivElement>(null)
  const heroTxt = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const capEls = useRef<(HTMLDivElement | null)[]>([])
  const brandEl = useRef<HTMLDivElement>(null)
  const loader = useRef<HTMLDivElement>(null)
  const [ready3d, setReady3d] = useState(false)
  const use3d = caps.ready && caps.webgl && !caps.reduced

  useEffect(() => {
    if (!use3d || !wrap.current) return
    const st = ScrollTrigger.create({
      trigger: wrap.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        S.target = self.progress
      },
    })
    S.target = st.progress
    S.p = st.progress
    let raf = 0
    const tick = () => {
      const p = S.p
      // hero copy
      if (heroTxt.current) {
        const o = 1 - clamp(p / 0.05)
        heroTxt.current.style.opacity = String(o)
        heroTxt.current.style.transform = `translate3d(0, ${-(1 - o) * 60}px, 0)`
        heroTxt.current.style.pointerEvents = o < 0.2 ? 'none' : 'auto'
        heroTxt.current.style.visibility = o <= 0.001 ? 'hidden' : 'visible'
      }
      // captions
      CAPS.forEach((c, i) => {
        const el = capEls.current[i]
        if (!el) return
        const w = 0.022
        const o = sm(clamp((p - c.a) / w)) * sm(clamp((c.b - p) / w))
        el.style.opacity = String(o)
        el.style.visibility = o <= 0.001 ? 'hidden' : 'visible'
        el.style.transform = `translate3d(0, ${(1 - o) * 26}px, 0)`
      })
      // brand
      if (brandEl.current) {
        const o = sm(clamp((p - (B.del + 0.025)) / 0.04))
        brandEl.current.style.opacity = String(o)
        brandEl.current.style.visibility = o <= 0.001 ? 'hidden' : 'visible'
        brandEl.current.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
      }
      if (veil.current) veil.current.style.opacity = String(veilAmount(p) * 0.92)
      if (bar.current) bar.current.style.transform = `scaleY(${p})`
      if (rail.current) {
        const dots = rail.current.querySelectorAll<HTMLElement>('[data-dot]')
        let cur = 0
        CHAPTERS.forEach((c, i) => {
          if (p >= c.p - 0.001) cur = i
        })
        dots.forEach((d, i) => d.classList.toggle('on', i === cur))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      st.kill()
      window.removeEventListener('resize', onResize)
    }
  }, [use3d])

  useEffect(() => {
    if (ready3d && loader.current) gsap.to(loader.current, { opacity: 0, duration: 0.9, delay: 0.3, onComplete: () => loader.current && (loader.current.style.display = 'none') })
  }, [ready3d])

  if (!caps.ready) return <div className="h-screen bg-navy" />
  if (!use3d) return <StoryFallback reduced={caps.reduced} />

  const goto = (p: number) => {
    const el = wrap.current!
    const top = el.getBoundingClientRect().top + window.scrollY
    const y = top + p * (el.offsetHeight - window.innerHeight)
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div ref={wrap} id="journey" className="relative" style={{ height: caps.mobile ? '1000vh' : '1300vh' }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-navy">
        <Suspense fallback={null}>
          <div className="absolute inset-0">
            <Experience active onReady={() => setReady3d(true)} />
          </div>
        </Suspense>

        {/* cinematic grading */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(3,10,23,0.65) 100%)' }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-navy/75 to-transparent" />
        <div ref={veil} className="pointer-events-none absolute inset-0 bg-navy opacity-0" />

        {/* hero copy */}
        <div ref={heroTxt} className="absolute inset-0 flex flex-col justify-end px-6 pb-24 sm:px-14 md:pb-28 lg:px-24">
          <p className="mb-5 text-[10px] font-medium uppercase tracking-wider3 text-gold sm:text-xs">Import · Export · Global Sourcing</p>
          <h1 className="font-display text-[15vw] font-medium leading-[0.9] tracking-tight text-white sm:text-[11vw] lg:text-[9rem]">
            V&amp;P <span className="text-gold">SATTVA</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm font-medium uppercase tracking-wider2 text-white/90 sm:text-base">Global Sourcing. Seamless Logistics.</p>
          <p className="mt-3 font-display text-2xl italic text-gold/90 sm:text-3xl">Quality in Every Connection.</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <button onClick={() => goto(0.17)} className="btn-gold">
              Explore Our Journey
            </button>
            <a href="#contact" className="btn-ghost">
              Get a Quote
            </a>
          </div>
          <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex" aria-hidden>
            <span className="text-[10px] uppercase tracking-wider3 text-white/60">Scroll</span>
            <span className="relative block h-12 w-px overflow-hidden bg-white/20">
              <span className="scroll-line absolute left-0 top-0 h-5 w-px bg-gold" />
            </span>
          </div>
        </div>

        {/* scene captions */}
        {CAPS.map((c, i) => (
          <div
            key={c.index}
            ref={(el) => (capEls.current[i] = el)}
            className={`pointer-events-none absolute inset-x-0 bottom-[11vh] flex px-6 opacity-0 sm:px-14 lg:px-24 ${c.align === 'right' ? 'justify-end text-right' : c.align === 'center' ? 'justify-center text-center' : 'justify-start text-left'}`}
            style={{ visibility: 'hidden' }}
          >
            <div className="max-w-[32rem] sm:max-w-xl lg:max-w-2xl">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider3 text-gold sm:text-xs">{c.index}</p>
              <h2 className="font-display text-[2.1rem] font-medium leading-[1.05] text-white drop-shadow-[0_2px_24px_rgba(3,10,23,0.9)] sm:text-5xl lg:text-6xl">{c.text}</h2>
              {c.sub && <p className="mt-4 hidden max-w-md text-sm leading-relaxed text-white/75 sm:block">{c.sub}</p>}
            </div>
          </div>
        ))}

        {/* brand reveal */}
        <div ref={brandEl} className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0" style={{ visibility: 'hidden' }}>
          <Logo className="logo-shine mb-8 w-48 sm:w-64" />
          <h2 className="font-display text-4xl font-medium text-white sm:text-6xl lg:text-7xl">Your World. Our Connections.</h2>
          <p className="mt-5 font-display text-xl italic text-gold sm:text-2xl">Quality in Every Connection.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="#contact" className="btn-gold">
              Let&rsquo;s Work Together
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-ghost">
              WhatsApp Us
            </a>
          </div>
        </div>

        {/* progress rail */}
        <div ref={rail} className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex lg:right-8">
          {CHAPTERS.map((c) => (
            <button key={c.id} onClick={() => goto(c.p)} className="group flex items-center gap-3" aria-label={`Go to ${c.label}`}>
              <span className="text-[10px] uppercase tracking-wider2 text-white/0 transition group-hover:text-white/80">{c.label}</span>
              <span data-dot className="rail-dot" />
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-white/5 md:block">
          <div ref={bar} className="h-full origin-top bg-gold/70" style={{ transform: 'scaleY(0)' }} />
        </div>

        {/* loader */}
        <div ref={loader} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-navy">
          <Logo className="w-40 animate-pulse" />
          <p className="mt-6 text-[10px] uppercase tracking-wider3 text-white/50">Preparing the journey</p>
        </div>
      </div>
    </div>
  )
}

/** Beautiful, lightweight story for no-WebGL / reduced-motion visitors. */
function StoryFallback({ reduced }: { reduced: boolean }) {
  return (
    <div id="journey">
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-navy px-6 pb-24 sm:px-14 lg:px-24" style={{ background: 'radial-gradient(1200px 600px at 70% 20%, #123B64 0%, #071B33 60%)' }}>
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(201,164,92,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(201,164,92,.12)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="relative">
          <p className="mb-5 text-xs font-medium uppercase tracking-wider3 text-gold">Import · Export · Global Sourcing</p>
          <h1 className="font-display text-[15vw] font-medium leading-[0.9] text-white sm:text-[11vw] lg:text-[9rem]">
            V&amp;P <span className="text-gold">SATTVA</span>
          </h1>
          <p className="mt-6 text-sm font-medium uppercase tracking-wider2 text-white/90 sm:text-base">Global Sourcing. Seamless Logistics.</p>
          <p className="mt-3 font-display text-2xl italic text-gold/90 sm:text-3xl">Quality in Every Connection.</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="#chapters" className="btn-gold">
              Explore Our Journey
            </a>
            <a href="#contact" className="btn-ghost">
              Get a Quote
            </a>
          </div>
          {reduced && <p className="mt-8 text-xs text-white/40">Animations are reduced to match your device settings.</p>}
        </div>
      </section>
      <section id="chapters" className="bg-soft px-6 py-24 sm:px-14 lg:px-24">
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-3xl bg-navy/10 md:grid-cols-2">
          {CAPS.map((c, i) => (
            <article key={c.index} className="bg-white p-10 sm:p-14">
              <p className="text-xs font-medium uppercase tracking-wider2 text-gold">{c.index}</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-navy">{c.text}</h2>
              <p className="mt-4 text-sm leading-relaxed text-navy/65">{c.sub}</p>
              <div className="mt-8 h-px w-16 bg-gold" style={{ width: `${(i + 1) * 12}%` }} />
            </article>
          ))}
        </div>
      </section>
      <section className="bg-navy px-6 py-28 text-center">
        <Logo className="mx-auto mb-8 w-48" />
        <h2 className="font-display text-4xl text-white sm:text-6xl">Your World. Our Connections.</h2>
        <p className="mt-5 font-display text-xl italic text-gold">Quality in Every Connection.</p>
        <a href="#contact" className="btn-gold mt-10 inline-flex">
          Let&rsquo;s Work Together
        </a>
      </section>
    </div>
  )
}

void BOUNDS
