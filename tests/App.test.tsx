/**
 * Quizzle — app shell auth-state transition tests.
 *
 * These exercise the shell, not Firebase. `services/auth` is mocked so the
 * tests can drive `onAuthStateChanged` directly and assert the important
 * property: when the session ends, the protected screens go away.
 *
 * The mock factory is written so it references nothing from the module scope —
 * `jest.mock` is hoisted above variable declarations, so referring to an outer
 * `let` from inside the factory would throw a TDZ error.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../App';
import { onAuthStateChanged, signOut } from '../services/auth';

jest.mock('../services/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInWithGoogle: jest.fn(() => Promise.resolve(null)),
  isAuthConfigured: jest.fn(() => true),
  consumeRedirectResult: jest.fn(() => Promise.resolve(null)),
  describeAuthErrorWithCode: jest.fn(
    (e: { message?: string } | null) => e?.message ?? 'Sign-in failed'
  ),
  isCancellation: jest.fn(() => false),
  getCurrentOrigin: jest.fn(() => null),
  isEmbeddedInFrame: jest.fn(() => false),
  signOut: jest.fn(() => Promise.resolve()),
  getAuthConfigStatus: jest.fn(() => ({ ok: true, errors: [], warnings: [] })),
}));

jest.mock('../services/firebase', () => ({
  getFirebaseConfigStatus: () => ({ ok: true, errors: [], warnings: [] }),
}));

const mockOnAuth = onAuthStateChanged as jest.Mock;
const mockSignOut = signOut as jest.Mock;

const USER = {
  id: 'uid-1',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  photoURL: null,
  provider: 'firebase',
};

/** The most recently registered auth listener (one per render). */
function authListener(): (user: unknown) => void {
  const calls = mockOnAuth.mock.calls;
  return calls[calls.length - 1][0] as (user: unknown) => void;
}

/** Moves the shell into the signed-in state and returns the render result. */
async function renderSignedIn() {
  const utils = render(<App />);
  await act(async () => {
    authListener()(USER);
  });
  return utils;
}

async function goToAccountTab(utils: ReturnType<typeof render>) {
  // Only the tab label matches before the Account screen itself renders.
  await act(async () => {
    fireEvent.press(utils.getByText('Account'));
  });
}

beforeEach(() => {
  // mockClear keeps the implementations above but drops recorded calls, so
  // authListener() always reads the current render's listener.
  jest.clearAllMocks();
});

describe('App — auth state transitions', () => {
  it('shows the sign-in screen when there is no user', async () => {
    const { getByLabelText, queryByText } = render(<App />);
    await act(async () => {
      authListener()(null);
    });
    expect(getByLabelText('Sign in with Google')).toBeTruthy();
    expect(queryByText('Create a quiz')).toBeNull();
  });

  it('shows the Generate screen once signed in', async () => {
    const { getByText, queryByLabelText } = await renderSignedIn();
    expect(getByText('Create a quiz')).toBeTruthy();
    expect(queryByLabelText('Sign in with Google')).toBeNull();
  });

  it('shows the signed-in identity on the Account screen', async () => {
    const utils = await renderSignedIn();
    await goToAccountTab(utils);
    expect(utils.getByText('Ada Lovelace')).toBeTruthy();
    expect(utils.getByText('ada@example.com')).toBeTruthy();
    expect(utils.getByLabelText('Sign out')).toBeTruthy();
  });

  it('returns to the sign-in screen after sign-out and hides protected screens', async () => {
    const utils = await renderSignedIn();
    await goToAccountTab(utils);

    await act(async () => {
      fireEvent.press(utils.getByLabelText('Sign out'));
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Firebase's listener reports the session ended.
    await act(async () => {
      authListener()(null);
    });

    expect(utils.getByLabelText('Sign in with Google')).toBeTruthy();
    expect(utils.queryByText('Create a quiz')).toBeNull();
    expect(utils.queryByLabelText('Sign out')).toBeNull();
  });

  it('stays signed in and surfaces the error when sign-out fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Network down'));

    const utils = await renderSignedIn();
    await goToAccountTab(utils);

    await act(async () => {
      fireEvent.press(utils.getByLabelText('Sign out'));
    });

    await waitFor(() => {
      expect(utils.getByText('Network down')).toBeTruthy();
    });

    // Still signed in: the sign-in screen must NOT appear, and the user must
    // still be able to retry.
    expect(utils.queryByLabelText('Sign in with Google')).toBeNull();
    expect(utils.getByLabelText('Sign out')).toBeTruthy();
  });

  it('resets to the Generate tab so a later sign-in does not resume on Account', async () => {
    const utils = await renderSignedIn();
    await goToAccountTab(utils);

    await act(async () => {
      fireEvent.press(utils.getByLabelText('Sign out'));
    });
    await act(async () => {
      authListener()(null);
    });

    // Sign in again.
    await act(async () => {
      authListener()(USER);
    });

    expect(utils.getByText('Create a quiz')).toBeTruthy();
    expect(utils.queryByLabelText('Sign out')).toBeNull();
  });
});
