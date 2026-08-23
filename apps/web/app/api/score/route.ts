import { NextRequest, NextResponse } from 'next/server';

import { createScoringProvider } from '../../../lib/scoring';

type ScorePayload = {
  answer?: string;
  expected_concepts?: string[];
  canonical_answer?: string;
  question?: string;
};

const provider = createScoringProvider();

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ScorePayload;
  const answer = payload.answer?.trim() ?? '';
  const expected = payload.expected_concepts ?? [];

  if (!answer || expected.length === 0) {
    return NextResponse.json({ error: 'answer and expected_concepts are required' }, { status: 400 });
  }

  const result = await provider.score({
    answer,
    expectedConcepts: expected,
    canonicalAnswer: payload.canonical_answer,
    question: payload.question,
  });

  return NextResponse.json(result);
}
