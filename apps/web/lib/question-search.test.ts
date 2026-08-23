import { describe, expect, it } from 'vitest';

import { questionBank } from './question-bank';
import { filterQuestions, paginateQuestions } from './question-search';

describe('question bank search', () => {
  it('filters across course, difficulty, topic, type, and searchable content', () => {
    const result = filterQuestions(questionBank, {
      technology: 'snowflake',
      difficulty: 'advanced',
      type: 'troubleshooting',
      query: 'recovery',
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((question) => question.technology === 'snowflake')).toBe(true);
    expect(result.every((question) => question.difficulty === 'advanced')).toBe(true);
    expect(result.every((question) => question.type === 'troubleshooting')).toBe(true);
  });

  it('paginates safely and clamps invalid page numbers', () => {
    const first = paginateQuestions(questionBank, -10);
    const last = paginateQuestions(questionBank, 999);

    expect(first.page).toBe(1);
    expect(first.items).toHaveLength(20);
    expect(last.page).toBe(15);
    expect(last.items).toHaveLength(20);
  });
});
