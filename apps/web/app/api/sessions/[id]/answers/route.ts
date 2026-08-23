import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, saveInterviewAnswer } from '../../../../../lib/db';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json() as {
    questionId?: string;
    answerText?: string;
    score?: number;
    matchedConcepts?: string[];
    missingConcepts?: string[];
    feedback?: string;
    currentIndex?: number;
  };

  if (!payload.questionId || !payload.answerText || typeof payload.score !== 'number') {
    return NextResponse.json({ error: 'questionId, answerText and score are required' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }

  const answer = await saveInterviewAnswer({
    sessionId: id,
    questionId: payload.questionId,
    answerText: payload.answerText,
    score: payload.score,
    matchedConcepts: payload.matchedConcepts ?? [],
    missingConcepts: payload.missingConcepts ?? [],
    feedback: payload.feedback ?? '',
    currentIndex: payload.currentIndex ?? 0,
  });

  return NextResponse.json({ persisted: true, answer });
}
