/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel:   ['"Press Start 2P"', 'monospace'],
        cinzel:  ['"Cinzel"', 'serif'],
        deco:    ['"Cinzel Decorative"', 'serif'],
      },
    },
  },
  plugins: [],
};