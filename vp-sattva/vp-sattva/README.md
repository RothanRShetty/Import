# V&P SATTVA — Immersive 3D Logistics Website

React + Vite + TypeScript + React Three Fiber + GSAP ScrollTrigger + Tailwind + Framer Motion.

## Run
    npm install
    npm run dev        # http://localhost:5173
    npm run build      # production build in dist/

## Edit your details
`src/ui/config.ts` — WhatsApp number (digits only, international format), contact email, service list.
The contact form opens the visitor's email app addressed to CONTACT_EMAIL and also offers "Send via WhatsApp".
(To receive submissions without an email app, connect the form to a service such as Formspree in `Sections.tsx > submit`.)

## How it works
- `src/three/*` — all 3D models are procedural (no heavy GLB downloads): truck, containers, warehouse, forklifts, workers, port cranes, cargo ship, dotted globe.
- One scroll value (`S.p`, 0..1) drives every camera move and animation, in both directions. `CameraRig.tsx` holds the camera path; story windows live in `lib/store.ts`, `WarehouseArea.tsx`, `PortArea.tsx`, `FinalAreas.tsx`.
- Scenes are lazy-mounted just before they are needed; DPR adapts automatically (PerformanceMonitor).
- Fallbacks: no WebGL or `prefers-reduced-motion` → elegant static story. Weak devices use a lighter 3D mode. Test with `?fallback=1` or `?quality=low`.
