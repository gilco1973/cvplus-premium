/**
 * Jest Configuration for PayPal Payment Testing
 * Comprehensive test setup for PayPal integration
 */

module.exports = {
  displayName: 'PayPal Payment Tests',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|ts)',
    '**/*.(test|spec).(js|ts)'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  collectCoverageFrom: [
    '../**/*.{js,ts}',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 30000,
  verbose: true,
  roots: ['<rootDir>'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../$1',
  },
};