/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070709',
          900: '#0c0c10',
          850: '#121217',
          800: '#191920',
          700: '#23232c',
          600: '#32323e',
        },
        brand: {
          gold: '#D4AF37',
          'gold-light': '#F4DC88',
          'gold-dark': '#997510',
          'gold-subtle': 'rgba(212, 175, 55, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        signature: ['Playwrite CU', 'Brush Script MT', 'cursive'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px -3px rgba(212, 175, 55, 0.25)',
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.3)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
