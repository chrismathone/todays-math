/**
 * 작업실 MathLive 칸의 한글 수식 «작은 판» — 사전만 여기서 잰다 (트랙 8, 2026-09-19).
 *
 * 키 입력은 jsdom 으로 못 잰다(MathLive 가 실제 브라우저의 키 이벤트·그림을 쓴다) —
 * 친 결과는 `e2e/hwp-math-input/hwp-math-input.spec.ts` 가 작업실 화면에서 못 박는다.
 * 여기서는 «무엇을 넣고 무엇을 빼는가»만 본다.
 */
import { describe, expect, it } from "vitest";

import {
  buildHwpInlineShortcuts,
  hwpInlineShortcutFallback,
} from "@/components/math/editor/hwpMathShortcuts";

/** MathLive 기본 사전의 일부(0.110) — 실제 값은 `field.inlineShortcuts` 에서 온다. */
const DEFAULTS = {
  of: "\\circ",
  times: "\\times",
  divide: "\\div",
  deg: "\\degree",
  sqrt: "\\sqrt{#?}",
  in: "\\in",
  "+-": "\\pm",
  pi: "\\pi",
  Pi: "\\Pi",
};

describe("[hwpMathShortcuts] 작은 판 사전", () => {
  const table = buildHwpInlineShortcuts(DEFAULTS);

  it("구조 셋 — root·bar·over 는 빈 칸을 만든다", () => {
    expect(table.root).toBe("\\sqrt{#?}");
    expect(table.bar).toBe("\\overline{#?}");
    expect(table.over).toBe("\\frac{#@}{#?}");
    expect(table.ROOT).toBe("\\sqrt{#?}");
  });

  it.each([
    ["TIMES", "\\times"],
    ["DIVIDE", "\\div"],
    ["DEG", "^{\\circ}"],
    ["angle", "\\angle"],
    ["triangle", "\\triangle"],
    ["LEQ", "\\le"],
    ["GEQ", "\\ge"],
    ["NEQ", "\\ne"],
    ["INF", "\\infty"],
    ["CUP", "\\cup"],
    ["CAP", "\\cap"],
    ["SUBSET", "\\subset"],
    ["NOTIN", "\\notin"],
    ["EMPTYSET", "\\varnothing"],
    ["because", "\\because"],
    ["therefore", "\\therefore"],
    ["CDOTS", "\\cdots"],
    ["bot", "\\perp"],
    ["-+", "\\mp"],
  ])("%s → %s", (key, latex) => {
    expect(table[key]).toBe(latex);
  });

  it("MathLive 기본값은 그대로 둔다 — 지금 손에 익은 입력을 바꾸지 않는다", () => {
    expect(table.times).toBe("\\times");
    expect(table.deg).toBe("\\degree");
    expect(table.sqrt).toBe("\\sqrt{#?}");
    expect(table.in).toBe("\\in");
    expect(table["+-"]).toBe("\\pm");
  });

  it("한컴과 부딪히는 기본값 `of`(→∘)는 뺀다", () => {
    expect(table).not.toHaveProperty("of");
  });

  /**
   * 🔴 짧은 낱말은 긴 낱말 **끝에서** 터진다 — MathLive 는 친 글자열의 꼬리를 본다.
   *    `ge` 를 넣으면 `age` 가 `a≥`, `it` 를 넣으면 `digit` 가 `dig𝑖𝑡`, `rm` 은 `term` 을 깬다.
   */
  it.each(["le", "ge", "ne", "it", "rm", "of", "to", "from", "left", "right"])(
    "위험한 짧은 낱말 %s 는 사전에 없다",
    (word) => {
      expect(table).not.toHaveProperty(word);
      expect(hwpInlineShortcutFallback(word)).toBe("");
    },
  );

  it("원래 사전을 고치지 않는다", () => {
    expect(DEFAULTS.of).toBe("\\circ");
  });
});

describe("[hwpMathShortcuts] 대소문자 무시 (사전에 없는 모양만)", () => {
  it.each([
    ["Root", "\\sqrt{#?}"],
    ["Over", "\\frac{#@}{#?}"],
    ["Times", "\\times"],
    ["Angle", "\\angle"],
    ["Inf", "\\infty"],
    ["BeCause", "\\because"],
  ])("%s → %s", (word, latex) => {
    expect(hwpInlineShortcutFallback(word)).toBe(latex);
  });

  it("화살표는 대소문자가 뜻을 가른다 — rarrow 는 →, RARROW 는 ⇒ (섞은 모양은 모른다)", () => {
    const table = buildHwpInlineShortcuts(DEFAULTS);
    expect(table.rarrow).toBe("\\to");
    expect(table.RARROW).toBe("\\Rightarrow");
    expect(hwpInlineShortcutFallback("Rarrow")).toBe("");
  });

  it("그리스 문자는 건드리지 않는다 — Pi 와 pi 는 다른 글자다", () => {
    expect(hwpInlineShortcutFallback("PI")).toBe("");
    expect(hwpInlineShortcutFallback("Theta")).toBe("");
  });
});
