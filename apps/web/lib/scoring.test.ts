import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DeterministicScoringProvider,
  GatewaySemanticScoringProvider,
  ResilientScoringProvider,
  createScoringProvider,
} from './scoring';

describe('DeterministicScoringProvider', () => {
  it('scores matched concepts and reports missing concepts', async () => {
    const provider = new DeterministicScoringProvider();
    const result = await provider.score({
      answer: 'Snowflake separates storage and compute with a virtual warehouse.',
      expectedConcepts: ['storage', 'compute', 'virtual warehouse', 'workload isolation'],
    });

    expect(result.score).toBe(75);
    expect(result.matched_concepts).toEqual(['storage', 'compute', 'virtual warehouse']);
    expect(result.missing_concepts).toEqual(['workload isolation']);
    expect(result.provider).toBe('deterministic-keyword');
  });

  it('returns zero when no expected concept is present', async () => {
    const provider = new DeterministicScoringProvider();
    const result = await provider.score({
      answer: 'I would investigate the problem first.',
      expectedConcepts: ['secure agent', 'runtime environment'],
    });

    expect(result.score).toBe(0);
    expect(result.matched_concepts).toHaveLength(0);
  });
});

describe('GatewaySemanticScoringProvider', () => {
  it('uses semantic scores while limiting concept output to the reviewed rubric', async () => {
    const evaluator = vi.fn().mockResolvedValue({
      score: 86.6,
      matchedConcepts: ['Storage', 'compute', 'invented concept'],
      summary: 'Accurate explanation with a useful workload-isolation trade-off.',
    });
    const provider = new GatewaySemanticScoringProvider('test/model', evaluator);

    const result = await provider.score({
      answer: 'Compute can scale separately from persisted data.',
      expectedConcepts: ['storage', 'compute', 'workload isolation'],
      canonicalAnswer: 'Storage and compute are independently scalable.',
      question: 'Explain the architecture.',
    });

    expect(result.score).toBe(87);
    expect(result.matched_concepts).toEqual(['storage', 'compute']);
    expect(result.missing_concepts).toEqual(['workload isolation']);
    expect(result.provider).toBe('ai-gateway:test/model');
  });
});

describe('ResilientScoringProvider', () => {
  it('falls back without exposing provider errors or losing feedback', async () => {
    const primary = { name: 'semantic', score: vi.fn().mockRejectedValue(new Error('provider unavailable')) };
    const fallback = new DeterministicScoringProvider();
    const provider = new ResilientScoringProvider(primary, fallback);

    const result = await provider.score({ answer: 'storage and compute', expectedConcepts: ['storage', 'compute'] });

    expect(result.score).toBe(100);
    expect(result.provider).toBe('semantic->deterministic-keyword');
  });

  it('selects deterministic mode locally and semantic mode on Vercel', () => {
    expect(createScoringProvider({}).name).toBe('deterministic-keyword');
    expect(createScoringProvider({ VERCEL: '1' }).name).toContain('ai-gateway:openai/gpt-5.6-luna');
    expect(createScoringProvider({ VERCEL: '1', SCORING_PROVIDER: 'deterministic' }).name).toBe('deterministic-keyword');
  });
});
