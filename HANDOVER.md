# Handover

This file is the fastest way for a new developer or a future ChatGPT session to regain project context.

## Product

Mock Interview System is a voice-first technical interview practice platform. Snowflake and Informatica are the first content packs, but the interview engine must remain technology-neutral.

## Current state

Read `PROJECT_STATE.md` first. Milestone 1 is currently in progress.

The repository contains:

- `apps/web` — Next.js candidate experience
- `apps/api` — FastAPI backend
- `packages/content` — versioned question-bank content
- `PROJECT_STATE.md` — authoritative implementation status
- `HANDOVER.md` — restart context

## Architecture rules

- Do not hard-code Snowflake/Informatica behavior into the interview engine.
- Keep LLM, STT and TTS providers behind interfaces/adapters.
- Every curated question should contain a stable id, technology, topic, difficulty, type, canonical answer, expected concepts, follow-ups, source, verification date, review status and version.
- Prefer official vendor documentation as the factual source of truth.
- Scenario questions should evaluate reasoning and trade-offs, not keyword recall alone.
- Baseline keyword scoring exists only to establish an explainable API contract; semantic/LLM scoring will supersede it.

## Engineering contract

A milestone is complete only when:

1. The intended user flow works end-to-end.
2. Relevant automated tests pass.
3. Content/schema changes are validated.
4. `PROJECT_STATE.md` is updated.
5. `HANDOVER.md` reflects any architecture or setup changes.
6. No required milestone item remains unchecked.

## Milestone 1 target

A candidate can:

1. choose Snowflake or Informatica,
2. choose a level,
3. receive a question,
4. answer by text or microphone,
5. submit the answer,
6. receive explainable scoring/feedback,
7. receive an interviewer follow-up,
8. progress through a basic interview session.

## Next work

- Shared question schema validation
- API-backed content loading
- API-backed scoring from the web UI
- Microphone capture
- STT/TTS provider contracts and initial adapters
- Tests and local build verification

## Deferred

Interview replay is intentionally deferred. Recruiter analytics and production auth/billing are later milestones.
