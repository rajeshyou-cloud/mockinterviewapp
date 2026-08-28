import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

import { ContentRepositoryUnavailableError, listCandidateQuestions } from '../../../lib/content-repository';
import { getReleasedCourseIds } from '../../../lib/released-courses';

function seededRank(seed: string, id: string) {
  return createHash('sha256').update(`${seed}:${id}`).digest('hex');
}

export async function GET(request: NextRequest) {
  const releasedCourseIds = await getReleasedCourseIds();
  const released = new Set(releasedCourseIds);
  const technology = request.nextUrl.searchParams.get('technology');
  const difficulty = request.nextUrl.searchParams.get('difficulty');
  const seed = request.nextUrl.searchParams.get('seed');
  const requestedLimit = request.nextUrl.searchParams.get('limit');
  const limit = requestedLimit ? Number.parseInt(requestedLimit, 10) : undefined;

  if (technology && !released.has(technology as (typeof releasedCourseIds)[number])) {
    return NextResponse.json({ error: 'Unsupported technology' }, { status: 400 });
  }
  if (difficulty && !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return NextResponse.json({ error: 'Unsupported difficulty' }, { status: 400 });
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 20)) {
    return NextResponse.json({ error: 'limit must be between 1 and 20' }, { status: 400 });
  }
  if (seed && seed.length > 128) {
    return NextResponse.json({ error: 'seed is too long' }, { status: 400 });
  }

  let questionBank;
  try {
    questionBank = await listCandidateQuestions(releasedCourseIds);
  } catch (error) {
    if (error instanceof ContentRepositoryUnavailableError) {
      return NextResponse.json({ error: 'Question service is temporarily unavailable' }, { status: 503 });
    }
    throw error;
  }

  const filtered = questionBank.filter((question) => {
    if (!released.has(question.technology)) return false;
    if (technology && question.technology !== technology) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    return true;
  });

  const selected = seed
    ? [...filtered].sort((left, right) => seededRank(seed, left.id).localeCompare(seededRank(seed, right.id)))
    : filtered;

  return NextResponse.json(limit === undefined ? selected : selected.slice(0, limit));
}
