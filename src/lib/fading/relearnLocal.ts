import type {
  StoredFading,
  StoredFadingRelearn,
} from "@/contracts/fading.contract";
import {
  fadingRelearnActionResponseSchema,
  fadingRelearnActionSchema,
  fadingRelearnQueueSchema,
  type FadingRelearnAction,
  type FadingRelearnQueue,
} from "@/contracts/fadingRelearn.contract";
import type { FadingTrap } from "./chips";
import type { FadingConcept } from "./concepts";
import type { LocalFadingSource } from "./local";
import {
  applyFadingRelearnAction,
  emptyFadingRelearn,
  fadingRelearnActionConceptId,
  fadingRelearnQueueView,
} from "./relearn";
import type { FadingRelearnSource } from "./relearnSource";
import { FadingSourceError } from "./source";
import { FadingConflict } from "./state";

/**
 * 서버 없이 도는 단기 재학습 대기열 — 학생 API 와 **같은 규칙 · 같은 꼴**의 답을 낸다(`applyFadingRelearnAction` · `fadingRelearnQueueView` 그대로).
 *
 * 🔴 저장 칸은 옆에 선 `createLocalFadingSource`(`local.ts`)의 **같은 메모리 칸**이다(D3 · 2026-10-16) — 서버에서 본 행동과 재학습 등록이
 * 한 기록의 `fading` 칸에 함께 적히는 것과 같다. 본 행동에 얹힌 등록(`compose.ts`)을 이 대기열이 바로 읽고, 이 대기열의 확인 · 대조는
 * `main.change` 로 그 칸의 `relearn` 만 바꾼다. 전처럼 대기열을 따로 들고 본 칸 위에 얹지 않는다(그러면 본 행동의 등록이 안 보인다).
 * 시계는 넣어 준다(`now` — 밀리초 · UTC) — 주면 본 원천의 시계도 이것으로 맞춘다(둘이 같은 시각을 봐야 1분 · 5분이 맞는다). 안 주면 본 원천의 시계다.
 * 서버 문은 보지 않는다 — 학생 기록에 쓰지 않는다. 다시 열 때 이어 보려면 `main.snapshot()`(대기열까지 든 칸)으로 본 원천을 다시 짓는다.
 */

const NOT_FOUND = "개념을(를) 찾을 수 없습니다.";
const INVALID = "요청 값이 올바르지 않습니다.";

export type LocalFadingRelearnSource = FadingRelearnSource & {
  /** 지금의 대기열 저장 칸(사본) — 본 원천의 칸에 든 `relearn` 이다. */
  snapshot(): StoredFadingRelearn;
};

export function createLocalFadingRelearnSource(input: {
  /** 풀이가 도는 원천 — 그 저장 칸(열린 풀이 · 평가 영수증 · 진단 · 대기열)을 같이 쓴다. */
  main: Pick<LocalFadingSource, "snapshot" | "change" | "now" | "setNow">;
  /** 이 자리에서 쓸 개념 전부 — `main` 에 준 것과 같은 것. */
  concepts: readonly FadingConcept[];
  /** 개념의 열쇠 → 함정 칩 — `main` 에 준 것과 같은 것(풀이 토큰이 함정까지 덮는다). */
  traps?: Readonly<Record<string, readonly FadingTrap[]>>;
  /** 지금(밀리초 · UTC) — 시험과 미리 보기가 시각을 옮긴다. 주면 본 원천의 시계도 이것이 된다. */
  now?: () => number;
  /** 처음 대기열 — 주면 본 원천의 칸에 넣는다(옛 저장 칸을 이어 보는 시험용). 안 주면 본 원천의 칸 그대로. */
  relearn?: StoredFadingRelearn;
}): LocalFadingRelearnSource {
  const byId = new Map(input.concepts.map((c) => [c.id, c]));
  const trapsOf = (concept: FadingConcept) => input.traps?.[concept.id] ?? [];
  const { main } = input;
  if (input.now) main.setNow(input.now);
  const clock = () => main.now();
  if (input.relearn) {
    const seeded = structuredClone(input.relearn);
    main.change((fading) => ({ ...fading, relearn: seeded }));
  }

  const view = (state: StoredFading, now: number): FadingRelearnQueue =>
    fadingRelearnQueueSchema.parse(
      fadingRelearnQueueView({ fading: state, concepts: byId, now, trapsOf }),
    );

  async function act(raw: FadingRelearnAction) {
    const parsed = fadingRelearnActionSchema.safeParse(raw);
    if (!parsed.success)
      throw new FadingSourceError("VALIDATION_ERROR", INVALID, 400);
    const action = parsed.data;
    const concept = byId.get(fadingRelearnActionConceptId(action));
    if (!concept) throw new FadingSourceError("NOT_FOUND", NOT_FOUND, 404);
    const now = clock();
    const held: { done?: ReturnType<typeof applyFadingRelearnAction> } = {};
    try {
      // 서버의 라우트처럼 한 전이로 — 규칙은 그 칸에서 `relearn` 만 바꾼다.
      main.change((before) => {
        held.done = applyFadingRelearnAction(
          before,
          action,
          concept,
          now,
          trapsOf(concept),
        );
        return held.done.fading;
      });
    } catch (error) {
      if (error instanceof FadingConflict)
        throw new FadingSourceError("CONFLICT", error.message, 409);
      throw error;
    }
    return fadingRelearnActionResponseSchema.parse({
      data: {
        queue: view(held.done!.fading, now),
        applied: held.done!.applied,
        result: held.done!.result,
      },
    }).data;
  }

  return {
    snapshot: () =>
      structuredClone(main.snapshot().relearn ?? emptyFadingRelearn()),
    async queue() {
      return view(main.snapshot(), clock());
    },
    async record(observation) {
      const done = await act({ action: "record", observation });
      return { queue: done.queue, applied: done.applied! };
    },
    async grade(attempt) {
      const done = await act({ action: "grade", attempt });
      return { queue: done.queue, result: done.result! };
    },
    async judge(judgement) {
      const done = await act({ action: "judge", judgement });
      return { queue: done.queue, result: done.result! };
    },
  };
}
