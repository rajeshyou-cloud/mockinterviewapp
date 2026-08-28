import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const db = vi.hoisted(() => ({
  listGovernedQuestionSnapshots: vi.fn(),
  getGovernedQuestionSnapshot: vi.fn(),
}));
vi.mock('./db', () => db);

import {
  compareQuestionParity,
  ContentRepositoryUnavailableError,
  getCandidateQuestion,
  listCandidateQuestions,
} from './content-repository';
import { allQuestionBank } from './question-bank';

const originalMode = process.env.GOVERNED_CONTENT_SOURCE;
const verified = allQuestionBank.find((question) => question.benchmark.review.status === 'ai-evidence-verified')!;
const draft = allQuestionBank.find((question) => question.benchmark.review.status === 'draft')!;

beforeEach(() => {
  delete process.env.GOVERNED_CONTENT_SOURCE;
  db.listGovernedQuestionSnapshots.mockReset();
  db.getGovernedQuestionSnapshot.mockReset();
});

afterEach(() => {
  if (originalMode === undefined) delete process.env.GOVERNED_CONTENT_SOURCE;
  else process.env.GOVERNED_CONTENT_SOURCE = originalMode;
});

describe('governed content repository', () => {
  it('keeps JSON as the default source during transition', async () => {
    const questions = await listCandidateQuestions(['snowflake', 'informatica']);
    expect(questions).toHaveLength(300);
    expect(db.listGovernedQuestionSnapshots).not.toHaveBeenCalled();
  });

  it('fails closed when database mode is configured without a database', async () => {
    process.env.GOVERNED_CONTENT_SOURCE = 'database';
    db.listGovernedQuestionSnapshots.mockResolvedValue(null);
    await expect(listCandidateQuestions(['informatica'])).rejects.toBeInstanceOf(ContentRepositoryUnavailableError);
  });

  it('defensively withholds unverified snapshots in database mode', async () => {
    process.env.GOVERNED_CONTENT_SOURCE = 'database';
    db.listGovernedQuestionSnapshots.mockResolvedValue([verified, draft]);
    const questions = await listCandidateQuestions([verified.technology, draft.technology]);
    expect(questions).toEqual([verified]);
    expect(db.listGovernedQuestionSnapshots).toHaveBeenCalledWith({
      technologyIds: [verified.technology, draft.technology],
      includeUnpublished: false,
    });
  });

  it('shadow mode compares database snapshots while serving unchanged JSON', async () => {
    process.env.GOVERNED_CONTENT_SOURCE = 'shadow';
    const expected = allQuestionBank.filter((question) => question.technology === 'informatica');
    db.listGovernedQuestionSnapshots.mockResolvedValue(expected);
    await expect(listCandidateQuestions(['informatica'])).resolves.toEqual(expected);
    expect(db.listGovernedQuestionSnapshots).toHaveBeenCalledWith({
      technologyIds: ['informatica'],
      includeUnpublished: true,
    });
  });

  it('shadow mode keeps serving JSON when the governed database is unavailable', async () => {
    process.env.GOVERNED_CONTENT_SOURCE = 'shadow';
    const expected = allQuestionBank.filter((question) => question.technology === 'informatica');
    db.listGovernedQuestionSnapshots.mockRejectedValue(new Error('database unavailable'));
    await expect(listCandidateQuestions(['informatica'])).resolves.toEqual(expected);
  });

  it('shadow scoring compares unpublished snapshots while serving the JSON rubric', async () => {
    process.env.GOVERNED_CONTENT_SOURCE = 'shadow';
    db.getGovernedQuestionSnapshot.mockResolvedValue(verified);
    await expect(getCandidateQuestion(verified.id)).resolves.toEqual(verified);
    expect(db.getGovernedQuestionSnapshot).toHaveBeenCalledWith(verified.id, { includeUnpublished: true });
  });

  it('resolves scoring rubrics only from verified published database snapshots', async () => {
    process.env.GOVERNED_CONTENT_SOURCE = 'database';
    db.getGovernedQuestionSnapshot.mockResolvedValueOnce(verified).mockResolvedValueOnce(draft);
    await expect(getCandidateQuestion(verified.id)).resolves.toEqual(verified);
    await expect(getCandidateQuestion(draft.id)).resolves.toBeUndefined();
    expect(db.getGovernedQuestionSnapshot).toHaveBeenCalledWith(verified.id, { includeUnpublished: false });
  });

  it('reports missing, unexpected, and materially changed records', () => {
    const changed = { ...verified, question: `${verified.question} changed` };
    const report = compareQuestionParity([verified, draft], [changed]);
    expect(report.matches).toBe(false);
    expect(report.missingIds).toEqual([draft.id]);
    expect(report.changedIds).toEqual([verified.id]);
  });
});
