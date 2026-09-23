export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#15171C', soft: '#3A3D45' },
        line: '#E6E8EC',
        mute: '#6B7079',
        canvas: '#ECEEF1',
        select: { DEFAULT: '#2F6BFF', soft: '#EAF0FF', ink: '#1E4FD8' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        toolbar: '0 1px 2px rgba(16,24,40,0.06), 0 10px 28px -6px rgba(16,24,40,0.16)',
      },
    },
  },
};
