import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, saveInterviewAnswer } from '../../../../../lib/db';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !/^[0-9a-f]{64}$/i.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
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
    resumeToken,
    questionId: payload.questionId,
    answerText: payload.answerText,
    score: payload.score,
    matchedConcepts: payload.matchedConcepts ?? [],
    missingConcepts: payload.missingConcepts ?? [],
    feedback: payload.feedback ?? '',
    currentIndex: payload.currentIndex ?? 0,
  });

  if (!answer) return NextResponse.json({ error: 'session_not_found_or_unauthorized' }, { status: 404 });

  return NextResponse.json({ persisted: true, answer });
}
