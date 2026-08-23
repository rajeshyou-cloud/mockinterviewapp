import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const released = vi.hoisted(() => ({ getReleasedCourseIds: vi.fn() }));

vi.mock('../../../lib/released-courses', () => released);

import { GET } from './route';

function request(query = '') {
  return new NextRequest(`http://localhost/api/questions${query}`);
}

describe('GET /api/questions', () => {
  beforeEach(() => released.getReleasedCourseIds.mockResolvedValue(['snowflake', 'informatica']));

  it('exposes the full reviewed bank when no sample is requested', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(300);
  });

  it('returns a stable bounded sample for an interview session', async () => {
    const query = '?technology=informatica&difficulty=advanced&seed=session-42&limit=10';
    const first = await (await GET(request(query))).json();
    const second = await (await GET(request(query))).json();

    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(first.every((question: { technology: string; difficulty: string }) =>
      question.technology === 'informatica' && question.difficulty === 'advanced')).toBe(true);
  });

  it('rejects unsupported filters and unsafe sample sizes', async () => {
    expect((await GET(request('?technology=oracle'))).status).toBe(400);
    expect((await GET(request('?limit=100'))).status).toBe(400);
  });

  it('exposes an approved candidate pack without exposing unapproved packs', async () => {
    released.getReleasedCourseIds.mockResolvedValue(['snowflake', 'informatica', 'databricks']);
    const response = await GET(request('?technology=databricks'));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(150);
    expect((await GET(request('?technology=aws'))).status).toBe(400);
  });
});
