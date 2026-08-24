# Handover

Read `PROJECT_STATE.md` first; it is the authoritative product status and completion record.

## Product

Mock Interview System is a production-deployed candidate-practice application for Snowflake and Informatica. The completed milestone includes 300 questions, stable interview sampling, voice/text answers, structured scoring, Neon persistence, secure cross-device resume, and topic-level completion reports.

Production: https://mockinterviewapp-web.vercel.app

## Repository map

- `apps/web/app/page.tsx` — candidate flow and session UI
- `apps/web/app/questions/page.tsx` — server-rendered Question Bank search, filters, pagination, and answer review
- `apps/web/app/replay/page.tsx` — private resume-key interview timeline and scoring replay
- `apps/web/app/api/questions/route.ts` — filtered/stable question sampling
- `apps/web/app/api/score/route.ts` — server-side rubric lookup and scoring
- `apps/web/app/api/sessions` — authenticated Neon persistence routes
- `apps/web/app/api/auth/[...path]` — Neon Managed Auth API proxy
- `apps/web/app/auth` — custom sign-in/sign-up server actions and forms
- `apps/web/app/account` — protected signed-in account surface
- `apps/web/lib/auth/server.ts` — server-only Managed Auth configuration
- `apps/web/proxy.ts` — Next.js 16 protection for account/staff/billing routes
- `apps/web/lib/scoring.ts` — AI Gateway, deterministic, and resilient scoring providers
- `apps/web/lib/session.ts` — browser session and versioned resume-key format
- `apps/web/lib/db.ts` — server-only Neon adapter and resume-token hashing
- `apps/web/lib/persistence-validation.ts` — persistence request boundaries
- `apps/web/lib/benchmark-review.ts` — benchmark verification summary and candidate-pack launch gate
- `apps/web/lib/candidate-packs.ts` — shared hidden course-pack registry
- `apps/web/lib/question-bank.ts` — shared 300-question bank
- `apps/web/lib/course-catalog.ts` — central released/planned technology registry
- `apps/web/data` — versioned live content packs with benchmark-answer records
- `apps/web/data/candidates` — complete but not yet human-approved course packs with benchmark-answer records
- `apps/web/data/evidence-packets` — reviewer-ready JSONL evidence packets and manifest
- `scripts/generate-course-candidates.mjs` — deterministic candidate-pack generator
- `scripts/export-evidence-packets.mjs` — evidence-packet exporter grouped by technology
- `scripts/import-benchmark-reviews.mjs` — consensus-validated review-status importer
- `scripts/review-benchmark-packets.mjs` — dual-model benchmark review runner
- `scripts/validate-benchmarks.mjs` — benchmark-answer validator and publication-blocking summary
- `apps/api/app/main.py` — standalone FastAPI question/baseline-scoring service
- `packages/db/schema.sql` — persistence schema
- `.github/workflows/ci.yml` — web tests/build and API tests
- `COURSE_EXPANSION_PLAN.md` — Milestone 3 targets and launch gates
- `docs/BENCHMARK_SCORING_PLAN.md` — vendor-evidence benchmark, dual-AI review, semantic scoring, persistence, calibration, and rollout plan

## Runtime flow

1. The browser creates a UUID session and 64-hex-character resume credential.
2. `GET /api/questions` returns a stable, session-seeded sample of 10 reviewed questions.
3. `POST /api/score` resolves the question and rubric on the server, then uses the configured scorer.
4. On Vercel, the scorer attempts AI Gateway and falls back deterministically on provider failure.
5. The score response includes dimension scores plus the benchmark version and scoring-policy version used for the result.
6. Session and answer routes store progress in Neon while local storage preserves graceful browser fallback.
7. Cloud routes require the private resume credential; Neon stores only its SHA-256 hash.
8. Refresh or cross-device resume restores the current question, submitted answer, scoring feedback, and progress.
9. Completion stores the final average and renders topic-level strengths/gaps.

The production web app uses self-contained Next.js routes for scoring and persistence. `NEXT_PUBLIC_API_BASE_URL` affects question retrieval only and is optional. The standalone FastAPI service remains independently deployable and exposes `/health`, `/v1/questions`, and a baseline `/v1/score` contract.

## Scoring configuration

- Default Vercel model: `openai/gpt-5.6-luna`
- Force baseline: `SCORING_PROVIDER=deterministic`
- Force gateway: `SCORING_PROVIDER=gateway`
- Override model: `SCORING_MODEL=<gateway-model-id>`
- Local gateway credential: `AI_GATEWAY_API_KEY`
- Vercel authentication: automatically supplied OIDC when AI Gateway is enabled for the team

The current Vercel team needs a payment card before Gateway calls are serviced. Until then, production safely returns `ai-gateway:...->deterministic-keyword`, and the UI labels the result as an explainable baseline evaluation. Do not remove the fallback or claim live AI scoring until a production response returns an `ai-gateway:` provider without `->`.

## Authentication configuration

Neon Managed Auth is enabled on the production database branch. Vercel Production contains `NEON_AUTH_BASE_URL` and a sensitive `NEON_AUTH_COOKIE_SECRET`; neither value belongs in Git. The managed-auth project trusts `https://mockinterviewapp-web.vercel.app`. `apps/web/.env.example` documents the required names for local setup. The public interview remains accessible without an account, while `/account`, `/review`, `/recruiter`, and `/billing` are authentication-protected. A disposable-user production test verified sign-up, protected account access, sign-out, sign-in, and permanent deletion, followed by a database query confirming zero test users remained. Migration `c499f767-72d5-4e71-a535-5745fc8ce5c9` added the production role, review, subscription, and session-ownership schema on 2026-08-23.

The verified production-owner identity has the `admin` application role. Its PII is intentionally absent from this handover. Refreshing `/account` exposes the review, recruiter, and access-management links needed for the human course-review phase.

## Verification commands

From the repository root:

```bash
npm install
npm run test:web
npm run build:web
npm audit --audit-level=high
npm run validate:benchmarks
npm run export:evidence-packets
npm run import:benchmark-reviews -- --dry-run
npm run review:benchmarks -- --dry-run --technology=snowflake --limit=2
npm run review:benchmarks -- --dry-run --provider=anthropic --technology=snowflake --limit=2
```

From `apps/api`:

```bash
python -m pytest -q
```

Current local verification counts are 62 web tests and 9 API tests, with a green Next.js production build. Live-content tests require exactly 300 valid, unique reviewed questions and sufficient coverage for every released technology/difficulty pair. Candidate-content tests separately enforce 150 unique questions, 50 per difficulty, complete rubrics, official-source hosts, and complete benchmark-answer records for Databricks, Oracle Database, Power BI, Python, and AWS. API schema tests now validate benchmark records across all 1,050 released and candidate questions. `npm run validate:benchmarks` currently reports 1,050 total benchmarks, 150 per technology, 613 draft, 266 disputed, 171 ai-evidence-verified, 691 candidate questions blocked from publication, and 150 evidence packets per technology. GitHub Actions now runs the benchmark validator in the web job.

## Deployment

- Repository: `rajeshyou-cloud/mockinterviewapp`
- Web Vercel project: `mockinterviewapp-web`, Root Directory `apps/web`
- API Vercel project: `mockinterviewapp-api`
- Database: Neon project `mockinterviewapp`, `DATABASE_URL` bound server-side to web Production/Preview
- Both Vercel projects deploy `main` automatically

The final live transaction verified create, answer write, wrong-credential rejection, authorized read-back with restored index, and completion. Its disposable rows were deleted.

Migration `57f3457d-5e7b-4990-955e-4ecc2e8ae621` was applied to the main Neon branch on 2026-08-24 after temporary-branch verification. It added answer-level benchmark/scorer metadata and immutable scoring-run audit storage; a post-apply schema check confirmed the columns, table, and index.

Latest production deployment check: commit `04767de` deployed to `mockinterviewapp-web` as `READY` on 2026-08-24. Runtime error scan for that deployment returned no error/fatal logs, and a production `/api/questions` request returned benchmark-bearing Snowflake content.

## Deferred roadmap

Milestone 3 has a live searchable Question Bank UI plus complete 150-question Databricks, Oracle Database, Power BI, Python, and AWS candidate packs. Their 124 unique official source links passed reachability validation on 2026-08-23. All 1,050 released and candidate questions now have standard benchmark-answer records: benchmark version, canonical answer, expanded explanation, required concepts, optional depth, accepted alternatives, evidence metadata, scoring anchors, and draft benchmark-review status. Evidence packets are exported as JSONL by technology for independent AI or human review. The dual-model review runner supports dry-run validation and live review when `REVIEW_PRIMARY_MODEL` and `REVIEW_CRITIC_MODEL` are set to different AI Gateway model IDs. The review importer validates consensus before changing benchmark statuses. The Question Bank and reviewer views display benchmark details, scoring now resolves benchmark content server-side, and candidate feedback includes accuracy, required coverage, reasoning, and clarity dimensions.

These benchmark answers are structurally complete but not vendor-evidence verified. Every benchmark review status is intentionally `draft` until the independent AI evidence review, dispute workflow, and any chosen human escalation have run. Candidate pack approval is blocked until all benchmarks are `ai-evidence-verified` or `human-verified`. Do not label this content vendor-certified, human-reviewed, or `ai-evidence-verified` yet.

The deployed release gate reads approved, source-checked reviewer decisions and exposes only those packs through the course API, interview selector, Question Bank, scoring, and answer persistence. Production verification returned only Snowflake/Informatica, exactly 300 released questions, and HTTP 400 for unapproved Databricks. Candidate packs remain hidden until human approval and per-course launch verification. Replay, recruiter analytics/comparison, human reviewer/admin tools, user authentication, and billing are part of the active completion goal.

The proposed replacement or supplement for manual content review is documented in `docs/BENCHMARK_SCORING_PLAN.md`. The benchmark-answer schema, baseline data migration, evidence-packet export, dual-model review runner, review-status importer, publication gate, dimension scoring, standalone validator, CI gate, and Neon scoring-run migration are implemented. The review runner supports both Vercel AI Gateway and direct Anthropic/Claude execution. To use expiring Claude usage credits for offline review, set `ANTHROPIC_API_KEY`, `REVIEW_PROVIDER=anthropic`, `REVIEW_PRIMARY_MODEL`, and `REVIEW_CRITIC_MODEL`, then run a small pilot such as `npm run review:benchmarks -- --provider=anthropic --technology=snowflake --limit=10` before running full technology packs. Claude web review batches covering Informatica, AWS, Databricks, and Oracle were imported, including Informatica and Oracle re-reviews: 900 valid review records processed, 171 currently ai-evidence-verified, and 266 still disputed outside the remediated draft sets. Informatica's original 125 disputed records were remediated; second-pass Claude review approved 112 and disputed 38 advanced `-06`/`-07` variants. Those remaining 38 were rewritten to make high-volume reliability/cost evolution distinct from post-deployment diagnosis/recovery, reset to draft, and refreshed in the `sentforrereview` upload files. Oracle's concept gaps are fixed and all 25 conceptual questions are now verified; Claude rejected 125 non-conceptual Oracle answers for self-referential template corruption, so those 125 were regenerated with clean feature labels, reset to draft, and refreshed in the `sentforrereview` upload files. The stale Informatica first-pass, Informatica second-pass, Oracle first-pass, and Oracle second-pass review outputs were moved under `apps/web/data/benchmark-reviews/archive`, and the refreshed Informatica/Oracle evidence packets are ready for re-review under `apps/web/data/evidence-packets/claude-chunks/sentforrereview` with `sentforrereview` in each upload filename. Still pending: re-reviewing the final 38 Informatica advanced variants and 125 Oracle non-conceptual variants, reviewing Snowflake, Power BI, and Python; remediating AWS/Databricks disputed benchmarks; importing real review verdicts into benchmark statuses; unanimous approval for an `ai-evidence-verified` label; withholding disputed or stale questions; and calibration.

## Deployed completion work

- `731e132` adds account-linked session claiming/history, secure account replay, application roles, reviewer decisions, recruiter comparisons, and admin role management.
- `bd502b9` adds Stripe Checkout, customer portal, signed raw-body webhooks, and server-side subscription entitlements.
- Migration `c499f767-72d5-4e71-a535-5745fc8ce5c9` is applied and schema-verified in production. The release passed 51 web tests, 8 API tests, type checking, the Next.js production build, and a zero-vulnerability production dependency audit. Production browser checks covered the reviewer, administrator, recruiter, billing, account-history, and secure replay surfaces. Account deletion now signs out first and deletes application data plus the managed identity atomically; its final disposable-user check left zero identities, roles, subscriptions, or owned sessions.
- Stripe Marketplace installation stopped at the provider terms-acceptance page. After terms acceptance, create Candidate Pro and Recruiter Pro recurring prices, bind the five documented Stripe variables, and register `/api/webhooks/stripe`.
