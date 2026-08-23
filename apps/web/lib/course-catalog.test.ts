import { describe, expect, it } from 'vitest';

import { availableCourses, courseCatalog, isAvailableTechnology } from './course-catalog';

describe('course catalog', () => {
  it('tracks the two released and five planned technologies centrally', () => {
    expect(courseCatalog).toHaveLength(7);
    expect(availableCourses.map((course) => course.id)).toEqual(['snowflake', 'informatica']);
    expect(courseCatalog.filter((course) => course.status === 'planned').map((course) => course.id)).toEqual([
      'databricks', 'oracle', 'power-bi', 'python', 'aws',
    ]);
  });

  it('does not expose planned courses as interview-ready', () => {
    expect(isAvailableTechnology('snowflake')).toBe(true);
    expect(isAvailableTechnology('databricks')).toBe(false);
  });
});
