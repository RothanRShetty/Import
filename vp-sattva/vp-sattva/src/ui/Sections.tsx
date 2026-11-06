import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { CONTACT_EMAIL, SERVICES, WHATSAPP_NUMBER, WHATSAPP_URL } from './config'
import { Logo } from './Logo'
import { HUBS } from '../lib/geo'

const NetworkGlobe = lazy(() => import('./NetworkGlobe'))

const rise = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
}

const Eyebrow = ({ children, dark = false }: { children: string; dark?: boolean }) => (
  <p className={`mb-4 text-xs font-medium uppercase tracking-wider3 ${dark ? 'text-gold' : 'text-gold'}`}>{children}</p>
)

export function Nav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 60)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  const links = [
    ['Journey', '#journey'],
    ['About', '#about'],
    ['Services', '#services'],
    ['Network', '#network'],
    ['Contact', '#contact'],
  ]
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${solid || open ? 'bg-navy/85 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <a href="#top" className="font-display text-xl font-semibold tracking-[0.18em] text-white">
          V&amp;P <span className="text-gold">SATTVA</span>
        </a>
        <nav className="hidden items-center gap-9 md:flex">
          {links.map(([l, h]) => (
            <a key={l} href={h} className="text-xs font-medium uppercase tracking-wider2 text-white/75 transition hover:text-gold">
              {l}
            </a>
          ))}
          <a href="#contact" className="btn-gold !px-5 !py-2.5 !text-[11px]">
            Get a Quote
          </a>
        </nav>
        <button className="md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="block h-px w-7 bg-white" />
          <span className="mt-2 block h-px w-7 bg-gold" />
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-5 px-6 pb-8 md:hidden">
          {links.map(([l, h]) => (
            <a key={l} href={h} onClick={() => setOpen(false)} className="text-sm uppercase tracking-wider2 text-white/85">
              {l}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}

export function About() {
  const stats = [
    ['11+', 'Sourcing hubs'],
    ['6', 'Core services'],
    ['1', 'Accountable partner'],
  ]
  return (
    <section id="about" className="bg-soft px-6 py-28 sm:px-14 lg:py-40">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <motion.div {...rise}>
          <Eyebrow>About Us</Eyebrow>
          <h2 className="font-display text-4xl leading-[1.05] text-navy sm:text-6xl">One partner. Every link in the chain.</h2>
        </motion.div>
        <motion.div {...rise} transition={{ ...rise.transition, delay: 0.12 }}>
          <p className="text-base leading-relaxed text-navy/75 sm:text-lg">
            V&amp;P SATTVA is a global sourcing, import-export and logistics partner. We find the right suppliers, coordinate every movement of your goods, and keep you informed from the first enquiry to the final delivery.
          </p>
          <p className="mt-5 text-base leading-relaxed text-navy/75">Our promise is simple: quality in every connection &mdash; with suppliers, with carriers, and with you.</p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-navy/10 pt-8">
            {stats.map(([n, l]) => (
              <div key={l}>
                <dt className="font-display text-4xl text-navy sm:text-5xl">{n}</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wider2 text-navy/55">{l}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  )
}

const SERVICE_COPY: Record<string, string> = {
  'Global Sourcing': 'Verified suppliers and competitive pricing, sourced across continents.',
  'Import & Export': 'Documentation, compliance and clearance handled end to end.',
  'Freight & Logistics Coordination': 'Sea, air and road movements planned, booked and tracked.',
  'Supply Chain Solutions': 'Warehousing, consolidation and flow designed around your demand.',
  'Product Procurement': 'Specification-led buying with inspection before dispatch.',
  'International Trade Support': 'Practical guidance on terms, regulations and market entry.',
}

export function Services({ onPick }: { onPick: (s: string) => void }) {
  return (
    <section id="services" className="bg-white px-6 py-28 sm:px-14 lg:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.div {...rise} className="mb-16 max-w-2xl">
          <Eyebrow>Our Services</Eyebrow>
          <h2 className="font-display text-4xl leading-[1.05] text-navy sm:text-6xl">Everything your goods need, from origin to door.</h2>
        </motion.div>
        <div className="grid gap-px overflow-hidden rounded-3xl bg-navy/10 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <motion.a
              key={s}
              href="#contact"
              onClick={() => onPick(s)}
              {...rise}
              transition={{ ...rise.transition, delay: (i % 3) * 0.08 }}
              className="group relative flex min-h-[280px] flex-col justify-between bg-white p-9 transition duration-500 hover:bg-navy"
            >
              <span className="font-display text-5xl text-gold/70 transition group-hover:text-gold">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-display text-2xl leading-tight text-navy transition group-hover:text-white">{s}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy/60 transition group-hover:text-white/70">{SERVICE_COPY[s]}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider2 text-gold">
                  Enquire <span className="transition group-hover:translate-x-1">→</span>
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Why() {
  const items = [
    ['Global Connectivity', 'A network of suppliers, carriers and ports across the major trade lanes.'],
    ['Reliable Coordination', 'One team managing every handover, so nothing slips between parties.'],
    ['Quality-Focused Sourcing', 'Vetting and inspection built in before goods ever ship.'],
    ['Transparent Communication', 'Clear updates at each milestone. No surprises, no guesswork.'],
    ['End-to-End Support', 'From the first enquiry to the final delivery and beyond.'],
  ]
  return (
    <section className="bg-navy px-6 py-28 sm:px-14 lg:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.div {...rise} className="mb-14">
          <Eyebrow dark>Why Choose Us</Eyebrow>
          <h2 className="max-w-2xl font-display text-4xl leading-[1.05] text-white sm:text-6xl">Built on trust, run with precision.</h2>
        </motion.div>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {items.map(([t, d], i) => (
            <motion.li key={t} {...rise} transition={{ ...rise.transition, delay: i * 0.06 }} className="grid items-baseline gap-3 py-8 sm:grid-cols-[4rem_1fr_1.2fr] sm:gap-8">
              <span className="font-display text-xl text-gold">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="font-display text-2xl text-white sm:text-3xl">{t}</h3>
              <p className="text-sm leading-relaxed text-white/60">{d}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Network() {
  const [seen, setSeen] = useState(false)
  const [focus, setFocus] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section id="network" className="relative overflow-hidden bg-[#030d1c] px-6 py-28 sm:px-14 lg:py-36">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
        <motion.div {...rise}>
          <Eyebrow dark>Our Global Network</Eyebrow>
          <h2 className="font-display text-4xl leading-[1.05] text-white sm:text-6xl">Connected to the places that matter.</h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">Drag the globe, or choose a hub. Every line is a live trade connection back to our base in India.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {HUBS.map((h, i) => (
              <button
                key={h.name}
                onClick={() => setFocus(focus === i ? null : i)}
                className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-wider2 transition ${focus === i ? 'border-gold bg-gold text-navy' : 'border-white/20 text-white/70 hover:border-gold hover:text-gold'}`}
              >
                {h.name}
              </button>
            ))}
          </div>
        </motion.div>
        <div ref={ref} className="relative aspect-square w-full touch-pan-y">
          {seen ? (
            <Suspense fallback={null}>
              <NetworkGlobe focus={focus} />
            </Suspense>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function Contact({ service, setService }: { service: string; setService: (s: string) => void }) {
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) ?? '').trim()
    const errors: Record<string, string> = {}
    if (!v('name')) errors.name = 'Please enter your name'
    if (!/^\S+@\S+\.\S+$/.test(v('email'))) errors.email = 'Please enter a valid email'
    if (!v('message')) errors.message = 'Please tell us a little about your requirement'
    setErr(errors)
    if (Object.keys(errors).length) return
    const body = [`Name: ${v('name')}`, `Company: ${v('company')}`, `Email: ${v('email')}`, `Phone: ${v('phone')}`, `Service: ${v('service')}`, '', v('message')].join('\n')
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Enquiry from ' + v('name') + ' — V&P SATTVA')}&body=${encodeURIComponent(body)}`
    setSent(true)
  }
  const waForm = (form: HTMLFormElement | null) => {
    if (!form) return WHATSAPP_URL
    const f = new FormData(form)
    const t = `Hello V&P SATTVA, I'm ${f.get('name') || 'interested'}${f.get('company') ? ' from ' + f.get('company') : ''}. Service: ${f.get('service') || 'General'}. ${f.get('message') || ''}`
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t)}`
  }
  const formRef = useRef<HTMLFormElement>(null)
  const field = 'w-full border-0 border-b border-navy/20 bg-transparent py-3 text-base text-navy placeholder:text-navy/35 focus:border-gold focus:outline-none focus:ring-0'
  return (
    <section id="contact" className="bg-soft px-6 py-28 sm:px-14 lg:py-40">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1fr_1.3fr]">
        <motion.div {...rise}>
          <Eyebrow>Contact Us</Eyebrow>
          <h2 className="font-display text-4xl leading-[1.05] text-navy sm:text-6xl">Let&rsquo;s work together.</h2>
          <p className="mt-5 max-w-md text-navy/65">Tell us what you need to source or move. We&rsquo;ll respond promptly with a clear plan.</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-gold mt-9 inline-flex gap-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.300 1.200-1.800 1.200-.5.100-1 .2-3.300-.7-2.800-1.100-4.600-4-4.700-4.200-.1-.2-1.100-1.500-1.100-2.800s.7-2 1-2.300c.2-.3.500-.3.700-.3h.5c.2 0 .4 0 .6.500l.8 1.900c.1.200.1.400 0 .6l-.4.600c-.2.200-.3.400-.1.700.2.300.8 1.300 1.800 2.100 1.200 1 2.200 1.300 2.500 1.500.3.100.5.100.7-.1l.9-1.100c.2-.3.400-.2.700-.1l1.800.9c.3.100.5.200.5.300.1.200.1.800-.2 1.300Z" />
            </svg>
            Chat on WhatsApp
          </a>
          <p className="mt-8 text-sm text-navy/60">
            Or email{' '}
            <a className="text-navy underline decoration-gold underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </motion.div>
        <motion.form ref={formRef} onSubmit={submit} noValidate {...rise} transition={{ ...rise.transition, delay: 0.1 }} className="grid gap-x-8 gap-y-7 rounded-3xl bg-white p-8 shadow-[0_30px_80px_-40px_rgba(7,27,51,0.35)] sm:grid-cols-2 sm:p-12">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider2 text-navy/55">Name *</span>
            <input name="name" autoComplete="name" className={field} placeholder="Your name" />
            {err.name && <span className="text-xs text-red-600">{err.name}</span>}
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider2 text-navy/55">Company</span>
            <input name="company" autoComplete="organization" className={field} placeholder="Company name" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider2 text-navy/55">Email *</span>
            <input name="email" type="email" autoComplete="email" className={field} placeholder="you@company.com" />
            {err.email && <span className="text-xs text-red-600">{err.email}</span>}
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider2 text-navy/55">Phone</span>
            <input name="phone" type="tel" autoComplete="tel" className={field} placeholder="+91 ..." />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] uppercase tracking-wider2 text-navy/55">Service Required</span>
            <select name="service" value={service} onChange={(e) => setService(e.target.value)} className={field}>
              <option value="">Select a service</option>
              {SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] uppercase tracking-wider2 text-navy/55">Message *</span>
            <textarea name="message" rows={4} className={field} placeholder="Products, quantities, origin and destination…" />
            {err.message && <span className="text-xs text-red-600">{err.message}</span>}
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <button type="submit" className="btn-gold">
              Send Enquiry
            </button>
            <a href={WHATSAPP_URL} onClick={(e) => (e.currentTarget.href = waForm(formRef.current))} target="_blank" rel="noreferrer" className="text-xs font-medium uppercase tracking-wider2 text-navy underline decoration-gold underline-offset-4">
              Send via WhatsApp
            </a>
            {sent && <span className="text-sm text-navy/70">Your email app should open with the enquiry ready to send. Thank you!</span>}
          </div>
        </motion.form>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="bg-navy px-6 py-16 sm:px-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 sm:flex-row">
        <Logo className="w-40" />
        <p className="text-xs uppercase tracking-wider2 text-white/40">© {new Date().getFullYear()} V&amp;P SATTVA · All rights reserved</p>
      </div>
    </footer>
  )
}
