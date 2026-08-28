import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

function loadLocalEnv() {
  for (const envPath of ['.env.local', '.env']) {
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim().replace(/^\$env:/i, '').replace(/^env:/i, '');
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const shouldImport = !args.includes('--no-import');
const importOnlyVerified = !args.includes('--import-all-statuses');
const shouldTest = args.includes('--test');
const compact = args.includes('--compact');
const provider = args.find((arg) => arg.startsWith('--provider='))?.split('=')[1] ?? process.env.REVIEW_PROVIDER ?? 'openai';
const technologyArg = args.find((arg) => arg.startsWith('--technology='))?.split('=')[1] ?? 'all';
const onlyStatus = args.find((arg) => arg.startsWith('--only-status='))?.split('=')[1] ?? 'draft,disputed';
const limit = args.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 'all';
const offset = args.find((arg) => arg.startsWith('--offset='))?.split('=')[1] ?? '0';
const concurrency = args.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1] ?? '2';
const batchSize = args.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1] ?? '25';
const maxRetries = args.find((arg) => arg.startsWith('--max-retries='))?.split('=')[1] ?? '5';
const requestDelayMs = args.find((arg) => arg.startsWith('--request-delay-ms='))?.split('=')[1] ?? '0';
const quotaPauseMs = args.find((arg) => arg.startsWith('--quota-pause-ms='))?.split('=')[1] ?? '0';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

function run(command, commandArgs, options = {}) {
  const executable = process.platform === 'win32' && command === 'npm' ? process.env.ComSpec : command;
  const args = process.platform === 'win32' && command === 'npm'
    ? ['/d', '/s', '/c', 'npm', ...commandArgs]
    : commandArgs;
  const result = spawnSync(executable, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    const detail = result.error ? ` (${result.error.message})` : '';
    throw new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${result.status}${detail}`);
  }
}

function requireLiveConfiguration() {
  if (dryRun) return;
  if (!process.env.REVIEW_PRIMARY_MODEL || !process.env.REVIEW_CRITIC_MODEL) {
    throw new Error('Set REVIEW_PRIMARY_MODEL and REVIEW_CRITIC_MODEL to two different reviewer models.');
  }
  if (process.env.REVIEW_PRIMARY_MODEL === process.env.REVIEW_CRITIC_MODEL) {
    throw new Error('REVIEW_PRIMARY_MODEL and REVIEW_CRITIC_MODEL must be different for independent consensus review.');
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('Set OPENAI_API_KEY before running automated ChatGPT/OpenAI review.');
  }
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Set ANTHROPIC_API_KEY before running automated Claude review.');
  }
  if (provider === 'gemini' && !(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    throw new Error('Set GEMINI_API_KEY or GOOGLE_API_KEY before running automated Gemini review.');
  }
  if (provider === 'openai-compatible' && (!process.env.REVIEW_OPENAI_COMPATIBLE_BASE_URL || !process.env.REVIEW_OPENAI_COMPATIBLE_API_KEY)) {
    throw new Error('Set REVIEW_OPENAI_COMPATIBLE_BASE_URL and REVIEW_OPENAI_COMPATIBLE_API_KEY before live review.');
  }
}

async function resolveTechnologies() {
  if (technologyArg !== 'all') return technologyArg.split(',').map((technology) => technology.trim()).filter(Boolean);
  const manifest = JSON.parse(await readFile('apps/web/data/evidence-packets/manifest.json', 'utf8'));
  return Object.keys(manifest.technologies ?? {}).sort();
}

requireLiveConfiguration();

console.log(JSON.stringify({
  mode: dryRun ? 'dry-run' : 'write',
  provider,
  technology: technologyArg,
  onlyStatus,
  limit,
  offset,
  concurrency,
  batchSize,
  maxRetries,
  requestDelayMs,
  quotaPauseMs,
  import: shouldImport,
  importOnlyVerified,
  test: shouldTest,
  compact,
}, null, 2));

run('npm', ['run', 'export:evidence-packets']);
if (compact) {
  run('npm', ['run', 'triage:benchmarks']);
  run('npm', ['run', 'export:rereview-packets', '--', `--technology=${technologyArg}`, `--only-status=${onlyStatus}`, `--limit=${limit}`, `--offset=${offset}`]);
}

const technologies = await resolveTechnologies();
const reviewOutputNames = [];

for (const technology of technologies) {
  const reviewOutputName = `${technology}-${provider}-automated-${timestamp}.reviewed.jsonl`;
  const reviewArgs = [
    'run',
    'review:benchmarks',
    '--',
    `--provider=${provider}`,
    `--technology=${technology}`,
    `--only-status=${onlyStatus}`,
    `--limit=${limit}`,
    `--concurrency=${concurrency}`,
    `--batch-size=${batchSize}`,
    `--max-retries=${maxRetries}`,
    `--request-delay-ms=${requestDelayMs}`,
    `--quota-pause-ms=${quotaPauseMs}`,
  ];
  if (compact) reviewArgs.push('--packet-dir=apps/web/data/evidence-packets-compact');
  if (!compact) reviewArgs.push(`--offset=${offset}`);

  if (dryRun) {
    reviewArgs.push('--dry-run');
  } else {
    reviewArgs.push(`--output-name=${reviewOutputName}`);
    reviewOutputNames.push(reviewOutputName);
  }

  run('npm', reviewArgs, {
    env: {
      ...process.env,
      REVIEW_PROVIDER: provider,
    },
  });
}

if (shouldImport) {
  const importArgs = ['run', 'import:benchmark-reviews', '--'];
  if (!dryRun) {
    for (const reviewOutputName of reviewOutputNames) {
      importArgs.push(`--review-file=${reviewOutputName}`);
    }
  }
  if (importOnlyVerified) importArgs.push('--only-final-status=ai-evidence-verified');
  run('npm', [...importArgs, '--dry-run']);
  if (!dryRun) run('npm', importArgs);
}

run('npm', ['run', 'validate:benchmarks']);

if (shouldTest) {
  run('npm', ['run', 'test:web']);
}

console.log(JSON.stringify({
  completed: true,
  provider,
  technologies,
  next: dryRun
    ? 'Dry-run complete. Set API key/model environment variables and run without --dry-run to execute live review.'
    : 'Live review complete. Check disputed/rejected records, remediate, and rerun this command for those technologies.',
}, null, 2));
