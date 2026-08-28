import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireRole = vi.hoisted(() => vi.fn());
const createGovernedQuestion = vi.hoisted(() => vi.fn());
const reviseGovernedQuestion = vi.hoisted(() => vi.fn());
const recordGovernedHumanReview = vi.hoisted(() => vi.fn());
const bulkUpdateGovernedQuestions = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn((path: string) => { throw new Error(`redirect:${path}`); }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('../../../lib/auth/access', () => ({ requireRole }));
vi.mock('../../../lib/governed-content-admin', () => ({
  createGovernedQuestion,
  reviseGovernedQuestion,
  recordGovernedHumanReview,
  bulkUpdateGovernedQuestions,
}));

import { bulkQuestionAction, createQuestion, recordHumanReview, reviseQuestion } from './actions';

function validCreateForm() {
  const form = new FormData();
  Object.entries({
    id: 'candidate-aws-new-151', technology: 'aws', topic: 'architecture', topicName: 'Architecture',
    difficulty: 'advanced', type: 'design', prompt: 'How would you design a resilient AWS workload?',
    canonicalAnswer: 'Use multiple Availability Zones, health checks, tested recovery, and monitored failover.',
    expandedExplanation: 'Use multiple Availability Zones, health checks, tested recovery, and monitored failover while validating recovery objectives and operational telemetry.',
    reasoning: 'The answer must connect failure isolation, recovery objectives, monitoring, and controlled validation.',
    strong: 'Accurately covers resilient design, measurable recovery, monitoring, and validation trade-offs.',
    partial: 'Covers redundancy but omits measurable recovery objectives or operational validation evidence.',
    weak: 'Mentions availability only superficially and lacks concrete failure or recovery reasoning.',
    incorrect: 'Makes unsafe claims that conflict with the official resilience and recovery guidance.',
    evidenceUrl: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html',
    evidenceTitle: 'Reliability pillar', evidenceSection: 'Design principles', evidenceCategory: 'recovery',
    evidenceDocumentVersion: 'current', evidenceContentHash: `sha256:${'a'.repeat(64)}`, evidenceRetrievedAt: '2026-08-27',
  }).forEach(([key, value]) => form.set(key, value));
  form.set('requiredConcepts', 'Availability Zones\nrecovery objectives\nmonitoring');
  form.set('optionalConcepts', 'chaos testing');
  return form;
}

describe('Content Admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({ user: { id: 'reviewer-1' } });
  });

  it('creates only validated evidence-backed drafts as the signed-in reviewer', async () => {
    createGovernedQuestion.mockResolvedValue({ id: 'candidate-aws-new-151' });
    await expect(createQuestion(validCreateForm())).rejects.toThrow('redirect:/admin/content/questions/candidate-aws-new-151?saved=created');
    expect(createGovernedQuestion).toHaveBeenCalledWith(expect.objectContaining({
      id: 'candidate-aws-new-151', actor: 'reviewer-1', requiredConcepts: ['Availability Zones', 'recovery objectives', 'monitoring'],
      evidence: expect.objectContaining({ contentHash: `sha256:${'a'.repeat(64)}` }),
    }));
  });

  it('rejects malformed evidence before any database mutation', async () => {
    const form = validCreateForm();
    form.set('evidenceContentHash', 'not-a-hash');
    await expect(createQuestion(form)).rejects.toThrow('redirect:/admin/content/new?error=invalid');
    expect(createGovernedQuestion).not.toHaveBeenCalled();
  });

  it('requires concepts and passes versioned revisions to the governed store', async () => {
    const form = new FormData();
    Object.entries({
      id: 'snowflake-basics-001', baseVersion: '1.0.0', newVersion: '2.0.0', benchmarkVersion: '2.0.0',
      prompt: 'What roles do Snowflake core objects perform?', canonicalAnswer: 'Databases and schemas organize tables, while virtual warehouses provide isolated compute for workloads.',
      expandedExplanation: 'Databases and schemas organize tables, while virtual warehouses provide isolated compute for workloads, allowing storage and compute to scale independently.',
      reasoning: 'A complete answer separates data organization from compute execution and explains workload isolation.',
      changeSummary: 'Clarify storage and compute responsibilities', evidenceUrl: '', evidenceTitle: '', evidenceSection: '',
      evidenceCategory: 'overview', evidenceDocumentVersion: '', evidenceContentHash: '', evidenceRetrievedAt: '',
    }).forEach(([key, value]) => form.set(key, value));
    form.set('requiredConcepts', 'database\nschema\nvirtual warehouse');
    form.set('optionalConcepts', 'workload isolation');
    reviseGovernedQuestion.mockResolvedValue({ id: 'snowflake-basics-001' });
    await expect(reviseQuestion(form)).rejects.toThrow('redirect:/admin/content/questions/snowflake-basics-001?saved=revision');
    expect(reviseGovernedQuestion).toHaveBeenCalledWith(expect.objectContaining({ actor: 'reviewer-1', newVersion: '2.0.0', evidence: undefined }));
  });

  it('records human decisions separately from bulk lifecycle actions', async () => {
    recordGovernedHumanReview.mockResolvedValue({ id: 'q-1' });
    const review = new FormData();
    review.set('id', 'question-1'); review.set('baseVersion', '1.0.0'); review.set('verdict', 'approve'); review.set('notes', 'Checked official evidence.');
    await expect(recordHumanReview(review)).rejects.toThrow('redirect:/admin/content/questions/question-1?saved=review');
    expect(recordGovernedHumanReview).toHaveBeenCalledWith(expect.objectContaining({ reviewerUserId: 'reviewer-1', verdict: 'approve' }));

    const bulk = new FormData();
    bulk.set('action', 'mark-stale'); bulk.append('questionIds', 'q-1'); bulk.append('questionIds', 'q-2');
    await expect(bulkQuestionAction(bulk)).rejects.toThrow('redirect:/admin/content?saved=bulk');
    expect(bulkUpdateGovernedQuestions).toHaveBeenCalledWith({ ids: ['q-1', 'q-2'], action: 'mark-stale', actor: 'reviewer-1' });
  });
});
