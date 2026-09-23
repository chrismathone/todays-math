import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";

import type { CourseChapter, CourseGrade, CourseSection } from "./types";

/** The existing curriculum is the single source of names, order, and coverage. */
export const COURSE_SECTIONS: CourseSection[] = CURRICULUM_UNITS.filter(
  (unit) => /^초[3-6]$/.test(unit.grade),
).map((unit) => {
  const grade = Number(unit.grade.slice(1)) as CourseGrade;
  const [sectionCode, ...sectionTitle] = unit.section.split(" ");
  const [chapterCode, ...chapterTitle] = unit.chapter.split(" ");
  const semester = Number(chapterCode.split("-")[0]);
  if (
    !/^[12]-\d+-\d+$/.test(sectionCode) ||
    !/^[12]-\d+$/.test(chapterCode) ||
    !sectionCode.startsWith(`${chapterCode}-`) ||
    (semester !== 1 && semester !== 2)
  ) {
    throw new Error(`초등 교육과정 코드를 확인해 주세요: ${unit.section}`);
  }
  return {
    id: `${grade}-${sectionCode}`,
    grade,
    semester,
    chapterId: `${grade}-${chapterCode}`,
    chapterTitle: chapterTitle.join(" "),
    title: sectionTitle.join(" "),
    order: unit.orderIndex,
    unit,
  };
});

export const COURSE_CHAPTERS: CourseChapter[] = [];
const sectionsById = new Map<string, CourseSection>();
const chaptersById = new Map<string, CourseChapter>();
for (const section of COURSE_SECTIONS) {
  if (sectionsById.has(section.id)) {
    throw new Error(`중복된 초등 소단원 코드입니다: ${section.id}`);
  }
  sectionsById.set(section.id, section);
  let chapter = chaptersById.get(section.chapterId);
  if (!chapter) {
    chapter = {
      id: section.chapterId,
      grade: section.grade,
      semester: section.semester,
      number: Number(section.chapterId.split("-")[2]),
      title: section.chapterTitle,
      sections: [],
    };
    chaptersById.set(chapter.id, chapter);
    COURSE_CHAPTERS.push(chapter);
  }
  chapter.sections.push(section);
}

export function getCourseSection(id: string): CourseSection | undefined {
  return sectionsById.get(id);
}

/** Continues across chapters, semesters, and grades; the last section has no next. */
export function getNextCourseSection(id: string): CourseSection | undefined {
  const index = COURSE_SECTIONS.findIndex((section) => section.id === id);
  return index < 0 ? undefined : COURSE_SECTIONS[index + 1];
}
