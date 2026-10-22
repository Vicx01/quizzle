/**
 * Quizzle — auth error-mapping tests.
 *
 * Covers the mapping from Firebase Auth error codes to actionable messages.
 * These are pure-logic tests; no live Firebase project is contacted.
 */

import { describeAuthError, isCancellation } from '../auth';

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
