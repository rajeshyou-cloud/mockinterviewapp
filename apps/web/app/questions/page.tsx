import type { Metadata } from 'next';

import type { Difficulty } from '../../lib/api';
import { isKnownTechnology, technologyLabel } from '../../lib/course-catalog';
import { listCandidateQuestions } from '../../lib/content-repository';
import { filterQuestions, paginateQuestions } from '../../lib/question-search';
import { getReleasedCourses } from '../../lib/released-courses';

export const metadata: Metadata = {
  title: 'Question Bank | Mock Interview System',
  description: 'Browse every released technical interview question pack and benchmark answer.',
};

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function optionValue<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? value as T : undefined;
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set('page', String(page));
  return `/questions?${next.toString()}`;
}

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const availableCourses = await getReleasedCourses();
  const releasedIds = new Set(availableCourses.map((course) => course.id));
  const questionBank = await listCandidateQuestions([...releasedIds]);
  const raw = await searchParams;
  const query = valueOf(raw.q).trim().slice(0, 120);
  const technologyValue = valueOf(raw.technology);
  const technology = isKnownTechnology(technologyValue) && releasedIds.has(technologyValue) ? technologyValue : undefined;
  const difficulty = optionValue(valueOf(raw.difficulty), ['beginner', 'intermediate', 'advanced'] as const);
  const types = [...new Set(questionBank.map((question) => question.type))].sort();
  const type = optionValue(valueOf(raw.type), types);
  const topics = [...new Set(questionBank
    .filter((question) => !technology || question.technology === technology)
    .map((question) => question.topic))].sort();
  const topic = optionValue(valueOf(raw.topic), topics);
  const requestedPage = Number.parseInt(valueOf(raw.page), 10) || 1;
  const filtered = filterQuestions(questionBank, { query, technology, difficulty, type, topic });
  const result = paginateQuestions(filtered, requestedPage);
  const activeParams = new URLSearchParams();
  if (query) activeParams.set('q', query);
  if (technology) activeParams.set('technology', technology);
  if (difficulty) activeParams.set('difficulty', difficulty);
  if (type) activeParams.set('type', type);
  if (topic) activeParams.set('topic', topic);

  return <main className="shell questionBankShell">
    <nav className="pageNav" aria-label="Primary navigation">
      <a href="/">← Practice interview</a>
      <span>Question Bank</span>
    </nav>
    <header className="bankHeader">
      <div>
        <p className="eyebrow">BENCHMARKED LIBRARY</p>
        <h1>Explore all {questionBank.length} interview questions.</h1>
        <p className="lede">Search by concept, filter by course and level, then open any question to review its benchmark answer, scoring anchors, and official source evidence.</p>
      </div>
      <div className="bankCount" aria-label={`${filtered.length} matching questions`}>
        <strong>{filtered.length}</strong>
        <span>matching questions</span>
      </div>
    </header>

    <form className="questionFilters card" action="/questions" method="get">
      <label className="searchField">Search
        <input name="q" defaultValue={query} maxLength={120} placeholder="Architecture, recovery, lookup cache…" />
      </label>
      <label>Course
        <select name="technology" defaultValue={technology ?? ''}>
          <option value="">All courses</option>
          {availableCourses.map((course) => <option key={course.id} value={course.id}>{course.label}</option>)}
        </select>
      </label>
      <label>Level
        <select name="difficulty" defaultValue={difficulty ?? ''}>
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      <label>Question type
        <select name="type" defaultValue={type ?? ''}>
          <option value="">All types</option>
          {types.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Topic
        <select name="topic" defaultValue={topic ?? ''}>
          <option value="">All topics</option>
          {topics.map((item) => <option key={item} value={item}>{item.replaceAll('-', ' ')}</option>)}
        </select>
      </label>
      <div className="filterActions">
        <button className="primary" type="submit">Apply filters</button>
        <a className="secondaryLink" href="/questions">Clear</a>
      </div>
    </form>

    {result.items.length ? <section className="questionList" aria-label="Question results">
      {result.items.map((question, itemIndex) => <article className="questionCard card" key={question.id}>
        <div className="questionNumber">{(result.page - 1) * 20 + itemIndex + 1}</div>
        <div className="questionCardBody">
          <div className="questionTags">
            <span>{technologyLabel(question.technology)}</span>
            <span>{question.difficulty}</span>
            <span>{question.type}</span>
            <span>{question.topic.replaceAll('-', ' ')}</span>
          </div>
          <h2>{question.question}</h2>
          <details>
            <summary>Review benchmark answer and concepts</summary>
            <div className="answerPanel">
              <div className="benchmarkMeta">
                <span>Benchmark v{question.benchmark.version}</span>
                <span>{question.benchmark.review.status.replaceAll('-', ' ')}</span>
              </div>
              <h3>Standard benchmark answer</h3>
              <p>{question.benchmark.canonicalAnswer}</p>
              <h3>Expanded explanation</h3>
              <p>{question.benchmark.expandedExplanation}</p>
              <h3>Required concepts</h3>
              <div className="concepts">{question.benchmark.requiredConcepts.map((concept) => <span key={concept}>{concept}</span>)}</div>
              {question.benchmark.optionalConcepts.length ? <><h3>Optional depth</h3><div className="concepts">{question.benchmark.optionalConcepts.map((concept) => <span key={concept}>{concept}</span>)}</div></> : null}
              <h3>Scoring anchors</h3>
              <ul>
                <li><strong>Strong:</strong> {question.benchmark.scoringAnchors.strong}</li>
                <li><strong>Partial:</strong> {question.benchmark.scoringAnchors.partial}</li>
                <li><strong>Weak:</strong> {question.benchmark.scoringAnchors.weak}</li>
                <li><strong>Incorrect:</strong> {question.benchmark.scoringAnchors.incorrect}</li>
              </ul>
              {question.followUps.length ? <><h3>Follow-up prompts</h3><ul>{question.followUps.map((followUp) => <li key={followUp}>{followUp}</li>)}</ul></> : null}
            </div>
          </details>
          <p className="sourceNote">Official source: <a href={question.benchmark.evidence[0]?.url ?? question.source.url} target="_blank" rel="noreferrer">{question.benchmark.evidence[0]?.title ?? question.source.title}</a> · evidence baseline {question.benchmark.evidence[0]?.retrievedAt ?? question.source.verified}</p>
        </div>
      </article>)}
    </section> : <div className="emptyResults card"><h2>No matching questions</h2><p>Clear one or more filters and try again.</p></div>}

    <nav className="pagination" aria-label="Question result pages">
      {result.page > 1 ? <a href={pageHref(activeParams, result.page - 1)}>← Previous</a> : <span />}
      <span>Page {result.page} of {result.pageCount}</span>
      {result.page < result.pageCount ? <a href={pageHref(activeParams, result.page + 1)}>Next →</a> : <span />}
    </nav>
  </main>;
}
