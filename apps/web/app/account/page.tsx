import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth/server';
import { getUserRoles, listUserInterviewSessions } from '../../lib/db';
import { deleteAccount, signOut } from '../auth/actions';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ access?: string; delete?: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');
  const query = await searchParams;
  const sessions = await listUserInterviewSessions(session.user.id);
  const roles = await getUserRoles(session.user.id);

  return (
    <main className="shell accountShell">
      <nav className="pageNav"><Link href="/">← Interview</Link><Link href="/questions">Question Bank</Link></nav>
      <section className="card accountCard">
        <p className="eyebrow">SECURE ACCOUNT</p>
        <h1>{session.user.name || 'Your account'}</h1>
        <p className="lede">Signed in as {session.user.email}.</p>
        <p className="accountIdentity">Account ID: <code>{session.user.id}</code></p>
        {query.access === 'denied' && <p className="authError">Your account does not have access to that staff area.</p>}
        <div className="accountActions">
          <form action={signOut}><button className="secondary" type="submit">Sign out</button></form>
          {(roles.includes('reviewer') || roles.includes('admin')) && <Link className="secondaryLink" href="/review">Review courses</Link>}
          {(roles.includes('recruiter') || roles.includes('admin')) && <Link className="secondaryLink" href="/recruiter">Recruiter analytics</Link>}
          {roles.includes('admin') && <Link className="secondaryLink" href="/admin">Manage access</Link>}
        </div>
        <section className="accountHistory">
          <h2>Interview history</h2>
          {sessions.length ? sessions.map((item) => (
            <Link className="accountSession" href={`/account/sessions/${item.id}`} key={item.id}>
              <span>{item.technology} · {item.difficulty}</span>
              <strong>{item.status === 'completed' && item.total_score !== null ? `${item.total_score}/10` : item.status.replace('_', ' ')}</strong>
              <small>{new Date(item.started_at).toLocaleString()}</small>
            </Link>
          )) : <p className="lede">Sign in before starting an interview to add it to this history.</p>}
        </section>
        <details className="dangerZone">
          <summary>Delete account</summary>
          <p>This permanently removes your login identity. Type DELETE to confirm.</p>
          {query.delete === 'failed' && <p className="authError">The account could not be deleted. Please try again.</p>}
          <form action={deleteAccount}>
            <label>Confirmation<input name="confirmation" required pattern="DELETE" autoComplete="off" /></label>
            <button className="dangerButton" type="submit">Delete my account</button>
          </form>
        </details>
      </section>
    </main>
  );
}
