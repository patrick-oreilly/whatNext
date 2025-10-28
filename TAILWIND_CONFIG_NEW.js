/** @type {import('tailwindcss').Config} */
// NEW TAILWIND CONFIG FOR REDESIGN
// Replace the current tailwind.config.js with this configuration

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NEW PRIMARY PALETTE - Orange Theme
        primary: {
          DEFAULT: '#FF6B3D', // Main brand orange
          50: '#FFF5EB',
          100: '#FFE8D6',
          200: '#FFD1AD',
          300: '#FFBA84',
          400: '#FFA35B',
          500: '#FF6B3D',  // Main
          600: '#E85A2C',
          700: '#D14A1C',
          800: '#BA3A0D',
          900: '#A32A00',
        },
        // NEW YELLOW ACCENT
        yellow: {
          DEFAULT: '#FFD500', // Bright yellow for borders
          50: '#FFFEF0',
          100: '#FFFCE0',
          200: '#FFF9C1',
          300: '#FFF6A2',
          400: '#FFF383',
          500: '#FFD500',  // Main
          600: '#E6C000',
          700: '#CCAA00',
          800: '#B39400',
          900: '#997E00',
        },
        // KEEP SECONDARY (can be used for alerts/errors)
        secondary: {
          DEFAULT: '#FF4444', // Coral red for errors/urgent
          500: '#FF4444',
        },
        // UPDATE ACCENT COLORS
        accent: {
          orange: '#FF6B3D',      // Same as primary
          'orange-light': '#FF8B6B', // Lighter orange
          cream: '#FFF5EB',       // Cream for cards
          'yellow-light': '#FFF9E6', // Light yellow backgrounds
          mint: '#7FDFCF',        // Mint green for avatars
        },
        // TEXT COLORS
        text: {
          dark: '#2D2D2D',        // Dark text on light backgrounds
          gray: '#5D5D5D',        // Secondary text
          light: '#999999',       // Placeholder text
        },
      },
      backgroundImage: {
        // NEW GRADIENTS
        'gradient-primary': 'linear-gradient(180deg, #FF6B3D 0%, #FF8B6B 100%)',
        'gradient-orange': 'linear-gradient(135deg, #FF6B3D 0%, #FF8B6B 100%)',
        'gradient-yellow': 'linear-gradient(135deg, #FFD500 0%, #FFE56B 100%)',
      },
      borderRadius: {
        // More rounded corners
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        // Softer shadows
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'soft-xl': '0 8px 24px rgba(0, 0, 0, 0.15)',
        'orange': '0 4px 16px rgba(255, 107, 61, 0.3)',
        'yellow': '0 4px 16px rgba(255, 213, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 61, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 107, 61, 0.6)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
