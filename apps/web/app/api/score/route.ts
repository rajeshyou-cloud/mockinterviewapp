import { NextRequest, NextResponse } from 'next/server';

import { ContentRepositoryUnavailableError, getCandidateQuestion } from '../../../lib/content-repository';
import { checkScoringRateLimit } from '../../../lib/rate-limit';
import { isReleasedTechnology } from '../../../lib/released-courses';
import { createScoringProvider } from '../../../lib/scoring';

type ScorePayload = {
  answer?: string;
  question_id?: string;
};

const provider = createScoringProvider();

export async function POST(request: NextRequest) {
  let payload: ScorePayload;
  try {
    payload = (await request.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required' }, { status: 400 });
  }
  const answer = payload.answer?.trim() ?? '';
  if (!answer || !payload.question_id) {
    return NextResponse.json({ error: 'answer and question_id are required' }, { status: 400 });
  }
  let question;
  try {
    question = await getCandidateQuestion(payload.question_id);
  } catch (error) {
    if (error instanceof ContentRepositoryUnavailableError) {
      return NextResponse.json({ error: 'Scoring content is temporarily unavailable' }, { status: 503 });
    }
    throw error;
  }
  if (!question || !(await isReleasedTechnology(question.technology))) {
    return NextResponse.json({ error: 'The reviewed question was not found' }, { status: 404 });
  }
  if (answer.length > 12_000) {
    return NextResponse.json({ error: 'Scoring input exceeds the supported size' }, { status: 413 });
  }

  const identity = request.headers.get('x-session-id')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'anonymous';
  const rateLimit = checkScoringRateLimit(identity);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many scoring requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const result = await provider.score({
    answer,
    expectedConcepts: question.benchmark.requiredConcepts,
    canonicalAnswer: question.benchmark.canonicalAnswer,
    benchmark: question.benchmark,
    question: question.question,
  });

  return NextResponse.json({
    ...result,
    benchmark_version: question.benchmark.version,
    scoring_policy_version: 'benchmark-policy-1.0.0',
  });
}
