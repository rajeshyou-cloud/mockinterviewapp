import Link from 'next/link';

import { requireRole } from '../../lib/auth/access';
import { listRoleAssignments } from '../../lib/db';
import { grantRole, revokeRole } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireRole(['admin']);
  const assignments = await listRoleAssignments();

  return (
    <main className="shell recruiterShell">
      <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/">Interview</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">ADMINISTRATION</p><h1>Access control</h1><p className="lede">Grant least-privilege reviewer, recruiter, or administrator access using the account ID shown on each user’s account page.</p></div></header>
      <form className="card roleForm" action={grantRole}>
        <label>Account ID<input name="userId" required minLength={4} maxLength={200} /></label>
        <label>Role<select name="role" defaultValue="reviewer"><option value="candidate">Candidate</option><option value="reviewer">Reviewer</option><option value="recruiter">Recruiter</option><option value="admin">Administrator</option></select></label>
        <button className="primary" type="submit">Grant role</button>
      </form>
      <section className="card analyticsSection">
        <h2>Current assignments</h2>
        <div className="tableScroll"><table><thead><tr><th>Account ID</th><th>Role</th><th>Granted</th><th>Action</th></tr></thead><tbody>
          {assignments.map((item) => <tr key={`${item.user_id}-${item.role}`}><td><code>{item.user_id}</code></td><td>{item.role}</td><td>{new Date(item.granted_at).toLocaleString()}</td><td><form action={revokeRole}><input name="userId" type="hidden" value={item.user_id} /><input name="role" type="hidden" value={item.role} /><button className="secondary" type="submit">Revoke</button></form></td></tr>)}
        </tbody></table></div>
        {!assignments.length && <p className="lede">No application roles are assigned.</p>}
      </section>
    </main>
  );
}
