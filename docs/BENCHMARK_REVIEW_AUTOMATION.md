# Benchmark Review Automation

This project can review benchmark answers automatically with OpenAI, Gemini, Vercel AI Gateway, Claude/Anthropic, or an OpenAI-compatible provider, then import only two-model consensus approvals into the benchmark gate.

## Cost-control workflow

Use the static and compact workflow before any paid review. The goal is to stop paying an AI model to rediscover mechanical issues that code can detect locally.

Recommended sequence:

1. Export full evidence packets.
2. Run static triage to group obvious issues.
3. Fix bulk generator/template issues in the benchmark source data.
4. Export compact `sentforrereview` packets for only `draft`, `disputed`, and `rejected` records.
5. Run a cheap-model review on compact packets.
6. Use a stronger model only for rejects, disagreements, launch-critical samples, or final pack sign-off.

Commands:

```bash
npm run export:evidence-packets
npm run triage:benchmarks
npm run remediate:benchmarks -- --technology=aws --dry-run
npm run remediate:benchmarks -- --technology=aws
npm run export:rereview-packets
```

The static triage report is written to:

- `apps/web/data/review-triage/latest.md`
- `apps/web/data/review-triage/latest.json`

Compact re-review packets are written to:

- `apps/web/data/evidence-packets-compact/<technology>-sentforrereview-compact.jsonl`
- `apps/web/data/evidence-packets-compact/<technology>.jsonl`

The `sentforrereview` file is for upload/review handoff. The plain `<technology>.jsonl` file is the runner-friendly path used by the automated review script.

Run the automated review against compact packets:

```bash
npm run review:benchmarks:auto -- --provider=openai --technology=aws --limit=all --compact --test
```

Dry-run first to confirm that the compact packet path is wired correctly and no credits will be spent:

```bash
npm run review:benchmarks:auto -- --provider=openai --technology=aws --limit=2 --compact --dry-run
```

Do not use compact review as an excuse to lower the launch gate. Candidate packs still remain blocked until every benchmark in that pack is `ai-evidence-verified` or `human-verified`.

## What the automation does

1. Re-exports current evidence packets from the question bank.
2. Reviews only selected benchmark statuses by default: `draft` and `disputed`.
3. Requires two different reviewer models for independent consensus.
4. Writes reviewed JSONL files into `apps/web/data/benchmark-reviews`.
5. Runs a dry-run import first.
6. Imports consensus-approved reviews only. Disputes and rejects remain in the review JSONL remediation queue.
7. Runs `npm run validate:benchmarks`.
8. Optionally runs the web test suite.

The automation still does not mean human or vendor certification. It marks records as `ai-evidence-verified` only when both AI reviewers approve.

## ChatGPT/OpenAI review

Set these environment variables:

```env
OPENAI_API_KEY=...
REVIEW_PROVIDER=openai
REVIEW_PRIMARY_MODEL=<first-openai-model>
REVIEW_CRITIC_MODEL=<second-openai-model>
```

The two model IDs must be different. This prevents a single model from approving its own blind spots.

For local runs, these values can be stored in `.env.local`. That file is ignored by Git and must never be committed. Prefer plain `.env` format as shown above. The scripts also tolerate PowerShell-style lines such as `$env:REVIEW_PROVIDER="openai"` if they are pasted into `.env.local`.

Run a safe dry-run first:

```bash
npm run review:benchmarks:auto -- --provider=openai --technology=aws --dry-run
```

Run a live automated review for one technology:

```bash
npm run review:benchmarks:auto -- --provider=openai --technology=aws --limit=all --test
```

Run several technologies:

```bash
npm run review:benchmarks:auto -- --provider=openai --technology=aws,databricks --limit=all --test
```

Run every technology that has evidence packets:

```bash
npm run review:benchmarks:auto -- --provider=openai --technology=all --limit=all --test
```

## Other provider modes

Use an OpenAI-compatible endpoint (DeepSeek, SiliconFlow, Alibaba/Qwen, OpenRouter, or another compatible HTTPS endpoint):

```env
REVIEW_PROVIDER=openai-compatible
REVIEW_OPENAI_COMPATIBLE_NAME=deepseek
REVIEW_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
REVIEW_OPENAI_COMPATIBLE_API_KEY=...
REVIEW_PRIMARY_MODEL=<first-model>
REVIEW_CRITIC_MODEL=<different-model>
```

Common base URLs are `https://api.deepseek.com`, `https://api.siliconflow.com/v1`, `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`, and `https://openrouter.ai/api/v1`. Verify current model names and pricing with the provider before a live run. The adapter rejects non-HTTPS remote endpoints.

Configure cost estimates from the provider's current per-million-token prices:

```env
REVIEW_PRIMARY_INPUT_USD_PER_MILLION_TOKENS=0
REVIEW_PRIMARY_OUTPUT_USD_PER_MILLION_TOKENS=0
REVIEW_CRITIC_INPUT_USD_PER_MILLION_TOKENS=0
REVIEW_CRITIC_OUTPUT_USD_PER_MILLION_TOKENS=0
```

Each live output gets a sibling `.summary.json` with status counts, token usage, and estimated USD cost. A zero cost is explicitly marked unconfigured unless both reviewer rates are supplied.

Use Gemini:

```bash
GEMINI_API_KEY=...
REVIEW_PROVIDER=gemini
REVIEW_PRIMARY_MODEL=gemini-2.5-flash-lite
REVIEW_CRITIC_MODEL=gemini-2.5-flash
npm run review:benchmarks:auto -- --provider=gemini --technology=aws --limit=10 --compact
```

For local runs, keep `GEMINI_API_KEY` in `.env.local`; never commit it. If a key is pasted into chat or terminal output, rotate it after testing.

For free-tier Gemini review, use small batches and import only approvals so the remaining queue shrinks safely:

```bash
npm run review:benchmarks:auto -- --provider=gemini --technology=aws --only-status=draft --limit=10 --offset=0 --compact --import-only-verified
npm run review:benchmarks:auto -- --provider=gemini --technology=aws --only-status=draft --limit=10 --offset=10 --compact --import-only-verified
```

Increase `--offset` by the batch size when you want to move through the pending queue without attempting all records in one run. Records are removed from the pending launch queue only when both reviewers approve and the importer writes `ai-evidence-verified`. Disputed or rejected records remain pending until their benchmark answer or evidence is fixed and re-reviewed.

Use Vercel AI Gateway:

```bash
REVIEW_PROVIDER=gateway
REVIEW_PRIMARY_MODEL=<first-gateway-model>
REVIEW_CRITIC_MODEL=<second-gateway-model>
npm run review:benchmarks:auto -- --provider=gateway --technology=power-bi --limit=all --test
```

Use direct Claude/Anthropic:

```bash
ANTHROPIC_API_KEY=...
REVIEW_PROVIDER=anthropic
REVIEW_PRIMARY_MODEL=<first-claude-model>
REVIEW_CRITIC_MODEL=<second-claude-model>
npm run review:benchmarks:auto -- --provider=anthropic --technology=python --limit=all --test
```

## Useful options

- `--technology=aws` reviews one technology.
- `--technology=aws,databricks` reviews multiple technologies.
- `--technology=all` reviews every technology listed in the evidence-packet manifest.
- `--only-status=draft,disputed` is the default, so already verified records are skipped.
- `--only-status=draft` reviews only new draft records.
- `--limit=10` reviews a small pilot sample.
- `--offset=10` starts from the next selected record, useful for free-tier batch review.
- `--limit=all` reviews all selected packets.
- `--no-import` writes review files but does not import them.
- Consensus-approved-only import is the default. `--import-all-statuses` is an explicit diagnostic escape hatch; it must not be used for routine publication workflows.
- `--batch-size=25` caps records processed in one invocation even when `--limit=all`.
- `--max-retries=5` retries transient HTTP failures and honors `Retry-After`.
- `--request-delay-ms=1000` spaces individual provider calls.
- `--quota-pause-ms=5000` pauses between completed two-model reviews.
- `--test` runs the web test suite after validation.
- `--dry-run` checks packet loading and configuration without spending API credits.
- `--compact` runs static triage, exports compact re-review packets, and reviews those smaller packets.

Check evidence URL health separately before review:

```bash
npm run check:evidence-links -- --concurrency=8 --timeout-ms=15000 --fail-on-broken
```

Use `--hash-content` when an operational freshness run also needs a fetched-body SHA-256. CI uses `--offline` to validate URL structure without making vendor documentation availability a build dependency.

After reviewing a live hash report, compare it with governed evidence in dry-run mode and apply the stale workflow explicitly:

```bash
npm run apply:evidence-freshness -- --report=apps/web/data/evidence-link-health/latest.json
npm run apply:evidence-freshness -- --report=apps/web/data/evidence-link-health/latest.json --apply
```

Changed evidence versions are preserved rather than overwritten. The apply path adds the replacement evidence version, retains links, records a static stale audit, marks affected benchmarks/questions stale, and unpublishes them. This command requires the governed migration and a server-only `DATABASE_URL`.

## Bulk remediation before re-review

When static triage shows repeated generic/template failures, use the remediation command before spending review credits:

```bash
npm run remediate:benchmarks -- --technology=<technology> --dry-run
npm run remediate:benchmarks -- --technology=<technology>
```

The command updates only non-verified records for that technology. It leaves `ai-evidence-verified` and `human-verified` records untouched, rewrites generic benchmark answers into prompt-specific answers, preserves official evidence metadata, and resets remediated records to `draft`.

After remediation, run:

```bash
npm run export:evidence-packets
npm run triage:benchmarks -- --technology=<technology>
npm run export:rereview-packets -- --technology=<technology> --only-status=draft --limit=all
```

Only run paid AI review after static triage shows no obvious local blockers for that technology.

## Evidence enrichment before AI review

If AI review disputes a benchmark because the cited evidence is too thin, add more specific official documentation links before spending more review calls. AWS evidence can be enriched with:

```bash
npm run enrich:aws-evidence
```

This keeps the original source URL and adds targeted official AWS links for setup, security, monitoring, troubleshooting, quotas, best practices, and recovery where relevant. Tests require the primary source URL to remain present, but benchmark evidence may contain multiple official links.

## Re-review loop

When review output contains `disputed` or `rejected`:

1. Read the corrections on each disputed/rejected record.
2. Fix the benchmark answer, required concepts, accepted alternatives, or evidence URL.
3. Reset the fixed record to `draft`.
4. Re-run:

```bash
npm run export:evidence-packets
npm run triage:benchmarks -- --technology=<technology>
npm run export:rereview-packets -- --technology=<technology> --only-status=draft
npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --only-status=draft --limit=all --compact --test
```

## Launch gate

A candidate pack remains blocked until every benchmark in that pack is either:

- `ai-evidence-verified`, or
- `human-verified`.

Never expose a pack in production if it still has `draft`, `disputed`, `rejected`, `stale`, or `reviewing` benchmark records.
