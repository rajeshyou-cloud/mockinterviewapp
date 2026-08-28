import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('./migrations/20260827_01_governed_content.sql', import.meta.url),
  'utf8',
);
const marker = '-- Governed content platform (Phase 1).';
const governedSchema = schema.slice(schema.indexOf(marker)).trim();
const governedMigration = migration
  .slice(migration.indexOf(marker))
  .replace(/\s+COMMIT;\s*$/, '')
  .trim();

const governedTables = [
  'technologies',
  'topics',
  'questions',
  'benchmark_answers',
  'evidence_sources',
  'question_evidence_links',
  'question_reviews',
  'question_versions',
  'publication_batches',
  'publication_batch_decisions',
  'publication_batch_items',
];

test('bootstrap schema and migration keep identical governed-content definitions', () => {
  assert.ok(schema.includes(marker), 'bootstrap schema is missing the governed-content marker');
  assert.ok(migration.includes('BEGIN;'));
  assert.ok(migration.includes('COMMIT;'));
  assert.equal(governedMigration, governedSchema);
});

test('governed schema defines every lifecycle entity additively', () => {
  for (const table of governedTables) {
    assert.match(governedSchema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
  }

  assert.doesNotMatch(governedSchema, /\b(?:DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(migration, /^\\/m, 'migration must run through standard SQL clients');
  assert.doesNotMatch(migration, /^\s*--.*;/m, 'migration comments must not contain statement delimiters');
});

test('candidate publication is constrained to verified, versioned content', () => {
  assert.match(
    governedSchema,
    /publish_status <> 'published' OR review_status IN \('ai-evidence-verified', 'human-verified'\)/,
  );
  assert.match(
    governedSchema,
    /review_status_at_add IN \('ai-evidence-verified', 'human-verified'\)/,
  );
  assert.match(
    governedSchema,
    /FOREIGN KEY \(question_id, question_version\)[\s\S]*REFERENCES question_versions\(question_id, version\)/,
  );
  assert.match(
    governedSchema,
    /FOREIGN KEY \(question_id, benchmark_version\)[\s\S]*REFERENCES benchmark_answers\(question_id, benchmark_version\)/,
  );
});

test('review and publication decisions retain required audit metadata', () => {
  assert.match(
    governedSchema,
    /review_kind <> 'ai' OR \(provider IS NOT NULL AND model IS NOT NULL\)/,
  );
  assert.match(governedSchema, /review_key text NOT NULL UNIQUE/);
  assert.match(
    governedSchema,
    /CREATE TABLE IF NOT EXISTS publication_batch_decisions[\s\S]*decided_by text NOT NULL/,
  );
  assert.match(governedSchema, /content_hash text NOT NULL CHECK \(content_hash ~ '\^sha256:/);
  assert.match(governedSchema, /id text PRIMARY KEY,[\s\S]*CREATE TABLE IF NOT EXISTS topics/);
});
