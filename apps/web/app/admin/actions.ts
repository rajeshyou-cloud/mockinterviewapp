'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireRole } from '../../lib/auth/access';
import { grantUserRole, revokeUserRole } from '../../lib/db';

const roleSchema = z.object({
  userId: z.string().trim().min(4).max(200),
  role: z.enum(['candidate', 'reviewer', 'recruiter', 'admin']),
});

export async function grantRole(formData: FormData) {
  const { user } = await requireRole(['admin']);
  const parsed = roleSchema.safeParse({ userId: formData.get('userId'), role: formData.get('role') });
  if (!parsed.success) return;
  await grantUserRole(parsed.data.userId, parsed.data.role, user.id);
  revalidatePath('/admin');
}

export async function revokeRole(formData: FormData) {
  const { user } = await requireRole(['admin']);
  const parsed = roleSchema.safeParse({ userId: formData.get('userId'), role: formData.get('role') });
  if (!parsed.success || (parsed.data.userId === user.id && parsed.data.role === 'admin')) return;
  await revokeUserRole(parsed.data.userId, parsed.data.role);
  revalidatePath('/admin');
}
