/**
 * 🔴 교과서 원문이 바뀌거나 잠기면 그 원문의 **지정 두 슬롯도 잠근다** — 적재 · 갱신 도구의 책임
 * (문제은행 P0 2026-10-14 · 수용 시나리오 4 «원문 갱신 시 적재 도구가 원문 · 지정 변형을 잠그거나 재검증하는지»).
 *
 * 이 계획(`designatedSlotLocks.ts`)을 `load-school-textbook.ts --refresh` · `hold-school-textbook.ts --hold` ·
 * `recover-held.ts` 교정이 같이 쓴다. 런타임(준비 상태 · 복습)에는 fingerprint 비교를 넣지 않는다 — 잠금이 그 몫이다.
 */
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  findDesignatedSlotRows,
  lockDesignatedSlotsArgs,
  planDesignatedSlotLocks,
  SLOT_LOCK_REASON,
  slotBreakingReason,
  type SlotSourceColumns,
} from "@/lib/import/schoolTextbook/designatedSlotLocks";
import { textbookSlotExternalId } from "@/lib/generator/textbookSlots";
import { textbookSlotReadiness } from "@/lib/generator/textbookSlots";
import { RETRY_CANDIDATE_SELECT } from "@/lib/tests/retryCandidates";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

const base: SlotSourceColumns = {
  content: "원문",
  answer: "3",
  solution: "풀이",
  directUseAllowed: true,
};

describe("원문의 바뀜이 대응을 깨는가", () => {
  it.each([
    [{ content: "고친 원문" }],
    [{ answer: "4" }],
    [{ solution: "다른 풀이" }],
    [{ solution: null }],
    [{ figureUrls: ["/figures/a.png"] }],
    [{ figureSvg: "<svg/>" }],
    [{ choiceFigureIndex: [0] }],
  ] as Partial<SlotSourceColumns>[][])(
    "글 · 정답 · 해설 · 그림이 바뀌면 깬다: %o",
    (patch) => {
      expect(slotBreakingReason(base, { ...base, ...patch })).toBe(
        SLOT_LOCK_REASON.changed,
      );
    },
  );

  it("원문이 잠기면 깬다 — 글이 같아도", () => {
    expect(slotBreakingReason(base, { ...base, directUseAllowed: false })).toBe(
      SLOT_LOCK_REASON.locked,
    );
  });

  it("푸는 것 · 그대로인 것 · 그림 칸의 생략과 빈 배열은 깨지 않는다", () => {
    expect(
      slotBreakingReason({ ...base, directUseAllowed: false }, base),
    ).toBeNull();
    expect(slotBreakingReason(base, { ...base })).toBeNull();
    expect(
      slotBreakingReason(base, {
        ...base,
        figureUrls: [],
        figureDims: [],
        figureSourceMm: [],
        choiceFigureIndex: [],
        figureSource: null,
        figureSvg: null,
      }),
    ).toBeNull();
  });
});

const row = (
  originId: string,
  slot: 1 | 2,
  patch: Partial<{
    id: string;
    externalId: string | null;
    originProblemId: string | null;
    source: string;
    directUseAllowed: boolean;
  }> = {},
) => ({
  id: `${originId}-${slot}`,
  externalId: textbookSlotExternalId(originId, slot),
  originProblemId: originId,
  source: "transformed",
  directUseAllowed: true,
  ...patch,
});

describe("잠글 지정 슬롯", () => {
  it("까닭이 있는 원문의 열린 지정 슬롯만 — 다른 원문 · 이미 잠긴 것 · 신분이 아닌 행은 그대로", () => {
    const locks = planDesignatedSlotLocks(new Map([["a", "바뀜"]]), [
      row("a", 1),
      row("a", 2, { directUseAllowed: false }),
      row("b", 1),
      row("a", 1, { id: "legacy", externalId: "textbook-recovery:a" }),
      row("a", 2, { id: "as-source", source: "school_textbook" }),
      row("a", 2, { id: "other-parent", originProblemId: "b" }),
      row("a", 1),
    ]);
    expect(locks).toEqual([
      {
        id: "a-1",
        externalId: "tb-retry-v1:a:1",
        originProblemId: "a",
        reason: "바뀜",
      },
    ]);
  });

  it("쓰기 조건은 열린 변형만 다시 건다(계획 뒤 바뀐 행은 건드리지 않는다)", () => {
    expect(
      lockDesignatedSlotsArgs([
        {
          id: "a-1",
          externalId: "tb-retry-v1:a:1",
          originProblemId: "a",
          reason: "x",
        },
      ]),
    ).toEqual({
      where: {
        id: { in: ["a-1"] },
        source: "transformed",
        directUseAllowed: true,
      },
      data: { directUseAllowed: false },
    });
  });
});

describe("대역 DB 에서 — 잠그면 준비 상태가 내려간다", () => {
  async function plant(patch: Record<string, unknown>) {
    // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니다.
    return db.problem.create({
      data: {
        userId: USER_TEACHER_ID,
        unitId: MOCK_UNITS[0].id,
        source: "school_textbook",
        content: "원문",
        answer: "3",
        solution: "풀이",
        difficulty: "기본",
        problemType: "계산",
        questionType: "단답형",
        reviewStatus: "approved",
        directUseAllowed: true,
        pool: "shared",
        figureUrls: [],
        figureSvg: null,
        figureDims: [],
        figureSourceMm: [],
        ...patch,
      } as never,
    });
  }

  it("원문이 바뀐 자리에서 2/2 → 0/2, 다른 원문의 슬롯은 2/2 그대로", async () => {
    const changed = await plant({});
    const kept = await plant({});
    for (const source of [changed, kept])
      for (const slot of [1, 2] as const)
        await plant({
          source: "transformed",
          originProblemId: source.id,
          externalId: textbookSlotExternalId(source.id, slot),
        });
    const readiness = async (id: string) =>
      textbookSlotReadiness(
        (await db.problem.findUnique({ where: { id } }))!,
        await db.problem.findMany({
          where: { originProblemId: id },
          select: RETRY_CANDIDATE_SELECT,
        }),
      ).ready;
    expect(await readiness(changed.id)).toBe(2);

    const reason = slotBreakingReason(changed, {
      ...changed,
      content: "고친 원문",
    })!;
    const locks = planDesignatedSlotLocks(
      new Map([[changed.id, reason]]),
      await findDesignatedSlotRows(db as never, [changed.id, kept.id]),
    );
    expect(locks).toHaveLength(2);
    // 대역에는 `updateMany` 가 없다 — 같은 조건(`where`)으로 고른 행에 같은 값(`data`)을 쓴다
    const args = lockDesignatedSlotsArgs(locks);
    const targets = await db.problem.findMany({
      where: args.where,
      select: { id: true },
    });
    for (const target of targets)
      await db.problem.update({
        where: { id: target.id },
        data: args.data as never,
      });
    expect(targets).toHaveLength(2);
    expect(await readiness(changed.id)).toBe(0);
    expect(await readiness(kept.id)).toBe(2);
    // 다시 돌려도 이미 잠긴 것은 계획에 안 든다(두 번 세지 않는다)
    expect(
      planDesignatedSlotLocks(
        new Map([[changed.id, reason]]),
        await findDesignatedSlotRows(db as never, [changed.id]),
      ),
    ).toEqual([]);
  });
});
