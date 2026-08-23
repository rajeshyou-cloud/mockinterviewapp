import { NextRequest, NextResponse } from 'next/server';
import { createInterviewSession, isDatabaseConfigured } from '../../../lib/db';

export async function POST(request: NextRequest) {
  const payload = await request.json() as { id?: string; technology?: string; difficulty?: string; currentIndex?: number };
  if (!payload.id || !payload.technology || !payload.difficulty) {
    return NextResponse.json({ error: 'id, technology and difficulty are required' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: 'database_not_configured' });
  }

  const session = await createInterviewSession({
    id: payload.id,
    technology: payload.technology,
    difficulty: payload.difficulty,
    currentIndex: payload.currentIndex,
  });
  return NextResponse.json({ persisted: true, session });
}
