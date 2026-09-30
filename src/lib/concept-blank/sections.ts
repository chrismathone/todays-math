import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

/**
 * 개념 백지의 학년 → 대단원 → 소단원 나무(D-150). 원천은 교육과정 시드 하나 — 다른 화면과 같은 이름 · 순서다.
 * 열쇠는 `학년::대단원::소단원`(`conceptBlank.contract.ts` 의 sectionKeySchema).
 */
export type BlankSection = {
  key: string;
  grade: string;
  chapter: string;
  title: string;
  order: number;
};

export type BlankChapter = {
  key: string;
  grade: string;
  title: string;
  sections: BlankSection[];
};
export type BlankGrade = { grade: string; chapters: BlankChapter[] };

/** 은행이 채우는 학년 — 교재 용어 목록이 있는 초3~중3. 초1~2 · 고등은 나무에 «준비 중»으로만 보인다. */
export const CONCEPT_BLANK_GRADES = [
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
] as const;

export const sectionKeyOf = (grade: string, chapter: string, section: string) =>
  `${grade}::${chapter}::${section}`;

export const BLANK_SECTIONS: readonly BlankSection[] = CURRICULUM_UNITS.filter(
  (u) => /^(초[1-6]|중[1-3])$/.test(u.grade),
).map((u) => ({
  key: sectionKeyOf(u.grade, u.chapter, u.section),
  grade: u.grade,
  chapter: u.chapter,
  title: u.section,
  order: u.orderIndex,
}));

const byKey = new Map(BLANK_SECTIONS.map((s) => [s.key, s]));
export const getBlankSection = (key: string) => byKey.get(key);

export const BLANK_TREE: readonly BlankGrade[] = (() => {
  const grades: BlankGrade[] = [];
  for (const s of [...BLANK_SECTIONS].sort((a, b) => a.order - b.order)) {
    let g = grades.find((x) => x.grade === s.grade);
    if (!g) grades.push((g = { grade: s.grade, chapters: [] }));
    const chapterKey = `${s.grade}::${s.chapter}`;
    let c = g.chapters.find((x) => x.key === chapterKey);
    if (!c)
      g.chapters.push(
        (c = {
          key: chapterKey,
          grade: s.grade,
          title: s.chapter,
          sections: [],
        }),
      );
    c.sections.push(s);
  }
  return grades;
})();
