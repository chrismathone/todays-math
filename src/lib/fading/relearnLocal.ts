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
 * 증거는 옆에 선 `createLocalFadingSource`(`local.ts`)의 저장 칸에서 읽는다(`main.snapshot()` — 읽기만 한다 · 그 칸을 바꾸지 않는다).
 * 대기열은 이 값이 사는 동안의 메모리다. 다시 열 때 이어 보려면 `snapshot()` 을 받아 두었다가 `relearn` 으로 넘긴다.
 * 시계는 넣어 준다(`now` — 밀리초 · UTC). 안 주면 기기의 시계다. 서버 문은 보지 않는다 — 학생 기록에 쓰지 않는다.
 */

const NOT_FOUND = "개념을(를) 찾을 수 없습니다.";
const INVALID = "요청 값이 올바르지 않습니다.";

export type LocalFadingRelearnSource = FadingRelearnSource & {
  /** 지금의 대기열 저장 칸(사본) — 새로 고침을 흉내 낼 때 `relearn` 으로 다시 넘긴다. */
  snapshot(): StoredFadingRelearn;
};

export function createLocalFadingRelearnSource(input: {
  /** 풀이가 도는 원천 — 그 저장 칸(열린 풀이 · 평가 영수증 · 진단)을 증거로 읽는다. */
  main: { snapshot(): StoredFading };
  /** 이 자리에서 쓸 개념 전부 — `main` 에 준 것과 같은 것. */
  concepts: readonly FadingConcept[];
  /** 개념의 열쇠 → 함정 칩 — `main` 에 준 것과 같은 것(풀이 토큰이 함정까지 덮는다). */
  traps?: Readonly<Record<string, readonly FadingTrap[]>>;
  /** 지금(밀리초 · UTC) — 시험과 미리 보기가 시각을 옮긴다. */
  now?: () => number;
  /** 처음 대기열 — 안 주면 비어 있다. */
  relearn?: StoredFadingRelearn;
}): LocalFadingRelearnSource {
  const byId = new Map(input.concepts.map((c) => [c.id, c]));
  const trapsOf = (concept: FadingConcept) => input.traps?.[concept.id] ?? [];
  const clock = input.now ?? (() => Date.now());
  let relearn: StoredFadingRelearn | undefined = input.relearn
    ? structuredClone(input.relearn)
    : undefined;

  /** 증거의 칸에 지금의 대기열을 얹은 학생 칸 — 규칙은 이 한 값만 본다. */
  const fading = (): StoredFading => {
    const main = input.main.snapshot();
    delete main.relearn;
    return relearn ? { ...main, relearn } : main;
  };
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
    const before = fading();
    let next: ReturnType<typeof applyFadingRelearnAction>;
    try {
      next = applyFadingRelearnAction(
        before,
        action,
        concept,
        now,
        trapsOf(concept),
      );
    } catch (error) {
      if (error instanceof FadingConflict)
        throw new FadingSourceError("CONFLICT", error.message, 409);
      throw error;
    }
    if (next.fading !== before) relearn = next.fading.relearn;
    return fadingRelearnActionResponseSchema.parse({
      data: {
        queue: view(next.fading, now),
        applied: next.applied,
        result: next.result,
      },
    }).data;
  }

  return {
    snapshot: () => structuredClone(relearn ?? emptyFadingRelearn()),
    async queue() {
      return view(fading(), clock());
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
