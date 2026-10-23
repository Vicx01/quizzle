/**
 * Quizzle — History screen tests.
 *
 * The screen is driven entirely through `services/quizzes`, which is mocked,
 * so these tests describe the states the user can actually land in: loading,
 * empty, error-with-retry, a populated list, and the delete confirmation flow.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HistoryScreen } from '../History';
import { ThemeProvider } from '../../theme/ThemeContext';
import { deleteQuiz, listQuizzes } from '../../services/quizzes';

jest.mock('../../services/quizzes', () => ({
  listQuizzes: jest.fn(),
  deleteQuiz: jest.fn(),
}));

const mockList = listQuizzes as jest.Mock;
const mockDelete = deleteQuiz as jest.Mock;

function Harness({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function makeQuiz(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quiz-1',
    owner_id: 'user-1',
    title: 'Photosynthesis',
    format: 'MCQ',
    difficulty: 'Easy',
    question_count: 2,
    timer_seconds: null,
    source_type: 'text',
    source_meta: {},
    deleted_at: null,
    created_at: '2026-10-23T10:00:00Z',
    updated_at: '2026-10-23T10:00:00Z',
    ...overrides,
  };
}

function renderHistory() {
  const onTabChange = jest.fn();
  const utils = render(
    <Harness>
      <HistoryScreen onTabChange={onTabChange} />
    </Harness>
  );
  return { ...utils, onTabChange };
}

beforeEach(() => {
  mockList.mockReset();
  mockDelete.mockReset();
});

describe('HistoryScreen — loading', () => {
  it('shows a loading state while quizzes are fetched', () => {
    mockList.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByText } = renderHistory();
    expect(getByText('Loading your quizzes…')).toBeTruthy();
  });
});

describe('HistoryScreen — empty', () => {
  it('offers to create a quiz when there are none', async () => {
    mockList.mockResolvedValue([]);
    const { getByText, onTabChange } = renderHistory();

    await waitFor(() => expect(getByText('No saved quizzes yet')).toBeTruthy());

    fireEvent.press(getByText('Create a quiz'));
    expect(onTabChange).toHaveBeenCalledWith('generate');
  });
});

describe('HistoryScreen — error', () => {
  it('shows the failure and can retry', async () => {
    mockList.mockRejectedValueOnce(new Error('Network down'));
    mockList.mockResolvedValueOnce([]);

    const { getByText } = renderHistory();
    await waitFor(() => expect(getByText('Network down')).toBeTruthy());

    fireEvent.press(getByText('Try again'));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getByText('No saved quizzes yet')).toBeTruthy());
  });
});

describe('HistoryScreen — populated list', () => {
  it('renders each quiz with its format, difficulty and question count', async () => {
    mockList.mockResolvedValue([makeQuiz(), makeQuiz({ id: 'quiz-2', title: 'Mitosis' })]);

    const { getByText, getAllByText } = renderHistory();
    await waitFor(() => expect(getByText('Photosynthesis')).toBeTruthy());

    expect(getByText('Mitosis')).toBeTruthy();
    // Two cards share the same metadata line, hence getAllByText.
    expect(getAllByText('MCQ · Easy · 2 questions')).toHaveLength(2);
    expect(getAllByText(/Untimed/)).toHaveLength(2);
  });

  it('singularises the question count', async () => {
    mockList.mockResolvedValue([makeQuiz({ question_count: 1 })]);
    const { getByText } = renderHistory();
    await waitFor(() => expect(getByText('MCQ · Easy · 1 question')).toBeTruthy());
  });
});

describe('HistoryScreen — delete', () => {
  it('asks for confirmation before deleting', async () => {
    mockList.mockResolvedValue([makeQuiz()]);
    const { getByTestId, queryByTestId } = renderHistory();

    await waitFor(() => expect(getByTestId('delete-quiz-1')).toBeTruthy());
    expect(queryByTestId('delete-dialog')).toBeNull();

    fireEvent.press(getByTestId('delete-quiz-1'));
    await waitFor(() => expect(queryByTestId('delete-dialog')).toBeTruthy());
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes and reloads once confirmed', async () => {
    mockList.mockResolvedValue([makeQuiz()]);
    mockDelete.mockResolvedValue(true);

    const { getByTestId } = renderHistory();
    await waitFor(() => expect(getByTestId('delete-quiz-1')).toBeTruthy());

    fireEvent.press(getByTestId('delete-quiz-1'));
    await waitFor(() => expect(getByTestId('delete-dialog')).toBeTruthy());

    fireEvent.press(getByTestId('confirm-delete'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('quiz-1'));
    // The list is refetched so it reflects what the database returns, rather
    // than a locally filtered copy that could disagree with RLS.
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it('reports a failure when the delete does not happen', async () => {
    mockList.mockResolvedValue([makeQuiz()]);
    // soft_delete_quiz returns false when the caller does not own the row.
    mockDelete.mockResolvedValue(false);

    const { getByTestId, getByText } = renderHistory();
    await waitFor(() => expect(getByTestId('delete-quiz-1')).toBeTruthy());

    fireEvent.press(getByTestId('delete-quiz-1'));
    await waitFor(() => expect(getByTestId('delete-dialog')).toBeTruthy());

    fireEvent.press(getByTestId('confirm-delete'));
    await waitFor(() => expect(getByText(/could not be deleted/i)).toBeTruthy());
  });
});
