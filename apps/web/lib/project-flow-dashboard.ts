import 'server-only';

import { neon } from '@neondatabase/serverless';

import triageReport from '../data/review-triage/latest.json';
import { allQuestionBank, questionBank } from './question-bank';

type CountRow = Record<string, unknown>;

function groupJsonQuestions() {
  const technologies = new Map<string, { technology: string; total: number; draft: number; verified: number; human: number; evidence: number }>();
  const statuses = new Map<string, number>();
  const categories = new Map<string, number>();
  let evidenceLinks = 0;
  for (const question of allQuestionBank) {
    const status = question.benchmark.review.status;
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
    const row = technologies.get(question.technology) ?? { technology: question.technology, total: 0, draft: 0, verified: 0, human: 0, evidence: 0 };
    row.total += 1;
    if (status === 'draft') row.draft += 1;
    if (status === 'ai-evidence-verified') row.verified += 1;
    if (status === 'human-verified') row.human += 1;
    row.evidence += question.benchmark.evidence.length;
    evidenceLinks += question.benchmark.evidence.length;
    if (question.benchmark.evidence.length > 0) {
      categories.set('uncategorized official evidence', (categories.get('uncategorized official evidence') ?? 0) + question.benchmark.evidence.length);
    }
    technologies.set(question.technology, row);
  }
  const verified = [...statuses.entries()].filter(([status]) => ['ai-evidence-verified', 'human-verified'].includes(status)).reduce((sum, [, count]) => sum + count, 0);
  return {
    source: 'json-transition' as const,
    totals: {
      questions: allQuestionBank.length,
      technologies: technologies.size,
      topics: new Set(allQuestionBank.map((question) => `${question.technology}:${question.topic}`)).size,
      versions: allQuestionBank.length,
      evidenceSources: new Set(allQuestionBank.flatMap((question) => question.benchmark.evidence.map((evidence) => `${question.technology}:${evidence.url}:${evidence.contentHash}`))).size,
      evidenceLinks,
      reviewRecords: allQuestionBank.reduce((sum, question) => sum + question.benchmark.review.reviewerModels.length, 0),
      publicationBatches: 0,
      legacyReleased: questionBank.length,
    },
    lifecycle: [
      { key: 'created', label: 'Created & versioned', count: allQuestionBank.length, explanation: 'Stable question IDs and benchmark versions exist.' },
      { key: 'evidence', label: 'Evidence attached', count: allQuestionBank.filter((question) => question.benchmark.evidence.length > 0).length, explanation: 'At least one official source supports the benchmark.' },
      { key: 'static', label: 'Static gate clear', count: Number(triageReport.summary.totalSelectedRecords) - Number(triageReport.summary.totalFlaggedRecords), explanation: 'Pending records without duplicate, template, concept, or local evidence flags.' },
      { key: 'ai', label: 'AI evidence verified', count: statuses.get('ai-evidence-verified') ?? 0, explanation: 'Two independent AI reviewers reached approval consensus.' },
      { key: 'human', label: 'Human verified', count: statuses.get('human-verified') ?? 0, explanation: 'A named human reviewer approved the exact version.' },
      { key: 'published', label: 'Governed batch published', count: 0, explanation: 'Exact versions released through an approved publication batch.' },
    ],
    statuses: [...statuses.entries()].map(([status, count]) => ({ status, count })).sort((left, right) => right.count - left.count),
    technologies: [...technologies.values()].sort((left, right) => left.technology.localeCompare(right.technology)),
    evidenceCategories: [...categories.entries()].map(([category, count]) => ({ category, count })).sort((left, right) => right.count - left.count),
    reviewers: [],
    batches: [],
    bottleneck: `${allQuestionBank.length - verified} questions still require verified review before governed publication.`,
  };
}

async function databaseDashboard() {
  const sql = neon(process.env.DATABASE_URL!);
  const [summary, statuses, technologies, categories, reviewers, batches] = await Promise.all([
    sql`SELECT
      (SELECT count(*)::int FROM questions) AS questions,
      (SELECT count(*)::int FROM technologies) AS technologies,
      (SELECT count(*)::int FROM topics) AS topics,
      (SELECT count(*)::int FROM question_versions) AS versions,
      (SELECT count(*)::int FROM evidence_sources) AS evidence_sources,
      (SELECT count(*)::int FROM question_evidence_links) AS evidence_links,
      (SELECT count(*)::int FROM question_reviews) AS review_records,
      (SELECT count(*)::int FROM publication_batches) AS publication_batches,
      (SELECT count(*)::int FROM questions WHERE source_kind='released') AS legacy_released,
      (SELECT count(*)::int FROM questions WHERE EXISTS (SELECT 1 FROM question_evidence_links link WHERE link.question_id=questions.id)) AS evidence_attached,
      (SELECT count(*)::int FROM questions WHERE EXISTS (SELECT 1 FROM question_reviews review WHERE review.question_id=questions.id AND review.review_kind='static')) AS static_reviewed,
      (SELECT count(*)::int FROM questions WHERE review_status='ai-evidence-verified') AS ai_verified,
      (SELECT count(*)::int FROM questions WHERE review_status='human-verified') AS human_verified,
      (SELECT count(DISTINCT item.question_id)::int FROM publication_batch_items item JOIN publication_batches batch ON batch.id=item.batch_id WHERE batch.status='published') AS batch_published`,
    sql`SELECT review_status AS status, count(*)::int AS count FROM questions GROUP BY review_status ORDER BY count DESC`,
    sql`SELECT question.technology_id AS technology, count(DISTINCT question.id)::int AS total,
      count(DISTINCT question.id) FILTER (WHERE question.review_status='draft')::int AS draft,
      count(DISTINCT question.id) FILTER (WHERE question.review_status='ai-evidence-verified')::int AS verified,
      count(DISTINCT question.id) FILTER (WHERE question.review_status='human-verified')::int AS human,
      count(link.evidence_source_id)::int AS evidence
      FROM questions question LEFT JOIN question_evidence_links link ON link.question_id=question.id
      GROUP BY question.technology_id ORDER BY question.technology_id`,
    sql`SELECT category, count(*)::int AS count FROM evidence_sources GROUP BY category ORDER BY count DESC`,
    sql`SELECT provider, model, count(*)::int AS reviews,
      count(*) FILTER (WHERE status='ai-evidence-verified')::int AS approvals,
      round(100.0 * count(*) FILTER (WHERE status='ai-evidence-verified') / NULLIF(count(*),0), 1) AS approval_rate,
      round(sum(estimated_cost_cents)::numeric, 2) AS estimated_cost_cents
      FROM question_reviews WHERE review_kind='ai' GROUP BY provider, model ORDER BY reviews DESC`,
    sql`SELECT batch.id, technology.name AS technology, batch.name, batch.version, batch.status,
      count(item.question_id)::int AS items, batch.published_at
      FROM publication_batches batch JOIN technologies technology ON technology.id=batch.technology_id
      LEFT JOIN publication_batch_items item ON item.batch_id=batch.id
      GROUP BY batch.id, technology.name ORDER BY batch.created_at DESC LIMIT 20`,
  ]);
  const totals = summary[0] as CountRow;
  const aiVerified = Number(totals.ai_verified ?? 0);
  const humanVerified = Number(totals.human_verified ?? 0);
  return {
    source: 'governed-database' as const,
    totals: {
      questions: Number(totals.questions), technologies: Number(totals.technologies), topics: Number(totals.topics),
      versions: Number(totals.versions), evidenceSources: Number(totals.evidence_sources), evidenceLinks: Number(totals.evidence_links),
      reviewRecords: Number(totals.review_records), publicationBatches: Number(totals.publication_batches), legacyReleased: Number(totals.legacy_released),
    },
    lifecycle: [
      { key: 'created', label: 'Created & versioned', count: Number(totals.questions), explanation: 'Stable question IDs and immutable versions exist.' },
      { key: 'evidence', label: 'Evidence attached', count: Number(totals.evidence_attached), explanation: 'Official evidence is linked to the benchmark.' },
      { key: 'static', label: 'Static audit recorded', count: Number(totals.static_reviewed), explanation: 'A zero-cost static review decision is in the audit ledger.' },
      { key: 'ai', label: 'AI evidence verified', count: aiVerified, explanation: 'Two-model approval consensus verified the exact benchmark.' },
      { key: 'human', label: 'Human verified', count: humanVerified, explanation: 'A named human reviewer approved the exact version.' },
      { key: 'published', label: 'Governed batch published', count: Number(totals.batch_published), explanation: 'Exact versions belong to the active published batch.' },
    ],
    statuses: statuses as CountRow[], technologies: technologies as CountRow[], evidenceCategories: categories as CountRow[],
    reviewers: reviewers as CountRow[], batches: batches as CountRow[],
    bottleneck: `${Math.max(0, Number(totals.questions) - aiVerified - humanVerified)} questions remain outside a verified state.`,
  };
}

export async function getProjectFlowDashboard() {
  if (!process.env.DATABASE_URL) return groupJsonQuestions();
  try {
    return await databaseDashboard();
  } catch (error) {
    console.warn('Governed flow dashboard is using transition data.', { message: error instanceof Error ? error.message.slice(0, 160) : 'unknown' });
    return groupJsonQuestions();
  }
}
