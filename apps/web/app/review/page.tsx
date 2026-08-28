import Link from 'next/link';

import { requireRole } from '../../lib/auth/access';
import { summarizeBenchmarkReviews } from '../../lib/benchmark-review';
import { candidatePackLabels, candidatePacks, isCandidateCourse, type CandidateCourse } from '../../lib/candidate-packs';
import { listCoursePackReviews } from '../../lib/db';
import { saveReview } from './actions';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ course?: string; error?: string; saved?: string }> }) {
  const { user } = await requireRole(['reviewer']);
  const query = await searchParams;
  const course: CandidateCourse = query.course && isCandidateCourse(query.course) ? query.course : 'databricks';
  const questions = candidatePacks[course];
  const benchmarkSummary = summarizeBenchmarkReviews(questions);
  const reviews = await listCoursePackReviews();
  const current = reviews.find((review) => review.course_id === course && review.reviewer_user_id === user.id);

  return (
    <main className="shell questionBankShell">
      <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/admin/content/flow">Project Flow</Link><Link href="/">Interview</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">CONTENT RELEASE GATE</p><h1>Course review</h1><p className="lede">Inspect all 150 questions and record a traceable pack-level decision. Approval requires source checks and verified benchmark answers for every question.</p></div><div className="bankCount"><strong>{questions.length}</strong><span>{candidatePackLabels[course]} candidates</span></div></header>

      <nav className="reviewTabs">{Object.entries(candidatePackLabels).map(([id, label]) => <Link className={id === course ? 'active' : ''} href={`/review?course=${id}`} key={id}>{label}</Link>)}</nav>
      {query.saved && <p className="successBanner">Review decision saved.</p>}
      {query.error === 'sources' && <p className="authError">Official source verification is required before approval.</p>}
      {query.error === 'benchmarks' && <p className="authError">Every benchmark answer must be evidence-verified or human-verified before this pack can be approved.</p>}

      <section className="analyticsCards" aria-label="Benchmark review status">
        <div className="card"><span>Verified benchmarks</span><strong>{benchmarkSummary.verified}</strong></div>
        <div className="card"><span>Draft or reviewing</span><strong>{benchmarkSummary.draft + benchmarkSummary.reviewing}</strong></div>
        <div className="card"><span>Disputed, stale, rejected</span><strong>{benchmarkSummary.disputed + benchmarkSummary.stale + benchmarkSummary.rejected}</strong></div>
      </section>

      <form className="card reviewDecision" action={saveReview}>
        <input name="courseId" type="hidden" value={course} />
        <label>Decision<select name="status" defaultValue={current?.status ?? 'in_review'}><option value="in_review">In review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option></select></label>
        <label className="checkLabel"><input name="sourceLinksChecked" type="checkbox" defaultChecked={Boolean(current?.source_links_checked)} /> I checked the official source links for this pack</label>
        <label>Review notes<textarea name="notes" rows={4} maxLength={2000} defaultValue={current?.notes ?? ''} placeholder="Record coverage observations, corrections, or approval rationale." /></label>
        <button className="primary" type="submit">Save review decision</button>
      </form>

      <section className="questionList">
        {questions.map((question, index) => (
          <article className="card questionCard" key={question.id}>
            <div className="questionNumber">{index + 1}</div>
            <div><div className="questionTags"><span>{question.difficulty}</span><span>{question.type}</span><span>{question.topic}</span></div><h2>{question.question}</h2><details><summary>Review benchmark and sources</summary><div className="answerPanel"><div className="benchmarkMeta"><span>Benchmark v{question.benchmark.version}</span><span>{question.benchmark.review.status.replaceAll('-', ' ')}</span></div><h3>Standard benchmark answer</h3><p>{question.benchmark.canonicalAnswer}</p><h3>Required concepts</h3><p>{question.benchmark.requiredConcepts.join(' · ')}</p><h3>Official source evidence</h3><p><a href={question.benchmark.evidence[0]?.url ?? question.source.url} target="_blank" rel="noreferrer">{question.benchmark.evidence[0]?.title ?? question.source.title} ↗</a></p></div></details></div>
          </article>
        ))}
      </section>
    </main>
  );
}
