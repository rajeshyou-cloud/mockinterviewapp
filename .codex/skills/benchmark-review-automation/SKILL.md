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
3. Prefer the cost-controlled path before paid model calls:
   - `npm run triage:benchmarks`
   - `npm run export:rereview-packets`
   - Use compact review for disputed/draft/rejected records:
     - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --limit=all --compact --test`
4. Prefer the automated pipeline:
   - ChatGPT/OpenAI:
     - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --limit=all --test`
   - Vercel AI Gateway:
     - `npm run review:benchmarks:auto -- --provider=gateway --technology=<technology> --limit=all --test`
   - Claude/Anthropic:
     - `npm run review:benchmarks:auto -- --provider=anthropic --technology=<technology> --limit=all --test`
5. Run dry-runs before live API spending:
   - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --dry-run`
   - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --compact --limit=2 --dry-run`
6. Use two different reviewer models:
   - `REVIEW_PRIMARY_MODEL`
   - `REVIEW_CRITIC_MODEL`
7. For direct OpenAI/ChatGPT review, require:
   - `OPENAI_API_KEY`
   - `REVIEW_PROVIDER=openai`
8. For re-review after remediation, review only draft records and use compact packets:
   - `npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --only-status=draft --limit=all --compact --test`
9. After import, update:
   - `PROJECT_STATE.md`
   - `HANDOVER.md`
10. Before committing, run:
   - `npm run validate:benchmarks`
   - `npm run test:web`
   - `npm run build:web`
   - `npm audit --audit-level=high`

## Reference

The user-facing process is documented in `docs/BENCHMARK_REVIEW_AUTOMATION.md`.
