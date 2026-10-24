/**
 * Take-a-shared-quiz screen.
 *
 * Opened by anyone holding a share link, signed in or not. It reads the quiz
 * through `share-resolve`, which strips the answer key, so at no point before
 * submission does this screen (or the network traffic behind it) contain a
 * correct answer.
 *
 * Results appear only after `share-attempt` has graded the submission on the
 * server — which is also the only place the score is computed. A taker cannot
 * inflate their own result, because `quiz_attempts` has no client write policy.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Input } from '../components/Input';
import { ErrorState, LoadingState, OfflineBanner } from '../components/States';
import {
  resolveSharedQuiz,
  submitSharedAttempt,
  type AttemptResult,
  type SharedQuiz,
} from '../services/sharing';

interface TakeQuizScreenProps {
  token: string;
  offline?: boolean;
  onExit?: () => void;
}

export function TakeQuizScreen({ token, offline = false, onExit }: TakeQuizScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [quiz, setQuiz] = useState<SharedQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuiz(await resolveSharedQuiz(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This link is not available.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const answeredCount = Object.values(answers).filter(v => v.trim().length > 0).length;

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      setResult(await submitSharedAttempt(token, answers));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your answers could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }, [token, answers]);

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingState message="Loading quiz…" />
      </View>
    );
  }

  if (error && !quiz) {
    return (
      <View style={styles.root}>
        {offline ? <OfflineBanner /> : null}
        <ErrorState
          heading="This link is not available"
          description={error}
          onRetry={offline ? undefined : () => void load()}
          retryLabel="Try again"
        />
        {onExit ? (
          <View style={styles.footer}>
            <Button label="Go to Quizzle" variant="secondary" onPress={onExit} />
          </View>
        ) : null}
      </View>
    );
  }

  if (!quiz) return null;

  // Once graded, the result screen replaces the questions: the answers are
  // shown only now, and only alongside what was submitted.
  if (result) {
    return <ResultView quiz={quiz} result={result} styles={styles} onExit={onExit} />;
  }

  return (
    <View style={styles.root}>
      {offline ? <OfflineBanner /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>quizzle</Text>
          <Text style={styles.title}>{quiz.title}</Text>
          <Text style={styles.meta}>
            {`${quiz.format} · ${quiz.difficulty} · ${quiz.questionCount} question${
              quiz.questionCount === 1 ? '' : 's'
            }`}
          </Text>
        </View>

        {quiz.questions.map((question, index) => (
          <View key={question.id} style={styles.card}>
            <Text style={styles.prompt}>{`${index + 1}. ${question.prompt}`}</Text>

            {question.type === 'MCQ' && question.options ? (
              <View style={styles.options}>
                {question.options.map(option => {
                  const selected = answers[question.id] === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option}
                      testID={`option-${question.id}-${option}`}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Input
                label="Your answer"
                value={answers[question.id] ?? ''}
                onChangeText={text => setAnswers(prev => ({ ...prev, [question.id]: text }))}
                placeholder="Type your answer"
                multiline
                numberOfLines={4}
                maxLength={4000}
                containerStyle={styles.theoryInput}
              />
            )}
          </View>
        ))}

        {error ? <ErrorState description={error} /> : null}

        <View style={styles.footer}>
          <Text style={styles.progress}>
            {`${answeredCount} of ${quiz.questions.length} answered`}
          </Text>
          <Button
            label="Submit answers"
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={submitting || answeredCount === 0}
            fullWidth
          />
          {quiz.questions.some(q => q.type === 'theory') ? (
            <Text style={styles.note}>
              Theory questions are recorded and are not scored automatically.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ResultView({
  quiz,
  result,
  styles,
  onExit,
}: {
  quiz: SharedQuiz;
  result: AttemptResult;
  styles: ReturnType<typeof getStyles>;
  onExit?: () => void;
}) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>quizzle</Text>
          <Text style={styles.title}>{quiz.title}</Text>
          {/* A null score means theory questions await marking. Saying "0 / 10"
              would misrepresent the result, so the wording changes instead. */}
          <Text style={styles.score}>
            {result.fullyGraded
              ? `You scored ${result.score} out of ${result.total}`
              : `${result.total} question${result.total === 1 ? '' : 's'} submitted — some need marking`}
          </Text>
        </View>

        {result.perQuestion.map((item, index) => {
          const question = quiz.questions.find(q => q.id === item.id);
          return (
            <View key={item.id} style={[styles.card, item.correct === true && styles.cardCorrect]}>
              <Text style={styles.prompt}>{`${index + 1}. ${question?.prompt ?? ''}`}</Text>

              <Text
                style={[
                  styles.outcome,
                  item.correct === true
                    ? styles.outcomeCorrect
                    : item.correct === false
                      ? styles.outcomeWrong
                      : styles.outcomePending,
                ]}
              >
                {item.correct === true
                  ? 'Correct'
                  : item.correct === false
                    ? 'Not quite'
                    : 'Awaiting marking'}
              </Text>

              <Text style={styles.answerLabel}>Your answer</Text>
              <Text style={styles.answer}>{item.givenAnswer || '—'}</Text>

              {/* The correct answer is revealed here and nowhere earlier. */}
              <Text style={styles.answerLabel}>Correct answer</Text>
              <Text style={styles.answer}>{item.correctAnswer}</Text>

              {item.explanation ? (
                <>
                  <Text style={styles.answerLabel}>Why</Text>
                  <Text style={styles.answer}>{item.explanation}</Text>
                </>
              ) : null}
            </View>
          );
        })}

        {onExit ? (
          <View style={styles.footer}>
            <Button label="Done" variant="secondary" onPress={onExit} fullWidth />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

interface Styles {
  root: ViewStyle;
  content: ViewStyle;
  header: ViewStyle;
  wordmark: TextStyle;
  title: TextStyle;
  meta: TextStyle;
  score: TextStyle;
  card: ViewStyle;
  cardCorrect: ViewStyle;
  prompt: TextStyle;
  options: ViewStyle;
  option: ViewStyle;
  optionSelected: ViewStyle;
  optionText: TextStyle;
  optionTextSelected: TextStyle;
  theoryInput: ViewStyle;
  progress: TextStyle;
  note: TextStyle;
  footer: ViewStyle;
  outcome: TextStyle;
  outcomeCorrect: TextStyle;
  outcomeWrong: TextStyle;
  outcomePending: TextStyle;
  answerLabel: TextStyle;
  answer: TextStyle;
}

function getStyles(colors: ReturnType<typeof useColors>): Styles {
  return StyleSheet.create({
    answer: { color: colors.textPrimary, fontSize: fontSize.sm },
    answerLabel: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: space[2] },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      gap: space[2],
      padding: space[4],
    },
    cardCorrect: { borderColor: colors.success ?? colors.borderControl },
    content: { flexGrow: 1, gap: space[3], padding: space[6] },
    footer: { gap: space[3], paddingVertical: space[4] },
    header: { gap: space[1], marginBottom: space[2] },
    meta: { color: colors.textSecondary, fontSize: fontSize.sm },
    note: { color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center' },
    option: {
      borderColor: colors.borderControl,
      borderRadius: radius.small,
      borderWidth: 1,
      paddingHorizontal: space[3],
      paddingVertical: space[3],
    },
    optionSelected: { backgroundColor: colors.accentMuted ?? colors.surface },
    optionText: { color: colors.textPrimary, fontSize: fontSize.base },
    optionTextSelected: { color: colors.accent, fontWeight: fontWeight.semibold },
    options: { gap: space[2] },
    outcome: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    outcomeCorrect: { color: colors.success ?? colors.textPrimary },
    outcomePending: { color: colors.textTertiary },
    outcomeWrong: { color: colors.danger },
    progress: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
    prompt: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium },
    root: { flex: 1 },
    score: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
    theoryInput: { marginTop: space[2] },
    title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.semibold },
    wordmark: { color: colors.textPrimary, fontSize: fontSize['2xl'], fontWeight: '700' },
  }) as Styles;
}
