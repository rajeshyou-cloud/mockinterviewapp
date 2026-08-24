import { describe, expect, it } from 'vitest';

import type { InterviewQuestion, QuestionBenchmark } from './api';
import { isBenchmarkVerified, summarizeBenchmarkReviews } from './benchmark-review';

function benchmark(status: QuestionBenchmark['review']['status']): QuestionBenchmark {
  return {
    version: '1.0.0',
    canonicalAnswer: 'A benchmark answer for this test.',
    expandedExplanation: 'A benchmark answer for this test with enough detail for scoring.',
    requiredConcepts: ['storage'],
    optionalConcepts: ['trade-offs'],
    acceptedAlternatives: [{ terms: ['storage'], meaning: 'storage' }],
    incorrectClaims: [],
    reasoning: 'A strong answer explains and validates the concept.',
    evidence: [{
      url: 'https://example.com',
      title: 'source',
      section: 'source',
      retrievedAt: '2026-08-23',
      contentHash: `sha256:${'a'.repeat(64)}`,
    }],
    scoringAnchors: {
      strong: 'Covers all required concepts with accurate practical reasoning.',
      partial: 'Covers some required concepts but misses important detail.',
      weak: 'Mentions the topic superficially with major gaps.',
      incorrect: 'Does not answer the question or contradicts the benchmark.',
    },
    review: {
      status,
      promptVersion: 'benchmark-policy-1.0.0',
      reviewerModels: [],
      verdicts: [],
      confidence: null,
      corrections: [],
      reviewedAt: null,
    },
  };
}

function question(status: QuestionBenchmark['review']['status']): InterviewQuestion {
  return {
    id: `q-${status}`,
    technology: 'snowflake',
    topic: 'architecture',
    difficulty: 'beginner',
    type: 'conceptual',
    question: 'What is the test question?',
    canonicalAnswer: 'A benchmark answer for this test.',
    expectedConcepts: ['storage'],
    followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' },
    benchmark: benchmark(status),
    reviewStatus: 'ai-reviewed',
    version: 1,
  };
}

describe('benchmark review publication gates', () => {
  it('treats only evidence-verified or human-verified benchmarks as publishable', () => {
    expect(isBenchmarkVerified(benchmark('ai-evidence-verified'))).toBe(true);
    expect(isBenchmarkVerified(benchmark('human-verified'))).toBe(true);
    expect(isBenchmarkVerified(benchmark('draft'))).toBe(false);
    expect(isBenchmarkVerified(benchmark('disputed'))).toBe(false);
  });

  it('blocks pack publication until every benchmark is verified', () => {
    const blocked = summarizeBenchmarkReviews([question('ai-evidence-verified'), question('draft')]);
    const ready = summarizeBenchmarkReviews([question('ai-evidence-verified'), question('human-verified')]);

    expect(blocked).toMatchObject({ total: 2, verified: 1, draft: 1, publishable: false });
    expect(ready).toMatchObject({ total: 2, verified: 2, publishable: true });
  });
});
