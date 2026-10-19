/**
 * AI 모델 비교 하네스(`scripts/qa/ai-model-bench/`) — 실호출 없이 채점 · 비용 · 예산 · 대체 경로를 잠근다.
 */
import { describe, expect, it } from "vitest";
import { ARMS, deepseekPeak, type Arm } from "../../../scripts/qa/ai-model-bench/arms";
import { estimate, runBench, table } from "../../../scripts/qa/ai-model-bench/bench";
import { Budget, costOf, maximumTextCallCost } from "../../../scripts/qa/ai-model-bench/cost";
import {
  coverage,
  countSlashFractions,
  iou,
  matchAnswer,
  matchBoxes,
  renderCheck,
  textSimilarity,
} from "../../../scripts/qa/ai-model-bench/grade";
import type { Caller } from "../../../scripts/qa/ai-model-bench/providers";
import type { Task } from "../../../scripts/qa/ai-model-bench/task";

describe("정답 대조", () => {
  it.each([
    ["③", "③", "same"],
    ["$③$", "③", "same"],
    ["③", "④", "differs"],
    ["$\\dfrac{15}{4}$", "$\\frac{15}{4}$", "same"],
    ["1+√5", "$1+\\sqrt{5}$", "same"],
    ["$a=2,~b=2$", "$a=2$, $b=2$", "same"],
    ["$x=3$", "3", "same"],
    ["3.0", "3", "same"],
    ["", "3", "empty"],
  ])("%s 대 %s → %s", (model, truth, expected) => {
    expect(matchAnswer(model, truth)).toBe(expected);
  });
});

describe("렌더 · 글 유사도 · 상자", () => {
  it.each([
    ["$a/6$ · $-1/12(a-12)^2$", 2],
    ["$(a+b)/(c-d)$ · $1/2/3$ · $$12 / 34$$", 4],
    ["$\\frac{\\hat{p}-p}{\\sqrt{\\hat{p}(1-\\hat{p})/n}}$", 1],
    ["$\\frac{1}{2}$ · $\\left(\\frac{a}{6}\\right)x$", 0],
    ["날짜 10/19, 문서 a/b, \\$1/2", 0],
  ])("수식 안의 빗금 분수만 센다: %s", (text, expected) => {
    expect(countSlashFractions(text)).toBe(expected);
  });
  it("KaTeX 실패 신호와 $ 짝을 센다", () => {
    expect(renderCheck("$\\frac{1}{2}$ 이다")).toEqual({ renderFail: 0, dollarOdd: false });
    expect(renderCheck("$\\notacommand{1}$").renderFail).toBe(1);
    expect(renderCheck("$540\\text{ cm}^2}$").renderFail).toBe(1);
    expect(renderCheck("값은 $3").dollarOdd).toBe(true);
  });

  it("표기만 다른 글은 같다고 본다", () => {
    expect(textSimilarity("$32\\text{ cm}$이고", "$32 cm$이고")).toBe(1);
    expect(textSimilarity("점 $\\mathrm{G}$가[그림1]", "점 $G$가")).toBe(1);
    expect(textSimilarity("가나다", "가나라")).toBeCloseTo(2 / 3);
  });

  it("IoU · 덮음 · 짝짓기", () => {
    const a = { left: 0, top: 0, width: 100, height: 100 };
    expect(iou(a, a)).toBe(1);
    expect(iou(a, { left: 50, top: 0, width: 100, height: 100 })).toBeCloseTo(1 / 3);
    expect(coverage(a, { left: 0, top: 0, width: 200, height: 200 })).toBe(1);
    expect(coverage(a, { left: 0, top: 0, width: 50, height: 100 })).toBe(0.5);
    const m = matchBoxes([a, { left: 500, top: 500, width: 10, height: 10 }], [a, { left: 900, top: 0, width: 10, height: 10 }]);
    expect(m.matched).toHaveLength(1);
    expect(m.missed).toBe(1);
    expect(m.extra).toBe(1);
  });
});

describe("비용", () => {
  it.each([-1, NaN, Infinity])("잘못된 예산 %s는 거부한다", (limit) => {
    expect(() => new Budget(limit)).toThrow("예산");
  });

  it("최대 출력·입력 바이트·호출 중 혼잡 시간 전환으로 비용을 확보한다", () => {
    const arm = ARMS["deepseek-v4-pro@16k"]!;
    const at = new Date("2026-10-19T00:59:00Z");
    expect(maximumTextCallCost(arm, "한글", at)).toBeCloseTo(
      costOf(arm, { input: 1030, cachedInput: 0, output: 16000 }, new Date("2026-10-19T01:00:00Z")), 10,
    );
  });
  it("캐시 · 혼잡 시간을 반영한다", () => {
    const arm = ARMS["deepseek-flash"]!;
    const usage = { input: 1_000_000, cachedInput: 0, output: 1_000_000 };
    const offPeak = new Date("2026-10-18T12:00:00Z"); // 일요일
    const peak = new Date("2026-10-19T02:00:00Z"); // 월 02시 UTC
    expect(deepseekPeak(offPeak)).toBe(false);
    expect(deepseekPeak(peak)).toBe(true);
    expect(costOf(arm, usage, offPeak)).toBeCloseTo(0.75);
    expect(costOf(arm, usage, peak)).toBeCloseTo(1.5);
    expect(costOf(arm, { input: 1_000_000, cachedInput: 1_000_000, output: 0 }, offPeak)).toBeCloseTo(0.003);
  });
});

// 실호출 없는 가짜 작업 — 응답 글이 곧 답
type Item = { id: string; truth: string };
const fakeTask: Task<Item> = {
  name: "fake",
  vision: false,
  expectedOutputTokens: 100,
  sample: async () => [],
  prompt: () => "지시문",
  async runOne(item, arm, call) {
    const out = await call(arm, { prompt: "지시문" });
    return { finish: out.finish, raw: out.text, score: { match: out.finish === "stop" && out.text ? matchAnswer(out.text, item.truth) : "empty" } };
  },
  needsFallback: (r) => r.finish !== "stop" || r.score.match === "empty",
  summarize: (records) => ({ 문항: records.length, 같음: records.filter((r) => r.score.match === "same").length }),
};
const items: Item[] = [
  { id: "a", truth: "1" },
  { id: "b", truth: "2" },
  { id: "c", truth: "3" },
];
const usage = { input: 1000, cachedInput: 0, output: 1000 };

describe("실행기", () => {
  const strictArm: Arm = { ...ARMS["deepseek-flash@16k"]!, price: { input: 0, cachedInput: 0, output: 1, source: "test" } };

  it("strict-budget은 동시 호출의 최대 비용을 각각 확보해 상한 초과를 막는다", async () => {
    let calls = 0;
    const budget = new Budget(0.02);
    const caller: Caller = async () => {
      calls++;
      await Promise.resolve();
      return { text: "1", usage: { input: 0, cachedInput: 0, output: 1000 }, ms: 1, finish: "stop" };
    };
    const result = await runBench(fakeTask, items, { arms: [strictArm], budget, caller, concurrency: 3, strictBudget: true });
    expect(calls).toBe(1);
    expect(budget.spent).toBeCloseTo(0.001);
    expect(budget.reserved).toBeCloseTo(0);
    expect(result.stopped).toMatch(/예산 상한/);
  });

  it("작업이 예산 오류를 잡아도 내부의 두 번째 호출 전에 멈춘다", async () => {
    let calls = 0;
    const budget = new Budget(0.02);
    const caller: Caller = async () => {
      calls++;
      return { text: "1", usage: { input: 0, cachedInput: 0, output: 10000 }, ms: 1, finish: "stop" };
    };
    const multiCallTask: Task<Item> = { ...fakeTask, async runOne(item, arm, call) {
      try {
        await call(arm, { prompt: "첫 호출" });
        await call(arm, { prompt: "보강 호출" });
      } catch { /* 제품 파서처럼 오류를 결과로 바꿔도 예산은 실행기에 전달되어야 한다. */ }
      return { finish: "other", score: { match: "empty" } };
    } };
    const result = await runBench(multiCallTask, items, { arms: [strictArm], budget, caller, concurrency: 1, strictBudget: true });
    expect(calls).toBe(1);
    expect(budget.spent).toBeCloseTo(0.01);
    expect(result.stopped).toMatch(/예산 상한/);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.cost).toBeCloseTo(budget.spent);
  });

  it("비싼 대체 팔도 그 팔의 최대 비용을 확보하지 못하면 부르지 않는다", async () => {
    const calls: string[] = [];
    const caller: Caller = async (arm) => {
      calls.push(arm.id);
      return { text: "", usage: { input: 0, cachedInput: 0, output: 1000 }, ms: 1, finish: "length" };
    };
    const result = await runBench(fakeTask, items, {
      arms: [{ ...strictArm, fallback: "deepseek-v4-pro@16k" }], budget: new Budget(0.02), caller, concurrency: 1, strictBudget: true,
    });
    expect(calls).toEqual([strictArm.id]);
    expect(result.stopped).toMatch(/예산 상한/);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.cost).toBeCloseTo(0.001);
    expect(result.records[0]!.finish).toBe("length");
  });

  it("사용량을 알 수 없는 실패는 최대 비용으로 잡고 다음 호출을 막는다", async () => {
    let calls = 0;
    const budget = new Budget(0.05);
    const caughtTask: Task<Item> = { ...fakeTask, async runOne(item, arm, call) {
      try { return await fakeTask.runOne(item, arm, call); }
      catch { return { finish: "other", score: { match: "empty" } }; }
    } };
    const result = await runBench(caughtTask, items, { arms: [strictArm], budget, concurrency: 1, strictBudget: true, caller: async () => {
      calls++;
      throw new Error("network");
    } });
    expect(calls).toBe(1);
    expect(budget.spent).toBeCloseTo(0.016);
    expect(budget.uncertain).toBeCloseTo(0.016);
    expect(result.stopped).toBeDefined();
    expect(result.records[0]!.uncertainCost).toBeCloseTo(budget.spent);
  });

  it.each([
    { usageReported: false, usage: { input: 0, cachedInput: 0, output: 0 } },
    { usage: { input: NaN, cachedInput: 0, output: 100 } },
    { usage: { input: 10, cachedInput: 11, output: 100 } },
    { usage: { input: 10, cachedInput: 0, output: -1 } },
  ])("사용량 누락·이상 응답을 0원으로 통과시키지 않는다: %j", async (out) => {
    let calls = 0;
    const budget = new Budget(0.05);
    const result = await runBench(fakeTask, items, { arms: [strictArm], budget, concurrency: 1, strictBudget: true, caller: async () => {
      calls++;
      return { text: "1", ms: 1, finish: "stop", ...out };
    } });
    expect(calls).toBe(1);
    expect(budget.spent).toBeCloseTo(0.016);
    expect(result.records[0]!.cost).toBeCloseTo(budget.spent);
    expect(result.stopped).toMatch(/사용량/);
  });

  it("동시 네트워크 실패가 있어도 다른 완료 응답과 지출 기록을 보존한다", async () => {
    let calls = 0;
    const budget = new Budget(0.1);
    const result = await runBench(fakeTask, items.slice(0, 2), {
      arms: [strictArm], budget, concurrency: 2, strictBudget: true, caller: async () => {
        const n = ++calls;
        await Promise.resolve();
        if (n === 1) throw new Error("network");
        return { text: "2", usage: { input: 0, cachedInput: 0, output: 1000 }, ms: 1, finish: "stop" };
      },
    });
    expect(calls).toBe(2);
    expect(result.records).toHaveLength(2);
    expect(result.records.reduce((sum, r) => sum + r.cost, 0)).toBeCloseTo(budget.spent);
    expect(result.records.find((r) => r.itemId === "b")!.score.match).toBe("same");
    expect(result.stopped).toBeDefined();
  });

  it("flash 가 잘린 문항만 v4-pro 로 다시 부르고 시간 · 비용을 합한다", async () => {
    const calls: string[] = [];
    const caller: Caller = async (arm) => {
      calls.push(arm.id);
      const truncated = arm.id === "flash→v4-pro" && calls.filter((c) => c === "flash→v4-pro").length === 2;
      return { text: truncated ? "" : String(calls.length % 3 || 3), usage, ms: 100, finish: truncated ? "length" : "stop" };
    };
    const result = await runBench(fakeTask, items, {
      arms: [ARMS["flash→v4-pro"]!],
      budget: new Budget(10),
      caller,
      concurrency: 1,
    });
    expect(calls).toEqual(["flash→v4-pro", "flash→v4-pro", "deepseek-v4-pro", "flash→v4-pro"]);
    const b = result.records.find((r) => r.itemId === "b")!;
    expect(b.usedFallback).toBe(true);
    expect(b.calls).toBe(2);
    expect(b.ms).toBe(200);
    expect(b.cost).toBeCloseTo(costOf(ARMS["flash→v4-pro"]!, usage) + costOf(ARMS["deepseek-v4-pro"]!, usage), 10);
    expect(result.records.filter((r) => r.usedFallback)).toHaveLength(1);
  });

  it("예산 상한에 닿으면 다음 호출 전에 멈춘다", async () => {
    let n = 0;
    const caller: Caller = async () => {
      n++;
      return { text: "1", usage: { input: 0, cachedInput: 0, output: 1_000_000 }, ms: 1, finish: "stop" };
    };
    const pricey: Arm = { ...ARMS["gpt-5.5"]! }; // 출력 100만 = 30달러
    const result = await runBench(fakeTask, items, { arms: [pricey], budget: new Budget(40), caller, concurrency: 1 });
    expect(n).toBe(1);
    expect(result.stopped).toMatch(/예산 상한/);
  });

  it("사진 작업에서 사진을 못 받는 팔 · 키가 없는 팔은 부르지 않고 건너뛴다", async () => {
    const caller: Caller = async () => {
      throw new Error("불리면 안 된다");
    };
    const visionTask = { ...fakeTask, vision: true };
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const result = await runBench(visionTask, items, {
        arms: [ARMS["deepseek-v4-pro"]!, ARMS["gemini-3.8-flash"]!],
        budget: new Budget(1),
        caller,
        requireKeys: true,
      });
      expect(result.records).toHaveLength(0);
      expect(result.skippedArms.map((s) => s.id)).toEqual(["deepseek-v4-pro", "gemini-3.8-flash"]);
    } finally {
      if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
    }
  });

  it("드라이런 어림과 표", async () => {
    const est = estimate(fakeTask, items, [ARMS["deepseek-flash"]!]);
    expect(est[0]!.calls).toBe(3);
    expect(est[0]!.cost).toBeGreaterThan(0);
    const caller: Caller = async () => ({ text: "1", usage, ms: 1, finish: "stop" });
    const result = await runBench(fakeTask, items, { arms: [ARMS["deepseek-flash"]!], budget: new Budget(1), caller });
    expect(table(fakeTask, result.records, [ARMS["deepseek-flash"]!])).toContain("| deepseek-flash | 3 | 1 |");
  });
});
