import type { InterviewQuestion, QuestionBenchmark } from './api';

export const verifiedBenchmarkStatuses = ['ai-evidence-verified', 'human-verified'] as const;
export type VerifiedBenchmarkStatus = (typeof verifiedBenchmarkStatuses)[number];

export type BenchmarkReviewSummary = {
  total: number;
  verified: number;
  draft: number;
  reviewing: number;
  disputed: number;
  stale: number;
  rejected: number;
  publishable: boolean;
};

export function isBenchmarkVerified(benchmark: QuestionBenchmark) {
  return (verifiedBenchmarkStatuses as readonly string[]).includes(benchmark.review.status);
}

export function summarizeBenchmarkReviews(questions: readonly InterviewQuestion[]): BenchmarkReviewSummary {
  const summary: BenchmarkReviewSummary = {
    total: questions.length,
    verified: 0,
    draft: 0,
    reviewing: 0,
    disputed: 0,
    stale: 0,
    rejected: 0,
    publishable: false,
  };

  for (const question of questions) {
    const status = question.benchmark.review.status;
    if (status === 'ai-evidence-verified' || status === 'human-verified') summary.verified += 1;
    else if (status in summary && typeof summary[status] === 'number') summary[status] += 1;
  }

  summary.publishable = summary.total > 0 && summary.verified === summary.total;
  return summary;
}
