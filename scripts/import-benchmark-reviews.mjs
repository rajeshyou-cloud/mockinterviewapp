import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const questionPackPaths = [
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

const reviewDirectory = 'apps/web/data/benchmark-reviews';
const dryRun = process.argv.includes('--dry-run');
const reviewFileArgs = process.argv
  .filter((arg) => arg.startsWith('--review-file=') || arg.startsWith('--file='))
  .map((arg) => arg.split('=')[1])
  .filter(Boolean);
const allowedStatuses = new Set(['ai-evidence-verified', 'disputed', 'rejected']);
const onlyFinalStatusArg = process.argv.find((arg) => arg.startsWith('--only-final-status='))?.split('=')[1];
const onlyFinalStatuses = onlyFinalStatusArg
  ? new Set(onlyFinalStatusArg.split(',').map((status) => status.trim()).filter(Boolean))
  : null;

function isValidReview(review) {
  if (!review.questionId || !review.benchmarkVersion || !allowedStatuses.has(review.finalStatus)) return false;
  if (!review.primary || !review.critic) return false;
  if (review.primaryModel === review.criticModel) return false;
  if (review.finalStatus === 'ai-evidence-verified') {
    return review.primary.verdict === 'approve' && review.critic.verdict === 'approve';
  }
  if (review.finalStatus === 'rejected') {
    return review.primary.verdict === 'reject' || review.critic.verdict === 'reject';
  }
  return review.primary.verdict !== 'approve' || review.critic.verdict !== 'approve';
}

async function loadReviews() {
  if (!existsSync(reviewDirectory)) return [];
  const files = reviewFileArgs.length > 0
    ? reviewFileArgs
    : (await readdir(reviewDirectory)).filter((file) => file.endsWith('.jsonl'));
  const reviews = [];
  for (const file of files) {
    const lines = (await readFile(join(reviewDirectory, file), 'utf8')).trim().split('\n').filter(Boolean);
    reviews.push(...lines.map((line) => JSON.parse(line)));
  }
  return reviews;
}

const reviews = await loadReviews();
const validReviews = new Map();
const rejectedReviews = [];
for (const review of reviews) {
  if (!isValidReview(review)) {
    rejectedReviews.push(review.questionId ?? '<missing-question-id>');
    continue;
  }
  if (onlyFinalStatuses && !onlyFinalStatuses.has(review.finalStatus)) continue;
  validReviews.set(`${review.questionId}:${review.benchmarkVersion}`, review);
}

let updated = 0;
let unchanged = 0;
for (const path of questionPackPaths) {
  const questions = JSON.parse(await readFile(path, 'utf8'));
  let changed = false;
  for (const question of questions) {
    const review = validReviews.get(`${question.id}:${question.benchmark.version}`);
    if (!review) {
      unchanged += 1;
      continue;
    }
    question.benchmark.review = {
      status: review.finalStatus,
      promptVersion: review.promptVersion,
      reviewerModels: [review.primaryModel, review.criticModel],
      verdicts: [review.primary.verdict, review.critic.verdict],
      confidence: Math.min(review.primary.confidence, review.critic.confidence),
      corrections: [...new Set([...(review.primary.corrections ?? []), ...(review.critic.corrections ?? [])])],
      reviewedAt: review.reviewedAt.slice(0, 10),
    };
    updated += 1;
    changed = true;
  }
  if (changed && !dryRun) await writeFile(path, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  mode: dryRun ? 'dry-run' : 'write',
  reviewFilesFound: reviews.length,
  onlyFinalStatus: onlyFinalStatusArg ?? 'all',
  validReviews: validReviews.size,
  rejectedReviews: rejectedReviews.length,
  updated,
  unchanged,
}, null, 2));

if (rejectedReviews.length) {
  console.error(`Rejected invalid review records for: ${rejectedReviews.slice(0, 20).join(', ')}`);
  process.exit(1);
}
