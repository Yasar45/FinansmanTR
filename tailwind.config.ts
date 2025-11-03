import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f766e',
          foreground: '#ffffff'
        }
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
