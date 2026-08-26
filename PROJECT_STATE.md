# Project State

_Last updated: 2026-08-26_

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

- Web: **57 tests passing** across 15 files on the deployed completion branch
- API: **9 tests passing**
- Framework: **Next.js 16.3.2 / React 19.2.8**
- Dependency audit: **0 vulnerabilities**
- GitHub CI: run `32644119415` passed for persistence hardening; later documentation/UX revisions must retain the same gates
- Production web: `https://mockinterviewapp-web.vercel.app`
- Neon project: `mockinterviewapp`; main-branch persistence transaction verified
- Latest benchmark/review-tooling deployment: commit `04767de` deployed to Vercel production as `READY` on 2026-08-24; production runtime error scan found no error/fatal logs, and `/api/questions` returned benchmark-bearing Snowflake content.

## AI scoring activation

Semantic scoring is fully implemented behind the provider-neutral contract with model `openai/gpt-5.6-luna`, structured output, a 15-second timeout, prompt-injection boundaries, sanitized error logging, and deterministic fallback.

The current Vercel team rejects live AI Gateway calls until a payment card is added. Production therefore identifies results as **Explainable baseline evaluation** instead of claiming AI evaluation. This is an external account activation prerequisite, not an unfinished code path; after billing is enabled, the deployed code selects AI Gateway automatically without an application change.

## Production identity

Neon Managed Auth has been provisioned on the production database branch. The production application now includes email/password sign-up, sign-in, sign-out, permanent self-deletion, a protected account route, an auth API proxy, signed HTTP-only session cookies, server-side input validation, and middleware protection reserved for account, reviewer, recruiter, and billing surfaces. The auth endpoint, trusted production origin, and an independent 48-byte cookie secret are configured in production. On 2026-08-23 a disposable-user browser test verified sign-up, protected account access, sign-out, sign-in, and deletion; a database check then confirmed that zero disposable test users remained.

Role-based account history, reviewer, recruiter, admin, and billing implementations are deployed, with 57 web tests, 8 API tests, a production build, and zero production dependency vulnerabilities. Migration `c499f767-72d5-4e71-a535-5745fc8ce5c9` was approved and applied to the production Neon branch on 2026-08-23; its temporary verification branch was deleted after the required column, tables, constraints, and indexes were confirmed. A disposable administrator then verified `/review`, `/admin`, `/recruiter`, `/billing`, account-linked history, and secure account replay in production. Final account-deletion verification confirmed atomic cleanup of the identity, roles, subscription, and owned sessions, with zero disposable users remaining.

The verified production-owner account was bootstrapped with the `admin` application role on 2026-08-23. No account identifier or email is stored in the repository. Human pack decisions can now be recorded through `/review`.

## Milestone 3 — Course and question-bank expansion

Status: **BENCHMARK STRUCTURE COMPLETE / INFORMATICA AND ORACLE CLAUDE-VERIFIED**

- [x] Central course registry created
- [x] Databricks, Oracle Database, Power BI, Python, and AWS registered as planned
- [x] Planned courses kept out of the production selector until launch gates pass
- [x] Approval-driven publication gate covers the course API, selector, Question Bank, scoring, and answer persistence
- [x] Production gate verified with exactly Snowflake/Informatica and 300 questions released while Databricks remained blocked before approval
- [x] Initial target set to 150 questions per technology, matching the released courses
- [x] Topic foundations, review gates, and delivery order documented in `COURSE_EXPANSION_PLAN.md`
- [x] Vendor-evidence benchmark and semantic-scoring implementation plan documented in `docs/BENCHMARK_SCORING_PLAN.md`
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
- [x] Add versioned benchmark-answer records to all 1,050 released and candidate questions
- [x] Add benchmark evidence metadata, required/optional concepts, accepted alternatives, scoring anchors, and draft review status to every question
- [x] Make scoring resolve benchmark answers server-side and return benchmark/scoring-policy versions
- [x] Add dimension-level scoring output for accuracy, required coverage, reasoning, and clarity
- [x] Make the Question Bank and reviewer screens display benchmark-answer details
- [x] Enforce benchmark-review publication gates so draft/disputed/stale/rejected benchmark packs cannot be approved for launch
- [x] Extend content/schema tests so all 1,050 questions must keep complete benchmark records
- [x] Add and apply Neon database migration for benchmark/scorer metadata and immutable scoring-run records
- [x] Add standalone benchmark validation command with status/count/publication-blocking summary
- [x] Export reviewer-ready benchmark evidence packets for all 1,050 questions, grouped by technology
- [x] Add dual-model benchmark review runner with dry-run validation and live AI Gateway model configuration
- [x] Add direct Anthropic/Claude batch-review mode so expiring Claude usage credits can be used for offline benchmark review
- [x] Add deterministic benchmark review importer with consensus validation before status updates
- [x] Add reusable automated benchmark-review pipeline for ChatGPT/OpenAI, Vercel AI Gateway, or Claude providers
- [x] Add cost-controlled static triage, bulk remediation, and compact `sentforrereview` packet export so paid AI review is reserved for judgment-heavy records
- [x] Add benchmark validation to GitHub Actions CI
- [x] Import first Claude web review batch covering 450 evidence packets across Informatica, AWS, and Databricks
- [x] Prepare `sentforrereview` Claude upload chunks for remediated Informatica and Oracle packets
- [x] Import final Informatica re-review and verify all 150 Informatica benchmarks as ai-evidence-verified
- [x] Import final Oracle re-review and verify all 150 Oracle benchmarks as ai-evidence-verified
- [ ] Human-review and approve the AWS candidate pack
- [ ] Human-review and approve each pack before exposing it in production
- [ ] Revalidate all official source links and run production browser verification per launch

The benchmark-answer structure from `docs/BENCHMARK_SCORING_PLAN.md` is now implemented for all 1,050 questions. This creates standard answers and evidence metadata, plus reviewer-ready evidence packets under `apps/web/data/evidence-packets`, but it is not the same as completed vendor-document review. `npm run review:benchmarks -- --dry-run --technology=snowflake --limit=2` verifies the default AI Gateway review runner. `npm run review:benchmarks -- --dry-run --provider=anthropic --technology=snowflake --limit=2` verifies the direct Claude/Anthropic path intended for expiring Claude usage credits; live Claude review requires `ANTHROPIC_API_KEY`, `REVIEW_PROVIDER=anthropic`, `REVIEW_PRIMARY_MODEL`, and `REVIEW_CRITIC_MODEL` with two different Claude model IDs. `npm run review:benchmarks:auto -- --provider=openai --technology=aws --limit=2 --dry-run` verifies the reusable ChatGPT/OpenAI automation path: export packets, review selected statuses, dry-run import, and validate. On 2026-08-24, Claude web review batches were imported after clean dry-runs: 450 valid AWS/Databricks/Informatica reviews, 150 valid Oracle first-pass reviews, two 150-record Informatica re-reviews, and three 150-record Oracle re-reviews, with 0 rejected import records. Informatica then received first-pass remediation for all 125 disputed records and passed final Claude re-review, bringing Informatica to 150 ai-evidence-verified benchmarks. Oracle was also remediated through multiple re-review passes and passed final Claude re-review, bringing Oracle to 150 ai-evidence-verified benchmarks. On 2026-08-25, the ChatGPT/OpenAI automated pipeline processed and imported 300 complete Snowflake/Power BI reviews plus 144 of 150 Python reviews before OpenAI API credits were exhausted. On 2026-08-26, the review workflow gained a zero-cost static triage command (`npm run triage:benchmarks`), bulk generic-answer remediation command (`npm run remediate:benchmarks`), and compact re-review packet exporter (`npm run export:rereview-packets`) so obvious generator/template failures are grouped and fixed locally before any paid AI review. AWS remediation rewrote 132 non-verified records, preserved the 18 already verified records, reset the rewritten records to `draft`, and reduced AWS static triage flags to 0. Current benchmark status counts after AWS remediation are 138 draft, 570 disputed, 5 rejected, and 337 ai-evidence-verified. By technology: Informatica and Oracle each have 150 verified; AWS has 18 verified and 132 draft awaiting compact re-review; Databricks has 16 verified and 134 disputed; Snowflake has 3 verified, 146 disputed, and 1 rejected; Power BI has 150 disputed; Python has 140 disputed, 4 rejected, and 6 draft. Candidate-pack approval is still blocked until every benchmark in a pack is `ai-evidence-verified` or `human-verified`. Migration `57f3457d-5e7b-4990-955e-4ecc2e8ae621` was applied to the main Neon branch on 2026-08-24 and verified. Existing `ai-reviewed` content must not be represented as vendor-certified or human-reviewed. Rotate the exposed OpenAI API key before any further live API review.

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
