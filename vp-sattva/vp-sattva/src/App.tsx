import { useState } from 'react'
import Story, { useCapabilities } from './ui/Story'
import { About, Contact, Footer, Nav, Network, Services, Why } from './ui/Sections'

export default function App() {
  const caps = useCapabilities()
  const [service, setService] = useState('')
  return (
    <div id="top" className="bg-navy font-sans text-navy antialiased">
      <Nav />
      <main>
        <Story caps={caps} />
        <About />
        <Services onPick={setService} />
        <Why />
        <Network />
        <Contact service={service} setService={setService} />
      </main>
      <Footer />
    </div>
  )
}
