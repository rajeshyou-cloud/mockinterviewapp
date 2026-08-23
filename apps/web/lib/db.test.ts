import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isDatabaseConfigured } from './db';

const original = process.env.DATABASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
});

describe('database configuration', () => {
  it('reports cloud persistence disabled without DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(isDatabaseConfigured()).toBe(false);
  });

  it('reports cloud persistence enabled when DATABASE_URL is present', () => {
    process.env.DATABASE_URL = 'postgresql://example.invalid/database';
    expect(isDatabaseConfigured()).toBe(true);
  });
});
