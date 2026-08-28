import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildImportModel,
  contentHash,
  loadContentPacks,
  stableStringify,
} from './governed-content-import.mjs';

const records = await loadContentPacks();

test('normalizes all JSON packs without changing stable identity or review truth', () => {
  const model = buildImportModel(records);
  assert.equal(model.summary.technologies, 7);
  assert.equal(model.summary.questions, 1050);
  assert.equal(model.summary.benchmarkAnswers, 1050);
  assert.equal(model.summary.questionVersions, 1050);
  assert.deepEqual(model.summary.byReviewStatus, {
    draft: 707,
    'ai-evidence-verified': 343,
  });
  assert.equal(new Set(model.questions.map((question) => question.id)).size, 1050);

  const source = records.find(({ question }) => question.id === 'snowflake-basics-001').question;
  const imported = model.questions.find((question) => question.id === source.id);
  assert.equal(imported.reviewStatus, source.reviewStatus);
  assert.equal(imported.benchmarkReviewStatus, source.benchmark.review.status);
});

test('publishes only verified questions from released packs', () => {
  const model = buildImportModel(records);
  const published = model.questions.filter((question) => question.publishStatus === 'published');
  assert.equal(published.length, 153);
  assert.ok(published.every((question) => question.sourceKind === 'released'));
  assert.ok(published.every((question) => ['ai-evidence-verified', 'human-verified'].includes(question.benchmarkReviewStatus)));
  assert.ok(model.questions.filter((question) => question.sourceKind === 'candidate').every((question) => question.publishStatus === 'unpublished'));
});

test('creates deterministic content and review identities', () => {
  const first = buildImportModel(records);
  const second = buildImportModel(records);
  assert.equal(stableStringify(first.summary), stableStringify(second.summary));
  assert.deepEqual(first.questions.map((question) => question.contentHash), second.questions.map((question) => question.contentHash));
  assert.deepEqual(first.reviews.map((review) => review.reviewKey), second.reviews.map((review) => review.reviewKey));
  assert.equal(new Set(first.reviews.map((review) => review.reviewKey)).size, first.reviews.length);
  assert.match(contentHash({ b: 2, a: 1 }), /^sha256:[a-f0-9]{64}$/);
  assert.equal(contentHash({ b: 2, a: 1 }), contentHash({ a: 1, b: 2 }));
});

test('technology-scoped imports retain complete per-track counts', () => {
  const aws = buildImportModel(records, 'aws');
  assert.equal(aws.summary.technologies, 1);
  assert.equal(aws.summary.questions, 150);
  assert.equal(aws.summary.questionVersions, 150);
  assert.deepEqual(aws.summary.byTechnology, { aws: 150 });
});

test('rejects duplicate stable question IDs before database access', () => {
  assert.throws(
    () => buildImportModel([records[0], records[0]]),
    /Duplicate stable question ID/,
  );
});
