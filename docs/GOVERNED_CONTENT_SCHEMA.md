# Governed Content Schema

## Scope

Phase 1 introduces an additive Postgres model for governed interview content. It does not switch any candidate-facing read path, change scoring resolution, or publish candidate packs. JSON under `apps/web/data` remains the source of truth until the importer and database-read phases are separately implemented and verified.

## Data model

| Table | Responsibility |
| --- | --- |
| `technologies` | Stable technology registry, official domains, and lifecycle state. |
| `topics` | Technology-scoped topic taxonomy. |
| `questions` | Stable question IDs, content, review lifecycle, publish state, and current semantic version. |
| `benchmark_answers` | Versioned benchmark rubric and scoring anchors for a question. |
| `evidence_sources` | Versioned official-document evidence with category, freshness, and content hash. |
| `question_evidence_links` | Claim-scoped many-to-many links between benchmarks and evidence. |
| `question_reviews` | Immutable static, AI, human, or vendor review outcomes with provider/model metadata. |
| `question_versions` | Immutable version snapshots used by publication batches. |
| `publication_batches` | Current release-batch state and approval/publication metadata. |
| `publication_batch_decisions` | Append-only audit history for every batch state decision. |
| `publication_batch_items` | Verified question and benchmark versions frozen into a batch. |

## Database-enforced invariants

- Existing question IDs remain text primary keys; the importer must not generate replacements.
- Published questions must be `ai-evidence-verified` or `human-verified`.
- Publication batch items accept only those same verified statuses.
- Every batch item references an exact question snapshot version and benchmark version.
- AI reviews require provider and model metadata; human reviews require a reviewer identity.
- Question/evidence links enforce that a benchmark belongs to the linked question.
- Semantic versions and SHA-256 content hashes are validated at the database boundary.
- Governed tables use restrictive or cascading deletes according to whether the dependent data is audit history or replaceable linkage.

## Migration safety

The additive migration is `packages/db/migrations/20260827_01_governed_content.sql`. It uses standard SQL, runs in a transaction, and contains no destructive statements. Before production use:

1. Apply it to an isolated Neon branch.
2. Run `npm run test:db-schema`.
3. Inspect tables, constraints, foreign keys, and indexes on that branch.
4. Build and dry-run the idempotent JSON importer.
5. Confirm that all existing candidate APIs still read JSON and return only currently released content.

Production application of the migration is intentionally outside this phase and has not occurred.
