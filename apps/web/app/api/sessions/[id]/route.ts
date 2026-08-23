import { NextResponse } from 'next/server';
import { getInterviewSession, isDatabaseConfigured } from '../../../../lib/db';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }
  const data = await getInterviewSession(id);
  if (!data) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  return NextResponse.json({ persisted: true, ...data });
}
