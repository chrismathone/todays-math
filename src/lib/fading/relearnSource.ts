import type { FadingAction } from "@/contracts/fadingApi.contract";
import type {
  FadingRelearnApplied,
  FadingRelearnAttempt,
  FadingRelearnJudgement,
  FadingRelearnObservation,
  FadingRelearnQueue,
  FadingRelearnResult,
} from "@/contracts/fadingRelearn.contract";
import { FadingSourceError, type FadingSource } from "./source";

/**
 * 화면이 단기 재학습 대기열을 얻는 길 — `FadingSource` 와 **따로 선** 능력이다(`fadingRelearn.contract.ts`).
 *
 * 뒤에 서는 것은 둘이다 — 학생 API 를 부르는 것(화면 쪽이 짓는다 · `GET/POST /api/learn/fading/relearn`)과,
 * 서버 없이 같은 규칙으로 도는 `createLocalFadingRelearnSource`(`relearnLocal.ts`). 실패는 `FadingSourceError` 그대로다 —
 * `CONFLICT`(409)는 «지금은 할 수 없는 일»(확인할 때가 아니다 · 내용이나 일정이 바뀌었다 · 대조가 남았다)이고 아무것도 바뀌지 않았으니 `queue()` 를 다시 읽는다.
 */
export type FadingRelearnSource = {
  /** 대기열 — 서버의 지금(`now`) · 지금 확인할 것 · 기다리는 것 · 그 명제의 내용. */
  queue(): Promise<FadingRelearnQueue>;
  /** 풀이에서 생긴 증거 하나를 알린다 — 서버가 그 학생의 기록에서 다시 확인하고 대기열에 넣는다. 같은 증거는 한 번만 센다. */
  record(
    observation: FadingRelearnObservation,
  ): Promise<{ queue: FadingRelearnQueue; applied: FadingRelearnApplied }>;
  /** 준비된 확인 하나에 답을 낸다 — 🔴 맞다 · 틀리다와 기준안을 보이기 **전에** 부른다. */
  grade(
    attempt: FadingRelearnAttempt,
  ): Promise<{ queue: FadingRelearnQueue; result: FadingRelearnResult }>;
  /** 결과가 `judging` 이면 — 못 알아본 글마다 «같은 뜻 / 다름»을 골라 판정을 낸다. */
  judge(
    judgement: FadingRelearnJudgement,
  ): Promise<{ queue: FadingRelearnQueue; result: FadingRelearnResult }>;
};

/**
 * 풀이의 행동(또는 그 꼴의 값)에서 대기열에 알릴 증거를 짓는다 — 알릴 것이 없는 행동이면 `null`.
 * - `step`(2 ~ 4단계) → 그 넣기 차례 그대로. 🔴 **마친 단계가 아니어도 된다** — 화면은 틀리게 넣은 그 자리에서, 지금까지 넣은 차례를
 *   `step` 꼴로 지어 넣으면 된다(본 행동으로 보내지 않는다). 1분은 그때부터 잰다.
 *   자판으로 푸는 단계에서 카드 하나를 «아직 모르겠어요»로 넘겼으면 `extra.gaveUpCards` 에 그 명제의 id 를 준다.
 * - `miss`(4단계에서 틀린 것 하나) → 그 넣기 하나의 차례. 본 행동이 끝난 뒤에 부른다.
 * - `rate` → 그 평가의 요청 번호. 본 행동이 끝난 뒤에 부른다.
 * 같은 증거를 여러 번 알려도 된다 — 서버가 풀이 × 단계 × 명제로 한 번만 센다.
 */
export function fadingRelearnObservationOf(
  action: FadingAction,
  extra: { gaveUpCards?: readonly string[] } = {},
): FadingRelearnObservation | null {
  if (action.action === "step")
    return {
      kind: "step",
      conceptId: action.conceptId,
      sessionId: action.sessionId,
      step: action.step,
      placements: action.placements,
      ...(action.gaveUp ? { gaveUp: true } : {}),
      ...(extra.gaveUpCards?.length
        ? { gaveUpCards: [...extra.gaveUpCards] }
        : {}),
    };
  if (action.action === "miss")
    return {
      kind: "step",
      conceptId: action.conceptId,
      sessionId: action.sessionId,
      step: 4,
      placements: [action.placement],
    };
  // 4단계 카드 하나의 «아직 모르겠어요»(D2) — 그 단계의 지금까지의 차례와 넘긴 카드 하나. 같은 풀이 × 단계 × 명제는 서버가 한 번만 센다.
  if (action.action === "give-up-card")
    return {
      kind: "step",
      conceptId: action.conceptId,
      sessionId: action.sessionId,
      step: 4,
      placements: action.placements,
      gaveUpCards: [action.propositionId],
    };
  if (action.action === "rate")
    return {
      kind: "rated",
      conceptId: action.conceptId,
      requestId: action.requestId,
    };
  return null;
}

/**
 * `FadingSource` 를 감싸, 증거가 되는 행동(`step` · `miss` · `give-up-card` · `rate`)이 끝날 때마다 대기열을 다시 읽어 `onQueue` 로 준다 —
 * 화면이 따로 챙길 것이 없다. 🔴 등록은 **서버가 본 행동과 한 저장으로** 한다(D3 · `compose.ts`) — 이 싸개는 증거를 따로 보내지 않는다.
 * 전에는 본 행동 뒤에 `/relearn` 으로 증거를 따로 보냈고, 그 요청이 끊기면 증거는 메모리에만 남아 새로고침에 사라졌다.
 * - 대기열 읽기의 실패는 **본 행동을 실패시키지 않는다**(풀이도 등록도 이미 저장됐다 — 돌아오면 `queue()` 가 회복한다). `onError` 로만 알리고
 *   본 행동을 다시 보내지 않는다. 404 는 쓰는 길이 닫혀 있다는 뜻이라 그 뒤로는 읽지 않는다.
 * - 🔴 읽기가 `STUDENT_CHANGED`(화면을 연 학생이 아니다 — D1)로 실패하면 그 종료가 먼저다 — 본 행동의 결과도 돌려주지 않고 그 실패를 던진다
 *   (늦게 온 행동의 결과를 화면이 쓰지 않게).
 * 받은 원천의 다른 길(`dailyPlan` 같은 선택 길 포함)은 그대로 둔다.
 */
export function withFadingRelearn<S extends FadingSource>(
  source: S,
  relearn: Pick<FadingRelearnSource, "queue">,
  options: {
    onQueue?: (queue: FadingRelearnQueue) => void;
    onError?: (error: unknown) => void;
  } = {},
): S {
  let closed = false;
  return {
    ...source,
    async act(action: FadingAction) {
      const state = await source.act(action);
      if (closed || !fadingRelearnObservationOf(action)) return state;
      try {
        // 받는 쪽(`onQueue`)이 없어도 읽는다 — 선택 호출의 인수 자리에 두면 받는 쪽이 없을 때 읽지도 않는다.
        const queue = await relearn.queue();
        options.onQueue?.(queue);
      } catch (error) {
        if (error instanceof FadingSourceError) {
          if (error.code === "STUDENT_CHANGED") throw error;
          if (error.code === "NOT_FOUND") closed = true;
        }
        options.onError?.(error);
      }
      return state;
    },
  };
}
