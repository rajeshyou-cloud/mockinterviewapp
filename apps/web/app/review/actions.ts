'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole } from '../../lib/auth/access';
import { saveCoursePackReview } from '../../lib/db';

const reviewSchema = z.object({
  courseId: z.enum(['databricks', 'oracle', 'power-bi', 'python', 'aws']),
  status: z.enum(['in_review', 'approved', 'changes_requested']),
  notes: z.string().trim().max(2_000),
  sourceLinksChecked: z.boolean(),
});

export async function saveReview(formData: FormData) {
  const { user } = await requireRole(['reviewer']);
  const parsed = reviewSchema.safeParse({
    courseId: formData.get('courseId'),
    status: formData.get('status'),
    notes: formData.get('notes'),
    sourceLinksChecked: formData.get('sourceLinksChecked') === 'on',
  });
  if (!parsed.success) redirect('/review?error=invalid');
  if (parsed.data.status === 'approved' && !parsed.data.sourceLinksChecked) {
    redirect(`/review?course=${parsed.data.courseId}&error=sources`);
  }

  await saveCoursePackReview({ ...parsed.data, reviewerUserId: user.id });
  revalidatePath('/review');
  redirect(`/review?course=${parsed.data.courseId}&saved=1`);
}
