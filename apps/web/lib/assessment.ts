import type { InterviewQuestion } from './api';
import type { InterviewSession } from './session';

export type TopicSummary = {
  topic: string;
  answered: number;
  total: number;
  averageScore: number;
  status: 'strong' | 'developing' | 'gap';
};

export type AssessmentSummary = {
  averageScore: number;
  answered: number;
  total: number;
  strongestTopics: TopicSummary[];
  gapTopics: TopicSummary[];
  topics: TopicSummary[];
};

function statusFor(score: number): TopicSummary['status'] {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'developing';
  return 'gap';
}

export function buildAssessmentSummary(
  questions: InterviewQuestion[],
  session: InterviewSession | null,
): AssessmentSummary {
  const answers = session?.answers ?? [];
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const topicMap = new Map<string, { scores: number[]; total: number }>();

  for (const question of questions) {
    const current = topicMap.get(question.topic) ?? { scores: [], total: 0 };
    current.total += 1;
    const answer = answerByQuestion.get(question.id);
    if (answer) current.scores.push(answer.score.score);
    topicMap.set(question.topic, current);
  }

  const topics = [...topicMap.entries()]
    .map(([topic, values]) => {
      const averageScore = values.scores.length
        ? Math.round(values.scores.reduce((sum, score) => sum + score, 0) / values.scores.length)
        : 0;
      return {
        topic,
        answered: values.scores.length,
        total: values.total,
        averageScore,
        status: statusFor(averageScore),
      } satisfies TopicSummary;
    })
    .sort((a, b) => a.averageScore - b.averageScore || a.topic.localeCompare(b.topic));

  const answeredScores = answers.map((answer) => answer.score.score);
  const averageScore = answeredScores.length
    ? Math.round(answeredScores.reduce((sum, score) => sum + score, 0) / answeredScores.length)
    : 0;

  return {
    averageScore,
    answered: answers.length,
    total: questions.length,
    strongestTopics: topics.filter((topic) => topic.status === 'strong').slice(-3).reverse(),
    gapTopics: topics.filter((topic) => topic.status !== 'strong').slice(0, 3),
    topics,
  };
}
