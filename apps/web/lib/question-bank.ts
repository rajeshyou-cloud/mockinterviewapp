import type { InterviewQuestion } from './api';

import beginnerQuestions from '../data/beginner.json';
import expandedQuestions from '../data/expanded.json';
import generatedQuestions from '../data/generated.json';
import starterQuestions from '../data/starter.json';

export const questionBank: InterviewQuestion[] = [
  ...beginnerQuestions,
  ...starterQuestions,
  ...expandedQuestions,
  ...generatedQuestions,
] as InterviewQuestion[];

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

export function findQuestion(id: string) {
  return questionsById.get(id);
}
