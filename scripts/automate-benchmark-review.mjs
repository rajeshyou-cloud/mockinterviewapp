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
const shouldTest = args.includes('--test');
const compact = args.includes('--compact');
const provider = args.find((arg) => arg.startsWith('--provider='))?.split('=')[1] ?? process.env.REVIEW_PROVIDER ?? 'openai';
const technologyArg = args.find((arg) => arg.startsWith('--technology='))?.split('=')[1] ?? 'all';
const onlyStatus = args.find((arg) => arg.startsWith('--only-status='))?.split('=')[1] ?? 'draft,disputed';
const limit = args.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 'all';
const concurrency = args.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1] ?? '2';
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
  concurrency,
  import: shouldImport,
  test: shouldTest,
  compact,
}, null, 2));

run('npm', ['run', 'export:evidence-packets']);
if (compact) {
  run('npm', ['run', 'triage:benchmarks']);
  run('npm', ['run', 'export:rereview-packets', '--', `--technology=${technologyArg}`, `--only-status=${onlyStatus}`, `--limit=${limit}`]);
}

const technologies = await resolveTechnologies();

for (const technology of technologies) {
  const reviewArgs = [
    'run',
    'review:benchmarks',
    '--',
    `--provider=${provider}`,
    `--technology=${technology}`,
    `--only-status=${onlyStatus}`,
    `--limit=${limit}`,
    `--concurrency=${concurrency}`,
  ];
  if (compact) reviewArgs.push('--packet-dir=apps/web/data/evidence-packets-compact');

  if (dryRun) {
    reviewArgs.push('--dry-run');
  } else {
    reviewArgs.push(`--output-name=${technology}-${provider}-automated-${timestamp}.reviewed.jsonl`);
  }

  run('npm', reviewArgs, {
    env: {
      ...process.env,
      REVIEW_PROVIDER: provider,
    },
  });
}

if (shouldImport) {
  run('npm', ['run', 'import:benchmark-reviews', '--', '--dry-run']);
  if (!dryRun) run('npm', ['run', 'import:benchmark-reviews']);
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
