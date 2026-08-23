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
- `apps/web/lib/question-bank.ts` — shared 300-question bank
- `apps/web/lib/course-catalog.ts` — central released/planned technology registry
- `apps/web/data` — versioned live content packs
- `apps/web/data/candidates` — complete but not yet human-approved course packs
- `scripts/generate-course-candidates.mjs` — deterministic candidate-pack generator
- `apps/api/app/main.py` — standalone FastAPI question/baseline-scoring service
- `packages/db/schema.sql` — persistence schema
- `.github/workflows/ci.yml` — web tests/build and API tests
- `COURSE_EXPANSION_PLAN.md` — Milestone 3 targets and launch gates

## Runtime flow

1. The browser creates a UUID session and 64-hex-character resume credential.
2. `GET /api/questions` returns a stable, session-seeded sample of 10 reviewed questions.
3. `POST /api/score` resolves the question and rubric on the server, then uses the configured scorer.
4. On Vercel, the scorer attempts AI Gateway and falls back deterministically on provider failure.
5. Session and answer routes store progress in Neon while local storage preserves graceful browser fallback.
6. Cloud routes require the private resume credential; Neon stores only its SHA-256 hash.
7. Refresh or cross-device resume restores the current question, submitted answer, scoring feedback, and progress.
8. Completion stores the final average and renders topic-level strengths/gaps.

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
```

From `apps/api`:

```bash
python -m pytest -q
```

Current deployed counts are 57 web tests and 8 API tests, with a green Next.js production build and zero production dependency vulnerabilities. Live-content tests require exactly 300 valid, unique reviewed questions and sufficient coverage for every released technology/difficulty pair. Candidate-content tests separately enforce 150 unique questions, 50 per difficulty, complete rubrics, and official-source hosts for Databricks, Oracle Database, Power BI, Python, and AWS.

## Deployment

- Repository: `rajeshyou-cloud/mockinterviewapp`
- Web Vercel project: `mockinterviewapp-web`, Root Directory `apps/web`
- API Vercel project: `mockinterviewapp-api`
- Database: Neon project `mockinterviewapp`, `DATABASE_URL` bound server-side to web Production/Preview
- Both Vercel projects deploy `main` automatically

The final live transaction verified create, answer write, wrong-credential rejection, authorized read-back with restored index, and completion. Its disposable rows were deleted.

## Deferred roadmap

Milestone 3 has a live searchable Question Bank UI plus complete 150-question Databricks, Oracle Database, Power BI, Python, and AWS candidate packs. Their 124 unique official source links passed reachability validation on 2026-08-23. The deployed release gate reads approved, source-checked reviewer decisions and exposes only those packs through the course API, interview selector, Question Bank, scoring, and answer persistence. Production verification returned only Snowflake/Informatica, exactly 300 released questions, and HTTP 400 for unapproved Databricks. Candidate packs remain hidden until human approval and per-course launch verification. Replay, recruiter analytics/comparison, human reviewer/admin tools, user authentication, and billing are part of the active completion goal.

## Deployed completion work

- `731e132` adds account-linked session claiming/history, secure account replay, application roles, reviewer decisions, recruiter comparisons, and admin role management.
- `bd502b9` adds Stripe Checkout, customer portal, signed raw-body webhooks, and server-side subscription entitlements.
- Migration `c499f767-72d5-4e71-a535-5745fc8ce5c9` is applied and schema-verified in production. The release passed 51 web tests, 8 API tests, type checking, the Next.js production build, and a zero-vulnerability production dependency audit. Production browser checks covered the reviewer, administrator, recruiter, billing, account-history, and secure replay surfaces. Account deletion now signs out first and deletes application data plus the managed identity atomically; its final disposable-user check left zero identities, roles, subscriptions, or owned sessions.
- Stripe Marketplace installation stopped at the provider terms-acceptance page. After terms acceptance, create Candidate Pro and Recruiter Pro recurring prices, bind the five documented Stripe variables, and register `/api/webhooks/stripe`.
