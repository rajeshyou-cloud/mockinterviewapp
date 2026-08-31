import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const technologyArg = args.find((arg) => arg.startsWith('--technology='))?.split('=')[1] ?? 'all';
const onlyStatusArg = args.find((arg) => arg.startsWith('--only-status='))?.split('=')[1] ?? 'draft,disputed,rejected';
const onlyStatuses = new Set(onlyStatusArg.split(',').map((status) => status.trim()).filter(Boolean));
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 'all';
const limit = limitArg === 'all' ? Number.POSITIVE_INFINITY : Number.parseInt(limitArg, 10);
const offset = Number.parseInt(args.find((arg) => arg.startsWith('--offset='))?.split('=')[1] ?? '0', 10);
const batchLabel = args.find((arg) => arg.startsWith('--batch-label='))?.split('=')[1]?.trim();
const outputDirectory = resolve('apps/web/data/evidence-packets-compact');
const triagePath = resolve('apps/web/data/review-triage/latest.json');

const requestedTechnologies = technologyArg === 'all'
  ? null
  : new Set(technologyArg.split(',').map((technology) => technology.trim()).filter(Boolean));

const triageByQuestionId = new Map();
if (existsSync(triagePath)) {
  const triage = JSON.parse(await readFile(triagePath, 'utf8'));
  for (const record of triage.records ?? []) {
    triageByQuestionId.set(record.questionId, record);
  }
}

const manifest = JSON.parse(await readFile('apps/web/data/evidence-packets/manifest.json', 'utf8'));
const technologies = Object.keys(manifest.technologies ?? {})
  .filter((technology) => !requestedTechnologies || requestedTechnologies.has(technology))
  .sort();

function compactPacket(packet) {
  const triage = triageByQuestionId.get(packet.questionId);
  return {
    questionId: packet.questionId,
    technology: packet.technology,
    topic: packet.topic,
    difficulty: packet.difficulty,
    type: packet.type,
    question: packet.question,
    benchmarkVersion: packet.benchmarkVersion,
    benchmarkAnswer: packet.benchmarkAnswer,
    requiredConcepts: packet.requiredConcepts,
    acceptedAlternatives: packet.acceptedAlternatives,
    evidence: packet.evidence?.map((item) => ({
      title: item.title,
      section: item.section,
      url: item.url,
      documentVersion: item.documentVersion,
      retrievedAt: item.retrievedAt,
      contentHash: item.contentHash,
    })) ?? [],
    currentReviewStatus: packet.currentReviewStatus,
    staticTriageReasons: triage?.reasons ?? [],
    reviewInstruction: [
      'Use only the question, benchmark answer, required concepts, accepted alternatives, and cited official evidence metadata.',
      'This is a compact re-review packet designed to reduce token cost.',
      'Approve only if the benchmark is specific, coherent, non-duplicated, and supported by the official evidence metadata.',
      'Dispute if corrections are needed. Reject only if the answer is unusable as a scoring anchor.',
      'Do not call the result human review or vendor certification.',
    ],
  };
}

await mkdir(outputDirectory, { recursive: true });

const outputManifest = {
  generatedAt: new Date().toISOString(),
  packetVersion: 'compact-rereview-1.0.0',
  sourceManifest: 'apps/web/data/evidence-packets/manifest.json',
  filters: {
    technology: technologyArg,
    onlyStatus: [...onlyStatuses],
    limit: limitArg,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    batchLabel: batchLabel || null,
  },
  totalQuestions: 0,
  technologies: {},
};

for (const technology of technologies) {
  const sourcePath = manifest.technologies[technology].path;
  const packets = (await readFile(sourcePath, 'utf8'))
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((packet) => onlyStatuses.has(packet.currentReviewStatus))
    .slice(Number.isFinite(offset) && offset > 0 ? offset : 0)
    .slice(0, Number.isFinite(limit) ? limit : undefined)
    .map(compactPacket);

  const runnerOutputName = `${technology}.jsonl`;
  const sentForRereviewOutputName = `${technology}-sentforrereview-compact.jsonl`;
  const labelledOutputName = batchLabel ? `${technology}-${batchLabel}.jsonl` : null;
  const body = packets.length ? `${packets.map((packet) => JSON.stringify(packet)).join('\n')}\n` : '';
  await writeFile(resolve(outputDirectory, runnerOutputName), body, 'utf8');
  await writeFile(resolve(outputDirectory, sentForRereviewOutputName), body, 'utf8');
  if (labelledOutputName) {
    await writeFile(resolve(outputDirectory, labelledOutputName), body, 'utf8');
  }

  outputManifest.totalQuestions += packets.length;
  outputManifest.technologies[technology] = {
    count: packets.length,
    path: `apps/web/data/evidence-packets-compact/${sentForRereviewOutputName}`,
    runnerPath: `apps/web/data/evidence-packets-compact/${runnerOutputName}`,
    labelledPath: labelledOutputName ? `apps/web/data/evidence-packets-compact/${labelledOutputName}` : null,
  };
}

await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(outputManifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(outputManifest, null, 2));
