import { describe, expect, it } from 'vitest';

import { DeterministicScoringProvider } from './scoring';

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
