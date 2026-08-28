import Link from 'next/link';

import { requireRole } from '../../../../lib/auth/access';
import { listPublicationBatches } from '../../../../lib/publication-batches';
import { createBatch } from './actions';

export const dynamic = 'force-dynamic';

export default async function PublicationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(['reviewer']);
  const query = await searchParams;
  let batches;
  try {
    batches = await listPublicationBatches();
  } catch {
    batches = null;
  }
  if (!batches) return <main className="shell questionBankShell"><p>Publication database is not configured.</p></main>;
  return <main className="shell questionBankShell">
    <nav className="pageNav"><Link href="/admin/content">← Content Platform</Link><Link href="/admin">Administration</Link></nav>
    <header className="bankHeader"><div><p className="eyebrow">CONTROLLED RELEASES</p><h1>Publication batches</h1><p className="lede">Freeze exact verified question and benchmark versions, approve them, publish atomically, or roll back.</p></div></header>
    {query.error && <p className="authError">The batch action failed its validation or readiness gate.</p>}
    <form className="card reviewDecision contentEditor" action={createBatch}>
      <h2>Create batch</h2><div className="editorGrid"><label>Technology ID<input name="technologyId" required /></label><label>Batch name<input name="name" required /></label><label>Semantic version<input name="version" placeholder="1.0.0" required /></label></div>
      <label>Release notes<textarea name="releaseNotes" required /></label><label>Verified question IDs, one per line<textarea name="questionIds" required /></label>
      <button className="primary" type="submit">Create frozen batch</button>
    </form>
    <section className="card analyticsSection"><h2>Release history</h2><div className="tableScroll"><table><thead><tr><th>Batch</th><th>Technology</th><th>Status</th><th>Readiness</th><th>Published</th></tr></thead><tbody>{batches.map((batch) => <tr key={String(batch.id)}><td><Link href={`/admin/content/publication/${batch.id}`}>{String(batch.name)} v{String(batch.version)}</Link></td><td>{String(batch.technology_name)}</td><td>{String(batch.status)}</td><td>{Number(batch.ready_count)}/{Number(batch.item_count)}</td><td>{batch.published_at ? new Date(String(batch.published_at)).toLocaleString() : '—'}</td></tr>)}</tbody></table></div></section>
  </main>;
}
