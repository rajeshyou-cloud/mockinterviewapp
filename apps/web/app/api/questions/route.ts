import { NextRequest, NextResponse } from 'next/server';

import beginnerQuestions from '../../../data/beginner.json';
import expandedQuestions from '../../../data/expanded.json';
import starterQuestions from '../../../data/starter.json';

const questions = [...beginnerQuestions, ...starterQuestions, ...expandedQuestions];

export async function GET(request: NextRequest) {
  const technology = request.nextUrl.searchParams.get('technology');
  const difficulty = request.nextUrl.searchParams.get('difficulty');

  const filtered = questions.filter((question) => {
    if (technology && question.technology !== technology) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    return true;
  });

  return NextResponse.json(filtered);
}
