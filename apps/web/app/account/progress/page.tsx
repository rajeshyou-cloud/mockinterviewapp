import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '../../../lib/auth/server';
import { getCandidateLearningProgress } from '../../../lib/db';

export const dynamic = 'force-dynamic';

function status(score: number) {
  return score >= 70 ? 'strong' : score >= 40 ? 'developing' : 'gap';
}

export default async function ProgressPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');
  let unavailable = false;
  let progress;
  try {
    progress = await getCandidateLearningProgress(session.user.id);
  } catch {
    unavailable = true;
    progress = { topics: [], history: [], recommendations: [] };
  }
  const completedScores = progress.history.map((item) => Number(item.total_score)).filter(Number.isFinite);
  const overall = completedScores.length ? Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length) : null;
  const progression = overall === null ? 'Complete an interview to calibrate your starting level.' : overall >= 75 ? 'Progress one difficulty level, prioritizing scenarios.' : overall >= 50 ? 'Stay at this level and close the weakest topics.' : 'Step down one level and rebuild required concepts.';
  return <main className="shell questionBankShell">
    <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/">Practice</Link></nav>
    <header className="bankHeader"><div><p className="eyebrow">JOB-READINESS MAP</p><h1>Your learning progress</h1><p className="lede">Topic coverage, score history, and next practice are derived only from your account-linked interview attempts.</p></div><div className="bankCount"><strong>{overall ?? '—'}</strong><span>average score</span></div></header>
    {unavailable && <section className="card analyticsSection"><h2>Governed progress is not available yet</h2><p className="lede">The governed database migration remains pending. Your interview and account data are unchanged.</p></section>}
    <section className="card analyticsSection"><h2>Difficulty progression</h2><p>{progression}</p></section>
    <section className="analyticsCards" aria-label="Topic coverage">{progress.topics.map((topic) => <article className={`card topicCard ${status(Number(topic.average_score))}`} key={`${topic.technology}-${topic.topic}`}><span>{String(topic.technology)} · {String(topic.topic)}</span><strong>{Number(topic.average_score)}/100</strong><small>{Number(topic.attempts)} attempts · {status(Number(topic.average_score))}</small></article>)}</section>
    {!progress.topics.length && <section className="card emptyResults"><h2>No topic history yet</h2><p>Complete an account-linked interview to build your coverage map.</p></section>}
    <section className="card analyticsSection"><h2>Recommended next practice</h2><p className="lede">Unanswered published questions from weak topics, with scenarios and troubleshooting prioritized.</p><div className="tableScroll"><table><thead><tr><th>Technology</th><th>Topic</th><th>Level</th><th>Path</th><th>Question</th></tr></thead><tbody>{progress.recommendations.map((question) => <tr key={String(question.id)}><td>{String(question.technology_id)}</td><td>{String(question.topic)}</td><td>{String(question.difficulty)}</td><td>{String(question.question_type)}</td><td>{String(question.prompt)}</td></tr>)}</tbody></table></div>{!progress.recommendations.length && <p>No governed recommendation is available yet. Published-batch gates may still be pending.</p>}<Link className="secondaryLink" href="/">Start recommended-level practice →</Link></section>
    <section className="card analyticsSection"><h2>Recruiter-style summary</h2><p>{progress.topics.filter((topic) => Number(topic.average_score) >= 70).length} demonstrated topic strengths; {progress.topics.filter((topic) => Number(topic.average_score) < 50).length} priority development areas. This is practice evidence, not an employment decision.</p></section>
    <section className="card analyticsSection"><h2>Score history</h2><div className="tableScroll"><table><thead><tr><th>Completed</th><th>Technology</th><th>Level</th><th>Score</th></tr></thead><tbody>{progress.history.map((item) => <tr key={String(item.id)}><td>{item.completed_at ? new Date(String(item.completed_at)).toLocaleString() : '—'}</td><td>{String(item.technology)}</td><td>{String(item.difficulty)}</td><td>{String(item.total_score)}/100</td></tr>)}</tbody></table></div></section>
  </main>;
}
