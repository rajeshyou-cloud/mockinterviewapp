import { z } from 'zod';

import { availableTechnologyIds } from './course-catalog';

export const resumeTokenPattern = /^[0-9a-f]{64}$/i;

export const sessionIdSchema = z.uuid();

export const createSessionSchema = z.object({
  id: sessionIdSchema,
  technology: z.enum(availableTechnologyIds),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  currentIndex: z.number().int().min(0).max(19).optional(),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().min(1).max(160),
  answerText: z.string().trim().min(1).max(12_000),
  score: z.number().finite().min(0).max(100),
  dimensionScores: z.object({
    technical_accuracy: z.number().int().min(0).max(40),
    required_concept_coverage: z.number().int().min(0).max(30),
    reasoning_and_tradeoffs: z.number().int().min(0).max(20),
    relevance_and_clarity: z.number().int().min(0).max(10),
  }).optional(),
  matchedConcepts: z.array(z.string().min(1).max(160)).max(30).optional(),
  missingConcepts: z.array(z.string().min(1).max(160)).max(30).optional(),
  optionalConcepts: z.array(z.string().min(1).max(160)).max(30).optional(),
  incorrectClaims: z.array(z.string().min(1).max(300)).max(30).optional(),
  feedback: z.string().max(500).optional(),
  currentIndex: z.number().int().min(0).max(19).optional(),
  provider: z.string().min(1).max(160).optional(),
  benchmarkVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  scoringPolicyVersion: z.string().min(1).max(80).optional(),
});

export const completeSessionSchema = z.object({
  totalScore: z.number().finite().min(0).max(100),
});

export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
