# Handover

This file is the fastest way for a new developer or a future ChatGPT session to regain project context.

## Product

Mock Interview System is a voice-first technical interview practice platform. Snowflake and Informatica are the first content packs, but the interview engine must remain technology-neutral.

## Start here

Read `PROJECT_STATE.md` first. It is the authoritative implementation status.

The repository contains:

- `apps/web` — Next.js candidate experience
- `apps/web/lib/api.ts` — typed API client
- `apps/web/lib/voice.ts` — provider-neutral browser speech input/output adapters
- `apps/web/lib/session.ts` — browser session model and versioned cross-device resume key
- `apps/web/lib/db.ts` — server-only Neon persistence and hashed resume authorization
- `apps/api` — FastAPI backend
- `packages/content/questions/starter.json` — reviewed starter pack
- `packages/content/schema/question.schema.json` — shared content contract
- `.github/workflows/ci.yml` — web-build and API/content-test gate
- `PROJECT_STATE.md` — authoritative implementation status
- `HANDOVER.md` — restart context

## Current Milestone 2 flow

1. Candidate selects technology and difficulty.
2. Next.js requests matching questions from `GET /v1/questions`.
3. Candidate can hear the question through browser Speech Synthesis when available.
4. Candidate types an answer or uses browser Speech Recognition when available.
5. Next.js sends the answer to `POST /v1/score`.
6. FastAPI returns score, matched concepts, missing concepts, and summary.
7. UI displays explainable feedback and a reviewed follow-up prompt.
8. Candidate progresses through the filtered question set.
9. The browser saves locally and best-effort syncs to Neon.
10. The candidate can copy a private resume key and use it on another device to restore progress and scored answers.
11. Completion persists the aggregate score and displays topic-level assessment.

The browser speech adapters are intentionally interfaces rather than vendor-specific domain code. A production STT/TTS provider can replace or complement them without changing interview content or scoring models.

## API contracts

### `GET /health`
Basic service health.

### `GET /v1/questions`
Optional query parameters:

- `technology=snowflake|informatica`
- `difficulty=beginner|intermediate|advanced`

Returns questions validated by Pydantic from the shared content pack.

### `POST /v1/score`
Request:

```json
{
  "answer": "candidate answer",
  "expected_concepts": ["concept one", "concept two"]
}
```

Returns baseline explainable concept coverage. This is an interface placeholder for later semantic/LLM scoring, not the final assessment algorithm.

## Architecture rules

- Do not hard-code Snowflake/Informatica behavior into the interview engine.
- Keep LLM, STT and TTS providers behind interfaces/adapters.
- Every curated question should contain a stable id, technology, topic, difficulty, type, canonical answer, expected concepts, follow-ups, source, verification date, review status and version.
- Prefer official vendor documentation as the factual source of truth.
- Scenario questions should evaluate reasoning and trade-offs, not keyword recall alone.
- Baseline keyword scoring exists only to establish an explainable API contract; semantic/LLM scoring will supersede it.
- Never mark a milestone complete until build/test verification is green and `PROJECT_STATE.md` has no required unchecked item.
- Treat the resume key as a bearer credential. Store only its SHA-256 hash in Neon, never log it, and require it for every session read or mutation.
- Keep local browser persistence as the graceful fallback when Neon is unavailable.

## Engineering contract

A milestone is complete only when:

1. The intended user flow works end-to-end.
2. Relevant automated tests pass.
3. Content/schema changes are validated.
4. `PROJECT_STATE.md` is updated.
5. `HANDOVER.md` reflects architecture/setup changes.
6. CI/build verification is green.
7. No required milestone item remains unchecked.

## Verification status

Latest local verification: **15 web tests passing**, **7 API tests passing**, the Next.js 16.3.2 production build succeeds, and `npm audit` reports zero known vulnerabilities.

API CI runs pytest through the selected Python interpreter (`python -m pytest`) so the `apps/api` package root is resolved consistently on GitHub-hosted runners.

Neon migration `8281cb61-64e9-4e68-8298-d0d523a77344` has been applied to the main branch. A disposable create/answer/complete/authorized read-back transaction succeeded on main, and its test data was removed.

Commit `c1bfc85` passed GitHub CI #49 and deployed READY to Vercel production on Next.js 16.3.2. The live production routes passed create/answer/complete/authorized read-back verification, the disposable test session was deleted, and a browser review confirmed cloud persistence, resume controls, reviewed question loading and a clean browser/runtime error scan.

GitHub Actions now provides the authoritative repository-level gate for:

- Next.js production build
- FastAPI endpoint tests
- JSON Schema content validation

Milestone 2 remains **IN PROGRESS** for semantic scoring and continued reviewed-content expansion toward 300 questions. Persistence, secure resume identity, deployment and production verification are complete.

## Local development

Start the API:

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Start the web app from the repository root:

```bash
npm install
npm run dev:web
```

The web app defaults to `http://localhost:8000` for the API. Override it with `NEXT_PUBLIC_API_BASE_URL` when needed.

## Next work

- Continue expanding reviewed content from the current 34 questions toward 300.
- Add semantic scoring behind the existing provider-neutral contract.

## Deferred

Interview replay is intentionally deferred. Recruiter analytics and production auth/billing are later milestones.
