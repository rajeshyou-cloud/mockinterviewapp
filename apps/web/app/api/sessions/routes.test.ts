import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(),
  createInterviewSession: vi.fn(),
  getInterviewSession: vi.fn(),
  saveInterviewAnswer: vi.fn(),
  completeInterviewSession: vi.fn(),
}));

vi.mock('../../../lib/db', () => db);

import { GET as getSession } from './[id]/route';
import { POST as saveAnswer } from './[id]/answers/route';
import { POST as completeSession } from './[id]/complete/route';
import { POST as createSession } from './route';

const id = 'c102a5cd-b19d-4c54-8fa6-167573b4247c';
const token = 'a'.repeat(64);
const context = { params: Promise.resolve({ id }) };

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.isDatabaseConfigured.mockReturnValue(true);
});

describe('session persistence routes', () => {
  it('requires a resume credential before creating a session', async () => {
    const response = await createSession(request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ id, technology: 'snowflake', difficulty: 'beginner' }),
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'resume_token_required' });
  });

  it('creates a session with the credential passed only to the server adapter', async () => {
    db.createInterviewSession.mockResolvedValue({ id });
    const response = await createSession(request('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({ id, technology: 'snowflake', difficulty: 'beginner', currentIndex: 2 }),
    }));

    expect(response.status).toBe(200);
    expect(db.createInterviewSession).toHaveBeenCalledWith({
      id,
      resumeToken: token,
      technology: 'snowflake',
      difficulty: 'beginner',
      currentIndex: 2,
    });
  });

  it('rejects malformed JSON and invalid session fields before touching Neon', async () => {
    const malformed = await createSession(request('/api/sessions', {
      method: 'POST', headers: { 'x-resume-token': token }, body: '{',
    }));
    const invalid = await createSession(request('/api/sessions', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({ id: 'not-a-uuid', technology: 'oracle', difficulty: 'expert', currentIndex: 500 }),
    }));

    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(db.createInterviewSession).not.toHaveBeenCalled();
  });

  it('keeps local fallback behavior when Neon is not configured', async () => {
    db.isDatabaseConfigured.mockReturnValue(false);
    const response = await createSession(request('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({ id, technology: 'snowflake', difficulty: 'beginner' }),
    }));

    expect(await response.json()).toEqual({ persisted: false, reason: 'database_not_configured' });
    expect(db.createInterviewSession).not.toHaveBeenCalled();
  });

  it('reads a complete session only with its resume credential', async () => {
    db.getInterviewSession.mockResolvedValue({ session: { id }, answers: [] });
    const response = await getSession(request(`/api/sessions/${id}`, {
      headers: { 'x-resume-token': token },
    }), context);

    expect(response.status).toBe(200);
    expect(db.getInterviewSession).toHaveBeenCalledWith(id, token);
    expect(await response.json()).toMatchObject({ persisted: true, session: { id }, answers: [] });
  });

  it('persists an answer and current progress through the authorized route', async () => {
    db.saveInterviewAnswer.mockResolvedValue({ question_id: 'snowflake-architecture-001' });
    const response = await saveAnswer(request(`/api/sessions/${id}/answers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({
        questionId: 'snowflake-architecture-001', answerText: 'An answer', score: 80,
        matchedConcepts: ['storage'], missingConcepts: ['compute'], feedback: 'Good', currentIndex: 1,
      }),
    }), context);

    expect(response.status).toBe(200);
    expect(db.saveInterviewAnswer).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: id, resumeToken: token, questionId: 'snowflake-architecture-001', currentIndex: 1,
    }));
  });

  it('rejects oversized answers, unknown questions and client-invented concepts', async () => {
    const oversized = await saveAnswer(request(`/api/sessions/${id}/answers`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({ questionId: 'snowflake-architecture-001', answerText: 'x'.repeat(12_001), score: 80 }),
    }), context);
    const unknown = await saveAnswer(request(`/api/sessions/${id}/answers`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({ questionId: 'invented-question', answerText: 'answer', score: 80 }),
    }), context);
    const inventedConcept = await saveAnswer(request(`/api/sessions/${id}/answers`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({
        questionId: 'snowflake-architecture-001', answerText: 'answer', score: 80,
        matchedConcepts: ['attacker-controlled-concept'],
      }),
    }), context);

    expect(oversized.status).toBe(400);
    expect(unknown.status).toBe(404);
    expect(inventedConcept.status).toBe(400);
    expect(db.saveInterviewAnswer).not.toHaveBeenCalled();
  });

  it('rejects invalid session IDs and out-of-range completion scores', async () => {
    const invalidContext = { params: Promise.resolve({ id: 'not-a-uuid' }) };
    const badId = await getSession(request('/api/sessions/not-a-uuid', {
      headers: { 'x-resume-token': token },
    }), invalidContext);
    const badScore = await completeSession(request(`/api/sessions/${id}/complete`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-resume-token': token },
      body: JSON.stringify({ totalScore: 101 }),
    }), context);

    expect(badId.status).toBe(400);
    expect(badScore.status).toBe(400);
    expect(db.completeInterviewSession).not.toHaveBeenCalled();
  });

  it('does not claim success when the session credential is rejected', async () => {
    db.completeInterviewSession.mockResolvedValue(undefined);
    const response = await completeSession(request(`/api/sessions/${id}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-resume-token': 'b'.repeat(64) },
      body: JSON.stringify({ totalScore: 76 }),
    }), context);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'session_not_found_or_unauthorized' });
  });
});
