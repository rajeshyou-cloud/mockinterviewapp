import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getReleasedCourseIds, getReleasedCourses, isCandidateCourseAiVerified, isReleasedTechnology } from './released-courses';

describe('released course gate', () => {
  it('releases foundation courses plus explicitly launched AI-verified candidate courses', async () => {
    await expect(getReleasedCourseIds()).resolves.toEqual(['snowflake', 'informatica', 'databricks', 'oracle']);
  });

  it('does not expose incomplete candidate packs', async () => {
    await expect(getReleasedCourseIds()).resolves.toEqual(['snowflake', 'informatica', 'databricks', 'oracle']);
    await expect(isReleasedTechnology('databricks')).resolves.toBe(true);
    await expect(isReleasedTechnology('oracle')).resolves.toBe(true);
    await expect(isReleasedTechnology('aws')).resolves.toBe(false);
    await expect(isReleasedTechnology('power-bi')).resolves.toBe(false);
    await expect(isReleasedTechnology('python')).resolves.toBe(false);
    await expect(getReleasedCourses()).resolves.toHaveLength(4);
  });

  it('separates AI content readiness from the explicit production launch decision', async () => {
    expect(isCandidateCourseAiVerified('oracle')).toBe(true);
    expect(isCandidateCourseAiVerified('databricks')).toBe(true);
    expect(isCandidateCourseAiVerified('aws')).toBe(true);
    await expect(isReleasedTechnology('aws')).resolves.toBe(false);
    expect(isCandidateCourseAiVerified('unknown')).toBe(false);
  });
});
