import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { InterviewQuestion } from '../../../../../lib/api';
import { requireRole } from '../../../../../lib/auth/access';
import { getGovernedContentQuestion } from '../../../../../lib/governed-content-admin';
import { recordHumanReview, reviseQuestion } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function ContentQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireRole(['reviewer']);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let detail;
  try {
    detail = await getGovernedContentQuestion(id);
  } catch {
    return <main className="shell questionBankShell"><nav className="pageNav"><Link href="/admin/content">← Content Platform</Link></nav><section className="card analyticsSection"><h1>Governed question unavailable</h1><p className="lede">The governed schema has not been applied in this environment. JSON candidate reads remain unchanged.</p></section></main>;
  }
  if (!detail) notFound();
  const snapshot = detail.question.snapshot as InterviewQuestion;
  const nextMajor = `${Number(detail.question.version.split('.')[0]) + 1}.0.0`;

  return (
    <main className="shell questionBankShell">
      <nav className="pageNav"><Link href="/admin/content">← Content Platform</Link><Link href="/review">Pack review</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">QUESTION GOVERNANCE</p><h1>{snapshot.question}</h1><p className="lede"><code>{snapshot.id}</code> · {snapshot.technology} · {snapshot.topic}</p></div><div className="bankCount"><strong>v{String(detail.question.version)}</strong><span>{String(detail.question.review_status)} · {String(detail.question.publish_status)}</span></div></header>
      {query.saved && <p className="successBanner">The governed record was updated.</p>}
      {query.error && <p className="authError">Update failed: {query.error === 'conflict' ? 'the record changed; reload before retrying.' : 'check the submitted values and evidence.'}</p>}

      <section className="analyticsCards"><div className="card"><span>Evidence sources</span><strong>{detail.evidence.length}</strong></div><div className="card"><span>Review events</span><strong>{detail.reviews.length}</strong></div><div className="card"><span>Versions</span><strong>{detail.versions.length}</strong></div></section>

      <form className="card reviewDecision contentEditor" action={reviseQuestion}>
        <h2>New immutable revision</h2><p className="lede">Saving creates new question and benchmark versions, copies existing evidence, resets review to draft, and unpublishes the record.</p>
        <input name="id" type="hidden" value={snapshot.id} /><input name="baseVersion" type="hidden" value={String(detail.question.version)} />
        <div className="editorGrid"><label>Question version<input name="newVersion" required pattern="\d+\.\d+\.\d+" defaultValue={nextMajor} /></label><label>Benchmark version<input name="benchmarkVersion" required pattern="\d+\.\d+\.\d+" defaultValue={nextMajor} /></label></div>
        <label>Question<textarea name="prompt" required minLength={10} rows={3} defaultValue={snapshot.question} /></label>
        <label>Canonical answer<textarea name="canonicalAnswer" required minLength={20} rows={6} defaultValue={snapshot.benchmark.canonicalAnswer} /></label>
        <label>Expanded explanation<textarea name="expandedExplanation" required minLength={40} rows={8} defaultValue={snapshot.benchmark.expandedExplanation} /></label>
        <div className="editorGrid"><label>Required concepts, one per line<textarea name="requiredConcepts" required rows={7} defaultValue={snapshot.benchmark.requiredConcepts.join('\n')} /></label><label>Optional concepts, one per line<textarea name="optionalConcepts" rows={7} defaultValue={snapshot.benchmark.optionalConcepts.join('\n')} /></label></div>
        <label>Reasoning standard<textarea name="reasoning" required minLength={20} rows={5} defaultValue={snapshot.benchmark.reasoning} /></label>
        <fieldset><legend>Optional new official evidence source</legend><div className="editorGrid"><label>URL<input name="evidenceUrl" type="url" /></label><label>Title<input name="evidenceTitle" /></label><label>Section<input name="evidenceSection" /></label><label>Category<select name="evidenceCategory" defaultValue="overview"><option>overview</option><option>setup</option><option>security</option><option>monitoring</option><option>troubleshooting</option><option>quotas</option><option>best-practices</option><option>recovery</option><option>cost</option></select></label><label>Document version<input name="evidenceDocumentVersion" /></label><label>Retrieved date<input name="evidenceRetrievedAt" type="date" /></label></div><label>SHA-256 content hash<input name="evidenceContentHash" placeholder="sha256:…" /></label></fieldset>
        <label>Change summary<input name="changeSummary" required minLength={3} maxLength={1000} /></label><button className="primary" type="submit">Create draft revision</button>
      </form>

      <form className="card reviewDecision" action={recordHumanReview}><h2>Human review decision</h2><p className="lede">Approval requires current official, non-stale evidence and records the signed-in reviewer separately from AI review.</p><input name="id" type="hidden" value={snapshot.id} /><input name="baseVersion" type="hidden" value={String(detail.question.version)} /><label>Verdict<select name="verdict" defaultValue="approve"><option value="approve">Human verified</option><option value="reject">Reject</option></select></label><label>Review notes<textarea name="notes" rows={4} maxLength={2000} /></label><button className="primary" type="submit">Record human decision</button></form>

      <section className="card analyticsSection"><h2>Evidence</h2><div className="tableScroll"><table><thead><tr><th>Source</th><th>Category</th><th>Retrieved</th><th>Freshness</th></tr></thead><tbody>{detail.evidence.map((source) => <tr key={String(source.id)}><td><a href={String(source.url)} target="_blank" rel="noreferrer">{String(source.title)} ↗</a><br /><small>{String(source.section)}</small></td><td>{String(source.category)}</td><td>{new Date(String(source.retrieved_at)).toLocaleDateString()}</td><td>{source.stale_at ? 'stale' : 'current'}</td></tr>)}</tbody></table></div></section>
      <section className="card analyticsSection"><h2>Review history</h2><div className="tableScroll"><table><thead><tr><th>When</th><th>Kind</th><th>Status</th><th>Reviewer/model</th><th>Verdict</th></tr></thead><tbody>{detail.reviews.map((review) => <tr key={String(review.review_key)}><td>{new Date(String(review.reviewed_at)).toLocaleString()}</td><td>{String(review.review_kind)}</td><td>{String(review.status)}</td><td>{String(review.model ?? review.reviewer_user_id ?? review.provider ?? 'system')}</td><td>{String(review.verdict)}</td></tr>)}</tbody></table></div></section>
      <section className="card analyticsSection"><h2>Version history</h2><div className="tableScroll"><table><thead><tr><th>Question</th><th>Benchmark</th><th>Created</th><th>Summary</th><th>Hash</th></tr></thead><tbody>{detail.versions.map((version) => <tr key={String(version.version)}><td>{String(version.version)}</td><td>{String(version.benchmark_version)}</td><td>{new Date(String(version.created_at)).toLocaleString()}</td><td>{String(version.change_summary)}</td><td><code>{String(version.content_hash).slice(0, 20)}…</code></td></tr>)}</tbody></table></div></section>
    </main>
  );
}
