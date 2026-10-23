/**
 * Quizzle — shared TypeScript types.
 *
 * Central type definitions used across the application.
 */

// Theme
export type ThemeMode = 'light' | 'dark' | 'system';

// Authentication
/**
 * Which backend is currently serving sign-in.
 *
 * Now that Supabase is the sole provider, this is the only identity shape. The
 * default until Supabase sign-in has been verified by the owner, so the app
 * never loses a working login while the replacement is being proven.
 */
/**
 * Signed-in identity as the UI sees it.
 *
 * Screens depend on this rather than on Supabase's `User`, which keeps the
 * vendor out of the presentation layer and means the shape of "who is signed
 * in" is defined exactly once.
 *
 * It is not a straight copy of the Supabase user object: `displayName` and
 * `photoURL` are resolved from Google's profile claims, which arrive under
 * several different metadata keys.
 */
export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Quiz
export type QuizFormat = 'MCQ' | 'theory' | 'mixed';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuizQuestion {
  id: string;
  type: 'MCQ' | 'theory';
  prompt: string;
  options?: string[]; // only for MCQ
  correctAnswer?: string;
  explanation?: string;
  latexBlocks?: string[];
}

export interface Quiz {
  id: string;
  ownerId: string;
  title: string;
  sourceType: 'text' | 'pdf' | 'docx' | 'txt';
  sourceMetadata?: {
    filename?: string;
    size?: number;
    extractedLength?: number;
  };
  format: QuizFormat;
  difficulty: Difficulty;
  questionCount: number;
  timerSeconds?: number;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  shareToken?: string;
  shareExpiresAt?: string;
  revokedAt?: string;
  deletedAt?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId?: string; // nullable for anonymous share attempts
  answers: Record<string, string>; // questionId -> answer
  score?: number; // nullable for theory until graded
  completedAt: string;
  timeSpentSeconds: number;
}

export interface ShareLink {
  token: string;
  quizId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  accessCount: number;
  maxAccess?: number;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  theme: ThemeMode;
  createdAt: string;
  updatedAt: string;
  dataRetentionConsent: boolean;
}

// Navigation
export type TabKey = 'generate' | 'history' | 'share' | 'account';

export type RootStackParamList = {
  signIn: undefined;
  generate: undefined;
  history: undefined;
  share: undefined;
  account: undefined;
  quiz: { quizId: string };
  shareQuiz: { token: string };
};

// Generation config
export interface GenerationConfig {
  sourceType: 'text' | 'file';
  sourceText?: string;
  file?: File | { name: string; size: number; type: string };
  format: QuizFormat;
  difficulty: Difficulty;
  questionCount: number;
  timerEnabled: boolean;
  timerMinutes?: number;
}

// Error
export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
}
