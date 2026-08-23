# Mock Interview System

Voice-first, extensible technical mock interview platform.

Initial technology packs: Snowflake and Informatica.

The architecture is designed so additional technologies such as Databricks, Oracle, Power BI, Python and AWS can be added as content packs without changing the core interview engine.

## Planned capabilities

- Voice and text interviews
- Adaptive AI follow-up questions
- Official-documentation-backed question bank
- Structured scoring and feedback
- Candidate interview reports
- Human question review and approval workflow
- Versioned technology packs
- Candidate, Reviewer and Admin interfaces
- Pluggable LLM, speech-to-text and text-to-speech providers

## Architecture

- `apps/web` — candidate, reviewer and admin web application
- `apps/api` — interview, scoring and content APIs
- `packages/content` — technology-neutral question schema and technology packs
- `packages/shared` — shared contracts and configuration
- `docs` — architecture, research and implementation documentation

## Initial stack

- Next.js + TypeScript
- FastAPI + Python
- PostgreSQL
- Browser audio capture
- Provider-independent AI/STT/TTS adapters

## Status

Foundation implementation in progress.
