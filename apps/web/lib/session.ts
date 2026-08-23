import type { Difficulty, ScoreResponse, Technology } from './api';

export type SavedAnswer = {
  questionId: string;
  answer: string;
  score: ScoreResponse;
  answeredAt: string;
};

export type InterviewSession = {
  id: string;
  resumeToken: string;
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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterviewSession;
    const normalized = { ...parsed, resumeToken: parsed.resumeToken || createResumeToken() };
    window.localStorage.setItem(KEY, JSON.stringify(normalized));
    return normalized;
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
    resumeToken: createResumeToken(),
    technology,
    difficulty,
    currentIndex: 0,
    status: 'in_progress',
    answers: [],
    startedAt: new Date().toISOString(),
  };
}

function createResumeToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
}

export function getResumeKey(session: Pick<InterviewSession, 'id' | 'resumeToken'>) {
  return `v1:${session.id}:${session.resumeToken}`;
}

export function parseResumeKey(value: string): { id: string; resumeToken: string } | null {
  const match = /^v1:([0-9a-f-]{36}):([0-9a-f]{64})$/i.exec(value.trim());
  return match ? { id: match[1], resumeToken: match[2] } : null;
}
