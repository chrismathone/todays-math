/**
 * 제품 고르기 목록은 떠 있는 판이다(원장님 2026-09-30 «메뉴가 열릴 때 내부에서 열리지 말고 레이아웃 별도로
 * 잡아서 탭 늘어나지 않게»). jsdom 은 배치를 모르니 CSS 규칙 자체를 잠근다 — 흐름 안(`margin` 으로 밀어내기)으로
 * 되돌아가면 빨개진다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(process.cwd(), "src/components/unified/Workroom.module.css"),
  "utf8",
);

function firstBlock(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, `${selector} 규칙이 없다`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

describe("product picker overlay", () => {
  it("floats under the brand instead of pushing the side menu down", () => {
    const block = firstBlock(".productPicker");
    expect(block).toMatch(/position:\s*absolute/);
    expect(block).toMatch(/top:\s*calc\(100% \+ 6px\)/);
    expect(block).toMatch(/margin:\s*0;/);
    expect(block).toMatch(/z-index:\s*\d+/);
  });

  it("anchors on the brand block", () => {
    expect(firstBlock(".productMenu")).toMatch(/position:\s*relative/);
  });
});
