import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const score = vi.hoisted(() => vi.fn());
const released = vi.hoisted(() => ({ isReleasedTechnology: vi.fn() }));

vi.mock('../../../lib/scoring', () => ({
  createScoringProvider: () => ({ score }),
}));
vi.mock('../../../lib/released-courses', () => released);

import { POST } from './route';

function request(body: string) {
  return new NextRequest('http://localhost/api/score', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

describe('POST /api/score', () => {
  beforeEach(() => {
    score.mockReset();
    released.isReleasedTechnology.mockResolvedValue(true);
  });

  it('rejects malformed and incomplete requests', async () => {
    expect((await POST(request('{'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ answer: 'hello' })))).status).toBe(400);
  });

  it('rejects oversized candidate answers', async () => {
    const response = await POST(request(JSON.stringify({
      answer: 'x'.repeat(12_001),
      question_id: 'snowflake-architecture-001',
    })));

    expect(response.status).toBe(413);
    expect(score).not.toHaveBeenCalled();
  });

  it('does not accept a client-defined or unknown scoring rubric', async () => {
    const response = await POST(request(JSON.stringify({
      answer: 'An answer',
      question_id: 'not-in-the-reviewed-bank',
      expected_concepts: ['attacker controlled'],
    })));

    expect(response.status).toBe(404);
    expect(score).not.toHaveBeenCalled();
  });

  it('does not score a candidate-pack question before human approval', async () => {
    released.isReleasedTechnology.mockResolvedValue(false);
    const response = await POST(request(JSON.stringify({
      answer: 'A detailed answer',
      question_id: 'databricks-architecture-001',
    })));
    expect(response.status).toBe(404);
    expect(score).not.toHaveBeenCalled();
  });

  it('passes the full reviewed rubric to the selected provider', async () => {
    score.mockResolvedValue({
      score: 88,
      matched_concepts: ['storage'],
      missing_concepts: ['compute'],
      summary: 'Good architecture explanation with one missing scaling detail.',
      provider: 'ai-gateway:test/model',
    });

    const response = await POST(request(JSON.stringify({
      answer: 'Data remains persisted independently.',
      question_id: 'snowflake-architecture-001',
    })));

    expect(response.status).toBe(200);
    expect(score).toHaveBeenCalledWith({
      answer: 'Data remains persisted independently.',
      expectedConcepts: ['storage', 'compute', 'virtual warehouse', 'independent scaling', 'workload isolation'],
      canonicalAnswer: expect.stringContaining('centrally in cloud storage'),
      question: 'Explain how Snowflake separates storage and compute, and why that matters for workload isolation.',
    });
    expect((await response.json()).provider).toBe('ai-gateway:test/model');
  });
});
