import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

const verifiedStatuses = new Set(['ai-evidence-verified', 'human-verified']);
const weakEvidenceUrls = new Set([
  'https://docs.aws.amazon.com/',
  'https://docs.databricks.com/',
  'https://docs.informatica.com/',
  'https://docs.oracle.com/',
  'https://docs.python.org/',
  'https://docs.snowflake.com/',
  'https://learn.microsoft.com/',
]);

const genericFragments = [
  'Define its purpose, core components, and boundary with adjacent features.',
  'A strong benchmark response should connect the answer to the question wording',
  'mention relevant constraints or trade-offs',
  'avoid claims that contradict the official source',
];

const args = process.argv.slice(2);
const technologyFilter = args.find((arg) => arg.startsWith('--technology='))?.split('=')[1];
const onlyStatusArg = args.find((arg) => arg.startsWith('--only-status='))?.split('=')[1] ?? 'draft,disputed,rejected,stale,reviewing';
const onlyStatuses = new Set(onlyStatusArg.split(',').map((status) => status.trim()).filter(Boolean));
const shouldWrite = !args.includes('--no-write');
const outputDirectory = resolve('apps/web/data/review-triage');

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();
}

function significantQuestionFragment(question) {
  const normalized = normalize(question);
  const words = normalized.split(/\s+/).filter((word) => word.length > 3);
  return words.slice(0, 10).join(' ');
}

function requiredConceptMissing(answer, concept) {
  const normalizedAnswer = normalize(answer);
  const normalizedConcept = normalize(concept);
  if (!normalizedConcept) return false;
  if (normalizedAnswer.includes(normalizedConcept)) return false;

  const importantWords = normalizedConcept
    .split(/\s+/)
    .filter((word) => word.length > 2 && !['and', 'the', 'for', 'with'].includes(word));
  if (importantWords.length === 0) return false;
  return !importantWords.every((word) => normalizedAnswer.includes(word));
}

function titleKey(question) {
  return [
    question.technology,
    question.topic,
    question.source?.title ?? '',
  ].map((part) => normalize(part)).join('|');
}

function addReason(reasons, code, detail) {
  reasons.push({ code, detail });
}

const questions = [];
for (const [packType, packPath] of packs) {
  const pack = JSON.parse(await readFile(packPath, 'utf8'));
  for (const question of pack) {
    if (technologyFilter && question.technology !== technologyFilter) continue;
    questions.push({ ...question, packType, packPath });
  }
}

const answerGroups = new Map();
for (const question of questions) {
  const key = `${titleKey(question)}|${normalize(question.benchmark?.canonicalAnswer ?? question.canonicalAnswer)}`;
  const group = answerGroups.get(key) ?? [];
  group.push(question);
  answerGroups.set(key, group);
}

const duplicateAnswerIds = new Map();
for (const group of answerGroups.values()) {
  const distinctQuestions = new Set(group.map((question) => normalize(question.question)));
  const distinctTypes = new Set(group.map((question) => question.type));
  const distinctDifficulties = new Set(group.map((question) => question.difficulty));
  if (group.length < 2 || distinctQuestions.size < 2 || (distinctTypes.size < 2 && distinctDifficulties.size < 2)) continue;
  for (const question of group) {
    duplicateAnswerIds.set(question.id, group.map((item) => item.id).filter((id) => id !== question.id));
  }
}

const records = [];
for (const question of questions) {
  const status = question.benchmark?.review?.status ?? 'missing';
  if (!onlyStatuses.has(status)) continue;

  const answer = question.benchmark?.canonicalAnswer ?? question.canonicalAnswer ?? '';
  const reasons = [];

  if (!question.benchmark) addReason(reasons, 'missing-benchmark', 'Question has no benchmark record.');
  if (genericFragments.some((fragment) => answer.includes(fragment))) {
    addReason(reasons, 'generic-template-answer', 'Benchmark answer contains generic generator guidance instead of a specific scoring anchor.');
  }
  if (genericFragments.some((fragment) => question.benchmark?.expandedExplanation?.includes(fragment))) {
    addReason(reasons, 'generic-expanded-explanation', 'Expanded explanation contains generic boilerplate.');
  }

  const questionFragment = significantQuestionFragment(question.question);
  if (questionFragment && normalize(answer).includes(questionFragment)) {
    addReason(reasons, 'question-text-leaked-into-answer', 'A long fragment of the question appears inside the benchmark answer.');
  }

  const missingConcepts = (question.benchmark?.requiredConcepts ?? question.expectedConcepts ?? [])
    .filter((concept) => requiredConceptMissing(answer, concept));
  if (missingConcepts.length > 0) {
    addReason(reasons, 'missing-required-concepts', `Answer does not explicitly cover: ${missingConcepts.join(', ')}.`);
  }

  const evidence = question.benchmark?.evidence?.[0];
  if (!evidence?.url) {
    addReason(reasons, 'missing-evidence-url', 'Benchmark does not include an evidence URL.');
  } else if (weakEvidenceUrls.has(evidence.url)) {
    addReason(reasons, 'weak-root-evidence-url', `Evidence points to a documentation root instead of a specific page: ${evidence.url}.`);
  }
  if (evidence?.url && question.source?.url && evidence.url !== question.source.url) {
    addReason(reasons, 'evidence-source-mismatch', 'Benchmark evidence URL differs from the question source URL.');
  }

  const duplicateIds = duplicateAnswerIds.get(question.id);
  if (duplicateIds?.length) {
    addReason(reasons, 'duplicate-answer-across-variants', `Same benchmark answer appears on related question variants: ${duplicateIds.slice(0, 8).join(', ')}${duplicateIds.length > 8 ? ', ...' : ''}.`);
  }

  if (answer.length < 120) {
    addReason(reasons, 'short-benchmark-answer', 'Benchmark answer may be too short for evidence-based semantic scoring.');
  }

  records.push({
    questionId: question.id,
    technology: question.technology,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    currentReviewStatus: status,
    packType: question.packType,
    sourceUrl: question.source?.url ?? null,
    reasonCodes: reasons.map((reason) => reason.code),
    reasons,
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  filters: {
    technology: technologyFilter ?? 'all',
    onlyStatus: [...onlyStatuses],
  },
  totalInspected: questions.length,
  totalFlaggedRecords: records.filter((record) => record.reasons.length > 0).length,
  totalSelectedRecords: records.length,
  byTechnology: {},
  byStatus: {},
  byReason: {},
};

for (const record of records) {
  summary.byTechnology[record.technology] ??= { selected: 0, flagged: 0 };
  summary.byTechnology[record.technology].selected += 1;
  if (record.reasons.length > 0) summary.byTechnology[record.technology].flagged += 1;
  summary.byStatus[record.currentReviewStatus] = (summary.byStatus[record.currentReviewStatus] ?? 0) + 1;
  for (const code of record.reasonCodes) {
    summary.byReason[code] = (summary.byReason[code] ?? 0) + 1;
  }
}

const markdown = [
  '# Static Benchmark Triage Report',
  '',
  `Generated: ${summary.generatedAt}`,
  `Technology: ${summary.filters.technology}`,
  `Statuses: ${summary.filters.onlyStatus.join(', ')}`,
  '',
  `Selected records: ${summary.totalSelectedRecords}`,
  `Records with local flags: ${summary.totalFlaggedRecords}`,
  '',
  '## By technology',
  '',
  '| Technology | Selected | Flagged |',
  '|---|---:|---:|',
  ...Object.entries(summary.byTechnology)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([technology, counts]) => `| ${technology} | ${counts.selected} | ${counts.flagged} |`),
  '',
  '## By reason',
  '',
  '| Reason | Count |',
  '|---|---:|',
  ...Object.entries(summary.byReason)
    .sort(([, left], [, right]) => right - left)
    .map(([reason, count]) => `| ${reason} | ${count} |`),
  '',
  '## Flagged records',
  '',
  '| Question ID | Technology | Status | Reasons |',
  '|---|---|---|---|',
  ...records
    .filter((record) => record.reasons.length > 0)
    .sort((left, right) => left.technology.localeCompare(right.technology) || left.questionId.localeCompare(right.questionId))
    .map((record) => `| ${record.questionId} | ${record.technology} | ${record.currentReviewStatus} | ${record.reasonCodes.join(', ')} |`),
  '',
].join('\n');

if (shouldWrite) {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'latest.json'), `${JSON.stringify({ summary, records }, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDirectory, 'latest.md'), markdown, 'utf8');
}

console.log(JSON.stringify(summary, null, 2));
