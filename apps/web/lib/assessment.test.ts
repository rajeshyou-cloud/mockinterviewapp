import { describe, expect, it } from 'vitest';

import type { InterviewQuestion, QuestionBenchmark } from './api';
import { buildAssessmentSummary } from './assessment';
import type { InterviewSession } from './session';

function benchmark(concepts: string[]): QuestionBenchmark {
  return {
    version: '1.0.0',
    canonicalAnswer: 'A benchmark answer for the fixture question.',
    expandedExplanation: 'A benchmark answer for the fixture question with enough explanation for scoring.',
    requiredConcepts: concepts,
    optionalConcepts: ['trade-offs'],
    acceptedAlternatives: concepts.map((concept) => ({ terms: [concept], meaning: concept })),
    incorrectClaims: [],
    reasoning: 'A strong answer explains the concept and validates the result.',
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
      status: 'draft',
      promptVersion: 'benchmark-policy-1.0.0',
      reviewerModels: [],
      verdicts: [],
      confidence: null,
      corrections: [],
      reviewedAt: null,
    },
  };
}

const questions: InterviewQuestion[] = [
  {
    id: 'q1', technology: 'snowflake', topic: 'architecture', difficulty: 'intermediate', type: 'conceptual',
    question: 'q1', canonicalAnswer: 'a', expectedConcepts: ['storage'], followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' }, benchmark: benchmark(['storage']), reviewStatus: 'ai-reviewed', version: 1,
  },
  {
    id: 'q2', technology: 'snowflake', topic: 'architecture', difficulty: 'intermediate', type: 'scenario',
    question: 'q2', canonicalAnswer: 'a', expectedConcepts: ['warehouse'], followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' }, benchmark: benchmark(['warehouse']), reviewStatus: 'ai-reviewed', version: 1,
  },
  {
    id: 'q3', technology: 'snowflake', topic: 'security', difficulty: 'intermediate', type: 'scenario',
    question: 'q3', canonicalAnswer: 'a', expectedConcepts: ['role'], followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' }, benchmark: benchmark(['role']), reviewStatus: 'ai-reviewed', version: 1,
  },
];

const session: InterviewSession = {
  id: 'session-1', resumeToken: 'a'.repeat(64), technology: 'snowflake', difficulty: 'intermediate', currentIndex: 2, status: 'completed',
  startedAt: '2026-08-23T10:00:00Z', completedAt: '2026-08-23T10:10:00Z',
  answers: [
    { questionId: 'q1', answer: 'x', answeredAt: '2026-08-23T10:01:00Z', score: { score: 80, matched_concepts: ['storage'], missing_concepts: [], summary: 'ok' } },
    { questionId: 'q2', answer: 'x', answeredAt: '2026-08-23T10:02:00Z', score: { score: 60, matched_concepts: [], missing_concepts: ['warehouse'], summary: 'partial' } },
    { questionId: 'q3', answer: 'x', answeredAt: '2026-08-23T10:03:00Z', score: { score: 20, matched_concepts: [], missing_concepts: ['role'], summary: 'gap' } },
  ],
};

describe('buildAssessmentSummary', () => {
  it('calculates overall and topic-level scores', () => {
    const summary = buildAssessmentSummary(questions, session);

    expect(summary.averageScore).toBe(53);
    expect(summary.answered).toBe(3);
    expect(summary.total).toBe(3);
    expect(summary.topics.find((topic) => topic.topic === 'architecture')?.averageScore).toBe(70);
    expect(summary.topics.find((topic) => topic.topic === 'architecture')?.status).toBe('strong');
    expect(summary.topics.find((topic) => topic.topic === 'security')?.status).toBe('gap');
    expect(summary.gapTopics[0]?.topic).toBe('security');
  });
});
