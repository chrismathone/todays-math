import type { StoredFading } from "@/contracts/fading.contract";
import type { FadingAction } from "@/contracts/fadingApi.contract";
import { applyFadingAction } from "./actions";
import type { FadingTrap } from "./chips";
import type { FadingConcept } from "./concepts";
import { observeFadingRelearn } from "./relearn";
import { fadingRelearnObservationOf } from "./relearnSource";
import { FadingConflict } from "./state";

/**
 * 본 행동과 단기 재학습 등록을 **한 전이**로(D3 · 2026-10-16) — 학생 라우트(`routes.ts`)와 서버 없이 도는 길(`local.ts`)이 이 함수 하나를 쓴다.
 *
 * 전에는 화면이 본 행동(`step` · `miss` · `rate`)을 저장한 뒤 `/relearn` 에 증거를 따로 보냈다 — 그 둘째 요청이 끊기면 증거는 메모리에만 남고
 * 새로고침에 사라졌다(1분 · 5분 확인을 못 받는다). 이제 본 전이 → 그 행동의 증거(`fadingRelearnObservationOf`) → `observeFadingRelearn` 을
 * 같은 저장 콜백 안에서 돌린다 — 저장이 다시 시도돼도 둘이 함께 새 기록 위에 다시 적용된다. 응답의 꼴은 그대로다(새 화면은 뒤에 대기열을 읽는다).
 *
 * - `relearn.enabled` 가 `false`(서버 문 `MATH_FADING_RELEARN` 닫힘)면 본 전이만 — `relearn` 칸은 읽은 그대로 보존된다.
 * - 본 전이가 **받은 값 그대로**를 돌려주면(이미 지난 단계의 되풀이 · 같은 요청 번호의 평가 — 영수증 재사용) 등록도 건너뛴다:
 *   늦게 다시 온 요청이 잡힌 확인 시각을 미루거나 줄을 되돌리지 않는다(세는 열쇠는 그대로 풀이 × 단계 × 명제 · 개념 × 평가 차례).
 * - 등록 쪽의 «할 수 없는 일»(`FadingConflict`)은 본 행동을 실패시키지 않는다 — 본 전이는 이미 섰고, 증거가 없으면 등록이 없을 뿐이다.
 * `relearn.now` 는 서버의 지금(밀리초) — 부르는 쪽이 요청마다 한 번 정한다.
 */
export function applyFadingActionWithRelearn(
  fading: StoredFading,
  action: FadingAction,
  concept: FadingConcept | undefined,
  today: string,
  fresh: { sessionId: string; seed: number },
  traps: readonly FadingTrap[],
  options: { cards?: boolean; relearn: { enabled: boolean; now: number } },
): StoredFading {
  const next = applyFadingAction(fading, action, concept, today, fresh, traps, {
    cards: options.cards,
  });
  if (!options.relearn.enabled || next === fading || !concept) return next;
  const observation = fadingRelearnObservationOf(action);
  if (!observation) return next;
  try {
    return observeFadingRelearn(
      next,
      concept,
      observation,
      options.relearn.now,
      traps,
    ).fading;
  } catch (error) {
    if (error instanceof FadingConflict) return next;
    throw error;
  }
}
