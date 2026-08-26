import { readFile, writeFile } from 'node:fs/promises';

const packs = [
  'apps/web/data/beginner.json',
  'apps/web/data/starter.json',
  'apps/web/data/expanded.json',
  'apps/web/data/generated.json',
  'apps/web/data/candidates/aws.json',
  'apps/web/data/candidates/databricks.json',
  'apps/web/data/candidates/oracle.json',
  'apps/web/data/candidates/power-bi.json',
  'apps/web/data/candidates/python.json',
];

const verifiedStatuses = new Set(['ai-evidence-verified', 'human-verified']);
const args = process.argv.slice(2);
const technology = args.find((arg) => arg.startsWith('--technology='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (!technology) {
  throw new Error('Pass --technology=<technology>, for example --technology=aws.');
}

function titleCase(value) {
  return String(value ?? '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.length <= 3 && word === word.toUpperCase()
      ? word
      : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function featureName(question) {
  const fromSource = question.source?.title
    ?.replace(/^AWS\s+/i, '')
    ?.replace(/\s*-\s*AWS.*$/i, '')
    ?.replace(/\s*-\s*Amazon.*$/i, '')
    ?.replace(/\s*\|\s*.*$/i, '')
    ?.trim();
  if (fromSource && fromSource.length <= 90) return fromSource;

  return titleCase(
    question.id
      .replace(/^candidate-[^-]+-/, '')
      .replace(/-\d+$/, '')
      .replaceAll('-', ' '),
  );
}

function conceptPhrase(concepts) {
  if (concepts.length === 0) return 'the required documented concepts';
  if (concepts.length === 1) return concepts[0];
  return `${concepts.slice(0, -1).join(', ')}, and ${concepts.at(-1)}`;
}

function validationEvidence(topic) {
  const base = technology === 'aws'
    ? 'CloudWatch metrics and logs, service health or audit events, configuration state, access tests, and a small controlled workload'
    : 'runtime metrics and logs, platform audit events, configuration state, access tests, and a small controlled workload';
  if (technology === 'aws' && (topic === 'identity' || topic === 'security')) return `${base}, with IAM policy evaluation and denied/allowed access checks`;
  if (topic === 'identity' || topic === 'security') return `${base}, with policy evaluation and denied/allowed access checks`;
  if (topic === 'networking') return `${base}, with route, DNS, security group, NACL, and connectivity checks`;
  if (topic === 'storage') return `${base}, with durability, lifecycle, encryption, restore, and data-access checks`;
  if (topic === 'database') return `${base}, with query, backup, failover, capacity, and latency checks`;
  if (topic === 'observability') return `${base}, with alarm, trace, dashboard, and event checks`;
  if (topic === 'analytics') return `${base}, with ingestion, catalog, query, partition, and result-count checks`;
  return base;
}

function answerFor(question) {
  const feature = featureName(question);
  const concepts = question.benchmark?.requiredConcepts ?? question.expectedConcepts ?? [];
  const conceptList = conceptPhrase(concepts);
  const evidence = validationEvidence(question.topic);
  const platform = technology === 'aws' ? 'AWS' : titleCase(technology);
  const resourceLabel = technology === 'aws' ? 'AWS resources' : 'platform resources';

  if (question.type === 'conceptual') {
    return `${feature} should be explained in terms of ${conceptList}. A correct benchmark answer states the ${platform} problem it solves, what the platform manages, what the customer must configure or operate, and how the feature is validated with observable service behavior rather than assumptions.`;
  }

  if (question.type === 'hands-on') {
    return `For a first implementation of ${feature}, start with a small scoped workload and configure only the minimum ${resourceLabel} needed to exercise ${conceptList}. Use least-privilege access, explicit region/account boundaries where relevant, safe defaults, and a rollback path; then verify the setup with ${evidence}.`;
  }

  if (question.type === 'scenario') {
    if (question.difficulty === 'advanced') {
      return `For a high-volume production workload built around ${feature}, evolve the design by measuring current bottlenecks and explicitly validating ${conceptList}. Separate critical and noisy workloads where possible, define reliability and recovery behavior, test cost-performance trade-offs, document operating limits, and promote only after production-like evidence proves the new design improves reliability without uncontrolled spend.`;
    }
    return `Use ${feature} only when the production requirement matches the documented ${platform} capability around ${conceptList}. Decide fit by mapping business requirements to service limits, security responsibility, dependencies, recovery needs, operating effort, measurable acceptance criteria, and cost before promoting the design.`;
  }

  if (question.type === 'design') {
    return `An enterprise-ready ${feature} design should explicitly cover ${conceptList}. Include account and environment separation, least-privilege governance, encryption or network controls where relevant, observability, failure isolation, backup or rollback expectations, capacity planning, cost controls, ownership, and documented operational runbooks.`;
  }

  if (question.type === 'troubleshooting' && question.difficulty === 'advanced') {
    return `After a ${feature} deployment produces incomplete or inconsistent production results, stop unsafe retries and preserve evidence such as request IDs, logs, metrics, configuration changes, event history, and affected resources. Diagnose whether the failure involves ${conceptList}, identify the last known correct state, reconcile expected versus actual results, repair with an idempotent rollback, replay, restore, or configuration correction, and resume only after monitoring and validation prove recurrence is controlled.`;
  }

  return `Troubleshoot ${feature} by first confirming the deployed configuration actually uses ${conceptList}. Compare expected behavior with ${evidence}, isolate the smallest failing component, check permissions, limits, dependencies, recent changes, and service events, then make one reversible correction at a time.`;
}

function expandedExplanationFor(question, answer) {
  const concepts = question.benchmark?.requiredConcepts ?? question.expectedConcepts ?? [];
  const platform = technology === 'aws' ? 'AWS' : titleCase(technology);
  return `${answer} This benchmark is specific to the ${question.difficulty} ${question.type} prompt because it requires the candidate to apply ${conceptPhrase(concepts)} using evidence from the cited official ${platform} source and operational validation, while avoiding unsupported claims or generic service descriptions.`;
}

function remediateQuestion(question) {
  const answer = answerFor(question);
  question.canonicalAnswer = answer;
  question.expectedConcepts = question.benchmark.requiredConcepts;
  question.benchmark.canonicalAnswer = answer;
  question.benchmark.expandedExplanation = expandedExplanationFor(question, answer);
  const platform = technology === 'aws' ? 'AWS' : titleCase(technology);
  question.benchmark.reasoning = `A complete answer should directly address the ${question.type} prompt for ${question.technology} at ${question.difficulty} level, explicitly cover ${conceptPhrase(question.benchmark.requiredConcepts)}, and ground validation in observable ${platform} evidence.`;
  question.benchmark.optionalConcepts = [
    `${question.difficulty} level trade-offs`,
    'operational validation evidence',
    question.type === 'hands-on'
      ? 'minimum safe implementation'
      : question.type === 'scenario'
        ? 'fit decision and risk controls'
        : question.type === 'design'
          ? 'governance and maintainability controls'
          : question.difficulty === 'advanced'
            ? 'safe diagnosis and idempotent recovery'
            : 'safe diagnosis sequence',
  ];
  question.benchmark.scoringAnchors = {
    strong: `Directly answers the ${question.type} question, accurately covers ${conceptPhrase(question.benchmark.requiredConcepts)}, uses operational ${platform} evidence, and stays aligned to the cited official source.`,
    partial: `Covers some required concepts but misses important ${platform} constraints, validation evidence, or operational reasoning expected at ${question.difficulty} level.`,
    weak: `Mentions ${question.topic} superficially, with little AWS-specific explanation and multiple missing required concepts.`,
    incorrect: `Gives claims that conflict with the benchmark answer or does not answer the ${question.topic} question in a technically useful way.`,
  };
  question.benchmark.review = {
    status: 'draft',
    promptVersion: 'benchmark-remediation-2026-08-26',
    reviewerModels: [],
    verdicts: [],
    confidence: 0,
    corrections: [
      'Remediated locally from static triage; requires independent AI evidence re-review before publication.',
    ],
    reviewedAt: null,
  };
}

const summary = {
  technology,
  dryRun,
  updated: 0,
  skippedVerified: 0,
  scanned: 0,
  files: {},
};

for (const packPath of packs) {
  const questions = JSON.parse(await readFile(packPath, 'utf8'));
  let changed = false;

  for (const question of questions) {
    if (question.technology !== technology) continue;
    summary.scanned += 1;
    if (verifiedStatuses.has(question.benchmark?.review?.status)) {
      summary.skippedVerified += 1;
      continue;
    }
    remediateQuestion(question);
    changed = true;
    summary.updated += 1;
    summary.files[packPath] = (summary.files[packPath] ?? 0) + 1;
  }

  if (changed && !dryRun) {
    await writeFile(packPath, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
  }
}

console.log(JSON.stringify(summary, null, 2));
