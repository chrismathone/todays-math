/**
 * 초4 1-5 「막대그래프」 4단 확대 (D-72) — 파일럿 1-5-3 을 뺀 두 소단원.
 *
 * **참은 그림·발문에서 온다.** 생성기의 계산을 다시 부르지 않고, 스펙에 실린 값과
 * 발문에 찍힌 수를 꺼내 여기서 다시 셈한다(CLAUDE.md 2026-08-18 「지표의 «참»이
 * 제품 상수에서 나오면」).
 *
 * 정체성 가드가 이 파일의 알맹이다 (R5 — 표준↔갈래 같은 소단원 중복도 결함):
 *  · **1-5-1 「알아보기」** 갈래는 완성된 **그래프**(barChart)에서 — 1단은 값이 아니라
 *    짜임을 읽는다(값 읽기는 표준 1-5-1 몫). 4단은 지워진 막대를 «관계» 단서로 역산한다
 *    (전체 합 단서는 1-5-3 심화 몫).
 *  · **1-5-2 「그리기」** 갈래는 넷 다 **표**(table)에서 — 그리기 방향이다(팀장 지침
 *    2026-08-23: 1단은 「값 읽기」 소재가 아니라 그리기 방향의 절차 한 번).
 *    완성된 그래프를 읽는 표준 1-5-2 와 그림 종류부터 갈린다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = ["1-5-1", "1-5-2"] as const;

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** `$55$명` · `$7$칸` 류에서 수 하나를 꺼낸다. */
function answerNum(answer: string): number {
  const m = answer.match(/^\$(\d+)\$/);
  expect(m, `정답이 KaTeX 수로 시작하지 않는다: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/** 그래프 갈래(1-5-1)의 스펙 — 그려진 막대 값을 라벨로 찾는다. */
type BarSpec = {
  kind: string;
  values: { label: string; value?: number; unknown?: boolean }[];
  yMax: number;
  yStep: number;
};

function barValue(spec: BarSpec, label: string): number {
  const hit = spec.values.find((v) => v.label === label);
  expect(hit, `그림에 ${label} 막대가 없다`).toBeTruthy();
  expect(hit!.value, `${label} 막대에 값이 없다`).toBeTypeOf("number");
  return hit!.value!;
}

/**
 * 표 갈래(1-5-2)의 스펙 — 표의 값을 라벨로 찾는다.
 *
 * ⚠️ 2026-08-24 에 표가 **세로로** 섰다(D-70 폭 가드). 그전에는 라벨이 머리줄에
 * 있었고 값이 `rows[0]` 한 줄이었다. 이제 **행마다 «라벨, 값»** 이다.
 */
type TableSpec = { kind: string; headers: string[]; rows: string[][] };

function tableValue(spec: TableSpec, label: string): number {
  const row = spec.rows.find((r) => r[0] === label);
  expect(
    row,
    `표에 ${label} 행이 없다: ${spec.rows.map((r) => r[0]).join(",")}`,
  ).toBeTruthy();
  return Number(row![1]);
}

describe("[초4 4단] 1-5 막대그래프 — 파일럿 밖 두 소단원", () => {
  it("두 소단원이 핵심 갈래를 전부 낸다 (파일럿 1-5-3 도 그대로)", () => {
    for (const code of [...CODES, "1-5-3"]) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = generateElementaryProblem(unitOf(code), 31337, tier);
        const b = generateElementaryProblem(unitOf(code), 31337, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  // 정체성의 뼈대 — 그림 종류가 소단원을 가른다. 1-5-2 갈래가 barChart 를 내면
  // 「그리기」가 「읽기」로 무너진 것이고, 표준 1-5-2 와의 구분 근거가 사라진다.
  it("1-5-1 갈래는 그래프(barChart), 1-5-2 갈래는 표(table)다", () => {
    // ⚠️ **두 소단원의 갈래 목록이 같다고 가정하지 않는다.** 2026-08-31 적대 검토가
    //    1-5-2 의 확대 갈래 둘을 거두어 목록이 갈렸다 — 한쪽을 기준으로 돌면 없는
    //    갈래를 불러 「아직 채우지 않은 갈래입니다」로 죽는다. 각자 제 목록을 돈다.
    for (const tier of tiersOf(unitOf("1-5-1"))) {
      for (const seed of SEEDS) {
        const p1 = generateElementaryProblem(unitOf("1-5-1"), seed, tier);
        expect(
          (p1.figureSpec as BarSpec).kind,
          `1-5-1 ${tier} seed ${seed}`,
        ).toBe("barChart");
      }
    }
    for (const tier of tiersOf(unitOf("1-5-2"))) {
      for (const seed of SEEDS) {
        const p2 = generateElementaryProblem(unitOf("1-5-2"), seed, tier);
        const spec = p2.figureSpec as TableSpec;
        expect(spec.kind, `1-5-2 ${tier} seed ${seed}`).toBe("table");
        // 표의 짜임 — **세로**다. 머리글은 «항목 이름 · 학생 수(명)» 둘,
        // 행은 항목마다 하나(넷)이고 행마다 «라벨, 값» 두 칸이다.
        expect(spec.headers.length, `1-5-2 ${tier} seed ${seed}`).toBe(2);
        expect(spec.rows.length, `1-5-2 ${tier} seed ${seed}`).toBe(4);
        for (const row of spec.rows) {
          expect(row.length, `1-5-2 ${tier} seed ${seed}`).toBe(2);
        }
      }
    }
  });

  // ── 1-5-1 축 성질

  it("1-5-1 1단은 계산이 없고, 답이 발문에 적혀 있지 않다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-1"), seed, "연산");
      expect(
        /[+×÷]|\\times|\\div|\\frac|\d-\d/.test(p.solution),
        `1단 해설에 계산이 있다: ${p.solution}`,
      ).toBe(false);
      // 짜임 읽기 — 답은 수가 아니라 말이다(값 읽기는 표준 1-5-1 몫, R5).
      expect(/\d/.test(p.answer), `1단 답에 수가 있다: ${p.answer}`).toBe(
        false,
      );
      expect(
        p.content.includes(p.answer),
        `1단 답이 발문에 그대로 있다: ${p.answer}`,
      ).toBe(false);
    }
  });

  it("1-5-1 2단 — 발문의 두 항목 값을 그림에서 찾아 더하면 답이다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-1"), seed, "기본");
      const m = p.content.match(
        /막대그래프입니다\. ([가-힣]+)[과와] ([가-힣]+)[을를] 좋아하는 학생은 모두 몇 명입니까/,
      );
      expect(m, `2단 발문 꼴이 아니다: ${p.content}`).toBeTruthy();
      const spec = p.figureSpec as BarSpec;
      expect(answerNum(p.answer), `seed ${seed}`).toBe(
        barValue(spec, m![1]!) + barValue(spec, m![2]!),
      );
    }
  });

  it("1-5-1 3단 — 칸 답에 눈금을 곱하면 그림의 두 값의 차다 (두 형태 다 나온다)", () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-1"), seed, "응용");
      const spec = p.figureSpec as BarSpec;
      const got = answerNum(p.answer);
      expect(p.answer, `seed ${seed}`).toMatch(/칸$/);
      if (/가장 많은/.test(p.content)) {
        kinds.add("최대최소");
        const vals = spec.values.map((v) => v.value!);
        expect(got * spec.yStep, `seed ${seed}`).toBe(
          Math.max(...vals) - Math.min(...vals),
        );
      } else {
        kinds.add("지목한둘");
        const m = p.content.match(
          /([가-힣]+)의 막대는 ([가-힣]+)의 막대보다 눈금 몇 칸 더 깁니까/,
        );
        expect(m, `3단 발문 꼴이 아니다: ${p.content}`).toBeTruthy();
        const big = barValue(spec, m![1]!);
        const small = barValue(spec, m![2]!);
        expect(big, `seed ${seed}: 큰 쪽이 앞에 와야 한다`).toBeGreaterThan(
          small,
        );
        expect(got * spec.yStep, `seed ${seed}`).toBe(big - small);
      }
    }
    expect(kinds.size, `3단이 ${[...kinds]} 한 가지로만 나온다`).toBe(2);
  });

  it("1-5-1 4단 — 지워진 막대를 관계 단서로 역산하고, 그림이 답을 흘리지 않는다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-1"), seed, "심화하");
      const spec = p.figureSpec as BarSpec;
      const unknown = spec.values.filter((v) => v.unknown);
      expect(unknown.length, `seed ${seed}: 숨긴 항목이 하나가 아니다`).toBe(1);
      expect(
        Object.prototype.hasOwnProperty.call(unknown[0], "value"),
        `seed ${seed}: unknown 항목에 value 가 있다 — 계약 위반`,
      ).toBe(false);

      const m = p.content.match(
        /([가-힣]+)[을를] 좋아하는 학생은 ([가-힣]+)[을를] 좋아하는 학생보다 \$(\d+)\$명 더 (많다|적다)고 합니다/,
      );
      expect(m, `4단 발문 꼴이 아니다: ${p.content}`).toBeTruthy();
      expect(m![1], `seed ${seed}: 지워진 항목을 물어야 한다`).toBe(
        unknown[0]!.label,
      );
      const ref = barValue(spec, m![2]!);
      const k = Number(m![3]);
      const truth = answerNum(p.answer);
      expect(truth, `seed ${seed}`).toBe(m![4] === "많다" ? ref + k : ref - k);

      // 그림이 답을 말할 수 없어야 한다 — 참값이 스펙 어디에도 없고, 축도 보이는
      // 값에서만 나온다(숨긴 값이 최대면 축이 크기를 귀띔한다).
      const shown = spec.values.filter((v) => !v.unknown).map((v) => v.value!);
      expect(shown, `seed ${seed}: 참값이 다른 막대 값과 같다`).not.toContain(
        truth,
      );
      expect(
        spec.yMax,
        `seed ${seed}: yMax 가 보이는 최댓값에서 안 나왔다`,
      ).toBe(Math.max(...shown) + 1);
      expect(truth, `seed ${seed}: 숨긴 값이 최댓값이다`).toBeLessThan(
        Math.max(...shown),
      );
    }
  });

  // ── 1-5-2 축 성질 (그리기 방향)

  it("1-5-2 1단 — 표의 값을 주어진 눈금으로 나눈 칸 수다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-2"), seed, "연산");
      const m = p.content.match(
        /세로 눈금 한 칸을 \$(\d+)\$명으로 하면 ([가-힣]+)의 막대는 몇 칸으로 그려야 합니까/,
      );
      expect(m, `1단 발문 꼴이 아니다: ${p.content}`).toBeTruthy();
      const s = Number(m![1]);
      const v = tableValue(p.figureSpec as TableSpec, m![2]!);
      const got = answerNum(p.answer);
      expect(p.answer, `seed ${seed}`).toMatch(/칸$/);
      expect(got * s, `seed ${seed}`).toBe(v);
      expect(Number.isInteger(got), `seed ${seed}: 칸이 자연수가 아니다`).toBe(
        true,
      );
    }
  });

  it("1-5-2 2단 — 눈금 계획: 표의 최댓값(또는 그 항목)이다 (두 형태 다 나온다)", () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-2"), seed, "기본");
      const spec = p.figureSpec as TableSpec;
      // 세로 표 — 값은 **행마다 둘째 칸**이다.
      const vals = spec.rows.map((r) => Number(r[1]));
      const max = Math.max(...vals);
      if (/적어도 몇 명까지/.test(p.content)) {
        kinds.add("몇명까지");
        expect(answerNum(p.answer), `seed ${seed}`).toBe(max);
      } else {
        kinds.add("가장길게");
        expect(/가장 길게 그려야/.test(p.content), p.content).toBe(true);
        expect(
          tableValue(spec, p.answer),
          `seed ${seed}: 답 ${p.answer} 이 최댓값 항목이 아니다`,
        ).toBe(max);
      }
    }
    expect(kinds.size, `2단이 ${[...kinds]} 한 가지로만 나온다`).toBe(2);
  });

  it("1-5-2 3단 — 두 단계: 값을 찾고 눈금으로 나눈다 (두 형태 다 나온다)", () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-2"), seed, "응용");
      const spec = p.figureSpec as TableSpec;
      const got = answerNum(p.answer);
      expect(p.answer, `seed ${seed}`).toMatch(/칸$/);
      const ms = p.content.match(/세로 눈금 한 칸을 \$(\d+)\$명으로/);
      expect(ms, `3단 발문에 눈금이 없다: ${p.content}`).toBeTruthy();
      const s = Number(ms![1]);
      if (/적어도 몇 칸/.test(p.content)) {
        kinds.add("최소칸수");
        // 세로 표 — 값은 **행마다 둘째 칸**이다.
        const vals = spec.rows.map((r) => Number(r[1]));
        expect(got * s, `seed ${seed}`).toBe(Math.max(...vals));
      } else {
        kinds.add("칸차");
        const m = p.content.match(
          /([가-힣]+)의 막대는 ([가-힣]+)의 막대보다 몇 칸 더 길게/,
        );
        expect(m, `3단 발문 꼴이 아니다: ${p.content}`).toBeTruthy();
        const big = tableValue(spec, m![1]!);
        const small = tableValue(spec, m![2]!);
        expect(big, `seed ${seed}`).toBeGreaterThan(small);
        expect(got * s, `seed ${seed}`).toBe(big - small);
      }
      expect(Number.isInteger(got), `seed ${seed}`).toBe(true);
    }
    expect(kinds.size, `3단이 ${[...kinds]} 한 가지로만 나온다`).toBe(2);
  });

  it("1-5-2 4단 — 「그렸더니 몇 칸」에서 눈금을 되짚는다 (두 형태 다 나온다)", () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("1-5-2"), seed, "심화하");
      const spec = p.figureSpec as TableSpec;
      const got = answerNum(p.answer);
      const back = p.content.match(
        /([가-힣]+)의 막대가 \$(\d+)\$칸이 되었습니다\. 세로 눈금 한 칸을 몇 명으로/,
      );
      if (back) {
        kinds.add("눈금역산");
        const v = tableValue(spec, back[1]!);
        const c = Number(back[2]);
        expect(
          c,
          `seed ${seed}: 한 칸짜리 막대는 역산이 자명하다`,
        ).toBeGreaterThanOrEqual(2);
        expect(got * c, `seed ${seed}`).toBe(v);
      } else {
        kinds.add("되짚어적용");
        const m = p.content.match(
          /([가-힣]+)의 막대를 \$(\d+)\$칸으로 그렸습니다\. 같은 눈금으로 ([가-힣]+)의 막대는 몇 칸으로/,
        );
        expect(m, `4단 발문 꼴이 아니다: ${p.content}`).toBeTruthy();
        const vx = tableValue(spec, m![1]!);
        const c = Number(m![2]);
        const vy = tableValue(spec, m![3]!);
        expect(c, `seed ${seed}`).toBeGreaterThanOrEqual(2);
        expect(vx % c, `seed ${seed}: 눈금이 자연수가 아니다`).toBe(0);
        expect(got * (vx / c), `seed ${seed}`).toBe(vy);
      }
      expect(Number.isInteger(got), `seed ${seed}`).toBe(true);
    }
    expect(kinds.size, `4단이 ${[...kinds]} 한 가지로만 나온다`).toBe(2);
  });

  // ── 공통 가드

  it("해설의 셈이 하나도 빠짐없이 실제로 맞는다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const m of p.solution.matchAll(
            /\$(\d+)(\+|-|\\div)(\d+)=(\d+)\$/g,
          )) {
            const a = Number(m[1]);
            const b = Number(m[3]);
            const c = Number(m[4]);
            const want = m[2] === "+" ? a + b : m[2] === "-" ? a - b : a / b;
            if (want !== c)
              bad.push(
                `${code} ${tier} seed ${seed}: ${m[1]}${m[2]}${m[3]}=${m[4]} (참 ${want})`,
              );
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const stems = new Set<string>();
        for (let seed = 0; seed < 240; seed += 1) {
          stems.add(
            generateElementaryProblem(unitOf(code), seed, tier).content.replace(
              /\$[^$]*\$/g,
              "#",
            ),
          );
        }
        expect(stems.size, `${code} ${tier} 변형 공간`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("표준·파일럿·갈래끼리 발문이 겹치지 않는다 (1-5 전체, R5)", () => {
    for (const seed of SEEDS) {
      const all: string[] = [];
      for (const code of [...CODES, "1-5-3"]) {
        all.push(generateElementaryProblem(unitOf(code), seed).content);
        for (const tier of tiersOf(unitOf(code))) {
          all.push(generateElementaryProblem(unitOf(code), seed, tier).content);
        }
      }
      const dup = all.filter((c, i) => all.indexOf(c) !== i);
      expect(dup, `seed ${seed}: ${dup[0] ?? ""}`).toEqual([]);
    }
  });

  it("씨앗을 바꾸면 갈래마다 문항이 갈린다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Set(
          SEEDS.map(
            (s) => generateElementaryProblem(unitOf(code), s, tier).content,
          ),
        );
        // 소재·규모·형태 조합이라 수 갈래처럼 16 전부 갈리지는 않는다.
        // 실측(2026-08-23)은 갈래마다 14~16 — 여유를 두고 12 이상을 잠근다.
        expect(
          seen.size,
          `${code} ${tier}: 씨앗 16개에서 발문이 ${seen.size}가지뿐이다`,
        ).toBeGreaterThan(11);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (outside)
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: ${text.match(risk)![0]}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // 1-5-1 심화의 그림 — 점선 자리와 ? 가 실제로 그려지고, 참값이 지면에 새지 않는다.
  // (계약과 렌더는 파일럿 4단과 같다 — elem-figures 6a19b9b8, ? 위치는 원장님 확정.)
  it("1-5-1 4단 그림이 실제로 그려지고, 점선 자리와 ? 가 나온다", async () => {
    const bad: string[] = [];
    for (const seed of SEEDS.slice(0, 6)) {
      const p = generateElementaryProblem(unitOf("1-5-1"), seed, "심화하");
      const r = await renderFigureSpec(p.figureSpec);
      if (!r.ok) {
        bad.push(`씨앗 ${seed}: ${r.error}`);
        continue;
      }
      if (!/stroke-dasharray/.test(r.svg))
        bad.push(`씨앗 ${seed}: 점선 자리가 없다`);
      if (!/\?/.test(r.svg)) bad.push(`씨앗 ${seed}: ? 표시가 없다`);
      const truth = answerNum(p.answer);
      const drawn = [...r.svg.matchAll(/<text([^>]*)>\s*(\d+)\s*<\/text>/g)]
        .filter((m) => /font-size="16"/.test(m[1]!))
        .map((m) => Number(m[2]));
      if (drawn.includes(truth))
        bad.push(`씨앗 ${seed}: 참값 ${truth} 이 막대 이름표로 그려졌다`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  // 1-5-2 의 표 — 네 갈래 모두 실제로 그려진다 (표가 못 그려지면 「표를 보고」가 거짓말이 된다).
  it("1-5-2 갈래의 표가 실제로 그려진다", async () => {
    const bad: string[] = [];
    for (const tier of tiersOf(unitOf("1-5-2"))) {
      for (const seed of SEEDS.slice(0, 3)) {
        const p = generateElementaryProblem(unitOf("1-5-2"), seed, tier);
        const r = await renderFigureSpec(p.figureSpec);
        if (!r.ok) bad.push(`${tier} 씨앗 ${seed}: ${r.error}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  }, 60_000);
});
