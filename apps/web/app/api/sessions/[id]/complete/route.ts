import { NextRequest, NextResponse } from 'next/server';
import { completeInterviewSession, isDatabaseConfigured } from '../../../../../lib/db';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json() as { totalScore?: number };
  if (typeof payload.totalScore !== 'number') {
    return NextResponse.json({ error: 'totalScore is required' }, { status: 400 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }
  const session = await completeInterviewSession(id, payload.totalScore);
  return NextResponse.json({ persisted: true, session });
}
