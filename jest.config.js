const jestPreset = require('@react-native/jest-preset');

/**
 * Jest config extends @react-native/jest-preset.
 *
 * IMPORTANT: do NOT override `testEnvironment` or drop the preset's `setupFiles` —
 * React Native's preset supplies a custom environment and native-module mocks.
 * Overriding them with jsdom causes "__fbBatchedBridgeConfig is not set".
 */
module.exports = {
  ...jestPreset,
  roots: [
    '<rootDir>/tests',
    '<rootDir>/components',
    '<rootDir>/screens',
    '<rootDir>/theme',
    '<rootDir>/hooks',
    '<rootDir>/services',
  ],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  moduleNameMapper: {
    ...jestPreset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/$1',
    // AsyncStorage needs its native module mocked in Jest; the package ships
    // an official in-memory mock.
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    // NetInfo is a native module; use the mock shipped by the package.
    '^@react-native-community/netinfo$':
      '<rootDir>/node_modules/@react-native-community/netinfo/jest/netinfo-mock.js',
  },

  transform: jestPreset.transform,

  // Preset default only un-ignores react-native; add Expo + RNTL so their
  // ESM/untranspiled sources get babel-transformed too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native|expo(nent)?|@expo|expo-.*|react-native-web|@testing-library/react-native)/)',
  ],

  // Preset setup (defines __DEV__, mocks native modules) plus our own globals.
  setupFiles: [...jestPreset.setupFiles, '<rootDir>/tests/setup.js'],

  testTimeout: 10000,
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'theme/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    '!**/__tests__/**',
  ],
};
