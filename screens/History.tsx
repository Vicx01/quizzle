/**
 * History screen — the signed-in user's saved quizzes.
 *
 * Reads through Supabase as the caller, so Row Level Security decides what
 * appears: a user sees only their own non-deleted quizzes, and there is no
 * client-side filtering to get wrong.
 *
 * Deletion is a SOFT delete (services/quizzes.ts → public.soft_delete_quiz).
 * The row survives so it can be purged on the documented retention schedule
 * rather than vanishing silently and unrecoverably.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, fontWeight, radius } from '../theme/tokens';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '../components/States';
import { TabBar } from '../components/TabBar';
import { deleteQuiz, listQuizzes, type QuizRow } from '../services/quizzes';

interface HistoryScreenProps {
  onTabChange: (tab: string) => void;
  offline?: boolean;
}

export function HistoryScreen({ onTabChange, offline = false }: HistoryScreenProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuizRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listQuizzes();
      setQuizzes(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your quizzes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const ok = await deleteQuiz(pendingDelete.id);
      if (!ok) {
        // The function returns false when the caller does not own the row.
        setError('That quiz could not be deleted. You may no longer own it.');
      } else {
        // Refresh rather than mutating locally, so the list always reflects
        // what the database actually returns under RLS.
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete that quiz.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, load]);

  return (
    <View style={styles.root}>
      <TabBar activeTab="history" onTabChange={onTabChange} />

      {offline ? <OfflineBanner /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>quizzle</Text>
          <Text style={styles.sectionTitle}>Your quizzes</Text>
        </View>

        {loading ? (
          <LoadingState message="Loading your quizzes…" />
        ) : error ? (
          <ErrorState description={error} onRetry={() => void load()} retryLabel="Try again" />
        ) : quizzes.length === 0 ? (
          <EmptyState
            heading="No saved quizzes yet"
            subtitle="Quizzes you save will appear here."
            actionLabel="Create a quiz"
            onAction={() => onTabChange('generate')}
          />
        ) : (
          <View style={styles.list}>
            {quizzes.map(quiz => (
              <View key={quiz.id} style={styles.card}>
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {quiz.title}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {`${quiz.format} · ${quiz.difficulty} · ${quiz.question_count} question${
                      quiz.question_count === 1 ? '' : 's'
                    }`}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {quiz.timer_seconds
                      ? `Timed · ${Math.round(quiz.timer_seconds / 60)} min`
                      : 'Untimed'}
                    {` · Saved ${formatDate(quiz.created_at)}`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setPendingDelete(quiz)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${quiz.title}`}
                  testID={`delete-${quiz.id}`}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Dialog
        visible={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this quiz?"
        actions={
          <>
            <Button label="Cancel" variant="secondary" onPress={() => setPendingDelete(null)} />
            <Button
              label={deleting ? 'Deleting…' : 'Delete'}
              variant="danger"
              onPress={() => void confirmDelete()}
              disabled={deleting}
              testID="confirm-delete"
            />
          </>
        }
        testID="delete-dialog"
      >
        <Text style={styles.dialogBody}>
          {`“${pendingDelete?.title ?? ''}” will be moved to the bin. It disappears from this list right away.`}
        </Text>
      </Dialog>
    </View>
  );
}

/** Locale-stable date formatting without pulling in a date library. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

interface Styles {
  root: ViewStyle;
  content: ViewStyle;
  header: ViewStyle;
  wordmark: TextStyle;
  sectionTitle: TextStyle;
  list: ViewStyle;
  card: ViewStyle;
  cardMain: ViewStyle;
  cardTitle: TextStyle;
  cardMeta: TextStyle;
  deleteButton: ViewStyle;
  deleteText: TextStyle;
  dialogBody: TextStyle;
}

function getStyles(colors: ReturnType<typeof useColors>): Styles {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      flexDirection: 'row',
      gap: space[3],
      justifyContent: 'space-between',
      padding: space[4],
    },
    cardMain: {
      flex: 1,
      gap: space[1],
    },
    cardMeta: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
    },
    content: {
      flexGrow: 1,
      gap: space[4],
      padding: space[6],
    },
    deleteButton: {
      borderColor: colors.danger,
      borderRadius: radius.small,
      borderWidth: 1,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
    },
    deleteText: {
      color: colors.danger,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    dialogBody: {
      color: colors.textSecondary,
      fontSize: fontSize.base,
    },
    header: {
      gap: space[1],
      marginBottom: space[2],
    },
    list: {
      gap: space[3],
    },
    root: {
      flex: 1,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: fontSize.base,
    },
    wordmark: {
      color: colors.textPrimary,
      fontSize: fontSize['2xl'],
      fontWeight: '700',
    },
  }) as Styles;
}
