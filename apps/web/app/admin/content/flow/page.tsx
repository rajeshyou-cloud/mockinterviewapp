import Link from 'next/link';

import { requireRole } from '../../../../lib/auth/access';
import { getProjectFlowDashboard } from '../../../../lib/project-flow-dashboard';

export const dynamic = 'force-dynamic';

const schemaEntities = [
  ['technologies', 'Technology catalogue'], ['topics', 'Topic taxonomy'], ['questions', 'Stable question identity'],
  ['benchmark_answers', 'Scoring standard'], ['evidence_sources', 'Official source versions'], ['question_evidence_links', 'Claims to evidence'],
  ['question_reviews', 'Static, AI and human audit'], ['question_versions', 'Immutable snapshots'],
  ['publication_batches', 'Controlled releases'], ['publication_batch_items', 'Frozen release membership'],
  ['publication_batch_decisions', 'Append-only decisions'],
];

const creationSteps = [
  ['1', 'Evidence first', 'Select specific official documentation and capture its version, retrieval date and content hash.'],
  ['2', 'Create a draft', 'Author the question and benchmark together. Stable identity is preserved; the record starts unpublished.'],
  ['3', 'Run static checks', 'Detect duplicates, generic answers, missing concepts, weak evidence and broken links before using paid reviewers.'],
  ['4', 'Independent review', 'Two different AI models must both approve, or a named human reviewer must approve. Disputes return to remediation.'],
  ['5', 'Freeze a release', 'A publication batch records the exact question and benchmark versions plus release notes and approval history.'],
  ['6', 'Serve candidates', 'Candidate APIs expose only verified exact versions in the active published batch; stale content fails closed.'],
];

function percentage(value: number, total: number) {
  return total ? Math.round(100 * value / total) : 0;
}

export default async function ProjectFlowPage() {
  await requireRole(['reviewer']);
  const data = await getProjectFlowDashboard();
  return <main className="shell flowDashboardShell">
    <nav className="pageNav"><Link href="/admin/content">← Content Platform</Link><Link href="/admin/content/publication">Publication batches</Link></nav>
    <header className="flowHero"><div><p className="eyebrow">STAKEHOLDER VIEW</p><h1>How governed content moves from evidence to candidates</h1><p className="lede">A single view of the operating process, current question states, review bottlenecks, evidence coverage, and controlled releases.</p></div><div className={`flowSource ${data.source}`}><strong>{data.source === 'governed-database' ? 'Governed database' : 'Transition snapshot'}</strong><span>{data.source === 'governed-database' ? 'Live normalized governance data' : 'JSON source while the main migration is pending'}</span></div></header>

    <section className="flowKpis" aria-label="Platform totals">
      <div><span>Questions</span><strong>{data.totals.questions.toLocaleString()}</strong><small>stable identities</small></div>
      <div><span>Technologies</span><strong>{data.totals.technologies}</strong><small>{data.totals.topics} governed topics</small></div>
      <div><span>Evidence</span><strong>{data.totals.evidenceLinks.toLocaleString()}</strong><small>{data.totals.evidenceSources.toLocaleString()} source versions</small></div>
      <div><span>Audit records</span><strong>{data.totals.reviewRecords.toLocaleString()}</strong><small>review decisions</small></div>
      <div><span>Release batches</span><strong>{data.totals.publicationBatches}</strong><small>{data.totals.legacyReleased} legacy released</small></div>
    </section>

    <section className="card flowSection"><div className="flowSectionHeading"><div><p className="eyebrow">THE GOVERNANCE FUNNEL</p><h2>Question lifecycle</h2></div><p>{data.bottleneck}</p></div><ol className="flowPipeline">{data.lifecycle.map((stage, index) => <li key={stage.key}><span className="flowStep">{index + 1}</span><strong>{stage.label}</strong><b>{stage.count.toLocaleString()}</b><small>{percentage(stage.count, data.totals.questions)}% of all questions</small><p>{stage.explanation}</p></li>)}</ol></section>

    <section className="flowTwoColumn">
      <div className="card flowSection"><p className="eyebrow">CURRENT INVENTORY</p><h2>Questions by lifecycle state</h2><div className="statusDistribution" aria-label="Question status distribution">{data.statuses.map((row) => <div key={String(row.status)}><div><span>{String(row.status).replaceAll('-', ' ')}</span><strong>{Number(row.count).toLocaleString()}</strong></div><div className="statusTrack"><span style={{ width: `${percentage(Number(row.count), data.totals.questions)}%` }} /></div><small>{percentage(Number(row.count), data.totals.questions)}%</small></div>)}</div></div>
      <div className="card flowSection"><p className="eyebrow">IMPLEMENTATION MAP</p><h2>What the system stores</h2><div className="schemaEntityGrid">{schemaEntities.map(([entity, meaning]) => <div key={entity}><code>{entity}</code><span>{meaning}</span></div>)}</div><p className="flowContract">The database records identities, evidence, reviews, immutable versions and publication decisions separately so no status label can replace its underlying proof.</p></div>
    </section>

    <section className="card flowSection"><p className="eyebrow">HOW CONTENT IS MADE</p><h2>Creation and release process</h2><ol className="creationFlow">{creationSteps.map(([number, title, description]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol></section>

    <section className="card flowSection"><div className="flowSectionHeading"><div><p className="eyebrow">PORTFOLIO VIEW</p><h2>Technology pipeline</h2></div><span>Evidence is a count of linked source records, not a quality claim.</span></div><div className="tableScroll"><table><thead><tr><th>Technology</th><th>Total</th><th>Draft</th><th>AI verified</th><th>Human verified</th><th>Evidence links</th><th>Verified progress</th></tr></thead><tbody>{data.technologies.map((row) => { const verified = Number(row.verified) + Number(row.human); return <tr key={String(row.technology)}><td><strong>{String(row.technology)}</strong></td><td>{Number(row.total)}</td><td>{Number(row.draft)}</td><td>{Number(row.verified)}</td><td>{Number(row.human)}</td><td>{Number(row.evidence)}</td><td><div className="inlineProgress"><span style={{ width: `${percentage(verified, Number(row.total))}%` }} /></div><small>{percentage(verified, Number(row.total))}%</small></td></tr>; })}</tbody></table></div></section>

    <section className="flowTwoColumn">
      <div className="card flowSection"><p className="eyebrow">SOURCE COVERAGE</p><h2>Evidence categories</h2><ul className="metricList">{data.evidenceCategories.map((row) => <li key={String(row.category)}><span>{String(row.category).replaceAll('-', ' ')}</span><strong>{Number(row.count).toLocaleString()}</strong></li>)}</ul></div>
      <div className="card flowSection"><p className="eyebrow">REVIEW OPERATIONS</p><h2>Provider throughput</h2>{data.reviewers.length ? <ul className="metricList">{data.reviewers.map((row) => <li key={`${row.provider}-${row.model}`}><span>{String(row.provider)} · {String(row.model)}</span><strong>{Number(row.approvals)}/{Number(row.reviews)} approved</strong><small>{row.approval_rate === null ? 'No approval rate yet' : `${String(row.approval_rate)}% approval`} · {row.estimated_cost_cents === null ? 'cost not configured' : `${String(row.estimated_cost_cents)}¢ estimated`}</small></li>)}</ul> : <p className="flowEmpty">Provider/model statistics appear here after the governed review ledger is active. Existing labels remain unchanged.</p>}</div>
    </section>

    <section className="card flowSection"><div className="flowSectionHeading"><div><p className="eyebrow">CONTROLLED DELIVERY</p><h2>Publication readiness</h2></div><Link className="secondaryLink" href="/admin/content/publication">Manage batches →</Link></div>{data.batches.length ? <div className="tableScroll"><table><thead><tr><th>Batch</th><th>Technology</th><th>Status</th><th>Frozen items</th><th>Published</th></tr></thead><tbody>{data.batches.map((batch) => <tr key={String(batch.id)}><td>{String(batch.name)} v{String(batch.version)}</td><td>{String(batch.technology)}</td><td>{String(batch.status)}</td><td>{Number(batch.items)}</td><td>{batch.published_at ? new Date(String(batch.published_at)).toLocaleString() : '—'}</td></tr>)}</tbody></table></div> : <div className="flowEmpty"><strong>No governed publication batch is live.</strong><p>This is expected until the main migration, complete verified reviews, batch approval and launch checklist all succeed. Current candidate access remains protected by the existing release gate.</p></div>}</section>
  </main>;
}
