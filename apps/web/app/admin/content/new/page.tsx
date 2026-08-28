import Link from 'next/link';

import { requireRole } from '../../../../lib/auth/access';
import { createQuestion } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewContentQuestionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(['reviewer']);
  const query = await searchParams;
  return (
    <main className="shell questionBankShell">
      <nav className="pageNav"><Link href="/admin/content">← Content Platform</Link><Link href="/review">Pack review</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">EVIDENCE-FIRST AUTHORING</p><h1>Create a governed draft</h1><p className="lede">A new question starts unpublished and draft. An official source and content hash are mandatory before the record enters review.</p></div></header>
      {query.error && <p className="authError">The draft could not be created. Check every field, stable ID, official host, and content hash.</p>}
      <form className="card reviewDecision contentEditor" action={createQuestion}>
        <div className="editorGrid"><label>Stable question ID<input name="id" required pattern="[a-z0-9][a-z0-9-]{2,199}" placeholder="candidate-aws-topic-151" /></label><label>Technology<select name="technology" required><option value="snowflake">Snowflake</option><option value="informatica">Informatica</option><option value="databricks">Databricks</option><option value="oracle">Oracle Database</option><option value="power-bi">Power BI</option><option value="python">Python</option><option value="aws">AWS</option></select></label><label>Topic slug<input name="topic" required pattern="[a-z0-9][a-z0-9-]{1,99}" /></label><label>Topic name<input name="topicName" required minLength={2} /></label><label>Difficulty<select name="difficulty"><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label>Question type<select name="type"><option>conceptual</option><option>scenario</option><option>troubleshooting</option><option>design</option><option>hands-on</option></select></label></div>
        <label>Question<textarea name="prompt" required minLength={10} rows={3} /></label><label>Canonical answer<textarea name="canonicalAnswer" required minLength={20} rows={6} /></label><label>Expanded explanation<textarea name="expandedExplanation" required minLength={40} rows={8} /></label>
        <div className="editorGrid"><label>Required concepts, one per line<textarea name="requiredConcepts" required rows={7} /></label><label>Optional concepts, one per line<textarea name="optionalConcepts" rows={7} /></label></div><label>Reasoning standard<textarea name="reasoning" required minLength={20} rows={5} /></label>
        <fieldset><legend>Scoring anchors</legend><label>Strong<textarea name="strong" required minLength={20} rows={3} /></label><label>Partial<textarea name="partial" required minLength={20} rows={3} /></label><label>Weak<textarea name="weak" required minLength={20} rows={3} /></label><label>Incorrect<textarea name="incorrect" required minLength={20} rows={3} /></label></fieldset>
        <fieldset><legend>Official evidence</legend><div className="editorGrid"><label>URL<input name="evidenceUrl" type="url" required /></label><label>Title<input name="evidenceTitle" required minLength={2} /></label><label>Section<input name="evidenceSection" required minLength={2} /></label><label>Category<select name="evidenceCategory"><option>overview</option><option>setup</option><option>security</option><option>monitoring</option><option>troubleshooting</option><option>quotas</option><option>best-practices</option><option>recovery</option><option>cost</option></select></label><label>Document version<input name="evidenceDocumentVersion" /></label><label>Retrieved date<input name="evidenceRetrievedAt" type="date" required /></label></div><label>SHA-256 content hash<input name="evidenceContentHash" required pattern="sha256:[a-f0-9]{64}" placeholder="sha256:…" /></label></fieldset>
        <button className="primary" type="submit">Create unpublished draft</button>
      </form>
    </main>
  );
}
