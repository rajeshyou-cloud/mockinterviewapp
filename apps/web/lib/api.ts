import type { CourseDefinition, Technology } from './course-catalog';

export type { Technology } from './course-catalog';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type InterviewQuestion = {
  id: string;
  technology: Technology;
  topic: string;
  difficulty: Difficulty;
  type: 'conceptual' | 'scenario' | string;
  question: string;
  canonicalAnswer: string;
  expectedConcepts: string[];
  followUps: string[];
  source: { title: string; url: string; verified: string };
  reviewStatus: string;
  version: number;
};

export type ScoreResponse = {
  score: number;
  matched_concepts: string[];
  missing_concepts: string[];
  summary: string;
  provider?: string;
};

export type PersistenceResponse = { persisted: boolean; reason?: string } & Record<string, unknown>;

export type RemoteSessionResponse = {
  persisted: true;
  session: {
    id: string;
    technology: Technology;
    difficulty: Difficulty;
    status: 'in_progress' | 'completed';
    started_at: string;
    completed_at: string | null;
    metadata: { currentIndex?: number };
  };
  answers: Array<{
    question_id: string;
    answer_text: string;
    score: number;
    matched_concepts: string[];
    missing_concepts: string[];
    feedback: string;
    answered_at: string;
  }>;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const QUESTIONS_PATH = API_BASE_URL ? '/v1/questions' : '/api/questions';
const SCORE_PATH = '/api/score';

export async function fetchReleasedCourses(): Promise<CourseDefinition[]> {
  const response = await fetch('/api/courses', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Course API failed with status ${response.status}`);
  return response.json() as Promise<CourseDefinition[]>;
}

export async function fetchQuestions(
  technology: Technology,
  difficulty: Difficulty,
  seed: string,
  limit = 10,
): Promise<InterviewQuestion[]> {
  const params = new URLSearchParams({ technology });
  params.set('difficulty', difficulty);
  params.set('seed', seed);
  params.set('limit', String(limit));
  const response = await fetch(`${API_BASE_URL}${QUESTIONS_PATH}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Question API failed with status ${response.status}`);
  return response.json() as Promise<InterviewQuestion[]>;
}

export async function scoreAnswer(answer: string, question: InterviewQuestion, sessionId: string): Promise<ScoreResponse> {
  const response = await fetch(SCORE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({
      answer,
      question_id: question.id,
    }),
  });
  if (!response.ok) throw new Error(`Scoring API failed with status ${response.status}`);
  return response.json() as Promise<ScoreResponse>;
}

async function postPersistence(path: string, resumeToken: string, body: unknown): Promise<PersistenceResponse> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { persisted: false, reason: `http_${response.status}` };
    return response.json() as Promise<PersistenceResponse>;
  } catch {
    return { persisted: false, reason: 'network_error' };
  }
}

export function createRemoteSession(input: { id: string; resumeToken: string; technology: Technology; difficulty: Difficulty; currentIndex: number }) {
  const { resumeToken, ...payload } = input;
  return postPersistence('/api/sessions', resumeToken, payload);
}

export async function claimRemoteSession(sessionId: string, resumeToken: string) {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/claim`, {
      method: 'POST',
      headers: { 'x-resume-token': resumeToken },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function saveRemoteAnswer(sessionId: string, resumeToken: string, input: {
  questionId: string;
  answerText: string;
  score: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  currentIndex: number;
}) {
  return postPersistence(`/api/sessions/${sessionId}/answers`, resumeToken, input);
}

export function completeRemoteSession(sessionId: string, resumeToken: string, totalScore: number) {
  return postPersistence(`/api/sessions/${sessionId}/complete`, resumeToken, { totalScore });
}

export async function fetchRemoteSession(id: string, resumeToken: string): Promise<RemoteSessionResponse> {
  const response = await fetch(`/api/sessions/${id}`, { cache: 'no-store', headers: { 'x-resume-token': resumeToken } });
  if (!response.ok) throw new Error(response.status === 404 ? 'That resume key was not found.' : `Resume failed with status ${response.status}`);
  return response.json() as Promise<RemoteSessionResponse>;
}
