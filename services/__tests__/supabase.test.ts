/**
 * Quizzle — Supabase configuration tests.
 *
 * These are pure-logic tests. No Supabase project is contacted and no client is
 * constructed, because `getSupabaseClient()` is lazy and none of these paths
 * call it.
 *
 * The service-role key cases matter most: shipping that key in an
 * `EXPO_PUBLIC_*` variable would bypass Row Level Security on every table, so
 * the config check must refuse to report a healthy setup when it sees one.
 */

import type * as SupabaseModule from '../supabase';

const OLD_ENV = { ...process.env };

/** Reloads the module so it re-reads the environment at import time. */
function loadWith(url?: string, key?: string) {
  let mod: typeof SupabaseModule;
  jest.isolateModules(() => {
    if (url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = url;

    if (key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = key;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../supabase');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mod!;
}

const VALID_URL = 'https://ppswtryoescehrytxvsh.supabase.co';
// Deliberately fake: shaped like a real publishable key so the validation
// logic is exercised, but not an actual credential belonging to any project.
const VALID_KEY = 'sb_publishable_FAKEKEYFORTESTSdoNotUse0';

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe('getSupabaseConfigStatus — valid configuration', () => {
  it('accepts a real project URL and publishable key', () => {
    const status = loadWith(VALID_URL, VALID_KEY).getSupabaseConfigStatus();
    expect(status.ok).toBe(true);
    expect(status.errors).toEqual([]);
  });

  it('accepts a local Supabase URL', () => {
    const status = loadWith('http://127.0.0.1:54321', VALID_KEY).getSupabaseConfigStatus();
    expect(status.ok).toBe(true);
  });

  it('accepts a legacy JWT anon key', () => {
    const status = loadWith(VALID_URL, 'eyJhbGciOiJIUzI1NiJ9.anon').getSupabaseConfigStatus();
    expect(status.ok).toBe(true);
  });
});

describe('getSupabaseConfigStatus — missing and malformed values', () => {
  it('reports both variables when neither is set', () => {
    const status = loadWith(undefined, undefined).getSupabaseConfigStatus();
    expect(status.ok).toBe(false);
    expect(status.errors.map(e => e.key).sort()).toEqual([
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_SUPABASE_URL',
    ]);
    expect(status.errors.every(e => e.kind === 'missing')).toBe(true);
  });

  it('names the variable and the value when a placeholder is left in', () => {
    const status = loadWith(
      'https://your-project.supabase.co',
      'your-anon-key'
    ).getSupabaseConfigStatus();
    expect(status.ok).toBe(false);
    expect(status.errors.every(e => e.kind === 'placeholder')).toBe(true);
    expect(status.errors[0].message).toContain('your-project');
  });

  it('rejects a URL that is not a Supabase host', () => {
    const status = loadWith('not-a-url', VALID_KEY).getSupabaseConfigStatus();
    expect(status.ok).toBe(false);
    expect(status.errors[0].key).toBe('EXPO_PUBLIC_SUPABASE_URL');
    expect(status.errors[0].kind).toBe('invalid');
  });
});

describe('getSupabaseConfigStatus — refusing unsafe keys', () => {
  it('rejects a new-style secret key', () => {
    const status = loadWith(
      VALID_URL,
      'sb_secret_SRXf5AAAAAAAAAAAAAAAAAAA'
    ).getSupabaseConfigStatus();
    expect(status.ok).toBe(false);
    const problem = status.errors.find(e => e.key === 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(problem?.kind).toBe('unsafe');
    expect(problem?.message).toMatch(/bypasses Row Level Security/i);
  });

  it('rejects a legacy JWT carrying the service_role role', () => {
    // Deliberately constructed payload; not a real credential.
    const payload = Buffer.from(
      JSON.stringify({ iss: 'supabase', ref: 'example', role: 'service_role' })
    ).toString('base64url');
    const status = loadWith(
      VALID_URL,
      `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`
    ).getSupabaseConfigStatus();

    expect(status.ok).toBe(false);
    const problem = status.errors.find(e => e.key === 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(problem?.kind).toBe('unsafe');
  });
});

describe('isSupabaseConfigured', () => {
  it('is false when the environment is empty', () => {
    expect(loadWith(undefined, undefined).isSupabaseConfigured()).toBe(false);
  });

  it('is true when the environment is complete', () => {
    expect(loadWith(VALID_URL, VALID_KEY).isSupabaseConfigured()).toBe(true);
  });
});
