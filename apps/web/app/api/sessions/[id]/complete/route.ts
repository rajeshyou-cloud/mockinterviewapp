import { NextRequest, NextResponse } from 'next/server';
import { completeInterviewSession, isDatabaseConfigured } from '../../../../../lib/db';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !/^[0-9a-f]{64}$/i.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  const payload = await request.json() as { totalScore?: number };
  if (typeof payload.totalScore !== 'number') {
    return NextResponse.json({ error: 'totalScore is required' }, { status: 400 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }
  const session = await completeInterviewSession(id, resumeToken, payload.totalScore);
  if (!session) return NextResponse.json({ error: 'session_not_found_or_unauthorized' }, { status: 404 });
  return NextResponse.json({ persisted: true, session });
}
