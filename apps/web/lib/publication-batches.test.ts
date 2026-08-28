import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(), neon: vi.fn() }));
mocks.neon.mockReturnValue(mocks.sql);
vi.mock('@neondatabase/serverless', () => ({ neon: mocks.neon }));

import { createPublicationBatch, rollbackPublicationBatch, transitionPublicationBatch } from './publication-batches';

const original = process.env.DATABASE_URL;
const text = (parts: TemplateStringsArray) => Array.from(parts).join('?');

beforeEach(() => {
  process.env.DATABASE_URL = 'postgresql://example.invalid/database';
  mocks.sql.mockReset();
});
afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
});

describe('publication batch gates', () => {
  it('freezes only complete verified selections with evidence and records creation', async () => {
    mocks.sql.mockResolvedValue([{ id: 'batch-id', status: 'draft', item_count: 2 }]);
    await createPublicationBatch({ technologyId: 'aws', name: 'AWS Foundations', version: '1.0.0', releaseNotes: 'Initial verified release.', questionIds: ['q-1', 'q-2'], actor: 'reviewer' });
    const query = text(mocks.sql.mock.calls[0][0]);
    expect(query).toContain("review_status IN ('ai-evidence-verified', 'human-verified')");
    expect(query).toContain('question_evidence_links');
    expect(query).toContain('publication_batch_decisions');
  });

  it('blocks publishing beside another active batch and updates exact batch items', async () => {
    mocks.sql.mockResolvedValue([{ id: 'batch-id', status: 'published' }]);
    await transitionPublicationBatch({ id: '8c1eea25-a58d-4bb6-b8ec-4e15b739e83f', action: 'publish', actor: 'reviewer', reason: 'Launch checklist complete' });
    const query = text(mocks.sql.mock.calls[0][0]);
    expect(query).toContain("other.status='published'");
    expect(query).toContain('publication_batch_items');
    expect(query).toContain('publication_batch_decisions');
  });

  it('validates the target before mutating the current batch during rollback', async () => {
    mocks.sql.mockResolvedValue([]);
    await rollbackPublicationBatch({ currentBatchId: '8c1eea25-a58d-4bb6-b8ec-4e15b739e83f', targetBatchId: '551e02ae-22e6-4388-9767-504341c88f2d', actor: 'reviewer', reason: 'Restore prior stable release' });
    const query = text(mocks.sql.mock.calls[0][0]);
    expect(query.indexOf('target_candidate AS')).toBeLessThan(query.indexOf('current_batch AS'));
    expect(query).toContain('EXISTS (SELECT 1 FROM target_candidate)');
    expect(query).toContain("status='rolled_back'");
  });
});
