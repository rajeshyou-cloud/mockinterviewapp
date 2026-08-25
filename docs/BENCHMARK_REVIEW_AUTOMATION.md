# Benchmark Review Automation

This project can review benchmark answers automatically with ChatGPT/OpenAI, Vercel AI Gateway, or Claude/Anthropic, then import only consensus-valid results into the benchmark gate.

## What the automation does

1. Re-exports current evidence packets from the question bank.
2. Reviews only selected benchmark statuses by default: `draft` and `disputed`.
3. Requires two different reviewer models for independent consensus.
4. Writes reviewed JSONL files into `apps/web/data/benchmark-reviews`.
5. Runs a dry-run import first.
6. Imports valid reviews.
7. Runs `npm run validate:benchmarks`.
8. Optionally runs the web test suite.

The automation still does not mean human or vendor certification. It marks records as `ai-evidence-verified` only when both AI reviewers approve.

## ChatGPT/OpenAI review

Set these environment variables:

```bash
OPENAI_API_KEY=...
REVIEW_PROVIDER=openai
REVIEW_PRIMARY_MODEL=<first-openai-model>
REVIEW_CRITIC_MODEL=<second-openai-model>
```

The two model IDs must be different. This prevents a single model from approving its own blind spots.

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
- `--limit=all` reviews all selected packets.
- `--no-import` writes review files but does not import them.
- `--test` runs the web test suite after validation.
- `--dry-run` checks packet loading and configuration without spending API credits.

## Re-review loop

When review output contains `disputed` or `rejected`:

1. Read the corrections on each disputed/rejected record.
2. Fix the benchmark answer, required concepts, accepted alternatives, or evidence URL.
3. Reset the fixed record to `draft`.
4. Re-run:

```bash
npm run export:evidence-packets
npm run review:benchmarks:auto -- --provider=openai --technology=<technology> --only-status=draft --limit=all --test
```

## Launch gate

A candidate pack remains blocked until every benchmark in that pack is either:

- `ai-evidence-verified`, or
- `human-verified`.

Never expose a pack in production if it still has `draft`, `disputed`, `rejected`, `stale`, or `reviewing` benchmark records.
