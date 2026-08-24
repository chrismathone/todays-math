/**
 * 중3 «산포도» 7 + «상자그림과 산점도» 10 = 17유형 — 독립 검산.
 *
 * `boxPlot`·`scatterPlot` 은 실제 엔진(`render_spec.py`)까지 태운다 — 모킹하지
 * 않는다(없는 축은 변이시킬 수 없다, CLAUDE.md 2026-08-19). 상관관계(08)는
 * **점을 훑어 세는** 별도 함수로, 생성기가 고른 순위 순열과 무관하게 다시 판정한다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260824, 1, 7777, 424242, 99991];
const BOOK = "3-2";

const entries = () =>
  registeredTypes().filter(
    (e) =>
      e.rpmBook === BOOK &&
      (e.rpmMinor === "산포도" || e.rpmMinor === "상자그림과 산점도"),
  );

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

function unpack(
  facts: Record<string, number>,
  prefix: string,
  n: number,
): number[] {
  return Array.from({ length: n }, (_, i) => {
    const v = facts[`${prefix}${i}`];
    if (v === undefined) throw new Error(`facts.${prefix}${i} 없음`);
    return v;
  });
}

/** 부합쌍(concordant pair) 비율 — 상관관계를 **점을 세어** 판정한다(엔진과 무관). */
function concordantRatio(xs: number[], ys: number[]): number {
  let same = 0;
  let total = 0;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      total += 1;
      const dx = xs[j]! - xs[i]!;
      const dy = ys[j]! - ys[i]!;
      if (Math.sign(dx) === Math.sign(dy)) same += 1;
    }
  }
  return same / total;
}

describe("중3 산포도·상자그림과 산점도 17유형", () => {
  it("산포도 7 + 상자그림과 산점도 10 = 17이 등록돼 있다", () => {
    const es = entries();
    expect(es.length).toBe(17);
    const disp = es.filter((e) => e.rpmMinor === "산포도");
    const box = es.filter((e) => e.rpmMinor === "상자그림과 산점도");
    expect(disp.length).toBe(7);
    expect(box.length).toBe(10);
  });

  it("Unit.section 은 소재가 바뀌는 05→06 경계에서 갈린다", () => {
    const byType = new Map(
      entries()
        .filter((e) => e.rpmMinor === "상자그림과 산점도")
        .map((e) => [e.rpmType, e.unitSection]),
    );
    for (let i = 1; i <= 5; i += 1) {
      expect(byType.get(String(i).padStart(2, "0"))).toBe("상자그림");
    }
    for (let i = 6; i <= 10; i += 1) {
      expect(byType.get(String(i).padStart(2, "0"))).toBe("산점도와 상관관계");
    }
    const dispSections = new Set(
      entries()
        .filter((e) => e.rpmMinor === "산포도")
        .map((e) => e.unitSection),
    );
    expect(dispSections).toEqual(new Set(["대푯값과 산포도"]));
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(entries().map((e) => [e.key, e.rpmTitle]));
    expect(byKey.get("3-2|산포도|01")).toBe("편차");
    expect(byKey.get("3-2|산포도|07")).toBe("변화된 변량의 평균 분산 표준편차");
    expect(byKey.get("3-2|상자그림과 산점도|01")).toBe("사분위수");
    expect(byKey.get("3-2|상자그림과 산점도|08")).toBe("산점도와 상관관계");
    expect(byKey.get("3-2|상자그림과 산점도|10")).toBe(
      "산점도에서 평균 구하기",
    );
  });

  for (const e of entries()) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries()) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  // ── 산포도 01~07 — 개별 검산 ─────────────────────────────────────────
  it("01 편차 — 편차의 합이 0 이고, 답이 그 학생의 편차와 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|01", seed);
      const devs = unpack(p.facts, "d", 5);
      expect(devs.reduce((s, v) => s + v, 0)).toBe(0);
      expect(firstNumber(p.answer)).toBe(devs[p.facts.idx!]);
    }
  });

  it("02 편차를 이용하여 변량 구하기 — 네 편차 + x 의 합이 0", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|02", seed);
      const knowns = unpack(p.facts, "d", 4);
      expect(knowns.reduce((s, v) => s + v, 0) + p.facts.x!).toBe(0);
      expect(firstNumber(p.answer)).toBe(p.facts.x);
    }
  });

  it("03 분산과 표준편차 — 분산×5 = 편차 제곱합, 답의 근호값이 분산과 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|03", seed);
      const devs = unpack(p.facts, "d", 5);
      const sumSq = devs.reduce((s, v) => s + v * v, 0);
      expect(p.facts.variance! * 5).toBe(sumSq);
      expect(p.facts.out! * p.facts.out! * p.facts.inner!).toBe(
        p.facts.variance,
      );
    }
  });

  it("04 평균과 분산을 이용하여 식의 값 구하기 — 새 분산 = a²×분산", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|04", seed);
      expect(firstNumber(p.answer)).toBe(
        p.facts.a! * p.facts.a! * p.facts.variance!,
      );
    }
  });

  it("05 자료의 이해 — 평균×5 = 변량의 합", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|05", seed);
      const values = unpack(p.facts, "v", 5);
      expect(p.facts.mean! * 5).toBe(values.reduce((s, v) => s + v, 0));
      expect(firstNumber(p.answer)).toBe(p.facts.mean);
    }
  });

  it("06 두 집단 전체의 평균 — 가중평균과 교차곱으로 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|06", seed);
      const { n1, n2, m1, m2, combined } = p.facts;
      expect(combined! * (n1! + n2!)).toBe(n1! * m1! + n2! * m2!);
      expect(firstNumber(p.answer)).toBe(combined);
    }
  });

  it("07 변화된 변량 — 덧셈은 표준편차 불변, 곱셈은 k배", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|산포도|07", seed);
      const want = p.facts.mode === 0 ? p.facts.sd : p.facts.k! * p.facts.sd!;
      expect(firstNumber(p.answer)).toBe(want);
    }
  });

  // ── 상자그림 01~05 — 개별 검산 ───────────────────────────────────────
  it("01 사분위수 — n=7 정렬 자료의 위치 공식과 답이 일치한다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|01", seed);
      const v = unpack(p.facts, "v", 7).sort((a, b) => a - b);
      expect(p.facts.min).toBe(v[0]);
      expect(p.facts.q1).toBe(v[1]);
      expect(p.facts.med).toBe(v[3]);
      expect(p.facts.q3).toBe(v[5]);
      expect(p.facts.max).toBe(v[6]);
      const n = firstNumber(p.answer);
      expect([p.facts.q1, p.facts.med, p.facts.q3]).toContain(n);
    }
  });

  it("02 사분위수가 주어질 때 변량 구하기 — x 는 두 번째로 작은 값(=Q1)", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|02", seed);
      const v = unpack(p.facts, "v", 7).sort((a, b) => a - b);
      expect(p.facts.x).toBe(v[1]);
      expect(firstNumber(p.answer)).toBe(p.facts.x);
    }
  });

  it("03 상자그림으로 나타내기 — 그림의 다섯 수 요약이 facts 와 같다 (실제 렌더)", async () => {
    if (!hasEngine) return;
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|03", seed);
      expect(p.figureSpec).toBeTruthy();
      const spec = p.figureSpec as { kind: string; values: number[] };
      expect(spec.kind).toBe("boxPlot");
      expect(spec.values).toEqual([
        p.facts.min,
        p.facts.q1,
        p.facts.med,
        p.facts.q3,
        p.facts.max,
      ]);
      const r = await renderFigureSpec(p.figureSpec);
      expect(r.ok, r.ok ? "" : (r as { error: string }).error).toBe(true);
    }
  });

  it("04 상자그림의 이해 — IQR = Q3-Q1 (실제 렌더)", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|04", seed);
      expect(p.facts.iqr).toBe(p.facts.q3! - p.facts.q1!);
      expect(firstNumber(p.answer)).toBe(p.facts.iqr);
      if (!hasEngine) continue;
      const r = await renderFigureSpec(p.figureSpec);
      expect(r.ok).toBe(true);
    }
  });

  it("05 두 자료의 비교 — 중앙값 차가 |A-B| 이고, series2 로 렌더된다", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|05", seed);
      expect(p.facts.diff).toBe(Math.abs(p.facts.aMed! - p.facts.bMed!));
      expect(firstNumber(p.answer)).toBe(p.facts.diff);
      const spec = p.figureSpec as { series2?: { values: number[] } };
      expect(spec.series2?.values).toEqual([
        p.facts.bMin,
        p.facts.bQ1,
        p.facts.bMed,
        p.facts.bQ3,
        p.facts.bMax,
      ]);
      if (!hasEngine) continue;
      const r = await renderFigureSpec(p.figureSpec);
      expect(r.ok).toBe(true);
    }
  });

  // ── 산점도 06~10 — 개별 검산 ─────────────────────────────────────────
  it("06 산점도의 이해⑴ — x≥threshold 인 점의 개수 (실제 렌더)", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|06", seed);
      const n = p.facts.n!;
      const xs = unpack(p.facts, "x", n);
      const want = xs.filter((x) => x >= p.facts.threshold!).length;
      expect(p.facts.count).toBe(want);
      expect(firstNumber(p.answer)).toBe(want);
      if (!hasEngine) continue;
      const r = await renderFigureSpec(p.figureSpec);
      expect(r.ok).toBe(true);
    }
  });

  it("07 산점도의 이해⑵ — x>y 인 점의 개수", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|07", seed);
      const n = p.facts.n!;
      const xs = unpack(p.facts, "x", n);
      const ys = unpack(p.facts, "y", n);
      const want = xs.filter((x, i) => x > ys[i]!).length;
      expect(p.facts.count).toBe(want);
      expect(firstNumber(p.answer)).toBe(want);
    }
  });

  it("08 산점도와 상관관계 — 부합쌍 비율로 다시 판정해도 같은 답이 나온다", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|08", seed);
      const xs = unpack(p.facts, "x", 6);
      const ys = unpack(p.facts, "y", 6);
      const ratio = concordantRatio(xs, ys);
      if (p.facts.kindCode === 1) {
        expect(p.answer).toBe("양의 상관관계");
        expect(ratio).toBeGreaterThan(0.7);
      } else if (p.facts.kindCode === -1) {
        expect(p.answer).toBe("음의 상관관계");
        expect(ratio).toBeLessThan(0.3);
      } else {
        expect(p.answer).toBe("상관관계가 없다");
        expect(ratio).toBeGreaterThanOrEqual(0.3);
        expect(ratio).toBeLessThanOrEqual(0.7);
      }
      if (!hasEngine) continue;
      const r = await renderFigureSpec(p.figureSpec);
      expect(r.ok).toBe(true);
    }
  });

  /**
   * 2026-08-24 발문을 바꿨다(D-100 ⑶ — 좌표기하는 중등 불허). 옛 시험은 피타고라스로
   * 잰 거리를 봤는데, 그 문형 자체가 사라졌다.
   *
   * ⚠️ 새 시험은 **지면에 찍힌 점**에서 답을 다시 센다 — `facts` 의 값을 그대로 믿지
   * 않는다. 생성기가 `facts` 와 `content` 를 따로 만들므로, 둘이 갈라지면 지면과
   * 정답이 다른 문항이 나가는데 facts 만 보는 시험은 그걸 구조적으로 못 본다.
   */
  it("09 산점도의 분석 — 지면에 찍힌 점으로 다시 세면 정답과 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|09", seed);

      // 발문에서 점과 문턱을 직접 읽는다.
      const pts = [...p.content.matchAll(/\$\((\d+), (\d+)\)\$/g)].map(
        (m) => [Number(m[1]), Number(m[2])] as const,
      );
      const k = Number(/합이 \$(\d+)\$점 이상/.exec(p.content)?.[1]);
      expect(pts).toHaveLength(p.facts.n!);
      expect(k).toBe(p.facts.k);

      const counted = pts.filter(([x, y]) => x + y >= k).length;
      expect(firstNumber(p.answer)).toBe(counted);

      // 물음이 죽지 않았는가 — 0명이나 전원이면 셀 것이 없다.
      expect(counted).toBeGreaterThanOrEqual(2);
      expect(counted).toBeLessThan(pts.length);

      // 좌표기하로 되돌아가지 않았는가 (D-100 ⑶).
      expect(p.content).not.toContain("좌표평면");
      expect(p.solution).not.toContain("피타고라스");
    }
  });

  it("10 산점도에서 평균 구하기 — 평균×n = x좌표의 합", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|10", seed);
      const n = p.facts.n!;
      const xs = unpack(p.facts, "x", n);
      expect(p.facts.mean! * n).toBe(xs.reduce((s, v) => s + v, 0));
      expect(firstNumber(p.answer)).toBe(p.facts.mean);
    }
  });
});
