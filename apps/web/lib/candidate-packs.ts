import type { InterviewQuestion } from './api';

import aws from '../data/candidates/aws.json';
import databricks from '../data/candidates/databricks.json';
import oracle from '../data/candidates/oracle.json';
import powerBi from '../data/candidates/power-bi.json';
import python from '../data/candidates/python.json';

export const candidatePacks = {
  databricks: databricks as InterviewQuestion[],
  oracle: oracle as InterviewQuestion[],
  'power-bi': powerBi as InterviewQuestion[],
  python: python as InterviewQuestion[],
  aws: aws as InterviewQuestion[],
} as const;

export const candidatePackLabels = {
  databricks: 'Databricks',
  oracle: 'Oracle Database',
  'power-bi': 'Power BI',
  python: 'Python',
  aws: 'AWS',
} as const;

export type CandidateCourse = keyof typeof candidatePacks;

// Content readiness comes from evidence-grounded AI consensus. Production
// exposure remains a separate, explicit operational decision so that a newly
// verified pack cannot launch merely because its last review finished.
export const launchedCandidateCourses: readonly CandidateCourse[] = [];

export function isCandidateCourse(value: string): value is CandidateCourse {
  return value in candidatePacks;
}
