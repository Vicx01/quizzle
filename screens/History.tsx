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
import {
  buildShareUrl,
  createShareLink,
  listShareLinks,
  revokeShareLink,
  type ShareLinkSummary,
} from '../services/sharing';

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

  const [shareFor, setShareFor] = useState<QuizRow | null>(null);
  const [links, setLinks] = useState<ShareLinkSummary[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [newLink, setNewLink] = useState<{ token: string; expiresAt: string } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const activeLinks = links.filter(l => !l.revoked_at);

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

  const openShare = useCallback(async (quiz: QuizRow) => {
    setShareFor(quiz);
    setNewLink(null);
    setShareError(null);
    setLinksLoading(true);
    try {
      setLinks(await listShareLinks(quiz.id));
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Could not load share links.');
    } finally {
      setLinksLoading(false);
    }
  }, []);

  const closeShare = useCallback(() => {
    setShareFor(null);
    setNewLink(null);
    setShareError(null);
  }, []);

  const handleCreateLink = useCallback(async () => {
    if (!shareFor) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const link = await createShareLink(shareFor.id, { expiresInDays: 7 });
      if (!link.token) throw new Error('The link was created without a token.');
      // Shown once. Only a hash is stored, so it cannot be retrieved later.
      setNewLink({ token: link.token, expiresAt: link.expiresAt });
      setLinks(await listShareLinks(shareFor.id));
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'The share link could not be created.');
    } finally {
      setShareBusy(false);
    }
  }, [shareFor]);

  const handleRevoke = useCallback(
    async (linkId: string) => {
      if (!shareFor) return;
      setShareBusy(true);
      setShareError(null);
      try {
        await revokeShareLink(linkId);
        setLinks(await listShareLinks(shareFor.id));
      } catch (e) {
        setShareError(e instanceof Error ? e.message : 'The link could not be revoked.');
      } finally {
        setShareBusy(false);
      }
    },
    [shareFor]
  );

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
                  style={styles.shareButton}
                  onPress={() => void openShare(quiz)}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${quiz.title}`}
                  testID={`share-${quiz.id}`}
                >
                  <Text style={styles.shareText}>Share</Text>
                </TouchableOpacity>

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
        visible={shareFor !== null}
        onClose={closeShare}
        title={`Share “${shareFor?.title ?? ''}”`}
        actions={
          <>
            <Button label="Close" variant="secondary" onPress={closeShare} />
            <Button
              label={shareBusy ? 'Working…' : 'Create link'}
              onPress={() => void handleCreateLink()}
              disabled={shareBusy}
            />
          </>
        }
        testID="share-dialog"
      >
        {shareError ? <Text style={styles.shareError}>{shareError}</Text> : null}

        {newLink ? (
          <View style={styles.newLinkBox} testID="new-share-link">
            <Text style={styles.shareLabel}>New link — copy it now</Text>
            <Text style={styles.shareUrl}>{buildShareUrl(newLink.token)}</Text>
            <Text style={styles.shareHint}>
              {`Expires ${newLink.expiresAt.slice(0, 10)}. Shown once — only a hash is stored, so it cannot be retrieved later.`}
            </Text>
          </View>
        ) : null}

        <Text style={styles.shareLabel}>
          {linksLoading ? 'Loading links…' : `Active links (${activeLinks.length})`}
        </Text>
        {activeLinks.length === 0 && !linksLoading ? (
          <Text style={styles.shareHint}>No active links yet.</Text>
        ) : (
          activeLinks.map(link => (
            <View key={link.id} style={styles.linkRow}>
              <Text style={styles.shareHint}>
                {`Expires ${link.expires_at.slice(0, 10)} · ${link.access_count}${
                  link.max_access ? ` / ${link.max_access}` : ''
                } uses`}
              </Text>
              <TouchableOpacity
                onPress={() => void handleRevoke(link.id)}
                accessibilityRole="button"
                accessibilityLabel="Revoke link"
                testID={`revoke-${link.id}`}
              >
                <Text style={styles.revokeText}>Revoke</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </Dialog>

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
  shareButton: ViewStyle;
  shareText: TextStyle;
  shareLabel: TextStyle;
  shareUrl: TextStyle;
  shareHint: TextStyle;
  shareError: TextStyle;
  newLinkBox: ViewStyle;
  linkRow: ViewStyle;
  revokeText: TextStyle;
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
    linkRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: space[3],
      justifyContent: 'space-between',
    },
    list: {
      gap: space[3],
    },
    newLinkBox: {
      borderColor: colors.border,
      borderRadius: radius.small,
      borderWidth: 1,
      gap: space[1],
      marginBottom: space[3],
      padding: space[3],
    },
    revokeText: {
      color: colors.danger,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    root: {
      flex: 1,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: fontSize.base,
    },
    shareButton: {
      borderColor: colors.borderControl,
      borderRadius: radius.small,
      borderWidth: 1,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
    },
    shareError: {
      color: colors.danger,
      fontSize: fontSize.sm,
    },
    shareHint: {
      color: colors.textTertiary,
      fontSize: fontSize.xs,
    },
    shareLabel: {
      color: colors.textPrimary,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    shareText: {
      color: colors.textPrimary,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    shareUrl: {
      color: colors.accent,
      fontSize: fontSize.sm,
    },
    wordmark: {
      color: colors.textPrimary,
      fontSize: fontSize['2xl'],
      fontWeight: '700',
    },
  }) as Styles;
}
