import terser from '@rollup/plugin-terser';

const name = 'clippy';

export default [
  // UMD build
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/clippy.js',
      format: 'umd',
      name: name,
      sourcemap: true
    }
  },
  // UMD build (minified)
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/clippy.min.js',
      format: 'umd',
      name: name,
      sourcemap: true
    },
    plugins: [terser()]
  },
  // ES Module build
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/clippy.esm.js',
      format: 'es',
      sourcemap: true
    }
  }
];
