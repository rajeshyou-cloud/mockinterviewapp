import type { InterviewQuestion } from './api';

import beginnerQuestions from '../data/beginner.json';
import awsQuestions from '../data/candidates/aws.json';
import databricksQuestions from '../data/candidates/databricks.json';
import oracleQuestions from '../data/candidates/oracle.json';
import powerBiQuestions from '../data/candidates/power-bi.json';
import pythonQuestions from '../data/candidates/python.json';
import expandedQuestions from '../data/expanded.json';
import generatedQuestions from '../data/generated.json';
import starterQuestions from '../data/starter.json';

export const questionBank: InterviewQuestion[] = [
  ...beginnerQuestions,
  ...starterQuestions,
  ...expandedQuestions,
  ...generatedQuestions,
] as InterviewQuestion[];

export const candidateQuestionBank: InterviewQuestion[] = [
  ...databricksQuestions,
  ...oracleQuestions,
  ...powerBiQuestions,
  ...pythonQuestions,
  ...awsQuestions,
] as InterviewQuestion[];

export const allQuestionBank = [...questionBank, ...candidateQuestionBank];

const questionsById = new Map(allQuestionBank.map((question) => [question.id, question]));

export function findQuestion(id: string) {
  return questionsById.get(id);
}
