# Benchmark Answer and Evidence-Based Scoring Plan

_Created: 2026-08-23_

_Status: Proposed implementation plan_

_Scope: all released and candidate question packs (1,050 questions)_

## 1. Purpose

Give every interview question a trustworthy, versioned benchmark answer and score each candidate response against the meaning of that benchmark—not against exact wording.

The completed system must:

- explain what a strong answer should contain;
- ground technical claims in official vendor documentation;
- accept correct alternative terminology and approaches;
- detect important omissions and incorrect claims;
- produce consistent, auditable scores and useful feedback;
- retain the exact benchmark and scoring version used for every submitted answer; and
- fall back safely when live AI scoring is unavailable.

## 2. Current state and gap

The repository currently contains:

- 300 released Snowflake and Informatica questions;
- 750 hidden candidate questions across Databricks, Oracle Database, Power BI, Python, and AWS;
- a canonical answer, expected concepts, follow-up prompts, and official source link for each question;
- server-side rubric resolution, so a browser cannot provide its own scoring rules;
- a provider-neutral semantic scorer through Vercel AI Gateway; and
- an explainable deterministic fallback.

The present content is structurally validated and source-linked, but it has not completed a question-by-question vendor-evidence review. The deterministic scorer looks for expected concept phrases and does not fully evaluate the canonical answer, equivalent wording, reasoning, or factual contradictions. The semantic scoring path is implemented but cannot run in production until an AI provider is activated.

Therefore, existing `ai-reviewed` content must not be described as human-reviewed, vendor-certified, or fully vendor-verified.

## 3. Goals

1. Build an evidence-backed benchmark record for every question.
2. Score meaning, accuracy, coverage, reasoning, and relevance—not text similarity alone.
3. Make scoring reproducible through immutable benchmark and scorer versions.
4. Use two independent AI review passes for scalable content review, with disputed questions withheld.
5. Preserve human review as an optional escalation and high-risk quality-control step.
6. Store enough detail to explain, audit, and later reproduce every score.
7. Keep the interview usable through a clearly labelled deterministic fallback.

## 4. Non-goals

- Claiming that a vendor has certified or endorsed the question bank.
- Requiring candidates to repeat one exact model answer.
- Publishing benchmark answers before submission in a way that invalidates an interview.
- Allowing an AI score to be the sole basis for employment or other high-impact decisions.
- Automatically releasing questions when their reviewers disagree.

## 5. Benchmark contract

Each question will retain its stable question ID and receive a versioned benchmark object with the following information:

| Area | Required information |
| --- | --- |
| Identity | Question ID, technology, topic, difficulty, benchmark version |
| Answer | Concise canonical answer and an expanded explanation |
| Required coverage | Concepts a correct answer must include |
| Optional depth | Useful details that improve a response but are not mandatory |
| Accepted alternatives | Equivalent terminology, valid approaches, and product-version differences |
| Accuracy checks | Common misconceptions, contradictions, and disqualifying claims |
| Reasoning | Expected trade-offs, constraints, examples, or scenario decisions |
| Evidence | Official URL, document section, retrieval time, document version when available, and content hash |
| Scoring anchors | Strong, partial, weak, and incorrect-answer descriptions for the difficulty level |
| Review | Status, reviewer models, prompt version, verdicts, confidence, corrections, and review date |

Example shape:

```json
{
  "questionId": "snowflake-intermediate-042",
  "benchmarkVersion": "1.0.0",
  "canonicalAnswer": "...",
  "requiredConcepts": ["..."],
  "optionalConcepts": ["..."],
  "acceptedAlternatives": [{ "terms": ["...", "..."], "meaning": "..." }],
  "incorrectClaims": [{ "claim": "...", "severity": "major", "reason": "..." }],
  "evidence": [{ "url": "https://...", "section": "...", "retrievedAt": "...", "contentHash": "..." }],
  "review": { "status": "ai-evidence-verified", "promptVersion": "1.0.0" }
}
```

Allowed review states will be explicit: `draft`, `reviewing`, `disputed`, `ai-evidence-verified`, `human-verified`, `stale`, and `rejected`. The public product will use these exact, honest labels.

## 6. Scoring rubric

The proposed 100-point rubric is:

| Dimension | Weight | Meaning |
| --- | ---: | --- |
| Technical accuracy | 40 | Claims are correct and do not conflict with vendor evidence |
| Required concept coverage | 30 | The response covers the concepts essential to this question |
| Reasoning and trade-offs | 20 | The response explains why, when, constraints, or consequences where appropriate |
| Relevance and clarity | 10 | The response directly answers the question and is understandable |

Major incorrect claims can apply a penalty of up to 30 points. Optional concepts can strengthen reasoning or clarity, but their absence must not unfairly reduce required-concept coverage.

Proposed score bands:

- 90–100: excellent and interview-ready;
- 75–89: strong, with minor gaps;
- 60–74: partially correct, with meaningful omissions;
- 40–59: limited understanding or material inaccuracies; and
- 0–39: substantially incorrect, irrelevant, or unsupported.

Each difficulty level will have its own anchors. A beginner answer may succeed with an accurate definition and basic use case; an advanced answer must demonstrate constraints, trade-offs, failure modes, and scenario judgement where the question requires them.

The score engine must never use generic text similarity as the final decision. It must evaluate claims and concepts using the benchmark, accepted alternatives, and evidence-backed contradiction rules.

## 7. Vendor-document review workflow

### 7.1 Evidence preparation

1. Group questions by official documentation source and product version.
2. Retrieve the relevant official pages, record the exact sections used, and create a content hash.
3. Reject inaccessible, unofficial, ambiguous, or irrelevant evidence.
4. Build a bounded evidence packet for each question so reviewers do not depend on unsupported model memory.

### 7.2 Independent AI review

1. A primary reviewer checks the question, benchmark, concepts, alternatives, incorrect claims, difficulty, and sources against the evidence packet.
2. An independent critic from a different provider or model family performs the same review without seeing the primary verdict.
3. A deterministic validator confirms schema, URLs, citations, IDs, counts, and required fields.
4. A question becomes `ai-evidence-verified` only when both reviewers approve the evidence and technical content.
5. Any disagreement or proposed factual correction moves the question to `disputed`; it remains hidden until corrected and re-reviewed.

AI review reduces manual effort but does not become “human review.” Human specialists may sample approved questions and must resolve disputed or high-risk items if the project adopts a human-escalation policy.

### 7.3 Freshness

A benchmark becomes `stale` when its official document hash changes, its vendor version expires, or its benchmark content changes without a completed review. Stale questions cannot be newly published until re-review passes.

## 8. Candidate scoring workflow

```text
Candidate submits answer
        ↓
Server resolves question and released benchmark version
        ↓
Input limits and prompt-injection boundary checks
        ↓
Semantic evaluator returns structured dimension results
        ↓
Server validates claims, totals, penalties, and feedback
        ↓
Full scoring record is stored with benchmark/model versions
        ↓
Candidate sees score, strengths, gaps, corrections, and next step
```

The scoring request will include only the candidate answer and the server-resolved benchmark. Instructions contained inside the candidate answer are treated as untrusted answer text, never as evaluator instructions.

If the semantic provider times out, fails, or returns invalid structure, the application will use the existing deterministic fallback and label the result **Explainable baseline evaluation**. It must never display a fallback result as live AI semantic scoring.

## 9. Persistence and reproducibility

Benchmark content should remain version-controlled in the repository initially. Review decisions and scoring runs belong in Neon.

### 9.1 Benchmark review data

Add a `question_benchmark_reviews` table, or extend the existing review model, with:

- question ID and benchmark version;
- evidence URLs, sections, retrieval dates, and hashes;
- primary and critic provider/model identifiers;
- prompt and review-policy versions;
- independent verdicts, corrections, confidence, and final state;
- reviewer identity for any human decision; and
- creation and approval timestamps.

### 9.2 Candidate score data

Extend answer persistence or add immutable `answer_scoring_runs` records containing:

- submitted answer ID and exact answer text reference;
- benchmark version;
- scorer provider, model, and scoring-policy version;
- total score and all dimension scores;
- matched, missing, and optional concepts;
- detected incorrect claims and applied penalties;
- feedback and suggested improvement;
- latency, fallback reason, token usage, and estimated cost when available; and
- scoring timestamp.

Previously issued results must not silently change. A re-score creates a new scoring run linked to the original answer and identifies which result is currently displayed.

## 10. API and user experience

### Candidate experience

- Continue resolving every rubric on the server by question ID.
- Show whether the result is semantic or baseline.
- Show dimension scores, covered concepts, missing concepts, factual corrections, and concise improvement guidance.
- Reveal the full benchmark answer only after submission or completion, according to the selected product policy.
- Explain that the score is practice guidance, not a vendor certification or hiring decision.

### Reviewer experience

- Filter questions by course, difficulty, source, status, disagreement, and freshness.
- Compare the question and benchmark directly with cited vendor evidence.
- Show both independent AI verdicts and proposed corrections.
- Allow authorized reviewers to accept, reject, edit, or request re-review.
- Display review completion and dispute counts by course.

### Administration

- Permit publication only when every question in a pack satisfies the selected review policy.
- Record every publication, withdrawal, benchmark update, and manual override in an audit trail.
- Never accept rubric fields or benchmark versions supplied by the browser as authoritative.

## 11. Security, privacy, and safety

- Keep provider credentials server-side and out of logs and browser bundles.
- Treat candidate answers and retrieved documents as untrusted input.
- Enforce answer length, request-rate, timeout, and structured-output limits.
- Do not log complete candidate answers in provider-error telemetry.
- Send the minimum candidate data needed for scoring and do not send email or account identity.
- Document the selected provider’s retention and training policy before production activation.
- Apply account deletion and retention rules to answer and scoring records.
- Restrict benchmark review, overrides, and publication to authorized roles.
- Preserve a deterministic fallback and circuit breaker for provider outages or cost limits.

## 12. Evaluation and calibration

Create a protected calibration set for every technology and difficulty containing:

- strong, partial, weak, and incorrect answers;
- paraphrases using alternate terminology;
- concise and verbose correct answers;
- confident but factually wrong answers;
- answers with irrelevant detail; and
- prompt-injection and rubric-manipulation attempts.

Subject-matter reviewers should label a representative sample before semantic scoring is enabled for released courses. Proposed production acceptance targets are:

- 100% benchmark-schema and evidence validation;
- zero disputed, stale, or rejected questions in a published pack;
- at least 85% agreement with expert score bands on the calibration sample;
- mean absolute score difference no greater than 10 points versus expert scores;
- at least 99.5% valid structured scorer responses under normal operation; and
- successful, correctly labelled fallback for every simulated provider failure.

These numerical targets are proposed and should be confirmed after the first calibration exercise.

## 13. Implementation phases

### Phase 0 — Policy and baseline freeze

Deliverables:

- approve review labels, scoring weights, publication policy, and answer-display policy;
- snapshot the current 1,050 questions and benchmark hashes; and
- define supported vendor/product versions.

Exit: policy decisions are documented and the content baseline is reproducible.

### Phase 1 — Benchmark schema and validators

Deliverables:

- extend the question schema with benchmark, evidence, alternative, misconception, anchor, and version fields;
- migrate all packs without changing released behaviour; and
- add validation for completeness, versions, source hosts, hashes, uniqueness, and released-state rules.

Exit: all 1,050 records pass structural validation, but no new pack is released.

### Phase 2 — Evidence retrieval and review tooling

Deliverables:

- build official-document retrieval, section extraction, and content-hash tooling;
- implement independent primary and critic review adapters;
- persist review evidence and verdicts; and
- enhance `/review` with evidence, disagreement, correction, and freshness views.

Exit: a sample pack can move deterministically from `draft` to verified or disputed.

### Phase 3 — Audit the 300 released questions

Deliverables:

- review Snowflake and Informatica question-by-question;
- correct unsupported benchmarks and difficulty assignments;
- calibrate baseline and semantic scoring fixtures; and
- withdraw or hide any released question that cannot pass the new gate.

Exit: all released questions are evidence-verified under the chosen policy.

### Phase 4 — Review the 750 hidden candidate questions

Review order:

1. Databricks;
2. Power BI;
3. Oracle Database;
4. Python; and
5. AWS.

Each 150-question pack remains hidden until all evidence, review, calibration, test, and production-verification gates pass.

### Phase 5 — Versioned semantic scoring and persistence

Deliverables:

- update the scorer contract to return dimension scores, claims, evidence-grounded corrections, and benchmark version;
- add immutable scoring-run persistence and controlled re-scoring;
- retain and test the deterministic fallback; and
- expose clear scoring details in interview, replay, and account history.

Exit: a stored result can be reproduced and explained using its recorded versions.

### Phase 6 — Calibration and staged rollout

Deliverables:

- complete expert-labelled calibration samples;
- measure accuracy, consistency, latency, cost, and fallback behaviour;
- run shadow scoring without changing candidate-visible scores;
- release to a small cohort, monitor, then expand; and
- perform a final browser-to-API-to-database production transaction.

Exit: acceptance targets pass and production monitoring is active.

## 14. Tests and CI gates

Every pull request affecting questions, benchmarks, evidence, review, or scoring must run:

- question and benchmark JSON Schema validation;
- exact count, stable ID, uniqueness, course, difficulty, and topic coverage tests;
- official-source allow-list, reachability, section, and freshness checks;
- publication rejection tests for draft, disputed, rejected, and stale questions;
- server-side benchmark resolution and client-tampering tests;
- scoring fixtures for synonyms, omissions, contradictions, verbosity, and adversarial text;
- structured-output validation, timeout, retry, circuit-breaker, and fallback tests;
- database migration, authorization, immutability, deletion, and re-score tests;
- replay and account-history rendering tests;
- production build, dependency audit, API tests, and browser verification.

Network-dependent documentation checks should run on a scheduled workflow as well as before a pack release, so temporary vendor-site failures do not make every ordinary code change unreliable.

## 15. Observability and cost control

Track without exposing candidate content:

- semantic versus fallback scoring rate;
- provider, model, prompt, benchmark, and scoring-policy versions;
- latency, timeout, invalid-output, retry, and disagreement rates;
- tokens and estimated cost per answer, session, course, and provider;
- score distribution and sudden score drift by version;
- benchmark freshness and review backlog; and
- candidate feedback or appeal rate.

Set daily and monthly budgets, alert thresholds, and a circuit breaker. Repeated provider failures or a budget breach should switch safely to the labelled baseline rather than stop interviews.

## 16. Main risks and controls

| Risk | Control |
| --- | --- |
| Both AI reviewers repeat the same factual error | Ground both in cited official text, use different model families, and sample with experts |
| Vendor pages change | Store section metadata and hashes; mark affected benchmarks stale |
| Correct paraphrases score poorly | Maintain accepted alternatives and test diverse calibration answers |
| Confident incorrect answers score too highly | Explicit contradiction catalogue and accuracy penalties |
| Scores drift after a model change | Pin versions, shadow-test upgrades, and preserve immutable prior runs |
| Candidate prompt injection changes scoring | Strict instruction boundaries, structured output, and adversarial tests |
| AI service cost or outage disrupts interviews | Budgets, timeouts, circuit breaker, and labelled deterministic fallback |
| AI-reviewed content is presented as human-reviewed | Enforced status vocabulary and audited UI labels |

## 17. Decisions required before implementation

1. Review policy: dual-AI consensus only, or dual-AI plus required human sampling/escalation.
2. Primary and critic providers/models, including retention and cost terms.
3. Final rubric weights and score-band language.
4. Whether candidates see the full benchmark after each answer or only after session completion.
5. Data-retention duration for submitted answers and scoring details.
6. Re-scoring policy when benchmarks or models change.
7. Budget and maximum acceptable latency per answer.

## 18. Definition of done

This plan is finished only when:

- all 1,050 questions have complete, versioned benchmark records;
- each published question has current official evidence and the required review approval;
- no disputed, rejected, or stale question can appear in an interview or Question Bank;
- candidate answers are semantically scored against server-resolved benchmarks with dimension-level explanations;
- every score stores its benchmark, scorer, prompt, policy, and provider versions;
- fallback behaviour is tested and labelled honestly;
- calibration targets, CI gates, security controls, and production monitoring pass;
- each newly released course passes an end-to-end browser, API, persistence, replay, and deletion verification; and
- `PROJECT_STATE.md` and `HANDOVER.md` record the final implementation and evidence.

## 19. Recommended immediate next step

Implement Phase 0 and Phase 1 first, then audit the 300 already released Snowflake and Informatica questions before publishing any of the 750 candidate questions. This protects the live product while establishing one reusable benchmark and review standard for every future course.
