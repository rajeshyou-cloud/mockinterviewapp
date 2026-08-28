import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const outputArg = process.argv.slice(2).find((arg) => arg.startsWith('--output-dir='));
const outputDir = path.resolve(outputArg?.split('=')[1] ?? 'apps/web/data/governed-exports');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to export governed content.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT DISTINCT ON (q.technology_id, q.id)
    q.technology_id,
    q.id,
    v.snapshot
  FROM questions q
  JOIN question_versions v ON v.question_id = q.id
  ORDER BY q.technology_id, q.id, v.created_at DESC
`;

const byTechnology = new Map();
for (const row of rows) {
  if (!byTechnology.has(row.technology_id)) byTechnology.set(row.technology_id, []);
  byTechnology.get(row.technology_id).push(row.snapshot);
}

await mkdir(outputDir, { recursive: true });
const manifest = { exportedAt: new Date().toISOString(), totalQuestions: rows.length, technologies: {} };
for (const [technology, questions] of [...byTechnology].sort(([a], [b]) => a.localeCompare(b))) {
  const file = `${technology}.json`;
  await writeFile(path.join(outputDir, file), `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
  manifest.technologies[technology] = { count: questions.length, path: file };
}
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
