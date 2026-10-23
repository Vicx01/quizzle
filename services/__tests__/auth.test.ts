/**
 * Quizzle — auth error-mapping tests.
 *
 * Covers the mapping from Firebase Auth error codes to actionable messages.
 * These are pure-logic tests; no live Firebase project is contacted.
 */

import {
  describeAuthError,
  describeAuthErrorWithCode,
  getAuthProvider,
  getCurrentOrigin,
  isCancellation,
  isEmbeddedInFrame,
} from '../auth';

function err(code: string, message?: string) {
  return { code, message: message ?? `Firebase: ${code}` };
}

describe('describeAuthError', () => {
  it('explains the unauthorized-domain failure and names the fix', () => {
    const msg = describeAuthError(err('auth/unauthorized-domain'));
    expect(msg).toMatch(/Authorized domains/i);
  });

  it('explains that the Google provider is disabled', () => {
    const msg = describeAuthError(err('auth/operation-not-allowed'));
    expect(msg).toMatch(/Google sign-in provider is disabled/i);
    expect(msg).toMatch(/Sign-in method/i);
  });

  it('explains an invalid API key and says to restart the dev server', () => {
    const msg = describeAuthError(err('auth/invalid-api-key'));
    expect(msg).toMatch(/API key is invalid/i);
    expect(msg).toMatch(/restart the dev server/i);
  });

  it('explains a blocked popup', () => {
    expect(describeAuthError(err('auth/popup-blocked'))).toMatch(/popup was blocked/i);
  });

  it('reports cancellation without sounding like a failure', () => {
    expect(describeAuthError(err('auth/popup-closed-by-user'))).toMatch(/cancelled/i);
  });

  it('falls back to the underlying message for unmapped codes', () => {
    const msg = describeAuthError(err('auth/some-new-code', 'Underlying detail'));
    expect(msg).toMatch(/Underlying detail/);
  });

  it('handles non-Firebase errors gracefully', () => {
    expect(describeAuthError(new Error('boom'))).toMatch(/boom/);
    expect(describeAuthError(null)).toMatch(/Sign-in failed/);
    expect(describeAuthError(undefined)).toMatch(/Sign-in failed/);
  });
});

describe('isCancellation', () => {
  it('treats user-cancelled popups as cancellation', () => {
    expect(isCancellation(err('auth/popup-closed-by-user'))).toBe(true);
    expect(isCancellation(err('auth/cancelled-popup-request'))).toBe(true);
  });

  it('does not treat real failures as cancellation', () => {
    expect(isCancellation(err('auth/unauthorized-domain'))).toBe(false);
    expect(isCancellation(err('auth/popup-blocked'))).toBe(false);
    expect(isCancellation(new Error('boom'))).toBe(false);
    expect(isCancellation(null)).toBe(false);
  });
});

describe('describeAuthErrorWithCode', () => {
  it('keeps the actionable message and appends the raw code', () => {
    const msg = describeAuthErrorWithCode(err('auth/unauthorized-domain'));
    expect(msg).toMatch(/Authorized domains/i);
    expect(msg).toContain('auth/unauthorized-domain');
  });

  it('omits the code line when the error has no code', () => {
    const msg = describeAuthErrorWithCode(new Error('boom'));
    expect(msg).toMatch(/boom/);
    expect(msg).not.toMatch(/Error code:/);
  });
});

describe('sign-in environment helpers', () => {
  // This suite temporarily defines window.location; remove it again so other
  // tests observe the same environment shape they started with.
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
  });

  it('degrades to null when there is no browser location', () => {
    // The jest environment provides no window.location; the guard must return
    // null rather than throwing.
    expect(getCurrentOrigin()).toBeNull();
  });

  it('reads location.origin when running in a browser', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://8080-abc123.e2b.app' },
      configurable: true,
      writable: true,
    });
    expect(getCurrentOrigin()).toBe('https://8080-abc123.e2b.app');
  });

  it('is not framed at the top level', () => {
    // jsdom renders at the top level: window.self === window.top.
    expect(isEmbeddedInFrame()).toBe(false);
  });
});

describe('provider selection', () => {
  const OLD = process.env.EXPO_PUBLIC_AUTH_PROVIDER;

  afterEach(() => {
    if (OLD === undefined) delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;
    else process.env.EXPO_PUBLIC_AUTH_PROVIDER = OLD;
  });

  it('defaults to Firebase when the variable is unset', () => {
    delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;
    expect(getAuthProvider()).toBe('firebase');
  });

  it('defaults to Firebase for any unrecognised value', () => {
    // A typo must not silently half-enable Supabase with no credentials.
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = 'Supabase';
    expect(getAuthProvider()).toBe('firebase');

    process.env.EXPO_PUBLIC_AUTH_PROVIDER = 'supabase-';
    expect(getAuthProvider()).toBe('firebase');
  });

  it('selects Supabase only for the exact value', () => {
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = 'supabase';
    expect(getAuthProvider()).toBe('supabase');
  });

  it('keeps Firebase error mapping while Firebase is the active provider', () => {
    delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;
    expect(describeAuthError(err('auth/unauthorized-domain'))).toMatch(/Authorized domains/i);
  });
});

describe('describeAuthError — Supabase provider', () => {
  const OLD = process.env.EXPO_PUBLIC_AUTH_PROVIDER;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = 'supabase';
  });

  afterEach(() => {
    if (OLD === undefined) delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;
    else process.env.EXPO_PUBLIC_AUTH_PROVIDER = OLD;
  });

  it('explains a rejected callback and names the fix', () => {
    const msg = describeAuthError({ code: 'validation_failed' });
    expect(msg).toMatch(/Redirect URLs/i);
    expect(msg).toMatch(/Supabase/i);
  });

  it('explains that the Google provider is disabled', () => {
    expect(describeAuthError({ code: 'provider_disabled' })).toMatch(
      /Google provider is not enabled/i
    );
  });

  it('treats an OAuth denial as a cancellation', () => {
    expect(isCancellation({ code: 'access_denied' })).toBe(true);
    expect(isCancellation({ name: 'user_cancelled' })).toBe(true);
    expect(isCancellation({ code: 'network_error' })).toBe(false);
  });

  it('does not print a bogus code for a plain Error', () => {
    // `new Error('boom')` has name "Error", which is noise, not a diagnostic.
    expect(describeAuthErrorWithCode(new Error('boom'))).not.toMatch(/Error code:/);
  });

  it('does surface a real Supabase code', () => {
    expect(describeAuthErrorWithCode({ code: 'bad_oauth_callback' })).toMatch(
      /Error code: bad_oauth_callback/
    );
  });
});
