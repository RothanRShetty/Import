export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 150" className={className} role="img" aria-label="V&P SATTVA">
      <defs>
        <linearGradient id="goldg" x1="0" x2="1">
          <stop offset="0" stopColor="#8f6d2c" />
          <stop offset="0.5" stopColor="#e9cf93" />
          <stop offset="1" stopColor="#C9A45C" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#goldg)" strokeWidth="2.2">
        <circle cx="180" cy="52" r="40" />
        <ellipse cx="180" cy="52" rx="16" ry="40" />
        <path d="M140 52h80M148 33h64M148 71h64" />
      </g>
      <path d="M154 40 L180 74 L206 40" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
      <text x="180" y="118" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontSize="38" fontWeight="600" letterSpacing="9" fill="#fff">
        V&amp;P SATTVA
      </text>
      <text x="180" y="142" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="9.5" letterSpacing="5" fill="#C9A45C">
        QUALITY IN EVERY CONNECTION
      </text>
    </svg>
  )
}
