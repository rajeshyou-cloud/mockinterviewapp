import { describe, expect, it, vi } from 'vitest';

const released = vi.hoisted(() => ({ getReleasedCourses: vi.fn() }));
vi.mock('../../../lib/released-courses', () => released);

import { GET } from './route';

describe('GET /api/courses', () => {
  it('returns only the current released-course projection', async () => {
    released.getReleasedCourses.mockResolvedValue([{ id: 'snowflake', label: 'Snowflake' }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'snowflake', label: 'Snowflake' }]);
  });
});
