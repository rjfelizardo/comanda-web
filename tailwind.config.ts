import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#F25C05', dark: '#D93A00', light: '#FF8A2B', sun: '#FFC21A' },
        ink: '#1E1410',
        cream: '#FFF7EC',
        sand: '#F3E6D3',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 2px 0 rgba(30,20,16,.06), 0 8px 24px rgba(30,20,16,.08)' },
    },
  },
  plugins: [],
};
export default config;
