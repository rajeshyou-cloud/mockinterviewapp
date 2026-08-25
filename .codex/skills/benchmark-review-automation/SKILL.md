---
name: benchmark-review-automation
description: Reusable process for automated benchmark-answer evidence review using ChatGPT/OpenAI, Vercel AI Gateway, or Claude, followed by import, validation, and optional tests.
---

# Benchmark Review Automation

Use this skill whenever the user asks to review benchmark answers, review evidence packets, add a new technology, re-review disputed benchmark records, or avoid manual Claude upload/download review.

## Required workflow

1. Preserve the engineering contract:
   - Do not mark content as human-reviewed or vendor-certified unless a real human/vendor review occurred.
   - Only mark `ai-evidence-verified` through consensus-valid review import.
   - Keep candidate packs hidden until every benchmark in that pack is `ai-evidence-verified` or `human-verified`.
2. Re-export evidence packets before a review run:
   - `npm run export:evidence-packets`
3. Prefer the automated pipeline:
   - ChatGPT/OpenAI:
     - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --limit=all --test`
   - Vercel AI Gateway:
     - `npm run review:benchmarks:auto -- --provider=gateway --technology=<technology> --limit=all --test`
   - Claude/Anthropic:
     - `npm run review:benchmarks:auto -- --provider=anthropic --technology=<technology> --limit=all --test`
4. Run dry-runs before live API spending:
   - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --dry-run`
5. Use two different reviewer models:
   - `REVIEW_PRIMARY_MODEL`
   - `REVIEW_CRITIC_MODEL`
6. For direct OpenAI/ChatGPT review, require:
   - `OPENAI_API_KEY`
   - `REVIEW_PROVIDER=openai`
7. For re-review after remediation, review only draft records:
   - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --only-status=draft --limit=all --test`
8. After import, update:
   - `PROJECT_STATE.md`
   - `HANDOVER.md`
9. Before committing, run:
   - `npm run validate:benchmarks`
   - `npm run test:web`
   - `npm run build:web`
   - `npm audit --audit-level=high`

## Reference

The user-facing process is documented in `docs/BENCHMARK_REVIEW_AUTOMATION.md`.
