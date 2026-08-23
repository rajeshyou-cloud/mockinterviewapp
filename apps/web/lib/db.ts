import 'server-only';

import { neon } from '@neondatabase/serverless';

export type PersistedSession = {
  id: string;
  technology: string;
  difficulty: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  metadata: Record<string, unknown>;
};

export type PersistedAnswer = {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string;
  score: number | null;
  matched_concepts: string[];
  missing_concepts: string[];
  feedback: string | null;
  answered_at: string;
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function createInterviewSession(input: { id: string; technology: string; difficulty: string; currentIndex?: number }) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO interview_sessions (id, technology, difficulty, metadata)
    VALUES (${input.id}::uuid, ${input.technology}, ${input.difficulty}, ${JSON.stringify({ currentIndex: input.currentIndex ?? 0 })}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      technology = EXCLUDED.technology,
      difficulty = EXCLUDED.difficulty,
      metadata = EXCLUDED.metadata
    RETURNING *
  `;
  return rows[0] as PersistedSession;
}

export async function getInterviewSession(id: string) {
  const sql = getSql();
  if (!sql) return null;
  const sessions = await sql`SELECT * FROM interview_sessions WHERE id = ${id}::uuid LIMIT 1`;
  if (!sessions.length) return null;
  const answers = await sql`SELECT * FROM interview_answers WHERE session_id = ${id}::uuid ORDER BY answered_at`;
  return { session: sessions[0] as PersistedSession, answers: answers as PersistedAnswer[] };
}

export async function saveInterviewAnswer(input: {
  sessionId: string;
  questionId: string;
  answerText: string;
  score: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  currentIndex: number;
}) {
  const sql = getSql();
  if (!sql) return null;
  await sql`DELETE FROM interview_answers WHERE session_id = ${input.sessionId}::uuid AND question_id = ${input.questionId}`;
  const rows = await sql`
    INSERT INTO interview_answers (session_id, question_id, answer_text, score, matched_concepts, missing_concepts, feedback)
    VALUES (${input.sessionId}::uuid, ${input.questionId}, ${input.answerText}, ${input.score}, ${JSON.stringify(input.matchedConcepts)}::jsonb, ${JSON.stringify(input.missingConcepts)}::jsonb, ${input.feedback})
    RETURNING *
  `;
  await sql`UPDATE interview_sessions SET metadata = jsonb_set(metadata, '{currentIndex}', to_jsonb(${input.currentIndex}::int), true) WHERE id = ${input.sessionId}::uuid`;
  return rows[0] as PersistedAnswer;
}

export async function completeInterviewSession(id: string, totalScore: number) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE interview_sessions
    SET status = 'completed', completed_at = now(), total_score = ${totalScore}
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  return rows[0] as PersistedSession | undefined;
}
