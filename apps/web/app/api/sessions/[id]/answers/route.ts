import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, saveInterviewAnswer } from '../../../../../lib/db';
import { readJson, resumeTokenPattern, saveAnswerSchema, sessionIdSchema } from '../../../../../lib/persistence-validation';
import { findQuestion } from '../../../../../lib/question-bank';
import { isReleasedTechnology } from '../../../../../lib/released-courses';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !resumeTokenPattern.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  if (!sessionIdSchema.safeParse(id).success) return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  const parsed = saveAnswerSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_answer_request' }, { status: 400 });
  const payload = parsed.data;
  const question = findQuestion(payload.questionId);
  if (!question || !(await isReleasedTechnology(question.technology))) {
    return NextResponse.json({ error: 'reviewed_question_not_found' }, { status: 404 });
  }
  const allowedConcepts = new Set(question.benchmark.requiredConcepts);
  if ([...(payload.matchedConcepts ?? []), ...(payload.missingConcepts ?? [])].some((concept) => !allowedConcepts.has(concept))) {
    return NextResponse.json({ error: 'invalid_scoring_concepts' }, { status: 400 });
  }
  const allowedOptionalConcepts = new Set(question.benchmark.optionalConcepts);
  if ((payload.optionalConcepts ?? []).some((concept) => !allowedOptionalConcepts.has(concept))) {
    return NextResponse.json({ error: 'invalid_optional_concepts' }, { status: 400 });
  }
  const allowedIncorrectClaims = new Set(question.benchmark.incorrectClaims.map((claim) => claim.claim));
  if ((payload.incorrectClaims ?? []).some((claim) => !allowedIncorrectClaims.has(claim))) {
    return NextResponse.json({ error: 'invalid_incorrect_claims' }, { status: 400 });
  }
  if (payload.benchmarkVersion && payload.benchmarkVersion !== question.benchmark.version) {
    return NextResponse.json({ error: 'invalid_benchmark_version' }, { status: 400 });
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
    optionalConcepts: payload.optionalConcepts ?? [],
    incorrectClaims: payload.incorrectClaims ?? [],
    dimensionScores: payload.dimensionScores,
    feedback: payload.feedback ?? '',
    currentIndex: payload.currentIndex ?? 0,
    provider: payload.provider,
    benchmarkVersion: question.benchmark.version,
    scoringPolicyVersion: payload.scoringPolicyVersion ?? 'benchmark-policy-1.0.0',
  });

  if (!answer) return NextResponse.json({ error: 'session_not_found_or_unauthorized' }, { status: 404 });

  return NextResponse.json({ persisted: true, answer });
}
