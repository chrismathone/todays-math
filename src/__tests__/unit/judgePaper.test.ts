/**
 * **판정형의 지면 관문** (`src/lib/middle/judge/paper.ts` — 2026-10-08 엔진 보강 2단계 · 리드 결정 «C»).
 *
 * 값이 맞는 것과 지면에 들어가는 것은 다른 물음이다. 2단계 표본을 제품 지면으로 떠 보니 «식» 보기가 2열 칸에서
 * 접혔다 — 진위 · 변이 · 정답지 자가 전부 초록인데. 그래서 등록부가 «제품이 고르는 열 수의 칸에 식이 들어가는가»를
 * 본다. 이 시험은 그 자와 관문을 잰다.
 *
 * ```
 * ㉠ 폭 — Chromium 에서 잰 값을 못 박는다(제품 통합 시험지 2단 · 본문 13.5px). 모델이 0.5px 안에서 맞는다
 * ㉡ 못 읽는 꼴은 null — 모르는 식을 «들어간다»로 읽지 않는다
 * ㉢ 칸 — 제품의 지면 상수와 맞댄다(제품의 치수가 바뀌면 여기서 운다 → 다시 잰다)
 * ㉣ 판정 — 열 수는 제품의 규칙을 그대로 부른다 · 그 칸보다 넓으면 «접힌다»
 * ㉤ 등록부 — 접히는 문항 · 폭을 못 잰 문항을 안 낸다 · 면제는 까닭을 적은 등록만
 * ㉥ 살아 있는 등록 — 2단계 열둘은 씨앗 300 이 전부 들어간다 · 보류한 것은 지금도 접힌다
 * ```
 *
 * 🔴 이 시험은 «계산한 폭»을 본다. 실제 지면에서 접힘이 0 인지는 브라우저로 재야 한다 —
 *    `scripts/qa/judge-paper/`(제품 컴포넌트를 Chromium 으로 띄워 잰다). 보고서에 그 수치가 있다.
 */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import { choiceColumnCount, choiceColumnLimit } from "@/lib/math/choiceLayout";
import {
  buildTruthBody,
  CALC_PAPER_STYLE,
  CALC_STYLE,
} from "@/lib/middle/judge/calcJudge";
import type {
  CompareAsk,
  CompareBody,
  CompareOption,
} from "@/lib/middle/judge/contract";
import {
  HELD_JUDGE_DEFINITIONS,
  JUDGE_DEFINITIONS,
} from "@/lib/middle/judge/definitions";
import { mul2Material } from "@/lib/middle/judge/mulDiv";
import {
  choiceRoomEm,
  choiceWidthEm,
  fitsPaper,
  fitsTwoColumnRoom,
  JUDGE_PAPERS,
  PAPER_MARGIN_PX,
  paperVerdict,
  texWidthEm,
} from "@/lib/middle/judge/paper";
import {
  assembleCompare,
  assembleJudge,
  createJudgeRegistry,
  generateJudgeProblem,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";
import { m1Rational } from "@/lib/middle/m1Calc";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";

import {
  COMPARE_LEAD,
  compareFixtureDefinition,
  fixtureDefinition,
} from "../helpers/judgeFixture";
import { readPaper } from "../helpers/texFloat";

/** 통합 시험지 2단의 KaTeX 1em — 본문 13.5px × 1.21. */
const EM_PX = 13.5 * 1.21;
const { q } = m1Rational;
const SEED0 = 20261008;
const STEP = 7919;

/**
 * Chromium 실측(2026-10-08 · 제품 `WorksheetEditor` 2단 · `scripts/qa/judge-paper/measure.mjs`) —
 * 식이 한 줄로 조판될 때의 폭(px). 꼴이 고루 들어가게 폭 차례로 골랐다.
 */
const MEASURED: readonly (readonly [string, number])[] = [
  ["\\dfrac{2}{a}", 12.5],
  ["4a+3", 45],
  ["4x+13", 53.8],
  ["-5x-22", 66.5],
  ["x^{2}+2=-2", 86.7],
  ["\\left(-2\\right)^{2}\\times\\left(-2\\right)", 93.7],
  ["\\left(+\\dfrac{5}{6}\\right)\\times\\left(-3\\right)", 102.4],
  ["\\left(-3\\right)+\\left(-\\dfrac{17}{2}\\right)", 110.6],
  ["\\left(-\\dfrac{7}{2}\\right)-\\left(-\\dfrac{3}{2}\\right)", 117.7],
  ["\\left(+\\dfrac{7}{8}\\right)\\div\\left(-\\dfrac{7}{4}\\right)", 117.7],
  ["\\left(-x\\right)^{2}-9=-18", 120.3],
  ["\\left(-\\dfrac{13}{6}\\right)-\\left(-\\dfrac{1}{6}\\right)", 125.9],
  ["\\left(+\\dfrac{9}{5}\\right)\\times\\left(-\\dfrac{20}{9}\\right)", 125.9],
  ["\\left(-\\dfrac{5}{18}\\right)\\div\\left(-\\dfrac{5}{6}\\right)", 125.9],
  ["\\left(-\\dfrac{1}{5}\\right)^{2}\\times3^{3}=\\dfrac{27}{25}", 132.1],
  ["\\left(+\\dfrac{11}{3}\\right)\\times\\left(-\\dfrac{12}{11}\\right)", 134],
  [
    "\\left(-\\dfrac{143}{20}\\right)\\div\\left(+\\dfrac{11}{4}\\right)",
    142.2,
  ],
  [
    "\\left(+\\dfrac{6}{5}\\right)\\times\\left(+\\dfrac{1}{4}\\right)=\\dfrac{3}{5}",
    151.5,
  ],
  [
    "\\left(-\\dfrac{5}{4}\\right)+\\left(+\\dfrac{17}{8}\\right)=\\dfrac{7}{8}",
    159.7,
  ],
  [
    "-\\left(-\\dfrac{2}{5}\\right)^{3}\\times\\left(-5\\right)^{2}=\\dfrac{3}{5}",
    164.8,
  ],
  [
    "\\left(+\\dfrac{1}{2}\\right)-\\left(+\\dfrac{3}{5}\\right)=-\\dfrac{1}{10}",
    172.4,
  ],
  [
    "\\left(-\\dfrac{11}{3}\\right)\\times\\left(+\\dfrac{5}{11}\\right)=-\\dfrac{10}{3}",
    188.8,
  ],
  [
    "\\left(\\dfrac{1}{3}\\right)^{2}\\times\\left(-8\\right)\\div\\left(+\\dfrac{1}{6}\\right)=-\\dfrac{4}{27}",
    219.8,
  ],
  [
    "\\left(\\dfrac{3}{2}\\right)^{2}\\times\\left(+3\\right)\\div\\left(-\\dfrac{135}{44}\\right)=-\\dfrac{22}{5}",
    236.2,
  ],
  [
    "\\left(+\\dfrac{3}{5}\\right)+\\left(+\\dfrac{14}{5}\\right)-\\left(+\\dfrac{11}{5}\\right)-\\left(+\\dfrac{2}{5}\\right)=\\dfrac{4}{5}",
    305.5,
  ],
  [
    "\\left(-\\dfrac{11}{8}\\right)+\\left(+\\dfrac{3}{4}\\right)-\\left(+\\dfrac{1}{8}\\right)-\\left(+\\dfrac{11}{8}\\right)=-\\dfrac{17}{8}",
    326.4,
  ],
];

describe("㉠ 폭 — Chromium 실측과 0.5px 안에서 맞는다", () => {
  it(`실측 ${MEASURED.length}식(제품 통합 시험지 2단 · 13.5px)`, () => {
    for (const [tex, px] of MEASURED) {
      const em = texWidthEm(tex);
      expect(em, tex).not.toBeNull();
      expect(
        Math.abs(em! * EM_PX - px),
        `${tex}: 계산 ${(em! * EM_PX).toFixed(2)}px`,
      ).toBeLessThan(0.5);
    }
  });

  it("손으로 센 값 — 글리프 폭과 간격을 더한 것 그대로", () => {
    // 숫자 0.5 · 부호 0.77778 · 작은 괄호 0.38889 · 큰 괄호 0.73611 · 분수 = 넓은 쪽 + 0.24
    expect(texWidthEm("12")).toBeCloseTo(1, 5);
    expect(texWidthEm("-12")).toBeCloseTo(1.77778, 5);
    // 이항 연산자는 좌우에 4/18 em 씩, 관계 기호는 5/18 em 씩.
    expect(texWidthEm("1+2")).toBeCloseTo(1 + 0.77778 + 8 / 18, 5);
    expect(texWidthEm("1=2")).toBeCloseTo(1 + 0.77778 + 10 / 18, 5);
    // 등호 뒤의 `-` 는 부호다(간격이 안 붙는다).
    expect(texWidthEm("1=-2")).toBeCloseTo(1 + 2 * 0.77778 + 10 / 18, 5);
    // 분수를 품은 괄호는 크다.
    expect(texWidthEm("\\left(-5\\right)")).toBeCloseTo(
      2 * 0.38889 + 0.77778 + 0.5,
      5,
    );
    expect(texWidthEm("\\left(-\\dfrac{1}{2}\\right)")).toBeCloseTo(
      2 * 0.73611 + 0.77778 + 0.74,
      5,
    );
    // 지수는 0.7 배 크기 + 0.05.
    expect(texWidthEm("5^{2}")).toBeCloseTo(0.5 + 0.35 + 0.05, 5);
    // 공백은 폭이 없다.
    expect(texWidthEm(" 1 + 2 ")).toBe(texWidthEm("1+2"));
  });
});

describe("㉡ 못 읽는 꼴은 null", () => {
  it("모르는 명령 · 모르는 문자 · 덜 닫힌 괄호 · 빈 글", () => {
    for (const tex of [
      "",
      "\\frac{1}{2}", // `\dfrac` 만 읽는다
      "\\sqrt{2}",
      "2y", // 폭을 아는 문자는 x · a 뿐이다
      "\\left(1+2",
      "1+2\\right)",
      "\\dfrac{1}",
      "2^{x}",
      "^{2}",
      "1.5",
      "넷",
    ])
      expect(texWidthEm(tex), tex).toBeNull();
  });

  it("보기 글은 수식 한 덩어리여야 한다", () => {
    expect(choiceWidthEm("$1+2$")).toBe(texWidthEm("1+2"));
    for (const text of [
      "1+2",
      "$1+2$ 이다",
      "$1$, $2$",
      "$$",
      "넷 더하기 여섯",
    ])
      expect(choiceWidthEm(text), text).toBeNull();
  });
});

describe("㉢ 칸 — 제품의 지면 상수와 맞댄다", () => {
  it("통합 시험지 2단 · 일일테스트 지면의 칸이 제품이 아는 칸이다", () => {
    const [worksheet, daily] = JUDGE_PAPERS;
    // 통합 시험지 — 제품의 «한 칸이 받아 주는 표시폭»(`choiceColumnLimit` = (칸 − 마커 20px) ÷ 7px 내림)이
    // 2열 18 · 1열 43 이다. 우리가 잰 칸을 같은 식에 넣으면 같은 수가 나와야 한다.
    expect(choiceColumnLimit(2)).toBe(18);
    expect(choiceColumnLimit(1)).toBe(43);
    expect(Math.floor(worksheet.roomPx[2] / 7)).toBe(choiceColumnLimit(2));
    expect(Math.floor(worksheet.roomPx[1] / 7)).toBe(choiceColumnLimit(1));
    expect(worksheet.fontPx).toBe(13.5);
    // 일일테스트 — 제품이 잰 보기 글 칸(1열).
    expect(daily.roomPx[1]).toBe(JASEUP_MEASURED_PX.choiceTextColumn);
    expect(daily.roomPx[2]).toBeLessThan(daily.roomPx[1] / 2);
    expect(daily.fontPx).toBe(12.5);
  });

  it("관문의 칸은 두 지면 가운데 좁은 쪽에서 여유를 뺀 것이다", () => {
    expect(PAPER_MARGIN_PX).toBe(4);
    expect(choiceRoomEm(2)).toBeCloseTo((127.6 - 4) / EM_PX, 6);
    expect(choiceRoomEm(1)).toBeCloseTo((307.2 - 4) / EM_PX, 6);
    // 모르는 열 수의 칸에는 아무것도 안 들어간다.
    expect(choiceRoomEm(3)).toBe(0);
    expect(choiceRoomEm(0)).toBe(0);
  });

  it("두 분수의 식 — 한 자리 수끼리는 2열 칸에 들어가고, 두 자리 수가 끼면 안 들어간다", () => {
    const two = (a: string, b: string) =>
      `\\left(-\\dfrac{${a}}\\right)\\times\\left(+\\dfrac{${b}}\\right)`;
    expect(fitsTwoColumnRoom(two("3}{4", "8}{9"))).toBe(true);
    // 실측 125.9px — 칸 127.6px 에 1.7px 남는다. 여유(4px)를 못 채워 안 받는다.
    expect(fitsTwoColumnRoom(two("3}{4", "20}{9"))).toBe(false);
    expect(fitsTwoColumnRoom(two("11}{4", "2}{11"))).toBe(false);
    // 한쪽이 정수면 두 자리 수까지 들어간다.
    expect(
      fitsTwoColumnRoom("\\left(-8\\right)+\\left(+\\dfrac{17}{3}\\right)"),
    ).toBe(true);
    expect(
      fitsTwoColumnRoom(
        "\\left(+\\dfrac{1}{3}\\right)\\times\\left(-30\\right)",
      ),
    ).toBe(true);
    expect(fitsTwoColumnRoom("모르는 식")).toBe(false);
  });
});

/** 값이 서로 다른 «두 분수의 곱» 다섯 — 분자 · 분모를 넘겨 폭을 고른다. */
const products = (pairs: readonly (readonly [string, string])[]) =>
  pairs.map(
    ([a, b]) =>
      `$\\left(-\\dfrac{${a}}\\right)\\times\\left(+\\dfrac{${b}}\\right)$`,
  );
const NARROW = products([
  ["1}{2", "3}{4"],
  ["2}{3", "5}{4"],
  ["3}{5", "7}{2"],
  ["5}{6", "9}{4"],
  ["7}{8", "3}{2"],
]);
const WIDE = products([
  ["1}{2", "3}{4"],
  ["2}{3", "5}{4"],
  ["3}{5", "7}{2"],
  ["5}{6", "9}{4"],
  ["11}{4", "13}{12"],
]);

describe("㉣ 판정 — 열 수는 제품의 규칙, 폭은 계산", () => {
  it("제품이 2열로 보내는 다섯 — 다 들어가면 통과, 하나라도 넓으면 그 자리를 짚는다", () => {
    expect(choiceColumnCount("auto", NARROW)).toBe(2);
    expect(paperVerdict(NARROW)).toMatchObject({ columns: 2, worst: -1 });
    expect(fitsPaper(NARROW)).toBe(true);
    // 🔴 제품은 이것도 2열로 보낸다(표시폭이 다섯 다 24 이하) — 그런데 다섯째는 칸보다 넓다.
    expect(choiceColumnCount("auto", WIDE)).toBe(2);
    const v = paperVerdict(WIDE);
    expect(v).toMatchObject({ columns: 2, worst: 4 });
    expect(v.widthsEm[4]!).toBeGreaterThan(v.roomEm);
    expect(fitsPaper(WIDE)).toBe(false);
  });

  it("제품이 1열로 보내는 다섯 — «식=값»은 2열 칸보다 넓어도 1열 칸에 들어간다", () => {
    const calc = WIDE.map((t) => t.replace(/\$$/, "=-\\dfrac{3}{8}$"));
    expect(choiceColumnCount("auto", calc)).toBe(1);
    expect(paperVerdict(calc)).toMatchObject({ columns: 1, worst: -1 });
    // 같은 다섯이 2열이었다면 전부 접힌다.
    for (const t of calc)
      expect(choiceWidthEm(t)!).toBeGreaterThan(choiceRoomEm(2));
  });

  it("폭을 못 잰 보기는 «안 들어간다» — 그 자리를 짚는다", () => {
    const unread = [...NARROW];
    unread[2] = "$\\sqrt{2}$";
    expect(paperVerdict(unread)).toMatchObject({ worst: 2 });
    expect(paperVerdict(unread).widthsEm[2]).toBeNull();
    expect(fitsPaper(unread)).toBe(false);
  });

  it("열 수는 늘 제품 함수의 답이다 — 살아 있는 문항 전부에서 같다(1열 · 2열이 다 나온다)", () => {
    const seen = new Set<number>();
    for (const d of judgementDefinitions())
      for (let s = 0; s < 40; s += 1) {
        const p = generateJudgeProblem(d.key, SEED0 + s * STEP, s % 2);
        const { choices } = readPaper(p.content);
        const columns = choiceColumnCount("auto", choices);
        expect(paperVerdict(choices).columns).toBe(columns);
        seen.add(columns);
      }
    expect([...seen].sort()).toEqual([1, 2]);
  });
});

describe("㉤ 등록부 — 접히는 문항을 안 낸다", () => {
  const ask: CompareAsk = "가장 큰 것";
  /** 보기 글이 `texts` 인 극값 문항 — 값은 0.1 · 0.2 · … 로 서로 다르게 주장한다(값을 재는 함수도 그렇게 읽는다). */
  const body = (texts: readonly string[]): CompareBody => ({
    lead: COMPARE_LEAD[ask],
    briefLead: "계산하면",
    options: texts.map((text, i): CompareOption => ({
      text,
      claimed: { n: BigInt(i + 1), d: BigInt(10) },
      brief: `$${i + 1}$`,
      work: `계산하면 $${i + 1}$`,
    })),
    facts: {},
  });
  /** 글의 차례와 상관없이 값이 서로 다르게 읽히는 등록 — 지면 관문만 가르려고. */
  const def = (texts: readonly string[], paperExempt?: string) =>
    compareFixtureDefinition({
      asks: [ask],
      readValue: (text) => {
        const at = texts.indexOf(text.trim());
        if (at >= 0) return { n: BigInt(at + 1), d: BigInt(10) };
        const brief = /^\$(\d)\$$/.exec(text.trim());
        return brief ? { n: BigInt(brief[1]!), d: BigInt(10) } : null;
      },
      ...(paperExempt === undefined ? {} : { paperExempt }),
    });

  it("음성 대조 — 2열 칸에 들어가는 다섯은 지나간다", () => {
    expect(() =>
      assembleCompare(def(NARROW), ask, body(NARROW), createRng(1)),
    ).not.toThrow();
  });

  it("🔴 2열 칸보다 넓은 식이 하나라도 있으면 사유를 달고 멈춘다", () => {
    expect(() =>
      assembleCompare(def(WIDE), ask, body(WIDE), createRng(1)),
    ).toThrow(/보기가 2열 칸에서 접힌다 — 식 폭 \d+\.\d+em > 칸 7\.57em/);
  });

  it("폭을 못 잰 보기도 멈춘다 — 모르는 꼴을 «들어간다»로 읽지 않는다", () => {
    const texts = [...NARROW];
    texts[1] = "$2y$";
    expect(() =>
      assembleCompare(def(texts), ask, body(texts), createRng(1)),
    ).toThrow(/보기의 폭을 못 쟀다/);
  });

  it("면제 — 까닭을 적은 등록은 관문을 안 지난다(1단계 · 보류) · 까닭이 비면 등록을 못 한다", () => {
    expect(() =>
      assembleCompare(def(WIDE, "시험 — 면제"), ask, body(WIDE), createRng(1)),
    ).not.toThrow();
    expect(() =>
      createJudgeRegistry([compareFixtureDefinition({ paperExempt: " " })]),
    ).toThrow(/지면 관문 면제의 까닭이 비었다/);
  });

  it("🔴 계산 판정의 짓기 — 접히는 묶음은 버리고 다시 모은다(지면 표지를 켠 문형만)", () => {
    // 앞의 여덟은 제품이 2열로 보내는 좁은 수 — 다섯이 차면 «2열인데 칸보다 넓은» 묶음이다. 그 뒤는 1열로 가는 수.
    const draw = () => {
      let i = 0;
      return () => {
        const k = i;
        i += 1;
        return k < 8
          ? mul2Material(q(-1, 2), q(-(10 * k + 3), 4))
          : mul2Material(q(11, 2), q(-(2 * (k - 8) + 3), 4));
      };
    };
    // 지면 표지가 없으면(1단계의 짓기) 처음 다섯을 그대로 낸다 — 제품이 2열로 보내고, 접힌다.
    const plain = buildTruthBody(
      createRng(1),
      "옳지 않은 것",
      draw(),
      CALC_STYLE,
    );
    expect(plain.facts.draws).toBe(5);
    const plainTexts = plain.options.map((o) => o.text);
    expect(choiceColumnCount("auto", plainTexts)).toBe(2);
    expect(fitsPaper(plainTexts)).toBe(false);
    // 표지를 켜면 그 묶음을 버리고 이어서 모은다 — 열 번째 재료에서 «들어가는 묶음»이 찬다.
    const paper = buildTruthBody(
      createRng(1),
      "옳지 않은 것",
      draw(),
      CALC_PAPER_STYLE,
    );
    expect(paper.facts.draws).toBe(10);
    expect(fitsPaper(paper.options.map((o) => o.text))).toBe(true);
    expect(paper.options.some((o) => o.text.includes("\\dfrac{11}{2}"))).toBe(
      true,
    );
  });

  it("참거짓 문형도 같은 관문을 지난다", () => {
    const fx = fixtureDefinition();
    const generated = fx.generate(createRng(3), "옳지 않은 것");
    // 픽스처의 보기(`$a+b=c$`)는 짧다 — 지나간다.
    expect(() =>
      assembleJudge(fx, "옳지 않은 것", generated, createRng(3)),
    ).not.toThrow();
    // 값은 그대로 두고 왼쪽 수를 길게 늘린다 — 참거짓은 그대로이고 폭만 넓어진다.
    const wide = {
      ...generated,
      options: generated.options.map((o) => ({
        ...o,
        text: o.text.replace(
          /^\$(-?\d+)\+/,
          (_, a: string) => `$${a}+0+0+0+0+0+0+0+0+0+0+0+0+`,
        ),
      })),
    };
    const truthOf = (text: string) =>
      fx.truthOf(text.replace(/(\+0){12}/, ""), { lead: "" });
    expect(() =>
      assembleJudge({ ...fx, truthOf }, "옳지 않은 것", wide, createRng(3)),
    ).toThrow(/칸에서 접힌다/);
  });
});

describe("㉥ 살아 있는 등록", () => {
  it("면제는 1단계 셋뿐이고 2단계 열둘은 관문을 지난다", () => {
    const entries = judgementDefinitions();
    expect(
      entries.filter((d) => d.paperExempt !== null).map((d) => d.familyId),
    ).toEqual(["calc-add2", "calc-sub2", "calc-mix4"]);
    for (const d of entries.slice(0, 3))
      expect(d.paperExempt).toContain("신분 보존");
    expect(entries.slice(3)).toHaveLength(12);
    expect(JUDGE_DEFINITIONS).toHaveLength(15);
  });

  it("2단계 열둘 — 씨앗 300 × 물음: 보기 다섯이 전부 제품이 고른 열 수의 칸에 들어간다", () => {
    const columns = new Map<string, Set<number>>();
    for (const d of judgementDefinitions().slice(3)) {
      const seen = new Set<number>();
      columns.set(d.familyId, seen);
      for (let s = 0; s < 300; s += 1) {
        const p = generateJudgeProblem(d.key, SEED0 + s * STEP, s % 2);
        const v = paperVerdict(readPaper(p.content).choices);
        expect(v.worst, `${d.key} 씨앗 ${s}\n${p.content}`).toBe(-1);
        seen.add(v.columns);
      }
    }
    // «식=값»인 계산 판정 셋은 늘 1열, 식만 있는 비교형과 짧은 식의 값은 늘 2열이다.
    const of = (id: string) => [...columns.get(id)!].sort();
    for (const id of ["calc-mul2", "calc-div2", "calc-muldiv"])
      expect(of(id), id).toEqual([1]);
    for (const id of [
      "calc-value",
      "odd-addsub2",
      "max-addsub2",
      "odd-pow",
      "max-mul2",
      "odd-div2",
      "max-div2",
      "odd-value",
      "max-value",
    ])
      expect(of(id), id).toEqual([2]);
  });

  it("🔴 보류한 calc-pow 는 지금도 접힌다 — 이 시험이 빨개지면 보류를 풀 때다", () => {
    expect(HELD_JUDGE_DEFINITIONS.map((d) => d.familyId)).toEqual(["calc-pow"]);
    const held = createJudgeRegistry(HELD_JUDGE_DEFINITIONS);
    const key = held.definitions()[0]!.key;
    let folded = 0;
    for (let s = 0; s < 200; s += 1) {
      const p = held.generate(key, SEED0 + s * STEP, s % 2);
      if (!fitsPaper(readPaper(p.content).choices)) folded += 1;
    }
    // 2026-10-08: 200 중 170 남짓이 2열로 가서 접힌다. 인쇄 쪽 폭 계산이 고쳐져 이 수가 0 에 가까워지면
    // `definitions.ts` 의 보류를 풀고(`paperExempt` 를 떼고 등록 목록 끝으로) 적재 계획을 낸다.
    expect(folded, `접히는 문항 ${folded}/200`).toBeGreaterThan(100);
  });
});
