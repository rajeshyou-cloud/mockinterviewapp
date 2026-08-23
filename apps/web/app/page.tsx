'use client';

import { useMemo, useState } from 'react';

type Technology = 'Snowflake' | 'Informatica';

type InterviewQuestion = {
  technology: Technology;
  question: string;
  expected: string[];
  followUp: string;
};

const questions: InterviewQuestion[] = [
  {
    technology: 'Snowflake',
    question: 'Explain how Snowflake separates storage and compute, and why that matters for workload isolation.',
    expected: ['storage', 'compute', 'virtual warehouse', 'independent scaling', 'isolation'],
    followUp: 'How would you use separate virtual warehouses for ETL and BI workloads?'
  },
  {
    technology: 'Snowflake',
    question: 'When would you choose a dynamic table instead of a stream-and-task pipeline?',
    expected: ['dynamic table', 'declarative', 'target lag', 'streams', 'tasks', 'procedural'],
    followUp: 'What trade-offs would you consider around freshness and operational control?'
  },
  {
    technology: 'Informatica',
    question: 'What role does a Secure Agent play in Informatica Intelligent Data Management Cloud?',
    expected: ['secure agent', 'runtime', 'connectivity', 'on-premises', 'cloud', 'execution'],
    followUp: 'How would runtime environment choice affect connectivity and performance?'
  },
  {
    technology: 'Informatica',
    question: 'How would you design and troubleshoot a Cloud Data Integration mapping that is running slowly?',
    expected: ['mapping', 'pushdown', 'partition', 'source', 'target', 'monitor'],
    followUp: 'Which runtime and monitoring signals would you inspect first?'
  }
];

function scoreAnswer(answer: string, expected: string[]) {
  if (!answer.trim()) return { score: 0, matched: [] as string[] };
  const normalized = answer.toLowerCase();
  const matched = expected.filter((term) => normalized.includes(term.toLowerCase()));
  const score = Math.round((matched.length / expected.length) * 100);
  return { score, matched };
}

export default function Home() {
  const [technology, setTechnology] = useState<Technology>('Snowflake');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const technologyQuestions = useMemo(
    () => questions.filter((q) => q.technology === technology),
    [technology]
  );

  const current = technologyQuestions[index % technologyQuestions.length];
  const result = scoreAnswer(answer, current.expected);

  function changeTechnology(value: Technology) {
    setTechnology(value);
    setIndex(0);
    setAnswer('');
    setSubmitted(false);
  }

  function nextQuestion() {
    setIndex((value) => (value + 1) % technologyQuestions.length);
    setAnswer('');
    setSubmitted(false);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">AI MOCK INTERVIEW</p>
          <h1>Practice technical interviews with structured feedback.</h1>
          <p className="lede">
            Choose a technology, answer naturally, and get an explainable first-pass score. Voice and adaptive AI follow-ups are the next layer on this same flow.
          </p>
        </div>
        <div className="statusCard">
          <span className="dot" />
          <strong>Milestone 1</strong>
          <span>Interactive interview slice</span>
        </div>
      </section>

      <section className="toolbar card">
        <label>
          Technology
          <select value={technology} onChange={(e) => changeTechnology(e.target.value as Technology)}>
            <option>Snowflake</option>
            <option>Informatica</option>
          </select>
        </label>
        <label>
          Level
          <select defaultValue="Intermediate">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
        <div className="modePill">Text mode · Voice coming next</div>
      </section>

      <section className="interviewGrid">
        <article className="card interviewer">
          <div className="questionMeta">
            <span>{technology}</span>
            <span>Question {index + 1}</span>
          </div>
          <h2>{current.question}</h2>
          <textarea
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setSubmitted(false);
            }}
            placeholder="Answer as if you were speaking to an interviewer..."
            rows={9}
          />
          <div className="actions">
            <button className="primary" onClick={() => setSubmitted(true)}>Submit answer</button>
            <button className="secondary" onClick={nextQuestion}>Next question</button>
          </div>
        </article>

        <aside className="card feedback">
          <p className="eyebrow">FEEDBACK</p>
          {!submitted ? (
            <div className="emptyState">
              <div className="scoreRing">—</div>
              <p>Submit an answer to see the first explainable score.</p>
            </div>
          ) : (
            <>
              <div className="scoreRing">{result.score}</div>
              <h3>{result.score >= 70 ? 'Strong coverage' : result.score >= 40 ? 'Partial coverage' : 'Needs more depth'}</h3>
              <p>
                You mentioned {result.matched.length} of {current.expected.length} core concepts in this baseline rubric.
              </p>
              <div className="concepts">
                {current.expected.map((term) => (
                  <span key={term} className={result.matched.includes(term) ? 'matched' : ''}>{term}</span>
                ))}
              </div>
              <div className="followUp">
                <strong>Interviewer follow-up</strong>
                <p>{current.followUp}</p>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
