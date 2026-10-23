/**
 * Quizzle — auth error-mapping tests.
 *
 * Covers the mapping from Supabase Auth error codes to actionable messages.
 * These are pure-logic tests; no network call is made and no live Supabase
 * project is contacted.
 */

import {
  describeAuthError,
  describeAuthErrorWithCode,
  getCurrentOrigin,
  isCancellation,
  isEmbeddedInFrame,
} from '../auth';

function err(code: string, message?: string) {
  return { code, message: message ?? `Supabase: ${code}` };
}

describe('describeAuthError', () => {
  it('explains a rejected callback and names the fix', () => {
    const msg = describeAuthError(err('validation_failed'));
    expect(msg).toMatch(/Redirect URLs/i);
    expect(msg).toMatch(/Supabase/i);
  });

  it('treats a bad OAuth callback the same way', () => {
    expect(describeAuthError(err('bad_oauth_callback'))).toMatch(/Redirect URLs/i);
  });

  it('explains that the Google provider is disabled', () => {
    const msg = describeAuthError(err('provider_disabled'));
    expect(msg).toMatch(/Google provider is not enabled/i);
    expect(msg).toMatch(/Providers/i);
  });

  it('explains an expired or out-of-order sign-in link', () => {
    expect(describeAuthError(err('bad_oauth_state'))).toMatch(/expired/i);
  });

  it('explains a blocked popup', () => {
    expect(describeAuthError(err('popup_blocked'))).toMatch(/popup was blocked/i);
  });

  it('reports cancellation without sounding like a failure', () => {
    expect(describeAuthError(err('access_denied'))).toMatch(/cancelled/i);
    expect(describeAuthError({ name: 'user_cancelled' })).toMatch(/cancelled/i);
  });

  it('explains rate limiting', () => {
    expect(describeAuthError(err('over_request_rate_limit'))).toMatch(/Too many sign-in/i);
  });

  it('explains a network failure', () => {
    expect(describeAuthError(err('network_error'))).toMatch(/Network error/i);
  });

  it('falls back to the underlying message for unmapped codes', () => {
    const msg = describeAuthError(err('some-new-code', 'Underlying detail'));
    expect(msg).toMatch(/Underlying detail/);
  });

  it('handles non-Supabase errors gracefully', () => {
    expect(describeAuthError(new Error('boom'))).toMatch(/boom/);
    expect(describeAuthError(null)).toMatch(/Sign-in failed/);
    expect(describeAuthError(undefined)).toMatch(/Sign-in failed/);
  });

  it('no longer maps Firebase error codes to Firebase instructions', () => {
    // Regression guard: these codes were special-cased while Firebase Auth was
    // one of two providers. Now that Supabase is the sole provider they must
    // fall through to the generic message, not point at a Firebase console.
    const msg = describeAuthError(err('auth/unauthorized-domain'));
    expect(msg).not.toMatch(/Firebase/i);
    expect(msg).not.toMatch(/Authorized domains/i);
    expect(msg).toMatch(/Sign-in failed/);
  });
});

describe('isCancellation', () => {
  it('treats an OAuth denial as cancellation', () => {
    expect(isCancellation(err('access_denied'))).toBe(true);
    expect(isCancellation({ name: 'user_cancelled' })).toBe(true);
  });

  it('does not treat real failures as cancellation', () => {
    expect(isCancellation(err('validation_failed'))).toBe(false);
    expect(isCancellation(err('network_error'))).toBe(false);
    expect(isCancellation(new Error('boom'))).toBe(false);
    expect(isCancellation(null)).toBe(false);
  });
});

describe('describeAuthErrorWithCode', () => {
  it('keeps the actionable message and appends the raw code', () => {
    const msg = describeAuthErrorWithCode(err('bad_oauth_callback'));
    expect(msg).toMatch(/Redirect URLs/i);
    expect(msg).toContain('bad_oauth_callback');
  });

  it('omits the code line when the error has no code', () => {
    // `new Error('boom')` has name "Error", which is noise, not a diagnostic.
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
