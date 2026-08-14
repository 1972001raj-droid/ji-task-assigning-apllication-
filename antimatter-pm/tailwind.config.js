/** @type {import('tailwindcss').Config} */
export default {
  // Always dark — remove class-based toggling for a single dark theme
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // 60% dominant — deep black navy
        'bg-primary':   '#060d1a',
        'bg-secondary': '#080f20',

        // 30% structural — dark blue
        surface:          '#0e1e40',
        'surface-elevated': '#112348',
        'surface-hover':  '#162c57',

        // 10% accent — electric green
        accent:       '#00d68f',
        'accent-hover': '#00b87a',
        'accent-dim': 'rgba(0,214,143,0.12)',

        // Text
        'text-primary':   '#e8f0ff',
        'text-secondary': '#8ba0c4',
        'text-muted':     '#4e6080',

        // Legacy brand (keep for backward compat on status/priority badges)
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        glass:       '0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,214,143,0.05)',
        'glass-dark':'0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,214,143,0.08)',
        card:        '0 1px 4px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)',
        'card-hover':'0 2px 8px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.25)',
        'accent-glow':'0 0 24px rgba(0,214,143,0.35)',
      },
      animation: {
        'fade-in':        'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
        'slide-up':       'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' },                           to: { opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(100%)' },          to: { transform: 'translateX(0)' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
