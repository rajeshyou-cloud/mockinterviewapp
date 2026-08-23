import 'server-only';

import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';

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

export async function deleteManagedAuthUser(userId: string) {
  const sql = getSql();
  if (!sql) return false;

  const rows = await sql`DELETE FROM neon_auth.user WHERE id = ${userId} RETURNING id`;
  return rows.length === 1;
}

function hashResumeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function createInterviewSession(input: { id: string; resumeToken: string; technology: string; difficulty: string; currentIndex?: number }) {
  const sql = getSql();
  if (!sql) return null;
  const tokenHash = hashResumeToken(input.resumeToken);
  const rows = await sql`
    INSERT INTO interview_sessions (id, technology, difficulty, resume_token_hash, metadata)
    VALUES (${input.id}::uuid, ${input.technology}, ${input.difficulty}, ${tokenHash}, ${JSON.stringify({ currentIndex: input.currentIndex ?? 0 })}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      technology = EXCLUDED.technology,
      difficulty = EXCLUDED.difficulty,
      resume_token_hash = EXCLUDED.resume_token_hash,
      metadata = EXCLUDED.metadata
    WHERE interview_sessions.resume_token_hash IS NULL
       OR interview_sessions.resume_token_hash = EXCLUDED.resume_token_hash
    RETURNING id, technology, difficulty, status, started_at, completed_at, total_score, metadata
  `;
  return rows[0] as PersistedSession | undefined;
}

export async function getInterviewSession(id: string, resumeToken: string) {
  const sql = getSql();
  if (!sql) return null;
  const tokenHash = hashResumeToken(resumeToken);
  const sessions = await sql`
    SELECT id, technology, difficulty, status, started_at, completed_at, total_score, metadata
    FROM interview_sessions
    WHERE id = ${id}::uuid AND resume_token_hash = ${tokenHash}
    LIMIT 1
  `;
  if (!sessions.length) return null;
  const answers = await sql`SELECT * FROM interview_answers WHERE session_id = ${id}::uuid ORDER BY answered_at`;
  return { session: sessions[0] as PersistedSession, answers: answers as PersistedAnswer[] };
}

export async function saveInterviewAnswer(input: {
  sessionId: string;
  resumeToken: string;
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
  const tokenHash = hashResumeToken(input.resumeToken);
  const rows = await sql`
    INSERT INTO interview_answers (session_id, question_id, answer_text, score, matched_concepts, missing_concepts, feedback)
    SELECT id, ${input.questionId}, ${input.answerText}, ${input.score}, ${JSON.stringify(input.matchedConcepts)}::jsonb, ${JSON.stringify(input.missingConcepts)}::jsonb, ${input.feedback}
    FROM interview_sessions
    WHERE id = ${input.sessionId}::uuid AND resume_token_hash = ${tokenHash}
    ON CONFLICT (session_id, question_id) DO UPDATE SET
      answer_text = EXCLUDED.answer_text,
      score = EXCLUDED.score,
      matched_concepts = EXCLUDED.matched_concepts,
      missing_concepts = EXCLUDED.missing_concepts,
      feedback = EXCLUDED.feedback,
      answered_at = now()
    RETURNING id, session_id, question_id, answer_text, score, matched_concepts, missing_concepts, feedback, answered_at
  `;
  if (!rows.length) return null;
  await sql`
    UPDATE interview_sessions
    SET metadata = jsonb_set(metadata, '{currentIndex}', to_jsonb(${input.currentIndex}::int), true)
    WHERE id = ${input.sessionId}::uuid AND resume_token_hash = ${tokenHash}
  `;
  return rows[0] as PersistedAnswer;
}

export async function completeInterviewSession(id: string, resumeToken: string, totalScore: number) {
  const sql = getSql();
  if (!sql) return null;
  const tokenHash = hashResumeToken(resumeToken);
  const rows = await sql`
    UPDATE interview_sessions
    SET status = 'completed', completed_at = now(), total_score = ${totalScore}
    WHERE id = ${id}::uuid AND resume_token_hash = ${tokenHash}
    RETURNING id, technology, difficulty, status, started_at, completed_at, total_score, metadata
  `;
  return rows[0] as PersistedSession | undefined;
}
