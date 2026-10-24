export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
        energy: {
          wind: '#06B6D4', // Cyan for Wind Forecast
          actual: '#10B981', // Emerald for Actual Generation
          thermal: '#F59E0B', // Amber for Thermal/Procurement gap
          deficit: '#EF4444', // Rose/Red for shortfalls/errors
          navy: '#0F172A',
          card: '#1E293B',
          cardBorder: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
