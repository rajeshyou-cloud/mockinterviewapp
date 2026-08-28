import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const technology = args.find((arg) => arg.startsWith('--technology='))?.split('=')[1];
const paths = args.filter((arg) => !arg.startsWith('--technology='));
const exportPath = paths.pop();
const sourcePaths = paths;
if (sourcePaths.length === 0 || !exportPath) {
  console.error('Usage: node scripts/verify-governed-export.mjs <source.json> [source.json ...] <export.json>');
  process.exit(1);
}

const byId = (records) => [...records].sort((a, b) => a.id.localeCompare(b.id));
const allSource = (await Promise.all(sourcePaths.map(async (sourcePath) => JSON.parse(await readFile(sourcePath, 'utf8'))))).flat();
const source = technology ? allSource.filter((question) => question.technology === technology) : allSource;
const exported = JSON.parse(await readFile(exportPath, 'utf8'));
assert.deepEqual(byId(exported), byId(source));
console.log(JSON.stringify({ matches: true, questions: source.length, technology: technology ?? null, sourcePaths, exportPath }, null, 2));
