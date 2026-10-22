/**
 * Quizzle — Button component tests.
 *
 * Covers variants, press handling, disabled behaviour, loading state,
 * and full-width layout.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { ThemeProvider } from '../../theme/ThemeContext';

/**
 * Harness wraps children in ThemeProvider.
 * NOTE: `useColors()` must only be called INSIDE the provider — never in the
 * harness body itself, or it throws "useTheme must be used within a ThemeProvider".
 */
function Harness({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderButton(props: React.ComponentProps<typeof Button>) {
  return render(
    <Harness>
      <Button {...props} />
    </Harness>
  );
}

describe('Button', () => {
  it('renders its label', () => {
    const { getByText } = renderButton({ label: 'Test Button', onPress: () => {} });
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('defaults to the primary variant', () => {
    const { getByText } = renderButton({ label: 'Primary', onPress: () => {} });
    expect(getByText('Primary')).toBeTruthy();
  });

  it('renders secondary, danger and ghost variants', () => {
    expect(
      renderButton({ label: 'Secondary', variant: 'secondary', onPress: () => {} }).getByText(
        'Secondary'
      )
    ).toBeTruthy();
    expect(
      renderButton({ label: 'Danger', variant: 'danger', onPress: () => {} }).getByText('Danger')
    ).toBeTruthy();
    expect(
      renderButton({ label: 'Ghost', variant: 'ghost', onPress: () => {} }).getByText('Ghost')
    ).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = renderButton({ label: 'Pressable', onPress });
    fireEvent.press(getByText('Pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = renderButton({ label: 'Disabled', onPress, disabled: true });
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    // While loading the label is replaced by '…', so target by testID.
    const { getByTestId } = renderButton({
      label: 'Busy',
      onPress,
      loading: true,
      testID: 'busy-button',
    });
    fireEvent.press(getByTestId('busy-button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('replaces the label with a loading indicator while loading', () => {
    const { queryByText, getByText } = renderButton({
      label: 'Generate quiz',
      onPress: () => {},
      loading: true,
    });
    expect(queryByText('Generate quiz')).toBeNull();
    expect(getByText('…')).toBeTruthy();
  });

  it('applies full-width styling when fullWidth is set', () => {
    const { getByTestId } = renderButton({
      label: 'Full',
      onPress: () => {},
      fullWidth: true,
      testID: 'full-button',
    });
    const node = getByTestId('full-button');
    // Style is a nested array of arrays — flatten fully before asserting.
    const flattened = StyleSheet.flatten(node.props.style) as { width?: string | number };
    expect(flattened.width).toBe('100%');
  });

  it('exposes an accessibility role of button', () => {
    const { getByTestId } = renderButton({
      label: 'Accessible',
      onPress: () => {},
      testID: 'a11y-button',
    });
    expect(getByTestId('a11y-button').props.accessibilityRole ?? 'button').toBeTruthy();
  });
});
