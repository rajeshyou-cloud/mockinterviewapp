import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimateReviewCost,
  normalizeUsage,
  shouldRetryStatus,
  summarizeReviews,
  validateCompatibleBaseUrl,
} from './review-runtime.mjs';

test('normalizes common provider usage shapes', () => {
  assert.deepEqual(normalizeUsage({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 }), {
    inputTokens: 10, outputTokens: 4, totalTokens: 14,
  });
  assert.deepEqual(normalizeUsage({ promptTokenCount: 8, candidatesTokenCount: 2, totalTokenCount: 10 }), {
    inputTokens: 8, outputTokens: 2, totalTokens: 10,
  });
});

test('calculates role-specific estimated cost without inventing configured rates', () => {
  const cost = estimateReviewCost({ inputTokens: 1_000_000, outputTokens: 500_000 }, 'primary', {
    REVIEW_PRIMARY_INPUT_USD_PER_MILLION_TOKENS: '0.10',
    REVIEW_PRIMARY_OUTPUT_USD_PER_MILLION_TOKENS: '0.20',
  });
  assert.equal(cost.estimatedUsd, 0.2);
  assert.equal(cost.ratesConfigured, true);
});

test('compatible endpoints require HTTPS except localhost', () => {
  assert.equal(validateCompatibleBaseUrl('https://api.example.com/v1/'), 'https://api.example.com/v1');
  assert.equal(validateCompatibleBaseUrl('http://localhost:11434/v1'), 'http://localhost:11434/v1');
  assert.throws(() => validateCompatibleBaseUrl('http://api.example.com/v1'), /must use HTTPS/);
});

test('retry policy is limited to transient statuses', () => {
  assert.equal(shouldRetryStatus(429), true);
  assert.equal(shouldRetryStatus(503), true);
  assert.equal(shouldRetryStatus(400), false);
});

test('summarizes statuses, tokens, and estimated batch cost', () => {
  const result = summarizeReviews([
    { finalStatus: 'ai-evidence-verified', usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }, cost: { estimatedUsd: 0.01, ratesConfigured: true } },
    { finalStatus: 'disputed', usage: { inputTokens: 8, outputTokens: 2, totalTokens: 10 }, cost: { estimatedUsd: 0.02, ratesConfigured: true } },
  ]);
  assert.deepEqual(result.statuses, { 'ai-evidence-verified': 1, disputed: 1 });
  assert.equal(result.usage.totalTokens, 25);
  assert.equal(result.cost.estimatedUsd, 0.03);
});
