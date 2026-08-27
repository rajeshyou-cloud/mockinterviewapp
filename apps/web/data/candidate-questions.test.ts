import { describe, expect, it } from 'vitest';

import aws from './candidates/aws.json';
import databricks from './candidates/databricks.json';
import oracle from './candidates/oracle.json';
import powerBi from './candidates/power-bi.json';
import python from './candidates/python.json';

const packs = { aws, databricks, oracle, 'power-bi': powerBi, python };
const benchmarkReviewStatuses = ['draft', 'ai-evidence-verified', 'human-verified', 'disputed', 'rejected', 'stale'];

describe('candidate course question packs', () => {
  it.each(Object.entries(packs))('%s has 150 complete, traceable questions', (technology, questions) => {
    expect(questions).toHaveLength(150);
    expect(new Set(questions.map((question) => question.id)).size).toBe(150);
    expect(new Set(questions.map((question) => question.question)).size).toBe(150);

    for (const question of questions) {
      expect(question.technology).toBe(technology);
      expect(question.question.length).toBeGreaterThanOrEqual(20);
      expect(question.canonicalAnswer.length).toBeGreaterThanOrEqual(100);
      expect(question.expectedConcepts).toHaveLength(5);
      expect(question.followUps).toHaveLength(2);
      expect(question.benchmark.version).toBe('1.0.0');
      expect(question.benchmark.canonicalAnswer).toBe(question.canonicalAnswer);
      expect(question.benchmark.requiredConcepts).toEqual(question.expectedConcepts);
      expect(question.benchmark.optionalConcepts.length).toBeGreaterThan(0);
      expect(question.benchmark.acceptedAlternatives).toHaveLength(question.expectedConcepts.length);
      expect(question.benchmark.evidence.length).toBeGreaterThanOrEqual(1);
      expect(question.benchmark.evidence.some((item) => item.url === question.source.url)).toBe(true);
      for (const evidence of question.benchmark.evidence) {
        expect(evidence.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      }
      expect(question.benchmark.scoringAnchors.incorrect.length).toBeGreaterThan(20);
      expect(benchmarkReviewStatuses).toContain(question.benchmark.review.status);
      expect(question.source.url).toMatch(/^https:\/\//);
      expect(question.source.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(question.reviewStatus).toBe('ai-reviewed');
    }
  });

  it.each(Object.entries(packs))('%s balances all three difficulty levels', (_technology, questions) => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced']) {
      expect(questions.filter((question) => question.difficulty === difficulty)).toHaveLength(50);
    }
  });

  it('uses only official documentation hosts', () => {
    for (const question of databricks) {
      expect(new URL(question.source.url).hostname).toBe('docs.databricks.com');
    }
    for (const question of powerBi) {
      expect(new URL(question.source.url).hostname).toBe('learn.microsoft.com');
    }
    for (const question of oracle) {
      expect(new URL(question.source.url).hostname).toBe('docs.oracle.com');
    }
    for (const question of python) {
      expect(['docs.python.org', 'packaging.python.org']).toContain(new URL(question.source.url).hostname);
    }
    for (const question of aws) {
      expect(new URL(question.source.url).hostname).toBe('docs.aws.amazon.com');
    }
  });

  it('keeps all 750 candidate IDs and question texts globally unique', () => {
    const questions = Object.values(packs).flat();
    expect(questions).toHaveLength(750);
    expect(new Set(questions.map((question) => question.id))).toHaveLength(750);
    expect(new Set(questions.map((question) => question.question))).toHaveLength(750);
    expect(new Set(questions.map((question) => `${question.id}:${question.benchmark.version}`))).toHaveLength(750);
  });
});
