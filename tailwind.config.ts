import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#2E7D5B',
          50: '#EFF8F3',
          100: '#D9EEE2',
          200: '#B4DCC6',
          300: '#85C3A5',
          400: '#55A480',
          500: '#2E7D5B',
          600: '#266A4D',
          700: '#1E553E',
          800: '#184534',
          900: '#123527',
        },
        sage: '#A8D5BA',
        sky: '#7EC8E3',
        gold: '#F7C873',
        mint: '#F8FCF8',
        ink: {
          DEFAULT: '#1F2933',
          soft: '#3E4C59',
          muted: '#616E7C',
          faint: '#9AA5B1',
        },
        stone: {
          line: '#E4EBE5',
          paper: '#F2F6F2',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      maxWidth: {
        content: '78rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31,41,51,0.04), 0 12px 32px -18px rgba(31,41,51,0.28)',
        lift: '0 2px 6px rgba(31,41,51,0.06), 0 24px 48px -24px rgba(31,41,51,0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
