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
- [x] Browser-local interview session persistence implemented
- [x] In-progress interviews resume after refresh in the same browser
- [x] Submitted answers and score results retained in the local session
- [x] Interview completion summary with aggregate score implemented
- [x] Speech adapter nullability/build issue fixed
- [x] Milestone 2 browser-persistence slice successfully built and deployed on Vercel

### Milestone 2 next actions

- [ ] Wire Vercel server routes to Postgres through a server-only database adapter
- [ ] Create/start/resume/complete durable interview-session API routes
- [ ] Persist scored answers and per-question feedback in Postgres
- [ ] Restore session progress across devices/reconnects using server persistence
- [ ] Add topic-gap breakdown to the interview completion summary
- [ ] Introduce provider-neutral semantic scoring contract while retaining deterministic fallback scoring
- [ ] Expand reviewed Snowflake and Informatica content, including beginner coverage and scenario questions
- [ ] Add persistence/session tests and CI coverage
- [ ] Browser-review the server-persistent Milestone 2 flow

## Current user flow

1. Candidate selects Snowflake or Informatica.
2. Candidate selects Beginner, Intermediate, or Advanced.
3. Web app requests matching reviewed questions.
4. Candidate can hear the question using browser text-to-speech when supported.
5. Candidate answers by typing or browser speech recognition when supported.
6. Candidate receives an explainable baseline score, matched concepts, and a follow-up question.
7. Candidate progresses through the filtered interview.
8. Progress and scored answers are saved in browser storage and resume after refresh in the same browser.
9. The final question produces an interview-complete summary and aggregate score.

The next persistence layer moves this state from browser-only storage into Neon Postgres so a session can survive device changes and support analytics/reviewer workflows.

## Architecture principles

1. The core interview engine is technology-neutral.
2. Snowflake and Informatica are content packs, not hard-coded products.
3. Questions and canonical answers are traceable to official product documentation.
4. AI-generated content must support human review, approval, versioning and re-validation.
5. Voice providers and LLM providers must be replaceable adapters.
6. Scenario-based reasoning is a first-class interview mode.
7. Persistence is domain-oriented: sessions and answers are independent of UI/provider choices.
8. Database credentials remain server-only and are never committed or exposed through `NEXT_PUBLIC_` variables.
9. Each milestone follows the engineering contract: build, tests, documentation and handover.

## Deferred

- Interview replay
- Recruiter comparison dashboard
- Full analytics suite
- Production authentication/billing

These remain deferred until the core interview and assessment experience is stable.
