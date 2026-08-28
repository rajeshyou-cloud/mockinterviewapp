import 'server-only';

import { summarizeBenchmarkReviews } from './benchmark-review';
import { candidatePacks, isCandidateCourse, launchedCandidateCourses } from './candidate-packs';
import { availableTechnologyIds, courseCatalog, isKnownTechnology, type Technology } from './course-catalog';

export function isCandidateCourseAiVerified(courseId: string) {
  return isCandidateCourse(courseId) && summarizeBenchmarkReviews(candidatePacks[courseId]).publishable;
}

export async function getReleasedCourseIds(): Promise<Technology[]> {
  const launched = launchedCandidateCourses
    .filter(isKnownTechnology)
    .filter(isCandidateCourseAiVerified);
  return [...new Set<Technology>([...availableTechnologyIds, ...launched])];
}

export async function getReleasedCourses() {
  const released = new Set(await getReleasedCourseIds());
  return courseCatalog
    .filter((course) => released.has(course.id))
    .map((course) => ({ ...course, status: 'available' as const }));
}

export async function isReleasedTechnology(value: string): Promise<boolean> {
  if (!isKnownTechnology(value)) return false;
  return (await getReleasedCourseIds()).includes(value);
}
