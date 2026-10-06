import type { StoredFading } from "@/contracts/fading.contract";
import type { FadingAction } from "@/contracts/fadingApi.contract";
import type { FadingTrap } from "./chips";
import type { FadingConcept } from "./concepts";
import {
  completeFadingReading,
  completeFadingStep,
  dropFadingConcept,
  openFadingSession,
  pickFadingConcept,
  rateFadingSession,
  reportFadingMiss,
  setFadingAllToday,
} from "./state";

/**
 * 학생의 행동 하나를 저장 칸에 적용한다 — 화면도 DB 도 모른다 (`docs/planning/srs-overhaul-20261006.md` §14).
 * 학생 라우트(`routes.ts`)와 서버 없이 도는 미리 보기(`local.ts`)가 **이 함수 하나**를 쓴다 — 규칙이 두 벌이 되지 않는다.
 */

/** 그 행동이 가리키는 개념의 열쇠 — 개념을 가리키지 않으면(«오늘 전부») `null`. */
export function fadingActionConceptId(action: FadingAction): string | null {
  return "conceptId" in action ? action.conceptId : null;
}

/**
 * 개념의 내용이 있어야 하는 행동인가. 빼는 것(`drop`)만 내용 없이 된다 — 은행에서 사라진 개념의 기록을 치울 길이다.
 * 부르는 쪽은 `true` 인데 은행에 그 개념이 없으면 적용하지 않고 «없는 개념»으로 답한다.
 */
export function fadingActionNeedsConcept(action: FadingAction): boolean {
  return "conceptId" in action && action.action !== "drop";
}

/**
 * `fresh` 는 풀이를 새로 열 때 쓰는 번호와 칩 차례의 씨앗 — 부르는 쪽이 한 번만 짓는다(저장이 다시 시도돼도 같은 값).
 * `traps` 는 그 개념의 함정 칩이다 — 🔴 화면에 내려보낸 것과 **같은 것**을 넘긴다. 칩의 번호는 묶음 안의 자리라, 함정이 하나 들고 나면
 * 화면이 보낸 번호가 다른 칩을 가리킨다.
 */
export function applyFadingAction(
  fading: StoredFading,
  action: FadingAction,
  concept: FadingConcept | undefined,
  today: string,
  fresh: { sessionId: string; seed: number },
  traps: readonly FadingTrap[] = [],
): StoredFading {
  switch (action.action) {
    case "pick":
      return pickFadingConcept(fading, action.conceptId, today);
    case "drop":
      return dropFadingConcept(fading, action.conceptId);
    case "open":
      return openFadingSession(fading, concept!, today, fresh);
    case "read":
      return completeFadingReading(fading, action.conceptId, action.sessionId);
    case "miss":
      return reportFadingMiss(
        fading,
        concept!,
        action.sessionId,
        action.placement,
        traps,
      );
    case "step":
      return completeFadingStep(
        fading,
        concept!,
        action.sessionId,
        action.step,
        action.placements,
        { gaveUp: action.gaveUp, traps },
      );
    case "rate":
      return rateFadingSession(
        fading,
        concept!,
        action.sessionId,
        action.rating,
        today,
        action.requestId,
      );
    case "all-today":
      return setFadingAllToday(fading, today, action.on);
  }
}
