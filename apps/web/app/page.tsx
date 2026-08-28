'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Difficulty,
  InterviewQuestion,
  ScoreResponse,
  Technology,
  completeRemoteSession,
  claimRemoteSession,
  createRemoteSession,
  fetchRemoteSession,
  fetchReleasedCourses,
  fetchQuestions,
  saveRemoteAnswer,
  scoreAnswer,
} from '../lib/api';
import { buildAssessmentSummary } from '../lib/assessment';
import { availableCourses, technologyLabel, type CourseDefinition } from '../lib/course-catalog';
import { InterviewSession, clearSession, getResumeKey, loadSession, newSession, parseResumeKey, saveSession } from '../lib/session';
import { SpeechInputAdapter, SpeechOutputAdapter, createBrowserSpeechInput, createBrowserSpeechOutput } from '../lib/voice';

const difficultyLabels: Record<Difficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function Home() {
  const restored = useRef<InterviewSession | null>(null);
  const [technology, setTechnology] = useState<Technology>('snowflake');
  const [courses, setCourses] = useState<readonly CourseDefinition[]>(availableCourses);
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [cloudPersisted, setCloudPersisted] = useState(false);
  const [resumeInput, setResumeInput] = useState('');
  const [resumeMessage, setResumeMessage] = useState('');
  const [resuming, setResuming] = useState(false);
  const speechInput = useRef<SpeechInputAdapter | null>(null);
  const speechOutput = useRef<SpeechOutputAdapter | null>(null);

  useEffect(() => {
    speechInput.current = createBrowserSpeechInput();
    speechOutput.current = createBrowserSpeechOutput();
    setVoiceAvailable(Boolean(speechInput.current.supported || speechOutput.current.supported));
    const saved = loadSession();
    if (saved?.status === 'in_progress') {
      restored.current = saved;
      setTechnology(saved.technology);
      setDifficulty(saved.difficulty);
      setIndex(saved.currentIndex);
      setSession(saved);
    }
    return () => { speechInput.current?.stop(); speechOutput.current?.cancel(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchReleasedCourses()
      .then((released) => {
        if (cancelled) return;
        setCourses(released);
        setTechnology((current) => released.some((course) => course.id === current) ? current : 'snowflake');
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingQuestions(true); setError(''); setResult(null); setAnswer('');
      const saved = restored.current;
      const active = saved && saved.technology === technology && saved.difficulty === difficulty
        ? saved
        : newSession(technology, difficulty);
      if (active !== saved) {
        setIndex(0); setSession(active); saveSession(active);
      }
      try {
        const payload = await fetchQuestions(technology, difficulty, active.id);
        if (!cancelled) {
          setQuestions(payload);
          setIndex(Math.min(active.currentIndex, Math.max(payload.length - 1, 0)));
          setSession(active);
          const remote = await createRemoteSession({
            id: active.id,
            resumeToken: active.resumeToken,
            technology,
            difficulty,
            currentIndex: active.currentIndex,
          });
          if (!cancelled) setCloudPersisted(Boolean(remote.persisted));
          if (remote.persisted) void claimRemoteSession(active.id, active.resumeToken);
          if (active === saved) restored.current = null;
        }
      } catch (e) { if (!cancelled) { setQuestions([]); setError(e instanceof Error ? e.message : 'Unable to load questions'); } }
      finally { if (!cancelled) setLoadingQuestions(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [technology, difficulty]);

  const current = questions[index] ?? null;
  const progress = questions.length ? `${index + 1} / ${questions.length}` : '0 / 0';
  const isLastQuestion = questions.length > 0 && index === questions.length - 1;
  const completed = session?.status === 'completed';
  const assessment = useMemo(() => buildAssessmentSummary(questions, session), [questions, session]);

  useEffect(() => {
    if (!current || !session) return;
    const savedAnswer = session.answers.find((item) => item.questionId === current.id);
    setAnswer(savedAnswer?.answer ?? '');
    setResult(savedAnswer?.score ?? null);
  }, [current, session]);

  async function submitAnswer() {
    if (!current || !answer.trim() || !session) return;
    setSubmitting(true); setError('');
    try {
      const score = await scoreAnswer(answer, current, session.id); setResult(score);
      const updated: InterviewSession = {
        ...session,
        answers: [...session.answers.filter((a) => a.questionId !== current.id), {
          questionId: current.id,
          answer: answer.trim(),
          score,
          answeredAt: new Date().toISOString(),
        }],
      };
      setSession(updated); saveSession(updated);
      const remote = await saveRemoteAnswer(session.id, session.resumeToken, {
        questionId: current.id,
        answerText: answer.trim(),
        score: score.score,
        dimensionScores: score.dimension_scores,
        matchedConcepts: score.matched_concepts,
        missingConcepts: score.missing_concepts,
        optionalConcepts: score.optional_concepts,
        incorrectClaims: score.incorrect_claims,
        feedback: score.summary,
        currentIndex: index,
        provider: score.provider,
        benchmarkVersion: score.benchmark_version,
        scoringPolicyVersion: score.scoring_policy_version,
      });
      setCloudPersisted(Boolean(remote.persisted));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to score answer'); }
    finally { setSubmitting(false); }
  }

  async function nextQuestion() {
    if (!questions.length || !session) return;
    speechInput.current?.stop(); setListening(false);
    if (isLastQuestion) {
      const updated = { ...session, status: 'completed' as const, completedAt: new Date().toISOString() };
      setSession(updated); saveSession(updated);
      const remote = await completeRemoteSession(session.id, session.resumeToken, assessment.averageScore);
      setCloudPersisted(Boolean(remote.persisted));
      return;
    }
    const next = index + 1; setIndex(next); setAnswer(''); setResult(null);
    const updated = { ...session, currentIndex: next }; setSession(updated); saveSession(updated);
    const remote = await createRemoteSession({ id: session.id, resumeToken: session.resumeToken, technology, difficulty, currentIndex: next });
    setCloudPersisted(Boolean(remote.persisted));
  }

  async function restartSession() {
    clearSession(); const fresh = newSession(technology, difficulty); setSession(fresh); saveSession(fresh);
    setIndex(0); setAnswer(''); setResult(null); setError('');
    const remote = await createRemoteSession({ id: fresh.id, resumeToken: fresh.resumeToken, technology, difficulty, currentIndex: 0 });
    setCloudPersisted(Boolean(remote.persisted));
  }

  async function copyResumeKey() {
    if (!session) return;
    const resumeKey = getResumeKey(session);
    setResumeInput(resumeKey);
    try {
      await navigator.clipboard.writeText(resumeKey);
      setResumeMessage('Resume key copied and shown below. Keep it private.');
    } catch {
      setResumeMessage('Copy the resume key from the field below.');
    }
  }

  async function resumeRemoteSession() {
    const key = parseResumeKey(resumeInput);
    if (!key) { setError('Enter a valid resume key.'); return; }
    setResuming(true); setError(''); setResumeMessage('');
    try {
      const remote = await fetchRemoteSession(key.id, key.resumeToken);
      const restoredSession: InterviewSession = {
        id: remote.session.id,
        resumeToken: key.resumeToken,
        technology: remote.session.technology,
        difficulty: remote.session.difficulty,
        currentIndex: remote.session.metadata.currentIndex ?? 0,
        status: remote.session.status,
        startedAt: remote.session.started_at,
        completedAt: remote.session.completed_at ?? undefined,
        answers: remote.answers.map((item) => ({
          questionId: item.question_id,
          answer: item.answer_text,
          score: {
            score: item.score,
            matched_concepts: item.matched_concepts,
            missing_concepts: item.missing_concepts,
            summary: item.feedback,
          },
          answeredAt: item.answered_at,
        })),
      };
      saveSession(restoredSession);
      setSession(restoredSession); setIndex(restoredSession.currentIndex); setAnswer(''); setResult(null);
      setCloudPersisted(true); setResumeMessage('Cloud session restored on this device.');
      if (restoredSession.technology !== technology || restoredSession.difficulty !== difficulty) {
        restored.current = restoredSession;
        setTechnology(restoredSession.technology); setDifficulty(restoredSession.difficulty);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to restore that session'); }
    finally { setResuming(false); }
  }

  function toggleListening() {
    const input = speechInput.current;
    if (!input?.supported) { setError('Speech recognition is not supported in this browser. Text mode remains available.'); return; }
    if (listening) { input.stop(); setListening(false); return; }
    setError(''); setListening(true);
    input.start((transcript) => { setAnswer((existing) => `${existing}${existing ? ' ' : ''}${transcript}`); setResult(null); }, () => setListening(false));
  }

  function speakQuestion() {
    if (!current) return; const output = speechOutput.current;
    if (!output?.supported) { setError('Text-to-speech is not supported in this browser.'); return; }
    setError(''); output.speak(current.question);
  }

  return <main className="shell">
    <section className="hero"><div><p className="eyebrow">AI MOCK INTERVIEW</p><h1>Practice technical interviews with structured feedback.</h1><p className="lede">Choose a technology and level, answer by voice or text, and resume an interview after refreshing the page.</p><div className="heroLinks"><a className="bankLink" href="/questions">Browse released questions →</a><a className="bankLink" href="/replay">Replay an interview →</a><a className="bankLink" href="/account">Sign in or create account →</a></div></div><div className="statusCard"><span className="dot"/><strong>Milestone 2</strong><span>{cloudPersisted ? 'Cloud persistence active' : 'Local persistence active'}</span></div></section>
    <section className="toolbar card"><label>Technology<select value={technology} onChange={(e)=>setTechnology(e.target.value as Technology)}>{courses.map((course)=><option value={course.id} key={course.id}>{course.label}</option>)}</select></label><label>Level<select value={difficulty} onChange={(e)=>setDifficulty(e.target.value as Difficulty)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><div className="modePill">{voiceAvailable?'Voice + text ready':'Text ready · voice unavailable'}</div></section>
    <section className="resumeCard card"><div><strong>Continue on another device</strong><span>Copy this session’s private key, or paste a key from another device.</span></div><button className="secondary" type="button" disabled={!session||!cloudPersisted} onClick={()=>void copyResumeKey()}>Copy resume key</button><input aria-label="Resume key" value={resumeInput} onChange={(e)=>setResumeInput(e.target.value)} placeholder="Paste resume key" autoComplete="off" spellCheck={false}/><button className="primary" type="button" disabled={resuming||!resumeInput.trim()} onClick={()=>void resumeRemoteSession()}>{resuming?'Restoring…':'Resume'}</button>{resumeMessage?<span className="resumeMessage" aria-live="polite">{resumeMessage}</span>:null}</section>
    {error?<div className="errorBanner" role="alert">{error}</div>:null}
    <section className="interviewGrid"><article className="card interviewer">
      {loadingQuestions?<div className="loadingState">Loading reviewed questions…</div>:completed?<div className="completionState"><p className="eyebrow">INTERVIEW COMPLETE</p><h2>Score: {assessment.averageScore}/100</h2><p>You answered {assessment.answered} of {assessment.total} questions in this {technologyLabel(technology)} · {difficultyLabels[difficulty]} session.</p><div className="topicGrid">{assessment.topics.map((topic)=><div className={`topicCard ${topic.status}`} key={topic.topic}><strong>{topic.topic.replaceAll('-', ' ')}</strong><span>{topic.averageScore}/100 · {topic.answered}/{topic.total} answered</span></div>)}</div>{assessment.gapTopics.length?<div className="summaryCallout"><strong>Focus next</strong><p>{assessment.gapTopics.map((topic)=>topic.topic.replaceAll('-', ' ')).join(', ')}</p></div>:null}<button className="primary" onClick={()=>void restartSession()}>Start a new interview</button></div>:!current?<div className="loadingState">No reviewed starter question is available for {technologyLabel(technology)} · {difficultyLabels[difficulty]} yet.</div>:<><div className="questionMeta"><span>{technologyLabel(current.technology)} · {difficultyLabels[current.difficulty]} · {current.type}</span><span>Question {progress}</span></div><div className="questionHeader"><h2>{current.question}</h2><button className="iconButton" onClick={speakQuestion} type="button" aria-label="Read question aloud">🔊</button></div><textarea value={answer} onChange={(e)=>{setAnswer(e.target.value);setResult(null);}} placeholder="Answer as if you were speaking to an interviewer..." rows={9}/><div className="voiceRow"><button className={listening?'listening':'secondary'} onClick={toggleListening} type="button">{listening?'■ Stop listening':'🎙 Start voice answer'}</button><span>{listening?'Listening… speak naturally.':cloudPersisted?'Progress is synced to the cloud.':'Progress is saved in this browser.'}</span></div><div className="actions"><button className="primary" disabled={submitting||!answer.trim()} onClick={()=>void submitAnswer()}>{submitting?'Scoring…':'Submit answer'}</button><button className="secondary" onClick={()=>void nextQuestion()}>{isLastQuestion?'Finish interview':'Next question'}</button></div><p className="sourceNote">Reviewed source: <a href={current.source.url} target="_blank" rel="noreferrer">{current.source.title}</a> · verified {current.source.verified}</p></>}
    </article><aside className="card feedback" aria-live="polite"><p className="eyebrow">FEEDBACK</p>{!result||!current||completed?<div className="emptyState"><div className="scoreRing">{completed?assessment.averageScore:'—'}</div><p>{completed?'Final average across submitted answers.':'Submit an answer to receive structured feedback and an interviewer follow-up.'}</p></div>:<><div className="scoreRing">{result.score}</div><div className="scoreMode">{result.provider?.startsWith('ai-gateway:')&&!result.provider.includes('->')?'AI semantic evaluation':'Explainable baseline evaluation'}</div><h3>{result.summary}</h3>{result.dimension_scores?<div className="dimensionGrid"><div><span>Accuracy</span><strong>{result.dimension_scores.technical_accuracy}/40</strong></div><div><span>Coverage</span><strong>{result.dimension_scores.required_concept_coverage}/30</strong></div><div><span>Reasoning</span><strong>{result.dimension_scores.reasoning_and_tradeoffs}/20</strong></div><div><span>Clarity</span><strong>{result.dimension_scores.relevance_and_clarity}/10</strong></div></div>:null}<p>You covered {result.matched_concepts.length} of {current.benchmark.requiredConcepts.length} required benchmark concepts.</p><div className="concepts">{current.benchmark.requiredConcepts.map((term)=><span key={term} className={result.matched_concepts.includes(term)?'matched':''}>{term}</span>)}</div><div className="followUp"><strong>Interviewer follow-up</strong><p>{current.followUps[0]??'Explain the trade-offs behind your answer in more depth.'}</p></div><details className="answerPanel"><summary>Reveal benchmark after submission</summary><p>{current.benchmark.canonicalAnswer}</p><small>Benchmark v{current.benchmark.version}</small></details></>}</aside></section>
  </main>;
}
