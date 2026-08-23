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
  source: {
    title: string;
    url: string;
    verified: string;
  };
  reviewStatus: string;
  version: number;
};

export type ScoreResponse = {
  score: number;
  matched_concepts: string[];
  missing_concepts: string[];
  summary: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export async function fetchQuestions(
  technology: Technology,
  difficulty?: Difficulty,
): Promise<InterviewQuestion[]> {
  const params = new URLSearchParams({ technology });
  if (difficulty) params.set('difficulty', difficulty);

  const response = await fetch(`${API_BASE_URL}/v1/questions?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Question API failed with status ${response.status}`);
  }

  return response.json() as Promise<InterviewQuestion[]>;
}

export async function scoreAnswer(
  answer: string,
  expectedConcepts: string[],
): Promise<ScoreResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answer,
      expected_concepts: expectedConcepts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Scoring API failed with status ${response.status}`);
  }

  return response.json() as Promise<ScoreResponse>;
}
