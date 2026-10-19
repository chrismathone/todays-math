/**
 * 시험지 만들기 «구성 조건»(W4 · Hi-fi 2)의 계산 — 창이 오른쪽에 보이는 «나뉠 모습»과 적용을 막는 것.
 *
 *   총 문항(비우면 행의 합) · 고정 행은 그대로, 나머지에 고르게 · 모자라도 다른 범위에서 채우지 않는다 ·
 *   난이도 «–»(지정 없음)과 0 은 다르다 · 어긋남은 한곳에서 말하고 [적용]을 끈다.
 */
import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_STEPS,
  emptyFormats,
  emptyLadder,
  formatIssue,
  ladderIssue,
  matchingStep,
  stepLadder,
  stepsSupported,
  planComposition,
  summarizeConditions,
  type ComposeDraft,
} from "@/components/exam-builder/conditionsPlan";

const LADDER = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;
const rows = [
  { scopeId: "s1", label: "해와 성질", count: 5, usable: 39 },
  { scopeId: "s2", label: "풀이", count: 8, usable: 48 },
  { scopeId: "s3", label: "활용", count: 5, usable: 5 },
];
const draft = (patch: Partial<ComposeDraft> = {}): ComposeDraft => ({
  total: null,
  ladder: emptyLadder(LADDER),
  recent: true,
  formats: emptyFormats(),
  mcFirst: true,
  fixed: { s2: true },
  ...patch,
});
const ladder = (values: Partial<Record<(typeof LADDER)[number], number>>) => ({
  ...emptyLadder(LADDER),
  ...values,
});

describe("나뉠 모습", () => {
  it("총 문항을 비우면 지금 표 그대로다 — 코드에 박힌 기본 수가 없다", () => {
    const plan = planComposition(draft(), rows, { ladder: LADDER, max: 100 });
    expect(plan.rows.map((row) => row.next)).toEqual([5, 8, 5]);
    expect(plan.total).toBe(18);
    expect(plan.block).toEqual([]);
  });

  it("총 문항을 정하면 고정 행은 그대로 두고 나머지에 고르게 나눈다", () => {
    const plan = planComposition(draft({ total: 20 }), rows, {
      ladder: LADDER,
      max: 100,
    });
    expect(plan.rows.map((row) => row.want)).toEqual([6, 8, 6]);
    // 활용은 5 뿐 — 다른 범위에서 채우지 않고 알린다
    expect(plan.rows.map((row) => row.next)).toEqual([6, 8, 5]);
    expect(plan.total).toBe(19);
    expect(plan.note.join(" ")).toMatch(/활용.*5문항뿐이라 1문항 모자랍니다/);
    expect(plan.note.join(" ")).toMatch(/다른 범위에서 채우지 않습니다/);
  });

  it("고정한 행의 합이 총 문항보다 크면 적용을 막고 까닭을 한곳에 적는다", () => {
    const plan = planComposition(draft({ total: 6 }), rows, {
      ladder: LADDER,
      max: 100,
    });
    expect(plan.block.join(" ")).toMatch(
      /고정한 행의 합\(8\)이 총 문항\(6\)보다 큽니다/,
    );
  });

  it("모든 행이 고정인데 총 문항이 다르면 나눌 행이 없다고 막는다", () => {
    const plan = planComposition(
      draft({ total: 20, fixed: { s1: true, s2: true, s3: true } }),
      rows,
      { ladder: LADDER, max: 100 },
    );
    expect(plan.block.join(" ")).toMatch(/나눌 행이 없습니다/);
  });

  it("출제 가능 수를 모르는 행은 모자람을 지어내지 않는다", () => {
    const plan = planComposition(
      draft({ total: 30 }),
      [{ scopeId: "s1", label: "해와 성질", count: 5 }],
      { ladder: LADDER, max: 100 },
    );
    expect(plan.rows[0].next).toBe(30);
    expect(plan.note).toEqual([]);
  });

  it("총 문항이 상한을 넘거나 0 이면 막는다", () => {
    expect(
      planComposition(draft({ total: 101 }), rows, { ladder: LADDER, max: 100 })
        .block,
    ).not.toEqual([]);
    expect(
      planComposition(draft({ total: 0 }), rows, { ladder: LADDER, max: 100 })
        .block,
    ).not.toEqual([]);
  });
});

describe("난이도 — «–»(지정 없음)과 0 은 다르다", () => {
  it("정한 칸의 합이 총 문항보다 크면 막는다", () => {
    const plan = planComposition(
      draft({ ladder: ladder({ 기본: 10, 응용: 10 }) }),
      rows,
      { ladder: LADDER, max: 100 },
    );
    expect(plan.block.join(" ")).toMatch(
      /난이도 합\(20\)이 총 문항\(18\)보다 큽니다/,
    );
  });

  it("모든 칸을 정했는데 합이 다르면 막는다 — 남는 자리를 받을 칸이 없다", () => {
    const plan = planComposition(
      draft({
        ladder: ladder({
          연산: 0,
          기본: 6,
          응용: 8,
          심화하: 2,
          심화중: 0,
          심화상: 0,
        }),
      }),
      rows,
      { ladder: LADDER, max: 100 },
    );
    expect(plan.block.join(" ")).toMatch(
      /난이도 합\(16\)이 총 문항\(18\)과 다릅니다/,
    );
  });

  it("빈 칸이 있으면 남는 자리는 그 칸들이 받는다고 알리고 적용한다", () => {
    const plan = planComposition(
      draft({ ladder: ladder({ 기본: 6, 응용: 8, 심화중: 0 }) }),
      rows,
      { ladder: LADDER, max: 100 },
    );
    expect(plan.block).toEqual([]);
    expect(plan.note.join(" ")).toMatch(/정하지 않은 4문항/);
  });

  it("표를 손으로 고친 뒤 합이 어긋나면 구성 전에 같은 말로 알린다", () => {
    expect(ladderIssue(ladder({ 기본: 6, 응용: 8 }), 19, LADDER)).toBeNull();
    expect(
      ladderIssue(
        { 연산: 0, 기본: 6, 응용: 8, 심화하: 4, 심화중: 0, 심화상: 0 },
        19,
        LADDER,
      ),
    ).toMatch(/난이도 합\(18\)이 총 문항\(19\)과 다릅니다/);
    expect(ladderIssue(ladder({ 기본: 20 }), 19, LADDER)).toMatch(
      /보다 큽니다/,
    );
  });
});

describe("요약 낱칸 넷", () => {
  it("총 문항 · 난이도 · 최근 출제 · 고정 행을 적는다", () => {
    const chips = summarizeConditions(
      {
        total: 18,
        ladder: ladder({ 기본: 6, 응용: 8, 심화하: 4, 심화중: 0 }),
        recent: true,
        formats: { ...emptyFormats(), 객관식: 12, 단답형: 6 },
        mcFirst: true,
      },
      { requested: 18, fixedRows: 1, recentDays: 14, ladder: LADDER },
    );
    expect(chips).toEqual({
      total: "18문항",
      ladder: "기본 6 · 응용 8 · 심화하 4 · 심화중 0",
      formats: "객관식 12 · 단답형 6 · 객관식 먼저",
      recent: "최근 14일 출제 뺌",
      fixed: "1행",
    });
  });

  it("총 문항을 안 정했거나 표가 달라졌으면 «행의 합»이라 적는다 · 난이도가 비면 «난이도 지정 없음»", () => {
    const chips = summarizeConditions(
      {
        total: 18,
        ladder: emptyLadder(LADDER),
        recent: false,
        formats: emptyFormats(),
        mcFirst: false,
      },
      { requested: 19, fixedRows: 0, recentDays: 14, ladder: LADDER },
    );
    expect(chips.total).toBe("행의 합 19문항");
    expect(chips.ladder).toBe("난이도 지정 없음");
    expect(chips.recent).toBe("최근 출제 포함");
    expect(chips.formats).toBe("형식 지정 없음");
  });
});

describe("M3 — 난이도 단계 · 형식", () => {
  it("단계는 고른 총 문항에 맞춰 칸을 채우고 합이 꼭 맞는다 · 4단계 25문항은 매쓰홀릭 10월 월말평가 꼴", () => {
    for (let step = 0; step < DIFFICULTY_STEPS.length; step += 1)
      for (const total of [5, 10, 18, 25, 30]) {
        const l = stepLadder(step, total, LADDER);
        expect(
          LADDER.reduce((sum, tier) => sum + (l[tier] ?? 0), 0),
          `${step + 1}단계 ${total}`,
        ).toBe(total);
        // 적은 수에서는 두 단계가 같은 칸으로 반올림될 수 있다 — 찾은 단계의 칸이 같기만 하면 된다.
        const found = matchingStep(l, total, LADDER);
        expect(found).not.toBeNull();
        expect(stepLadder(found!, total, LADDER)).toEqual(l);
      }
    expect(stepLadder(3, 25, LADDER)).toEqual({
      연산: 0,
      기본: 4,
      응용: 9,
      심화하: 9,
      심화중: 3,
      심화상: 0,
    });
  });

  it("단계는 쉬운 쪽에서 어려운 쪽으로 오른다(사다리의 평균 칸이 단계마다 커진다)", () => {
    const mean = (w: readonly number[]) =>
      w.reduce((sum, n, i) => sum + n * i, 0) / w.reduce((a, b) => a + b, 0);
    const means = DIFFICULTY_STEPS.map(mean);
    for (let i = 1; i < means.length; i += 1)
      expect(means[i]).toBeGreaterThan(means[i - 1]);
  });

  it("단계는 칸 이름으로 맞댄다 — 우리 사다리가 아니면 쓰지 않는다", () => {
    expect(stepsSupported(LADDER)).toBe(true);
    expect(stepsSupported(["기본", "심화"])).toBe(false);
    expect(stepLadder(3, 10, ["기본", "심화"])).toEqual({
      기본: 2,
      심화: null,
    });
  });

  it("손으로 고친 사다리는 어느 단계도 아니다(«직접»)", () => {
    const l = { ...stepLadder(2, 20, LADDER), 응용: 1 };
    expect(matchingStep(l, 20, LADDER)).toBeNull();
  });

  it("형식 합이 넘거나 세 칸을 다 정했는데 다르면 막는다 — 비운 칸이 있으면 남는 자리를 받는다", () => {
    const f = (v: Record<string, number>) => ({ ...emptyFormats(), ...v });
    expect(formatIssue(f({ 객관식: 19 }), 18)).toMatch(
      /형식 합\(19\)이 총 문항\(18\)보다/,
    );
    expect(formatIssue(f({ 객관식: 10, 단답형: 5, 서술형: 0 }), 18)).toMatch(
      /형식 합\(15\)이 총 문항\(18\)과 다릅니다/,
    );
    expect(formatIssue(f({ 객관식: 10 }), 18)).toBeNull();
    expect(formatIssue(emptyFormats(), 18)).toBeNull();
    const plan = planComposition(draft({ formats: f({ 객관식: 30 }) }), rows, {
      ladder: LADDER,
      max: 80,
    });
    expect(plan.block.join(" ")).toMatch(/형식 합/);
  });
});
