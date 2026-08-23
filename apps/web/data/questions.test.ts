import { describe, expect, it } from 'vitest';

import beginner from './beginner.json';
import expanded from './expanded.json';
import generated from './generated.json';
import starter from './starter.json';

const questions = [...beginner, ...starter, ...expanded, ...generated];

describe('web question bank', () => {
  it('keeps stable ids unique and every question traceable', () => {
    const ids = questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(questions.map((question) => question.question)).size).toBe(questions.length);

    for (const question of questions) {
      expect(question.question.length).toBeGreaterThanOrEqual(10);
      expect(question.canonicalAnswer.length).toBeGreaterThanOrEqual(20);
      expect(question.expectedConcepts.length).toBeGreaterThan(0);
      expect(question.source.url).toMatch(/^https:\/\//);
      expect(new URL(question.source.url).hostname).toMatch(/^docs\.(snowflake|informatica)\.com$/);
      expect(question.source.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(question.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('retains coverage for every technology and difficulty', () => {
    for (const technology of ['snowflake', 'informatica']) {
      for (const difficulty of ['beginner', 'intermediate', 'advanced']) {
        expect(questions.filter((question) => question.technology === technology && question.difficulty === difficulty).length)
          .toBeGreaterThanOrEqual(40);
      }
    }
  });

  it('contains the complete 300-question reviewed bank', () => {
    expect(questions).toHaveLength(300);
    expect(questions.every((question) => question.reviewStatus === 'ai-reviewed')).toBe(true);
  });
});
