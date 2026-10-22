/**
 * Quizzle — Generate screen tests.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GenerateScreen } from '../Generate';
import { ThemeProvider } from '../../theme/ThemeContext';

function Harness({ ...props }: any) {
  return (
    <ThemeProvider>
      <GenerateScreen onTabChange={() => {}} {...props} />
    </ThemeProvider>
  );
}

describe('GenerateScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<Harness />);
    expect(getByText('quizzle')).toBeTruthy();
    expect(getByText('Create a quiz')).toBeTruthy();
  });

  it('renders source material section', () => {
    const { getByText } = render(<Harness />);
    expect(getByText('Source material')).toBeTruthy();
    expect(getByText('Paste text')).toBeTruthy();
    expect(getByText('Upload file')).toBeTruthy();
  });

  it('renders configuration section', () => {
    const { getByText } = render(<Harness />);
    expect(getByText('Configuration')).toBeTruthy();
    expect(getByText('Question format')).toBeTruthy();
    expect(getByText('Difficulty')).toBeTruthy();
    expect(getByText('Question count')).toBeTruthy();
  });

  it('renders generate button', () => {
    const { getByText } = render(<Harness />);
    expect(getByText('Generate quiz')).toBeTruthy();
  });

  it('renders NO quota indicator when usage is unknown (never invents statistics)', () => {
    const { queryByText } = render(<Harness />);
    expect(queryByText(/Daily generations/)).toBeNull();
  });

  it('renders the quota indicator when real usage data is supplied', () => {
    const { getByText } = render(<Harness quota={{ used: 12, limit: 50 }} />);
    expect(getByText('Daily generations: 12 / 50')).toBeTruthy();
  });

  it('changes source tab when pressed', () => {
    const { getByText } = render(<Harness />);
    fireEvent.press(getByText('Upload file'));
    // Tab should switch - the paste area should be replaced by upload area
    expect(getByText('Choose PDF, DOCX, or TXT')).toBeTruthy();
  });

  it('shows an offline notice when offline', () => {
    const { getByText } = render(<Harness offline />);
    expect(
      getByText("You're offline. Changes will not be saved until you reconnect.")
    ).toBeTruthy();
  });

  it('shows no offline notice when online', () => {
    const { queryByText } = render(<Harness />);
    expect(queryByText(/offline/i)).toBeNull();
  });

  it('shows empty state when no source', () => {
    const { getByText } = render(<Harness />);
    expect(getByText('Enter source material to enable quiz generation.')).toBeTruthy();
  });
});
