import { NextRequest, NextResponse } from 'next/server';
import { completeInterviewSession, isDatabaseConfigured } from '../../../../../lib/db';
import { completeSessionSchema, readJson, resumeTokenPattern, sessionIdSchema } from '../../../../../lib/persistence-validation';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !resumeTokenPattern.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  if (!sessionIdSchema.safeParse(id).success) return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  const parsed = completeSessionSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_completion_request' }, { status: 400 });
  const payload = parsed.data;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }
  const session = await completeInterviewSession(id, resumeToken, payload.totalScore);
  if (!session) return NextResponse.json({ error: 'session_not_found_or_unauthorized' }, { status: 404 });
  return NextResponse.json({ persisted: true, session });
}
