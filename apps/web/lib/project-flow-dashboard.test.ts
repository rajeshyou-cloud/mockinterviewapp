import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(), neon: vi.fn() }));
mocks.neon.mockReturnValue(mocks.sql);
vi.mock('@neondatabase/serverless', () => ({ neon: mocks.neon }));

import { getProjectFlowDashboard } from './project-flow-dashboard';

const original = process.env.DATABASE_URL;
afterEach(() => {
  mocks.sql.mockReset();
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
});

describe('stakeholder project-flow read model', () => {
  it('provides a truthful transition snapshot before the governed database is available', async () => {
    delete process.env.DATABASE_URL;
    const result = await getProjectFlowDashboard();
    expect(result.source).toBe('json-transition');
    expect(result.totals.questions).toBe(1050);
    expect(result.totals.legacyReleased).toBe(300);
    expect(result.lifecycle.find((stage) => stage.key === 'published')?.count).toBe(0);
    expect(result.statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'draft', count: 200 }),
      expect.objectContaining({ status: 'ai-evidence-verified', count: 850 }),
    ]));
  });

  it('fails back to transition data when the governed schema is not yet migrated', async () => {
    process.env.DATABASE_URL = 'postgresql://example.invalid/database';
    mocks.sql.mockRejectedValue(new Error('relation questions does not exist'));
    const result = await getProjectFlowDashboard();
    expect(result.source).toBe('json-transition');
    expect(result.totals.publicationBatches).toBe(0);
  });
});
