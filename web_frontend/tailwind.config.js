/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['"Bowlby One SC"', 'cursive'],
        'sans': ['"Funnel Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#FF5722', // Vibrant red-orange
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9800', // Hot orange
          600: '#FB8C00',
          700: '#F57C00',
          800: '#EF6C00',
          900: '#E65100',
        },
        secondary: {
          DEFAULT: '#FF3D00', // Deep red-orange
          50: '#FBE9E7',
          100: '#FFCCBC',
          200: '#FFAB91',
          300: '#FF8A65',
          400: '#FF7043',
          500: '#FF5722',
          600: '#F4511E',
          700: '#E64A19',
          800: '#D84315',
          900: '#BF360C',
        },
        accent: {
          black: '#0A0A0A', // Deep black
          white: '#FFFFFF', // Clean white
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF9800 0%, #FF5722 50%, #FF3D00 100%)',
        'gradient-intense': 'linear-gradient(135deg, #F57C00 0%, #E64A19 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 87, 34, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 87, 34, 0.8)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
