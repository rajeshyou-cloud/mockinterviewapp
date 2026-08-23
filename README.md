# Mock Interview System

Production-deployed technical interview practice for Snowflake and Informatica. Candidates receive a stable 10-question interview, answer by text or browser voice, get structured scoring and follow-up prompts, and securely resume their session on another device.

Production: https://mockinterviewapp-web.vercel.app

## Delivered candidate experience

- 300 schema-validated, official-documentation-backed questions
- Snowflake and Informatica across beginner, intermediate, and advanced levels
- Stable per-session question sampling
- Text and browser speech input/output
- Explainable baseline scoring with matched and missing concepts
- Optional Vercel AI Gateway semantic scoring with deterministic fallback
- Topic-level completion report and recommended focus areas
- Neon Postgres session and answer persistence
- Same-browser refresh recovery and private-key cross-device resume
- Server-side rubric resolution, bounded persistence inputs, and scoring rate protection

## Architecture

- `apps/web` — Next.js candidate UI, scoring route, question route, and Neon persistence routes
- `apps/api` — independently deployable FastAPI question and baseline-scoring service
- `apps/web/data` — the complete 300-question content bank
- `packages/content` — shared content schema and original starter contract
- `packages/db/schema.sql` — Neon persistence schema
- `scripts/generate-question-bank.mjs` — reproducible expansion generator
- `apps/web/lib/course-catalog.ts` — central released/planned course registry
- `COURSE_EXPANSION_PLAN.md` — Milestone 3 scope, launch gates, and course order
- `PROJECT_STATE.md` — authoritative product and deployment status
- `HANDOVER.md` — developer restart guide

## Local verification

```bash
npm install
npm run test:web
npm run build:web

cd apps/api
pip install -r requirements.txt
python -m pytest -q
```

The web app uses its self-contained Next.js question and scoring routes by default. Set `NEXT_PUBLIC_API_BASE_URL` only when intentionally using the standalone FastAPI question service. Set `DATABASE_URL` server-side for Neon persistence.

AI Gateway scoring is selected automatically on Vercel and falls back safely to the explainable scorer if the gateway is unavailable. Activating live gateway calls requires an AI Gateway-enabled Vercel team with billing configured; `SCORING_PROVIDER=deterministic` can explicitly force baseline mode.

## Roadmap outside the completed candidate product

Milestone 3 prepares Databricks, Oracle Database, Power BI, Python, and AWS at an initial target of 150 questions each and adds a searchable Question Bank UI. Recruiter comparison, replay, full analytics, reviewer/admin workflows, production user accounts, and billing remain separate future product surfaces.
