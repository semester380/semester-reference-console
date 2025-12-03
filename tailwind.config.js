/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'semester': {
          blue: '#0052CC',
          'blue-light': '#0065FF',
          'blue-dark': '#003D99',
          plum: '#5E17EB', // Deep purple accent
          pink: '#FF0080', // Vibrant pink accent
        },
        'nano': {
          white: '#FFFFFF',
          'gray-50': '#F8F9FA',
          'gray-100': '#F1F3F5',
          'gray-200': '#E9ECEF',
          'gray-300': '#DEE2E6',
          'gray-400': '#CED4DA',
          'gray-500': '#ADB5BD',
          'gray-600': '#6C757D',
          'gray-700': '#495057',
          'gray-800': '#343A40',
          'gray-900': '#212529',
        },
        'status': {
          'success': '#10B981',
          'warning': '#F59E0B',
          'error': '#EF4444',
          'info': '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
}
