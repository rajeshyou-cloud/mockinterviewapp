export type ScoringInput = {
  answer: string;
  expectedConcepts: string[];
  canonicalAnswer?: string;
  question?: string;
};

export type ScoringResult = {
  score: number;
  matched_concepts: string[];
  missing_concepts: string[];
  summary: string;
  provider: string;
};

export interface ScoringProvider {
  name: string;
  score(input: ScoringInput): Promise<ScoringResult>;
}

export class DeterministicScoringProvider implements ScoringProvider {
  name = 'deterministic-keyword';

  async score(input: ScoringInput): Promise<ScoringResult> {
    const answer = input.answer.trim().toLowerCase();
    const expected = input.expectedConcepts;
    const matched = expected.filter((concept) => answer.includes(concept.toLowerCase()));
    const missing = expected.filter((concept) => !matched.includes(concept));
    const score = expected.length ? Math.round((matched.length / expected.length) * 100) : 0;

    const summary = score >= 70
      ? 'Strong coverage of the expected concepts.'
      : score >= 40
        ? 'Partial coverage. Add the missing concepts and explain the trade-offs.'
        : 'The answer needs more technical depth against this baseline rubric.';

    return {
      score,
      matched_concepts: matched,
      missing_concepts: missing,
      summary,
      provider: this.name,
    };
  }
}

export function createScoringProvider(): ScoringProvider {
  // Future semantic/LLM providers plug in here without changing the route or UI contract.
  return new DeterministicScoringProvider();
}
