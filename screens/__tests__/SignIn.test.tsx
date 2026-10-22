/**
 * Quizzle — Sign-in screen tests.
 *
 * Verifies the two mutually exclusive states:
 *  - Firebase misconfigured -> setup checklist, NO sign-in button (we must never
 *    render a control that cannot work).
 *  - Firebase configured    -> working sign-in button.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignInScreen } from '../SignIn';
import { ThemeProvider } from '../../theme/ThemeContext';
import type { ConfigStatus } from '../../services/firebase';

function Harness({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const OK_STATUS: ConfigStatus = { ok: true, errors: [], warnings: [] };

const BROKEN_STATUS: ConfigStatus = {
  ok: false,
  errors: [
    { key: 'EXPO_PUBLIC_FIREBASE_API_KEY', kind: 'missing', message: 'not set' },
    { key: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', kind: 'placeholder', message: 'placeholder' },
  ],
  warnings: [],
};

describe('SignInScreen — configured', () => {
  it('renders the Google sign-in button', () => {
    const { getByLabelText } = render(
      <Harness>
        <SignInScreen onSignIn={() => {}} configStatus={OK_STATUS} />
      </Harness>
    );
    expect(getByLabelText('Sign in with Google')).toBeTruthy();
  });

  it('calls onSignIn when pressed', () => {
    const onSignIn = jest.fn();
    const { getByLabelText } = render(
      <Harness>
        <SignInScreen onSignIn={onSignIn} configStatus={OK_STATUS} />
      </Harness>
    );
    fireEvent.press(getByLabelText('Sign in with Google'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('does NOT show the setup checklist', () => {
    const { queryByTestId } = render(
      <Harness>
        <SignInScreen onSignIn={() => {}} configStatus={OK_STATUS} />
      </Harness>
    );
    expect(queryByTestId('firebase-setup-panel')).toBeNull();
  });

  it('shows an inline error when provided', () => {
    const { getByText } = render(
      <Harness>
        <SignInScreen onSignIn={() => {}} configStatus={OK_STATUS} error="Popup blocked" />
      </Harness>
    );
    expect(getByText('Popup blocked')).toBeTruthy();
  });
});

describe('SignInScreen — misconfigured', () => {
  it('shows the setup checklist', () => {
    const { getByTestId, getByText } = render(
      <Harness>
        <SignInScreen onSignIn={() => {}} configStatus={BROKEN_STATUS} />
      </Harness>
    );
    expect(getByTestId('firebase-setup-panel')).toBeTruthy();
    expect(getByText('Finish Firebase setup')).toBeTruthy();
  });

  it('names each missing variable so the user knows exactly what to set', () => {
    const { getByText } = render(
      <Harness>
        <SignInScreen onSignIn={() => {}} configStatus={BROKEN_STATUS} />
      </Harness>
    );
    expect(getByText(/EXPO_PUBLIC_FIREBASE_API_KEY/)).toBeTruthy();
    expect(getByText(/EXPO_PUBLIC_FIREBASE_PROJECT_ID/)).toBeTruthy();
  });

  it('does NOT render the sign-in button (no dead control)', () => {
    const { queryByLabelText } = render(
      <Harness>
        <SignInScreen onSignIn={() => {}} configStatus={BROKEN_STATUS} />
      </Harness>
    );
    expect(queryByLabelText('Sign in with Google')).toBeNull();
  });
});
