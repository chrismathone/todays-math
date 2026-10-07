/**
 * **차시가 속한 학기** — `unit.semester` 칸의 원천 (D-160, 2026-10-07).
 *
 * 원장님 2026-10-07: 「출판사 학년 학기 단원 유형 등 모든 곳에 메타데이터가 있어야 문제은행을 이용하기 용이함」.
 * 문항마다 학기를 따로 적지 않는다 — 문항의 차시가 말한다. 그래야 기출 · 엔진 · 교과서 문항이 같은 값을 본다.
 *
 * 규칙은 교육과정 시드(`prisma/seed-data/units.ts`)의 **이름 꼴**에서 온다:
 *   · 초등 — 대단원 이름이 `{학기}-{단원} 이름` 이다(「2-1 곱셈」).
 *   · 중등 — 대단원이 `{번호}. 이름` 이고, 학년마다 «어느 번호부터 2학기인가»가 정해져 있다.
 *   · 공통수학1 · 2 — 과목이 곧 학기다(고1 1학기 · 2학기).
 *   · 고등 선택 과목 — 학교마다 듣는 학기가 달라 **정하지 않는다**(NULL).
 *
 * ⚠️ 모르면 `null` 이다. 0 이나 1 로 채우지 않는다 — 「모른다」와 「1학기」가 섞이면 거르기가 조용히 틀린다.
 */

/** 중학교: 이 번호의 대단원부터 2학기다. */
const SECOND_SEMESTER_STARTS: Readonly<Record<string, number>> = {
  중1: 5, // 5. 기본 도형
  중2: 5, // 5. 도형의 성질
  중3: 5, // 5. 삼각비
};

/** 과목 전체가 한 학기인 것. */
const WHOLE_SUBJECT: Readonly<Record<string, 1 | 2>> = {
  공통수학1: 1,
  공통수학2: 2,
};

const ELEMENTARY_GRADE = /^초[1-6]$/;
const ELEMENTARY_CHAPTER = /^([12])-\d+\s/;
const NUMBERED_CHAPTER = /^(\d+)\.\s/;

export function semesterOfUnit(grade: string, chapter: string): 1 | 2 | null {
  const whole = WHOLE_SUBJECT[grade];
  if (whole) return whole;

  if (ELEMENTARY_GRADE.test(grade)) {
    const match = ELEMENTARY_CHAPTER.exec(chapter);
    return match ? (Number(match[1]) as 1 | 2) : null;
  }

  const secondStarts = SECOND_SEMESTER_STARTS[grade];
  if (secondStarts === undefined) return null;
  const match = NUMBERED_CHAPTER.exec(chapter);
  if (!match) return null;
  return Number(match[1]) >= secondStarts ? 2 : 1;
}
