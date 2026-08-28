# Governed Content Production Migration Runbook

## Scope and authority boundary

This runbook covers only the additive governed-content schema migration on the
Neon `mockinterviewapp` main branch. It does not authorize importing content,
changing `GOVERNED_CONTENT_SOURCE`, creating or publishing a release batch,
approving a candidate pack, or changing any human/vendor review label.

Production application requires a fresh approval tied to the exact artifact
below immediately before the database mutation.

## Exact prepared artifact

- Path: `packages/db/migrations/20260827_01_governed_content.sql`
- Size: `11997` bytes
- SHA-256: `7832a9a828bda665193849f9a2de90cfbd99688d6551c8e0b73aaca0ce2fb4f6`
- Isolated Neon validation record: `6c9b01ff-d490-4563-acfe-38d75ac854c9`
- Isolated branch used for validation: `br-bitter-dream-a6cc7cum`

Any migration-file change invalidates this fingerprint and requires isolated
branch validation plus a new approval.

## Current verification evidence

On 2026-08-27, from `D:\mockinterviewapp`:

- `npm run test:db-schema`: 4 passed.
- `npm run test:content-import`: 5 passed.
- `npm run import:governed-content -- --dry-run`: 7 technologies, 98 topics,
  1,050 questions, 1,050 benchmarks, 1,476 evidence sources and links, 686
  immutable review records, and 1,050 version snapshots.
- `npm run test:web`: 87 passed.
- `python -m pytest -q` from `apps/api`: 9 passed.
- `npm run build:web`: passed.
- `npm audit --audit-level=high`: 0 vulnerabilities.

These checks establish implementation readiness. They are not production
approval or production verification.

## Required approval

The approver must identify the project, branch, path, and fingerprint. A valid
approval can use this exact statement:

> I approve applying `packages/db/migrations/20260827_01_governed_content.sql`
> with SHA-256
> `7832a9a828bda665193849f9a2de90cfbd99688d6551c8e0b73aaca0ce2fb4f6`
> to the Neon `mockinterviewapp` main branch.

Approval for another migration, branch, environment, or hash is not approval
for this mutation.

## Pre-apply checks

1. Confirm the Neon project is `mockinterviewapp` and the connection targets its
   main production branch.
2. Create or retain a pre-apply Neon restore branch/checkpoint.
3. Confirm candidate reads still use JSON and do not set
   `GOVERNED_CONTENT_SOURCE=database`.
4. Recompute the artifact fingerprint:

   ```powershell
   (Get-FileHash -Algorithm SHA256 -LiteralPath 'packages/db/migrations/20260827_01_governed_content.sql').Hash.ToLowerInvariant()
   ```

5. Re-run `npm run test:db-schema` and confirm the fingerprint still matches the
   approved value.
6. Record the approver identity, approval timestamp, Neon branch identifier,
   pre-apply restore branch/checkpoint, and operator identity in the change log.

## Apply

Use a server-only production connection and stop on the first SQL error. Do not
print the connection string.

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f 'packages/db/migrations/20260827_01_governed_content.sql'
```

The migration contains its own transaction. A non-zero exit or missing
`COMMIT` is a failed application and must not be reported as complete.

## Post-apply verification

Verify all eleven governed tables exist in `public`:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'technologies',
    'topics',
    'questions',
    'benchmark_answers',
    'evidence_sources',
    'question_evidence_links',
    'question_reviews',
    'question_versions',
    'publication_batches',
    'publication_batch_decisions',
    'publication_batch_items'
  )
ORDER BY table_name;
```

Then inspect the constraints, foreign keys, and indexes against
`packages/db/schema.sql`, and rerun `npm run test:db-schema`. Record the Neon
operation/migration identifier and verification output in `PROJECT_STATE.md`
and `HANDOVER.md`.

Do not run the governed importer as part of this schema approval. Importing the
1,050 records is a separate production mutation and requires its own dry-run,
reconciliation review, and explicit apply authorization.

## Failure and recovery

- Before `COMMIT`, rely on the migration transaction to roll back the failed
  statements.
- After `COMMIT`, do not drop governed tables as an ad hoc rollback. Keep JSON
  candidate reads active, capture the failure evidence, and restore/fork from
  the pre-apply Neon checkpoint if recovery is required.
- Do not switch candidate reads or publish a batch during migration recovery.
