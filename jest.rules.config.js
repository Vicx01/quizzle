/**
 * Jest config for the Firestore security-rule tests.
 *
 * These are deliberately separate from the main suite: they require a running
 * Firestore emulator, and would otherwise fail every `npm test` run that does
 * not have one.
 *
 * Usage:
 *
 *   firebase emulators:start --only firestore --project quizzle-rules-test
 *   npm run test:rules
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  // Run ONLY the rules tests, so this config never picks up the app suite.
  roots: ['<rootDir>/tests/rules'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  // The emulator round-trips make these slower than unit tests.
  testTimeout: 30000,
  collectCoverageFrom: undefined,
};
