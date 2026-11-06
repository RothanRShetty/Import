/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#071B33',
        royal: '#123B64',
        gold: '#C9A45C',
        soft: '#F4F6F8',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { wider2: '0.28em', wider3: '0.42em' },
    },
  },
  plugins: [],
}
