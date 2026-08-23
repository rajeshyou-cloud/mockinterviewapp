import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireUser } from '../../../../lib/auth/access';
import { getOwnedInterviewSession } from '../../../../lib/db';
import { findQuestion } from '../../../../lib/question-bank';
import { sessionIdSchema } from '../../../../lib/persistence-validation';

export const dynamic = 'force-dynamic';

export default async function AccountSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!sessionIdSchema.safeParse(id).success) notFound();
  const replay = await getOwnedInterviewSession(id, user.id);
  if (!replay) notFound();

  return (
    <main className="shell replayShell">
      <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/">Interview</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">ACCOUNT INTERVIEW HISTORY</p><h1>{replay.session.technology} replay</h1><p className="lede">{replay.session.difficulty} · {replay.session.status.replace('_', ' ')} · {new Date(replay.session.started_at).toLocaleString()}</p></div></header>
      <div className="replayTimeline">
        {replay.answers.map((answer, index) => {
          const question = findQuestion(answer.question_id);
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
      </div>
    </main>
  );
}
