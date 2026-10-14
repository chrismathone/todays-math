/**
 * 🔴 교과서 원문의 **지정 두 슬롯** — 준비 상태(0/2 · 1/2 · 2/2)와 오답 복습(`planRetry`)이 **같은 술어**를 쓰는가.
 *
 * 문제은행 P0(2026-10-14 · goal-bank-arithmetic-brand §교과서 두 슬롯): «같은 원문·제외 조건에서
 * 2/2 ⇔ planRetry 부족 0 을 짝 시험으로 검증한다». 준비 화면이 복습과 다른 규칙을 쓰면
 * «2/2 라더니 복습지가 모자라다»가 원장의 종이에서야 드러난다.
 *
 * 그래서 사례 몇 개가 아니라 **씨앗으로 만든 무작위 행렬 전량**을 두 함수에 같이 넣는다.
 */
import { describe, expect, it } from "vitest";

import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { planRetry, type RetryCandidate } from "@/lib/generator/planRetry";
import { createSeededRandom } from "@/lib/generator/seededRandom";
import {
  parseTextbookSlotExternalId,
  textbookSlotCandidateWhere,
  textbookSlotExternalId,
  textbookSlotReadiness,
} from "@/lib/generator/textbookSlots";
import { textbookRetryExternalId } from "@/lib/import/schoolTextbook/retryPairPlan";

const origin = (id = "origin", unitId = "U1"): RetryCandidate => ({
  id,
  unitId,
  familyKey: `solo:${id}`,
  difficulty: "기본",
  directUseAllowed: true,
  source: "school_textbook",
  originProblemId: null,
  externalId: `school-textbook:${id}`,
  pool: "shared",
  reviewStatus: "approved",
  answer: "3",
});
const slotRow = (
  parent: RetryCandidate,
  slot: 1 | 2,
  patch: Partial<RetryCandidate> = {},
): RetryCandidate => ({
  id: `${parent.id}-${slot}`,
  unitId: parent.unitId,
  familyKey: parent.familyKey,
  difficulty: "기본",
  directUseAllowed: true,
  source: "transformed",
  originProblemId: parent.id,
  externalId: textbookSlotExternalId(parent.id, slot as 1 | 2),
  pool: "shared",
  reviewStatus: "approved",
  answer: "5",
  ...patch,
});

describe("슬롯 열쇠 — 한 함수가 만들고 한 함수가 읽는다", () => {
  it("적재기의 열쇠와 복습의 열쇠가 같은 글자다", () => {
    expect(textbookRetryExternalId("abc", 2)).toBe("tb-retry-v1:abc:2");
    expect(textbookSlotExternalId("abc", 1)).toBe("tb-retry-v1:abc:1");
  });

  it("열쇠를 거꾸로 읽는다 — 슬롯 1 · 2 밖과 다른 꼴은 슬롯이 아니다", () => {
    expect(parseTextbookSlotExternalId("tb-retry-v1:abc:1")).toEqual({
      originId: "abc",
      slot: 1,
    });
    for (const other of [
      "tb-retry-v1:abc:3",
      "tb-retry-v1::1",
      "textbook-recovery:abc",
      "school-textbook:abc",
      null,
      undefined,
      "",
    ])
      expect(parseTextbookSlotExternalId(other)).toBeNull();
  });

  it("후보 조회의 신분 조건은 출처 · 부모 · 열쇠 셋이다(자격은 부르는 쪽)", () => {
    expect(textbookSlotCandidateWhere(["a", "b"])).toEqual({
      source: "transformed",
      originProblemId: { in: ["a", "b"] },
      externalId: {
        in: [
          "tb-retry-v1:a:1",
          "tb-retry-v1:a:2",
          "tb-retry-v1:b:1",
          "tb-retry-v1:b:2",
        ],
      },
    });
  });
});

describe("준비 상태 — 0/2 · 1/2 · 2/2 와 그 까닭", () => {
  const o = origin();

  it("두 슬롯이 다 자격 있으면 2/2", () => {
    const result = textbookSlotReadiness(o, [slotRow(o, 1), slotRow(o, 2)]);
    expect(result).toMatchObject({ state: "ready", ready: 2, required: 2 });
    expect(result.slots.map((slot) => slot.problemId)).toEqual([
      "origin-1",
      "origin-2",
    ]);
  });

  it("슬롯 행이 없으면 0/2 — 일반 유사문항(같은 갈래 · 같은 차시)으로 채우지 않는다", () => {
    const sibling: RetryCandidate = {
      ...slotRow(o, 1),
      id: "sibling",
      source: "manual",
      originProblemId: null,
      externalId: null,
    };
    const result = textbookSlotReadiness(o, [sibling]);
    expect(result).toMatchObject({ state: "none", ready: 0 });
    expect(result.slots.map((slot) => slot.status)).toEqual([
      "missing",
      "missing",
    ]);
  });

  it.each([
    [{ reviewStatus: "rejected" }, "notApproved"],
    [{ reviewStatus: "pending" }, "notApproved"],
    [{ directUseAllowed: false }, "locked"],
    [{ answer: MISSING_ANSWER }, "noAnswer"],
    [{ pool: "private" }, "notShared"],
  ] as const)("하나가 출제 불가(%o)면 1/2 — 까닭의 열쇠 %s", (patch, code) => {
    const result = textbookSlotReadiness(o, [
      slotRow(o, 1, patch),
      slotRow(o, 2),
    ]);
    expect(result).toMatchObject({ state: "partial", ready: 1 });
    expect(result.slots[0]).toMatchObject({
      status: "ineligible",
      code,
      problemId: "origin-1",
    });
    expect(result.slots[0]!.reason).toEqual(expect.any(String));
  });

  it("다른 차시로 옮겨진 슬롯 · 제외한 슬롯은 자격이 있어도 준비가 아니다", () => {
    const result = textbookSlotReadiness(
      o,
      [slotRow(o, 1, { unitId: "U2" }), slotRow(o, 2)],
      { excludeIds: ["origin-2"] },
    );
    expect(result.slots.map((slot) => slot.status)).toEqual([
      "unitMismatch",
      "excluded",
    ]);
    expect(result.ready).toBe(0);
  });

  it("부모 · 출처 · 열쇠가 하나라도 다르면 이 원문의 슬롯이 아니다", () => {
    const result = textbookSlotReadiness(o, [
      slotRow(o, 1, { originProblemId: "other" }),
      slotRow(o, 1, { id: "as-source", source: "school_textbook" }),
      slotRow(o, 1, { id: "legacy", externalId: "textbook-recovery:origin" }),
      slotRow(o, 2, { id: "other-key", externalId: "tb-retry-v1:other:2" }),
    ]);
    expect(result.ready).toBe(0);
    expect(result.slots.map((slot) => slot.status)).toEqual([
      "missing",
      "missing",
    ]);
  });

  it("교과서 원문이 아니면 슬롯을 갖지 않는다", () => {
    const engine = { ...origin("engine"), source: "manual" as const };
    expect(
      textbookSlotReadiness(engine, [slotRow(engine, 1), slotRow(engine, 2)]),
    ).toMatchObject({ state: "notTextbook", ready: 0, slots: [] });
  });

  it("같은 행이 두 번 들어와도 한 번만 센다", () => {
    const row = slotRow(o, 1);
    expect(textbookSlotReadiness(o, [row, row]).ready).toBe(1);
  });
});

/** 행 하나의 무작위 변이 — 신분 · 자격 · 차시 · 제외의 모든 축을 흔든다. */
function randomRows(seed: string) {
  const rng = createSeededRandom(seed);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(rng() * items.length)]!;
  const o = origin("o", "U1");
  /** 한 번에 한 축만 흔든다 — 여러 축을 같이 흔들면 깨끗한 슬롯이 거의 안 나와 2/2 를 못 잰다. */
  const perturb: Array<(slot: 1 | 2) => Partial<RetryCandidate>> = [
    () => ({ unitId: "U2" }),
    () => ({ source: "school_textbook" }),
    () => ({ source: "manual" }),
    () => ({ originProblemId: "x" }),
    () => ({ originProblemId: null }),
    (slot) => ({ externalId: textbookSlotExternalId("x", slot) }),
    (slot) => ({ externalId: textbookSlotExternalId("o", slot === 1 ? 2 : 1) }),
    () => ({ externalId: "textbook-recovery:o" }),
    () => ({ externalId: null }),
    () => ({ directUseAllowed: false }),
    () => ({ reviewStatus: "pending" }),
    () => ({ reviewStatus: "rejected" }),
    () => ({ pool: "private" }),
    () => ({ answer: MISSING_ANSWER }),
  ];
  const rows: RetryCandidate[] = [];
  const count = Math.floor(rng() * 5);
  for (let index = 0; index < count; index++) {
    const slot = pick([1, 2] as const);
    const row = slotRow(o, slot, {
      id: `row-${index}`,
      ...(rng() < 0.4 ? pick(perturb)(slot) : {}),
    });
    // `problem.external_id` 는 DB 에서 유일하다 — 같은 열쇠의 둘째 행은 실제로 있을 수 없다.
    if (row.externalId && rows.some((r) => r.externalId === row.externalId))
      continue;
    rows.push(row);
  }
  const excludeIds = rows.filter(() => rng() < 0.2).map((row) => row.id);
  return { o, rows, excludeIds };
}

describe("🔴 짝 — 준비 상태 2/2 ⇔ 복습 부족 0 (같은 원문 · 같은 제외)", () => {
  it("무작위 행렬 3,000개에서 자격 있는 슬롯 수 = 복습이 실은 자리 수", () => {
    let full = 0;
    let partial = 0;
    for (let n = 0; n < 3000; n++) {
      const { o, rows, excludeIds } = randomRows(`pair-${n}`);
      const readiness = textbookSlotReadiness(o, rows, { excludeIds });
      const plan = planRetry({
        wrong: [o],
        pool: rows,
        excludeIds,
        seed: `seed-${n}`,
      });
      expect(readiness.ready === 2).toBe(plan.shortfall === 0);
      expect(readiness.ready).toBe(plan.picked.length);
      expect(
        readiness.slots
          .filter((slot) => slot.status === "ready")
          .map((slot) => slot.problemId)
          .sort(),
      ).toEqual(plan.picked.map((seat) => seat.problem.id).sort());
      if (readiness.ready === 2) full += 1;
      else if (readiness.ready === 1) partial += 1;
    }
    // 표본이 세 상태를 다 건드렸는지 — 한 상태만 나오는 행렬은 짝을 못 잰다.
    expect(full).toBeGreaterThan(30);
    expect(partial).toBeGreaterThan(100);
  });

  it("교과서 오답 둘이 서로의 변형 id 를 주장해도 둘이 같은 답을 낸다", () => {
    const a = origin("a");
    const b = origin("b");
    const rows = [slotRow(a, 1, { id: "b" }), slotRow(a, 2)];
    const plan = planRetry({ wrong: [a, b], pool: rows, seed: "pair" });
    // 복습의 «다른 오답» 은 준비 상태에서 제외 조건으로 넘긴다.
    const readiness = textbookSlotReadiness(a, rows, { excludeIds: ["b"] });
    expect(readiness.ready).toBe(
      plan.picked.filter((seat) => seat.wrongProblemId === "a").length,
    );
    expect(readiness.slots[0]!.status).toBe("excluded");
  });
});
