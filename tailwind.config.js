export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121212',
        paper: '#F8F8F6',
        line: '#DCDCDC',
        acid: '#D7FF3F',
        muted: '#6E6E6E'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 50px rgba(18,18,18,0.08)'
      }
    }
  },
  plugins: []
};
