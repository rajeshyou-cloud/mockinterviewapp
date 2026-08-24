# Sent for Re-review Chunks

Use these files when sending remediated benchmark evidence packets back to Claude.

The filenames include `sentforrereview` so they are not confused with the original first-pass review chunks.

## Current files

- `informatica-sentforrereview-part-01.jsonl` through `informatica-sentforrereview-part-06.jsonl`
- `oracle-sentforrereview-part-01.jsonl` through `oracle-sentforrereview-part-06.jsonl`

After Claude returns reviewed JSONL, save the output into:

```text
apps/web/data/benchmark-reviews/
```

Recommended returned filenames:

```text
informatica-sentforrereview-part-01.reviewed.jsonl
oracle-sentforrereview-part-01.reviewed.jsonl
```

Then run:

```bash
npm run import:benchmark-reviews -- --dry-run
npm run import:benchmark-reviews
npm run validate:benchmarks
npm run test:web
```
