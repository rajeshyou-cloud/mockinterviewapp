import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const CONTENT_PACKS = [
  { kind: 'released', path: 'apps/web/data/beginner.json' },
  { kind: 'released', path: 'apps/web/data/starter.json' },
  { kind: 'released', path: 'apps/web/data/expanded.json' },
  { kind: 'released', path: 'apps/web/data/generated.json' },
  { kind: 'candidate', path: 'apps/web/data/candidates/aws.json' },
  { kind: 'candidate', path: 'apps/web/data/candidates/databricks.json' },
  { kind: 'candidate', path: 'apps/web/data/candidates/oracle.json' },
  { kind: 'candidate', path: 'apps/web/data/candidates/power-bi.json' },
  { kind: 'candidate', path: 'apps/web/data/candidates/python.json' },
];

const technologyMetadata = {
  aws: { name: 'AWS', vendor: 'Amazon Web Services' },
  databricks: { name: 'Databricks', vendor: 'Databricks' },
  informatica: { name: 'Informatica', vendor: 'Informatica' },
  oracle: { name: 'Oracle Database', vendor: 'Oracle' },
  'power-bi': { name: 'Power BI', vendor: 'Microsoft' },
  python: { name: 'Python', vendor: 'Python Software Foundation' },
  snowflake: { name: 'Snowflake', vendor: 'Snowflake' },
};

const verifiedStatuses = new Set(['ai-evidence-verified', 'human-verified']);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

export function contentHash(value) {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function semanticVersion(version) {
  if (typeof version === 'number') return `${version}.0.0`;
  if (/^\d+\.\d+\.\d+$/.test(version)) return version;
  throw new Error(`Unsupported question version: ${version}`);
}

function providerForModel(model) {
  const normalized = model.toLowerCase();
  if (normalized.includes('claude')) return 'anthropic';
  if (normalized.includes('gemini')) return 'google';
  if (normalized.includes('gpt') || normalized.includes('openai')) return 'openai';
  if (normalized.includes('human')) return 'human';
  return 'imported-review';
}

function buildReviews(question, benchmarkIdKey) {
  const review = question.benchmark.review;
  if (review.status === 'draft') return [];

  const models = review.reviewerModels ?? [];
  if (review.status === 'human-verified' && models.length === 0) {
    throw new Error(`${question.id}: human-verified review has no reviewer identity`);
  }

  if (models.length === 0) {
    const payload = { questionId: question.id, benchmarkIdKey, review, kind: 'static' };
    return [{
      reviewKey: contentHash(payload),
      reviewKind: 'static',
      provider: null,
      model: null,
      reviewerUserId: null,
      verdict: review.verdicts?.[0] ?? review.status,
      ...review,
    }];
  }

  return models.map((model, index) => {
    const reviewKind = review.status === 'human-verified' ? 'human' : 'ai';
    const payload = { questionId: question.id, benchmarkIdKey, review, model, index };
    return {
      reviewKey: contentHash(payload),
      reviewKind,
      provider: reviewKind === 'ai' ? providerForModel(model) : null,
      model: reviewKind === 'ai' ? model : null,
      reviewerUserId: reviewKind === 'human' ? model : null,
      verdict: review.verdicts?.[index] ?? review.status,
      ...review,
    };
  });
}

export async function loadContentPacks(repoRoot = process.cwd()) {
  const records = [];
  for (const pack of CONTENT_PACKS) {
    const questions = JSON.parse(await readFile(path.join(repoRoot, pack.path), 'utf8'));
    for (const question of questions) records.push({ pack: pack.path, kind: pack.kind, question });
  }
  return records;
}

export function buildImportModel(records, technologyFilter) {
  const seenIds = new Set();
  const technologies = new Map();
  const topics = new Map();
  const questions = [];
  const evidence = new Map();
  const links = [];
  const reviews = [];

  for (const record of records) {
    const { question } = record;
    if (technologyFilter && question.technology !== technologyFilter) continue;
    if (seenIds.has(question.id)) throw new Error(`Duplicate stable question ID: ${question.id}`);
    seenIds.add(question.id);

    const benchmark = question.benchmark;
    if (!benchmark?.version || !benchmark?.review?.status) throw new Error(`${question.id}: incomplete benchmark`);
    const metadata = technologyMetadata[question.technology];
    if (!metadata) throw new Error(`${question.id}: missing technology metadata`);

    const domains = new Set(benchmark.evidence.map((item) => new URL(item.url).hostname));
    const existingTechnology = technologies.get(question.technology);
    technologies.set(question.technology, {
      id: question.technology,
      ...metadata,
      officialDomains: [...new Set([...(existingTechnology?.officialDomains ?? []), ...domains])].sort(),
      lifecycleStatus: record.kind === 'released' ? 'active' : (existingTechnology?.lifecycleStatus ?? 'planned'),
    });

    const topicKey = `${question.technology}:${question.topic}`;
    topics.set(topicKey, {
      technologyId: question.technology,
      slug: question.topic,
      name: question.topic.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    });

    const version = semanticVersion(question.version);
    const hash = contentHash(question);
    const publishStatus = record.kind === 'released' && verifiedStatuses.has(benchmark.review.status)
      ? 'published'
      : 'unpublished';
    questions.push({
      ...question,
      sourceKind: record.kind,
      sourcePack: record.pack,
      questionVersion: version,
      contentHash: hash,
      benchmarkReviewStatus: benchmark.review.status,
      publishStatus,
    });

    const benchmarkIdKey = `${question.id}:${benchmark.version}`;
    for (const item of benchmark.evidence) {
      const evidenceKey = `${question.technology}:${item.url}:${item.contentHash}`;
      evidence.set(evidenceKey, {
        ...item,
        technologyId: question.technology,
        category: 'overview',
        isOfficial: true,
      });
      links.push({ questionId: question.id, benchmarkVersion: benchmark.version, evidenceKey });
    }
    reviews.push(...buildReviews(question, benchmarkIdKey).map((review) => ({
      ...review,
      questionId: question.id,
      benchmarkVersion: benchmark.version,
      inputHash: hash,
    })));
  }

  const byTechnology = {};
  const byReviewStatus = {};
  const byPublishStatus = {};
  for (const question of questions) {
    byTechnology[question.technology] = (byTechnology[question.technology] ?? 0) + 1;
    byReviewStatus[question.benchmarkReviewStatus] = (byReviewStatus[question.benchmarkReviewStatus] ?? 0) + 1;
    byPublishStatus[question.publishStatus] = (byPublishStatus[question.publishStatus] ?? 0) + 1;
  }

  return {
    technologies: [...technologies.values()].sort((a, b) => a.id.localeCompare(b.id)),
    topics: [...topics.values()].sort((a, b) => `${a.technologyId}:${a.slug}`.localeCompare(`${b.technologyId}:${b.slug}`)),
    questions,
    evidence: [...evidence.entries()].map(([key, value]) => ({ key, ...value })),
    links,
    reviews,
    summary: {
      technologies: technologies.size,
      topics: topics.size,
      questions: questions.length,
      benchmarkAnswers: questions.length,
      evidenceSources: evidence.size,
      evidenceLinks: links.length,
      reviews: reviews.length,
      questionVersions: questions.length,
      byTechnology,
      byReviewStatus,
      byPublishStatus,
    },
  };
}

function toTimestamp(date) {
  return date ? `${date}T00:00:00.000Z` : null;
}

async function applyTechnology(sql, model, technology) {
  const actor = 'json-importer:v1';
  const technologyRecord = model.technologies.find((item) => item.id === technology);
  const topics = model.topics.filter((item) => item.technologyId === technology);
  const questions = model.questions.filter((item) => item.technology === technology);
  const evidence = model.evidence.filter((item) => item.technologyId === technology);
  const links = model.links.filter((item) => item.evidenceKey.startsWith(`${technology}:`));
  const reviews = model.reviews.filter((item) => item.questionId && questions.some((question) => question.id === item.questionId));

  const incomingVersions = questions.map((question) => ({
    question_id: question.id,
    version: question.questionVersion,
    content_hash: question.contentHash,
  }));
  const mismatches = await sql`
    WITH incoming AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(incomingVersions)}::jsonb)
        AS x(question_id text, version text, content_hash text)
    )
    SELECT incoming.question_id, incoming.version
    FROM incoming
    JOIN question_versions existing
      ON existing.question_id = incoming.question_id AND existing.version = incoming.version
    WHERE existing.content_hash <> incoming.content_hash
  `;
  if (mismatches.length) {
    throw new Error(`Immutable version collision: ${mismatches.map((item) => `${item.question_id}@${item.version}`).join(', ')}`);
  }

  await sql.transaction([
    sql`INSERT INTO technologies (id, name, vendor, official_domains, lifecycle_status, created_by, updated_by)
        VALUES (${technologyRecord.id}, ${technologyRecord.name}, ${technologyRecord.vendor}, ${JSON.stringify(technologyRecord.officialDomains)}::jsonb, ${technologyRecord.lifecycleStatus}, ${actor}, ${actor})
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, vendor=EXCLUDED.vendor, official_domains=EXCLUDED.official_domains, lifecycle_status=EXCLUDED.lifecycle_status, updated_at=now(), updated_by=EXCLUDED.updated_by`,
    ...topics.map((topic) => sql`INSERT INTO topics (technology_id, slug, name, created_by, updated_by)
        VALUES (${topic.technologyId}, ${topic.slug}, ${topic.name}, ${actor}, ${actor})
        ON CONFLICT (technology_id, slug) DO UPDATE SET name=EXCLUDED.name, updated_at=now(), updated_by=EXCLUDED.updated_by`),
  ]);

  const operations = [];
  for (const question of questions) {
    const benchmark = question.benchmark;
    operations.push(
      sql`INSERT INTO questions (id, technology_id, topic_id, difficulty, question_type, source_kind, prompt, canonical_answer, expected_concepts, follow_ups, review_status, publish_status, version, content_hash, last_reviewed_at, created_by, updated_by)
          SELECT ${question.id}, ${question.technology}, id, ${question.difficulty}, ${question.type}, ${question.sourceKind}, ${question.question}, ${question.canonicalAnswer}, ${JSON.stringify(question.expectedConcepts)}::jsonb, ${JSON.stringify(question.followUps)}::jsonb, ${question.benchmarkReviewStatus}, ${question.publishStatus}, ${question.questionVersion}, ${question.contentHash}, ${toTimestamp(benchmark.review.reviewedAt)}::timestamptz, ${actor}, ${actor}
          FROM topics WHERE technology_id=${question.technology} AND slug=${question.topic}
          ON CONFLICT (id) DO UPDATE SET technology_id=EXCLUDED.technology_id, topic_id=EXCLUDED.topic_id, difficulty=EXCLUDED.difficulty, question_type=EXCLUDED.question_type, source_kind=EXCLUDED.source_kind, prompt=EXCLUDED.prompt, canonical_answer=EXCLUDED.canonical_answer, expected_concepts=EXCLUDED.expected_concepts, follow_ups=EXCLUDED.follow_ups, review_status=EXCLUDED.review_status, publish_status=EXCLUDED.publish_status, version=EXCLUDED.version, content_hash=EXCLUDED.content_hash, last_reviewed_at=EXCLUDED.last_reviewed_at, updated_at=now(), updated_by=EXCLUDED.updated_by`,
      sql`INSERT INTO benchmark_answers (question_id, benchmark_version, canonical_answer, expanded_explanation, required_concepts, optional_concepts, accepted_alternatives, incorrect_claims, reasoning, scoring_anchors, review_status, last_reviewed_at, created_by, updated_by)
          VALUES (${question.id}, ${benchmark.version}, ${benchmark.canonicalAnswer}, ${benchmark.expandedExplanation}, ${JSON.stringify(benchmark.requiredConcepts)}::jsonb, ${JSON.stringify(benchmark.optionalConcepts)}::jsonb, ${JSON.stringify(benchmark.acceptedAlternatives)}::jsonb, ${JSON.stringify(benchmark.incorrectClaims)}::jsonb, ${benchmark.reasoning}, ${JSON.stringify(benchmark.scoringAnchors)}::jsonb, ${benchmark.review.status}, ${toTimestamp(benchmark.review.reviewedAt)}::timestamptz, ${actor}, ${actor})
          ON CONFLICT (question_id, benchmark_version) DO UPDATE SET canonical_answer=EXCLUDED.canonical_answer, expanded_explanation=EXCLUDED.expanded_explanation, required_concepts=EXCLUDED.required_concepts, optional_concepts=EXCLUDED.optional_concepts, accepted_alternatives=EXCLUDED.accepted_alternatives, incorrect_claims=EXCLUDED.incorrect_claims, reasoning=EXCLUDED.reasoning, scoring_anchors=EXCLUDED.scoring_anchors, review_status=EXCLUDED.review_status, last_reviewed_at=EXCLUDED.last_reviewed_at, updated_at=now(), updated_by=EXCLUDED.updated_by`,
      sql`INSERT INTO question_versions (question_id, version, benchmark_version, content_hash, snapshot, change_summary, created_by)
          VALUES (${question.id}, ${question.questionVersion}, ${benchmark.version}, ${question.contentHash}, ${JSON.stringify(question)}::jsonb - 'sourceKind' - 'sourcePack' - 'questionVersion' - 'contentHash' - 'benchmarkReviewStatus' - 'publishStatus', ${`Imported from ${question.sourcePack}`}, ${actor})
          ON CONFLICT (question_id, version) DO NOTHING`,
    );
  }
  for (const item of evidence) {
    operations.push(sql`INSERT INTO evidence_sources (technology_id, url, title, section, category, document_version, content_hash, is_official, retrieved_at, last_checked_at, created_by, updated_by)
      VALUES (${item.technologyId}, ${item.url}, ${item.title}, ${item.section}, ${item.category}, ${item.documentVersion ?? null}, ${item.contentHash}, ${item.isOfficial}, ${toTimestamp(item.retrievedAt)}::timestamptz, ${toTimestamp(item.retrievedAt)}::timestamptz, ${actor}, ${actor})
      ON CONFLICT (technology_id, url, content_hash) DO UPDATE SET title=EXCLUDED.title, section=EXCLUDED.section, category=EXCLUDED.category, document_version=EXCLUDED.document_version, is_official=EXCLUDED.is_official, last_checked_at=EXCLUDED.last_checked_at, updated_at=now(), updated_by=EXCLUDED.updated_by`);
  }
  for (const link of links) {
    const item = model.evidence.find((candidate) => candidate.key === link.evidenceKey);
    operations.push(sql`INSERT INTO question_evidence_links (question_id, benchmark_answer_id, evidence_source_id, is_primary, created_by)
      SELECT ${link.questionId}, benchmark.id, evidence.id, ${item.url === questions.find((question) => question.id === link.questionId)?.source.url}, ${actor}
      FROM benchmark_answers benchmark, evidence_sources evidence
      WHERE benchmark.question_id=${link.questionId} AND benchmark.benchmark_version=${link.benchmarkVersion}
        AND evidence.technology_id=${item.technologyId} AND evidence.url=${item.url} AND evidence.content_hash=${item.contentHash}
      ON CONFLICT (benchmark_answer_id, evidence_source_id) DO NOTHING`);
  }
  for (const review of reviews) {
    operations.push(sql`INSERT INTO question_reviews (review_key, question_id, benchmark_answer_id, review_kind, status, provider, model, prompt_version, reviewer_user_id, verdict, confidence, findings, corrections, input_hash, reviewed_at, created_by)
      SELECT ${review.reviewKey}, ${review.questionId}, id, ${review.reviewKind}, ${review.status}, ${review.provider}, ${review.model}, ${review.promptVersion}, ${review.reviewerUserId}, ${review.verdict}, ${review.confidence}, ${JSON.stringify(review.verdicts ?? [])}::jsonb, ${JSON.stringify(review.corrections ?? [])}::jsonb, ${review.inputHash}, ${toTimestamp(review.reviewedAt) ?? new Date(0).toISOString()}::timestamptz, ${actor}
      FROM benchmark_answers WHERE question_id=${review.questionId} AND benchmark_version=${review.benchmarkVersion}
      ON CONFLICT (review_key) DO NOTHING`);
  }

  for (let index = 0; index < operations.length; index += 150) {
    await sql.transaction(operations.slice(index, index + 150));
  }
}

export async function applyImportModel(model, databaseUrl) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(databaseUrl);
  for (const technology of model.technologies.map((item) => item.id)) {
    await applyTechnology(sql, model, technology);
  }
  return reconcileDatabase(sql, model);
}

export async function reconcileDatabase(sql, model) {
  const expected = model.summary;
  const technologyIds = model.technologies.map((item) => item.id);
  const [counts] = await sql`
    WITH selected_technologies AS (
      SELECT value AS id FROM jsonb_array_elements_text(${JSON.stringify(technologyIds)}::jsonb)
    )
    SELECT
      (SELECT count(*)::int FROM technologies WHERE id IN (SELECT id FROM selected_technologies)) AS technologies,
      (SELECT count(*)::int FROM topics WHERE technology_id IN (SELECT id FROM selected_technologies)) AS topics,
      (SELECT count(*)::int FROM questions WHERE technology_id IN (SELECT id FROM selected_technologies)) AS questions,
      (SELECT count(*)::int FROM benchmark_answers b JOIN questions q ON q.id=b.question_id WHERE q.technology_id IN (SELECT id FROM selected_technologies)) AS benchmark_answers,
      (SELECT count(*)::int FROM evidence_sources WHERE technology_id IN (SELECT id FROM selected_technologies)) AS evidence_sources,
      (SELECT count(*)::int FROM question_evidence_links l JOIN questions q ON q.id=l.question_id WHERE q.technology_id IN (SELECT id FROM selected_technologies)) AS evidence_links,
      (SELECT count(*)::int FROM question_reviews r JOIN questions q ON q.id=r.question_id WHERE q.technology_id IN (SELECT id FROM selected_technologies)) AS reviews,
      (SELECT count(*)::int FROM question_versions v JOIN questions q ON q.id=v.question_id WHERE q.technology_id IN (SELECT id FROM selected_technologies)) AS question_versions
  `;
  const actual = {
    technologies: counts.technologies,
    topics: counts.topics,
    questions: counts.questions,
    benchmarkAnswers: counts.benchmark_answers,
    evidenceSources: counts.evidence_sources,
    evidenceLinks: counts.evidence_links,
    reviews: counts.reviews,
    questionVersions: counts.question_versions,
  };
  const mismatches = Object.keys(actual).filter((key) => actual[key] !== expected[key]);
  return { expected, actual, matches: mismatches.length === 0, mismatches };
}
