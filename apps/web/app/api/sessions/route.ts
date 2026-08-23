import { NextRequest, NextResponse } from 'next/server';
import { createInterviewSession, isDatabaseConfigured } from '../../../lib/db';
import { createSessionSchema, readJson, resumeTokenPattern } from '../../../lib/persistence-validation';

export async function POST(request: NextRequest) {
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !resumeTokenPattern.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  const parsed = createSessionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_session_request' }, { status: 400 });
  }
  const payload = parsed.data;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }

  const session = await createInterviewSession({
    id: payload.id,
    resumeToken,
    technology: payload.technology,
    difficulty: payload.difficulty,
    currentIndex: payload.currentIndex,
  });
  if (!session) return NextResponse.json({ error: 'invalid_resume_token' }, { status: 403 });
  return NextResponse.json({ persisted: true, session });
}
