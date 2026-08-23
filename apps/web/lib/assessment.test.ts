import { describe, expect, it } from 'vitest';

import type { InterviewQuestion } from './api';
import { buildAssessmentSummary } from './assessment';
import type { InterviewSession } from './session';

const questions: InterviewQuestion[] = [
  {
    id: 'q1', technology: 'snowflake', topic: 'architecture', difficulty: 'intermediate', type: 'conceptual',
    question: 'q1', canonicalAnswer: 'a', expectedConcepts: ['storage'], followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' }, reviewStatus: 'ai-reviewed', version: 1,
  },
  {
    id: 'q2', technology: 'snowflake', topic: 'architecture', difficulty: 'intermediate', type: 'scenario',
    question: 'q2', canonicalAnswer: 'a', expectedConcepts: ['warehouse'], followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' }, reviewStatus: 'ai-reviewed', version: 1,
  },
  {
    id: 'q3', technology: 'snowflake', topic: 'security', difficulty: 'intermediate', type: 'scenario',
    question: 'q3', canonicalAnswer: 'a', expectedConcepts: ['role'], followUps: [],
    source: { title: 'source', url: 'https://example.com', verified: '2026-08-23' }, reviewStatus: 'ai-reviewed', version: 1,
  },
];

const session: InterviewSession = {
  id: 'session-1', technology: 'snowflake', difficulty: 'intermediate', currentIndex: 2, status: 'completed',
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
