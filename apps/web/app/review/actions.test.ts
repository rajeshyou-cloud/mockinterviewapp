import { describe, expect, it, vi, beforeEach } from 'vitest';

const saveCoursePackReview = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('../../lib/auth/access', () => ({ requireRole }));
vi.mock('../../lib/db', () => ({ saveCoursePackReview }));

import { saveReview } from './actions';

function form(input: {
  courseId?: string;
  status?: string;
  notes?: string;
  sourceLinksChecked?: boolean;
}) {
  const data = new FormData();
  if (input.courseId) data.set('courseId', input.courseId);
  if (input.status) data.set('status', input.status);
  data.set('notes', input.notes ?? '');
  if (input.sourceLinksChecked) data.set('sourceLinksChecked', 'on');
  return data;
}

describe('saveReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({ user: { id: 'reviewer-1' } });
  });

  it('requires source checks before approval', async () => {
    await expect(saveReview(form({ courseId: 'databricks', status: 'approved' })))
      .rejects.toThrow('redirect:/review?course=databricks&error=sources');
    expect(saveCoursePackReview).not.toHaveBeenCalled();
  });

  it('requires benchmark verification before approval', async () => {
    await expect(saveReview(form({ courseId: 'power-bi', status: 'approved', sourceLinksChecked: true })))
      .rejects.toThrow('redirect:/review?course=power-bi&error=benchmarks');
    expect(saveCoursePackReview).not.toHaveBeenCalled();
  });

  it('still allows a pack to remain in review while benchmark work continues', async () => {
    saveCoursePackReview.mockResolvedValue({});

    await expect(saveReview(form({ courseId: 'databricks', status: 'in_review', sourceLinksChecked: true, notes: 'Evidence review pending.' })))
      .rejects.toThrow('redirect:/review?course=databricks&saved=1');

    expect(saveCoursePackReview).toHaveBeenCalledWith({
      courseId: 'databricks',
      reviewerUserId: 'reviewer-1',
      status: 'in_review',
      notes: 'Evidence review pending.',
      sourceLinksChecked: true,
    });
  });
});
