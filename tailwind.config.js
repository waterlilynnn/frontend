/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest': {
          50: '#f0f9f0',
          100: '#dcf0dc',
          200: '#bae0ba',
          300: '#8fc98f',
          400: '#5aa85a',
          500: '#2c6e49',  // Forest Green
          600: '#235a3a',
          700: '#1b452c',
          800: '#12301e',
          900: '#092010',
        },
        'earth': {
          50: '#faf6f0',
          100: '#f5ede1',
          200: '#ebdbc3',
          300: '#e1c9a5',
          400: '#d7b787',
          500: '#b48c4c',  // Earth Brown
          600: '#8f6e3d',
          700: '#6b522e',
          800: '#47361f',
          900: '#231b0f',
        },
        'water': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0e7c7c',  // Teal/Water
          600: '#0b6363',
          700: '#084a4a',
          800: '#053232',
          900: '#021919',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}