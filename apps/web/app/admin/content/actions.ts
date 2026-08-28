'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole } from '../../../lib/auth/access';
import {
  bulkUpdateGovernedQuestions,
  createGovernedQuestion,
  recordGovernedHumanReview,
  reviseGovernedQuestion,
} from '../../../lib/governed-content-admin';

const semanticVersion = z.string().regex(/^\d+\.\d+\.\d+$/);
const list = (value: FormDataEntryValue | null) => String(value ?? '')
  .split('\n')
  .map((item) => item.trim())
  .filter(Boolean);

const createSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,199}$/),
  technology: z.enum(['snowflake', 'informatica', 'databricks', 'oracle', 'power-bi', 'python', 'aws']),
  topic: z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/),
  topicName: z.string().trim().min(2).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  type: z.enum(['conceptual', 'scenario', 'troubleshooting', 'design', 'hands-on']),
  prompt: z.string().trim().min(10).max(4_000),
  canonicalAnswer: z.string().trim().min(20).max(12_000),
  expandedExplanation: z.string().trim().min(40).max(24_000),
  reasoning: z.string().trim().min(20).max(12_000),
  strong: z.string().trim().min(20).max(4_000),
  partial: z.string().trim().min(20).max(4_000),
  weak: z.string().trim().min(20).max(4_000),
  incorrect: z.string().trim().min(20).max(4_000),
  evidenceUrl: z.string().url().max(2_000),
  evidenceTitle: z.string().trim().min(2).max(500),
  evidenceSection: z.string().trim().min(2).max(500),
  evidenceCategory: z.enum(['overview', 'setup', 'security', 'monitoring', 'troubleshooting', 'quotas', 'best-practices', 'recovery', 'cost']),
  evidenceDocumentVersion: z.string().trim().max(500),
  evidenceContentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  evidenceRetrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createQuestion(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/admin/content/new?error=invalid');
  const requiredConcepts = list(formData.get('requiredConcepts'));
  const optionalConcepts = list(formData.get('optionalConcepts'));
  if (!requiredConcepts.length) redirect('/admin/content/new?error=concepts');
  const data = parsed.data;
  let result;
  try {
    result = await createGovernedQuestion({
      id: data.id,
      technology: data.technology,
      topic: data.topic,
      topicName: data.topicName,
      difficulty: data.difficulty,
      type: data.type,
      prompt: data.prompt,
      canonicalAnswer: data.canonicalAnswer,
      expandedExplanation: data.expandedExplanation,
      requiredConcepts,
      optionalConcepts,
      reasoning: data.reasoning,
      scoringAnchors: { strong: data.strong, partial: data.partial, weak: data.weak, incorrect: data.incorrect },
      evidence: {
        url: data.evidenceUrl,
        title: data.evidenceTitle,
        section: data.evidenceSection,
        category: data.evidenceCategory,
        documentVersion: data.evidenceDocumentVersion || undefined,
        contentHash: data.evidenceContentHash,
        retrievedAt: data.evidenceRetrievedAt,
      },
      actor: user.id,
    });
  } catch {
    redirect('/admin/content/new?error=database');
  }
  if (!result) redirect('/admin/content/new?error=database');
  revalidatePath('/admin/content');
  redirect(`/admin/content/questions/${encodeURIComponent(data.id)}?saved=created`);
}

const revisionSchema = z.object({
  id: z.string().min(3).max(200),
  baseVersion: semanticVersion,
  newVersion: semanticVersion,
  benchmarkVersion: semanticVersion,
  prompt: z.string().trim().min(10).max(4_000),
  canonicalAnswer: z.string().trim().min(20).max(12_000),
  expandedExplanation: z.string().trim().min(40).max(24_000),
  reasoning: z.string().trim().min(20).max(12_000),
  changeSummary: z.string().trim().min(3).max(1_000),
  evidenceUrl: z.string().trim().max(2_000),
  evidenceTitle: z.string().trim().max(500),
  evidenceSection: z.string().trim().max(500),
  evidenceCategory: z.enum(['overview', 'setup', 'security', 'monitoring', 'troubleshooting', 'quotas', 'best-practices', 'recovery', 'cost']),
  evidenceDocumentVersion: z.string().trim().max(500),
  evidenceContentHash: z.string().trim().max(80),
  evidenceRetrievedAt: z.string().trim().max(10),
});

export async function reviseQuestion(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = revisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/content/questions/${encodeURIComponent(String(formData.get('id') ?? ''))}?error=invalid`);
  const requiredConcepts = list(formData.get('requiredConcepts'));
  const optionalConcepts = list(formData.get('optionalConcepts'));
  if (!requiredConcepts.length) redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?error=concepts`);
  const hasEvidence = Boolean(parsed.data.evidenceUrl);
  if (hasEvidence && (!parsed.data.evidenceTitle || !parsed.data.evidenceSection || !parsed.data.evidenceContentHash || !parsed.data.evidenceRetrievedAt)) {
    redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?error=evidence`);
  }

  let result;
  try {
    result = await reviseGovernedQuestion({
      id: parsed.data.id,
      baseVersion: parsed.data.baseVersion,
      newVersion: parsed.data.newVersion,
      benchmarkVersion: parsed.data.benchmarkVersion,
      prompt: parsed.data.prompt,
      canonicalAnswer: parsed.data.canonicalAnswer,
      expandedExplanation: parsed.data.expandedExplanation,
      requiredConcepts,
      optionalConcepts,
      reasoning: parsed.data.reasoning,
      changeSummary: parsed.data.changeSummary,
      actor: user.id,
      evidence: hasEvidence ? {
        url: parsed.data.evidenceUrl,
        title: parsed.data.evidenceTitle,
        section: parsed.data.evidenceSection,
        category: parsed.data.evidenceCategory,
        documentVersion: parsed.data.evidenceDocumentVersion || undefined,
        contentHash: parsed.data.evidenceContentHash,
        retrievedAt: parsed.data.evidenceRetrievedAt,
      } : undefined,
    });
  } catch {
    redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?error=database`);
  }
  if (!result) redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?error=conflict`);
  revalidatePath('/admin/content');
  revalidatePath(`/admin/content/questions/${parsed.data.id}`);
  redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?saved=revision`);
}

const humanReviewSchema = z.object({
  id: z.string().min(3).max(200),
  baseVersion: semanticVersion,
  verdict: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(2_000),
});

export async function recordHumanReview(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = humanReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/admin/content?error=invalid');
  let result;
  try {
    result = await recordGovernedHumanReview({ ...parsed.data, reviewerUserId: user.id });
  } catch {
    redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?error=database`);
  }
  if (!result) redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?error=conflict`);
  revalidatePath('/admin/content');
  revalidatePath(`/admin/content/questions/${parsed.data.id}`);
  redirect(`/admin/content/questions/${encodeURIComponent(parsed.data.id)}?saved=review`);
}

const bulkSchema = z.object({ action: z.enum(['mark-stale', 'retire', 'unpublish']) });

export async function bulkQuestionAction(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = bulkSchema.safeParse({ action: formData.get('action') });
  const ids = formData.getAll('questionIds').map(String).filter(Boolean);
  if (!parsed.success || !ids.length) redirect('/admin/content?error=selection');
  try {
    await bulkUpdateGovernedQuestions({ ids, action: parsed.data.action, actor: user.id });
  } catch {
    redirect('/admin/content?error=database');
  }
  revalidatePath('/admin/content');
  redirect('/admin/content?saved=bulk');
}
