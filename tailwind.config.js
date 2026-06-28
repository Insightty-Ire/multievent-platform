/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#111318',
        cream:  '#FAFAF9',
        ink:    '#09090B',
        lime:   '#B8F53C',
        amber: {
          DEFAULT: '#C89B3C',
          light:   '#F5E9C8',
        },
        magenta: {
          DEFAULT: '#9E0059',
          dark:    '#701A75',
          light:   '#FCE7F3',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'portal-grad': 'linear-gradient(160deg, #111318 0%, #1a1020 60%, #2d0a2e 100%)',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
