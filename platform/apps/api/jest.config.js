/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  clearMocks: true,
  // NestJS ships ESM-only builds; Jest's own loader cannot require(esm), so
  // we transpile the ESM entry-points with Babel and let ts-jest handle TS.
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': '<rootDir>/test/transform-esm.cjs',
  },
  transformIgnorePatterns: ['node_modules/(?!(@nestjs)/)'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/dto/**',
  ],
};