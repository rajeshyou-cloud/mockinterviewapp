import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireRole } from '../../../../../lib/auth/access';
import { getPublicationBatch, listPublicationBatches } from '../../../../../lib/publication-batches';
import { rollbackBatch, transitionBatch } from '../actions';

export const dynamic = 'force-dynamic';

export default async function BatchDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(['reviewer']);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let detail;
  let allBatches;
  try {
    [detail, allBatches] = await Promise.all([getPublicationBatch(id), listPublicationBatches()]);
  } catch {
    return <main className="shell questionBankShell"><nav className="pageNav"><Link href="/admin/content/publication">← Publication batches</Link></nav><section className="card analyticsSection"><h1>Publication database unavailable</h1><p className="lede">The governed schema has not been applied in this environment. No release decision was changed.</p></section></main>;
  }
  if (!detail) notFound();
  const batch = detail.batch;
  const targets = (allBatches ?? []).filter((item) => item.technology_id === batch.technology_id && item.id !== batch.id && ['approved', 'retired'].includes(String(item.status)));
  return <main className="shell questionBankShell">
    <nav className="pageNav"><Link href="/admin/content/publication">← Publication batches</Link><Link href="/admin/content">Content</Link></nav>
    <header className="bankHeader"><div><p className="eyebrow">{String(batch.status).toUpperCase()}</p><h1>{String(batch.name)} v{String(batch.version)}</h1><p className="lede">{String(batch.release_notes)}</p></div><div className="bankCount"><strong>{detail.items.length}</strong><span>frozen items</span></div></header>
    {query.saved && <p className="successBanner">Batch decision recorded.</p>}{query.error && <p className="authError">Transition blocked. Recheck current status, versions, and review readiness.</p>}
    <form className="card reviewDecision" action={transitionBatch}><input type="hidden" name="id" value={id} /><label>Decision<select name="action"><option value="mark-ready">Mark ready</option><option value="approve">Approve</option><option value="publish">Publish</option><option value="unpublish">Unpublish</option><option value="retire">Retire</option></select></label><label>Reason<textarea name="reason" required /></label><button className="primary" type="submit">Record decision</button></form>
    {String(batch.status) === 'published' && targets.length > 0 && <form className="card reviewDecision" action={rollbackBatch}><h2>Rollback</h2><input type="hidden" name="currentBatchId" value={id} /><label>Restore batch<select name="targetBatchId">{targets.map((target) => <option key={String(target.id)} value={String(target.id)}>{String(target.name)} v{String(target.version)}</option>)}</select></label><label>Rollback reason<textarea name="reason" required /></label><button className="secondary" type="submit">Rollback release</button></form>}
    <section className="card analyticsSection"><h2>Launch checklist</h2><ul><li>{detail.items.length > 0 ? '✓' : '✗'} Batch contains items</li><li>{detail.items.every((item) => ['ai-evidence-verified', 'human-verified'].includes(String(item.review_status)) && ['ai-evidence-verified', 'human-verified'].includes(String(item.benchmark_review_status))) ? '✓' : '✗'} Every question and benchmark remains verified</li><li>{detail.items.every((item) => item.question_version === item.current_question_version && item.benchmark_version === item.current_benchmark_version) ? '✓' : '✗'} Frozen versions remain current</li><li>Manual smoke test and release-owner sign-off must be captured in the decision reason.</li></ul></section>
    <section className="card analyticsSection"><h2>Items</h2><div className="tableScroll"><table><thead><tr><th>Question</th><th>Question version</th><th>Benchmark version</th><th>Review</th></tr></thead><tbody>{detail.items.map((item) => <tr key={String(item.question_id)}><td><Link href={`/admin/content/questions/${item.question_id}`}>{String(item.question_id)}</Link><br />{String(item.prompt)}</td><td>{String(item.question_version)}</td><td>{String(item.benchmark_version)}</td><td>{String(item.review_status)}</td></tr>)}</tbody></table></div></section>
    <section className="card analyticsSection"><h2>Decision audit</h2><div className="tableScroll"><table><thead><tr><th>When</th><th>Decision</th><th>Actor</th><th>Reason</th></tr></thead><tbody>{detail.decisions.map((decision) => <tr key={String(decision.id)}><td>{new Date(String(decision.decided_at)).toLocaleString()}</td><td>{String(decision.decision)}</td><td>{String(decision.decided_by)}</td><td>{String(decision.reason)}</td></tr>)}</tbody></table></div></section>
  </main>;
}
