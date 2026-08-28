import Link from 'next/link';

import { requireRole } from '../../../lib/auth/access';
import {
  GovernedContentDatabaseUnavailableError,
  listGovernedContent,
  type ContentAdminFilters,
} from '../../../lib/governed-content-admin';
import { bulkQuestionAction } from './actions';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const value = (input: string | string[] | undefined) => typeof input === 'string' ? input : '';

function queryHref(raw: Search, page: number) {
  const query = new URLSearchParams();
  for (const [key, current] of Object.entries(raw)) if (typeof current === 'string' && current && key !== 'page') query.set(key, current);
  query.set('page', String(page));
  return `/admin/content?${query.toString()}`;
}

export default async function ContentAdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole(['reviewer']);
  const raw = await searchParams;
  const filters: ContentAdminFilters = {
    technology: value(raw.technology),
    topic: value(raw.topic),
    difficulty: value(raw.difficulty),
    type: value(raw.type),
    reviewStatus: value(raw.reviewStatus),
    publishStatus: value(raw.publishStatus),
    query: value(raw.q),
    page: Number.parseInt(value(raw.page), 10) || 1,
  };
  let data;
  try {
    data = await listGovernedContent(filters);
  } catch (error) {
    if (!(error instanceof GovernedContentDatabaseUnavailableError)) throw error;
    return <main className="shell questionBankShell"><nav className="pageNav"><Link href="/admin">← Administration</Link><Link href="/">Interview</Link></nav><section className="card analyticsSection"><h1>Content Platform unavailable</h1><p className="lede">The governed database is not configured in this environment. JSON candidate reads remain unchanged.</p></section></main>;
  }

  return (
    <main className="shell questionBankShell">
      <nav className="pageNav"><Link href="/admin">← Administration</Link><Link href="/admin/content/flow">Project Flow</Link><Link href="/review">Pack review</Link><Link href="/admin/content/publication">Publication batches</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">GOVERNED CONTENT</p><h1>Content control room</h1><p className="lede">Create, filter, revise, review, and retire versioned questions without bypassing evidence or publication gates.</p><Link className="secondaryLink" href="/admin/content/new">Create draft question →</Link></div><div className="bankCount"><strong>{data.total}</strong><span>matching records</span></div></header>
      {raw.saved && <p className="successBanner">Content action completed and audited.</p>}
      {raw.error && <p className="authError">The requested content action could not be completed.</p>}

      <section className="analyticsCards" aria-label="Technology content health">
        {data.technologies.map((technology) => <div className="card" key={String(technology.id)}><span>{String(technology.name)}</span><strong>{Number(technology.questions)}</strong><small>{Number(technology.published)} published · {Number(technology.needs_attention)} need attention</small></div>)}
      </section>
      <section className="card analyticsSection"><h2>Evidence freshness</h2><div className="tableScroll"><table><thead><tr><th>Technology</th><th>Sources</th><th>Stale</th><th>Overdue 30d</th></tr></thead><tbody>{data.evidenceHealth.map((row) => <tr key={String(row.technology_id)}><td>{String(row.technology_id)}</td><td>{Number(row.sources)}</td><td>{Number(row.stale)}</td><td>{Number(row.overdue)}</td></tr>)}</tbody></table></div></section>
      <section className="card analyticsSection"><h2>AI reviewer performance</h2><div className="tableScroll"><table><thead><tr><th>Provider / model</th><th>Reviews</th><th>Approval rate</th><th>Cost / verified</th></tr></thead><tbody>{data.reviewerPerformance.map((row) => <tr key={`${row.provider}-${row.model}`}><td>{String(row.provider)} / {String(row.model)}</td><td>{Number(row.reviews)}</td><td>{row.approval_rate === null ? '—' : `${String(row.approval_rate)}%`}</td><td>{row.cost_cents_per_verified === null ? '—' : `${String(row.cost_cents_per_verified)}¢`}</td></tr>)}</tbody></table></div></section>

      <form className="card questionFilters" method="get">
        <label>Search<input name="q" defaultValue={filters.query} placeholder="Question ID or text" /></label>
        <label>Technology<select name="technology" defaultValue={filters.technology}><option value="">All</option>{data.technologies.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}</select></label>
        <label>Topic<select name="topic" defaultValue={filters.topic}><option value="">All</option>{data.topics.filter((item) => !filters.technology || item.technology_id === filters.technology).map((item) => <option key={`${item.technology_id}-${item.slug}`} value={String(item.slug)}>{String(item.name)} ({Number(item.questions)})</option>)}</select></label>
        <label>Difficulty<select name="difficulty" defaultValue={filters.difficulty}><option value="">All</option><option>beginner</option><option>intermediate</option><option>advanced</option></select></label>
        <label>Type<select name="type" defaultValue={filters.type}><option value="">All</option><option>conceptual</option><option>scenario</option><option>troubleshooting</option><option>design</option><option>hands-on</option></select></label>
        <label>Review status<select name="reviewStatus" defaultValue={filters.reviewStatus}><option value="">All</option><option>draft</option><option>reviewing</option><option>disputed</option><option>ai-evidence-verified</option><option>human-verified</option><option>stale</option><option>rejected</option></select></label>
        <label>Publish status<select name="publishStatus" defaultValue={filters.publishStatus}><option value="">All</option><option>unpublished</option><option>scheduled</option><option>published</option><option>retired</option></select></label>
        <div className="filterActions"><button className="primary" type="submit">Apply filters</button><Link className="secondaryLink" href="/admin/content">Reset</Link></div>
      </form>

      <form className="card analyticsSection" action={bulkQuestionAction}>
        <div className="bulkToolbar"><label>Bulk action<select name="action" defaultValue="mark-stale"><option value="mark-stale">Mark stale</option><option value="unpublish">Unpublish</option><option value="retire">Retire</option></select></label><button className="secondary" type="submit">Apply to selected</button></div>
        <div className="tableScroll"><table><thead><tr><th>Select</th><th>Question</th><th>Technology</th><th>Topic</th><th>Level</th><th>Review</th><th>Publish</th><th>Version</th></tr></thead><tbody>
          {data.questions.map((question) => <tr key={String(question.id)}><td><input aria-label={`Select ${question.id}`} name="questionIds" type="checkbox" value={String(question.id)} /></td><td><Link href={`/admin/content/questions/${encodeURIComponent(String(question.id))}`}>{String(question.prompt)}</Link><br /><code>{String(question.id)}</code></td><td>{String(question.technology_id)}</td><td>{String(question.topic)}</td><td>{String(question.difficulty)}</td><td>{String(question.review_status)}</td><td>{String(question.publish_status)}</td><td>{String(question.version)}</td></tr>)}
        </tbody></table></div>
        {!data.questions.length && <p className="lede">No questions match these filters.</p>}
      </form>
      <nav className="pagination" aria-label="Content pages"><Link aria-disabled={data.page === 1} href={queryHref(raw, Math.max(1, data.page - 1))}>← Previous</Link><span>Page {data.page} of {data.pages}</span><Link aria-disabled={data.page === data.pages} href={queryHref(raw, Math.min(data.pages, data.page + 1))}>Next →</Link></nav>
    </main>
  );
}
