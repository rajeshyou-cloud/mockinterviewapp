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
  fetchReleasedCourses,
  fetchQuestions,
  saveRemoteAnswer,
  scoreAnswer,
} from '../lib/api';
import { buildAssessmentSummary } from '../lib/assessment';
import { availableCourses, technologyLabel, type CourseDefinition } from '../lib/course-catalog';
import { InterviewSession, clearSession, loadSession, newSession, saveSession } from '../lib/session';
import { SpeechInputAdapter, SpeechOutputAdapter, createBrowserSpeechInput, createBrowserSpeechOutput } from '../lib/voice';

const difficultyLabels: Record<Difficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function Icon({ name }: { name: 'arrow' | 'cloud' | 'mic' | 'shield' | 'speaker' | 'spark' }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    cloud: <path d="M17.5 19H7a5 5 0 0 1-.7-9.95A7 7 0 0 1 19.7 11 4 4 0 0 1 17.5 19Z"/>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    speaker: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></>,
    spark: <><path d="m12 3 1.15 3.85L17 8l-3.85 1.15L12 13l-1.15-3.85L7 8l3.85-1.15L12 3Z"/><path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z"/></>,
  };
  return <svg className="uiIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

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
  const progressPercent = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;
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

  return <main className="interviewPage">
    <div className="ambient ambientOne"/><div className="ambient ambientTwo"/>
    <div className="shell interviewShell">
      <nav className="candidateNav" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Interview Studio home"><span className="brandMark"><Icon name="spark"/></span><span>Interview<span>Studio</span></span></a>
        <div className="navLinks"><a href="/questions">Question bank</a><a href="/replay">Replay</a><a className="navAccount" href="/account">My account <Icon name="arrow"/></a></div>
      </nav>

      <section className="hero interviewHero">
        <div><p className="eyebrow"><span/> AI-POWERED INTERVIEW PRACTICE</p><h1>Build confidence for your next technical interview.</h1><p className="lede">Practice realistic questions, answer naturally by voice or text, and receive structured feedback grounded in reviewed benchmarks.</p><div className="trustRow"><span><Icon name="shield"/> Evidence-reviewed questions</span><span><Icon name="cloud"/> Secure progress saving</span></div></div>
        <div className={`statusCard ${cloudPersisted?'isSynced':''}`}><div className="statusIcon"><Icon name="cloud"/></div><div><span className="statusLabel">SESSION STATUS</span><strong>{cloudPersisted ? 'Progress saved' : 'Saved in browser'}</strong><span>{cloudPersisted ? 'Your interview is backed up securely' : 'Your answers remain on this device'}</span></div></div>
      </section>

      <section className="controlDeck card" aria-label="Interview settings">
        <div className="controlIntro"><span className="controlStep">01</span><div><strong>Configure your session</strong><span>Select a track and challenge level</span></div></div>
        <label><span>Technology</span><select value={technology} onChange={(e)=>setTechnology(e.target.value as Technology)}>{courses.map((course)=><option value={course.id} key={course.id}>{course.label}</option>)}</select></label>
        <label><span>Difficulty</span><select value={difficulty} onChange={(e)=>setDifficulty(e.target.value as Difficulty)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        <div className="modePill"><span className="modeDot"/>{voiceAvailable?'Voice & text enabled':'Text mode enabled'}</div>
      </section>

      {error?<div className="errorBanner" role="alert">{error}</div>:null}

      <section className="interviewGrid" aria-label="Interview workspace"><article className="card interviewer">
        <div className="cardAccent"/>
        {loadingQuestions?<div className="loadingState"><span className="loadingOrb"><Icon name="spark"/></span><strong>Preparing your interview</strong><span>Loading reviewed questions…</span></div>:completed?<div className="completionState"><p className="eyebrow"><span/> INTERVIEW COMPLETE</p><h2>Your session score is <em>{assessment.averageScore}/100</em></h2><p>You answered {assessment.answered} of {assessment.total} questions in this {technologyLabel(technology)} · {difficultyLabels[difficulty]} session.</p><div className="topicGrid">{assessment.topics.map((topic)=><div className={`topicCard ${topic.status}`} key={topic.topic}><strong>{topic.topic.replaceAll('-', ' ')}</strong><span>{topic.averageScore}/100 · {topic.answered}/{topic.total} answered</span></div>)}</div>{assessment.gapTopics.length?<div className="summaryCallout"><strong>Recommended focus</strong><p>{assessment.gapTopics.map((topic)=>topic.topic.replaceAll('-', ' ')).join(', ')}</p></div>:null}<button className="primary" onClick={()=>void restartSession()}>Start a new interview <Icon name="arrow"/></button></div>:!current?<div className="loadingState">No reviewed starter question is available for {technologyLabel(technology)} · {difficultyLabels[difficulty]} yet.</div>:<>
          <div className="questionTopline"><div className="questionTags"><span className="technologyTag">{technologyLabel(current.technology)}</span><span>{difficultyLabels[current.difficulty]}</span><span>{current.type}</span></div><strong>Question {progress}</strong></div>
          <div className="progressTrack" aria-label={`${progressPercent}% through interview`}><span style={{width:`${progressPercent}%`}}/></div>
          <div className="questionHeader"><div><p className="sectionLabel">INTERVIEW QUESTION</p><h2>{current.question}</h2></div><button className="iconButton" onClick={speakQuestion} type="button" aria-label="Read question aloud"><Icon name="speaker"/><span>Listen</span></button></div>
          <div className="answerField"><div className="answerLabel"><label htmlFor="interview-answer">Your answer</label><span>{answer.length} characters</span></div><textarea id="interview-answer" value={answer} onChange={(e)=>{setAnswer(e.target.value);setResult(null);}} placeholder="Structure your response clearly. Explain your approach, key concepts, and trade-offs…" rows={9}/></div>
          <div className="voiceRow"><button className={listening?'listening':'secondary voiceButton'} onClick={toggleListening} type="button"><Icon name="mic"/>{listening?'Stop listening':'Answer by voice'}</button><span><span className={`syncDot ${cloudPersisted?'online':''}`}/>{listening?'Listening — speak naturally':cloudPersisted?'Your progress is synced securely':'Your progress is saved in this browser'}</span></div>
          <div className="actions"><button className="primary submitButton" disabled={submitting||!answer.trim()} onClick={()=>void submitAnswer()}>{submitting?'Evaluating response…':'Submit for feedback'} <Icon name="spark"/></button><button className="secondary nextButton" onClick={()=>void nextQuestion()}>{isLastQuestion?'Finish interview':'Next question'} <Icon name="arrow"/></button></div>
          <p className="sourceNote"><Icon name="shield"/><span>Reviewed against <a href={current.source.url} target="_blank" rel="noreferrer">{current.source.title}</a><small>Evidence checked {current.source.verified}</small></span></p>
        </>}
      </article><aside className="card feedback" aria-live="polite"><div className="feedbackHeader"><div><p className="eyebrow"><span/> PERFORMANCE INSIGHTS</p><h2>Interview feedback</h2></div><span className="feedbackSpark"><Icon name="spark"/></span></div>{!result||!current||completed?<div className="emptyState"><div className="scoreRing"><span>{completed?assessment.averageScore:'—'}</span><small>{completed?'FINAL SCORE':'READY'}</small></div><h3>{completed?'Session complete':'Your feedback will appear here'}</h3><p>{completed?'Final average across submitted answers.':'Submit your response to see a score, concept coverage, and a tailored interviewer follow-up.'}</p><div className="emptyPreview"><span/><span/><span/></div></div>:<><div className="scoreRing resultScore"><span>{result.score}</span><small>OUT OF 100</small></div><div className="scoreMode">{result.provider?.startsWith('ai-gateway:')&&!result.provider.includes('->')?'AI semantic evaluation':'Explainable baseline evaluation'}</div><h3>{result.summary}</h3>{result.dimension_scores?<div className="dimensionGrid"><div><span>Accuracy</span><strong>{result.dimension_scores.technical_accuracy}<small>/40</small></strong></div><div><span>Coverage</span><strong>{result.dimension_scores.required_concept_coverage}<small>/30</small></strong></div><div><span>Reasoning</span><strong>{result.dimension_scores.reasoning_and_tradeoffs}<small>/20</small></strong></div><div><span>Clarity</span><strong>{result.dimension_scores.relevance_and_clarity}<small>/10</small></strong></div></div>:null}<p className="coverageCopy">You covered <strong>{result.matched_concepts.length} of {current.benchmark.requiredConcepts.length}</strong> required benchmark concepts.</p><div className="concepts">{current.benchmark.requiredConcepts.map((term)=><span key={term} className={result.matched_concepts.includes(term)?'matched':''}>{term}</span>)}</div><div className="followUp"><span className="followUpIcon">?</span><div><strong>Interviewer follow-up</strong><p>{current.followUps[0]??'Explain the trade-offs behind your answer in more depth.'}</p></div></div><details className="answerPanel"><summary>View benchmark answer <Icon name="arrow"/></summary><p>{current.benchmark.canonicalAnswer}</p><small>Benchmark v{current.benchmark.version}</small></details></>}</aside></section>
    </div>
  </main>;
}
