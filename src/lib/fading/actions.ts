import type { StoredFading } from "@/contracts/fading.contract";
import type { FadingAction } from "@/contracts/fadingApi.contract";
import type { FadingTrap } from "./chips";
import type { FadingConcept } from "./concepts";
import { fadingContentKey, fadingSessionToken } from "./contentKey";
import {
  FadingConflict,
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

/** 열린 풀이의 내용이 화면이 받은 것과 다를 때 — 화면은 이 409 를 받고 상태를 다시 읽는다. */
export const FADING_CONTENT_CHANGED =
  "풀이 내용이 바뀌어 화면을 다시 불러왔습니다.";

/**
 * 화면이 보낸 풀이 번호(토큰 — `contentKey.ts`)를 저장된 번호로 바꾼다.
 * 열린 풀이의 개념인데 지금 내용의 토큰이 아니면 받지 않는다 — 은행의 문장 · 함정 표가 그 뒤에 바뀌었거나, 토큰 이전의 화면이
 * 저장 번호를 보낸 것이다. 409 를 받은 화면은 상태를 다시 읽어 지금 내용 · 같은 풀이 · 같은 씨앗으로 이어 간다(서 있는 단계 · 틀림은 그대로).
 * 다른 개념이거나 열린 풀이가 없으면 받은 번호를 그대로 넘긴다 — 상태 함수가 지금처럼 «열려 있지 않습니다»로 답한다.
 */
function storedSessionId(
  fading: StoredFading,
  conceptId: string,
  sessionId: string,
  concept: FadingConcept | undefined,
  traps: readonly FadingTrap[],
): string {
  const session = fading.session;
  if (!session || !concept || session.conceptId !== conceptId) return sessionId;
  if (
    sessionId ===
    fadingSessionToken(session.id, fadingContentKey(concept, traps))
  )
    return session.id;
  throw new FadingConflict(FADING_CONTENT_CHANGED);
}

/**
 * `fresh` 는 풀이를 새로 열 때 쓰는 번호와 칩 차례의 씨앗 — 부르는 쪽이 한 번만 짓는다(저장이 다시 시도돼도 같은 값).
 * `traps` 는 그 개념의 함정 칩이다 — 🔴 화면에 내려보낸 것과 **같은 것**을 넘긴다. 칩의 번호는 묶음 안의 자리라, 함정이 하나 들고 나면
 * 화면이 보낸 번호가 다른 칩을 가리킨다. 그래서 풀이 번호는 그 내용의 토큰이다(`storedSessionId`).
 * `options.cards` 는 서버의 하위 문(`MATH_FADING_CARDS`)이다 — 켜져 있으면 **새로 여는** 풀이가 카드 풀이다(열린 풀이는 연 때의 방식 그대로).
 * 꺼져 있으면 카드 풀이의 칸을 쓰지 않는다(이미 카드 풀이로 열린 풀이를 이어 갈 때만 쓴다).
 */
export function applyFadingAction(
  fading: StoredFading,
  action: FadingAction,
  concept: FadingConcept | undefined,
  today: string,
  fresh: { sessionId: string; seed: number },
  traps: readonly FadingTrap[] = [],
  options: { cards?: boolean } = {},
): StoredFading {
  const cards = options.cards === true;
  const stored = (ref: { conceptId: string; sessionId: string }) =>
    storedSessionId(fading, ref.conceptId, ref.sessionId, concept, traps);
  switch (action.action) {
    case "pick":
      return pickFadingConcept(fading, action.conceptId, today);
    case "drop":
      return dropFadingConcept(fading, action.conceptId);
    case "open":
      return openFadingSession(fading, concept!, today, fresh, { cards });
    case "read":
      return completeFadingReading(fading, action.conceptId, stored(action), {
        concept,
        seen: action.seen,
      });
    case "miss":
      return reportFadingMiss(
        fading,
        concept!,
        stored(action),
        action.placement,
        traps,
      );
    case "step":
      return completeFadingStep(
        fading,
        concept!,
        stored(action),
        action.step,
        action.placements,
        { traps, gaveUp: action.gaveUp, sure: action.sure },
      );
    case "rate":
      // 이미 적용한 평가의 되풀이는 토큰보다 먼저 본다 — 풀이가 닫힌 뒤에 와도 영수증으로 답한다.
      if (fading.receipts.some((r) => r.requestId === action.requestId))
        return fading;
      return rateFadingSession(
        fading,
        concept!,
        stored(action),
        action.rating,
        today,
        action.requestId,
        { judged: action.judged },
      );
    case "all-today":
      return setFadingAllToday(fading, today, action.on);
  }
}
