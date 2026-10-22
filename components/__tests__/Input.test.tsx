/**
 * Quizzle — Input component tests.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';
import { ThemeProvider } from '../../theme/ThemeContext';

function Harness({ ...props }: any) {
  return (
    <ThemeProvider>
      <Input value="" onChangeText={() => {}} {...props} />
    </ThemeProvider>
  );
}

describe('Input', () => {
  it('renders with label', () => {
    const { getByText } = render(<Harness label="Email" placeholder="Enter email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error text when error prop is set', () => {
    const { getByText } = render(<Harness label="Email" error="Invalid email" />);
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Harness placeholder="Type here" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });

  it('is disabled when disabled prop is set', () => {
    const { getByPlaceholderText } = render(<Harness placeholder="Disabled" disabled />);
    const input = getByPlaceholderText('Disabled');
    expect(input.props.editable).toBe(false);
  });
});
