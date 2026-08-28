# Governed Content Platform Plan

## Purpose

The Mock Interview System should evolve from a file-backed question bank into a governed content platform for technology job-readiness. The long-term goal is to support many technology tracks, daily content updates, benchmark answers, evidence-backed review, personalized practice, and safe publication controls.

This plan treats questions, benchmark answers, evidence sources, AI reviews, human approvals, versions, and publishing decisions as governed platform data rather than static JSON files.

## North star

```text
JSON files = seed/export format
Neon database = source of truth
Admin UI = governance layer
AI review = scalable reviewer
Publication gate = trust control
Candidate app = published verified learning experience
```

## Current state

- The platform has 1,050 benchmark-backed questions across released and candidate packs.
- Informatica and Oracle are fully AI evidence verified.
- AWS, Databricks, Snowflake, Power BI, and Python still have pending draft benchmark records.
- Evidence packets, compact review packets, static triage, AI review runners, verified-only import, Gemini provider support, and AWS evidence enrichment are already implemented.
- Current content source of truth is still mostly JSON files under `apps/web/data`.

## Target operating model

Every question should move through a controlled lifecycle:

```text
draft
→ evidence_attached
→ static_validated
→ ai_reviewed
→ ai_evidence_verified
→ human_verified, optional
→ published
→ stale or retired
```

Candidate-facing APIs must expose only questions that are published and verified.

## Phase 1 — Content governance data model

Goal: Add database tables so governed content can live in Neon/Postgres.

### TODOs

- [ ] Design schema for `technologies`.
- [ ] Design schema for `topics`.
- [ ] Design schema for `questions`.
- [ ] Design schema for `benchmark_answers`.
- [ ] Design schema for `evidence_sources`.
- [ ] Design schema for `question_evidence_links`.
- [ ] Design schema for `question_reviews`.
- [ ] Design schema for `question_versions`.
- [ ] Design schema for `publication_batches`.
- [ ] Design schema for `publication_batch_items`.
- [ ] Add audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`.
- [ ] Add lifecycle fields: `review_status`, `publish_status`, `version`, `last_reviewed_at`, `retired_at`.
- [ ] Add migration scripts.
- [ ] Add schema tests.
- [ ] Keep JSON files as seed/export source during the transition.

## Phase 2 — JSON-to-database migration

Goal: Import the existing question bank into governed database tables without losing history.

### TODOs

- [ ] Build an idempotent importer for current JSON packs.
- [ ] Preserve stable question IDs.
- [ ] Preserve technology, topic, difficulty, type, question text, and answers.
- [ ] Preserve benchmark versions and review statuses.
- [ ] Preserve evidence links and content hashes.
- [ ] Preserve existing verified statuses for Informatica, Oracle, and already verified candidate records.
- [ ] Store imported records as version `1.0.0`.
- [ ] Add dry-run import mode.
- [ ] Add import summary by technology/status.
- [ ] Add validation that database counts match JSON counts.
- [ ] Keep JSON export available for backup and review packets.

## Phase 3 — Content Admin UI

Goal: Build an internal control room for creating, editing, reviewing, and publishing content.

### TODOs

- [ ] Add Admin navigation for Content Platform.
- [ ] Add technology dashboard.
- [ ] Add topic dashboard.
- [ ] Add question list with filters by technology, topic, difficulty, type, review status, and publish status.
- [ ] Add question detail page.
- [ ] Add benchmark answer editor.
- [ ] Add evidence source editor.
- [ ] Add review history panel.
- [ ] Add version history panel.
- [ ] Add stale/retired indicators.
- [ ] Add bulk actions for selected questions.
- [ ] Restrict content governance actions to admin/reviewer roles.

## Phase 4 — Evidence-first content creation

Goal: Generate and maintain questions from official evidence, not the other way around.

### TODOs

- [ ] Add evidence source table and UI.
- [ ] Allow one question to link to multiple evidence records.
- [ ] Add official-host validation by vendor.
- [ ] Add evidence categories: overview, setup, security, monitoring, troubleshooting, quotas, best practices, recovery, cost.
- [ ] Add source freshness checks.
- [ ] Add content hash tracking for evidence records.
- [ ] Mark affected questions stale when linked evidence changes.
- [ ] Add evidence coverage requirements by question type.
- [ ] Require deeper evidence for hands-on, troubleshooting, design, and advanced scenario questions.
- [ ] Extend the AWS enrichment approach to Databricks, Power BI, Python, and Snowflake.

## Phase 5 — Review pipeline

Goal: Make review scalable, cost-controlled, and reusable for daily content updates.

### TODOs

- [ ] Keep zero-cost static triage as the first review layer.
- [ ] Add duplicate detection across all technology tracks.
- [ ] Add generic-answer detection.
- [ ] Add required-concept coverage checks.
- [ ] Add weak-evidence detection.
- [ ] Add broken-link checks.
- [ ] Add cheap AI review provider support through an OpenAI-compatible adapter.
- [ ] Support providers such as DeepSeek, SiliconFlow, Alibaba/Qwen, OpenRouter, Gemini, OpenAI, Claude, and Vercel AI Gateway.
- [ ] Keep two-model consensus for `ai_evidence_verified`.
- [ ] Import only consensus-approved records automatically.
- [ ] Keep disputed/rejected records in the remediation queue.
- [ ] Add reviewer cost tracking per batch.
- [ ] Add retry and quota-aware scheduling.
- [ ] Add batch-size controls for low-cost/free providers.

## Phase 6 — Publication batches

Goal: Publish stable, reviewed content releases instead of exposing individual questions randomly.

### TODOs

- [ ] Add publication batch creation.
- [ ] Add batch name/version, for example `AWS Foundation Pack v1`.
- [ ] Add batch readiness checks.
- [ ] Require every batch item to be verified before publication.
- [ ] Add batch approval metadata.
- [ ] Add publish/unpublish actions.
- [ ] Add production API filtering by published batch.
- [ ] Add rollback support to previous published batch.
- [ ] Add batch release notes.
- [ ] Add launch verification checklist per technology.

## Phase 7 — Candidate learning experience

Goal: Turn the platform from a mock interview app into a job-readiness engine.

### TODOs

- [ ] Add topic coverage maps per technology.
- [ ] Add weak-area diagnosis from interview results.
- [ ] Recommend next practice questions based on weak areas.
- [ ] Add difficulty progression.
- [ ] Add scenario-based practice paths.
- [ ] Add revision notes after interview completion.
- [ ] Add benchmark answer reveal policy after submission or session completion.
- [ ] Add score history by topic and technology.
- [ ] Add candidate progress dashboard.
- [ ] Add recruiter-style evaluation summaries.

## Phase 8 — Continuous freshness and quality operations

Goal: Keep the question bank trustworthy as technologies and vendor documents change.

### TODOs

- [ ] Schedule weekly or monthly evidence URL checks.
- [ ] Recompute evidence content hashes.
- [ ] Mark linked questions stale when evidence changes materially.
- [ ] Queue stale questions for re-review.
- [ ] Track review backlog by technology.
- [ ] Track approval rate by provider/model.
- [ ] Track dispute reasons by cluster.
- [ ] Track cost per verified question.
- [ ] Add dashboards for content health.
- [ ] Add alerts when published content becomes stale.

## Phase 9 — Scale to 1,000+ questions per technology

Goal: Support large evolving tracks without losing quality control.

### TODOs

- [ ] Define standard topic taxonomy per technology.
- [ ] Define target question distribution by difficulty and type.
- [ ] Define minimum evidence coverage per topic.
- [ ] Add bulk import for new technologies.
- [ ] Add bulk evidence enrichment.
- [ ] Add generated-question staging area.
- [ ] Add review queue prioritization.
- [ ] Add archived/retired question handling.
- [ ] Add analytics for question usefulness and candidate performance.
- [ ] Add quality scoring for each question.

## Recommended implementation sequence

1. Add governed content database schema.
2. Build JSON-to-database importer.
3. Build read-only database-backed question APIs behind a feature flag.
4. Add Admin UI for content status and question detail.
5. Add evidence source management.
6. Add review queue UI.
7. Add publication batch model.
8. Switch public APIs to published verified database content.
9. Extend evidence enrichment to all technology tracks.
10. Add OpenAI-compatible low-cost provider support for DeepSeek/Qwen/SiliconFlow/OpenRouter.
11. Add freshness checks and stale-question workflow.
12. Scale question generation and review by technology track.

## Model and reasoning recommendation

This project is no longer a small coding change. It includes database design, migrations, data integrity, admin UX, review workflows, provider integrations, and production publication gates.

Recommended model strategy:

- Use a stronger coding/reasoning model for architecture, migrations, data model design, publication gates, and admin workflow implementation.
- Use cheaper models for bulk benchmark review after the system is built.
- Use low-cost models such as DeepSeek/Qwen/SiliconFlow/OpenRouter for first-pass AI review.
- Use a stronger critic model only for disputed, advanced, or high-impact records.

Recommended reasoning level:

- Use high reasoning for schema design, lifecycle decisions, migration safety, publication gates, and review-contract changes.
- Medium reasoning is enough for routine UI pages, filters, exports, and simple scripts.
- Do not reduce reasoning for changes that affect verified/published content or candidate scoring, because mistakes there directly affect trust.

## Engineering contract

- Do not label content human-reviewed unless a human actually reviewed it.
- Do not label content vendor-certified unless a vendor actually certified it.
- Do not expose draft, disputed, rejected, stale, or reviewing records to candidates.
- Preserve stable question IDs.
- Preserve benchmark versions used for scoring.
- Store reviewer provider/model metadata.
- Store every publication decision in an auditable form.
- Keep JSON export as a backup and interoperability format even after Neon becomes the source of truth.
