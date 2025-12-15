export enum Difficulty {
  Easy = "Easy",
  Medium = "Medium",
  Hard = "Hard"
}

export interface MCQOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface MCQ {
  id: number;
  difficulty: Difficulty;
  question: string;
  options: MCQOption;
  answer: "A" | "B" | "C" | "D";
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ImageSize {
  OneK = "1K",
  TwoK = "2K",
  FourK = "4K"
}

export enum AppView {
  Generator = 'generator',
  Quiz = 'quiz',
  Chat = 'chat',
  Images = 'images',
  History = 'history'
}

export interface QuizHistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  score: number;
  total: number;
  questions: MCQ[];
}