import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth/server';
import { signOut } from '../auth/actions';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');

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
      </section>
    </main>
  );
}
