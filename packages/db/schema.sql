-- Milestone 2 persistence schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technology text NOT NULL,
  difficulty text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_score numeric(5,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  answer_text text NOT NULL,
  score integer,
  matched_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text,
  answered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_answers_session_idx
  ON interview_answers(session_id, answered_at);
CREATE INDEX IF NOT EXISTS interview_sessions_started_idx
  ON interview_sessions(started_at DESC);
