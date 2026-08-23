# Project State

_Last updated: 2026-08-23_

## Current milestone

**Milestone 2 — Persistent interview sessions and assessment depth**

Status: **IN PROGRESS**

### Milestone 1 — COMPLETE

Milestone 1 was accepted after the deployed Vercel UI was browser-reviewed. The Next.js production build is green on Vercel, the interview flow loads reviewed questions, text scoring works, browser voice adapters are present where supported, question progression was fixed and re-reviewed, and the first handover/state documentation is in place.

### Milestone 2 completed so far

- [x] Dedicated Neon Postgres project provisioned for application persistence
- [x] `interview_sessions` persistence model created
- [x] `interview_answers` persistence model created
- [x] Session/answer indexes created
- [x] Database schema captured in `packages/db/schema.sql`

### Milestone 2 next actions

- [ ] Wire Vercel server routes to Postgres through a server-only database adapter
- [ ] Create/start/resume/complete interview-session API routes
- [ ] Persist scored answers and per-question feedback
- [ ] Restore session progress after refresh/reconnect
- [ ] Add interview completion summary with aggregate score and topic gaps
- [ ] Introduce provider-neutral semantic scoring contract while retaining deterministic fallback scoring
- [ ] Expand reviewed Snowflake and Informatica content, including beginner coverage and scenario questions
- [ ] Add persistence/session tests and CI coverage
- [ ] Deploy and browser-review Milestone 2

## Current user flow

1. Candidate selects Snowflake or Informatica.
2. Candidate selects Beginner, Intermediate, or Advanced.
3. Web app requests matching reviewed questions.
4. Candidate can hear the question using browser text-to-speech when supported.
5. Candidate answers by typing or browser speech recognition when supported.
6. Candidate receives an explainable baseline score, matched concepts, and a follow-up question.
7. Candidate progresses through the filtered interview.
8. The final question ends with a clear Finish interview state rather than silently looping.

Milestone 2 is adding durable session storage beneath this flow so progress, answers, scores, and later analytics survive page refreshes and reconnects.

## Architecture principles

1. The core interview engine is technology-neutral.
2. Snowflake and Informatica are content packs, not hard-coded products.
3. Questions and canonical answers are traceable to official product documentation.
4. AI-generated content must support human review, approval, versioning and re-validation.
5. Voice providers and LLM providers must be replaceable adapters.
6. Scenario-based reasoning is a first-class interview mode.
7. Persistence is domain-oriented: sessions and answers are independent of UI/provider choices.
8. Each milestone follows the engineering contract: build, tests, documentation and handover.

## Deferred

- Interview replay
- Recruiter comparison dashboard
- Full analytics suite
- Production authentication/billing

These remain deferred until the core interview and assessment experience is stable.
