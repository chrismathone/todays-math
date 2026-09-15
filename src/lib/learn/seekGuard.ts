/**
 * 학생 재생기의 **앞으로 감기 가드** — 본 곳까지만 · 뒤로 감기와 배속은 된다 · 한 번 끝까지 본 영상은 어디든
 * (D-124 ⑸ · 브리프 §1.2).
 *
 * 부르는 곳: src/components/learn/LecturePlayer.tsx — 재생기 배선은 이 파일의 함수만 부르고 규칙을 다시
 * 적지 않는다. 규칙의 뿌리는 concept-port 가 옮긴 `src/lib/concept/watchRules.ts`(`clampSeek` · 감시 틱
 * 문턱)다. 여기서 더하는 것은 둘이다:
 *
 *  1. «한 번 끝까지 본 영상은 어디든» — `clampSeek` 는 끝까지 봤는지를 모른다.
 *  2. 감시 틱이 **배속과 밀린 틱**을 안다 — `watchTick` 은 문턱이 1.5초로 고정이라, 2배속에서 틱이 1초
 *     밀리면(가려진 탭은 타이머가 1초 이상으로 늦어진다) 저절로 흐른 2초를 «감았다»로 읽고 본 곳으로
 *     되돌린다. 그러면 되돌림이 계속 돌아 영상이 앞으로 안 간다.
 *
 * 우회 방지가 목적은 아니다(D-124 ⑸ · 수맥 규칙) — 평범한 학생이 무심코 건너뛰지 않게 하는 정도다.
 */
import {
  clampSeek,
  SEEK_JUMP_TOLERANCE_SECONDS,
} from "@/lib/concept/watchRules";

/** 재생 중 시청 보고 간격 — 멈춤 · 끝 · 창 닫기에는 따로 보낸다(브리프 §1.2 «보고 간격 상수는 한 곳») */
export const WATCH_REPORT_INTERVAL_MS = 15_000;
/** 감시 틱 간격 — 지금 위치를 읽어 본 곳을 올리거나 되돌린다 */
export const PLAYBACK_TICK_MS = 250;
/** 배속 단추가 도는 차례 */
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;

export function nextPlaybackRate(rate: number): number {
  const at = PLAYBACK_RATES.findIndex((r) => r === rate);
  return PLAYBACK_RATES[(at + 1) % PLAYBACK_RATES.length] ?? 1;
}

/** 재생기가 들고 있는 시청 상태 */
export interface SeekState {
  /** 본 최대 지점(초) */
  maxWatched: number;
  /** 한 번 끝까지 봤나(서버가 찍은 완료) — 봤으면 어디든 간다 */
  completed: boolean;
  /** 영상 길이(초). 모르면 0 */
  duration: number;
}

/**
 * 🔴 옮기려는 지점 → 실제로 옮길 지점. 앞으로는 본 곳까지, 뒤로는 처음까지.
 * 한 번 끝까지 본 영상은 영상 길이 안 어디든.
 */
export function clampSeekTarget(target: number, s: SeekState): number {
  const safe = Number.isFinite(target) ? target : 0;
  if (s.completed)
    return Math.max(0, s.duration > 0 ? Math.min(safe, s.duration) : safe);
  return clampSeek(safe, s.maxWatched);
}

export type PlaybackTick =
  /** 안 본 곳으로 튀었다 — 본 곳으로 되돌린다 */
  | { kind: "rewind"; to: number }
  /** 저절로 흘러 본 곳을 넘었다 — 본 곳을 올린다 */
  | { kind: "advance"; maxWatched: number }
  /** 본 곳 안(되감아 다시 보는 중) — 그대로 */
  | { kind: "hold" };

/**
 * 🔴 감시 틱 — 앞 틱의 위치(`previous`)에서 지금 위치(`current`)까지가 «흐른 시간 × 배속»(+ 여유) 안이면
 * 저절로 흐른 것, 넘으면 감은 것이다. 본 곳 안에서는 무엇이든 그대로 둔다(뒤로 감기는 자유).
 */
export function playbackTick(
  input: {
    previous: number;
    current: number;
    elapsedSeconds: number;
    rate: number;
  },
  s: SeekState,
): PlaybackTick {
  const { previous, current } = input;
  if (current <= s.maxWatched) return { kind: "hold" };
  if (s.completed) return { kind: "advance", maxWatched: current };
  const flowed =
    Math.max(0, input.elapsedSeconds) * Math.max(0, input.rate) +
    SEEK_JUMP_TOLERANCE_SECONDS;
  if (current - Math.max(0, previous) <= flowed)
    return { kind: "advance", maxWatched: current };
  return { kind: "rewind", to: s.maxWatched };
}
