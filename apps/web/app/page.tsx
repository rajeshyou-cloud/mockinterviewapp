'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Difficulty,
  InterviewQuestion,
  ScoreResponse,
  Technology,
  fetchQuestions,
  scoreAnswer,
} from '../lib/api';
import {
  SpeechInputAdapter,
  SpeechOutputAdapter,
  createBrowserSpeechInput,
  createBrowserSpeechOutput,
} from '../lib/voice';

const technologyLabels: Record<Technology, string> = {
  snowflake: 'Snowflake',
  informatica: 'Informatica',
};

const difficultyLabels: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function Home() {
  const [technology, setTechnology] = useState<Technology>('snowflake');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const speechInput = useRef<SpeechInputAdapter | null>(null);
  const speechOutput = useRef<SpeechOutputAdapter | null>(null);

  useEffect(() => {
    speechInput.current = createBrowserSpeechInput();
    speechOutput.current = createBrowserSpeechOutput();
    setVoiceAvailable(Boolean(speechInput.current.supported || speechOutput.current.supported));

    return () => {
      speechInput.current?.stop();
      speechOutput.current?.cancel();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingQuestions(true);
      setError('');
      setResult(null);
      setAnswer('');
      setIndex(0);
      setSessionComplete(false);

      try {
        const payload = await fetchQuestions(technology, difficulty);
        if (!cancelled) setQuestions(payload);
      } catch (loadError) {
        if (!cancelled) {
          setQuestions([]);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load questions');
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [technology, difficulty]);

  const current = questions[index] ?? null;
  const progress = useMemo(() => {
    if (!questions.length) return '0 / 0';
    return `${index + 1} / ${questions.length}`;
  }, [index, questions.length]);
  const isLastQuestion = questions.length > 0 && index === questions.length - 1;

  async function submitAnswer() {
    if (!current || !answer.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const score = await scoreAnswer(answer, current.expectedConcepts);
      setResult(score);
    } catch (scoreError) {
      setError(scoreError instanceof Error ? scoreError.message : 'Unable to score answer');
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (!questions.length) return;
    speechInput.current?.stop();
    setListening(false);

    if (isLastQuestion) {
      setSessionComplete(true);
      return;
    }

    setIndex((value) => value + 1);
    setAnswer('');
    setResult(null);
  }

  function restartSession() {
    setIndex(0);
    setAnswer('');
    setResult(null);
    setSessionComplete(false);
    setError('');
  }

  function toggleListening() {
    const input = speechInput.current;
    if (!input?.supported) {
      setError('Speech recognition is not supported in this browser. Text mode remains available.');
      return;
    }

    if (listening) {
      input.stop();
      setListening(false);
      return;
    }

    setError('');
    setListening(true);
    input.start(
      (transcript) => {
        setAnswer((existing) => `${existing}${existing ? ' ' : ''}${transcript}`);
        setResult(null);
      },
      () => setListening(false),
    );
  }

  function speakQuestion() {
    if (!current) return;
    const output = speechOutput.current;
    if (!output?.supported) {
      setError('Text-to-speech is not supported in this browser.');
      return;
    }
    setError('');
    output.speak(current.question);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">AI MOCK INTERVIEW</p>
          <h1>Practice technical interviews with structured feedback.</h1>
          <p className="lede">
            Choose a technology and level, answer by voice or text, and get an explainable score from the same API that will later host semantic AI scoring.
          </p>
        </div>
        <div className="statusCard">
          <span className="dot" />
          <strong>Milestone 1</strong>
          <span>API-backed interview + browser voice</span>
        </div>
      </section>

      <section className="toolbar card">
        <label>
          Technology
          <select value={technology} onChange={(event) => setTechnology(event.target.value as Technology)}>
            <option value="snowflake">Snowflake</option>
            <option value="informatica">Informatica</option>
          </select>
        </label>
        <label>
          Level
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <div className="modePill">{voiceAvailable ? 'Voice + text ready' : 'Text ready · voice unavailable'}</div>
      </section>

      {error ? <div className="errorBanner">{error}</div> : null}

      <section className="interviewGrid">
        <article className="card interviewer">
          {loadingQuestions ? (
            <div className="loadingState">Loading reviewed questions…</div>
          ) : sessionComplete ? (
            <div className="loadingState">
              <h2>Starter interview complete.</h2>
              <p>You reached the end of this reviewed {technologyLabels[technology]} · {difficultyLabels[difficulty]} question set.</p>
              <button className="primary" onClick={restartSession}>Restart interview</button>
            </div>
          ) : !current ? (
            <div className="loadingState">
              No reviewed starter question is available for {technologyLabels[technology]} · {difficultyLabels[difficulty]} yet.
            </div>
          ) : (
            <>
              <div className="questionMeta">
                <span>{technologyLabels[current.technology]} · {difficultyLabels[current.difficulty]} · {current.type}</span>
                <span>Question {progress}</span>
              </div>
              <div className="questionHeader">
                <h2>{current.question}</h2>
                <button className="iconButton" onClick={speakQuestion} type="button" aria-label="Read question aloud">
                  🔊
                </button>
              </div>
              <textarea
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setResult(null);
                }}
                placeholder="Answer as if you were speaking to an interviewer..."
                rows={9}
              />
              <div className="voiceRow">
                <button className={listening ? 'listening' : 'secondary'} onClick={toggleListening} type="button">
                  {listening ? '■ Stop listening' : '🎙 Start voice answer'}
                </button>
                <span>{listening ? 'Listening… speak naturally.' : 'Your transcript appears in the answer box.'}</span>
              </div>
              <div className="actions">
                <button className="primary" disabled={submitting || !answer.trim()} onClick={() => void submitAnswer()}>
                  {submitting ? 'Scoring…' : 'Submit answer'}
                </button>
                <button className="secondary" onClick={nextQuestion}>{isLastQuestion ? 'Finish interview' : 'Next question'}</button>
              </div>
              <p className="sourceNote">
                Reviewed source: <a href={current.source.url} target="_blank" rel="noreferrer">{current.source.title}</a> · verified {current.source.verified}
              </p>
            </>
          )}
        </article>

        <aside className="card feedback">
          <p className="eyebrow">FEEDBACK</p>
          {!result || !current || sessionComplete ? (
            <div className="emptyState">
              <div className="scoreRing">—</div>
              <p>Submit an answer to see the explainable baseline score and interviewer follow-up.</p>
            </div>
          ) : (
            <>
              <div className="scoreRing">{result.score}</div>
              <h3>{result.summary}</h3>
              <p>
                You covered {result.matched_concepts.length} of {current.expectedConcepts.length} expected concepts.
              </p>
              <div className="concepts">
                {current.expectedConcepts.map((term) => (
                  <span key={term} className={result.matched_concepts.includes(term) ? 'matched' : ''}>{term}</span>
                ))}
              </div>
              <div className="followUp">
                <strong>Interviewer follow-up</strong>
                <p>{current.followUps[0] ?? 'Explain the trade-offs behind your answer in more depth.'}</p>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
