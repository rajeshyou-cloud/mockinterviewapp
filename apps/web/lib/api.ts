export type Technology = 'snowflake' | 'informatica';
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
};

export type PersistenceResponse = { persisted: boolean; reason?: string } & Record<string, unknown>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const QUESTIONS_PATH = API_BASE_URL ? '/v1/questions' : '/api/questions';
const SCORE_PATH = API_BASE_URL ? '/v1/score' : '/api/score';

export async function fetchQuestions(technology: Technology, difficulty?: Difficulty): Promise<InterviewQuestion[]> {
  const params = new URLSearchParams({ technology });
  if (difficulty) params.set('difficulty', difficulty);
  const response = await fetch(`${API_BASE_URL}${QUESTIONS_PATH}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Question API failed with status ${response.status}`);
  return response.json() as Promise<InterviewQuestion[]>;
}

export async function scoreAnswer(answer: string, expectedConcepts: string[]): Promise<ScoreResponse> {
  const response = await fetch(`${API_BASE_URL}${SCORE_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer, expected_concepts: expectedConcepts }),
  });
  if (!response.ok) throw new Error(`Scoring API failed with status ${response.status}`);
  return response.json() as Promise<ScoreResponse>;
}

async function postPersistence(path: string, body: unknown): Promise<PersistenceResponse> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { persisted: false, reason: `http_${response.status}` };
    return response.json() as Promise<PersistenceResponse>;
  } catch {
    return { persisted: false, reason: 'network_error' };
  }
}

export function createRemoteSession(input: { id: string; technology: Technology; difficulty: Difficulty; currentIndex: number }) {
  return postPersistence('/api/sessions', input);
}

export function saveRemoteAnswer(sessionId: string, input: {
  questionId: string;
  answerText: string;
  score: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  currentIndex: number;
}) {
  return postPersistence(`/api/sessions/${sessionId}/answers`, input);
}

export function completeRemoteSession(sessionId: string, totalScore: number) {
  return postPersistence(`/api/sessions/${sessionId}/complete`, { totalScore });
}
