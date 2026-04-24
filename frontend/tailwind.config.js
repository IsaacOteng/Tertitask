/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        'bg-subtle': '#F7F7F8',
        ink: '#0E0E10',
        'ink-soft': '#4B4B54',
        'ink-muted': '#8A8A94',
        line: '#E8E8EC',
        brand: '#14B866',
        'brand-ink': '#0B7A44',
        'brand-dim': '#E6F7EF',
        accent: '#FF5C1A',
        warn: '#B45309',
        danger: '#B42318',
        success: '#14B866',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter Tight"', 'sans-serif'],
      },
      fontSize: {
        'fs-hero': ['60px', { lineHeight: '64px', letterSpacing: '-0.02em' }],
        'fs-h1': ['40px', { lineHeight: '44px', letterSpacing: '-0.015em' }],
        'fs-h2': ['28px', { lineHeight: '34px', letterSpacing: '-0.01em' }],
        'fs-h3': ['20px', { lineHeight: '26px', letterSpacing: '-0.005em' }],
        'fs-body': ['15px', { lineHeight: '24px' }],
        'fs-small': ['13px', { lineHeight: '18px' }],
        'fs-tiny': ['11px', { lineHeight: '14px', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        input: '8px',
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,14,16,0.04), 0 4px 16px rgba(14,14,16,0.06)',
        elevated: '0 4px 6px rgba(14,14,16,0.04), 0 12px 40px rgba(14,14,16,0.10)',
        glow: '0 0 0 1px rgba(20,184,102,0.2), 0 4px 20px rgba(20,184,102,0.14)',
      },
      maxWidth: {
        content: '1240px',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '28px 28px',
      },
    },
  },
  plugins: [],
}
