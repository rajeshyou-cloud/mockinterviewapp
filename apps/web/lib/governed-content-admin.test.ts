import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(), neon: vi.fn() }));
mocks.neon.mockReturnValue(mocks.sql);
vi.mock('@neondatabase/serverless', () => ({ neon: mocks.neon }));

import {
  bulkUpdateGovernedQuestions,
  createGovernedQuestion,
  GovernedContentDatabaseUnavailableError,
  listGovernedContent,
  reviseGovernedQuestion,
} from './governed-content-admin';

const originalDatabaseUrl = process.env.DATABASE_URL;
const sqlText = (parts: TemplateStringsArray) => Array.from(parts).join('?');

beforeEach(() => {
  process.env.DATABASE_URL = 'postgresql://example.invalid/database';
  mocks.sql.mockReset();
  mocks.neon.mockClear();
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe('governed Content Admin database boundaries', () => {
  it('fails explicitly when governed storage is unavailable', async () => {
    delete process.env.DATABASE_URL;
    await expect(listGovernedContent()).rejects.toBeInstanceOf(GovernedContentDatabaseUnavailableError);
  });

  it('applies every question-list filter server-side with bounded pagination', async () => {
    mocks.sql.mockImplementation((parts: TemplateStringsArray) => {
      const text = sqlText(parts);
      if (text.includes('count(*)::int AS total')) return Promise.resolve([{ total: 0 }]);
      return Promise.resolve([]);
    });
    const result = await listGovernedContent({
      technology: 'aws', topic: 'architecture', difficulty: 'advanced', type: 'design',
      reviewStatus: 'draft', publishStatus: 'unpublished', query: 'resilience', page: 3,
    });
    expect(result).toMatchObject({ total: 0, page: 3, pageSize: 50 });
    const statements = mocks.sql.mock.calls.map(([parts]) => sqlText(parts));
    const listStatement = statements.find((text) => text.includes('LIMIT'))!;
    expect(listStatement).toContain('question.technology_id');
    expect(listStatement).toContain('question.review_status');
    expect(listStatement).toContain('question.publish_status');
    expect(listStatement).toContain('question.prompt ILIKE');
  });

  it('rejects non-increasing revisions before reading or mutating the database', async () => {
    await expect(reviseGovernedQuestion({
      id: 'question-1', baseVersion: '2.0.0', newVersion: '1.0.0', benchmarkVersion: '2.0.0',
      prompt: 'A sufficiently long question?', canonicalAnswer: 'A sufficiently long canonical answer for the test.',
      expandedExplanation: 'A sufficiently detailed expanded explanation for the governed content test.',
      requiredConcepts: ['one'], optionalConcepts: [], reasoning: 'A sufficiently complete reasoning standard.',
      changeSummary: 'Invalid downgrade', actor: 'reviewer-1',
    })).rejects.toThrow('must increase');
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('creates unpublished drafts only after validating the official host', async () => {
    mocks.sql.mockResolvedValueOnce([{ official_domains: ['docs.aws.amazon.com'] }]).mockResolvedValueOnce([{ id: 'candidate-aws-new-151' }]);
    const result = await createGovernedQuestion({
      id: 'candidate-aws-new-151', technology: 'aws', topic: 'reliability', topicName: 'Reliability',
      difficulty: 'advanced', type: 'design', prompt: 'How would you design a resilient AWS workload?',
      canonicalAnswer: 'Use isolated failure domains, measurable recovery objectives, monitoring, and tested failover.',
      expandedExplanation: 'Use isolated failure domains, measurable recovery objectives, monitoring, and tested failover with controlled validation and documented rollback.',
      requiredConcepts: ['failure domains', 'recovery objectives'], optionalConcepts: ['chaos testing'],
      reasoning: 'Connect architecture decisions to measurable failure and recovery behavior.',
      scoringAnchors: {
        strong: 'Covers failure isolation, recovery, monitoring, testing, and material trade-offs.',
        partial: 'Covers redundancy but omits measurable recovery or operational validation.',
        weak: 'Mentions availability superficially without concrete recovery reasoning.',
        incorrect: 'Conflicts with official resilience guidance or proposes unsafe operation.',
      },
      evidence: {
        url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html',
        title: 'Reliability pillar', section: 'Design principles', category: 'recovery',
        contentHash: `sha256:${'b'.repeat(64)}`, retrievedAt: '2026-08-27',
      }, actor: 'reviewer-1',
    });
    expect(result).toEqual({ id: 'candidate-aws-new-151' });
    const mutation = sqlText(mocks.sql.mock.calls[1][0]);
    expect(mutation).toContain("'draft'");
    expect(mutation).toContain("'unpublished'");
    expect(mutation).toContain('question_versions');
    expect(mutation).toContain('question_evidence_links');
  });

  it('audits stale decisions before failing the question closed', async () => {
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'q-1' }]);
    await bulkUpdateGovernedQuestions({ ids: ['q-1'], action: 'mark-stale', actor: 'reviewer-1' });
    expect(mocks.sql).toHaveBeenCalledTimes(2);
    expect(sqlText(mocks.sql.mock.calls[0][0])).toContain('question_reviews');
    const update = sqlText(mocks.sql.mock.calls[1][0]);
    expect(update).toContain("review_status=CASE");
    expect(update).toContain("'unpublished'");
  });
});
