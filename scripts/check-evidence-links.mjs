import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

const args = process.argv.slice(2);
const offline = args.includes('--offline');
const failOnBroken = args.includes('--fail-on-broken');
const hashContent = args.includes('--hash-content');
const concurrency = Math.max(1, Number.parseInt(args.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1] ?? '8', 10));
const timeoutMs = Math.max(1_000, Number.parseInt(args.find((arg) => arg.startsWith('--timeout-ms='))?.split('=')[1] ?? '15000', 10));
const outputDirectory = resolve('apps/web/data/evidence-link-health');

function validHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function fetchEvidence(url) {
  const headers = { 'User-Agent': 'MockInterviewApp-EvidenceHealth/1.0' };
  let response = await fetch(url, { method: 'HEAD', headers, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if ([403, 405].includes(response.status) || (hashContent && response.ok)) {
    response = await fetch(url, { method: 'GET', headers, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  }
  let contentHash = null;
  if (hashContent && response.ok) {
    const body = await response.arrayBuffer();
    contentHash = createHash('sha256').update(Buffer.from(body)).digest('hex');
  }
  return {
    status: response.status,
    ok: response.ok,
    finalUrl: response.url,
    contentHash,
  };
}

const references = new Map();
for (const packPath of packs) {
  const questions = JSON.parse(await readFile(packPath, 'utf8'));
  for (const question of questions) {
    const urls = new Set([
      question.source?.url,
      ...(question.benchmark?.evidence ?? []).map((evidence) => evidence.url),
    ].filter(Boolean));
    for (const url of urls) {
      const entry = references.get(url) ?? { url, questionIds: [] };
      entry.questionIds.push(question.id);
      references.set(url, entry);
    }
  }
}

const entries = [...references.values()].sort((left, right) => left.url.localeCompare(right.url));
let nextIndex = 0;
async function checkNext() {
  while (nextIndex < entries.length) {
    const entry = entries[nextIndex];
    nextIndex += 1;
    if (!validHttpUrl(entry.url)) {
      Object.assign(entry, { state: 'broken', error: 'invalid-http-url' });
      continue;
    }
    if (offline) {
      Object.assign(entry, { state: 'unchecked', error: null });
      continue;
    }
    try {
      const result = await fetchEvidence(entry.url);
      Object.assign(entry, {
        state: result.ok ? 'healthy' : 'broken',
        status: result.status,
        finalUrl: result.finalUrl,
        contentHash: result.contentHash,
        error: result.ok ? null : `http-${result.status}`,
      });
    } catch (error) {
      Object.assign(entry, { state: 'broken', error: error instanceof Error ? error.message : String(error) });
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => checkNext()));

const summary = {
  checkedAt: new Date().toISOString(),
  mode: offline ? 'offline-structure-only' : 'live',
  uniqueUrls: entries.length,
  healthy: entries.filter((entry) => entry.state === 'healthy').length,
  broken: entries.filter((entry) => entry.state === 'broken').length,
  unchecked: entries.filter((entry) => entry.state === 'unchecked').length,
  hashContent,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'latest.json'), `${JSON.stringify({ summary, entries }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));

if (failOnBroken && summary.broken > 0) process.exit(1);
