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
  if (action.action === "rate")
    return {
      kind: "rated",
      conceptId: action.conceptId,
      requestId: action.requestId,
    };
  return null;
}

/** 다시 보낼 증거를 쌓아 두는 수 — 연결이 끊긴 동안의 것. */
const OUTBOX_MAX = 8;

/**
 * `FadingSource` 를 감싸, 풀이의 행동이 끝날 때마다 그 증거를 대기열에 알린다 — 화면이 따로 챙길 것이 없다.
 * - 대기열 쪽의 실패는 **본 행동을 실패시키지 않는다**(풀이는 이미 저장됐다). `onError` 로만 알린다.
 * - 연결이 끊겨 못 보낸 증거는 쌓아 두었다가 다음 행동 때 먼저 다시 보낸다(여덟 개까지). 서버가 거절한 것(409 · 404 · 400)은 버린다 —
 *   다시 보내도 같은 답이다. 404 는 쓰는 길이 닫혀 있다는 뜻이라 그 뒤로는 알리지 않는다.
 * - 대기열이 바뀌면 `onQueue` 로 새 대기열을 준다.
 * 받은 원천의 다른 길(`dailyPlan` 같은 선택 길 포함)은 그대로 둔다.
 */
export function withFadingRelearn<S extends FadingSource>(
  source: S,
  relearn: Pick<FadingRelearnSource, "record">,
  options: {
    onQueue?: (queue: FadingRelearnQueue) => void;
    onError?: (error: unknown) => void;
  } = {},
): S {
  let outbox: FadingRelearnObservation[] = [];
  let closed = false;
  const flush = async () => {
    const sending = outbox;
    outbox = [];
    for (const [i, observation] of sending.entries()) {
      if (closed) return;
      try {
        // 받는 쪽(`onQueue`)이 없어도 알린다 — 선택 호출의 인수 자리에 두면 받는 쪽이 없을 때 보내지도 않는다.
        const { queue } = await relearn.record(observation);
        options.onQueue?.(queue);
      } catch (error) {
        const code = error instanceof FadingSourceError ? error.code : null;
        if (code === "NOT_FOUND") closed = true;
        // 응답을 못 받은 것만 남긴다 — 이번 것과 아직 안 보낸 것을 차례 그대로.
        else if (code === "OFFLINE" || code === "UNKNOWN" || code === null) {
          outbox = [...sending.slice(i), ...outbox].slice(-OUTBOX_MAX);
          options.onError?.(error);
          return;
        }
        options.onError?.(error);
      }
    }
  };
  return {
    ...source,
    async act(action: FadingAction) {
      const state = await source.act(action);
      const observation = fadingRelearnObservationOf(action);
      if (observation && !closed) {
        outbox = [...outbox, observation].slice(-OUTBOX_MAX);
        await flush();
      }
      return state;
    },
  };
}
