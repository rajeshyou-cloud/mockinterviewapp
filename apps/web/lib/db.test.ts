import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const dbMocks = vi.hoisted(() => {
  const sql = vi.fn(() => Promise.resolve([])) as ReturnType<typeof vi.fn> & {
    transaction: ReturnType<typeof vi.fn>;
  };
  sql.transaction = vi.fn(() => Promise.resolve([]));
  return { neon: vi.fn(() => sql), sql };
});

vi.mock('@neondatabase/serverless', () => ({ neon: dbMocks.neon }));

import { deleteManagedAccountData, isDatabaseConfigured } from './db';

const original = process.env.DATABASE_URL;

afterEach(() => {
  vi.clearAllMocks();
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

  it('deletes application data before the managed-auth identity in one transaction', async () => {
    process.env.DATABASE_URL = 'postgresql://example.invalid/database';

    await expect(deleteManagedAccountData('user-123')).resolves.toBe(true);

    expect(dbMocks.sql.transaction).toHaveBeenCalledOnce();
    const statements = dbMocks.sql.mock.calls.map(([parts]) => String(parts[0]));
    expect(statements).toHaveLength(6);
    expect(statements[0]).toContain('course_pack_reviews');
    expect(statements[4]).toContain('interview_sessions');
    expect(statements[5]).toContain('neon_auth.user');
  });
});
