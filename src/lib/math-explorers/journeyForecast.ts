/**
 * 진도판 예정 칸 · 중등 단원 넘김 (D-142, 원장님 2026-09-27).
 *
 * 서버(`planExpedition` · `expeditionJourney`)와 화면 폴백(`explorerJourney`)이 같이 부르는 순수 규칙이다 —
 * 서버 전용 모듈을 가져오지 않는다. 오늘 칸과 예정 칸이 서로 다른 규칙으로 갈리지 않게 넘김 규칙을 여기 한 곳에 둔다.
 */

/** 개념 단원 하나 — 학년 순서(`definitionUnits`)대로 넘긴다. */
export type ForecastUnit = {
  id: string;
  grade: number;
  title: string;
  cards: number;
  collected: number;
};
/** 판의 미래 칸 하나. `gradeStart` 는 학년이 바뀌는 첫 칸의 표지(«중3» · «초5»). */
export type ForecastItem = {
  title: string;
  subtitle: string;
  gradeStart?: string;
};
/** 판 가운데 «나의 진행». `note` 는 초등 소단원 이름(있으면 기억 복습 수 대신 보인다). */
export type JourneyPosition = {
  caption: string;
  ordinal: number;
  title: string;
  note?: string;
  collected: number;
  total: number;
  due: number;
};

export const PAGE_SIZE = 12;
export const shortGrade = (grade: number) =>
  grade < 7 ? `초${grade}` : `중${grade - 6}`;
export const longGrade = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;

/** 오늘 칸부터 지금 판(12칸)의 끝까지 채울 칸 수 — 판 넘김 단추가 새로 생기지 않게. */
export const planSlots = (completedDays: number) =>
  PAGE_SIZE - (Math.max(0, Math.floor(completedDays)) % PAGE_SIZE);

/** 문제은행 날이 있는 개념 단원 — 초등 전부와 중1 일차방정식(`curriculumBridge` 와 같다 · 시험이 맞춘다). */
export const unitHasBank = (unit: { id: string; grade: number }) =>
  unit.grade < 7 || unit.id === "g7-equation";

const finished = (unit: ForecastUnit) => unit.collected >= unit.cards;
/** 넘김이 멈추는 단원: 아직 덜 모았거나, 은행 날이 이어지는 단원. */
const stops = (unit: ForecastUnit) => !finished(unit) || unitHasBank(unit);

/**
 * D-142 — 개념 카드 다섯 장을 다 모은 중등 단원은 학년 순서(학년 끝이면 다음 학년)의 다음 «덜 모은» 단원에 넘긴다.
 * 은행이 있는 단원(초등 · 중1 일차방정식)은 넘기지 않는다 — 은행 날은 지금처럼(일차방정식은 원장님께 여쭘).
 * 뒤 단원을 전부 모았으면 시작 단원 그대로(지금 동작).
 */
export function conceptTarget(
  units: readonly ForecastUnit[],
  startId: string,
): string {
  const start = units.findIndex((unit) => unit.id === startId);
  if (start < 0 || stops(units[start])) return startId;
  return units.slice(start + 1).find(stops)?.id ?? startId;
}

/** 앞 칸(첫 칸은 오늘 학년 `grade`)과 학년이 다르면 «중3» · «초5» 표지를 붙인다 — 단원 · 소단원 예정이 같이 쓴다. */
export function withGradeStarts(
  items: readonly { grade: number; title: string; subtitle: string }[],
  grade: number,
): ForecastItem[] {
  let previous = grade;
  return items.map(({ grade: next, title, subtitle }) => {
    const item: ForecastItem =
      next !== previous
        ? { title, subtitle, gradeStart: shortGrade(next) }
        : { title, subtitle };
    previous = next;
    return item;
  });
}

/**
 * 오늘 단원(`targetId`) 뒤로 넘김 규칙이 차례로 고를 단원들. 오늘 칸이 이미 그 단원이면 빼고(`includeTarget` false),
 * 기억 복습 날처럼 오늘 칸이 다른 것이면 그 단원부터. 기억 복습 날은 미리 알 수 없어 넣지 않는다 — 그 날이 «밀림»이 된다.
 */
export function unitForecast(
  units: readonly ForecastUnit[],
  targetId: string,
  includeTarget: boolean,
  count: number,
): ForecastItem[] {
  const start = units.findIndex((unit) => unit.id === targetId);
  if (start < 0 || count <= 0) return [];
  const list = [
    ...(includeTarget ? [units[start]] : []),
    ...units.slice(start + 1).filter(stops),
  ].slice(0, count);
  return withGradeStarts(
    list.map((unit) => ({
      grade: unit.grade,
      title: unit.title,
      subtitle: longGrade(unit.grade),
    })),
    units[start].grade,
  );
}

/** 가운데 «나의 진행» — 학년 안 몇 번째 단원 · 그 학년 모은 개념 · 기억 복습 대기. */
export function unitPosition(
  units: readonly ForecastUnit[],
  targetId: string,
  due: number,
): JourneyPosition | null {
  const unit = units.find((item) => item.id === targetId);
  if (!unit) return null;
  const grade = units.filter((item) => item.grade === unit.grade);
  return {
    caption: `${shortGrade(unit.grade)} · ${grade.length}단원 중`,
    ordinal: grade.indexOf(unit) + 1,
    title: unit.title,
    collected: grade.reduce(
      (sum, item) => sum + Math.min(item.collected, item.cards),
      0,
    ),
    total: grade.reduce((sum, item) => sum + item.cards, 0),
    due,
  };
}
