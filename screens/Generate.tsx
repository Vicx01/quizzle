/**
 * Generate screen — quiz-generation home screen (centered single-column).
 *
 * Prototype only (frontend). Backend/AI functionality is NOT implemented.
 * Shows at mobile and desktop widths in both light and dark themes.
 *
 * Includes:
 *   - Document upload (PDF, DOCX, TXT) + pasted-text input
 *   - Quiz type: MCQ / Theory / Mixed
 *   - Difficulty: Easy / Medium / Hard
 *   - Question count: 1–50
 *   - Optional timer: toggle + minutes input
 *   - Generate button (disabled until valid input)
 *   - Quota indicator (subtle)
 *   - Loading / error / empty states
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import {
  BREAKPOINTS,
  MAX_CONTENT_WIDTH,
  space,
  fontSize,
  fontWeight,
  radius,
} from '../theme/tokens';
import { Button } from '../components/Button';
import { OfflineBanner } from '../components/States';
import { Input } from '../components/Input';
import { SegmentedControl } from '../components/SegmentedControl';
import { Toggle } from '../components/Toggle';
import { TabBar } from '../components/TabBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= BREAKPOINTS.desktop;
const IS_MOBILE = SCREEN_WIDTH < BREAKPOINTS.tablet;

const MAX_QUESTIONS = 50;
const DEFAULT_QUESTIONS = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_TEXT_CHARS = 50000;

type SourceTab = 'paste' | 'upload';
type QuizFormat = 'MCQ' | 'theory' | 'mixed';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuotaInfo {
  used: number;
  limit: number;
}

interface GenerateScreenProps {
  onTabChange: (key: string) => void;
  /**
   * Real quota usage from the backend. `null`/omitted means unknown, in which
   * case NO quota indicator is rendered — we never display invented numbers.
   */
  quota?: QuotaInfo | null;
  /** True while the device has no connectivity. */
  offline?: boolean;
}

export const GenerateScreen = ({
  onTabChange,
  quota = null,
  offline = false,
}: GenerateScreenProps) => {
  const colors = useColors();

  // Form state
  const [sourceTab, setSourceTab] = useState<SourceTab>('paste');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [quizFormat, setQuizFormat] = useState<QuizFormat>('MCQ');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTIONS);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('10');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const textLength = pastedText.length;
  const hasSource = sourceTab === 'paste' ? textLength > 0 : file !== null;
  const sourceExceedsLimit = sourceTab === 'paste' ? textLength > MAX_TEXT_CHARS : false;
  const isValid = hasSource && !sourceExceedsLimit && questionCount > 0;

  // File picker (web <input type="file"> for the prototype)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const ext = selected.name.toLowerCase().split('.').pop() ?? '';
    const extAllowed = ['pdf', 'docx', 'txt'].includes(ext);
    if (!extAllowed) {
      setError('Unsupported file type. Use PDF, DOCX, or TXT.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setFile({ name: selected.name, size: selected.size });
    setError(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
  }, []);

  const handleGenerate = useCallback(() => {
    if (offline) {
      setError("You're offline. Generating a quiz needs an internet connection.");
      return;
    }
    if (!isValid) {
      setError('Please provide source material and a valid question count.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    // Quiz persistence is implemented (Phase 5) — saving, listing and deleting
    // quizzes against Supabase all work. What is missing is GENERATION: turning
    // source material into questions needs the AI provider, which is Phase 8
    // and deliberately deferred. Say so plainly rather than implying the button
    // is merely decorative.
    setTimeout(() => {
      setIsGenerating(false);
      Alert.alert(
        'Generation not connected yet',
        'Saving and managing quizzes works, but turning your material into questions needs the AI backend, which is not built yet. Your settings here are complete and will be used once it is.'
      );
    }, 1200);
  }, [isValid, offline]);

  const styles = useMemo<{
    container: ViewStyle;
    content: ViewStyle;
    header: ViewStyle;
    wordmark: TextStyle;
    sectionTitle: TextStyle;
    sourceTabs: ViewStyle;
    sourceTabBtn: (active: boolean) => ViewStyle;
    sourceTabText: (active: boolean) => TextStyle;
    uploadArea: ViewStyle;
    uploadText: TextStyle;
    uploadHint: TextStyle;
    fileChip: ViewStyle;
    fileChipText: TextStyle;
    fileChipRemove: TextStyle;
    configCard: ViewStyle;
    countRow: ViewStyle;
    countLabel: TextStyle;
    countInput: TextStyle;
    countMax: TextStyle;
    timerRow: ViewStyle;
    timerLabel: TextStyle;
    timerInput: TextStyle;
    timerUnit: TextStyle;
    quotaRow: ViewStyle;
    quotaText: TextStyle;
    quotaBar: ViewStyle;
    quotaFill: ViewStyle;
    errorText: TextStyle;
    emptyText: TextStyle;
  }>(() => {
    const accentMuted = colors.accent === '#0F62FE' ? '#C7C7C7' : '#4B4B4B';
    return {
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      content: {
        flex: 1,
        paddingHorizontal: IS_MOBILE ? space[4] : space[8],
        paddingVertical: space[8],
        maxWidth: IS_DESKTOP ? MAX_CONTENT_WIDTH : undefined,
        alignSelf: 'center',
        width: '100%',
      },
      header: { marginBottom: space[8] },
      wordmark: {
        color: colors.textPrimary,
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.semibold,
      },
      sectionTitle: {
        color: colors.textPrimary,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.medium,
        marginBottom: space[3],
      },
      sourceTabs: {
        flexDirection: 'row',
        gap: space[1],
        marginBottom: space[4],
      },
      sourceTabBtn: (active: boolean) => ({
        flex: 1,
        height: 40,
        borderRadius: radius.small,
        borderWidth: 1,
        // Source tabs are interactive controls -> boundary needs 3:1.
        borderColor: active ? colors.accent : colors.borderControl,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: active ? 'rgba(15, 98, 254, 0.06)' : colors.surface,
      }),
      sourceTabText: (active: boolean) => ({
        color: active ? colors.accent : colors.textPrimary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
      }),
      uploadArea: {
        borderWidth: 2,
        // Drop zone is an interactive control -> boundary needs 3:1.
        borderColor: colors.borderControl,
        borderRadius: radius.small,
        backgroundColor: colors.surface,
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
      },
      uploadText: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
      },
      uploadHint: {
        color: colors.accent,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
      },
      fileChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.successMuted,
        borderRadius: radius.small,
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        gap: space[2],
        marginTop: space[3],
      },
      fileChipText: {
        color: colors.success,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
      },
      fileChipRemove: {
        color: colors.success,
        fontWeight: fontWeight.semibold,
      },
      configCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.small,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space[6],
      },
      countRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
      },
      countLabel: {
        color: colors.textPrimary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
      },
      countInput: {
        width: 60,
        height: 44,
        borderWidth: 1,
        // Text input -> boundary needs 3:1.
        borderColor: colors.borderControl,
        borderRadius: radius.small,
        paddingHorizontal: space[3],
        color: colors.textPrimary,
        backgroundColor: colors.surface,
        fontSize: fontSize.base,
        textAlign: 'center' as const,
      },
      countMax: {
        color: colors.textSecondary,
        fontSize: fontSize.xs,
      },
      timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
      },
      timerLabel: {
        color: colors.textPrimary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
      },
      timerInput: {
        width: 70,
        height: 44,
        borderWidth: 1,
        // Text input -> boundary needs 3:1.
        borderColor: colors.borderControl,
        borderRadius: radius.small,
        paddingHorizontal: space[3],
        color: colors.textPrimary,
        backgroundColor: timerEnabled ? colors.surface : accentMuted,
        fontSize: fontSize.base,
        textAlign: 'center' as const,
      },
      timerUnit: {
        color: colors.textSecondary,
        fontSize: fontSize.xs,
      },
      quotaRow: {
        marginTop: space[4],
      },
      quotaText: {
        color: colors.textSecondary,
        fontSize: fontSize.xs,
      },
      quotaBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
        overflow: 'hidden',
        marginTop: space[2],
      },
      quotaFill: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent,
        width: '60%',
      },
      errorText: {
        color: colors.danger,
        fontSize: fontSize.sm,
        marginBottom: space[3],
      },
      emptyText: {
        color: colors.textSecondary,
        fontSize: fontSize.base,
      },
    };
  }, [colors, IS_DESKTOP, IS_MOBILE, timerEnabled, fontSize, fontWeight, radius, space]);

  return (
    <View style={styles.container}>
      <TabBar activeTab="generate" onTabChange={onTabChange} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>quizzle</Text>
          <Text style={[styles.sectionTitle, { marginTop: space[2] }]}>Create a quiz</Text>
        </View>

        {/* Source input */}
        <Text style={styles.sectionTitle}>Source material</Text>
        <View style={styles.sourceTabs}>
          <TouchableOpacity
            style={styles.sourceTabBtn(sourceTab === 'paste')}
            onPress={() => setSourceTab('paste')}
          >
            <Text style={styles.sourceTabText(sourceTab === 'paste')}>Paste text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sourceTabBtn(sourceTab === 'upload')}
            onPress={() => setSourceTab('upload')}
          >
            <Text style={styles.sourceTabText(sourceTab === 'upload')}>Upload file</Text>
          </TouchableOpacity>
        </View>

        {sourceTab === 'paste' ? (
          <Input
            label="Paste your study material"
            value={pastedText}
            onChangeText={setPastedText}
            placeholder="Paste text, notes, or lecture content here…"
            multiline
            numberOfLines={10}
            error={sourceExceedsLimit ? 'Text exceeds 50,000 character limit' : undefined}
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={() => fileInputRef.current?.click()}
            >
              <Text style={styles.uploadText}>Choose PDF, DOCX, or TXT</Text>
              <Text style={styles.uploadHint}>Max {MAX_FILE_SIZE_MB} MB</Text>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </TouchableOpacity>
            {file && (
              <View style={styles.fileChip}>
                <Text style={styles.fileChipText}>{file.name}</Text>
                <TouchableOpacity style={styles.fileChip} onPress={handleRemoveFile}>
                  <Text style={styles.fileChipRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Configuration */}
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.configCard}>
          <SegmentedControl
            label="Question format"
            options={[
              { value: 'MCQ', label: 'MCQ' },
              { value: 'theory', label: 'Theory' },
              { value: 'mixed', label: 'Mixed' },
            ]}
            value={quizFormat}
            onValueChange={v => setQuizFormat(v as QuizFormat)}
          />
          <SegmentedControl
            label="Difficulty"
            options={[
              { value: 'Easy', label: 'Easy' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hard', label: 'Hard' },
            ]}
            value={difficulty}
            onValueChange={v => setDifficulty(v as Difficulty)}
          />
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Question count</Text>
            <TextInput
              style={styles.countInput}
              value={String(questionCount)}
              onChangeText={t => {
                const n = parseInt(t, 10);
                if (!isNaN(n) && n >= 1 && n <= MAX_QUESTIONS) {
                  setQuestionCount(n);
                }
              }}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.countMax}>max {MAX_QUESTIONS}</Text>
          </View>
          <Toggle label="Optional timer" value={timerEnabled} onValueChange={setTimerEnabled} />
          {timerEnabled && (
            <View style={styles.timerRow}>
              <Text style={styles.timerLabel}>Minutes</Text>
              <TextInput
                style={styles.timerInput}
                value={timerMinutes}
                onChangeText={setTimerMinutes}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.timerUnit}>min</Text>
            </View>
          )}
        </View>

        {/* Quota indicator (subtle). Rendered only when real usage is known —
            we never show invented statistics. */}
        {quota ? (
          <View style={styles.quotaRow}>
            <Text style={styles.quotaText}>
              {`Daily generations: ${quota.used} / ${quota.limit}`}
            </Text>
            <View style={styles.quotaBar}>
              <View
                style={[
                  styles.quotaFill,
                  { width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* Offline notice — generation cannot succeed without connectivity */}
        {offline ? <OfflineBanner /> : null}

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Generate button */}
        <Button
          variant="primary"
          label="Generate quiz"
          disabled={!isValid || isGenerating}
          loading={isGenerating}
          fullWidth
          onPress={handleGenerate}
        />

        {/* Empty state hint when no source */}
        {!hasSource && !error && (
          <Text style={styles.emptyText}>Enter source material to enable quiz generation.</Text>
        )}
      </ScrollView>
    </View>
  );
};
