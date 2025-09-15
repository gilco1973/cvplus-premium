import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

// Autonomous build configuration - Zero @cvplus/* dependencies
const external = [
  'firebase',
  'firebase-admin',
  'firebase-functions',
  'firebase-functions/v2/https',
  'react',
  'react-dom',
  'lodash',
  'stripe',
  '@types/node',
  // Node.js built-ins
  'fs', 'path', 'util', 'stream', 'crypto', 'http', 'https', 'os', 'url', 'querystring'
];

export default [
  // Main package build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      json(),
      resolve({
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        declarationMap: false,
        sourceMap: true
      })
    ],
    external
  },
  // Frontend-specific build for autonomous operation
  {
    input: 'src/frontend/index.ts',
    output: [
      {
        file: 'dist/frontend/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/frontend/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      json(),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        declarationMap: false,
        sourceMap: true
      })
    ],
    external: ['react', 'react-dom', 'firebase', 'stripe']
  },
  // Backend-specific build
  {
    input: 'src/backend/index.ts',
    output: [
      {
        file: 'dist/backend/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/backend/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      json(),
      resolve({
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        declarationMap: false,
        sourceMap: true
      })
    ],
    external
  }
];