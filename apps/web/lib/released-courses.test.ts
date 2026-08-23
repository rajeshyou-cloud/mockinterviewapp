import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const db = vi.hoisted(() => ({ listApprovedCourseIds: vi.fn() }));
vi.mock('./db', () => db);

import { getReleasedCourseIds, getReleasedCourses, isReleasedTechnology } from './released-courses';

describe('released course gate', () => {
  beforeEach(() => db.listApprovedCourseIds.mockResolvedValue([]));

  it('always releases the two reviewed foundation courses', async () => {
    await expect(getReleasedCourseIds()).resolves.toEqual(['snowflake', 'informatica']);
  });

  it('adds only known, human-approved candidate courses', async () => {
    db.listApprovedCourseIds.mockResolvedValue(['databricks', 'unknown', 'aws']);
    await expect(getReleasedCourseIds()).resolves.toEqual(['snowflake', 'informatica', 'databricks', 'aws']);
    await expect(isReleasedTechnology('databricks')).resolves.toBe(true);
    await expect(isReleasedTechnology('python')).resolves.toBe(false);
    await expect(getReleasedCourses()).resolves.toHaveLength(4);
  });
});
