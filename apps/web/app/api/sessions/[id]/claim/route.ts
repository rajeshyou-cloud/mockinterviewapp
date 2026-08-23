import { NextResponse } from 'next/server';

import { auth } from '../../../../../lib/auth/server';
import { claimInterviewSession, isDatabaseConfigured } from '../../../../../lib/db';
import { resumeTokenPattern, sessionIdSchema } from '../../../../../lib/persistence-validation';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const { id } = await context.params;
  const resumeToken = request.headers.get('x-resume-token');
  if (!resumeToken || !resumeTokenPattern.test(resumeToken)) return NextResponse.json({ error: 'resume_token_required' }, { status: 401 });
  if (!sessionIdSchema.safeParse(id).success) return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ persisted: false, reason: 'database_not_configured' });

  const claimed = await claimInterviewSession(id, resumeToken, session.user.id);
  if (!claimed) return NextResponse.json({ error: 'session_not_found_or_owned_by_another_account' }, { status: 403 });
  return NextResponse.json({ persisted: true, session: claimed });
}
