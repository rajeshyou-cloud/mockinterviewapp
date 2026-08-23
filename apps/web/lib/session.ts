import type { Difficulty, ScoreResponse, Technology } from './api';

export type SavedAnswer = {
  questionId: string;
  answer: string;
  score: ScoreResponse;
  answeredAt: string;
};

export type InterviewSession = {
  id: string;
  technology: Technology;
  difficulty: Difficulty;
  currentIndex: number;
  status: 'in_progress' | 'completed';
  answers: SavedAnswer[];
  startedAt: string;
  completedAt?: string;
};

const KEY = 'mock-interview-session-v1';

export function loadSession(): InterviewSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as InterviewSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: InterviewSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}

export function newSession(technology: Technology, difficulty: Difficulty): InterviewSession {
  return {
    id: crypto.randomUUID(),
    technology,
    difficulty,
    currentIndex: 0,
    status: 'in_progress',
    answers: [],
    startedAt: new Date().toISOString(),
  };
}
