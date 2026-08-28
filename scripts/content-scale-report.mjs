import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packPaths = [
  'apps/web/data/beginner.json', 'apps/web/data/starter.json', 'apps/web/data/expanded.json', 'apps/web/data/generated.json',
  'apps/web/data/candidates/aws.json', 'apps/web/data/candidates/databricks.json', 'apps/web/data/candidates/oracle.json',
  'apps/web/data/candidates/power-bi.json', 'apps/web/data/candidates/python.json',
];
const targetPerTechnology = 1_000;
const verified = new Set(['ai-evidence-verified', 'human-verified']);
const deepTypes = new Set(['scenario', 'troubleshooting', 'design', 'hands-on']);
const rootPaths = new Set(['/', '']);
const noWrite = process.argv.includes('--no-write');

function score(question) {
  const evidence = question.benchmark?.evidence ?? [];
  const required = question.benchmark?.requiredConcepts ?? [];
  const answer = question.benchmark?.canonicalAnswer ?? '';
  let value = verified.has(question.benchmark?.review?.status) ? 25 : 0;
  const requiredEvidence = question.difficulty === 'advanced' || deepTypes.has(question.type) ? 3 : question.difficulty === 'intermediate' ? 2 : 1;
  value += Math.min(25, Math.round(25 * evidence.length / requiredEvidence));
  value += required.length >= 3 ? 20 : required.length * 6;
  value += answer.length >= 300 ? 15 : answer.length >= 180 ? 10 : answer.length >= 120 ? 5 : 0;
  const specific = evidence.some((item) => {
    try { return !rootPaths.has(new URL(item.url).pathname); } catch { return false; }
  });
  value += specific ? 15 : 0;
  return Math.min(100, value);
}

const questions = [];
for (const path of packPaths) questions.push(...JSON.parse(await readFile(path, 'utf8')));
const technologies = {};
for (const question of questions) {
  const technology = technologies[question.technology] ??= {
    total: 0, target: targetPerTechnology, gap: 0, difficulty: {}, type: {}, topics: {}, reviewStatus: {},
    evidenceBelowMinimum: 0, quality: { average: 0, below70: 0 }, priorityQueue: [], scores: [],
  };
  technology.total += 1;
  technology.difficulty[question.difficulty] = (technology.difficulty[question.difficulty] ?? 0) + 1;
  technology.type[question.type] = (technology.type[question.type] ?? 0) + 1;
  technology.topics[question.topic] = (technology.topics[question.topic] ?? 0) + 1;
  const reviewStatus = question.benchmark?.review?.status ?? 'missing';
  technology.reviewStatus[reviewStatus] = (technology.reviewStatus[reviewStatus] ?? 0) + 1;
  const minimum = question.difficulty === 'advanced' || deepTypes.has(question.type) ? 3 : question.difficulty === 'intermediate' ? 2 : 1;
  if ((question.benchmark?.evidence?.length ?? 0) < minimum) technology.evidenceBelowMinimum += 1;
  const qualityScore = score(question);
  technology.scores.push(qualityScore);
  if (qualityScore < 70) technology.quality.below70 += 1;
  if (!verified.has(reviewStatus)) technology.priorityQueue.push({
    questionId: question.id, reviewStatus, qualityScore,
    priority: (['stale', 'rejected', 'disputed'].includes(reviewStatus) ? 100 : 50) + (100 - qualityScore),
  });
}

for (const technology of Object.values(technologies)) {
  technology.gap = Math.max(0, targetPerTechnology - technology.total);
  technology.quality.average = Math.round(technology.scores.reduce((sum, value) => sum + value, 0) / technology.scores.length);
  delete technology.scores;
  technology.priorityQueue.sort((left, right) => right.priority - left.priority || left.questionId.localeCompare(right.questionId));
  technology.priorityQueue = technology.priorityQueue.slice(0, 25);
}

const report = { generatedAt: new Date().toISOString(), targetPerTechnology, totalQuestions: questions.length, technologies };
if (!noWrite) {
  const directory = resolve('apps/web/data/content-scale-report');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(report, null, 2));
