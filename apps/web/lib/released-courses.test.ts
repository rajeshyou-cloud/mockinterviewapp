import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getReleasedCourseIds, getReleasedCourses, isCandidateCourseAiVerified, isReleasedTechnology } from './released-courses';

describe('released course gate', () => {
  it('always releases the two reviewed foundation courses', async () => {
    await expect(getReleasedCourseIds()).resolves.toEqual(['snowflake', 'informatica']);
  });

  it('does not let legacy human course approvals control candidate exposure', async () => {
    await expect(getReleasedCourseIds()).resolves.toEqual(['snowflake', 'informatica']);
    await expect(isReleasedTechnology('databricks')).resolves.toBe(false);
    await expect(isReleasedTechnology('python')).resolves.toBe(false);
    await expect(getReleasedCourses()).resolves.toHaveLength(2);
  });

  it('separates AI content readiness from the explicit production launch decision', () => {
    expect(isCandidateCourseAiVerified('oracle')).toBe(true);
    expect(isCandidateCourseAiVerified('databricks')).toBe(false);
    expect(isCandidateCourseAiVerified('unknown')).toBe(false);
  });
});
