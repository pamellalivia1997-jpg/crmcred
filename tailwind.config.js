/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          navy: '#0B2A4A',
          'navy-dark': '#071C33',
          'navy-light': '#163E68',
          teal: '#0F5C63',
          'teal-light': '#1B8A8F',
          'teal-lighter': '#28B0B7',
          amber: '#F5B700',
          'amber-dark': '#D49D00',
        },
      },
    },
  },
  plugins: [],
}
