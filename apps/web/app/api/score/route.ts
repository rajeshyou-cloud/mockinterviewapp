import { NextRequest, NextResponse } from 'next/server';

type ScorePayload = {
  answer?: string;
  expected_concepts?: string[];
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ScorePayload;
  const answer = payload.answer?.trim() ?? '';
  const expected = payload.expected_concepts ?? [];

  if (!answer || expected.length === 0) {
    return NextResponse.json({ error: 'answer and expected_concepts are required' }, { status: 400 });
  }

  const normalized = answer.toLowerCase();
  const matched = expected.filter((concept) => normalized.includes(concept.toLowerCase()));
  const missing = expected.filter((concept) => !matched.includes(concept));
  const score = Math.round((matched.length / expected.length) * 100);

  const summary =
    score >= 70
      ? 'Strong coverage of the expected concepts.'
      : score >= 40
        ? 'Partial coverage. Add the missing concepts and explain the trade-offs.'
        : 'The answer needs more technical depth against this baseline rubric.';

  return NextResponse.json({
    score,
    matched_concepts: matched,
    missing_concepts: missing,
    summary,
  });
}
