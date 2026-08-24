import { readFile } from 'node:fs/promises';

const packs = [
  ['released', 'apps/web/data/beginner.json'],
  ['released', 'apps/web/data/starter.json'],
  ['released', 'apps/web/data/expanded.json'],
  ['released', 'apps/web/data/generated.json'],
  ['candidate', 'apps/web/data/candidates/aws.json'],
  ['candidate', 'apps/web/data/candidates/databricks.json'],
  ['candidate', 'apps/web/data/candidates/oracle.json'],
  ['candidate', 'apps/web/data/candidates/power-bi.json'],
  ['candidate', 'apps/web/data/candidates/python.json'],
];

const allowedHosts = new Set([
  'docs.aws.amazon.com',
  'docs.databricks.com',
  'docs.informatica.com',
  'docs.oracle.com',
  'docs.python.org',
  'docs.snowflake.com',
  'learn.microsoft.com',
  'packaging.python.org',
]);

const reviewStatuses = ['draft', 'reviewing', 'disputed', 'ai-evidence-verified', 'human-verified', 'stale', 'rejected'];
const verifiedStatuses = new Set(['ai-evidence-verified', 'human-verified']);

function fail(errors, id, message) {
  errors.push(`${id}: ${message}`);
}

function validateQuestion(question, packType, errors, summary) {
  const id = question.id ?? '<missing-id>';
  const benchmark = question.benchmark;
  summary.total += 1;
  summary.byTechnology[question.technology] = (summary.byTechnology[question.technology] ?? 0) + 1;

  if (!benchmark) {
    fail(errors, id, 'missing benchmark');
    return;
  }

  summary.byReviewStatus[benchmark.review?.status] = (summary.byReviewStatus[benchmark.review?.status] ?? 0) + 1;
  if (!reviewStatuses.includes(benchmark.review?.status)) fail(errors, id, `invalid review status ${benchmark.review?.status}`);
  if (benchmark.version !== '1.0.0') fail(errors, id, 'unexpected benchmark version');
  if (benchmark.canonicalAnswer !== question.canonicalAnswer) fail(errors, id, 'benchmark answer differs from canonicalAnswer baseline');
  if (JSON.stringify(benchmark.requiredConcepts) !== JSON.stringify(question.expectedConcepts)) fail(errors, id, 'required concepts differ from expectedConcepts baseline');
  if (!benchmark.expandedExplanation?.includes(question.canonicalAnswer)) fail(errors, id, 'expanded explanation does not include canonical answer baseline');
  if (!benchmark.optionalConcepts?.length) fail(errors, id, 'missing optional concepts');
  if (benchmark.acceptedAlternatives?.length !== question.expectedConcepts?.length) fail(errors, id, 'accepted alternatives must cover required concepts');
  if (!benchmark.scoringAnchors?.strong || !benchmark.scoringAnchors?.partial || !benchmark.scoringAnchors?.weak || !benchmark.scoringAnchors?.incorrect) {
    fail(errors, id, 'missing scoring anchors');
  }

  const evidence = benchmark.evidence?.[0];
  if (!evidence) {
    fail(errors, id, 'missing evidence');
  } else {
    const host = new URL(evidence.url).hostname;
    if (!allowedHosts.has(host)) fail(errors, id, `unsupported evidence host ${host}`);
    if (evidence.url !== question.source.url) fail(errors, id, 'evidence URL differs from source URL baseline');
    if (!/^sha256:[a-f0-9]{64}$/.test(evidence.contentHash)) fail(errors, id, 'invalid evidence content hash');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(evidence.retrievedAt)) fail(errors, id, 'invalid evidence retrieval date');
  }

  if (packType === 'candidate' && !verifiedStatuses.has(benchmark.review.status)) {
    summary.blockedCandidateQuestions += 1;
  }
}

const errors = [];
const summary = {
  total: 0,
  blockedCandidateQuestions: 0,
  byTechnology: {},
  byReviewStatus: {},
  evidencePackets: {},
};

for (const [packType, path] of packs) {
  const questions = JSON.parse(await readFile(path, 'utf8'));
  for (const question of questions) validateQuestion(question, packType, errors, summary);
}

if (summary.total !== 1050) fail(errors, 'question-bank', `expected 1050 questions, found ${summary.total}`);

try {
  const manifest = JSON.parse(await readFile('apps/web/data/evidence-packets/manifest.json', 'utf8'));
  if (manifest.totalQuestions !== summary.total) fail(errors, 'evidence-packets', 'manifest total does not match question bank');
  for (const [technology, count] of Object.entries(summary.byTechnology)) {
    const entry = manifest.technologies?.[technology];
    if (!entry) {
      fail(errors, 'evidence-packets', `missing manifest entry for ${technology}`);
      continue;
    }
    if (entry.count !== count) fail(errors, 'evidence-packets', `${technology} manifest count does not match question bank`);
    const lines = (await readFile(entry.path, 'utf8')).trim().split('\n').filter(Boolean);
    if (lines.length !== count) fail(errors, 'evidence-packets', `${technology} packet count does not match manifest`);
    summary.evidencePackets[technology] = lines.length;
  }
} catch (error) {
  fail(errors, 'evidence-packets', error instanceof Error ? error.message : 'could not validate packet manifest');
}

console.log(JSON.stringify(summary, null, 2));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
