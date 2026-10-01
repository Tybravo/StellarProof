import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 60000,
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/src/test/setup/jest.setup.afterEnv.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    '/src/test/',
    '/__tests__/',
    '/src/**/*.d.ts',
  ],
  transform: {
    '^^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};

export default config;
