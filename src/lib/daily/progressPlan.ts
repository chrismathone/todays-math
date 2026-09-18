/**
 * 진도 계획을 **날짜로 펴는 규칙** — 순수 함수 (매일 자동 출제 ②, D-129 ⑴⑵⑷).
 *
 * 계획은 **규칙 한 줄**이다: 수업 요일(여럿) · 한 수업당 차시 수 · 시작 차시 · 시작일 · 켜짐.
 * 날짜별 행을 쌓지 않는다 — 요일이 바뀌면 지난 행을 전부 고쳐 써야 하고, 그러면 「무엇이
 * 계획이고 무엇이 기록인가」가 섞인다.
 *
 * 🔴 **실제가 이긴다** (D-129 ⑵). 진도 기록이 있으면 **그 차시가 정본**이고, 남은 계획은
 *    그 지점부터 다시 편다. 계획(규칙)은 **고쳐 쓰지 않는다** — 「어디서부터」만 옮긴다.
 *    앞서 있으면 앞선 대로, 뒤처져 있으면 뒤처진 대로 이어 간다.
 *
 * 휴일은 **다루지 않는다** — 요일만 본다(D-129 ⑷). 휴일에도 초안이 서지만 확정·인쇄가
 * 사람 손이라 학생에게 가지 않는다.
 *
 * ⚠️ 여기 있는 날짜 셈은 **달력 날짜 문자열끼리의 셈**이다(요일·일 수). 「지금이 몇 일인가」를
 *    묻는 시간대 변환이 아니다 — 그 셈은 `src/lib/kstDate.ts` 한 곳에만 둔다. 부르는 쪽이
 *    이미 KST 날짜(YYYY-MM-DD)를 정해서 넘긴다.
 *
 * 계약: src/contracts/dailyAutoTest.contract.ts · SSOT: docs/planning/22-daily-auto-test.md §3
 */

/** 계획 규칙 한 줄 — 계약(`progressPlanRuleSchema`)과 같은 모양. */
export interface ProgressPlanRule {
  /** 수업 요일 — 0=일 … 6=토 (`Date.getUTCDay()` 와 같은 번호). */
  weekdays: readonly number[];
  /** 한 수업당 차시 수 (1 이상). */
  unitsPerLesson: number;
  /** 시작 차시 — 교육과정 차례(orderIndex)의 출발점. */
  startUnitId: string;
  /** 시작일 YYYY-MM-DD — 이 날 **이후 첫 수업일**에 시작 차시를 나간다. */
  startDate: string;
  /** 꺼 두면 자동 대상이 아니다. */
  active: boolean;
}

/** 교육과정 차시 — 차례는 `orderIndex` 가 정한다(전역 연속값, D-27). */
export interface PlanUnit {
  id: string;
  orderIndex: number;
}

/** 실제 진도 — `getCurrentProgress` 가 고른 최신 한 건. */
export interface ActualProgress {
  unitId: string;
  /** YYYY-MM-DD */
  recordedAt: string;
}

export interface DailyPlanResult {
  /** 그 날이 수업일인가 — 아니면 **자동 출제 대상이 아니다**. */
  lessonToday: boolean;
  /** 그날 수업에서 나가는 차시(차례대로). 수업일이 아니면 빈 배열. */
  unitIds: string[];
  /** 범위의 끝이 될 차시 — 수업일이면 그날 마지막 차시, 아니면 **마지막으로 나간** 차시. */
  endUnitId: string | null;
  /** 계획상 몇 번째 수업인가(1부터). 계획이 아직 시작 안 됐으면 0. */
  lessonIndex: number;
  /** 어디에 걸어 폈나 — 진도 기록이 있으면 `"progress"`(실제가 이긴다). */
  anchoredOn: "plan" | "progress";
  /**
   * 더 못 나가는 끝에 닿아 끝 차시에 멈춰 있다 — 교육과정의 끝이거나, 부르는 쪽이 넘긴
   * **출제할 문항이 있는 마지막 차시**(`lastTeachableUnitId`)다.
   */
  atCurriculumEnd: boolean;
  /**
   * 밀림·앞섬(일). **양수면 앞섬 · 음수면 밀림 · 진도 기록이 없으면 0.**
   *
   * 재는 법: 계획이 그 차시를 나가라던 날 − 실제로 나간 날. 「오늘 어디까지 갔어야 하나」가
   * 아니라 「그 차시를 며칠 늦게/일찍 나갔나」다 — 계획대로 가는 반이 0 이 되는 쪽이다.
   */
  driftDays: number;
}

const DAY_MS = 86_400_000;
/** 규칙이 잘못됐을 때 무한 루프 대신 멈추는 울타리 — 100년치보다 넉넉하다. */
const WALK_LIMIT = 40_000;

const dayMs = (day: string): number => Date.parse(`${day}T00:00:00.000Z`);

/** 달력 날짜에 일 수를 더한다. */
export function addDays(day: string, n: number): string {
  return new Date(dayMs(day) + n * DAY_MS).toISOString().slice(0, 10);
}

/** `to − from` (일). 뒤엣날이 앞서면 음수. */
export function diffDays(from: string, to: string): number {
  return Math.round((dayMs(to) - dayMs(from)) / DAY_MS);
}

/** 그 달력 날짜의 요일 — 0=일 … 6=토. */
export function weekdayOf(day: string): number {
  return new Date(dayMs(day)).getUTCDay();
}

/**
 * `from`~`to`(양끝 포함) 사이의 **수업일 수**.
 *
 * 하루씩 걷지 않고 주 단위로 센다 — 계획이 몇 해 전에 시작됐어도 셈이 같은 값을 낸다.
 */
function lessonDaysBetween(
  weekdays: ReadonlySet<number>,
  from: string,
  to: string,
): number {
  if (weekdays.size === 0) return 0;
  const total = diffDays(from, to) + 1;
  if (total <= 0) return 0;
  const weeks = Math.floor(total / 7);
  let count = weeks * weekdays.size;
  const first = weekdayOf(from);
  // 남은 날은 7일 미만이라 요일이 겹치지 않는다 — 온 주를 몇 번 돌든 시작 요일은 그대로다.
  for (let i = 0; i < total % 7; i += 1)
    if (weekdays.has((first + i) % 7)) count += 1;
  return count;
}

/**
 * `startDate` 기준 **n번째 수업일**.
 *
 * `n >= 1` 이면 시작일을 포함해 앞으로 세고, `n <= 0` 이면 시작일 **직전**부터 거꾸로 센다
 * (`n = 0` 은 시작일 바로 앞 수업일). 거꾸로 세는 길이 있어야 「계획의 시작 차시보다 뒤에
 * 있는 반」의 밀림을 «잴 수 없다»로 0 처리하지 않는다.
 */
function nthLessonDay(
  weekdays: ReadonlySet<number>,
  startDate: string,
  n: number,
): string | null {
  if (weekdays.size === 0) return null;
  if (n >= 1) {
    let day = startDate;
    let seen = 0;
    for (let i = 0; i < WALK_LIMIT; i += 1) {
      if (weekdays.has(weekdayOf(day))) {
        seen += 1;
        if (seen === n) return day;
      }
      day = addDays(day, 1);
    }
    return null;
  }
  let day = addDays(startDate, -1);
  let seen = 1;
  for (let i = 0; i < WALK_LIMIT; i += 1) {
    if (weekdays.has(weekdayOf(day))) {
      seen -= 1;
      if (seen === n) return day;
    }
    day = addDays(day, -1);
  }
  return null;
}

const NO_LESSON: DailyPlanResult = {
  lessonToday: false,
  unitIds: [],
  endUnitId: null,
  lessonIndex: 0,
  anchoredOn: "plan",
  atCurriculumEnd: false,
  driftDays: 0,
};

/**
 * 그 날짜에 나갈 차시를 센다. **입력을 고쳐 쓰지 않는다.**
 *
 * 못 내는 경우(꺼진 계획 · 요일 없음 · 시작 차시가 단원 목록 밖 · 계획 시작 전)에는
 * `lessonToday: false` 로 돌려준다 — 조용히 첫 차시를 내지 않는다.
 */
export function resolveDailyPlan(args: {
  rule: ProgressPlanRule;
  /** 전체 교육과정. 차례는 `orderIndex` 가 정한다(정렬해서 쓴다). */
  units: readonly PlanUnit[];
  /** 기준일 YYYY-MM-DD (KST — 부르는 쪽이 정한다). */
  day: string;
  /** 실제 진도 — 있으면 **이것이 이긴다**. */
  actual: ActualProgress | null;
  /**
   * 여기까지만 걷는다 — **출제할 문항이 있는 마지막 차시**(`teachableBoundary.ts`).
   * 차례가 전역 연속값이라(D-27) 없으면 중3 반이 고등(문항 0건)으로 걸어 들어간다.
   * 목록 밖 값·null 이면 무시하고 교육과정 끝까지 걷는다(예전과 같다).
   *
   * 🔴 이미 경계 밖에 있는 반(실제 진도·시작 차시)은 **뒤로 끌지 않는다** — 그 자리에서 멈춘다.
   *    실제가 이긴다(D-129 ⑵).
   */
  lastTeachableUnitId?: string | null;
}): DailyPlanResult {
  const { rule, units, day, actual } = args;

  const weekdays = new Set(rule.weekdays);
  if (!rule.active || weekdays.size === 0) return NO_LESSON;

  const sorted = [...units].sort((a, b) => a.orderIndex - b.orderIndex);
  const indexById = new Map(sorted.map((u, i) => [u.id, i]));
  const startIdx = indexById.get(rule.startUnitId);
  if (startIdx === undefined) return NO_LESSON;

  const per = Math.max(1, Math.trunc(rule.unitsPerLesson));

  const firstLesson = nthLessonDay(weekdays, rule.startDate, 1);
  if (firstLesson === null) return NO_LESSON;

  // 🔴 실제가 이긴다 — 진도 기록의 차시를 단원 목록에서 찾으면 그것이 기준점이다.
  //    못 찾으면(목록 밖 차시) 계획으로 되돌아간다. 조용히 0번째로 읽지 않는다.
  const actualIdx = actual ? indexById.get(actual.unitId) : undefined;
  const anchoredOn: DailyPlanResult["anchoredOn"] =
    actual && actualIdx !== undefined ? "progress" : "plan";

  // 걷기 상한 — 교육과정 끝, 또는 **출제할 문항이 있는 마지막 차시**(경계). 경계 밖 값은 무시한다.
  // 이미 경계 밖에 있는 반(실제 진도·시작 차시)은 그 자리가 상한이다 — 뒤로 끌지 않는다.
  const boundaryIdx =
    args.lastTeachableUnitId != null
      ? indexById.get(args.lastTeachableUnitId)
      : undefined;
  const reachedIdx = anchoredOn === "progress" ? actualIdx! : startIdx;
  const lastIdx =
    boundaryIdx === undefined
      ? sorted.length - 1
      : Math.max(boundaryIdx, reachedIdx);

  // 밀림·앞섬 — 그 차시를 「계획이 나가라던 날」과 「실제로 나간 날」의 차(일).
  let driftDays = 0;
  if (actual && actualIdx !== undefined) {
    // 수업 L 이 맡는 차시는 [startIdx+(L−1)·per … startIdx+L·per−1] 이다.
    const lessonNo = Math.floor((actualIdx - startIdx) / per) + 1;
    const plannedDate = nthLessonDay(weekdays, rule.startDate, lessonNo);
    if (plannedDate !== null)
      driftDays = diffDays(actual.recordedAt, plannedDate);
  }

  const anchorDate =
    anchoredOn === "progress" ? actual!.recordedAt : firstLesson;
  const anchorIdx =
    anchoredOn === "progress"
      ? actualIdx!
      : Math.min(startIdx + per - 1, lastIdx);

  const lessonIndex = lessonDaysBetween(weekdays, rule.startDate, day);

  // 계획이 아직 시작 안 됐다(기준점보다 앞선 날). 마지막으로 나간 차시만 알려 준다.
  if (day < anchorDate)
    return {
      ...NO_LESSON,
      anchoredOn,
      endUnitId: anchoredOn === "progress" ? actual!.unitId : null,
      driftDays,
    };

  const lessonsAfter =
    day > anchorDate
      ? lessonDaysBetween(weekdays, addDays(anchorDate, 1), day)
      : 0;
  const wanted = anchorIdx + lessonsAfter * per;
  const endIdx = Math.min(wanted, lastIdx);
  const lessonToday =
    day === anchorDate || (day > anchorDate && weekdays.has(weekdayOf(day)));

  return {
    lessonToday,
    // 수업일이 아니면 「오늘 나갈 차시」는 없다 — 끝 차시(마지막으로 나간 것)만 남는다.
    unitIds: lessonToday
      ? sorted.slice(Math.max(0, endIdx - per + 1), endIdx + 1).map((u) => u.id)
      : [],
    endUnitId: sorted[endIdx]?.id ?? null,
    lessonIndex,
    anchoredOn,
    atCurriculumEnd: wanted > lastIdx,
    driftDays,
  };
}

/**
 * 어느 계획을 쓰나 — **개별 진도 학생은 학생 계획이 반 계획을 덮는다**.
 *
 * `getCurrentProgress`(진도)와 **같은 결**이다: `useIndividualProgress` 가 참이고 학생 계획이
 * 있을 때만 학생 것을 쓰고, 그 밖에는 반 계획으로 되돌아간다. 두 곳이 갈리면 「계획은 학생
 * 것을 보는데 진도는 반 것을 보는」 반이 생긴다.
 */
export function pickProgressPlan<T>(args: {
  classPlan: T | null;
  studentPlan: T | null;
  useIndividualProgress: boolean;
}): T | null {
  const { classPlan, studentPlan, useIndividualProgress } = args;
  if (useIndividualProgress && studentPlan !== null) return studentPlan;
  return classPlan;
}
