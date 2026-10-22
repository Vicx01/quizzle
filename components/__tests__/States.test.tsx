/**
 * Quizzle — state component tests (loading, empty, error, offline).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoadingState, EmptyState, ErrorState, OfflineState, OfflineBanner } from '../States';
import { ThemeProvider } from '../../theme/ThemeContext';

function Harness({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('LoadingState', () => {
  it('shows the default message', () => {
    const { getByText } = render(
      <Harness>
        <LoadingState />
      </Harness>
    );
    expect(getByText('Loading…')).toBeTruthy();
  });

  it('shows a custom message', () => {
    const { getByText } = render(
      <Harness>
        <LoadingState message="Generating quiz…" />
      </Harness>
    );
    expect(getByText('Generating quiz…')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders heading and subtitle', () => {
    const { getByText } = render(
      <Harness>
        <EmptyState heading="No saved quizzes" subtitle="Generate your first quiz." />
      </Harness>
    );
    expect(getByText('No saved quizzes')).toBeTruthy();
    expect(getByText('Generate your first quiz.')).toBeTruthy();
  });

  it('calls onAction when the action button is pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <Harness>
        <EmptyState heading="Empty" actionLabel="Create quiz" onAction={onAction} />
      </Harness>
    );
    fireEvent.press(getByText('Create quiz'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders no action button when onAction is omitted', () => {
    const { queryByText } = render(
      <Harness>
        <EmptyState heading="Empty" actionLabel="Create quiz" />
      </Harness>
    );
    expect(queryByText('Create quiz')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('renders the description and default heading', () => {
    const { getByText } = render(
      <Harness>
        <ErrorState description="Unable to generate quiz." />
      </Harness>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Unable to generate quiz.')).toBeTruthy();
  });

  it('renders a retry button that calls onRetry', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <Harness>
        <ErrorState description="Boom." onRetry={onRetry} />
      </Harness>
    );
    fireEvent.press(getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits retry when no handler is given', () => {
    const { queryByText } = render(
      <Harness>
        <ErrorState description="Boom." />
      </Harness>
    );
    expect(queryByText('Try again')).toBeNull();
  });

  it('uses a custom retry label', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <Harness>
        <ErrorState description="Boom." onRetry={onRetry} retryLabel="Reload" />
      </Harness>
    );
    expect(getByText('Reload')).toBeTruthy();
  });
});

describe('OfflineState', () => {
  it('states plainly that the action needs a connection', () => {
    const { getByText } = render(
      <Harness>
        <OfflineState action="Generating a quiz" />
      </Harness>
    );
    expect(getByText('No connection')).toBeTruthy();
    expect(
      getByText("You're offline. Generating a quiz needs an internet connection.")
    ).toBeTruthy();
  });

  it('falls back to a generic message without an action', () => {
    const { getByText } = render(
      <Harness>
        <OfflineState />
      </Harness>
    );
    expect(getByText("You're offline. Reconnect to continue.")).toBeTruthy();
  });

  it('renders a retry button that calls onRetry', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <Harness>
        <OfflineState onRetry={onRetry} />
      </Harness>
    );
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('OfflineBanner', () => {
  it('warns that changes will not be saved', () => {
    const { getByText } = render(
      <Harness>
        <OfflineBanner />
      </Harness>
    );
    expect(
      getByText("You're offline. Changes will not be saved until you reconnect.")
    ).toBeTruthy();
  });
});
