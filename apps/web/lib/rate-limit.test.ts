import { describe, expect, it } from 'vitest';

import { checkScoringRateLimit } from './rate-limit';

describe('scoring rate limit', () => {
  it('limits repeated scoring attempts and resets after the window', () => {
    const identity = `test-${crypto.randomUUID()}`;
    expect(checkScoringRateLimit(identity, 1_000, 2, 1_000).allowed).toBe(true);
    expect(checkScoringRateLimit(identity, 1_100, 2, 1_000).allowed).toBe(true);
    expect(checkScoringRateLimit(identity, 1_200, 2, 1_000)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(checkScoringRateLimit(identity, 2_001, 2, 1_000).allowed).toBe(true);
  });
});
