/**
 * 중3 «산포도» 10 + «상자그림과 산점도» 15 = 25유형 — 독립 검산.
 *
 * `boxPlot`·`scatterPlot` 은 실제 엔진(`render_spec.py`)까지 태운다 — 모킹하지
 * 않는다(없는 축은 변이시킬 수 없다, CLAUDE.md 2026-08-19). 상관관계(08)는
 * **점을 훑어 세는** 별도 함수로, 생성기가 고른 순위 순열과 무관하게 다시 판정한다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CORE_DIFFICULTIES, defaultRatioFor } from "../../contracts/difficulty";
import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { svgLabels } from "../../lib/figure/svgLabels";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260824, 1, 7777, 424242, 99991];
const BOOK = "3-2";

/**
 * 이 시험이 맡은 몫 — **이 모듈이 낸 번호까지**(산포도 01~08 · 상자그림과 산점도 01~13).
 *
 * ⚠️ 2026-08-27 부터 이 중단원에 **다른 모듈이 지은** 유형이 붙는다(갈래 B 가
 *    「상자그림」 소단원을 10유형으로 올리며 지은 50~54). 이 시험은
 *    `registeredTypes()` 를 **중단원 이름으로** 걸러 자기 몫을 고르므로 그것들까지
 *    쓸어 담아 자기 검산표에 남의 유형을 들이댄다. 그래서 번호로 한 번 더 좁힌다 —
 *    그 유형들은 `src/__tests__/unit/midTypesB.test.ts` 가 검산을 요구한다.
 *
 * 🔴 **11~15 는 이 모듈이 냈으므로 여기 안이다**(2026-08-29, RPM 색인 밖). 문턱을
 *    안 올리면 새 유형이 **아무 검산도 안 받고** 지나간다 — 아래 per-type 검사가
 *    전부 `entries()` 를 돌기 때문이다. 「없는 축은 변이시킬 수 없다」의 그 자리다.
 *
 * ⚠️ 문턱 하나가 **두 중단원**을 함께 자른다. 「산포도」는 09·10 까지라 13 이든
 *    15 든 안 걸리지만, 그 사실에 기대지 말 것 — 산포도가 16번을 내는 날 조용히
 *    분모 밖이 된다. 그래서 아래 「N유형이 전부 등록돼 있다」가 **중단원마다**
 *    개수를 따로 못 박는다.
 */
const CATALOG_MAX = 15;

const entries = () =>
  registeredTypes().filter(
    (e) =>
      e.rpmBook === BOOK &&
      (e.rpmMinor === "산포도" || e.rpmMinor === "상자그림과 산점도") &&
      Number(e.rpmType) <= CATALOG_MAX,
  );

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** Read the student's actual SVG, independently of raw spec points and facts. */
async function plottedStudentPoints(problem: MidProblem): Promise<[number, number][]> {
  if (!problem.figureSpec) throw new Error("산점도 그림이 없습니다.");
  const rendered = await renderFigureSpec(problem.figureSpec, { strict: true });
  if (!rendered.ok) throw new Error(rendered.error);
  const labels = svgLabels(rendered.svg).filter((label) => /^\d+$/.test(label.text));
  const mapping = (anchor: "middle" | "end", axis: "x" | "y") => {
    const ticks = labels.filter((label) => label.anchor === anchor)
      .map((label) => [label[axis], Number(label.text)] as const)
      .sort((a, b) => a[0] - b[0]);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    const [a, b] = ticks;
    expect(b[0]).not.toBe(a[0]);
    const slope = (b[1] - a[1]) / (b[0] - a[0]);
    expect(Number.isFinite(slope) && slope !== 0).toBe(true);
    const read = (screen: number) => a[1] + (screen - a[0]) * slope;
    for (const [screen, value] of ticks) expect(read(screen)).toBeCloseTo(value, 7);
    return read;
  };
  const readX = mapping("middle", "x"), readY = mapping("end", "y");
  const points = [...rendered.svg.matchAll(/<circle\b([^>]*)>/g)].map((match) => {
    const at = (name: string) => {
      const raw = new RegExp(`\\b${name}="([^"]+)"`).exec(match[1])?.[1];
      if (raw === undefined || !Number.isFinite(Number(raw))) throw new Error("점의 좌표가 잘못되었습니다.");
      return Number(raw);
    };
    const values = [readX(at("cx")), readY(at("cy"))];
    for (const value of values) {
      expect(value).toBeCloseTo(Math.round(value), 7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    return values.map(Math.round) as [number, number];
  });
  const count = /학생 \$(\d+)\$명/.exec(problem.content);
  expect(count, "본문의 학생 수와 실제 그림의 점 수가 같아야 한다").not.toBeNull();
  expect(points).toHaveLength(Number(count![1]));
  return points;
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

describe("중3 산포도·상자그림과 산점도 25유형", () => {
  it("🔴 **이 파일이 맡은 소단원이 10문항 일일테스트를 채운다** — 유형 수가 곧 한 시험지의 상한이다", () => {
    // 일일테스트는 **현재 진도 소단원 하나**만 범위로 삼고(`resolveRange.ts`),
    // 「한 시험지에 같은 문항류는 1개만」(원장님 확정 2026-08-26)이다. 그래서
    // 유형 수 < 문항 수 이면 그 소단원의 일일테스트는 **구조적으로 못 찬다.**
    // 원장님 반은 전부 8문항 설정이다(실측 2026-08-29).
    //
    // ⚠️ 「상자그림」은 이 파일 밖(갈래 B 50~54)이 절반을 대므로 여기서 안 센다 —
    //    `entries()` 로 세면 그 소단원만 늘 5로 보인다. 세는 쪽과 채우는 쪽이
    //    다른 모집단을 보면 그 숫자는 아무것도 안 지킨다.
    for (const sec of ["대푯값과 산포도", "산점도와 상관관계"]) {
      const mine = entries().filter((e) => e.unitSection === sec);
      expect(
        mine.length,
        `「${sec}」 유형이 10 미만이면 10문항 일일테스트를 못 채운다`,
      ).toBeGreaterThanOrEqual(10);
      // 키가 겹치면 그 둘은 한 자리를 다툰다 — 세는 것이 뜻을 잃는다.
      expect(new Set(mine.map((e) => e.key)).size).toBe(mine.length);
    }
  });

  it("🔴 **「산점도와 상관관계」 난이도가 10문항 기본 배분을 덮는다** — 1·4·4·1", () => {
    // 유형이 10개여도 전부 「응용」이면 배분을 못 맞춘다. 배분은
    // `DEFAULT_DIFFICULTY_RATIO`(연산 1 · 기본 3 · 응용 3 · 심화 1)가 정본이다.
    const want = defaultRatioFor(10);
    const got: Record<string, number> = {};
    for (const e of entries().filter(
      (x) => x.unitSection === "산점도와 상관관계",
    )) {
      const d = generateMiddleProblem(e.key, 20260829).difficulty;
      got[d] = (got[d] ?? 0) + 1;
    }
    // D-113(2026-08-30) — 축을 여섯으로 넓혔지만 **중등은 핵심 넷만** 낸다
    // (`resolveMiddleTier` 는 등록값을 내리기만 하고, 등록값에 확대 갈래가 없다).
    // 사다리 전체를 돌면 「아직 안 채운 것」과 「비어 버린 것」이 구분되지 않는다.
    for (const tier of CORE_DIFFICULTIES) {
      expect(got[tier] ?? 0, `「${tier}」 유형 수`).toBeGreaterThanOrEqual(
        want[tier],
      );
    }
  });

  it("🔴 **「대푯값과 산포도」에 갈래가 하나도 비지 않았다**", () => {
    // 2026-08-29 실측: 연산 0 · 기본 2 · 응용 6 · 심화 0 — **양 끝이 둘 다**
    // 비어 있었다. 배분을 완전히 덮는 것(1·4·4·1)까지는 요구하지 않는다 —
    // 그러려면 이미 있는 여섯 응용의 등급을 손대야 하는데 그 값은 사람이 RPM 을
    // 보고 정한 것이라 옮길 근거가 없다(`tier.ts` 머리말과 같은 자리).
    const got: Record<string, number> = {};
    for (const e of entries().filter(
      (x) => x.unitSection === "대푯값과 산포도",
    )) {
      const d = generateMiddleProblem(e.key, 20260829).difficulty;
      got[d] = (got[d] ?? 0) + 1;
    }
    // D-113(2026-08-30) — 축을 여섯으로 넓혔지만 **중등은 핵심 넷만** 낸다
    // (`resolveMiddleTier` 는 등록값을 내리기만 하고, 등록값에 확대 갈래가 없다).
    // 사다리 전체를 돌면 「아직 안 채운 것」과 「비어 버린 것」이 구분되지 않는다.
    for (const tier of CORE_DIFFICULTIES) {
      expect(got[tier] ?? 0, `「${tier}」 유형 수`).toBeGreaterThan(0);
    }
  });

  it("산포도 10 + 상자그림과 산점도 15 = 25가 등록돼 있다", () => {
    const es = entries();
    expect(es.length).toBe(25);
    const disp = es.filter((e) => e.rpmMinor === "산포도");
    const box = es.filter((e) => e.rpmMinor === "상자그림과 산점도");
    // 🔴 RPM 의 01~07 에 **우리 유형 08~10**(자료 → 분산 · 분산↔표준편차 ·
    //    미지수가 있는 자료의 분산)을 더해 10이다.
    expect(disp.length).toBe(10);
    // 🔴 RPM 의 01~10 에 **우리 유형 11~15**(좌표 읽기·비율·상관관계의 이해·
    //    두 변량의 차·무리의 평균)을 더해 15다.
    expect(box.length).toBe(15);
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
    // 11~15 는 RPM 색인 밖이지만 소재가 산점도라 같은 쪽에 선다.
    for (let i = 6; i <= 15; i += 1) {
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

  it("한 유형에서 4문항을 뽑으면 발문·주어진 그림 자료가 서로 다르다", () => {
    for (const e of entries()) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const scatter = e.rpmMinor === "상자그림과 산점도" &&
        ["06", "07", "08", "09", "10", "11", "12", "14", "15"].includes(e.rpmType);
      if (!scatter) {
        expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(4);
        continue;
      }
      for (let i = 0; i < set.length; i += 1) for (let j = i + 1; j < set.length; j += 1) {
        if (set[i]!.content !== set[j]!.content) continue;
        // 각 축은 이 유형에서 고정이다. 같은 발문이면 점 자료가 실제로 달라야 한다.
        const rows = (p: MidProblem) => (p.figureSpec!.points as number[][])
          .map((xy) => xy.join(",")).sort();
        expect(rows(set[i]!), e.key).not.toEqual(rows(set[j]!));
      }
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

  // ── 산포도 09·10 (RPM 색인 밖, 2026-08-29) — 개별 검산 ─────────────────

  it("09 분산과 표준편차의 관계 — 세 갈래가 서로의 역이 되는지 잰다", () => {
    // 🔴 참을 **발문에서 읽어** 온다. `facts` 만 보면 생성기가 `content` 와
    //    `facts` 를 따로 만드는 자리에서 둘이 갈라져도 못 본다.
    for (const seed of [...SEEDS, 3, 51, 777, 60606, 12321]) {
      for (let v = 0; v < 6; v += 1) {
        const p = generateMiddleProblem("3-2|산포도|09", seed, v);
        const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((m) =>
          Number(m[1]),
        );
        const ans = firstNumber(p.answer);
        if (p.facts.mode === 0) {
          // 「변량 n개의 편차의 제곱의 합이 S」 → 분산 = S/n
          const [n, sumSq] = nums;
          expect(sumSq! / n!, `${JSON.stringify(p.facts)}`).toBe(ans);
          expect(Number.isInteger(sumSq! / n!)).toBe(true);
        } else if (p.facts.mode === 1) {
          // 「분산이 v」 → 표준편차 = √v, 그리고 그 제곱이 다시 v 다
          expect(ans * ans).toBe(nums[0]);
        } else {
          // 「표준편차가 s」 → 분산 = s²
          expect(nums[0]! * nums[0]!).toBe(ans);
        }
      }
    }
  });

  it("10 미지수가 있는 자료의 분산 — 발문의 두 조건을 풀어 분산을 다시 낸다", () => {
    for (const seed of [...SEEDS, 3, 51, 777, 60606]) {
      for (let v = 0; v < 6; v += 1) {
        const p = generateMiddleProblem("3-2|산포도|10", seed, v);
        const known = unpack(p.facts, "k", 3);
        const { mean, d } = p.facts;
        // 발문이 실제로 그 세 수·평균·차를 적고 있는가.
        for (const k of known) expect(p.content).toContain(`$${k}$`);
        expect(p.content).toContain(`평균이 $${mean}$`);
        expect(p.content).toContain(`차가 $${d}$`);
        // 두 조건을 **여기서 다시 푼다** — 생성기의 (T±d)/2 를 옮기지 않는다.
        const sum = known.reduce((s, x) => s + x, 0);
        const a = (5 * mean! - sum - d!) / 2;
        const b = a + d!;
        expect(a).toBe(p.facts.a);
        expect(b).toBe(p.facts.b);
        const values = [known[0]!, known[1]!, a, b, known[2]!];
        expect(values.reduce((s, x) => s + x, 0)).toBe(5 * mean!);
        const variance =
          values.reduce((s, x) => s + (x - mean!) * (x - mean!), 0) / 5;
        expect(Number.isInteger(variance)).toBe(true);
        expect(firstNumber(p.answer)).toBe(variance);
        // 🔴 `+0` 이 지면에 나가면 값은 맞아도 흉하다 — 값 검산이 못 보는 축.
        expect(p.solution).not.toContain("$+0$");
      }
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
  it("09 산점도의 분석 — 지면에 찍힌 점으로 다시 세면 정답과 같다", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|09", seed);

      // 점은 실제 SVG 눈금에서, 문턱은 발문에서 읽는다.
      const pts = await plottedStudentPoints(p);
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

  // ── 산점도 11~13 (RPM 색인 밖, 2026-08-29) — 개별 검산 ────────────────
  //
  // 09 와 같은 규약이다: **지면에 찍힌 점**에서 답을 다시 센다. `facts` 만 보면
  // 생성기가 `content` 와 `facts` 를 따로 만드는 자리에서 둘이 갈라져도 못 본다.

  it("11 산점도에서 좌표 읽기 — 지면의 점 중 y가 가장 큰 것의 x가 정답이다", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|11", seed);
      const pts = await plottedStudentPoints(p);
      expect(pts).toHaveLength(p.facts.n!);
      const maxY = Math.max(...pts.map(([, y]) => y));
      // y 가 유일해야 답이 하나다 — 겹치면 지면이 「가장 높은 학생」을 못 가른다.
      expect(pts.filter(([, y]) => y === maxY)).toHaveLength(1);
      const top = pts.find(([, y]) => y === maxY)!;
      expect(firstNumber(p.answer)).toBe(top[0]);

      // 🔴 그림을 안 보고 찍을 수 있으면 이 유형은 죽은 것이다.
      const byX = [...pts].sort((a, b) => a[0] - b[0]);
      expect(
        byX[byX.length - 1]![1],
        "답이 x가 가장 큰 점이면 찍힌다",
      ).not.toBe(maxY);
      expect(byX[0]![1], "답이 x가 가장 작은 점이면 찍힌다").not.toBe(maxY);
    }
  });

  it("12 산점도에서 비율 구하기 — 두 좌표가 모두 문턱 이상인 점의 비율", async () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|12", seed);
      const pts = await plottedStudentPoints(p);
      const t = Number(/모두 \$(\d+)\$점 이상/.exec(p.content)?.[1]);
      expect(pts).toHaveLength(p.facts.n!);
      expect(t).toBe(p.facts.threshold);

      const counted = pts.filter(([x, y]) => x >= t && y >= t).length;
      expect(firstNumber(p.answer)).toBe((counted * 100) / pts.length);
      // 백분율이 정수로 떨어져야 지면이 깨끗하다.
      expect((counted * 100) % pts.length).toBe(0);

      // 물음이 죽지 않았는가 — 0명이나 전원이면 셀 것이 없다.
      expect(counted).toBeGreaterThanOrEqual(2);
      expect(counted).toBeLessThan(pts.length - 1);
      // 문턱에 딱 걸친 점이 있으면 「이상」을 그림에서 가르기 어렵다.
      expect(pts.filter(([x, y]) => x === t || y === t)).toEqual([]);
    }
  });

  it("13 상관관계의 이해 — 정답만 그 상관관계고 나머지 둘은 아니다", () => {
    // 🔴 이 시험의 참은 **생성기가 아니라 여기 적은 표**에서 온다. 생성기의
    //    `CORRELATION_EXAMPLES` 를 import 해서 대조하면 동어반복이 된다 —
    //    표가 통째로 틀려도 초록이다(2026-08-18 「지표의 참이 제품에서 오면」).
    const POS =
      /키와 몸무게|공부한 시간|아이스크림|자동차 등록|정상까지 오르는/;
    const NEG = /난방비|그 지점의 기온|속력과 걸리는 시간|팔린 개수|남는 시간/;
    const NONE = /시력|이름의 글자|키와 수학 점수|태어난 달|마시는 물의 양/;
    const BY_KIND = { 1: POS, "-1": NEG, 0: NONE } as const;

    for (const seed of [...SEEDS, 20260829, 3, 51, 777, 60606]) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|13", seed);
      const [ask, list] = p.content.split("\n");
      const items = list!.split(" / ");
      expect(items).toHaveLength(3);
      expect(new Set(items).size, "같은 항목이 두 번 나오면 안 된다").toBe(3);
      expect(items).toContain(p.answer);

      const want = BY_KIND[String(p.facts.kindCode!) as "1" | "-1" | "0"];
      expect(want.test(p.answer), `정답 「${p.answer}」`).toBe(true);
      // 🔴 나머지 둘이 같은 갈래면 답이 둘이다 — 「고르시오」가 성립하지 않는다.
      for (const other of items.filter((i) => i !== p.answer)) {
        expect(
          want.test(other),
          `오답 「${other}」 이 정답과 같은 갈래다`,
        ).toBe(false);
      }
      // 발문의 낱말과 갈래가 맞물리는가.
      if (p.facts.kindCode === 1) expect(ask).toContain("양의 상관관계");
      else if (p.facts.kindCode === -1) expect(ask).toContain("음의 상관관계");
      else expect(ask).toContain("상관관계가 없는");

      // 그림이 없는 유형이다 — 발문이 그림을 가리키면 학생이 없는 것을 찾는다.
      expect(p.figureSpec ?? null).toBeNull();
      expect(p.content).not.toContain("그림");
    }
  });

  it("14 두 변량의 차 — 지면의 점으로 다시 재면 가장 큰 차가 정답이다", async () => {
    for (const seed of [...SEEDS, 3, 51, 777, 60606]) {
      for (let v = 0; v < 4; v += 1) {
        const p = generateMiddleProblem("3-2|상자그림과 산점도|14", seed, v);
        const pts = await plottedStudentPoints(p);
        expect(pts).toHaveLength(p.facts.n!);
        const gaps = pts.map(([x, y]) => Math.abs(x - y));
        const max = Math.max(...gaps);
        expect(firstNumber(p.answer)).toBe(max);
        // 🔴 최대가 유일해야 답이 하나다 — 둘이면 지면이 「가장 큰」을 못 가른다.
        expect(gaps.filter((g) => g === max)).toHaveLength(1);
        // 🔴 2등과 뚜렷이 갈려야 그림에서 눈으로 읽을 수 있다.
        const second = Math.max(...gaps.filter((g) => g !== max));
        expect(max - second).toBeGreaterThanOrEqual(3);
        // 점이 겹치면 산점도가 거짓말을 한다.
        expect(new Set(pts.map(([x, y]) => `${x},${y}`)).size).toBe(pts.length);
      }
    }
  });

  it("15 무리의 평균 — 지면의 점으로 다시 세고 다시 평균 낸다", async () => {
    for (const seed of [...SEEDS, 3, 51, 777, 60606]) {
      for (let v = 0; v < 4; v += 1) {
        const p = generateMiddleProblem("3-2|상자그림과 산점도|15", seed, v);
        const pts = await plottedStudentPoints(p);
        const t = Number(/수학 점수가 \$(\d+)\$점 이상/.exec(p.content)?.[1]);
        expect(pts).toHaveLength(p.facts.n!);
        expect(t).toBe(p.facts.threshold);

        const hit = pts.filter(([x]) => x >= t);
        expect(hit.length).toBe(p.facts.count);
        const sum = hit.reduce((s, [, y]) => s + y, 0);
        expect(sum % hit.length, "평균이 정수로 떨어져야 지면이 깨끗하다").toBe(
          0,
        );
        expect(firstNumber(p.answer)).toBe(sum / hit.length);

        // 🔴 무리가 전원이면 「그 학생들의 평균」이 **전체 평균과 같아져** 조건이
        //    아무 일도 안 한다. 너무 작아도 평균의 뜻이 죽는다.
        expect(hit.length).toBeGreaterThanOrEqual(3);
        expect(hit.length).toBeLessThanOrEqual(pts.length - 2);
        // 문턱에 딱 걸친 점은 「이상」을 그림에서 가르기 어렵다.
        expect(pts.filter(([x]) => x === t)).toEqual([]);
      }
    }
  });

  /**
   * 🔴 **스펙을 실은 유형은 전부 실제로 그려진다.**
   *
   * 이 파일의 렌더 검사는 유형마다 손으로 적혀 있었다(03·04·05·06·08). 그러면
   * **새 유형은 분모 밖**이라 스펙이 안 그려져도 초록이다 — 11·12 를 넣을 때
   * 실제로 그랬다. 손 목록을 없애고 `entries()` 를 돌린다.
   *
   * 씨앗을 둘만 쓰는 것은 엔진을 프로세스로 띄우기 때문이다(유형마다 2회).
   * 값에 따라만 깨지는 부류는 유형별 검사가 더 넓은 씨앗으로 따로 본다.
   */
  it("🔴 **스펙을 실은 유형은 전부 제품 경로가 그린다** — 손 목록 없이", async () => {
    if (!hasEngine) return;
    const failed: string[] = [];
    const kinds = new Set<string>();
    let drawn = 0;
    for (const e of entries()) {
      for (const seed of [20260824, 99991]) {
        const p = generateMiddleProblem(e.key, seed);
        if (!p.figureSpec) continue;
        kinds.add(String(p.figureSpec.kind));
        const r = await renderFigureSpec(p.figureSpec);
        drawn += 1;
        if (!r.ok) failed.push(`${e.key} s${seed} — ${r.error}`);
      }
    }
    // 🔴 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다. 그런데 **건수로 울타리를
    //    치면 유형이 하나 늘 때마다 숫자를 옮기게 되고**, 옮기다 보면 그 울타리가
    //    무엇을 지키는지 아무도 모른다. 그래서 「무엇을 그렸나」로 잠근다 —
    //    이 파일이 맡은 두 종류가 **둘 다** 실제로 엔진을 탄 것을 요구한다.
    expect(kinds, "그린 종류가 빠지면 그 종류는 이 검사 밖이다").toEqual(
      new Set(["boxPlot", "scatterPlot"]),
    );
    expect(
      drawn,
      "그린 것이 없으면 이 검사는 아무것도 안 지킨다",
    ).toBeGreaterThan(0);
    expect(failed, failed.join("\n")).toEqual([]);
  });

  it("🔴 **13 의 답이 늘 같은 자리에 있지 않다** — 자리로 찍히면 유형이 죽는다", () => {
    const seen = new Set<number>();
    for (let s = 0; s < 40; s += 1) {
      const p = generateMiddleProblem("3-2|상자그림과 산점도|13", 20260829 + s);
      seen.add(p.facts.ansIndex!);
    }
    expect(seen).toEqual(new Set([0, 1, 2]));
  });
});
