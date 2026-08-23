import { NextRequest, NextResponse } from 'next/server';

import { findQuestion } from '../../../lib/question-bank';
import { checkScoringRateLimit } from '../../../lib/rate-limit';
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
  const question = payload.question_id ? findQuestion(payload.question_id) : undefined;

  if (!answer || !payload.question_id) {
    return NextResponse.json({ error: 'answer and question_id are required' }, { status: 400 });
  }
  if (!question) {
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
    expectedConcepts: question.expectedConcepts,
    canonicalAnswer: question.canonicalAnswer,
    question: question.question,
  });

  return NextResponse.json(result);
}
