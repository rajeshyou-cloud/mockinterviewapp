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
  owner_user_id?: string | null;
};

export type AppRole = 'candidate' | 'reviewer' | 'recruiter' | 'admin';
export type CourseReviewStatus = 'in_review' | 'approved' | 'changes_requested';
export type SubscriptionPlan = 'free' | 'candidate_pro' | 'recruiter_pro';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export type PersistedAnswer = {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string;
  score: number | null;
  matched_concepts: string[];
  missing_concepts: string[];
  feedback: string | null;
  benchmark_version?: string | null;
  scoring_provider?: string | null;
  scoring_policy_version?: string | null;
  answered_at: string;
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function deleteManagedAccountData(userId: string) {
  const sql = getSql();
  if (!sql) return false;

  await sql.transaction([
    sql`DELETE FROM course_pack_reviews WHERE reviewer_user_id = ${userId}`,
    sql`UPDATE app_user_roles SET granted_by = NULL WHERE granted_by = ${userId}`,
    sql`DELETE FROM app_user_roles WHERE user_id = ${userId}`,
    sql`DELETE FROM subscription_accounts WHERE user_id = ${userId}`,
    sql`DELETE FROM interview_sessions WHERE owner_user_id = ${userId}`,
    sql`DELETE FROM neon_auth.user WHERE id = ${userId}`,
  ]);
  return true;
}

function hashResumeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function listGovernedQuestionSnapshots(input: {
  technologyIds: string[];
  includeUnpublished?: boolean;
}) {
  const sql = getSql();
  if (!sql) return null;
  if (input.technologyIds.length === 0) return [];
  const rows = await sql`
    WITH selected_technologies AS (
      SELECT value AS id
      FROM jsonb_array_elements_text(${JSON.stringify(input.technologyIds)}::jsonb)
    )
    SELECT version.snapshot
    FROM questions question
    JOIN question_versions version
      ON version.question_id = question.id AND version.version = question.version
    WHERE question.technology_id IN (SELECT id FROM selected_technologies)
      AND (
        ${Boolean(input.includeUnpublished)}
        OR (
          question.publish_status = 'published'
          AND question.review_status IN ('ai-evidence-verified', 'human-verified')
          AND EXISTS (
            SELECT 1 FROM publication_batch_items item
            JOIN publication_batches batch ON batch.id=item.batch_id AND batch.status='published'
            WHERE item.question_id=question.id AND item.question_version=question.version
              AND item.benchmark_version=version.benchmark_version
          )
        )
      )
    ORDER BY question.technology_id, question.id
  `;
  return rows.map((row) => row.snapshot as unknown);
}

export async function getGovernedQuestionSnapshot(id: string, input: { includeUnpublished?: boolean } = {}) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT version.snapshot
    FROM questions question
    JOIN question_versions version
      ON version.question_id = question.id AND version.version = question.version
    WHERE question.id = ${id}
      AND (
        ${Boolean(input.includeUnpublished)}
        OR (
          question.publish_status = 'published'
          AND question.review_status IN ('ai-evidence-verified', 'human-verified')
          AND EXISTS (
            SELECT 1 FROM publication_batch_items item
            JOIN publication_batches batch ON batch.id=item.batch_id AND batch.status='published'
            WHERE item.question_id=question.id AND item.question_version=question.version
              AND item.benchmark_version=version.benchmark_version
          )
        )
      )
    LIMIT 1
  `;
  return rows[0]?.snapshot as unknown | undefined;
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
  dimensionScores?: {
    technical_accuracy: number;
    required_concept_coverage: number;
    reasoning_and_tradeoffs: number;
    relevance_and_clarity: number;
  };
  matchedConcepts: string[];
  missingConcepts: string[];
  optionalConcepts?: string[];
  incorrectClaims?: string[];
  feedback: string;
  currentIndex: number;
  provider?: string;
  benchmarkVersion?: string;
  scoringPolicyVersion?: string;
}) {
  const sql = getSql();
  if (!sql) return null;
  const tokenHash = hashResumeToken(input.resumeToken);
  const rows = await sql`
    INSERT INTO interview_answers (session_id, question_id, answer_text, score, matched_concepts, missing_concepts, feedback, benchmark_version, scoring_provider, scoring_policy_version)
    SELECT id, ${input.questionId}, ${input.answerText}, ${input.score}, ${JSON.stringify(input.matchedConcepts)}::jsonb, ${JSON.stringify(input.missingConcepts)}::jsonb, ${input.feedback}, ${input.benchmarkVersion ?? null}, ${input.provider ?? null}, ${input.scoringPolicyVersion ?? null}
    FROM interview_sessions
    WHERE id = ${input.sessionId}::uuid AND resume_token_hash = ${tokenHash}
    ON CONFLICT (session_id, question_id) DO UPDATE SET
      answer_text = EXCLUDED.answer_text,
      score = EXCLUDED.score,
      matched_concepts = EXCLUDED.matched_concepts,
      missing_concepts = EXCLUDED.missing_concepts,
      feedback = EXCLUDED.feedback,
      benchmark_version = EXCLUDED.benchmark_version,
      scoring_provider = EXCLUDED.scoring_provider,
      scoring_policy_version = EXCLUDED.scoring_policy_version,
      answered_at = now()
    RETURNING id, session_id, question_id, answer_text, score, matched_concepts, missing_concepts, feedback, benchmark_version, scoring_provider, scoring_policy_version, answered_at
  `;
  if (!rows.length) return null;
  const answer = rows[0] as PersistedAnswer;
  if (input.benchmarkVersion && input.provider && input.scoringPolicyVersion) {
    try {
      await sql`
        UPDATE answer_scoring_runs
        SET is_displayed = false
        WHERE answer_id = ${answer.id}::uuid
      `;
      await sql`
        INSERT INTO answer_scoring_runs (
          answer_id,
          benchmark_version,
          scoring_provider,
          scoring_policy_version,
          total_score,
          dimension_scores,
          matched_concepts,
          missing_concepts,
          optional_concepts,
          incorrect_claims,
          feedback,
          fallback_reason,
          is_displayed
        )
        VALUES (
          ${answer.id}::uuid,
          ${input.benchmarkVersion},
          ${input.provider},
          ${input.scoringPolicyVersion},
          ${input.score},
          ${JSON.stringify(input.dimensionScores ?? {})}::jsonb,
          ${JSON.stringify(input.matchedConcepts)}::jsonb,
          ${JSON.stringify(input.missingConcepts)}::jsonb,
          ${JSON.stringify(input.optionalConcepts ?? [])}::jsonb,
          ${JSON.stringify(input.incorrectClaims ?? [])}::jsonb,
          ${input.feedback},
          ${input.provider.includes('->') || input.provider === 'deterministic-keyword' ? 'deterministic_fallback' : null},
          true
        )
      `;
    } catch (error) {
      console.error('Scoring-run audit insert failed; preserved interview answer.', {
        message: error instanceof Error ? error.message.slice(0, 180) : 'unknown',
      });
    }
  }
  await sql`
    UPDATE interview_sessions
    SET metadata = jsonb_set(metadata, '{currentIndex}', to_jsonb(${input.currentIndex}::int), true)
    WHERE id = ${input.sessionId}::uuid AND resume_token_hash = ${tokenHash}
  `;
  return answer;
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

export async function claimInterviewSession(id: string, resumeToken: string, userId: string) {
  const sql = getSql();
  if (!sql) return null;
  const tokenHash = hashResumeToken(resumeToken);
  const rows = await sql`
    UPDATE interview_sessions
    SET owner_user_id = ${userId}
    WHERE id = ${id}::uuid
      AND resume_token_hash = ${tokenHash}
      AND (owner_user_id IS NULL OR owner_user_id = ${userId})
    RETURNING id, technology, difficulty, status, started_at, completed_at, total_score, metadata, owner_user_id
  `;
  return rows[0] as PersistedSession | undefined;
}

export async function listUserInterviewSessions(userId: string) {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT id, technology, difficulty, status, started_at, completed_at, total_score, metadata, owner_user_id
    FROM interview_sessions
    WHERE owner_user_id = ${userId}
    ORDER BY started_at DESC
    LIMIT 100
  `;
  return rows as PersistedSession[];
}

export async function getCandidateLearningProgress(userId: string) {
  const sql = getSql();
  if (!sql) return { topics: [], history: [], recommendations: [] };
  const [topics, history, recommendations] = await Promise.all([
    sql`
      SELECT session.technology, COALESCE(topic.name, question.topic_id, 'Unclassified') AS topic,
        count(answer.id)::int AS attempts, round(avg(answer.score)::numeric, 1) AS average_score,
        max(answer.answered_at) AS last_practiced_at
      FROM interview_sessions session JOIN interview_answers answer ON answer.session_id=session.id
      LEFT JOIN questions question ON question.id=answer.question_id
      LEFT JOIN topics topic ON topic.id=question.topic_id AND topic.technology_id=question.technology_id
      WHERE session.owner_user_id=${userId}
      GROUP BY session.technology, COALESCE(topic.name, question.topic_id, 'Unclassified')
      ORDER BY average_score, attempts DESC
    `,
    sql`
      SELECT id, technology, difficulty, total_score, completed_at
      FROM interview_sessions WHERE owner_user_id=${userId} AND status='completed'
      ORDER BY completed_at DESC LIMIT 50
    `,
    sql`
      WITH weak_topics AS (
        SELECT question.technology_id, question.topic_id, avg(answer.score) AS average_score
        FROM interview_sessions session JOIN interview_answers answer ON answer.session_id=session.id
        JOIN questions question ON question.id=answer.question_id
        WHERE session.owner_user_id=${userId}
        GROUP BY question.technology_id, question.topic_id HAVING avg(answer.score)<70
      ), answered AS (
        SELECT answer.question_id FROM interview_sessions session JOIN interview_answers answer ON answer.session_id=session.id
        WHERE session.owner_user_id=${userId}
      )
      SELECT question.id, question.technology_id, topic.name AS topic, question.difficulty, question.question_type, question.prompt
      FROM weak_topics weak JOIN questions question ON question.technology_id=weak.technology_id AND question.topic_id=weak.topic_id
      JOIN topics topic ON topic.id=question.topic_id AND topic.technology_id=question.technology_id
      WHERE question.review_status IN ('ai-evidence-verified','human-verified') AND question.publish_status='published'
        AND NOT EXISTS (SELECT 1 FROM answered WHERE answered.question_id=question.id)
        AND EXISTS (SELECT 1 FROM publication_batch_items item JOIN publication_batches batch ON batch.id=item.batch_id
          JOIN question_versions version ON version.question_id=question.id AND version.version=question.version
          WHERE item.question_id=question.id AND batch.status='published' AND item.question_version=question.version
            AND item.benchmark_version=version.benchmark_version)
      ORDER BY weak.average_score, CASE question.question_type WHEN 'scenario' THEN 0 WHEN 'troubleshooting' THEN 1 ELSE 2 END,
        CASE question.difficulty WHEN 'beginner' THEN 0 WHEN 'intermediate' THEN 1 ELSE 2 END
      LIMIT 12
    `,
  ]);
  return { topics, history, recommendations };
}

export async function getOwnedInterviewSession(id: string, userId: string) {
  const sql = getSql();
  if (!sql) return null;
  const sessions = await sql`
    SELECT id, technology, difficulty, status, started_at, completed_at, total_score, metadata, owner_user_id
    FROM interview_sessions
    WHERE id = ${id}::uuid AND owner_user_id = ${userId}
    LIMIT 1
  `;
  if (!sessions.length) return null;
  const answers = await sql`SELECT * FROM interview_answers WHERE session_id = ${id}::uuid ORDER BY answered_at`;
  return { session: sessions[0] as PersistedSession, answers: answers as PersistedAnswer[] };
}

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`SELECT role FROM app_user_roles WHERE user_id = ${userId} ORDER BY role`;
  return rows.map((row) => row.role as AppRole);
}

export async function listRoleAssignments() {
  const sql = getSql();
  if (!sql) return [];
  return sql`SELECT user_id, role, granted_at, granted_by FROM app_user_roles ORDER BY granted_at DESC`;
}

export async function grantUserRole(userId: string, role: AppRole, grantedBy: string) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO app_user_roles (user_id, role, granted_by)
    VALUES (${userId}, ${role}, ${grantedBy})
    ON CONFLICT (user_id, role) DO NOTHING
    RETURNING user_id, role, granted_at, granted_by
  `;
  return rows[0] ?? null;
}

export async function revokeUserRole(userId: string, role: AppRole) {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`DELETE FROM app_user_roles WHERE user_id = ${userId} AND role = ${role} RETURNING user_id`;
  return rows.length > 0;
}

export async function saveCoursePackReview(input: {
  courseId: string;
  reviewerUserId: string;
  status: CourseReviewStatus;
  notes: string;
  sourceLinksChecked: boolean;
}) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO course_pack_reviews (course_id, reviewer_user_id, status, notes, source_links_checked)
    VALUES (${input.courseId}, ${input.reviewerUserId}, ${input.status}, ${input.notes}, ${input.sourceLinksChecked})
    ON CONFLICT (course_id, reviewer_user_id) DO UPDATE SET
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      source_links_checked = EXCLUDED.source_links_checked,
      reviewed_at = now()
    RETURNING course_id, reviewer_user_id, status, notes, source_links_checked, reviewed_at
  `;
  return rows[0];
}

export async function listCoursePackReviews() {
  const sql = getSql();
  if (!sql) return [];
  return sql`
    SELECT course_id, reviewer_user_id, status, notes, source_links_checked, reviewed_at
    FROM course_pack_reviews
    ORDER BY reviewed_at DESC
  `;
}

export async function listApprovedCourseIds() {
  const sql = getSql();
  if (!sql) return [] as string[];
  const rows = await sql`
    SELECT DISTINCT course_id
    FROM course_pack_reviews
    WHERE status = 'approved' AND source_links_checked = true
    ORDER BY course_id
  `;
  return rows.map((row) => String(row.course_id));
}

export async function getRecruiterAnalytics() {
  const sql = getSql();
  if (!sql) return { summary: [], sessions: [] };
  const summary = await sql`
    SELECT technology, difficulty, count(*)::int AS sessions,
      count(DISTINCT owner_user_id)::int AS candidates,
      round(avg(total_score)::numeric, 2) AS average_score
    FROM interview_sessions
    WHERE status = 'completed' AND owner_user_id IS NOT NULL
    GROUP BY technology, difficulty
    ORDER BY technology, difficulty
  `;
  const sessions = await sql`
    SELECT id, owner_user_id, technology, difficulty, status, started_at, completed_at, total_score
    FROM interview_sessions
    WHERE status = 'completed' AND owner_user_id IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 100
  `;
  return { summary, sessions };
}

export async function getSubscriptionAccount(userId: string) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT user_id, plan, status, provider_customer_id, provider_subscription_id, current_period_end, updated_at
    FROM subscription_accounts WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function saveSubscriptionAccount(input: {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  customerId?: string | null;
  subscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO subscription_accounts (user_id, plan, status, provider_customer_id, provider_subscription_id, current_period_end)
    VALUES (${input.userId}, ${input.plan}, ${input.status}, ${input.customerId ?? null}, ${input.subscriptionId ?? null}, ${input.currentPeriodEnd ?? null})
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      provider_customer_id = COALESCE(EXCLUDED.provider_customer_id, subscription_accounts.provider_customer_id),
      provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscription_accounts.provider_subscription_id),
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now()
    RETURNING user_id, plan, status, provider_customer_id, provider_subscription_id, current_period_end, updated_at
  `;
  return rows[0] ?? null;
}

export async function saveCheckoutSubscriptionReference(input: {
  userId: string;
  plan: Exclude<SubscriptionPlan, 'free'>;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO subscription_accounts (user_id, plan, status, provider_customer_id, provider_subscription_id)
    VALUES (${input.userId}, ${input.plan}, 'incomplete', ${input.customerId ?? null}, ${input.subscriptionId ?? null})
    ON CONFLICT (user_id) DO UPDATE SET
      provider_customer_id = COALESCE(EXCLUDED.provider_customer_id, subscription_accounts.provider_customer_id),
      provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscription_accounts.provider_subscription_id),
      updated_at = now()
    RETURNING user_id, plan, status, provider_customer_id, provider_subscription_id, current_period_end, updated_at
  `;
  return rows[0] ?? null;
}

export async function deleteUserApplicationData(userId: string) {
  const sql = getSql();
  if (!sql) return false;
  await sql.transaction([
    sql`DELETE FROM course_pack_reviews WHERE reviewer_user_id = ${userId}`,
    sql`UPDATE app_user_roles SET granted_by = NULL WHERE granted_by = ${userId}`,
    sql`DELETE FROM app_user_roles WHERE user_id = ${userId}`,
    sql`DELETE FROM subscription_accounts WHERE user_id = ${userId}`,
    sql`DELETE FROM interview_sessions WHERE owner_user_id = ${userId}`,
  ]);
  return true;
}
