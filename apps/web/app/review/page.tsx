import Link from 'next/link';

import aws from '../../data/candidates/aws.json';
import databricks from '../../data/candidates/databricks.json';
import oracle from '../../data/candidates/oracle.json';
import powerBi from '../../data/candidates/power-bi.json';
import python from '../../data/candidates/python.json';
import { requireRole } from '../../lib/auth/access';
import { listCoursePackReviews } from '../../lib/db';
import { saveReview } from './actions';

const packs = { databricks, oracle, 'power-bi': powerBi, python, aws } as const;
const labels = { databricks: 'Databricks', oracle: 'Oracle Database', 'power-bi': 'Power BI', python: 'Python', aws: 'AWS' } as const;
type CandidateCourse = keyof typeof packs;

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ course?: string; error?: string; saved?: string }> }) {
  const { user } = await requireRole(['reviewer']);
  const query = await searchParams;
  const course: CandidateCourse = query.course && query.course in packs ? query.course as CandidateCourse : 'databricks';
  const questions = packs[course];
  const reviews = await listCoursePackReviews();
  const current = reviews.find((review) => review.course_id === course && review.reviewer_user_id === user.id);

  return (
    <main className="shell questionBankShell">
      <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/">Interview</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">HUMAN CONTENT GATE</p><h1>Course review</h1><p className="lede">Inspect all 150 questions and record a traceable pack-level decision. Approval requires confirming the official source links.</p></div><div className="bankCount"><strong>{questions.length}</strong><span>{labels[course]} candidates</span></div></header>

      <nav className="reviewTabs">{Object.entries(labels).map(([id, label]) => <Link className={id === course ? 'active' : ''} href={`/review?course=${id}`} key={id}>{label}</Link>)}</nav>
      {query.saved && <p className="successBanner">Review decision saved.</p>}
      {query.error === 'sources' && <p className="authError">Official source verification is required before approval.</p>}

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
