/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        panel: '#141821',
        panel2: '#1c2230',
        border: '#2a3142',
        accent: '#c8a45c',     // FFXIV gold
        accent2: '#7aa2ff',
        good: '#4ade80',
        bad: '#f87171',
        muted: '#8b95a8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
