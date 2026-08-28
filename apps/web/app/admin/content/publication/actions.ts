'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole } from '../../../../lib/auth/access';
import { createPublicationBatch, rollbackPublicationBatch, transitionPublicationBatch } from '../../../../lib/publication-batches';

const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const uuid = z.string().uuid();

export async function createBatch(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = z.object({
    technologyId: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().trim().min(3).max(200),
    version,
    releaseNotes: z.string().trim().min(10).max(5_000),
    questionIds: z.string().trim().min(3),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/admin/content/publication?error=invalid');
  const questionIds = parsed.data.questionIds.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  try {
    const batch = await createPublicationBatch({ ...parsed.data, questionIds, actor: user.id });
    if (!batch) redirect('/admin/content/publication?error=database');
    revalidatePath('/admin/content/publication');
    redirect(`/admin/content/publication/${batch.id}?saved=created`);
  } catch {
    redirect('/admin/content/publication?error=ineligible');
  }
}

export async function transitionBatch(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = z.object({
    id: uuid,
    action: z.enum(['mark-ready', 'approve', 'publish', 'unpublish', 'retire']),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/admin/content/publication?error=invalid');
  let result;
  try {
    result = await transitionPublicationBatch({ ...parsed.data, actor: user.id });
  } catch {
    redirect(`/admin/content/publication/${parsed.data.id}?error=database`);
  }
  if (!result) redirect(`/admin/content/publication/${parsed.data.id}?error=transition`);
  revalidatePath('/admin/content/publication');
  revalidatePath(`/admin/content/publication/${parsed.data.id}`);
  redirect(`/admin/content/publication/${parsed.data.id}?saved=${parsed.data.action}`);
}

export async function rollbackBatch(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = z.object({
    currentBatchId: uuid,
    targetBatchId: uuid,
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/admin/content/publication?error=invalid');
  let result;
  try {
    result = await rollbackPublicationBatch({ ...parsed.data, actor: user.id });
  } catch {
    redirect(`/admin/content/publication/${parsed.data.currentBatchId}?error=database`);
  }
  if (!result) redirect(`/admin/content/publication/${parsed.data.currentBatchId}?error=rollback`);
  revalidatePath('/admin/content/publication');
  redirect(`/admin/content/publication/${parsed.data.targetBatchId}?saved=rollback`);
}
