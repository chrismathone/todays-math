/**
 * 연산자(∫ ∑ lim …) 첨자 축소 규칙을 **지킨다** — 원장님 지시 2026-08-24.
 *
 * 왜 CSS 를 시험으로 잠그나: 이 규칙은 렌더 결과가 아니라 **지면 크기**를 정한다.
 * 지우거나 넓혀도 KaTeX 는 초록이고 화면도 «그럴듯»하다 — 실패가 침묵하는 경로다.
 * 그래서 ㉠ 규칙이 있는가 ㉡ 값이 KaTeX 기본(0.7)보다 작은가 ㉢ **지수(.mord)까지
 * 잡지는 않는가** 셋을 본다. ㉢ 이 없으면 «다 줄이면 되지»로 넓혔을 때 $x^2$ 이
 * 같이 작아지는데 아무도 모른다.
 *
 * 실제 조상 사슬은 실측했다(KaTeX 0.16):
 *   ∫   → base > mop > msupsub > … > sizing.reset-size6.size3
 *   ∑·lim → base > mop.op-limits > … > sizing.reset-size6.size3
 *   x^2 → base > mord > msupsub > … > sizing.reset-size6.size3
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf-8",
);

/** `.katex .mop …{ font-size: … }` 규칙 본문만 잘라 낸다. */
function opLimitBlock(): string {
  const at = CSS.indexOf(".katex .mop .sizing");
  expect(at, "연산자 첨자 축소 규칙이 globals.css 에 없다").toBeGreaterThan(-1);
  const end = CSS.indexOf("}", at);
  return CSS.slice(at, end + 1);
}

describe("연산자 첨자 축소 (∫ ∑ lim)", () => {
  it("규칙이 있고 KaTeX 기본(0.7)보다 작다", () => {
    const block = opLimitBlock();
    expect(block).toContain("--op-limit-scale");

    const decl = CSS.match(/--op-limit-scale:\s*([0-9.]+)em/);
    expect(decl, "--op-limit-scale 기본값이 없다").not.toBeNull();
    const scale = Number(decl![1]);
    expect(scale).toBeGreaterThan(0.4); // 종이에서 안 읽힐 만큼 작으면 안 된다
    expect(scale).toBeLessThan(0.7); // KaTeX 기본과 같으면 아무것도 안 한 것이다
  });

  it("연산자(.mop)만 잡는다 — 지수·아래첨자(.mord)는 안 건드린다", () => {
    const block = opLimitBlock();
    // 선택자 부분(= 여는 중괄호 앞)에 .mord 가 있으면 $x^2$ 까지 작아진다.
    const selector = block.slice(0, block.indexOf("{"));
    expect(selector).toContain(".mop");
    expect(selector).not.toContain(".mord");
  });

  it("∫ 와 ∑·lim 두 배치를 모두 덮는다", () => {
    // ∫ 는 .mop > .msupsub, ∑·lim 은 .mop.op-limits — 둘 다 «.mop 안» 이므로
    // 자손 선택자여야 한다. `.mop > .sizing` 처럼 직계로 좁히면 한쪽이 빠진다.
    const selector = opLimitBlock();
    expect(selector).not.toMatch(/\.mop\s*>\s*\.sizing/);
    expect(selector).toMatch(/\.katex\s+\.mop\s+\.sizing/);
  });
});
