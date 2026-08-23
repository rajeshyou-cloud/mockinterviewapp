import { NextResponse } from 'next/server';

import { getReleasedCourses } from '../../../lib/released-courses';

export async function GET() {
  return NextResponse.json(await getReleasedCourses());
}
