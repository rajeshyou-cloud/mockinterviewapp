'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Difficulty,
  InterviewQuestion,
  ScoreResponse,
  Technology,
  completeRemoteSession,
  createRemoteSession,
  fetchQuestions,
  saveRemoteAnswer,
  scoreAnswer,
} from '../lib/api';
import { InterviewSession, clearSession, loadSession, newSession, saveSession } from '../lib/session';
import { SpeechInputAdapter, SpeechOutputAdapter, createBrowserSpeechInput, createBrowserSpeechOutput } from '../lib/voice';

const technologyLabels: Record<Technology, string> = { snowflake: 'Snowflake', informatica: 'Informatica' };
const difficultyLabels: Record<Difficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function Home() {
  const restored = useRef<InterviewSession | null>(null);
  const [technology, setTechnology] = useState<Technology>('snowflake');
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
    async function load() {
      setLoadingQuestions(true); setError(''); setResult(null); setAnswer('');
      try {
        const payload = await fetchQuestions(technology, difficulty);
        if (!cancelled) {
          setQuestions(payload);
          const saved = restored.current;
          if (saved && saved.technology === technology && saved.difficulty === difficulty) {
            setIndex(Math.min(saved.currentIndex, Math.max(payload.length - 1, 0)));
            setSession(saved);
            const remote = await createRemoteSession({ id: saved.id, technology, difficulty, currentIndex: saved.currentIndex });
            if (!cancelled) setCloudPersisted(Boolean(remote.persisted));
            restored.current = null;
          } else {
            const fresh = newSession(technology, difficulty);
            setIndex(0); setSession(fresh); saveSession(fresh);
            const remote = await createRemoteSession({ id: fresh.id, technology, difficulty, currentIndex: 0 });
            if (!cancelled) setCloudPersisted(Boolean(remote.persisted));
          }
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
  const averageScore = useMemo(() => {
    if (!session?.answers.length) return 0;
    return Math.round(session.answers.reduce((sum, item) => sum + item.score.score, 0) / session.answers.length);
  }, [session]);

  async function submitAnswer() {
    if (!current || !answer.trim() || !session) return;
    setSubmitting(true); setError('');
    try {
      const score = await scoreAnswer(answer, current.expectedConcepts); setResult(score);
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
      const remote = await saveRemoteAnswer(session.id, {
        questionId: current.id,
        answerText: answer.trim(),
        score: score.score,
        matchedConcepts: score.matched_concepts,
        missingConcepts: score.missing_concepts,
        feedback: score.summary,
        currentIndex: index,
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
      const remote = await completeRemoteSession(session.id, averageScore);
      setCloudPersisted(Boolean(remote.persisted));
      return;
    }
    const next = index + 1; setIndex(next); setAnswer(''); setResult(null);
    const updated = { ...session, currentIndex: next }; setSession(updated); saveSession(updated);
    const remote = await createRemoteSession({ id: session.id, technology, difficulty, currentIndex: next });
    setCloudPersisted(Boolean(remote.persisted));
  }

  async function restartSession() {
    clearSession(); const fresh = newSession(technology, difficulty); setSession(fresh); saveSession(fresh);
    setIndex(0); setAnswer(''); setResult(null); setError('');
    const remote = await createRemoteSession({ id: fresh.id, technology, difficulty, currentIndex: 0 });
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

  return <main className="shell">
    <section className="hero"><div><p className="eyebrow">AI MOCK INTERVIEW</p><h1>Practice technical interviews with structured feedback.</h1><p className="lede">Choose a technology and level, answer by voice or text, and resume an interview after refreshing the page.</p></div><div className="statusCard"><span className="dot"/><strong>Milestone 2</strong><span>{cloudPersisted ? 'Cloud persistence active' : 'Local persistence active'}</span></div></section>
    <section className="toolbar card"><label>Technology<select value={technology} onChange={(e)=>setTechnology(e.target.value as Technology)}><option value="snowflake">Snowflake</option><option value="informatica">Informatica</option></select></label><label>Level<select value={difficulty} onChange={(e)=>setDifficulty(e.target.value as Difficulty)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><div className="modePill">{voiceAvailable?'Voice + text ready':'Text ready · voice unavailable'}</div></section>
    {error?<div className="errorBanner">{error}</div>:null}
    <section className="interviewGrid"><article className="card interviewer">
      {loadingQuestions?<div className="loadingState">Loading reviewed questions…</div>:completed?<div className="loadingState"><p className="eyebrow">INTERVIEW COMPLETE</p><h2>Score: {averageScore}/100</h2><p>You answered {session?.answers.length ?? 0} of {questions.length} questions in this {technologyLabels[technology]} · {difficultyLabels[difficulty]} session.</p><button className="primary" onClick={()=>void restartSession()}>Start a new interview</button></div>:!current?<div className="loadingState">No reviewed starter question is available for {technologyLabels[technology]} · {difficultyLabels[difficulty]} yet.</div>:<><div className="questionMeta"><span>{technologyLabels[current.technology]} · {difficultyLabels[current.difficulty]} · {current.type}</span><span>Question {progress}</span></div><div className="questionHeader"><h2>{current.question}</h2><button className="iconButton" onClick={speakQuestion} type="button" aria-label="Read question aloud">🔊</button></div><textarea value={answer} onChange={(e)=>{setAnswer(e.target.value);setResult(null);}} placeholder="Answer as if you were speaking to an interviewer..." rows={9}/><div className="voiceRow"><button className={listening?'listening':'secondary'} onClick={toggleListening} type="button">{listening?'■ Stop listening':'🎙 Start voice answer'}</button><span>{listening?'Listening… speak naturally.':cloudPersisted?'Progress is synced to the cloud.':'Progress is saved in this browser.'}</span></div><div className="actions"><button className="primary" disabled={submitting||!answer.trim()} onClick={()=>void submitAnswer()}>{submitting?'Scoring…':'Submit answer'}</button><button className="secondary" onClick={()=>void nextQuestion()}>{isLastQuestion?'Finish interview':'Next question'}</button></div><p className="sourceNote">Reviewed source: <a href={current.source.url} target="_blank" rel="noreferrer">{current.source.title}</a> · verified {current.source.verified}</p></>}
    </article><aside className="card feedback"><p className="eyebrow">FEEDBACK</p>{!result||!current||completed?<div className="emptyState"><div className="scoreRing">{completed?averageScore:'—'}</div><p>{completed?'Final average across submitted answers.':'Submit an answer to see the explainable baseline score and interviewer follow-up.'}</p></div>:<><div className="scoreRing">{result.score}</div><h3>{result.summary}</h3><p>You covered {result.matched_concepts.length} of {current.expectedConcepts.length} expected concepts.</p><div className="concepts">{current.expectedConcepts.map((term)=><span key={term} className={result.matched_concepts.includes(term)?'matched':''}>{term}</span>)}</div><div className="followUp"><strong>Interviewer follow-up</strong><p>{current.followUps[0]??'Explain the trade-offs behind your answer in more depth.'}</p></div></>}</aside></section>
  </main>;
}
