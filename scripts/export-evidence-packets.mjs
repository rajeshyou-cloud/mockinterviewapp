import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function packetFor(question) {
  return {
    questionId: question.id,
    technology: question.technology,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    question: question.question,
    benchmarkVersion: question.benchmark.version,
    benchmarkAnswer: question.benchmark.canonicalAnswer,
    expandedExplanation: question.benchmark.expandedExplanation,
    requiredConcepts: question.benchmark.requiredConcepts,
    optionalConcepts: question.benchmark.optionalConcepts,
    acceptedAlternatives: question.benchmark.acceptedAlternatives,
    incorrectClaims: question.benchmark.incorrectClaims,
    reasoning: question.benchmark.reasoning,
    scoringAnchors: question.benchmark.scoringAnchors,
    evidence: question.benchmark.evidence,
    currentReviewStatus: question.benchmark.review.status,
    reviewInstruction: [
      'Use only the cited official evidence packet and the question text.',
      'Approve only if the benchmark answer, concepts, alternatives, anchors, and difficulty are supported.',
      'Return disputed for unsupported, ambiguous, stale, or materially incomplete benchmarks.',
      'Do not treat this packet as vendor certification or human review.',
    ],
  };
}

const byTechnology = new Map();
for (const pack of packs) {
  const questions = JSON.parse(await readFile(pack, 'utf8'));
  for (const question of questions) {
    const items = byTechnology.get(question.technology) ?? [];
    items.push(packetFor(question));
    byTechnology.set(question.technology, items);
  }
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, '../apps/web/data/evidence-packets');
await mkdir(outputDirectory, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  packetVersion: '1.0.0',
  totalQuestions: 0,
  technologies: {},
};

for (const [technology, packets] of [...byTechnology.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  packets.sort((left, right) => left.questionId.localeCompare(right.questionId));
  manifest.totalQuestions += packets.length;
  manifest.technologies[technology] = {
    count: packets.length,
    path: `apps/web/data/evidence-packets/${technology}.jsonl`,
  };
  await writeFile(
    resolve(outputDirectory, `${technology}.jsonl`),
    `${packets.map((packet) => JSON.stringify(packet)).join('\n')}\n`,
    'utf8',
  );
}

await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
