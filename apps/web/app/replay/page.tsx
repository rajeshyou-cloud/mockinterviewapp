'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { InterviewQuestion, RemoteSessionResponse } from '../../lib/api';
import { fetchQuestions, fetchRemoteSession } from '../../lib/api';
import { getResumeKey, loadSession, parseResumeKey } from '../../lib/session';

export default function ReplayPage() {
  const [resumeKey, setResumeKey] = useState('');
  const [replay, setReplay] = useState<RemoteSessionResponse | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const local = loadSession();
    if (local) setResumeKey(getResumeKey(local));
  }, []);

  const questionsById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);

  async function loadReplay(event: FormEvent) {
    event.preventDefault();
    const parsed = parseResumeKey(resumeKey);
    if (!parsed) {
      setError('Enter a valid private resume key beginning with v1:.');
      return;
    }

    setLoading(true);
    setError('');
    setReplay(null);
    try {
      const session = await fetchRemoteSession(parsed.id, parsed.resumeToken);
      const bank = await fetchQuestions(session.session.technology, session.session.difficulty, parsed.id, 20);
      setReplay(session);
      setQuestions(bank);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Replay could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell replayShell">
      <nav className="pageNav"><Link href="/">← Interview</Link><Link href="/questions">Question Bank</Link></nav>
      <header className="bankHeader">
        <div><p className="eyebrow">PRIVATE SESSION HISTORY</p><h1>Interview replay</h1><p className="lede">Review every submitted answer, score, concept match, and feedback item using your private resume key.</p></div>
      </header>

      <form className="card replayLookup" onSubmit={loadReplay}>
        <label>Private resume key<input value={resumeKey} onChange={(event) => setResumeKey(event.target.value)} placeholder="v1:session-id:private-token" required /></label>
        <button className="primary" type="submit" disabled={loading}>{loading ? 'Loading…' : 'Load replay'}</button>
        {error && <p className="authError" role="alert">{error}</p>}
      </form>

      {replay && (
        <section className="replayResults">
          <div className="card replaySummary">
            <div><span>Course</span><strong>{replay.session.technology}</strong></div>
            <div><span>Level</span><strong>{replay.session.difficulty}</strong></div>
            <div><span>Status</span><strong>{replay.session.status.replace('_', ' ')}</strong></div>
            <div><span>Answers</span><strong>{replay.answers.length}</strong></div>
          </div>
          <div className="replayTimeline">
            {replay.answers.map((answer, index) => {
              const question = questionsById.get(answer.question_id);
              return (
                <article className="card replayItem" key={answer.question_id}>
                  <div className="questionMeta"><span>Answer {index + 1}</span><span>{new Date(answer.answered_at).toLocaleString()}</span></div>
                  <h2>{question?.question ?? answer.question_id}</h2>
                  <div className="replayScore">{answer.score}/10</div>
                  <h3>Your answer</h3><p>{answer.answer_text}</p>
                  <h3>Feedback</h3><p>{answer.feedback}</p>
                  <div className="conceptColumns">
                    <div><strong>Matched</strong><div className="concepts">{answer.matched_concepts.map((concept) => <span className="matched" key={concept}>{concept}</span>)}</div></div>
                    <div><strong>Missing</strong><div className="concepts">{answer.missing_concepts.map((concept) => <span key={concept}>{concept}</span>)}</div></div>
                  </div>
                </article>
              );
            })}
            {!replay.answers.length && <div className="card emptyResults"><h2>No submitted answers yet.</h2><p>Return to the interview and submit an answer to build the replay.</p></div>}
          </div>
        </section>
      )}
    </main>
  );
}
