# Project State

_Last updated: 2026-08-28_

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

The candidate interview experience was visually redesigned on 2026-08-28 with a saturated corporate navy/violet/cyan hero, magenta/amber/emerald accents, compact navigation, clearer session configuration, visible interview progress, structured answer workspace, professional voice controls, evidence provenance, and a dedicated tinted performance-insights panel. The confusing anonymous cross-device resume-key control was removed from the primary interface while persistence and account-linked history remain intact; session messaging now says `Progress saved`. The responsive redesign preserves all interview, persistence, scoring, benchmark-reveal, and accessibility behavior. It passed all 88 web tests, the Next.js production build, and desktop/mobile browser rendering checks at 1440×1100 and 390×844.

The public candidate page now continues below the interview workspace with a six-card product feature section, a three-stage candidate-outcome section, and a final interview call to action. The feature copy reflects implemented behavior only. Until candidates provide approved quotes, the social-proof area deliberately presents outcome transformations instead of fabricated names, employers, interview offers, or testimonials; the page states that named learner stories require the candidate's own words and permission.

Primary candidate navigation now links to How it works, Features, Outcomes, Question Bank, and Account, with Start interview, Replay, and the same marketing destinations available through an accessible compact mobile Menu. A four-step How it works section explains interview selection, voice/text answering, structured feedback, and benchmark-led improvement. All marketing anchors use smooth in-page navigation and preserve direct route links for the question bank, replay, and account.

The verified production-owner account was bootstrapped with the `admin` application role on 2026-08-23. No account identifier or email is stored in the repository. Optional human escalation decisions can be recorded through `/review`, but they are not the routine question-verification or production-release gate.

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
- [ ] Complete independent two-model AI evidence verification for Databricks and Power BI
- [x] Generate and structurally validate 150 Oracle Database candidate questions (50 per difficulty)
- [x] Generate and structurally validate 150 Python candidate questions (50 per difficulty)
- [x] Verify all 50 unique Oracle Database/Python source URLs are reachable official documentation
- [x] Complete independent two-model AI evidence verification for Oracle Database
- [ ] Complete independent two-model AI evidence verification for Python
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
- [ ] Complete independent two-model AI evidence verification for AWS
- [ ] Explicitly launch each fully AI-verified pack after source-link and production-flow verification
- [ ] Revalidate all official source links and run production browser verification per launch

Routine question approval is intentionally AI-led: two distinct evidence-grounded reviewers must agree before import marks an exact benchmark version `ai-evidence-verified`. Human review is optional dispute escalation, and AI verification is not vendor certification.

The benchmark-answer structure from `docs/BENCHMARK_SCORING_PLAN.md` is now implemented for all 1,050 questions. This creates standard answers and evidence metadata, plus reviewer-ready evidence packets under `apps/web/data/evidence-packets`, but it is not the same as completed vendor-document review. `npm run review:benchmarks -- --dry-run --technology=snowflake --limit=2` verifies the default AI Gateway review runner. `npm run review:benchmarks -- --dry-run --provider=anthropic --technology=snowflake --limit=2` verifies the direct Claude/Anthropic path intended for expiring Claude usage credits; live Claude review requires `ANTHROPIC_API_KEY`, `REVIEW_PROVIDER=anthropic`, `REVIEW_PRIMARY_MODEL`, and `REVIEW_CRITIC_MODEL` with two different Claude model IDs. `npm run review:benchmarks:auto -- --provider=openai --technology=aws --limit=2 --dry-run` verifies the reusable ChatGPT/OpenAI automation path: export packets, review selected statuses, dry-run import, and validate. On 2026-08-24, Claude web review batches were imported after clean dry-runs: 450 valid AWS/Databricks/Informatica reviews, 150 valid Oracle first-pass reviews, two 150-record Informatica re-reviews, and three 150-record Oracle re-reviews, with 0 rejected import records. Informatica then received first-pass remediation for all 125 disputed records and passed final Claude re-review, bringing Informatica to 150 ai-evidence-verified benchmarks. Oracle was also remediated through multiple re-review passes and passed final Claude re-review, bringing Oracle to 150 ai-evidence-verified benchmarks. On 2026-08-25, the ChatGPT/OpenAI automated pipeline processed and imported 300 complete Snowflake/Power BI reviews plus 144 of 150 Python reviews before OpenAI API credits were exhausted. On 2026-08-26, the review workflow gained a zero-cost static triage command (`npm run triage:benchmarks`), bulk generic-answer remediation command (`npm run remediate:benchmarks`), compact re-review packet exporter (`npm run export:rereview-packets`), direct Gemini provider support, Gemini rate-limit retry handling, offset-based compact batches, and verified-only import (`--import-only-verified`). Local remediation has rewritten all 713 non-verified pending records across AWS, Databricks, Snowflake, Power BI, and Python, preserved the 337 already verified records, reset remediated records to `draft`, and reduced static triage flags to 0 across all technologies. Current benchmark status counts after the latest Gemini verified-only import are 707 draft and 343 ai-evidence-verified. By technology: Informatica and Oracle each have 150 verified; AWS has 24 verified and 126 draft; Databricks has 16 verified and 134 draft; Snowflake has 3 verified and 147 draft; Power BI has 150 draft; Python has 150 draft. A first Gemini free-tier pilot reviewed 10 compact AWS draft records and returned 10 disputed, mainly because the compact packet evidence was too thin for advanced/troubleshooting claims and several AWS regenerated answers still had awkward copied-title phrasing. A second Gemini free-tier AWS batch completed 9 records before throttling was stopped; 6 consensus-approved records were imported as ai-evidence-verified and 3 disputed records were left pending. On 2026-08-27, pending AWS and Databricks answers were cleaned to remove `What is ...?` source-title phrasing, and all pending technologies were strengthened with more concrete hands-on benchmark guidance while verified records remained untouched. A follow-up Gemini probe hit repeated free-tier rate limits even at `--limit=1 --concurrency=1`, so live AI review is paused until the Gemini quota window resets or higher quota is available. AWS evidence was then enriched from one broad source link per question to 3-5 official AWS evidence links per cluster, covering setup, security, monitoring/troubleshooting, throttling/quotas, backup/recovery, or cost controls as applicable. Candidate-pack AI readiness is still blocked until every current benchmark in a pack is `ai-evidence-verified`; a human decision is optional escalation evidence and does not replace the required two-model AI consensus. Migration `57f3457d-5e7b-4990-955e-4ecc2e8ae621` was applied to the main Neon branch on 2026-08-24 and verified. Existing `ai-reviewed` content must not be represented as vendor-certified or human-reviewed. Rotate any exposed OpenAI or Gemini API key before further live API review.

## Milestone 4 — Governed content platform

Status: **PHASES 1–9 PLATFORM IMPLEMENTED / OPERATIONAL CONTENT AND MAIN MIGRATION GATES PENDING**

- [x] Add additive governed-content tables for technologies, topics, questions, benchmark answers, evidence, reviews, immutable versions, and publication batches.
- [x] Preserve stable text question IDs and semantic benchmark versions.
- [x] Enforce verified-only question publication and verified-only publication-batch membership in Postgres constraints.
- [x] Store AI provider/model review metadata and append-only publication decisions.
- [x] Add a transactional, standard-SQL migration for isolated-branch validation.
- [x] Add schema consistency and governance-contract tests to local and GitHub CI gates.
- [x] Keep JSON as the source of truth and leave all candidate-facing read paths unchanged during Phase 1.
- [x] Validate the revised schema migration on an isolated Neon branch.
- [ ] Obtain exact-artifact production approval and apply the governed schema migration to the Neon main branch.
- [x] Build the idempotent JSON-to-database importer with dry-run and reconciliation summaries.
- [x] Preserve all 1,050 stable question IDs, versions, benchmark statuses, evidence hashes, and exact JSON snapshots.
- [x] Import all 1,050 records on a temporary Neon branch and reconcile normalized table counts.
- [x] Re-import AWS without duplicate questions, benchmarks, evidence, reviews, links, or versions.
- [x] Export all seven technology tracks and deep-compare every record with its JSON source.
- [x] Add `json`, `shadow`, and fail-closed `database` content repository modes.
- [x] Route candidate questions, Question Bank reads, and scoring-rubric lookup through the feature-flagged repository.
- [x] Add parity reporting that compares stable IDs, versions, benchmark status, and evidence hashes without logging content.
- [x] Add role-protected Content Admin dashboards for technologies, topics, review status, and publication status.
- [x] Add filtered/paginated question management, evidence-backed draft creation, immutable revisions, evidence attachment, review history, version history, human decisions, and bulk stale/unpublish/retire actions.
- [x] Add OpenAI-compatible low-cost review support, two-model consensus-only automatic import, resumable batch/quota controls, retry policy, per-review token/cost metadata, and batch cost summaries.
- [x] Add offline/live evidence link health checks, optional fetched-content hashes, a dry-run-by-default audited stale/unpublish apply workflow, weekly CI freshness workflow, broken-link triage integration, and content-health dashboards.
- [x] Add audited publication-batch creation, readiness, approval, publish/unpublish, frozen version membership, release notes, launch checklist, and rollback.
- [x] Require database candidate reads to belong to the currently published batch at the exact question and benchmark versions.
- [x] Add account learning progress with topic coverage, weak-area recommendations, difficulty progression, scenario prioritization, score history, and recruiter-style practice summaries.
- [x] Add a single stakeholder Project Flow dashboard showing the evidence-to-publication process, schema entity map, lifecycle/status counts, technology progress, review throughput, evidence coverage, and release readiness with truthful JSON-transition fallback.
- [x] Reveal benchmark answers in interview mode only after submission; completion continues to provide topic gaps and revision focus.
- [x] Define 1,000-question track taxonomy/distribution/evidence standards and add capacity, quality-score, and prioritized-review reporting without generating or publishing unverified filler.
- [x] Extend CI with review-runtime, evidence-link structure, and content-scale report gates.
- [ ] Switch read paths only after imported counts, statuses, versions, hashes, and release gates match JSON.

The implemented model is documented in `docs/GOVERNED_CONTENT_SCHEMA.md`. The migration `packages/db/migrations/20260827_01_governed_content.sql` has not yet been approved for or applied to the Neon main branch. Revised migration `6c9b01ff-d490-4563-acfe-38d75ac854c9` and the complete importer/exporter flow passed on temporary branch `br-bitter-dream-a6cc7cum`: 7 technologies, 98 topics, 1,050 questions and benchmarks, 1,476 evidence sources and links, 686 immutable per-model review records, and 1,050 version snapshots. The exact production approval boundary, artifact SHA-256, apply procedure, and post-apply checks are recorded in `docs/GOVERNED_CONTENT_PRODUCTION_MIGRATION_RUNBOOK.md`; approval of that schema artifact does not authorize the separate production content import or read-source cutover. Database reads remain behind `GOVERNED_CONTENT_SOURCE`; JSON is still the default, shadow mode compares unpublished database snapshots while serving JSON and keeps serving JSON if Neon is unavailable, and database mode requires verified status plus exact-version published-batch membership. Content Admin, publication batches, freshness health, and learning-progress routes are implemented; before the migration, linked governed routes render an explicit unavailable/transition state instead of failing or implying readiness. Static triage reports 707 pending drafts and 0 local flags, but live independent review remains blocked by provider quota/credits and a previously exposed Gemini key must be rotated before reuse. No draft or candidate pack is newly exposed, no human/vendor label was inferred, and no publication batch has been launched.

Production commit `699da86` deployed on 2026-08-28 as web deployment `dpl_5i85tzc27Nme2qM2ekBhqMjziqgi` (`READY`) and a corresponding `mockinterviewapp-api` production deployment (`READY`). Live verification confirmed the canonical web home and API health return 200, `/api/courses` exposes only Snowflake and Informatica, a Snowflake beginner request returns exactly 10 benchmark-bearing questions, Databricks remains blocked with HTTP 400, and unauthenticated `/admin/content/flow` redirects to sign-in. The first live check exposed that legacy approved human course-review rows could release candidate packs after their benchmarks had been reset to draft; `699da86` removed that authority. Candidate release now requires current full-pack AI evidence verification plus a separate explicit launch-registry entry. The post-deploy error query returned no web error logs. Signed-in visual browser verification was not performed in this release because the in-app browser connection was unavailable.

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
- Optional human escalation/admin workflow — deployed; routine question verification remains independent two-model AI consensus
- Production user authentication — provisioned, deployed, and full account/history/deletion lifecycle verified
- Subscription billing — implementation complete locally; Stripe terms/products/prices/webhook activation pending

These are intentionally separate product surfaces, not incomplete Milestone 2 requirements.

