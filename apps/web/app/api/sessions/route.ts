import { NextRequest, NextResponse } from 'next/server';
import { createInterviewSession, isDatabaseConfigured } from '../../../lib/db';

export async function POST(request: NextRequest) {
  const payload = await request.json() as { id?: string; technology?: string; difficulty?: string; currentIndex?: number };
  if (!payload.id || !payload.technology || !payload.difficulty) {
    return NextResponse.json({ error: 'id, technology and difficulty are required' }, { status: 400 });
  }
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !/^[0-9a-f]{64}$/i.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });

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
