import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const reportPath = args.find((arg) => arg.startsWith('--report='))?.split('=')[1] ?? 'apps/web/data/evidence-link-health/latest.json';
const actor = args.find((arg) => arg.startsWith('--actor='))?.split('=')[1] ?? 'evidence-freshness-automation';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. The command is dry-run unless --apply is explicit.');

const report = JSON.parse(await readFile(reportPath, 'utf8'));
if (report.summary?.mode !== 'live' || report.summary?.hashContent !== true) {
  throw new Error('Freshness application requires a live evidence report created with --hash-content.');
}
const healthy = (report.entries ?? []).filter((entry) => entry.state === 'healthy' && /^[a-f0-9]{64}$/.test(entry.contentHash ?? ''));
const sql = neon(process.env.DATABASE_URL);
const urls = healthy.map((entry) => entry.url);
const existing = urls.length ? await sql`
  WITH checked AS (SELECT value AS url FROM jsonb_array_elements_text(${JSON.stringify(urls)}::jsonb))
  SELECT source.id, source.url, source.content_hash, source.technology_id,
    count(DISTINCT link.question_id)::int AS linked_questions
  FROM evidence_sources source JOIN checked ON checked.url=source.url
  LEFT JOIN question_evidence_links link ON link.evidence_source_id=source.id
  GROUP BY source.id ORDER BY source.technology_id, source.url
` : [];
const hashByUrl = new Map(healthy.map((entry) => [entry.url, `sha256:${entry.contentHash}`]));
const changed = existing.filter((source) => source.content_hash !== hashByUrl.get(String(source.url)));

if (apply) {
  for (const source of changed) {
    const newHash = hashByUrl.get(String(source.url));
    await sql`
      WITH original AS (
        SELECT * FROM evidence_sources WHERE id=${source.id}::uuid FOR UPDATE
      ), replacement AS (
        INSERT INTO evidence_sources (technology_id, url, title, section, category, document_version, content_hash,
          is_official, retrieved_at, last_checked_at, created_by, updated_by)
        SELECT technology_id, url, title, section, category, document_version, ${newHash}, is_official, now(), now(), ${actor}, ${actor}
        FROM original ON CONFLICT (technology_id, url, content_hash) DO UPDATE SET last_checked_at=now(), updated_at=now(), updated_by=${actor}
        RETURNING id
      ), affected AS (
        SELECT link.* FROM question_evidence_links link JOIN original ON original.id=link.evidence_source_id
      ), relink AS (
        INSERT INTO question_evidence_links (question_id, benchmark_answer_id, evidence_source_id, claim_scope, is_primary, created_by)
        SELECT affected.question_id, affected.benchmark_answer_id, replacement.id, affected.claim_scope, affected.is_primary, ${actor}
        FROM affected CROSS JOIN replacement ON CONFLICT DO NOTHING
      ), audit AS (
        INSERT INTO question_reviews (review_key, question_id, benchmark_answer_id, review_kind, status, prompt_version,
          verdict, findings, corrections, input_hash, created_by)
        SELECT 'freshness:' || affected.question_id || ':' || replace(${newHash}, 'sha256:', ''), affected.question_id,
          affected.benchmark_answer_id, 'static', 'stale', 'evidence-freshness-1.0.0', 'evidence-content-changed',
          jsonb_build_array(jsonb_build_object('url', (SELECT url FROM original), 'previousHash', (SELECT content_hash FROM original), 'newHash', ${newHash})),
          '["Re-review every affected benchmark against the updated official evidence."]'::jsonb, ${newHash}, ${actor}
        FROM affected ON CONFLICT (review_key) DO NOTHING
      ), stale_answers AS (
        UPDATE benchmark_answers answer SET review_status='stale', updated_at=now(), updated_by=${actor}
        WHERE answer.id IN (SELECT benchmark_answer_id FROM affected) RETURNING answer.question_id
      ), stale_questions AS (
        UPDATE questions question SET review_status='stale', publish_status='unpublished', updated_at=now(), updated_by=${actor}
        WHERE question.id IN (SELECT question_id FROM stale_answers) RETURNING question.id
      )
      UPDATE evidence_sources SET stale_at=now(), last_checked_at=now(), updated_at=now(), updated_by=${actor}
      WHERE id=(SELECT id FROM original)
    `;
  }
  const unchanged = existing.filter((source) => source.content_hash === hashByUrl.get(String(source.url))).map((source) => source.id);
  if (unchanged.length) await sql`
    UPDATE evidence_sources SET last_checked_at=now(), updated_at=now(), updated_by=${actor}
    WHERE id IN (SELECT value::uuid FROM jsonb_array_elements_text(${JSON.stringify(unchanged)}::jsonb))
  `;
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run', reportPath, reportCheckedAt: report.summary.checkedAt,
  healthyUrls: healthy.length, matchedEvidenceVersions: existing.length, changedEvidenceVersions: changed.length,
  affectedQuestionLinks: changed.reduce((sum, source) => sum + Number(source.linked_questions), 0),
  action: apply ? 'Changed evidence versions were preserved, relinked, audited, and affected questions failed closed as stale.' : 'No database writes. Re-run with --apply after reviewing this summary.',
}, null, 2));
