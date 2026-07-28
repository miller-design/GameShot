export default {
  plugins: {
    'postcss-import': {},
    '@csstools/postcss-global-data': {
      files: ['./src/styles/config/_breakpoints.css'],
    },
    'postcss-custom-media': {},
    'postcss-nested': {},
    autoprefixer: {},
  },
}
