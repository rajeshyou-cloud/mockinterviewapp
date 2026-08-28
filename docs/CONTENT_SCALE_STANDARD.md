# Content Scale Standard

This standard defines readiness for expanding a technology track toward 1,000 governed questions. The target is capacity and controlled staging, not permission to publish generated content.

## Taxonomy

Every track must maintain stable topic slugs covering foundations, architecture, setup, security, operations/monitoring, troubleshooting, performance, recovery, cost/governance, and hands-on delivery where the technology supports them. Technology-specific subtopics are allowed; renaming a slug requires an explicit migration because analytics and recommendations use it as a stable dimension.

## Target distribution per 1,000 questions

| Dimension | Target |
|---|---:|
| Beginner | 30% |
| Intermediate | 45% |
| Advanced | 25% |
| Conceptual | 25% |
| Scenario | 25% |
| Troubleshooting | 20% |
| Design | 15% |
| Hands-on | 15% |

Each active topic should have at least 25 questions before a track is considered broad. No topic should exceed 20% of a track without an approved exception.

## Evidence minimums

- Conceptual beginner questions: one specific official source.
- Scenario and intermediate questions: two official evidence records spanning the central claim and an operational constraint.
- Hands-on, troubleshooting, design, and advanced questions: three official evidence records, including relevant setup, security, monitoring, troubleshooting, quota, recovery, or cost material.
- Documentation-root URLs, broken links, missing hashes, and evidence older than the operating freshness window block review.

## Staging and lifecycle

Bulk imports enter `source_kind=candidate`, `review_status=draft`, and `publish_status=unpublished`. Generated content remains in candidate staging until static triage, evidence checks, two-model or human verification, and publication-batch approval all succeed. Retired records retain stable IDs, immutable versions, scoring history, and decision history.

## Quality score

The scale report assigns up to 100 points: 25 for verified review, 25 for evidence depth, 20 for required-concept coverage, 15 for benchmark depth, and 15 for specific/non-root official sourcing. It is a prioritization signal, not a publication decision. Any non-verified lifecycle state remains blocked regardless of score.

Run `npm run report:content-scale -- --no-write` for capacity, distribution, evidence, quality, and review-priority summaries. Without `--no-write`, the report is stored under `apps/web/data/content-scale-report/latest.json`.
