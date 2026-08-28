import 'server-only';

import type { InterviewQuestion } from './api';
import { getGovernedQuestionSnapshot, listGovernedQuestionSnapshots } from './db';
import { allQuestionBank, findQuestion } from './question-bank';

export type GovernedContentMode = 'json' | 'shadow' | 'database';

export class ContentRepositoryUnavailableError extends Error {
  constructor() {
    super('Governed content database is unavailable');
    this.name = 'ContentRepositoryUnavailableError';
  }
}

export function getGovernedContentMode(): GovernedContentMode {
  const configured = process.env.GOVERNED_CONTENT_SOURCE;
  return configured === 'shadow' || configured === 'database' ? configured : 'json';
}

function isInterviewQuestion(value: unknown): value is InterviewQuestion {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<InterviewQuestion>;
  return typeof question.id === 'string'
    && typeof question.technology === 'string'
    && typeof question.question === 'string'
    && Boolean(question.benchmark?.version);
}

function isVerified(question: InterviewQuestion) {
  return ['ai-evidence-verified', 'human-verified'].includes(question.benchmark.review.status);
}

function safeSnapshots(values: unknown[]) {
  return values.filter(isInterviewQuestion);
}

export type ContentParityReport = {
  matches: boolean;
  expectedCount: number;
  actualCount: number;
  missingIds: string[];
  unexpectedIds: string[];
  changedIds: string[];
};

function paritySignature(question: InterviewQuestion) {
  return JSON.stringify({
    id: question.id,
    technology: question.technology,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    question: question.question,
    version: question.version,
    benchmarkVersion: question.benchmark.version,
    benchmarkStatus: question.benchmark.review.status,
    evidence: question.benchmark.evidence.map((item) => [item.url, item.contentHash]),
  });
}

export function compareQuestionParity(expected: InterviewQuestion[], actual: InterviewQuestion[]): ContentParityReport {
  const expectedById = new Map(expected.map((question) => [question.id, question]));
  const actualById = new Map(actual.map((question) => [question.id, question]));
  const missingIds = [...expectedById.keys()].filter((id) => !actualById.has(id));
  const unexpectedIds = [...actualById.keys()].filter((id) => !expectedById.has(id));
  const changedIds = [...expectedById.keys()].filter((id) => {
    const actualQuestion = actualById.get(id);
    return actualQuestion && paritySignature(expectedById.get(id)!) !== paritySignature(actualQuestion);
  });
  return {
    matches: missingIds.length === 0 && unexpectedIds.length === 0 && changedIds.length === 0,
    expectedCount: expected.length,
    actualCount: actual.length,
    missingIds,
    unexpectedIds,
    changedIds,
  };
}

function jsonQuestions(technologyIds: string[]) {
  const released = new Set(technologyIds);
  return allQuestionBank.filter((question) => released.has(question.technology));
}

function logShadowMismatch(report: ContentParityReport) {
  if (report.matches) return;
  console.error('Governed content shadow parity mismatch.', {
    expectedCount: report.expectedCount,
    actualCount: report.actualCount,
    missingIds: report.missingIds.slice(0, 10),
    unexpectedIds: report.unexpectedIds.slice(0, 10),
    changedIds: report.changedIds.slice(0, 10),
  });
}

export async function listCandidateQuestions(technologyIds: string[]) {
  const mode = getGovernedContentMode();
  const json = jsonQuestions(technologyIds);
  if (mode === 'json') return json;

  let databaseValues: unknown[] | null;
  try {
    databaseValues = await listGovernedQuestionSnapshots({
      technologyIds,
      includeUnpublished: mode === 'shadow',
    });
  } catch {
    if (mode === 'shadow') {
      console.error('Governed content shadow read unavailable; serving JSON.');
      return json;
    }
    throw new ContentRepositoryUnavailableError();
  }
  if (databaseValues === null) {
    if (mode === 'shadow') {
      console.error('Governed content shadow read unavailable; serving JSON.');
      return json;
    }
    throw new ContentRepositoryUnavailableError();
  }
  const database = safeSnapshots(databaseValues);

  if (mode === 'shadow') {
    logShadowMismatch(compareQuestionParity(json, database));
    return json;
  }
  return database.filter(isVerified);
}

export async function getCandidateQuestion(id: string) {
  const mode = getGovernedContentMode();
  const json = findQuestion(id);
  if (mode === 'json') return json;

  let databaseValue: unknown | null;
  try {
    databaseValue = await getGovernedQuestionSnapshot(id, { includeUnpublished: mode === 'shadow' });
  } catch {
    if (mode === 'shadow') {
      console.error('Governed content shadow read unavailable; serving JSON.');
      return json;
    }
    throw new ContentRepositoryUnavailableError();
  }
  if (databaseValue === null) {
    if (mode === 'shadow') {
      console.error('Governed content shadow read unavailable; serving JSON.');
      return json;
    }
    throw new ContentRepositoryUnavailableError();
  }
  const database = isInterviewQuestion(databaseValue) && isVerified(databaseValue) ? databaseValue : undefined;
  if (mode === 'shadow') {
    logShadowMismatch(compareQuestionParity(json ? [json] : [], database ? [database] : []));
    return json;
  }
  return database;
}
