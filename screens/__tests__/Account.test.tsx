/**
 * Quizzle — Account screen tests.
 *
 * The screen is presentational: the shell owns auth state and injects the
 * handler, so these tests never touch Firebase.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { AccountScreen, getInitials } from '../Account';
import { ThemeProvider } from '../../theme/ThemeContext';

function Harness({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'uid-1',
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
    photoURL: null,
    ...overrides,
  } as unknown as User;
}

function renderAccount(overrides: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  const props = {
    user: makeUser(),
    onSignOut: jest.fn(),
    ...overrides,
  };
  const utils = render(
    <Harness>
      <AccountScreen {...props} />
    </Harness>
  );
  return { ...utils, onSignOut: props.onSignOut };
}

describe('AccountScreen — identity', () => {
  it('shows the user name and email', () => {
    const { getByText } = renderAccount();
    expect(getByText('Ada Lovelace')).toBeTruthy();
    expect(getByText('ada@example.com')).toBeTruthy();
  });

  it('renders the profile photo when a photo URL is available', () => {
    const { getByLabelText, queryByLabelText } = renderAccount({
      user: makeUser({ photoURL: 'https://example.com/avatar.png' }),
    });
    expect(getByLabelText("Ada Lovelace's profile photo")).toBeTruthy();
    expect(queryByLabelText('No profile photo')).toBeNull();
  });

  it('falls back to an initials avatar when there is no photo', () => {
    const { getByLabelText, getByText, queryByLabelText } = renderAccount({
      user: makeUser({ photoURL: null }),
    });
    expect(getByLabelText('No profile photo')).toBeTruthy();
    expect(getByText('AL')).toBeTruthy();
    expect(queryByLabelText("Ada Lovelace's profile photo")).toBeNull();
  });

  it('falls back to "Signed in" when the account has no display name', () => {
    const { getByText, queryByText } = renderAccount({
      user: makeUser({ displayName: null }),
    });
    expect(getByText('Signed in')).toBeTruthy();
    expect(queryByText('Ada Lovelace')).toBeNull();
  });

  it('omits the email line when the account has no email', () => {
    const { queryByText } = renderAccount({ user: makeUser({ email: null }) });
    expect(queryByText('ada@example.com')).toBeNull();
  });
});

describe('AccountScreen — sign out', () => {
  it('calls onSignOut when pressed', () => {
    const { getByLabelText, onSignOut } = renderAccount();
    fireEvent.press(getByLabelText('Sign out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('disables the button while the sign-out request is in flight', () => {
    const { getByLabelText } = renderAccount({ signingOut: true });
    expect(getByLabelText('Sign out').props.accessibilityState?.disabled).toBe(true);
  });

  it('enables the button when idle', () => {
    const { getByLabelText } = renderAccount({ signingOut: false });
    expect(getByLabelText('Sign out').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('shows a sign-out error so the user knows it did not happen', () => {
    const { getByText } = renderAccount({ error: 'Network error while contacting Firebase.' });
    expect(getByText('Network error while contacting Firebase.')).toBeTruthy();
  });

  it('shows no error when there is none', () => {
    const { queryByText } = renderAccount({ error: null });
    expect(queryByText(/Network error/)).toBeNull();
  });
});

describe('AccountScreen — loading', () => {
  it('shows a loading state rather than an empty identity when user is null', () => {
    const { getByText, queryByText } = renderAccount({ user: null });
    expect(getByText('Loading your account…')).toBeTruthy();
    expect(queryByText('Signed in')).toBeNull();
  });
});

describe('getInitials', () => {
  it('uses the first letters of a display name', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
  });

  it('falls back to the email when there is no display name', () => {
    expect(getInitials(null, 'ada@example.com')).toBe('AE');
  });

  it('uses two letters from a single word', () => {
    expect(getInitials('Ada')).toBe('AD');
  });

  it('returns a placeholder when there is nothing to derive from', () => {
    expect(getInitials(null, null)).toBe('?');
    expect(getInitials('', '')).toBe('?');
  });
});
