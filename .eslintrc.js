module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'react', 'react-native', 'react-hooks'],
  settings: {
    react: {
      version: '19.3.0',
    },
    'react-native': {
      typescriptFileExtensions: ['.ts', '.tsx'],
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error',
    // DISABLED: structurally incompatible with theme-aware styling.
    // React Native's StyleSheet.create() must be evaluated with the *runtime*
    // colour values, so themed components build styles via a `getStyles(colors)`
    // factory. This rule can only analyse statically-declared `StyleSheet.create`
    // objects and reports every factory-produced style as "unused" (false positive).
    // Keep it off unless/until the rule supports factory functions.
    'react-native/no-unused-styles': 'off',
    // Colours must come from tokens. `shadowColor` is exempt: shadows are
    // rendered black in both themes by design, so there is no token for it.
    // Colours must come from tokens. `shadowColor` is exempt per-file via an
    // inline disable: shadows render black in both themes by design, and this
    // rule version accepts no options.
    'react-native/no-color-literals': 'error',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'web-build/',
    '.expo/',
    'ios/',
    'android/',
    'package-lock.json',
    // Supabase Edge Functions are Deno code and are excluded from the app
    // tsconfig, so this (Node/Expo) setup cannot parse them: they use `Deno.*`
    // globals and `npm:` specifiers. Checked with `deno check` instead.
    'supabase/functions/',
  ],
};
