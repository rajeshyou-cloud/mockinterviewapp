import Link from 'next/link';

import { requirePlan, requireRole } from '../../lib/auth/access';
import { getRecruiterAnalytics } from '../../lib/db';

export const dynamic = 'force-dynamic';

export default async function RecruiterPage() {
  await requireRole(['recruiter']);
  await requirePlan('recruiter_pro');
  const analytics = await getRecruiterAnalytics();
  const totalSessions = analytics.summary.reduce((total, row) => total + Number(row.sessions), 0);
  const totalCandidates = new Set(analytics.sessions.map((session) => session.owner_user_id)).size;

  return (
    <main className="shell recruiterShell">
      <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/">Interview</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">RECRUITER WORKSPACE</p><h1>Candidate analytics</h1><p className="lede">Compare completed, account-linked interviews without exposing private resume credentials or answer text.</p></div></header>

      <section className="analyticsCards">
        <div className="card"><span>Completed sessions</span><strong>{totalSessions}</strong></div>
        <div className="card"><span>Unique candidates</span><strong>{totalCandidates}</strong></div>
        <div className="card"><span>Course-level cohorts</span><strong>{analytics.summary.length}</strong></div>
      </section>

      <section className="card analyticsSection">
        <h2>Course and level comparison</h2>
        <div className="tableScroll"><table><thead><tr><th>Course</th><th>Level</th><th>Sessions</th><th>Candidates</th><th>Average score</th></tr></thead><tbody>
          {analytics.summary.map((row) => <tr key={`${row.technology}-${row.difficulty}`}><td>{row.technology}</td><td>{row.difficulty}</td><td>{row.sessions}</td><td>{row.candidates}</td><td>{row.average_score ?? '—'}</td></tr>)}
        </tbody></table></div>
        {!analytics.summary.length && <p className="lede">No account-linked completed interviews are available yet.</p>}
      </section>

      <section className="card analyticsSection">
        <h2>Recent candidate comparison</h2>
        <div className="tableScroll"><table><thead><tr><th>Candidate ref</th><th>Course</th><th>Level</th><th>Score</th><th>Completed</th></tr></thead><tbody>
          {analytics.sessions.map((session) => <tr key={session.id}><td>{String(session.owner_user_id).slice(0, 8)}…</td><td>{session.technology}</td><td>{session.difficulty}</td><td>{session.total_score ?? '—'}</td><td>{session.completed_at ? new Date(session.completed_at).toLocaleString() : '—'}</td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}
