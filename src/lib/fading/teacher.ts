import type { StoredFading } from "@/contracts/fading.contract";
import type { FadingConceptStatus } from "@/contracts/fadingApi.contract";
import {
  FADING_TEACHER_FLAGS,
  type FadingTeacherFlag,
  type FadingTeacherSummary,
} from "@/contracts/fadingTeacher.contract";
import { kstDateOf } from "@/lib/kstDate";
import type { FadingConcept } from "./concepts";
import type { FadingStep } from "./erasure";
import {
  FADING_LONG_BREAK_DAYS,
  currentFadingStreak,
  fadingIdleDays,
  fadingLongBreak,
} from "./numbers";
import { fadingRelearnLimits } from "./relearn";
import { fadingDayOfDate } from "./schedule";
import { fadingConceptStatus } from "./view";

/**
 * 교사가 보는 숫자와 «살펴볼 까닭» (`docs/planning/srs-overhaul-20261006.md` §15).
 * 화면도 DB 도 모른다. 숫자는 전부 세는 값이다 — 뭉친 점수를 내지 않는다.
 *
 * 문턱은 **자료로 맞춘 값이 아니다.** 탐험 교사 보기에서 리드 · codex · grok 이 맞춘 값(27번 문서 §4.2 v1.1 — 복습 밀림 · 오래 쉼 · 시작 전)을
 * 뜻이 같은 자리에 그대로 가져왔다. **아래 값을 바꾸면 판 번호도 올린다**(시험이 둘을 함께 잠근다).
 */
export const FADING_TEACHER_POLICY = 2;
/** 복습이 밀림 — 복습일이 이만큼(날) 이상 지난 개념이 */
export const FADING_OVERDUE_FLAG_DAYS = 3;
/** … 이만큼(개) 이상이거나, */
export const FADING_OVERDUE_FLAG_CONCEPTS = 3;
/** … 이만큼(날) 이상 지난 개념이 하나라도 있다. */
export const FADING_OVERDUE_LONG_FLAG_DAYS = 7;
/** 오래 쉼 — 마지막으로 평가를 닫은 날부터 이만큼(날) 이상. 학생 홈의 «오래 쉬고 돌아옴»과 한 값이다(`numbers.ts`). */
export const FADING_IDLE_FLAG_DAYS = FADING_LONG_BREAK_DAYS;
/** 시작 전 — 계정을 만든 날부터 이만큼(날) 뒤부터(만든 날을 모르면 바로). */
export const FADING_NOT_STARTED_GRACE_DAYS = 3;

/** 최근 며칠의 사실을 싣는가(오늘 포함) — 사실 표시의 창일 뿐이다. 판정에 쓰지 않으므로 정책 판과 무관하다. */
export const FADING_TEACHER_RECENT_DAYS = 7;
/**
 * 분량 점검 필요(2판 · 원장님 결정 2026-10-17) — 최근 7일(오늘 포함) 가운데 추가 확인이 하루 상한에 닿은 날이 이만큼 이상이고
 * 남은 확인이 있다. 날은 학생 기록 밖의 표(`fading_relearn_cap_day`)에서 라우트가 세어 넘긴다. 보충 필요(2판)는 오늘 멈춘 문장이 하나라도 있다.
 */
export const FADING_QUOTA_CHECK_DAYS = 3;
export const FADING_QUOTA_CHECK_WINDOW_DAYS = 7;

/** 학생 계정의 사실 — 꺼진 계정은 없는 것으로 친다. 만든 날은 한국 날짜. */
export type FadingTeacherAccount = {
  hasAccount: boolean;
  createdOn: string | null;
};

/** 학생 하나의 숫자. `known` 을 주면 그 안의 열쇠만 센다(은행에서 사라진 개념의 기록을 빼려고). */
export function fadingTeacherSummary(
  fading: StoredFading | undefined,
  today: string,
  account: FadingTeacherAccount,
  known?: ReadonlySet<string>,
  /** 학생 기록 밖의 사실 — 최근 7일 가운데 **오늘을 뺀** 하루 상한에 닿은 날 수(`fading_relearn_cap_day`). 오늘은 여기서 센다. */
  extra: { capDays?: number } = {},
): FadingTeacherSummary {
  const day = fadingDayOfDate(today);
  const stepCounts: Record<FadingStep, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  /** 평가한 개념마다 복습일에서 지난 날 수(오늘이 복습일이면 0 · 아직이면 음수). */
  const late: number[] = [];
  let picked = 0;
  let lapses = 0;
  for (const [id, stored] of Object.entries(fading?.concepts ?? {})) {
    if (known && !known.has(id)) continue;
    picked += 1;
    lapses += stored.lapses;
    stepCounts[stored.step] += 1;
    if (stored.dueOn !== null) late.push(day - fadingDayOfDate(stored.dueOn));
  }
  const todayRow = fading?.days.find((d) => d.date === today);
  // 추가 확인 대기열에 지금 남은 줄 — 저장된 줄의 since · fails · checks 만(판정이 아니다).
  const rows = (fading?.relearn?.items ?? []).filter(
    (item) => !known || known.has(item.conceptId),
  );
  const oldest = rows.length ? Math.min(...rows.map((r) => r.since)) : null;
  // 오늘의 끝 — 학생 라우트가 막는 셈과 같은 함수(`relearn.ts`)로 센다. 시각은 그날 한국 낮 12시면 충분하다(날짜만 본다).
  const limits = fading?.relearn
    ? fadingRelearnLimits(fading.relearn, Date.parse(`${today}T12:00:00+09:00`))
    : null;
  const stoppedToday = (limits?.stopped ?? []).filter(
    (key) => !known || known.has(key.split("/")[0]!),
  ).length;
  const capDays = (extra.capDays ?? 0) + (limits?.capped ? 1 : 0);
  // 최근 7일(오늘 포함) — 평가를 닫은 날 수 · 첫 평가 수.
  const recentDays = (fading?.days ?? []).filter((d) => {
    const ago = day - fadingDayOfDate(d.date);
    return ago >= 0 && ago < FADING_TEACHER_RECENT_DAYS && d.reviews > 0;
  });
  const lastOn = fading?.streak.lastOn ?? null;
  const idleDays = fadingIdleDays(
    lastOn === null ? null : fadingDayOfDate(lastOn),
    day,
  );
  const reasons: Record<FadingTeacherFlag, boolean> = {
    "no-account": !account.hasAccount,
    "not-started":
      lastOn === null &&
      (account.createdOn === null ||
        day - fadingDayOfDate(account.createdOn) >=
          FADING_NOT_STARTED_GRACE_DAYS),
    overdue:
      late.filter((d) => d >= FADING_OVERDUE_FLAG_DAYS).length >=
        FADING_OVERDUE_FLAG_CONCEPTS ||
      late.some((d) => d >= FADING_OVERDUE_LONG_FLAG_DAYS),
    idle: fadingLongBreak(idleDays),
    "relearn-stop": stoppedToday > 0,
    "quota-check": capDays >= FADING_QUOTA_CHECK_DAYS && rows.length > 0,
  };
  return {
    picked,
    learned: late.length,
    stepCounts,
    due: late.filter((d) => d >= 0).length,
    overdue: late.filter((d) => d > 0).length,
    longestOverdueDays: Math.max(0, ...late),
    reviewedToday: todayRow?.reviews ?? 0,
    freshToday: todayRow?.fresh ?? 0,
    lastOn,
    idleDays,
    streak: {
      current: fading
        ? currentFadingStreak(
            {
              current: fading.streak.current,
              best: fading.streak.best,
              lastDay: lastOn === null ? null : fadingDayOfDate(lastOn),
            },
            day,
          )
        : 0,
      best: fading?.streak.best ?? 0,
    },
    lapses,
    relearn: {
      waiting: rows.length,
      failing: rows.filter((r) => r.fails > 0).length,
      fails: rows.reduce((n, r) => n + r.fails, 0),
      checks: rows.reduce((n, r) => n + r.checks, 0),
      sinceOn: oldest === null ? null : kstDateOf(new Date(oldest)),
      today: {
        checks: limits?.checks ?? 0,
        capped: limits?.capped ?? false,
        stopped: stoppedToday,
      },
      capDays,
    },
    recent: {
      days: recentDays.length,
      fresh: recentDays.reduce((n, d) => n + d.fresh, 0),
    },
    // 계정이 없으면 그것 하나만 — 학생이 할 수 있는 일이 없으니 다른 까닭은 뜻이 없다.
    flags: reasons["no-account"]
      ? ["no-account"]
      : FADING_TEACHER_FLAGS.filter((flag) => reasons[flag]),
  };
}

/** 학생이 고른 개념의 상태 — 묶음 표의 차례. 은행에 없는 열쇠의 기록은 내지 않는다. */
export function fadingTeacherConcepts(
  fading: StoredFading | undefined,
  concepts: ReadonlyMap<string, FadingConcept>,
  today: string,
): FadingConceptStatus[] {
  if (!fading) return [];
  const statuses: FadingConceptStatus[] = [];
  for (const [id, concept] of concepts) {
    const stored = fading.concepts[id];
    if (stored) statuses.push(fadingConceptStatus(concept, stored, today));
  }
  return statuses;
}
