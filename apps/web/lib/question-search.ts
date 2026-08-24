import type { Difficulty, InterviewQuestion, Technology } from './api';

export const QUESTION_PAGE_SIZE = 20;

export type QuestionFilters = {
  query?: string;
  technology?: Technology;
  difficulty?: Difficulty;
  type?: string;
  topic?: string;
  page?: number;
};

export function filterQuestions(questions: InterviewQuestion[], filters: QuestionFilters) {
  const query = filters.query?.trim().toLowerCase();
  return questions.filter((question) => {
    if (filters.technology && question.technology !== filters.technology) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.type && question.type !== filters.type) return false;
    if (filters.topic && question.topic !== filters.topic) return false;
    if (!query) return true;
    return [
      question.question,
      question.topic,
      question.benchmark.canonicalAnswer,
      question.benchmark.expandedExplanation,
      question.benchmark.reasoning,
      ...question.benchmark.requiredConcepts,
      ...question.benchmark.optionalConcepts,
      ...question.benchmark.acceptedAlternatives.flatMap((alternative) => alternative.terms),
    ].some((value) => value.toLowerCase().includes(query));
  });
}

export function paginateQuestions(questions: InterviewQuestion[], requestedPage = 1, pageSize = QUESTION_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(questions.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, items: questions.slice(start, start + pageSize) };
}
