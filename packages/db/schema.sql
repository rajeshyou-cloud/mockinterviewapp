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
  resume_token_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS resume_token_hash text;

CREATE TABLE IF NOT EXISTS interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  answer_text text NOT NULL,
  score integer,
  matched_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text,
  benchmark_version text,
  scoring_provider text,
  scoring_policy_version text,
  answered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interview_answers
  ADD COLUMN IF NOT EXISTS benchmark_version text,
  ADD COLUMN IF NOT EXISTS scoring_provider text,
  ADD COLUMN IF NOT EXISTS scoring_policy_version text;

CREATE INDEX IF NOT EXISTS interview_answers_session_idx
  ON interview_answers(session_id, answered_at);
CREATE INDEX IF NOT EXISTS interview_sessions_started_idx
  ON interview_sessions(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS interview_answers_session_question_idx
  ON interview_answers(session_id, question_id);

CREATE TABLE IF NOT EXISTS answer_scoring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES interview_answers(id) ON DELETE CASCADE,
  benchmark_version text NOT NULL,
  scoring_provider text NOT NULL,
  scoring_policy_version text NOT NULL,
  total_score integer NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  optional_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  incorrect_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text NOT NULL DEFAULT '',
  fallback_reason text,
  latency_ms integer,
  token_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost_cents numeric(10,4),
  is_displayed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answer_scoring_runs_answer_created_idx
  ON answer_scoring_runs(answer_id, created_at DESC);

-- Account ownership is optional so anonymous resume-key sessions remain supported.
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS owner_user_id text;
CREATE INDEX IF NOT EXISTS interview_sessions_owner_started_idx
  ON interview_sessions(owner_user_id, started_at DESC)
  WHERE owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_user_roles (
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('candidate', 'reviewer', 'recruiter', 'admin')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS course_pack_reviews (
  course_id text NOT NULL,
  reviewer_user_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('in_review', 'approved', 'changes_requested')),
  notes text NOT NULL DEFAULT '',
  source_links_checked boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, reviewer_user_id)
);
CREATE INDEX IF NOT EXISTS course_pack_reviews_course_idx
  ON course_pack_reviews(course_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS subscription_accounts (
  user_id text PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'candidate_pro', 'recruiter_pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  provider_customer_id text UNIQUE,
  provider_subscription_id text UNIQUE,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
