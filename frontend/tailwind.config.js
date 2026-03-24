/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber': {
          50: '#e6f9ff',
          100: '#b3f0ff',
          200: '#80e6ff',
          300: '#4ddcff',
          400: '#00d4ff',
          500: '#00a8cc',
          600: '#007a99',
          700: '#004d66',
          800: '#002633',
          900: '#001a24',
        },
        'dark': {
          900: '#0a0e17',
          800: '#0f1419',
          700: '#1a1f2e',
          600: '#252b3d',
          500: '#30384d',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
