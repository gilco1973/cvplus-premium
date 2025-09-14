/**
 * CVPlus Premium Module Jest Configuration
 * Comprehensive testing setup for global payment infrastructure and monitoring services
 *
 * @author Gil Klainert
 * @version 4.0.0
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: './src',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/backend/services/payments/__tests__/test-setup.ts'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '../coverage',
  collectCoverageFrom: [
    'backend/services/**/*.ts',
    'backend/functions/**/*.ts',
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],

  // Coverage thresholds (Financial operations require high coverage)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Higher requirements for payment services
    'src/backend/services/payments/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // High requirements for global payment infrastructure
    'src/backend/services/payments/global/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // High requirements for monitoring services
    'src/backend/services/monitoring/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@cvplus/core/(.*)$': '<rootDir>/../core/src/$1',
    '^@cvplus/auth/(.*)$': '<rootDir>/../auth/src/$1'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Coverage report formats
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json'
  ],

  // Test timeout (increased for payment processing tests)
  testTimeout: 30000,

  // Verbose output for detailed test results
  verbose: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Module resolution
  moduleDirectories: ['node_modules', 'src'],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }
  },

  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Maximum worker processes (optimize for CI/CD)
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '../.jest-cache',

  // Notification mode
  notify: false,
  notifyMode: 'failure-change',

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/backend/services/payments/__tests__/jest-setup.ts'
  ],

  // Reporter configuration for CI/CD integration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '../test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '../test-results',
        filename: 'test-report.html',
        expand: true
      }
    ]
  ]
};