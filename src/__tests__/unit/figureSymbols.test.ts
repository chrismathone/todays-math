// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  FIGURE_SYMBOL_GROUPS,
  FIGURE_SYMBOL_TEX,
  figureSymbolInput,
} from "@/components/unified/figure-editor/figureSymbols";
import { typesetLabel } from "@/components/unified/figure-editor/mathjaxLabel";

/**
 * 글자 칸 특수문자 자판 — 원장님 2026-09-19 «자주 쓰이는 특수문자들은 기본적으로 몇 개 나열해 놓고 클릭해서 입력»
 * · «일반 글자에서도 입력 가능한 모든 것. 대신 카테고리를 묶어서 선택하게 (모바일 키보드 자판처럼)».
 */
const MINIMUM: Record<string, string> = {
  기하: "° ∠ △ ⊥ ∥ ≡ ⌒ ′ ″ ∽ ▱ ⊙",
  그리스: "π θ α β γ δ λ μ σ ω Δ Σ",
  연산: "× ÷ ± ∓ · √ ≤ ≥ ≠ ≒ ≈ ∝ < >",
  집합: "∈ ∉ ⊂ ⊄ ⊃ ∪ ∩ ∅ ∴ ∵ ∀ ∃ ⇒ ⇔ ∼",
  화살표: "→ ← ↑ ↓ ↔ ⇒ ⇐ ⇔ ↗ ↘",
  첨자: "² ³ ¹ ⁿ ₁ ₂ ₃ ₙ ½ ⅓ ¼ ⅔ ¾",
  단위: "㎜ ㎝ ㎞ ㎠ ㎡ ㎢ ㎤ ㎥ ㎖ ℓ ㎘ ㎎ ㎏ ℃ %",
  원문자: "① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ㉠ ㉡ ㉢ ㉣ ㉤ 「 」 《 》 【 】 ※",
  기타: "□ ■ ○ ● ◇ ◆ ☆ ★ ∞ ⋯ …",
};

describe("특수문자 자판 — 무리와 문자", () => {
  it("아홉 무리, 처음은 «기하», 이름은 짧다", () => {
    expect(FIGURE_SYMBOL_GROUPS.map((g) => g.name)).toEqual(
      Object.keys(MINIMUM),
    );
    for (const group of FIGURE_SYMBOL_GROUPS)
      expect(group.name.length).toBeLessThanOrEqual(3);
  });

  it("지시서의 문자가 무리마다 빠짐없이 있고, 한 무리 안에 겹치는 문자가 없다", () => {
    for (const group of FIGURE_SYMBOL_GROUPS) {
      for (const symbol of MINIMUM[group.name].split(" "))
        expect(group.symbols, `${group.name} ${symbol}`).toContain(symbol);
      expect(new Set(group.symbols).size).toBe(group.symbols.length);
      for (const symbol of group.symbols) expect([...symbol]).toHaveLength(1);
    }
  });
});

describe("특수문자 자판 — 수식 탭의 대응 명령", () => {
  it("지시서의 예: ° ∠ π ≤", () => {
    expect(FIGURE_SYMBOL_TEX["°"]).toBe("^{\\circ}");
    expect(FIGURE_SYMBOL_TEX["∠"]).toBe("\\angle ");
    expect(FIGURE_SYMBOL_TEX["π"]).toBe("\\pi ");
    expect(FIGURE_SYMBOL_TEX["≤"]).toBe("\\le ");
  });

  it("일반 글자는 문자 그대로, 수식은 대응 명령 — 대응이 없으면 문자 그대로", () => {
    expect(figureSymbolInput("∠", "text")).toBe("∠");
    expect(figureSymbolInput("∠", "math")).toBe("\\angle ");
    expect(figureSymbolInput("㎝", "math")).toBe("\\mathrm{cm}");
    expect(figureSymbolInput("①", "math")).toBe("①");
    expect(figureSymbolInput("<", "math")).toBe("<");
  });

  it("대응표의 모든 열쇠가 자판에 있다(자판에 없는 문자를 대응표만 알지 않는다)", () => {
    const all = new Set(FIGURE_SYMBOL_GROUPS.flatMap((g) => g.symbols));
    for (const symbol of Object.keys(FIGURE_SYMBOL_TEX))
      expect(all, symbol).toContain(symbol);
  });

  it("수식 탭에서 어느 문자를 눌러도 라벨이 조판된다 — TeX 원문으로 물러서지 않는다", () => {
    const broken: string[] = [];
    for (const group of FIGURE_SYMBOL_GROUPS)
      for (const symbol of group.symbols) {
        const input = figureSymbolInput(symbol, "math");
        if (!typesetLabel(`$A${input}B$`))
          broken.push(`${group.name} ${symbol} → ${input}`);
      }
    expect(broken).toEqual([]);
  });

  it("MathJax 가 그리는 문자는 지금처럼 MathJax 가 그린다 — 글자(<text>)로 돌리지 않는다", () => {
    for (const raw of ["$□ABCD$", "$\\triangle ABC$", "$∠A$", "$x^2$"]) {
      const laid = typesetLabel(raw);
      expect(laid, raw).not.toBeNull();
      expect(laid!.inner, raw).not.toMatch(/<text\b/);
    }
  });

  it("MathJax 가 못 그리는 문자는 한글처럼 글자 조각으로 잇는다", () => {
    const laid = typesetLabel("$x=①$");
    expect(laid).not.toBeNull();
    expect(laid!.inner).toMatch(/<text\b[^>]*>①<\/text>/);
    expect(laid!.inner).toContain('data-c="1D465"');
  });

  it("«일반 글자»는 그대로 — 조판을 못 하면 지금처럼 엔진 글자로 남는다", () => {
    expect(typesetLabel("①번")).toBeNull();
  });
});
