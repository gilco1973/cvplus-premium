import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: [
    'react',
    'react-dom',
    'firebase',
    'firebase-admin',
    'firebase-functions',
    'stripe',
    '@stripe/stripe-js',
    '@stripe/react-stripe-js',
    '@cvplus/core'
  ],
  banner: {
    js: '/* CVPlus Premium Module - Subscription and Billing with Stripe Integration */'
  }
});