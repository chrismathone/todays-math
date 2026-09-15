/**
 * 시청 규칙 — **스킵 없이 끝까지** 보게 하는 규칙들 (D-123 ⑥′).
 *
 * 수맥 `apps/web/src/components/learn/LecturePlayer.tsx` 의 머리말·감시 틱과
 * `apps/web/src/lib/domain/learning-material.ts` 의 `recordVideoWatch` 에서 **규칙만**
 * 뽑았다. 컴포넌트는 옮기지 않았다(D-07 — 화면은 시안부터). 재생기가 생기면 여기 함수를
 * 부르고, 시청 기록을 쓰는 서버 경로는 `mergeWatchRecord` 를 부른다 — 두 쪽이 규칙을 각자
 * 적으면 화면은 막는데 서버는 받거나 그 반대가 된다.
 *
 * 규칙은 하나다: **아직 안 본 곳으로는 못 간다.**
 *   - 뒤로 감기는 자유다. 어려운 데를 다시 보는 것은 막을 이유가 없다.
 *   - 앞으로 감기는 「여태 본 최대 지점」까지만이다.
 *   - 배속은 준다(재생기 몫). 빨리 보는 것과 건너뛰는 것은 다른 일이다.
 *
 * 진도는 「본 최대 지점 / 전체 길이」다. 앞으로 감기가 막혀 있으므로 이 값이 곧 실제로
 * 지나온 구간이고, 따로 구간 집합을 들 필요가 없다.
 *
 * **우회는 막지 않는다**(수맥 소유자 결정). 개발자도구를 아는 학생은 어차피 뚫는다. 목적은
 * 부정 방지가 아니라 보통의 학생이 무심코 건너뛰지 않고 끝까지 보게 하는 것이다. 그래서
 * 서버는 보내온 진도를 그대로 받되 **뒤로만 가지 않게** 한다. 인강에는 「다 봤어요」 버튼이
 * 없다 — 눌러서 넘길 수 있으면 시청 강제가 뜻을 잃는다. 완료는 문턱을 넘을 때 기록 규칙이
 * 스스로 찍는다.
 */

/** 완료 문턱(%) */
export const WATCH_COMPLETE_PERCENT = 95;
/** 이 초를 넘게 튀면 「감았다」로 본다 — 재생 중 자연 진행(250ms 틱)과 구분한다 */
export const SEEK_JUMP_TOLERANCE_SECONDS = 1.5;
/** 끝에서 이만큼 안이면 «끝까지 본 영상»으로 본다 — 이어 보기를 끝에 두지 않는다 */
export const RESUME_END_MARGIN_SECONDS = 5;
/** 「10초 →」 단추의 한 걸음 */
export const SKIP_STEP_SECONDS = 10;

/** 옮기려는 지점 → 실제로 옮길 지점. 앞으로는 본 최대 지점까지, 뒤로는 0 까지. */
export function clampSeek(
  targetSeconds: number,
  maxWatchedSeconds: number,
): number {
  return Math.max(0, Math.min(targetSeconds, maxWatchedSeconds));
}

/** 「10초 →」 단추를 열어 둘까 — 그 한 걸음이 본 곳 안일 때만. 안 본 곳으로는 아예 못 누른다. */
export function canSkipForward(
  currentSeconds: number,
  maxWatchedSeconds: number,
  step: number = SKIP_STEP_SECONDS,
): boolean {
  return currentSeconds + step <= maxWatchedSeconds;
}

export type WatchTick =
  /** 안 본 곳으로 튀었다 — 본 최대 지점으로 되돌리고 «왜»를 말한다(말없이 되돌리면 고장으로 보인다) */
  | { kind: "rewind"; to: number }
  /** 자연 진행 — 본 최대 지점을 올린다 */
  | { kind: "advance"; maxSeconds: number }
  /** 되감아 보는 중이거나 제자리 — 그대로 둔다 */
  | { kind: "hold" };

/** 감시 틱 — 재생기가 짧은 간격으로 지금 위치를 보고 부른다. */
export function watchTick(
  currentSeconds: number,
  maxWatchedSeconds: number,
): WatchTick {
  if (currentSeconds > maxWatchedSeconds + SEEK_JUMP_TOLERANCE_SECONDS) {
    return { kind: "rewind", to: maxWatchedSeconds };
  }
  if (currentSeconds > maxWatchedSeconds) {
    return { kind: "advance", maxSeconds: currentSeconds };
  }
  return { kind: "hold" };
}

/** 진도(0–100) = 본 최대 지점 / 길이. 길이를 모르면 0. */
export function watchPercent(
  maxWatchedSeconds: number,
  durationSeconds: number,
): number {
  return durationSeconds > 0
    ? Math.min(100, (maxWatchedSeconds / durationSeconds) * 100)
    : 0;
}

export function isWatchComplete(percent: number): boolean {
  return percent >= WATCH_COMPLETE_PERCENT;
}

/** 저장된 시청 기록 (`ConceptLectureView` 의 규칙 칸) */
export interface WatchRecord {
  maxSeconds: number;
  /** 0–100 정수 */
  percent: number;
  /** 한 번 찍히면 그대로 — 완료 여부이자 처음 완료한 시각 */
  completedAt: Date | null;
}

/** 재생기가 보낸 보고 */
export interface WatchReport {
  seconds: number;
  percent: number;
}

/** 반올림해 범위 안으로 접는다. NaN·Infinity 는 하한. */
function toBoundedInt(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : lo;
}

/**
 * 시청 기록 규칙 — 수맥 `recordVideoWatch` 의 upsert 를 순수 함수로.
 *
 * **뒤로만 간다.** 저장된 값이 더 크면 그대로 둔다 — 학생이 되감아 다시 보는 동안 진도가
 * 깎이면 「본 것」이 사라지는 셈이다(수맥은 SQL `greatest` 로 했다).
 * **한 번 완료면 완료**이고 완료 시각도 처음 그대로다(수맥 `coalesce`) — 되감아 다시 볼 때
 * 미완료로 돌아가면 다음 단계가 도로 잠긴다.
 */
export function mergeWatchRecord(
  prev: WatchRecord | null,
  report: WatchReport,
  now: Date,
): WatchRecord {
  const percent = toBoundedInt(report.percent, 0, 100);
  const seconds = toBoundedInt(report.seconds, 0, Number.MAX_SAFE_INTEGER);
  const nextPercent = prev ? Math.max(prev.percent, percent) : percent;
  const nextMax = prev ? Math.max(prev.maxSeconds, seconds) : seconds;
  const completedAt =
    prev?.completedAt ?? (isWatchComplete(nextPercent) ? now : null);
  return { maxSeconds: nextMax, percent: nextPercent, completedAt };
}

/**
 * 이어 보기 — 지난번 본 최대 지점으로. 단 **끝까지 본 영상은 처음부터**다: 끝 지점에 두면
 * 재생을 눌러도 곧바로 끝나 다시 볼 길이 없다(수맥 실측). 처음부터 다시 보는 것은 막을
 * 이유가 없다 — 이미 다 본 사람이다. 길이를 아직 모르면(재생기 준비 전) 본 데서 잇는다.
 */
export function resumePosition(
  maxWatchedSeconds: number,
  durationSeconds: number,
): number {
  const watchedToEnd =
    durationSeconds > 0 &&
    maxWatchedSeconds >= durationSeconds - RESUME_END_MARGIN_SECONDS;
  if (watchedToEnd) return 0;
  return maxWatchedSeconds > 1 ? maxWatchedSeconds : 0;
}
