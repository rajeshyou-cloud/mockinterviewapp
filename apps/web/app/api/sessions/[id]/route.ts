import { NextResponse } from 'next/server';
import { getInterviewSession, isDatabaseConfigured } from '../../../../lib/db';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !/^[0-9a-f]{64}$/i.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }
  const data = await getInterviewSession(id, resumeToken);
  if (!data) return NextResponse.json({ error: 'session_not_found_or_unauthorized' }, { status: 404 });
  return NextResponse.json({ persisted: true, ...data });
}
