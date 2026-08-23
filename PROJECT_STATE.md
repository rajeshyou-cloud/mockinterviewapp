# Project State

_Last updated: 2026-08-23_

## Current milestone

**Milestone 2 — Persistent candidate interview and assessment depth**

Status: **COMPLETE**

The candidate-practice product is deployed and verified end to end. It provides a stable 10-question interview, structured scoring, voice/text input, 300 reviewed-content records, durable Neon persistence, secure cross-device resume, and a topic-level completion report.

## Completion evidence

- [x] 300 unique questions across Snowflake and Informatica
- [x] Beginner, intermediate, and advanced coverage for both technologies
- [x] Official Snowflake/Informatica documentation links on every question
- [x] JSON Schema validation and exact-count/uniqueness/coverage tests
- [x] Stable SHA-256-based 10-question sampling per session
- [x] Browser text-to-speech and speech-recognition adapters with text fallback
- [x] Provider-neutral scoring contract
- [x] Server-side reviewed-rubric resolution; clients cannot define their own rubric
- [x] Vercel AI Gateway semantic provider using structured output
- [x] Deterministic explainable fallback when the AI provider is unavailable
- [x] Scoring input bounds and per-session rate protection
- [x] Browser-local session recovery after refresh
- [x] Submitted answer and feedback restoration after refresh/resume
- [x] Neon `interview_sessions` and `interview_answers` persistence
- [x] Private versioned cross-device resume key
- [x] Resume credentials stored only as SHA-256 hashes in Neon
- [x] Credential required for every cloud read and mutation
- [x] Persistence route input validation for IDs, technology, difficulty, indexes, questions, concepts, scores, arrays, and text size
- [x] Topic-level final score and focus-area report
- [x] Route-level create/read/answer/complete/authentication/fallback tests
- [x] Next.js production build and dependency audit
- [x] GitHub Actions web/API gates
- [x] Git-triggered Vercel web and FastAPI production deployments
- [x] Live production question count and stable sampling verification
- [x] Live production create/answer/wrong-credential rejection/read-back/complete transaction against Neon
- [x] Browser verification of cloud status, question rendering, answer submission, feedback, and post-refresh answer restoration
- [x] Disposable Neon verification rows removed after testing

## Verification snapshot

- Web: **57 tests passing** across 15 files on the release branch
- API: **8 tests passing**
- Framework: **Next.js 16.3.2 / React 19.2.8**
- Dependency audit: **0 vulnerabilities**
- GitHub CI: run `32644119415` passed for persistence hardening; later documentation/UX revisions must retain the same gates
- Production web: `https://mockinterviewapp-web.vercel.app`
- Neon project: `mockinterviewapp`; main-branch persistence transaction verified

## AI scoring activation

Semantic scoring is fully implemented behind the provider-neutral contract with model `openai/gpt-5.6-luna`, structured output, a 15-second timeout, prompt-injection boundaries, sanitized error logging, and deterministic fallback.

The current Vercel team rejects live AI Gateway calls until a payment card is added. Production therefore identifies results as **Explainable baseline evaluation** instead of claiming AI evaluation. This is an external account activation prerequisite, not an unfinished code path; after billing is enabled, the deployed code selects AI Gateway automatically without an application change.

## Production identity

Neon Managed Auth has been provisioned on the production database branch. The production application now includes email/password sign-up, sign-in, sign-out, permanent self-deletion, a protected account route, an auth API proxy, signed HTTP-only session cookies, server-side input validation, and middleware protection reserved for account, reviewer, recruiter, and billing surfaces. The auth endpoint, trusted production origin, and an independent 48-byte cookie secret are configured in production. On 2026-08-23 a disposable-user browser test verified sign-up, protected account access, sign-out, sign-in, and deletion; a database check then confirmed that zero disposable test users remained.

Role-based account history, reviewer, recruiter, admin, and billing implementations are deployed, with 57 web tests, 8 API tests, a production build, and zero production dependency vulnerabilities. Migration `c499f767-72d5-4e71-a535-5745fc8ce5c9` was approved and applied to the production Neon branch on 2026-08-23; its temporary verification branch was deleted after the required column, tables, constraints, and indexes were confirmed. A disposable administrator then verified `/review`, `/admin`, `/recruiter`, `/billing`, account-linked history, and secure account replay in production. Final account-deletion verification confirmed atomic cleanup of the identity, roles, subscription, and owned sessions, with zero disposable users remaining.

## Milestone 3 — Course and question-bank expansion

Status: **PREPARATION STARTED**

- [x] Central course registry created
- [x] Databricks, Oracle Database, Power BI, Python, and AWS registered as planned
- [x] Planned courses kept out of the production selector until launch gates pass
- [x] Approval-driven publication gate covers the course API, selector, Question Bank, scoring, and answer persistence
- [x] Initial target set to 150 questions per technology, matching the released courses
- [x] Topic foundations, review gates, and delivery order documented in `COURSE_EXPANSION_PLAN.md`
- [x] Searchable/filterable/paginated Question Bank UI for the existing 300 questions
- [x] Private-key interview replay with answer, score, feedback, concept, and timestamp timeline
- [x] Generate and structurally validate 150 Databricks candidate questions (50 per difficulty)
- [x] Generate and structurally validate 150 Power BI candidate questions (50 per difficulty)
- [x] Verify all 49 unique Databricks/Power BI source URLs are reachable official documentation
- [ ] Human-review and approve the Databricks and Power BI candidate packs
- [x] Generate and structurally validate 150 Oracle Database candidate questions (50 per difficulty)
- [x] Generate and structurally validate 150 Python candidate questions (50 per difficulty)
- [x] Verify all 50 unique Oracle Database/Python source URLs are reachable official documentation
- [ ] Human-review and approve the Oracle Database and Python candidate packs
- [x] Generate and structurally validate 150 AWS candidate questions (50 per difficulty)
- [x] Verify all 25 unique AWS source URLs are reachable official documentation
- [ ] Human-review and approve the AWS candidate pack
- [ ] Human-review and approve each pack before exposing it in production
- [ ] Revalidate all official source links and run production browser verification per launch

## Current user flow

1. Candidate selects Snowflake or Informatica and a difficulty level.
2. The application creates a private session and loads a stable 10-question sample.
3. Candidate answers with text or supported browser speech.
4. The server resolves the reviewed rubric and returns semantic scoring when available or explainable fallback scoring.
5. The browser and Neon retain progress, answers, and feedback.
6. Refresh restores the current question, saved answer, and feedback.
7. A private resume key restores the same cloud session on another device.
8. Completion shows an average score, topic scores, answered count, and focus areas.

## Engineering invariants

1. The interview engine remains technology-neutral.
2. Questions are content packs with stable IDs and official sources.
3. Provider-specific AI and voice behavior remains behind adapters.
4. Database credentials are server-only.
5. Session IDs are not authorization; the separate resume credential is mandatory.
6. Resume credentials are never stored in plaintext in Neon or logged.
7. Browser persistence remains the graceful fallback when Neon is unavailable.
8. Production UI never labels fallback scoring as AI semantic evaluation.
9. Every shipped revision must pass web tests, API tests, content validation, build, and documentation handover.

## Deferred roadmap

- Interview replay — implemented, deployed, and production page verified
- Recruiter comparison and analytics — deployed and administrator-access production verification complete; real recruiter role and cohort-data acceptance pending
- Human reviewer/admin workflow — deployed and administrator-access production verification complete; real reviewer bootstrap and human decisions pending
- Production user authentication — provisioned, deployed, and full account/history/deletion lifecycle verified
- Subscription billing — implementation complete locally; Stripe terms/products/prices/webhook activation pending

These are intentionally separate product surfaces, not incomplete Milestone 2 requirements.
