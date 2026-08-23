import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, saveInterviewAnswer } from '../../../../../lib/db';
import { readJson, resumeTokenPattern, saveAnswerSchema, sessionIdSchema } from '../../../../../lib/persistence-validation';
import { findQuestion } from '../../../../../lib/question-bank';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !resumeTokenPattern.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  if (!sessionIdSchema.safeParse(id).success) return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  const parsed = saveAnswerSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_answer_request' }, { status: 400 });
  const payload = parsed.data;
  const question = findQuestion(payload.questionId);
  if (!question) return NextResponse.json({ error: 'reviewed_question_not_found' }, { status: 404 });
  const allowedConcepts = new Set(question.expectedConcepts);
  if ([...(payload.matchedConcepts ?? []), ...(payload.missingConcepts ?? [])].some((concept) => !allowedConcepts.has(concept))) {
    return NextResponse.json({ error: 'invalid_scoring_concepts' }, { status: 400 });
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
