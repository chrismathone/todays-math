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

/**
 * 소단원 이름의 수식 — 시드 글(`y=ax^2+bx+c` · `1cm²` · `㎥`)을 KaTeX 꼴로(원장님 2026-10-01 «일부 카텍스 적용 안되어있네»).
 * 시드는 다른 화면도 같은 글로 쓰므로 고치지 않고, 개념 백지가 이름을 지면(`PaperText`) · 화면(나무)에 넘길 때만 바꾼다.
 * 이름 통째로 맞춘다(부분 치환은 `y=ax` 가 `y=ax^2…` 안에서 두 번 감싸인다). ×(곱하기) · ÷ · 괄호 낱말 «(몇십)×(몇)»은 글자로 둔다.
 * 개념 백지 학년의 이름에 날 수식이 남으면 `conceptBlankSectionTitle.test.ts` 가 운다 — 시드에 이름이 늘면 여기에 더한다.
 */
const TITLE_TEX: ReadonlyMap<string, string> = new Map([
  ["이차함수 y=ax^2+bx+c의 그래프", "이차함수 $y=ax^2+bx+c$의 그래프"],
  ["정비례 관계 y=ax의 그래프", "정비례 관계 $y=ax$의 그래프"],
  ["반비례 관계 y=a/x의 그래프", "반비례 관계 $y=\\dfrac{a}{x}$의 그래프"],
  ["1-5-1 1cm보다 작은 단위", "1-5-1 $1\\,\\mathrm{cm}$보다 작은 단위"],
  ["1-5-2 1m보다 큰 단위", "1-5-2 $1\\,\\mathrm{m}$보다 큰 단위"],
  [
    "1-6-2 1cm², 직사각형과 정사각형의 넓이",
    "1-6-2 $1\\,\\mathrm{cm}^2$, 직사각형과 정사각형의 넓이",
  ],
  [
    "1-6-3 1cm²보다 더 큰 넓이의 단위",
    "1-6-3 $1\\,\\mathrm{cm}^2$보다 더 큰 넓이의 단위",
  ],
  ["1-6-3 ㎥ 알아보기", "1-6-3 $\\mathrm{m}^3$ 알아보기"],
]);
export const sectionTitleTex = (title: string): string =>
  TITLE_TEX.get(title) ?? title;

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
