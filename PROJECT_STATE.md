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
- [x] Server-only Neon adapter implemented using `DATABASE_URL`
- [x] Durable session create/read API routes implemented
- [x] Durable answer persistence API route implemented
- [x] Durable session completion API route implemented
- [x] Web client performs best-effort cloud sync while retaining browser fallback
- [x] Server-only environment contract documented in `apps/web/.env.example`
- [x] `DATABASE_URL` securely bound to Vercel `mockinterviewapp-web` for Production and Preview
- [x] `mockinterviewapp-web` connected to GitHub repository `rajeshyou-cloud/mockinterviewapp`
- [x] Vercel web Root Directory configured as `apps/web`
- [x] Fresh Git-triggered production web deployment verified green on Next.js 15.5.21
- [x] Live question API verified from the production web deployment
- [x] Live durable-session read route verified to reach Neon (database binding active)
- [x] Beginner Snowflake and Informatica content pack added
- [x] Question API composes multiple content packs without UI changes
- [x] Topic-level assessment summary implemented
- [x] Final interview view now shows topic scores and focus areas
- [x] Provider-neutral scoring contract implemented
- [x] Deterministic scoring retained as the fallback provider
- [x] Web unit tests added for scoring, assessment summaries, and database configuration fallback
- [x] CI updated to run web unit tests before the Next.js production build
- [x] Expanded scenario bank added for Snowflake security, Time Travel/cloning, streams and Informatica orchestration/runtime/performance
- [x] Speech adapter nullability/build issue fixed
- [x] Cross-device resume identity implemented with a private versioned resume key
- [x] Resume credentials stored in Neon only as SHA-256 hashes and required on every session mutation/read
- [x] Cloud session read-back maps persisted answers and progress into the browser session model
- [x] Route-level persistence tests added for credential enforcement, fallback, create, read, answer and completion behavior
- [x] Web question-bank integrity and coverage tests added to the CI test command
- [x] Eight additional Snowflake dynamic-table and Informatica lookup-cache questions added (34 web questions total)
- [x] Resume schema migration and create/answer/complete/read-back flow verified on a temporary Neon branch
- [x] Web app upgraded locally to Next.js 16.3.2 / React 19.2.8; production build and zero-vulnerability audit verified
- [x] Resume-identity migration applied to the main Neon branch
- [x] Main Neon create/answer/complete/authorized read-back transaction verified and disposable test data removed

### Deployment topology

- `mockinterviewapp-api` is GitHub-linked to `rajeshyou-cloud/mockinterviewapp` and auto-deploys from `main` as the FastAPI project.
- `mockinterviewapp-web` is GitHub-linked to the same repository with Root Directory `apps/web` and auto-deploys from `main`.
- `DATABASE_URL` is configured securely for Production and Preview on the web project.
- Production web URL: `https://mockinterviewapp-web.vercel.app`.
- Production currently remains on the prior Next.js 15.5.21 revision until the Neon migration is approved and this tested revision is pushed.

### Milestone 2 next actions

- [ ] Deploy and verify durable session creation, answer writes, completion and cross-device read-back from the live UI
- [ ] Add a semantic/LLM scoring provider behind the existing provider-neutral contract
- [ ] Continue expanding reviewed Snowflake and Informatica content toward the 300-question target
- [ ] Browser-review the fully server-persistent Milestone 2 flow

## Current user flow

1. Candidate selects Snowflake or Informatica.
2. Candidate selects Beginner, Intermediate, or Advanced.
3. Web app requests matching reviewed questions from composable content packs.
4. Candidate can hear the question using browser text-to-speech when supported.
5. Candidate answers by typing or browser speech recognition when supported.
6. Candidate receives an explainable baseline score, matched concepts, and a follow-up question.
7. Candidate progresses through the filtered interview.
8. Progress and scored answers are always saved in browser storage and resume after refresh in the same browser.
9. The web app syncs sessions and answers to Neon Postgres when configured, using a private resume credential.
10. A candidate can copy the private resume key and restore persisted progress and answers on another device.
11. The final question produces an aggregate score, topic-level scores, and focus areas for the next practice session.

## Architecture principles

1. The core interview engine is technology-neutral.
2. Snowflake and Informatica are content packs, not hard-coded products.
3. Questions and canonical answers are traceable to official product documentation.
4. AI-generated content must support human review, approval, versioning and re-validation.
5. Voice providers and LLM providers must be replaceable adapters.
6. Scenario-based reasoning is a first-class interview mode.
7. Persistence is domain-oriented: sessions and answers are independent of UI/provider choices.
8. Database credentials remain server-only and are never committed or exposed through `NEXT_PUBLIC_` variables.
9. Local persistence remains a graceful fallback when cloud persistence is unavailable.
10. Assessment summaries are derived from reusable domain logic rather than UI-only calculations.
11. Scoring is provider-neutral so semantic scoring can be introduced without changing the UI/API contract.
12. Each milestone follows the engineering contract: build, tests, documentation and handover.
13. Session identifiers are not authorization; cloud reads and writes require the separate resume credential.

## Deferred

- Interview replay
- Recruiter comparison dashboard
- Full analytics suite
- Production authentication/billing

These remain deferred until the core interview and assessment experience is stable.
