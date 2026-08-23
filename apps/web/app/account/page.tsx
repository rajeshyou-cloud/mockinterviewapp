import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth/server';
import { deleteAccount, signOut } from '../auth/actions';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');
  const query = await searchParams;

  return (
    <main className="shell accountShell">
      <nav className="pageNav"><Link href="/">← Interview</Link><Link href="/questions">Question Bank</Link></nav>
      <section className="card accountCard">
        <p className="eyebrow">SECURE ACCOUNT</p>
        <h1>{session.user.name || 'Your account'}</h1>
        <p className="lede">Signed in as {session.user.email}.</p>
        <div className="accountActions">
          <form action={signOut}><button className="secondary" type="submit">Sign out</button></form>
        </div>
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
