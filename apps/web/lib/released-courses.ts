import 'server-only';

import { availableTechnologyIds, courseCatalog, isKnownTechnology, type Technology } from './course-catalog';
import { listApprovedCourseIds } from './db';

export async function getReleasedCourseIds(): Promise<Technology[]> {
  const approved = (await listApprovedCourseIds()).filter(isKnownTechnology);
  return [...new Set<Technology>([...availableTechnologyIds, ...approved])];
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
