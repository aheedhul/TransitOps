/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        status: {
          available: { DEFAULT: '#16a34a', dark: '#22c55e' },
          'on-trip': { DEFAULT: '#2563eb', dark: '#3b82f6' },
          'in-shop': { DEFAULT: '#d97706', dark: '#f59e0b' },
          retired: { DEFAULT: '#6b7280', dark: '#9ca3af' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
