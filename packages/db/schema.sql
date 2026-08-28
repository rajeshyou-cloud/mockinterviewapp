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

-- Governed content platform (Phase 1).
-- JSON remains the seed/export format until the migration and read-path phases complete.
CREATE TABLE IF NOT EXISTS technologies (
  id text PRIMARY KEY,
  name text NOT NULL,
  vendor text,
  description text NOT NULL DEFAULT '',
  official_domains jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(official_domains) = 'array'),
  lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('planned', 'active', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  retired_at timestamptz,
  CHECK (retired_at IS NULL OR lifecycle_status = 'retired')
);

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id text NOT NULL REFERENCES technologies(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  retired_at timestamptz,
  UNIQUE (technology_id, slug),
  UNIQUE (id, technology_id)
);
CREATE INDEX IF NOT EXISTS topics_technology_name_idx
  ON topics(technology_id, name);

CREATE TABLE IF NOT EXISTS questions (
  id text PRIMARY KEY,
  technology_id text NOT NULL REFERENCES technologies(id) ON DELETE RESTRICT,
  topic_id uuid NOT NULL,
  difficulty text NOT NULL
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  question_type text NOT NULL
    CHECK (question_type IN ('conceptual', 'scenario', 'troubleshooting', 'design', 'hands-on')),
  source_kind text NOT NULL
    CHECK (source_kind IN ('released', 'candidate')),
  prompt text NOT NULL CHECK (length(prompt) >= 10),
  canonical_answer text NOT NULL CHECK (length(canonical_answer) >= 20),
  expected_concepts jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(expected_concepts) = 'array'),
  follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(follow_ups) = 'array'),
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'reviewing', 'disputed', 'ai-evidence-verified', 'human-verified', 'stale', 'rejected')),
  publish_status text NOT NULL DEFAULT 'unpublished'
    CHECK (publish_status IN ('unpublished', 'scheduled', 'published', 'retired')),
  version text NOT NULL DEFAULT '1.0.0'
    CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  last_reviewed_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  FOREIGN KEY (topic_id, technology_id)
    REFERENCES topics(id, technology_id) ON DELETE RESTRICT,
  CHECK (publish_status <> 'published' OR review_status IN ('ai-evidence-verified', 'human-verified')),
  CHECK (publish_status <> 'retired' OR retired_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS questions_governance_queue_idx
  ON questions(technology_id, review_status, publish_status, difficulty);
CREATE INDEX IF NOT EXISTS questions_topic_idx
  ON questions(topic_id, difficulty);

CREATE TABLE IF NOT EXISTS benchmark_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  benchmark_version text NOT NULL
    CHECK (benchmark_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  canonical_answer text NOT NULL CHECK (length(canonical_answer) >= 20),
  expanded_explanation text NOT NULL CHECK (length(expanded_explanation) >= 40),
  required_concepts jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(required_concepts) = 'array'),
  optional_concepts jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(optional_concepts) = 'array'),
  accepted_alternatives jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(accepted_alternatives) = 'array'),
  incorrect_claims jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(incorrect_claims) = 'array'),
  reasoning text NOT NULL,
  scoring_anchors jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(scoring_anchors) = 'object'),
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'reviewing', 'disputed', 'ai-evidence-verified', 'human-verified', 'stale', 'rejected')),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  UNIQUE (question_id, benchmark_version),
  UNIQUE (question_id, id)
);
CREATE INDEX IF NOT EXISTS benchmark_answers_question_review_idx
  ON benchmark_answers(question_id, review_status, benchmark_version);

CREATE TABLE IF NOT EXISTS evidence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id text NOT NULL REFERENCES technologies(id) ON DELETE RESTRICT,
  url text NOT NULL,
  title text NOT NULL,
  section text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'overview'
    CHECK (category IN ('overview', 'setup', 'security', 'monitoring', 'troubleshooting', 'quotas', 'best-practices', 'recovery', 'cost')),
  document_version text,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  is_official boolean NOT NULL DEFAULT false,
  retrieved_at timestamptz NOT NULL,
  last_checked_at timestamptz,
  stale_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  UNIQUE (technology_id, url, content_hash)
);
CREATE INDEX IF NOT EXISTS evidence_sources_freshness_idx
  ON evidence_sources(technology_id, stale_at, last_checked_at);

CREATE TABLE IF NOT EXISTS question_evidence_links (
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  benchmark_answer_id uuid NOT NULL,
  evidence_source_id uuid NOT NULL REFERENCES evidence_sources(id) ON DELETE RESTRICT,
  claim_scope text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  PRIMARY KEY (benchmark_answer_id, evidence_source_id),
  UNIQUE (question_id, benchmark_answer_id, evidence_source_id),
  FOREIGN KEY (question_id, benchmark_answer_id)
    REFERENCES benchmark_answers(question_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS question_evidence_links_question_idx
  ON question_evidence_links(question_id, evidence_source_id);

CREATE TABLE IF NOT EXISTS question_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_key text NOT NULL UNIQUE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  benchmark_answer_id uuid REFERENCES benchmark_answers(id) ON DELETE RESTRICT,
  review_kind text NOT NULL CHECK (review_kind IN ('static', 'ai', 'human', 'vendor')),
  status text NOT NULL
    CHECK (status IN ('reviewing', 'disputed', 'ai-evidence-verified', 'human-verified', 'stale', 'rejected')),
  provider text,
  model text,
  prompt_version text,
  reviewer_user_id text,
  verdict text NOT NULL,
  confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  findings jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(findings) = 'array'),
  corrections jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(corrections) = 'array'),
  input_hash text CHECK (input_hash IS NULL OR input_hash ~ '^sha256:[a-f0-9]{64}$'),
  output_hash text CHECK (output_hash IS NULL OR output_hash ~ '^sha256:[a-f0-9]{64}$'),
  token_usage jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(token_usage) = 'object'),
  estimated_cost_cents numeric(12,4),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  CHECK (review_kind <> 'ai' OR (provider IS NOT NULL AND model IS NOT NULL)),
  CHECK (review_kind <> 'human' OR reviewer_user_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS question_reviews_question_time_idx
  ON question_reviews(question_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS question_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  version text NOT NULL CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  benchmark_version text NOT NULL CHECK (benchmark_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  change_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  UNIQUE (question_id, version)
);
CREATE INDEX IF NOT EXISTS question_versions_question_created_idx
  ON question_versions(question_id, created_at DESC);

CREATE TABLE IF NOT EXISTS publication_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id text NOT NULL REFERENCES technologies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  version text NOT NULL CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'approved', 'published', 'rolled_back', 'retired')),
  release_notes text NOT NULL DEFAULT '',
  approved_by text,
  approved_at timestamptz,
  published_by text,
  published_at timestamptz,
  rolled_back_by text,
  rolled_back_at timestamptz,
  rollback_of_batch_id uuid REFERENCES publication_batches(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  UNIQUE (technology_id, version),
  CHECK (status NOT IN ('approved', 'published') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK (status <> 'published' OR (published_by IS NOT NULL AND published_at IS NOT NULL)),
  CHECK (status <> 'rolled_back' OR (rolled_back_by IS NOT NULL AND rolled_back_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS publication_batches_technology_status_idx
  ON publication_batches(technology_id, status, created_at DESC);

-- Append-only decision history. publication_batches stores only the current state.
CREATE TABLE IF NOT EXISTS publication_batch_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES publication_batches(id) ON DELETE RESTRICT,
  decision text NOT NULL
    CHECK (decision IN ('created', 'marked_ready', 'approved', 'published', 'unpublished', 'rolled_back', 'retired')),
  from_status text,
  to_status text NOT NULL,
  decided_by text NOT NULL,
  reason text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publication_batch_decisions_batch_time_idx
  ON publication_batch_decisions(batch_id, decided_at DESC);

CREATE TABLE IF NOT EXISTS publication_batch_items (
  batch_id uuid NOT NULL REFERENCES publication_batches(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_version text NOT NULL,
  benchmark_version text NOT NULL,
  review_status_at_add text NOT NULL
    CHECK (review_status_at_add IN ('ai-evidence-verified', 'human-verified')),
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by text,
  PRIMARY KEY (batch_id, question_id),
  FOREIGN KEY (question_id, question_version)
    REFERENCES question_versions(question_id, version) ON DELETE RESTRICT,
  FOREIGN KEY (question_id, benchmark_version)
    REFERENCES benchmark_answers(question_id, benchmark_version) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS publication_batch_items_question_idx
  ON publication_batch_items(question_id, batch_id);
