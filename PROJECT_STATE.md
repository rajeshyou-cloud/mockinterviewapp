# Project State

_Last updated: 2026-08-23_

## Current milestone

**Milestone 1 — First usable interview slice**

Status: **IN PROGRESS — implementation substantially complete, CI verification pending**

### Completed

- [x] Repository and monorepo workspace initialized
- [x] Next.js candidate interview shell
- [x] Technology selector for Snowflake and Informatica
- [x] Difficulty selector wired to question API filters
- [x] Text answer experience
- [x] Explainable baseline keyword/concept scoring API
- [x] Interview follow-up display
- [x] Responsive first-pass UI
- [x] FastAPI service and health endpoint
- [x] Documentation-backed technology-neutral starter question pack
- [x] Scenario-question content model established
- [x] Shared JSON Schema for interview questions
- [x] API-backed question loading from `packages/content`
- [x] Web scoring flow connected to FastAPI
- [x] Browser speech-to-text adapter using Web Speech API when supported
- [x] Browser text-to-speech adapter using Speech Synthesis when supported
- [x] Provider-neutral voice adapter interfaces in the web layer
- [x] Server-side STT/TTS provider protocols with deterministic mock adapters
- [x] Basic interview session progression across filtered questions
- [x] FastAPI endpoint tests
- [x] JSON Schema validation test for the starter pack
- [x] Voice-provider contract tests
- [x] Backend/content/voice test verification: 7 tests passing in implementation environment
- [x] GitHub Actions CI workflow for Next.js build and API/content tests
- [x] Living handover document

### Required before Milestone 1 is complete

- [ ] Confirm GitHub Actions web build and API test jobs are green on `main`
- [ ] Perform browser smoke test with both text and microphone flows
- [ ] Finalize Milestone 1 handover after CI/browser verification

## Current user flow

1. Candidate selects Snowflake or Informatica.
2. Candidate selects Beginner, Intermediate, or Advanced.
3. Web app requests matching reviewed questions from FastAPI.
4. Candidate can hear the question using browser text-to-speech when supported.
5. Candidate answers by typing or browser speech recognition when supported.
6. Web app sends the answer and expected concepts to FastAPI scoring.
7. Candidate receives an explainable score, matched concepts, and a follow-up question.
8. Candidate can progress to the next question in the filtered session.

The current starter bank intentionally has only intermediate and advanced examples. A level with no reviewed starter content shows an explicit empty state rather than silently substituting another level.

## Voice architecture

Milestone 1 uses browser speech APIs for an immediately testable zero-provider-cost experience. The API also defines `SpeechToTextProvider` and `TextToSpeechProvider` protocols plus mock implementations so later production providers can be introduced without coupling interview-domain logic to a vendor.

## Product principles

1. The core interview engine is technology-neutral.
2. Snowflake and Informatica are content packs, not hard-coded products.
3. Questions and canonical answers are traceable to official product documentation.
4. AI-generated content must support human review, approval, versioning and re-validation.
5. Voice providers and LLM providers must be replaceable adapters.
6. Scenario-based reasoning is a first-class interview mode.
7. Each milestone follows the engineering contract: build, tests, documentation and handover.

## Next implementation actions

1. Observe/fix CI until the Next.js production build and API tests are green.
2. Browser smoke-test microphone permissions, transcript capture, speech output, scoring, and question progression.
3. Expand the reviewed bank, including beginner coverage, while building toward the 300-question Snowflake/Informatica target.
4. Introduce persistent interview-session models after Milestone 1 is accepted.
5. Replace baseline concept matching with a provider-neutral semantic scoring layer in a later milestone.

## Deferred

- Interview replay
- Recruiter comparison dashboard
- Full analytics suite
- Production authentication/billing

These are intentionally deferred until the core interview experience is stable.
