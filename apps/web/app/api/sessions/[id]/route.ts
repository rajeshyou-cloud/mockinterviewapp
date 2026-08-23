import { NextResponse } from 'next/server';
import { getInterviewSession, isDatabaseConfigured } from '../../../../lib/db';
import { resumeTokenPattern, sessionIdSchema } from '../../../../lib/persistence-validation';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !resumeTokenPattern.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  if (!sessionIdSchema.safeParse(id).success) return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }
  const data = await getInterviewSession(id, resumeToken);
  if (!data) return NextResponse.json({ error: 'session_not_found_or_unauthorized' }, { status: 404 });
  return NextResponse.json({ persisted: true, ...data });
}
