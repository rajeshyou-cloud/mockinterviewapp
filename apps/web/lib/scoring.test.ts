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
    expect(result.dimension_scores).toEqual({
      technical_accuracy: 30,
      required_concept_coverage: 23,
      reasoning_and_tradeoffs: 15,
      relevance_and_clarity: 7,
    });
    expect(result.matched_concepts).toEqual(['storage', 'compute', 'virtual warehouse']);
    expect(result.missing_concepts).toEqual(['workload isolation']);
    expect(result.optional_concepts).toEqual([]);
    expect(result.incorrect_claims).toEqual([]);
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
      dimensionScores: {
        technicalAccuracy: 35,
        requiredConceptCoverage: 24,
        reasoningAndTradeoffs: 18,
        relevanceAndClarity: 10,
      },
      matchedConcepts: ['Storage', 'compute', 'invented concept'],
      optionalConcepts: ['workload trade-off', 'invented optional'],
      incorrectClaims: ['invented claim'],
      summary: 'Accurate explanation with a useful workload-isolation trade-off.',
    });
    const provider = new GatewaySemanticScoringProvider('test/model', evaluator);

    const result = await provider.score({
      answer: 'Compute can scale separately from persisted data.',
      expectedConcepts: ['storage', 'compute', 'workload isolation'],
      benchmark: {
        version: '1.0.0',
        canonicalAnswer: 'Storage and compute are independently scalable.',
        expandedExplanation: 'Storage and compute are independently scalable with workload isolation.',
        requiredConcepts: ['storage', 'compute', 'workload isolation'],
        optionalConcepts: ['workload trade-off'],
        acceptedAlternatives: [{ terms: ['storage'], meaning: 'storage' }],
        incorrectClaims: [{ claim: 'storage and compute are the same layer', severity: 'major', reason: 'Contradicts independent scaling.' }],
        reasoning: 'A strong answer explains isolation.',
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
      },
      canonicalAnswer: 'Storage and compute are independently scalable.',
      question: 'Explain the architecture.',
    });

    expect(result.score).toBe(87);
    expect(result.dimension_scores).toEqual({
      technical_accuracy: 35,
      required_concept_coverage: 24,
      reasoning_and_tradeoffs: 18,
      relevance_and_clarity: 10,
    });
    expect(result.matched_concepts).toEqual(['storage', 'compute']);
    expect(result.missing_concepts).toEqual(['workload isolation']);
    expect(result.optional_concepts).toEqual(['workload trade-off']);
    expect(result.incorrect_claims).toEqual([]);
    expect(result.provider).toBe('ai-gateway:test/model');
  });
});

describe('ResilientScoringProvider', () => {
  it('falls back without exposing provider errors or losing feedback', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const primary = { name: 'semantic', score: vi.fn().mockRejectedValue(new Error('provider unavailable')) };
    const fallback = new DeterministicScoringProvider();
    const provider = new ResilientScoringProvider(primary, fallback);

    const result = await provider.score({ answer: 'storage and compute', expectedConcepts: ['storage', 'compute'] });

    expect(result.score).toBe(100);
    expect(result.provider).toBe('semantic->deterministic-keyword');
    expect(log).toHaveBeenCalledWith(
      'Semantic scoring provider failed; using deterministic fallback.',
      { name: 'Error', statusCode: undefined, message: 'provider unavailable' },
    );
    log.mockRestore();
  });

  it('selects deterministic mode locally and semantic mode on Vercel', () => {
    expect(createScoringProvider({}).name).toBe('deterministic-keyword');
    expect(createScoringProvider({ VERCEL: '1' }).name).toContain('ai-gateway:openai/gpt-5.6-luna');
    expect(createScoringProvider({ VERCEL: '1', SCORING_PROVIDER: 'deterministic' }).name).toBe('deterministic-keyword');
  });
});
