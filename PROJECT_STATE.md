# Project State

_Last updated: 2026-09-02_

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

The candidate homepage now also contains an original, generic enterprise Agentic AI architecture explainer. Its inline responsive SVG shows orchestration, planning and reasoning, model routing, short/long-term memory, RAG, tools, functions, MCP, external APIs, high-risk human approval, guardrails, execution, observability, evaluation, and a controlled improvement loop. Signal dots follow a synchronized 12-second silent process cycle, play only while the diagram is in view, and remain static when reduced motion is requested. The dedicated Agentic AI interview track is labelled as being prepared and is not added to the released-course selector or publication registry.

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
- [ ] Complete independent two-model AI evidence verification for Power BI
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
- [x] Complete independent two-model AI evidence verification for AWS
- [x] Explicitly launch Databricks and Oracle after full AI-evidence verification and source-link verification
- [ ] Explicitly launch each remaining fully AI-verified pack after source-link and production-flow verification
- [ ] Revalidate all official source links and run production browser verification per launch

Routine question approval is intentionally AI-led: two distinct evidence-grounded reviewers must agree before import marks an exact benchmark version `ai-evidence-verified`. Human review is optional dispute escalation, and AI verification is not vendor certification.

The benchmark-answer structure from `docs/BENCHMARK_SCORING_PLAN.md` is now implemented for all 1,050 questions. This creates standard answers and evidence metadata, plus reviewer-ready evidence packets under `apps/web/data/evidence-packets`, but it is not the same as completed vendor-document review. `npm run review:benchmarks -- --dry-run --technology=snowflake --limit=2` verifies the default AI Gateway review runner. `npm run review:benchmarks -- --dry-run --provider=anthropic --technology=snowflake --limit=2` verifies the direct Claude/Anthropic path intended for expiring Claude usage credits; live Claude review requires `ANTHROPIC_API_KEY`, `REVIEW_PROVIDER=anthropic`, `REVIEW_PRIMARY_MODEL`, and `REVIEW_CRITIC_MODEL` with two different Claude model IDs. `npm run review:benchmarks:auto -- --provider=openai --technology=aws --limit=2 --dry-run` verifies the reusable ChatGPT/OpenAI automation path: export packets, review selected statuses, dry-run import, and validate. On 2026-08-24, Claude web review batches were imported after clean dry-runs: 450 valid AWS/Databricks/Informatica reviews, 150 valid Oracle first-pass reviews, two 150-record Informatica re-reviews, and three 150-record Oracle re-reviews, with 0 rejected import records. Informatica then received first-pass remediation for all 125 disputed records and passed final Claude re-review, bringing Informatica to 150 ai-evidence-verified benchmarks. Oracle was also remediated through multiple re-review passes and passed final Claude re-review, bringing Oracle to 150 ai-evidence-verified benchmarks. On 2026-08-25, the ChatGPT/OpenAI automated pipeline processed and imported 300 complete Snowflake/Power BI reviews plus 144 of 150 Python reviews before OpenAI API credits were exhausted. On 2026-08-26, the review workflow gained a zero-cost static triage command (`npm run triage:benchmarks`), bulk generic-answer remediation command (`npm run remediate:benchmarks`), compact re-review packet exporter (`npm run export:rereview-packets`), direct Gemini provider support, Gemini rate-limit retry handling, offset-based compact batches, and verified-only import (`--import-only-verified`). Local remediation has rewritten all 713 non-verified pending records across AWS, Databricks, Snowflake, Power BI, and Python, preserved the 337 already verified records, reset remediated records to `draft`, and reduced static triage flags to 0 across all technologies. Current benchmark status counts after the latest Gemini verified-only import are 707 draft and 343 ai-evidence-verified. By technology: Informatica and Oracle each have 150 verified; AWS has 24 verified and 126 draft; Databricks has 16 verified and 134 draft; Snowflake has 3 verified and 147 draft; Power BI has 150 draft; Python has 150 draft. A first Gemini free-tier pilot reviewed 10 compact AWS draft records and returned 10 disputed, mainly because the compact packet evidence was too thin for advanced/troubleshooting claims and several AWS regenerated answers still had awkward copied-title phrasing. A second Gemini free-tier AWS batch completed 9 records before throttling was stopped; 6 consensus-approved records were imported as ai-evidence-verified and 3 disputed records were left pending. On 2026-08-27, pending AWS and Databricks answers were cleaned to remove `What is ...?` source-title phrasing, and all pending technologies were strengthened with more concrete hands-on benchmark guidance while verified records remained untouched. A follow-up Gemini probe hit repeated free-tier rate limits even at `--limit=1 --concurrency=1`, so live AI review is paused until the Gemini quota window resets or higher quota is available. AWS evidence was then enriched from one broad source link per question to 3-5 official AWS evidence links per cluster, covering setup, security, monitoring/troubleshooting, throttling/quotas, backup/recovery, or cost controls as applicable. Candidate-pack AI readiness is still blocked until every current benchmark in a pack is `ai-evidence-verified`; a human decision is optional escalation evidence and does not replace the required two-model AI consensus. Migration `57f3457d-5e7b-4990-955e-4ecc2e8ae621` was applied to the main Neon branch on 2026-08-24 and verified. Existing `ai-reviewed` content must not be represented as vendor-certified or human-reviewed. Rotate any exposed OpenAI or Gemini API key before further live API review.

### 2026-08-28 AWS review continuation

The authoritative benchmark count is now **362 ai-evidence-verified and 688 draft**, with **541 candidate questions blocked from publication**. AWS advanced from 24 to **43 verified**, leaving **107 draft**; Informatica and Oracle remain 150/150 verified, Databricks remains 16/150, Snowflake 3/150, Power BI 0/150, and Python 0/150. Nineteen AWS records received two-model Gemini consensus approval and were imported only after exact-file dry runs. No disputed verdict was imported. `candidate-aws-autoscaling-elb-01` was rewritten from meta-instructions into a direct ELB/Auto Scaling answer and passed re-review. `candidate-aws-cloudformation-05` gained official StackSets, least-privilege, drift, and rollback evidence and passed re-review. `candidate-aws-cloudwatch-cloudtrail-03` was remediated to separate CloudWatch telemetry from CloudTrail API-event auditing but remains draft pending re-review. A later ten-record call was stopped after repeated free-tier rate limits; its five completed records were audited separately, four approvals were imported, and the one dispute remained draft. Static triage remains at zero local flags. AWS is not launch-ready and remains absent from the production launch registry.

### 2026-08-29 Databricks chat-level two-model review continuation

The authoritative benchmark count is now **408 ai-evidence-verified and 642 draft**, with **495 candidate questions blocked from publication**. Databricks advanced from 16 to **62 verified**, leaving **88 draft**. Chat-level two-model Codex review used separate `gpt-5.4` and `gpt-5.5` reviewers. Auto Loader imports approved `candidate-databricks-auto-loader-02` through `candidate-databricks-auto-loader-06`; Change Data Feed imports approved `candidate-databricks-change-data-feed-02` through `candidate-databricks-change-data-feed-06`; later consensus imports approved Cluster Policies 01-06, Compute 01-06, Delta Lake 02-06, Delta Sharing/OpenSharing 02-06, Pipeline Expectations 02-06, Delta table history/time travel 02-06, and Lakeflow Jobs 02-05. Exact review artifacts are `apps/web/data/benchmark-reviews/databricks-chatgpt-consensus-2026-08-29.reviewed.jsonl` plus batch files `batch2` through `batch12`; imports used exact-file dry runs and verified-only writes. No disputed verdict was imported. Compute records were enriched with official Databricks Spark UI, compute metrics, compute logs, compute policies, Lakeflow Jobs, job permissions, and job repair evidence. Delta Lake records were enriched with official Delta Lake best practices, merge, and table-history evidence. Delta Sharing records were aligned to current OpenSharing terminology and evidence. Pipeline Expectations records were remediated with Lakeflow Declarative Pipelines expectation constraint/action/quality-metric guidance. Static triage is back to zero local flags, `npm run validate:benchmarks` passes, and `apps/web/data/evidence-packets-compact/databricks.jsonl` contains the full 88-record Databricks draft queue for the next review window. This was AI evidence review only, not human review or vendor certification. Databricks is still not launch-ready and remains absent from the production launch registry.

### 2026-08-31 Databricks AI evidence review completion

Databricks is now **150/150 ai-evidence-verified** after optimized chat-level review batches using `gpt-5.6-luna` first pass and `gpt-5.5` critic. The authoritative benchmark count is now **496 ai-evidence-verified and 554 draft**, with **407 candidate questions blocked from publication**. Batch artifacts `apps/web/data/benchmark-reviews/databricks-chatgpt-consensus-2026-08-31-batch13.reviewed.jsonl` through `batch19.reviewed.jsonl` were imported only where two independent AI reviewers agreed, with targeted `--review-file` dry-runs/writes used for the final imports. Reviewer disputes were remediated before re-review: unsupported Secrets `workload identity` wording was narrowed to evidence-supported principal access, generic System Tables and Unity Catalog answers were rewritten with Databricks-specific operational detail, and the final System Tables/Watermarks answers were tightened to cited evidence mechanics. `npm run triage:benchmarks` reports zero local flags and `npm run validate:benchmarks` passes. This is AI evidence verification only, not human review or vendor certification. Databricks stayed hidden until the explicit 2026-08-31 launch-registry publication recorded below.

### 2026-08-31 Databricks and Oracle launch registry publication

Databricks and Oracle Database are now explicitly present in the JSON candidate launch registry after both packs reached **150/150 ai-evidence-verified**. The publication gate still requires both predicates at runtime: full-pack AI evidence verification and explicit launch registry membership. AWS remains blocked at **85/150 verified**, while Power BI and Python remain **0/150 verified**; these packs are not launched. `npm run validate:benchmarks` reports **1,050 total benchmarks, 538 ai-evidence-verified, 512 draft, and 365 blocked candidate questions**. `npm run check:evidence-links -- --offline --fail-on-broken` passed, and a live evidence-link scan reported **273/273 healthy URLs**. This launch does not imply human review, vendor certification, governed database cutover, or completion of the pending Neon governed-content main migration.

### 2026-09-02 Power BI review continuation production push

Current benchmark validation reports **1,050 total benchmarks, 850 ai-evidence-verified, 200 draft, and 200 blocked candidate questions**. AWS, Databricks, Informatica, Oracle Database, and Snowflake are each **150/150 ai-evidence-verified**. Power BI is **100/150 ai-evidence-verified** after governed chat-level batches 1a through 1e using independent two-model consensus; **50 Power BI benchmarks remain draft**. Python remains **0/150 verified** and draft. Power BI batches 1b through 1e were imported only after exact review-file dry runs and verified-only writes; `gpt-5.4-mini` was used as the first-pass reviewer and `gpt-5.5` as the critic, with remediation before re-review where either model disputed generic or under-evidenced answers. Static Power BI triage is 0 flags and `npm run validate:benchmarks` passes. This is AI evidence verification only, not human review or vendor certification. AWS and Power BI are not newly launched by this review push; production exposure still requires explicit launch registry membership plus source-link and production-flow verification.

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

The implemented model is documented in `docs/GOVERNED_CONTENT_SCHEMA.md`. The migration `packages/db/migrations/20260827_01_governed_content.sql` has not yet been approved for or applied to the Neon main branch. Revised migration `6c9b01ff-d490-4563-acfe-38d75ac854c9` and the complete importer/exporter flow passed on temporary branch `br-bitter-dream-a6cc7cum`: 7 technologies, 98 topics, 1,050 questions and benchmarks, 1,476 evidence sources and links, 686 immutable per-model review records, and 1,050 version snapshots. The exact production approval boundary, artifact SHA-256, apply procedure, and post-apply checks are recorded in `docs/GOVERNED_CONTENT_PRODUCTION_MIGRATION_RUNBOOK.md`; approval of that schema artifact does not authorize the separate production content import or read-source cutover. Database reads remain behind `GOVERNED_CONTENT_SOURCE`; JSON is still the default, shadow mode compares unpublished database snapshots while serving JSON and keeps serving JSON if Neon is unavailable, and database mode requires verified status plus exact-version published-batch membership. Content Admin, publication batches, freshness health, and learning-progress routes are implemented; before the migration, linked governed routes render an explicit unavailable/transition state instead of failing or implying readiness. Static triage reports 200 pending drafts and 0 local flags after the latest Power BI review import. No draft or candidate pack is newly exposed, no human/vendor label was inferred, and no publication batch has been launched.

The 2026-08-29 Databricks continuation supersedes the preceding pending-count snapshot: 642 drafts remain, static triage still reports 0 local flags, and the next review actions are additional controlled Databricks compact batches after Delta table history/time travel 06 and Lakeflow Jobs 02-05 were consensus-approved. The production migration, database import/cutover, course launch, provider billing, and human/vendor verification boundaries remain unchanged.

Production commit `868077e` deployed on 2026-08-31 as web deployment `dpl_36bzVdhuJvYqXojtzpZQVFqMW4Fy` (`READY`). Live verification confirmed `/api/courses` exposes Snowflake, Informatica, Databricks, and Oracle; Databricks and Oracle beginner requests each return exactly 10 questions with HTTP 200; AWS remains blocked with HTTP 400. Vercel build error-log inspection showed no build errors, only existing npm allow-scripts warnings for `core-js` and `esbuild`. This release publishes Databricks and Oracle through the JSON launch registry only; it does not apply the governed-content Neon main migration or switch `GOVERNED_CONTENT_SOURCE` to database.

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

