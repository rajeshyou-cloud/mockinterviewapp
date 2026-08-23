export const availableTechnologyIds = ['snowflake', 'informatica'] as const;

export type Technology = (typeof availableTechnologyIds)[number];
export type CourseId = Technology | 'databricks' | 'oracle' | 'power-bi' | 'python' | 'aws';

export type CourseDefinition = {
  id: CourseId;
  label: string;
  status: 'available' | 'planned';
  initialQuestionTarget: number;
  documentationOwner: string;
};

export const courseCatalog: readonly CourseDefinition[] = [
  { id: 'snowflake', label: 'Snowflake', status: 'available', initialQuestionTarget: 150, documentationOwner: 'Snowflake' },
  { id: 'informatica', label: 'Informatica', status: 'available', initialQuestionTarget: 150, documentationOwner: 'Informatica' },
  { id: 'databricks', label: 'Databricks', status: 'planned', initialQuestionTarget: 150, documentationOwner: 'Databricks' },
  { id: 'oracle', label: 'Oracle Database', status: 'planned', initialQuestionTarget: 150, documentationOwner: 'Oracle' },
  { id: 'power-bi', label: 'Power BI', status: 'planned', initialQuestionTarget: 150, documentationOwner: 'Microsoft' },
  { id: 'python', label: 'Python', status: 'planned', initialQuestionTarget: 150, documentationOwner: 'Python Software Foundation' },
  { id: 'aws', label: 'AWS', status: 'planned', initialQuestionTarget: 150, documentationOwner: 'Amazon Web Services' },
] as const;

export const availableCourses = courseCatalog.filter(
  (course): course is CourseDefinition & { id: Technology; status: 'available' } => course.status === 'available',
);

export function isAvailableTechnology(value: string): value is Technology {
  return (availableTechnologyIds as readonly string[]).includes(value);
}

export function technologyLabel(technology: Technology) {
  return availableCourses.find((course) => course.id === technology)?.label ?? technology;
}
