import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff0f9',
          100: '#ffe0f5',
          200: '#ffc2eb',
          300: '#ff93d9',
          400: '#ff52bf',
          500: '#ff1fa6',
          600: '#e8007f',
          700: '#c40065',
          800: '#a10054',
          900: '#860048',
        },
        dl: {
          // Deep backgrounds
          bg:      '#0a0010',
          surface: '#12001e',
          card:    '#1a0028',
          cardHi:  '#220033',
          border:  '#3d1155',
          // Neon accents
          pink:    '#ff1fa6',
          hotpink: '#ff0080',
          magenta: '#e000c0',
          purple:  '#8b00ff',
          violet:  '#6200ea',
          blue:    '#0066ff',
          teal:    '#00d4ff',
          gold:    '#ffd700',
          goldDim: '#c8a800',
          amber:   '#ffaa00',
          // States
          green:   '#00e676',
          red:     '#ff3d57',
          win:     '#ffd700',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'dl-radial':   'radial-gradient(ellipse at 50% 0%, #3d0060 0%, #0a0010 60%)',
        'dl-card':     'linear-gradient(135deg, #1a0028 0%, #0f0018 100%)',
        'dl-gold':     'linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ffd700 100%)',
        'dl-pink':     'linear-gradient(135deg, #ff1fa6 0%, #e000c0 100%)',
        'dl-pink-glow':'linear-gradient(180deg, rgba(255,31,166,0.15) 0%, transparent 100%)',
        'dl-purple':   'linear-gradient(135deg, #8b00ff 0%, #6200ea 100%)',
        'dl-bet':      'linear-gradient(135deg, #220033 0%, #1a0028 100%)',
      },
      boxShadow: {
        'dl-pink':   '0 0 20px rgba(255,31,166,0.5), 0 0 40px rgba(255,31,166,0.2)',
        'dl-gold':   '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)',
        'dl-purple': '0 0 20px rgba(139,0,255,0.5), 0 0 40px rgba(139,0,255,0.2)',
        'dl-teal':   '0 0 20px rgba(0,212,255,0.4)',
        'dl-card':   '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        'dl-inset':  'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'shimmer':       'shimmer 2.5s linear infinite',
        'pulse-pink':    'pulsePink 2s ease-in-out infinite',
        'pulse-gold':    'pulseGold 2s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'spin-slow':     'spin 8s linear infinite',
        'glow-border':   'glowBorder 2s ease-in-out infinite',
        'winner-pop':    'winnerPop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
        'slide-up':      'slideUp 0.3s ease-out forwards',
        'fade-in':       'fadeIn 0.3s ease-out forwards',
        'bounce-in':     'bounceIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
        'coin-spin':     'coinSpin 0.6s ease-in-out',
        'heart-beat':    'heartBeat 1.2s ease-in-out infinite',
        'sparkle':       'sparkle 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulsePink: {
          '0%,100%': { boxShadow: '0 0 10px rgba(255,31,166,0.3)' },
          '50%':     { boxShadow: '0 0 30px rgba(255,31,166,0.8), 0 0 60px rgba(255,31,166,0.3)' },
        },
        pulseGold: {
          '0%,100%': { boxShadow: '0 0 10px rgba(255,215,0,0.3)' },
          '50%':     { boxShadow: '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.3)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        glowBorder: {
          '0%,100%': { borderColor: 'rgba(255,31,166,0.4)' },
          '50%':     { borderColor: 'rgba(255,31,166,1)' },
        },
        winnerPop: {
          '0%':   { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.15) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '50%':  { transform: 'scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        coinSpin: {
          '0%':   { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(720deg)' },
        },
        heartBeat: {
          '0%,100%': { transform: 'scale(1)' },
          '14%':     { transform: 'scale(1.1)' },
          '28%':     { transform: 'scale(1)' },
          '42%':     { transform: 'scale(1.1)' },
          '70%':     { transform: 'scale(1)' },
        },
        sparkle: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%':     { opacity: '0.5', transform: 'scale(0.8)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
