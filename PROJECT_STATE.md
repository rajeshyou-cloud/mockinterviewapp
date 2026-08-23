# Project State

_Last updated: 2026-08-23_

## Current milestone

**Milestone 1 — First usable interview slice**

Status: **IN PROGRESS**

### Completed

- [x] Repository and monorepo workspace initialized
- [x] Next.js candidate interview shell
- [x] Technology selector for Snowflake and Informatica
- [x] Difficulty selector placeholder
- [x] Text answer experience
- [x] Explainable baseline keyword/concept score
- [x] Interview follow-up display
- [x] Responsive first-pass UI
- [x] FastAPI service and health endpoint
- [x] Baseline scoring API contract
- [x] Documentation-backed technology-neutral starter question pack
- [x] Scenario-question content model established

### Required before Milestone 1 is complete

- [ ] Move UI question loading from local constants to shared content pack/API
- [ ] Connect web scoring flow to FastAPI endpoint
- [ ] Browser microphone capture
- [ ] Speech-to-text provider interface and local/mock adapter
- [ ] Text-to-speech provider interface and browser/mock adapter
- [ ] Interview session state and question progression
- [ ] Basic test suite for API and content schema
- [ ] Local developer setup verification
- [ ] Handover and architecture documentation updated to final Milestone 1 state

## Product principles

1. The core interview engine is technology-neutral.
2. Snowflake and Informatica are content packs, not hard-coded products.
3. Questions and canonical answers are traceable to official product documentation.
4. AI-generated content must support human review, approval, versioning and re-validation.
5. Voice providers and LLM providers must be replaceable adapters.
6. Scenario-based reasoning is a first-class interview mode.
7. Each milestone follows the engineering contract: build, tests, documentation and handover.

## Next implementation actions

1. Define the shared question schema and content loader.
2. Wire the web application to the API.
3. Add browser audio capture and provider-neutral voice contracts.
4. Add Milestone 1 tests.
5. Expand the verified starter bank while the full 300-question research bank is developed.

## Deferred

- Interview replay
- Recruiter comparison dashboard
- Full analytics suite
- Production authentication/billing

These are intentionally deferred until the core interview experience is stable.
