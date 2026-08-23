import { createHash } from 'node:crypto';

type Bucket = { count: number; resetsAt: number };

const globalStore = globalThis as typeof globalThis & { scoringRateLimits?: Map<string, Bucket> };
const buckets = globalStore.scoringRateLimits ?? new Map<string, Bucket>();
globalStore.scoringRateLimits = buckets;

export function checkScoringRateLimit(identity: string, now = Date.now(), limit = 20, windowMs = 60_000) {
  const key = createHash('sha256').update(identity).digest('hex');
  const current = buckets.get(key);

  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)) };
  }

  current.count += 1;
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetsAt <= now) buckets.delete(bucketKey);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
