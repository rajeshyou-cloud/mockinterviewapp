import { applyImportModel, buildImportModel, loadContentPacks } from './lib/governed-content-import.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const technologyArg = args.find((arg) => arg.startsWith('--technology='));
const technology = technologyArg?.split('=')[1];

if (args.includes('--help')) {
  console.log('Usage: npm run import:governed-content -- [--dry-run] [--technology=<id>] [--apply]');
  process.exit(0);
}

const model = buildImportModel(await loadContentPacks(), technology);
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...model.summary }, null, 2));

if (!apply) process.exit(0);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required with --apply. Dry-run mode never connects to a database.');
  process.exit(1);
}

const reconciliation = await applyImportModel(model, process.env.DATABASE_URL);
console.log(JSON.stringify({ reconciliation }, null, 2));
if (!reconciliation.matches) process.exit(1);
