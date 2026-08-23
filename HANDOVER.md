# Handover

Read `PROJECT_STATE.md` first; it is the authoritative product status and completion record.

## Product

Mock Interview System is a production-deployed candidate-practice application for Snowflake and Informatica. The completed milestone includes 300 questions, stable interview sampling, voice/text answers, structured scoring, Neon persistence, secure cross-device resume, and topic-level completion reports.

Production: https://mockinterviewapp-web.vercel.app

## Repository map

- `apps/web/app/page.tsx` — candidate flow and session UI
- `apps/web/app/api/questions/route.ts` — filtered/stable question sampling
- `apps/web/app/api/score/route.ts` — server-side rubric lookup and scoring
- `apps/web/app/api/sessions` — authenticated Neon persistence routes
- `apps/web/lib/scoring.ts` — AI Gateway, deterministic, and resilient scoring providers
- `apps/web/lib/session.ts` — browser session and versioned resume-key format
- `apps/web/lib/db.ts` — server-only Neon adapter and resume-token hashing
- `apps/web/lib/persistence-validation.ts` — persistence request boundaries
- `apps/web/lib/question-bank.ts` — shared 300-question bank
- `apps/web/data` — versioned content packs
- `apps/api/app/main.py` — standalone FastAPI question/baseline-scoring service
- `packages/db/schema.sql` — persistence schema
- `.github/workflows/ci.yml` — web tests/build and API tests

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

Current verified counts are 30 web tests and 8 API tests. Content tests require exactly 300 valid, unique reviewed questions and sufficient coverage for every technology/difficulty pair.

## Deployment

- Repository: `rajeshyou-cloud/mockinterviewapp`
- Web Vercel project: `mockinterviewapp-web`, Root Directory `apps/web`
- API Vercel project: `mockinterviewapp-api`
- Database: Neon project `mockinterviewapp`, `DATABASE_URL` bound server-side to web Production/Preview
- Both Vercel projects deploy `main` automatically

The final live transaction verified create, answer write, wrong-credential rejection, authorized read-back with restored index, and completion. Its disposable rows were deleted.

## Deferred roadmap

Replay, recruiter analytics/comparison, human reviewer/admin tools, user authentication, and billing are separate future milestones. Preserve the candidate product's provider neutrality and resume-key security if those surfaces are added.
