/**
 * Quizzle — Firebase configuration diagnostics tests.
 *
 * These run WITHOUT real credentials: they validate the detection logic that
 * tells the user what is missing, not any live Firebase behaviour.
 */

import {
  getFirebaseConfigStatus,
  validateFirebaseConfig,
  looksLikePlaceholder,
  REQUIRED_FIREBASE_ENV,
} from '../firebase';

/** A complete, obviously-fake-but-well-formed config used as the "good" baseline. */
const VALID = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'AIzaSyDUMMYKEYFORTESTS1234567890abcdefg',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'quizzle-test.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'quizzle-test',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456789012:web:abcdef1234567890',
};

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  const keys = [
    ...Object.keys(VALID),
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  ];
  for (const k of keys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

describe('looksLikePlaceholder', () => {
  it('detects .env.example placeholder values', () => {
    expect(looksLikePlaceholder('your-firebase-web-api-key')).toBe(true);
    expect(looksLikePlaceholder('your-project-id')).toBe(true);
    expect(looksLikePlaceholder('your-project-id.firebaseapp.com')).toBe(true);
  });

  it('detects all-zero template ids', () => {
    expect(looksLikePlaceholder('1:000000000000:web:0000000000000000000000')).toBe(true);
  });

  it('accepts realistic values', () => {
    expect(looksLikePlaceholder('AIzaSyDUMMYKEYFORTESTS1234567890abcdefg')).toBe(false);
    expect(looksLikePlaceholder('quizzle-test')).toBe(false);
    expect(looksLikePlaceholder('quizzle-test.firebaseapp.com')).toBe(false);
  });

  it('treats empty and undefined as not placeholders (they are "missing")', () => {
    expect(looksLikePlaceholder(undefined)).toBe(false);
    expect(looksLikePlaceholder('')).toBe(false);
  });
});

describe('getFirebaseConfigStatus', () => {
  it('reports every required variable missing when none are set', () => {
    withEnv({}, () => {
      const status = getFirebaseConfigStatus();
      expect(status.ok).toBe(false);
      expect(status.errors.map(e => e.key).sort()).toEqual([...REQUIRED_FIREBASE_ENV].sort());
      expect(status.errors.every(e => e.kind === 'missing')).toBe(true);
    });
  });

  it('accepts a well-formed config', () => {
    withEnv(VALID, () => {
      const status = getFirebaseConfigStatus();
      expect(status.errors).toEqual([]);
      expect(status.ok).toBe(true);
    });
  });

  it('flags values that were copied from .env.example unchanged', () => {
    withEnv(
      {
        EXPO_PUBLIC_FIREBASE_API_KEY: 'your-firebase-web-api-key',
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'your-project-id.firebaseapp.com',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'your-project-id',
        EXPO_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
      },
      () => {
        const status = getFirebaseConfigStatus();
        expect(status.ok).toBe(false);
        expect(status.errors.every(e => e.kind === 'placeholder')).toBe(true);
        expect(status.errors).toHaveLength(4);
      }
    );
  });

  it('flags a malformed project ID', () => {
    withEnv({ ...VALID, EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'Not A Valid Project' }, () => {
      const status = getFirebaseConfigStatus();
      expect(status.ok).toBe(false);
      const err = status.errors.find(e => e.key === 'EXPO_PUBLIC_FIREBASE_PROJECT_ID');
      expect(err?.kind).toBe('invalid');
    });
  });

  it('flags a malformed auth domain', () => {
    withEnv({ ...VALID, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'not a domain' }, () => {
      const status = getFirebaseConfigStatus();
      expect(status.ok).toBe(false);
      const err = status.errors.find(e => e.key === 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
      expect(err?.kind).toBe('invalid');
    });
  });

  it('treats recommended-but-optional variables as warnings, not errors', () => {
    withEnv(VALID, () => {
      const status = getFirebaseConfigStatus();
      expect(status.ok).toBe(true);
      expect(status.warnings.map(w => w.key)).toEqual(
        expect.arrayContaining([
          'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
          'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        ])
      );
    });
  });

  it('trims whitespace around values', () => {
    withEnv({ ...VALID, EXPO_PUBLIC_FIREBASE_PROJECT_ID: '  quizzle-test  ' }, () => {
      expect(getFirebaseConfigStatus().ok).toBe(true);
    });
  });
});

describe('validateFirebaseConfig', () => {
  it('returns an empty list when configured', () => {
    withEnv(VALID, () => {
      expect(validateFirebaseConfig()).toEqual([]);
    });
  });

  it('returns the offending keys when misconfigured', () => {
    withEnv({}, () => {
      expect(validateFirebaseConfig().sort()).toEqual([...REQUIRED_FIREBASE_ENV].sort());
    });
  });
});
