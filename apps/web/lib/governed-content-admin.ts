import 'server-only';

import { neon } from '@neondatabase/serverless';
import { createHash, randomUUID } from 'node:crypto';

import type { InterviewQuestion } from './api';

export type ContentAdminFilters = {
  technology?: string;
  topic?: string;
  difficulty?: string;
  type?: string;
  reviewStatus?: string;
  publishStatus?: string;
  query?: string;
  page?: number;
};

export class GovernedContentDatabaseUnavailableError extends Error {
  constructor() {
    super('Governed content database is unavailable');
    this.name = 'GovernedContentDatabaseUnavailableError';
  }
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new GovernedContentDatabaseUnavailableError();
  return neon(url);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue((value as Record<string, unknown>)[key])]));
  }
  return value;
}

function snapshotHash(snapshot: InterviewQuestion) {
  return `sha256:${createHash('sha256').update(JSON.stringify(stableValue(snapshot))).digest('hex')}`;
}

function versionParts(version: string) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('A semantic version is required');
  return version.split('.').map(Number);
}

function compareVersions(left: string, right: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function nextPatch(version: string) {
  const [major, minor, patch] = versionParts(version);
  return `${major}.${minor}.${patch + 1}`;
}

export async function listGovernedContent(filters: ContentAdminFilters = {}) {
  const sql = getSql();
  const pageSize = 50;
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * pageSize;
  const technology = filters.technology || null;
  const topic = filters.topic || null;
  const difficulty = filters.difficulty || null;
  const questionType = filters.type || null;
  const reviewStatus = filters.reviewStatus || null;
  const publishStatus = filters.publishStatus || null;
  const query = filters.query?.trim() || null;

  const [technologySummary, topicSummary, statusSummary, rows, totals, reviewerPerformance, disputeReasons, evidenceHealth] = await Promise.all([
    sql`SELECT technology.id, technology.name,
          count(question.id)::int AS questions,
          count(question.id) FILTER (WHERE question.publish_status='published')::int AS published,
          count(question.id) FILTER (WHERE question.review_status IN ('draft','reviewing','disputed','stale','rejected'))::int AS needs_attention
        FROM technologies technology
        LEFT JOIN questions question ON question.technology_id=technology.id
        GROUP BY technology.id, technology.name ORDER BY technology.name`,
    sql`SELECT topic.technology_id, topic.slug, topic.name, count(question.id)::int AS questions
        FROM topics topic LEFT JOIN questions question ON question.topic_id=topic.id
        GROUP BY topic.id ORDER BY topic.technology_id, topic.name`,
    sql`SELECT review_status, publish_status, count(*)::int AS questions
        FROM questions GROUP BY review_status, publish_status ORDER BY review_status, publish_status`,
    sql`SELECT question.id, question.technology_id, topic.slug AS topic, question.difficulty,
          question.question_type, question.prompt, question.review_status, question.publish_status,
          question.version, question.updated_at
        FROM questions question JOIN topics topic ON topic.id=question.topic_id
        WHERE (${technology}::text IS NULL OR question.technology_id=${technology})
          AND (${topic}::text IS NULL OR topic.slug=${topic})
          AND (${difficulty}::text IS NULL OR question.difficulty=${difficulty})
          AND (${questionType}::text IS NULL OR question.question_type=${questionType})
          AND (${reviewStatus}::text IS NULL OR question.review_status=${reviewStatus})
          AND (${publishStatus}::text IS NULL OR question.publish_status=${publishStatus})
          AND (${query}::text IS NULL OR question.prompt ILIKE '%' || ${query} || '%' OR question.id ILIKE '%' || ${query} || '%')
        ORDER BY question.updated_at DESC, question.id
        LIMIT ${pageSize} OFFSET ${offset}`,
    sql`SELECT count(*)::int AS total
        FROM questions question JOIN topics topic ON topic.id=question.topic_id
        WHERE (${technology}::text IS NULL OR question.technology_id=${technology})
          AND (${topic}::text IS NULL OR topic.slug=${topic})
          AND (${difficulty}::text IS NULL OR question.difficulty=${difficulty})
          AND (${questionType}::text IS NULL OR question.question_type=${questionType})
          AND (${reviewStatus}::text IS NULL OR question.review_status=${reviewStatus})
          AND (${publishStatus}::text IS NULL OR question.publish_status=${publishStatus})
          AND (${query}::text IS NULL OR question.prompt ILIKE '%' || ${query} || '%' OR question.id ILIKE '%' || ${query} || '%')`,
    sql`SELECT provider, model, count(*)::int AS reviews,
          count(*) FILTER (WHERE status='ai-evidence-verified')::int AS approvals,
          round(100.0 * count(*) FILTER (WHERE status='ai-evidence-verified') / NULLIF(count(*), 0), 1) AS approval_rate,
          round(sum(estimated_cost_cents)::numeric / NULLIF(count(*) FILTER (WHERE status='ai-evidence-verified'), 0), 4) AS cost_cents_per_verified
        FROM question_reviews WHERE review_kind='ai' GROUP BY provider, model ORDER BY reviews DESC`,
    sql`SELECT correction, count(*)::int AS occurrences FROM question_reviews review,
          LATERAL jsonb_array_elements_text(review.corrections) correction
        WHERE review.status IN ('disputed','rejected') GROUP BY correction ORDER BY occurrences DESC LIMIT 20`,
    sql`SELECT technology_id, count(*)::int AS sources,
          count(*) FILTER (WHERE stale_at IS NOT NULL)::int AS stale,
          count(*) FILTER (WHERE last_checked_at IS NULL OR last_checked_at < now() - interval '30 days')::int AS overdue
        FROM evidence_sources GROUP BY technology_id ORDER BY technology_id`,
  ]);

  const total = Number(totals[0]?.total ?? 0);
  return {
    technologies: technologySummary,
    topics: topicSummary,
    statuses: statusSummary,
    reviewerPerformance,
    disputeReasons,
    evidenceHealth,
    questions: rows,
    page,
    pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getGovernedContentQuestion(id: string) {
  const sql = getSql();
  const questions = await sql`
    SELECT question.*, topic.slug AS topic_slug, topic.name AS topic_name,
      technology.official_domains,
      version.benchmark_version, version.snapshot
    FROM questions question
    JOIN topics topic ON topic.id=question.topic_id
    JOIN technologies technology ON technology.id=question.technology_id
    JOIN question_versions version ON version.question_id=question.id AND version.version=question.version
    WHERE question.id=${id} LIMIT 1
  `;
  if (!questions.length) return null;
  const question = questions[0];
  const [benchmarks, evidence, reviews, versions] = await Promise.all([
    sql`SELECT * FROM benchmark_answers WHERE question_id=${id} ORDER BY created_at DESC`,
    sql`SELECT source.*, link.is_primary, link.claim_scope
        FROM question_evidence_links link
        JOIN evidence_sources source ON source.id=link.evidence_source_id
        JOIN benchmark_answers benchmark ON benchmark.id=link.benchmark_answer_id
        WHERE link.question_id=${id} AND benchmark.benchmark_version=${question.benchmark_version}
        ORDER BY link.is_primary DESC, source.title`,
    sql`SELECT review_key, review_kind, status, provider, model, reviewer_user_id, verdict,
          confidence, findings, corrections, reviewed_at
        FROM question_reviews WHERE question_id=${id} ORDER BY reviewed_at DESC`,
    sql`SELECT version, benchmark_version, content_hash, change_summary, created_at, created_by
        FROM question_versions WHERE question_id=${id} ORDER BY created_at DESC`,
  ]);
  return { question, benchmarks, evidence, reviews, versions };
}

export type QuestionRevisionInput = {
  id: string;
  baseVersion: string;
  newVersion: string;
  benchmarkVersion: string;
  prompt: string;
  canonicalAnswer: string;
  expandedExplanation: string;
  requiredConcepts: string[];
  optionalConcepts: string[];
  reasoning: string;
  changeSummary: string;
  actor: string;
  evidence?: {
    url: string;
    title: string;
    section: string;
    category: 'overview' | 'setup' | 'security' | 'monitoring' | 'troubleshooting' | 'quotas' | 'best-practices' | 'recovery' | 'cost';
    documentVersion?: string;
    contentHash: string;
    retrievedAt: string;
  };
};

export type CreateGovernedQuestionInput = {
  id: string;
  technology: InterviewQuestion['technology'];
  topic: string;
  topicName: string;
  difficulty: InterviewQuestion['difficulty'];
  type: string;
  prompt: string;
  canonicalAnswer: string;
  expandedExplanation: string;
  requiredConcepts: string[];
  optionalConcepts: string[];
  reasoning: string;
  scoringAnchors: { strong: string; partial: string; weak: string; incorrect: string };
  evidence: {
    url: string;
    title: string;
    section: string;
    category: 'overview' | 'setup' | 'security' | 'monitoring' | 'troubleshooting' | 'quotas' | 'best-practices' | 'recovery' | 'cost';
    documentVersion?: string;
    contentHash: string;
    retrievedAt: string;
  };
  actor: string;
};

export async function createGovernedQuestion(input: CreateGovernedQuestionInput) {
  const sql = getSql();
  const technologies = await sql`SELECT official_domains FROM technologies WHERE id=${input.technology} LIMIT 1`;
  if (!technologies.length) throw new Error('Unknown governed technology');
  const host = new URL(input.evidence.url).hostname;
  if (!(technologies[0].official_domains as string[]).includes(host)) throw new Error(`Evidence host ${host} is not approved for this technology`);
  if (!/^sha256:[a-f0-9]{64}$/.test(input.evidence.contentHash)) throw new Error('Evidence requires a SHA-256 content hash');
  const acceptedAlternatives = input.requiredConcepts.map((concept) => ({ terms: [concept], meaning: `Accepted wording for ${concept}.` }));
  const snapshot: InterviewQuestion = {
    id: input.id,
    technology: input.technology,
    topic: input.topic,
    difficulty: input.difficulty,
    type: input.type,
    question: input.prompt,
    canonicalAnswer: input.canonicalAnswer,
    expectedConcepts: input.requiredConcepts,
    followUps: [],
    source: { title: input.evidence.title, url: input.evidence.url, verified: input.evidence.retrievedAt },
    reviewStatus: 'needs-review',
    version: 1,
    benchmark: {
      version: '1.0.0',
      canonicalAnswer: input.canonicalAnswer,
      expandedExplanation: input.expandedExplanation,
      requiredConcepts: input.requiredConcepts,
      optionalConcepts: input.optionalConcepts,
      acceptedAlternatives,
      incorrectClaims: [],
      reasoning: input.reasoning,
      evidence: [{
        url: input.evidence.url,
        title: input.evidence.title,
        section: input.evidence.section,
        retrievedAt: input.evidence.retrievedAt,
        documentVersion: input.evidence.documentVersion,
        contentHash: input.evidence.contentHash,
      }],
      scoringAnchors: input.scoringAnchors,
      review: {
        status: 'draft', promptVersion: 'content-admin-create-1.0.0', reviewerModels: [], verdicts: [],
        confidence: 0, corrections: ['New content requires independent evidence review.'], reviewedAt: null,
      },
    },
  };
  const hash = snapshotHash(snapshot);
  const rows = await sql`
    WITH topic AS (
      INSERT INTO topics (technology_id, slug, name, created_by, updated_by)
      VALUES (${input.technology}, ${input.topic}, ${input.topicName}, ${input.actor}, ${input.actor})
      ON CONFLICT (technology_id, slug) DO UPDATE SET name=EXCLUDED.name, updated_at=now(), updated_by=EXCLUDED.updated_by
      RETURNING id
    ), question AS (
      INSERT INTO questions (id, technology_id, topic_id, difficulty, question_type, source_kind, prompt,
        canonical_answer, expected_concepts, follow_ups, review_status, publish_status, version, content_hash, created_by, updated_by)
      SELECT ${input.id}, ${input.technology}, topic.id, ${input.difficulty}, ${input.type}, 'candidate',
        ${input.prompt}, ${input.canonicalAnswer}, ${JSON.stringify(input.requiredConcepts)}::jsonb, '[]'::jsonb,
        'draft', 'unpublished', '1.0.0', ${hash}, ${input.actor}, ${input.actor} FROM topic
      RETURNING id
    ), benchmark AS (
      INSERT INTO benchmark_answers (question_id, benchmark_version, canonical_answer, expanded_explanation,
        required_concepts, optional_concepts, accepted_alternatives, incorrect_claims, reasoning, scoring_anchors,
        review_status, created_by, updated_by)
      SELECT question.id, '1.0.0', ${input.canonicalAnswer}, ${input.expandedExplanation},
        ${JSON.stringify(input.requiredConcepts)}::jsonb, ${JSON.stringify(input.optionalConcepts)}::jsonb,
        ${JSON.stringify(acceptedAlternatives)}::jsonb, '[]'::jsonb, ${input.reasoning},
        ${JSON.stringify(input.scoringAnchors)}::jsonb, 'draft', ${input.actor}, ${input.actor} FROM question
      RETURNING id, question_id
    ), source AS (
      INSERT INTO evidence_sources (technology_id, url, title, section, category, document_version,
        content_hash, is_official, retrieved_at, last_checked_at, created_by, updated_by)
      VALUES (${input.technology}, ${input.evidence.url}, ${input.evidence.title}, ${input.evidence.section},
        ${input.evidence.category}, ${input.evidence.documentVersion ?? null}, ${input.evidence.contentHash}, true,
        ${input.evidence.retrievedAt}::timestamptz, ${input.evidence.retrievedAt}::timestamptz, ${input.actor}, ${input.actor})
      ON CONFLICT (technology_id, url, content_hash) DO UPDATE SET title=EXCLUDED.title, section=EXCLUDED.section,
        category=EXCLUDED.category, document_version=EXCLUDED.document_version, last_checked_at=EXCLUDED.last_checked_at,
        updated_at=now(), updated_by=EXCLUDED.updated_by RETURNING id
    ), version AS (
      INSERT INTO question_versions (question_id, version, benchmark_version, content_hash, snapshot, change_summary, created_by)
      SELECT question.id, '1.0.0', '1.0.0', ${hash}, ${JSON.stringify(snapshot)}::jsonb, 'Created in Content Admin', ${input.actor}
      FROM question RETURNING question_id
    ), link AS (
      INSERT INTO question_evidence_links (question_id, benchmark_answer_id, evidence_source_id, claim_scope, is_primary, created_by)
      SELECT benchmark.question_id, benchmark.id, source.id, ${input.evidence.section}, true, ${input.actor}
      FROM benchmark, source, version RETURNING question_id
    ) SELECT question_id AS id FROM link
  `;
  return rows[0] ?? null;
}

export async function reviseGovernedQuestion(input: QuestionRevisionInput) {
  if (compareVersions(input.newVersion, input.baseVersion) <= 0) throw new Error('New question version must increase');
  const detail = await getGovernedContentQuestion(input.id);
  if (!detail || detail.question.version !== input.baseVersion) return null;
  if (input.evidence) {
    const host = new URL(input.evidence.url).hostname;
    const officialDomains = detail.question.official_domains as string[];
    if (!officialDomains.includes(host)) throw new Error(`Evidence host ${host} is not approved for this technology`);
    if (!/^sha256:[a-f0-9]{64}$/.test(input.evidence.contentHash)) throw new Error('Evidence requires a SHA-256 content hash');
  }
  const current = detail.question.snapshot as InterviewQuestion;
  const evidence = input.evidence ? {
    url: input.evidence.url,
    title: input.evidence.title,
    section: input.evidence.section,
    retrievedAt: input.evidence.retrievedAt,
    documentVersion: input.evidence.documentVersion,
    contentHash: input.evidence.contentHash,
  } : null;
  const snapshot: InterviewQuestion = {
    ...current,
    question: input.prompt,
    canonicalAnswer: input.canonicalAnswer,
    expectedConcepts: input.requiredConcepts,
    reviewStatus: 'needs-review',
    version: Number(input.newVersion.split('.')[0]),
    benchmark: {
      ...current.benchmark,
      version: input.benchmarkVersion,
      canonicalAnswer: input.canonicalAnswer,
      expandedExplanation: input.expandedExplanation,
      requiredConcepts: input.requiredConcepts,
      optionalConcepts: input.optionalConcepts,
      reasoning: input.reasoning,
      evidence: evidence
        ? [...current.benchmark.evidence.filter((item) => !(item.url === evidence.url && item.contentHash === evidence.contentHash)), evidence]
        : current.benchmark.evidence,
      review: {
        status: 'draft',
        promptVersion: 'content-admin-revision-1.0.0',
        reviewerModels: [],
        verdicts: [],
        confidence: 0,
        corrections: ['Content revision requires independent evidence review.'],
        reviewedAt: null,
      },
    },
  };
  const hash = snapshotHash(snapshot);
  const sql = getSql();
  const rows = await sql`
    WITH current AS MATERIALIZED (
      SELECT id FROM questions WHERE id=${input.id} AND version=${input.baseVersion} FOR UPDATE
    ), new_benchmark AS (
      INSERT INTO benchmark_answers (
        question_id, benchmark_version, canonical_answer, expanded_explanation, required_concepts,
        optional_concepts, accepted_alternatives, incorrect_claims, reasoning, scoring_anchors,
        review_status, created_by, updated_by
      )
      SELECT ${input.id}, ${input.benchmarkVersion}, ${input.canonicalAnswer}, ${input.expandedExplanation},
        ${JSON.stringify(input.requiredConcepts)}::jsonb, ${JSON.stringify(input.optionalConcepts)}::jsonb,
        benchmark.accepted_alternatives, benchmark.incorrect_claims, ${input.reasoning}, benchmark.scoring_anchors,
        'draft', ${input.actor}, ${input.actor}
      FROM current
      JOIN question_versions version ON version.question_id=current.id AND version.version=${input.baseVersion}
      JOIN benchmark_answers benchmark ON benchmark.question_id=current.id AND benchmark.benchmark_version=version.benchmark_version
      RETURNING id
    ), new_source AS (
      INSERT INTO evidence_sources (technology_id, url, title, section, category, document_version,
        content_hash, is_official, retrieved_at, last_checked_at, created_by, updated_by)
      SELECT question.technology_id, ${input.evidence?.url ?? null}, ${input.evidence?.title ?? null},
        ${input.evidence?.section ?? null}, ${input.evidence?.category ?? 'overview'}, ${input.evidence?.documentVersion ?? null},
        ${input.evidence?.contentHash ?? null}, true, ${input.evidence?.retrievedAt ?? null}::timestamptz,
        ${input.evidence?.retrievedAt ?? null}::timestamptz, ${input.actor}, ${input.actor}
      FROM current JOIN questions question ON question.id=current.id
      WHERE ${Boolean(input.evidence)}
      ON CONFLICT (technology_id, url, content_hash) DO UPDATE SET title=EXCLUDED.title,
        section=EXCLUDED.section, category=EXCLUDED.category, document_version=EXCLUDED.document_version,
        last_checked_at=EXCLUDED.last_checked_at, updated_at=now(), updated_by=EXCLUDED.updated_by
      RETURNING id
    ), new_version AS (
      INSERT INTO question_versions (question_id, version, benchmark_version, content_hash, snapshot, change_summary, created_by)
      SELECT ${input.id}, ${input.newVersion}, ${input.benchmarkVersion}, ${hash}, ${JSON.stringify(snapshot)}::jsonb,
        ${input.changeSummary}, ${input.actor} FROM current, new_benchmark
      RETURNING version
    ), copied_links AS (
      INSERT INTO question_evidence_links (question_id, benchmark_answer_id, evidence_source_id, claim_scope, is_primary, created_by)
      SELECT ${input.id}, new_benchmark.id, link.evidence_source_id, link.claim_scope, link.is_primary, ${input.actor}
      FROM current, new_benchmark
      JOIN question_versions old_version ON old_version.question_id=${input.id} AND old_version.version=${input.baseVersion}
      JOIN benchmark_answers old_benchmark ON old_benchmark.question_id=${input.id} AND old_benchmark.benchmark_version=old_version.benchmark_version
      JOIN question_evidence_links link ON link.benchmark_answer_id=old_benchmark.id
      ON CONFLICT DO NOTHING
    ), linked_source AS (
      INSERT INTO question_evidence_links (question_id, benchmark_answer_id, evidence_source_id, claim_scope, is_primary, created_by)
      SELECT ${input.id}, new_benchmark.id, new_source.id, ${input.evidence?.section ?? ''}, false, ${input.actor}
      FROM new_benchmark, new_source ON CONFLICT DO NOTHING
    ), updated AS (
      UPDATE questions SET prompt=${input.prompt}, canonical_answer=${input.canonicalAnswer},
        expected_concepts=${JSON.stringify(input.requiredConcepts)}::jsonb, review_status='draft',
        publish_status='unpublished', version=${input.newVersion}, content_hash=${hash},
        last_reviewed_at=NULL, updated_at=now(), updated_by=${input.actor}
      FROM current, new_version WHERE questions.id=current.id
      RETURNING questions.id, questions.version
    ) SELECT * FROM updated
  `;
  return rows[0] ?? null;
}

export async function recordGovernedHumanReview(input: {
  id: string;
  baseVersion: string;
  reviewerUserId: string;
  verdict: 'approve' | 'reject';
  notes: string;
}) {
  const detail = await getGovernedContentQuestion(input.id);
  if (!detail || detail.question.version !== input.baseVersion) return null;
  if (input.verdict === 'approve' && (!detail.evidence.length || detail.evidence.some((source) => !source.is_official || source.stale_at))) {
    throw new Error('Current official, non-stale evidence is required for human verification');
  }
  const status = input.verdict === 'approve' ? 'human-verified' : 'rejected';
  const newVersion = nextPatch(input.baseVersion);
  const current = detail.question.snapshot as InterviewQuestion;
  const reviewedAt = new Date().toISOString().slice(0, 10);
  const snapshot: InterviewQuestion = {
    ...current,
    reviewStatus: status === 'human-verified' ? 'human-reviewed' : 'needs-review',
    benchmark: {
      ...current.benchmark,
      review: {
        status,
        promptVersion: 'human-content-review-1.0.0',
        reviewerModels: ['human-reviewer'],
        verdicts: [input.verdict],
        confidence: 1,
        corrections: input.notes ? [input.notes] : [],
        reviewedAt,
      },
    },
  };
  const hash = snapshotHash(snapshot);
  const reviewKey = `human:${randomUUID()}`;
  const sql = getSql();
  const rows = await sql`
    WITH current AS MATERIALIZED (
      SELECT id FROM questions WHERE id=${input.id} AND version=${input.baseVersion} FOR UPDATE
    ), current_benchmark AS (
      SELECT benchmark.id, benchmark.benchmark_version
      FROM current
      JOIN question_versions version ON version.question_id=current.id AND version.version=${input.baseVersion}
      JOIN benchmark_answers benchmark ON benchmark.question_id=current.id AND benchmark.benchmark_version=version.benchmark_version
    ), new_version AS (
      INSERT INTO question_versions (question_id, version, benchmark_version, content_hash, snapshot, change_summary, created_by)
      SELECT ${input.id}, ${newVersion}, current_benchmark.benchmark_version, ${hash}, ${JSON.stringify(snapshot)}::jsonb,
        ${`Human review: ${input.verdict}`}, ${input.reviewerUserId}
      FROM current, current_benchmark RETURNING version
    ), audit AS (
      INSERT INTO question_reviews (review_key, question_id, benchmark_answer_id, review_kind, status,
        reviewer_user_id, verdict, confidence, corrections, input_hash, reviewed_at, created_by)
      SELECT ${reviewKey}, ${input.id}, current_benchmark.id, 'human', ${status}, ${input.reviewerUserId},
        ${input.verdict}, 1, ${JSON.stringify(input.notes ? [input.notes] : [])}::jsonb, ${hash}, now(), ${input.reviewerUserId}
      FROM current, current_benchmark RETURNING id
    ), benchmark_update AS (
      UPDATE benchmark_answers SET review_status=${status}, last_reviewed_at=now(), updated_at=now(), updated_by=${input.reviewerUserId}
      FROM current_benchmark, audit WHERE benchmark_answers.id=current_benchmark.id RETURNING benchmark_answers.id
    ), updated AS (
      UPDATE questions SET review_status=${status},
        publish_status=CASE WHEN ${status}='rejected' THEN 'unpublished' ELSE questions.publish_status END,
        version=${newVersion}, content_hash=${hash}, last_reviewed_at=now(), updated_at=now(), updated_by=${input.reviewerUserId}
      FROM current, new_version, benchmark_update WHERE questions.id=current.id
      RETURNING questions.id, questions.version, questions.review_status
    ) SELECT * FROM updated
  `;
  return rows[0] ?? null;
}

export async function bulkUpdateGovernedQuestions(input: {
  ids: string[];
  action: 'mark-stale' | 'retire' | 'unpublish';
  actor: string;
}) {
  const sql = getSql();
  const ids = [...new Set(input.ids)].slice(0, 200);
  if (!ids.length) return [];
  if (input.action === 'mark-stale') {
    await sql`
      INSERT INTO question_reviews (review_key, question_id, benchmark_answer_id, review_kind, status, verdict, findings, created_by)
      SELECT 'bulk:' || gen_random_uuid()::text, question.id, benchmark.id, 'static', 'stale', 'stale',
        '["Marked stale through Content Admin bulk action"]'::jsonb, ${input.actor}
      FROM questions question
      JOIN question_versions version ON version.question_id=question.id AND version.version=question.version
      JOIN benchmark_answers benchmark ON benchmark.question_id=question.id AND benchmark.benchmark_version=version.benchmark_version
      WHERE question.id IN (SELECT value FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    `;
  }
  const rows = await sql`
    UPDATE questions SET
      review_status=CASE WHEN ${input.action}='mark-stale' THEN 'stale' ELSE review_status END,
      publish_status=CASE WHEN ${input.action}='retire' THEN 'retired' ELSE 'unpublished' END,
      retired_at=CASE WHEN ${input.action}='retire' THEN now() ELSE retired_at END,
      updated_at=now(), updated_by=${input.actor}
    WHERE id IN (SELECT value FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    RETURNING id
  `;
  return rows;
}
