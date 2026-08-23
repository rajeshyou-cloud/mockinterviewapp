# Course Expansion Plan

_Prepared: 2026-08-23_

## Scope

The released bank contains 300 questions: 150 Snowflake and 150 Informatica. Milestone 3 adds five previously identified technologies while preserving the same content, scoring, sampling, persistence, and review contracts.

| Course | Current | Initial target | Launch state |
|---|---:|---:|---|
| Snowflake | 150 | 150 | Available |
| Informatica | 150 | 150 | Available |
| Databricks | 150 candidate | 150 | Awaiting human approval |
| Oracle Database | 150 candidate | 150 | Awaiting human approval |
| Power BI | 150 candidate | 150 | Awaiting human approval |
| Python | 150 candidate | 150 | Awaiting human approval |
| AWS | 150 candidate | 150 | Awaiting human approval |
| **Total after initial expansion** | **300** | **1,050** | |

The initial target is 150 per technology to match the two released courses. Expansion to 300 per technology is a later depth target and should happen only after usage and review evidence identifies the topics that need more coverage.

## Required distribution per new course

- 50 beginner questions
- 50 intermediate questions
- 50 advanced questions
- A balanced mix of conceptual, scenario, troubleshooting, design, and hands-on questions
- At least 15 distinct topic units
- Stable unique IDs and unique question text
- Canonical answer, expected concepts, follow-ups, version, review status, and verification date on every record
- Official vendor/standards documentation as the primary source

## Course topic foundations

### Databricks

Lakehouse architecture, Delta Lake, Unity Catalog, notebooks/jobs, Workflows, Auto Loader, Structured Streaming, medallion architecture, SQL warehouses, performance, cost, governance, security, MLflow, and troubleshooting.

### Oracle Database

Architecture, SQL/PLSQL, indexing, execution plans, transactions, locking, backup/recovery, Data Guard, RAC, partitioning, security, performance, multitenant databases, migration, and troubleshooting.

### Power BI

Power Query, semantic models, star schema, DAX, relationships, filter context, visuals, Power BI Service, refresh, gateways, RLS, deployment pipelines, performance, governance, and troubleshooting.

### Python

Language fundamentals, data structures, functions, OOP, typing, exceptions, iterators/generators, testing, packaging, concurrency, performance, data processing, APIs, security, and debugging.

### AWS

IAM, VPC, EC2, S3, RDS, Lambda, API Gateway, containers, messaging, monitoring, security, reliability, cost optimization, infrastructure as code, data services, and architecture trade-offs.

## Launch gates

A planned course must not appear in the production interview selector until all gates pass:

1. The complete 150-question pack is present.
2. Schema, uniqueness, coverage, and exact-count tests pass.
3. Every source URL is reachable and official.
4. A human review pass promotes launch content from `ai-reviewed` to `approved` or `human-reviewed`.
5. Question sampling, scoring, persistence, resume, and completion are tested for the new technology.
6. The Question Bank UI can browse and filter the new course.
7. CI, production build, and browser verification are green.

The application enforces these gates dynamically. A candidate pack is excluded from the course API, interview selector, Question Bank, scoring, and answer persistence until an authorized reviewer records `approved` with official-source verification. That approval releases the complete pack without a separate code promotion; revoking approval removes it again.

## Milestone 3 work order

1. Build the searchable Question Bank UI for the existing 300 questions.
2. Add Databricks and Power BI packs first because they align most closely with the current data-platform audience.
3. Add Oracle Database and Python packs.
4. Add the AWS pack, with service scope kept explicit to avoid shallow coverage.
5. Run human review and source revalidation in batches before enabling each selector option.
6. Reassess whether each course should expand from 150 to 300 using search, interview, and low-score topic evidence.

## Other product activities

- Enable live Vercel AI Gateway scoring by adding billing to the Vercel team.
- Interview replay, recruiter analytics, reviewer/admin workflow, production authentication, and the subscription/entitlement foundation are deployed.
- Activate Stripe products, prices, and the signed production webhook after the account owner accepts provider terms and selects prices.

Human course decisions, Stripe activation, and AI Gateway billing are the remaining account-level launch gates.
