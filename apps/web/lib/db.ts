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
  answered_at: string;
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
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
