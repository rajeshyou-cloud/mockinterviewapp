import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const packetPath = args.find((arg) => arg.startsWith('--packet='))?.split('=')[1] ?? 'apps/web/data/evidence-packets-compact/databricks.jsonl';
const allowedStatusArg = args.find((arg) => arg.startsWith('--allowed-status='))?.split('=')[1] ?? 'draft';
const allowedStatuses = new Set(allowedStatusArg.split(',').map((status) => status.trim()).filter(Boolean));
const maxRecordsArg = args.find((arg) => arg.startsWith('--max-records='))?.split('=')[1];
const maxRecords = maxRecordsArg ? Number.parseInt(maxRecordsArg, 10) : null;

const raw = await readFile(packetPath, 'utf8');
const records = raw.trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`Invalid JSONL at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const statusCounts = {};
const violations = [];
const seen = new Set();
const duplicates = [];

for (const record of records) {
  const status = record.currentReviewStatus;
  statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  if (!allowedStatuses.has(status)) {
    violations.push({ questionId: record.questionId, currentReviewStatus: status });
  }
  if (seen.has(record.questionId)) duplicates.push(record.questionId);
  seen.add(record.questionId);
}

const summary = {
  packetPath,
  records: records.length,
  allowedStatuses: [...allowedStatuses],
  statusCounts,
  duplicateQuestionIds: [...new Set(duplicates)],
  invalidStatusRecords: violations,
};

if (maxRecords !== null && records.length > maxRecords) {
  console.error(JSON.stringify({ ...summary, error: `Packet has ${records.length} records, above max ${maxRecords}` }, null, 2));
  process.exit(1);
}

if (duplicates.length > 0 || violations.length > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
