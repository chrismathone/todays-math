/**
 * 갈래 딱지 세로 자리 — 시안 4안 값 그대로(05 §8.19 · D-143, 리드 적대적 검토 ②).
 *
 * 시안 `docs/design/mockups/hifi-concept-context.html` 은 딱지를 세 자리에서 다르게 올린다:
 *   이름 줄(예 모으기 · 경계 살피기 · 작업실) 2px · 문장 조립 이름(제목 크기 이름 줄) 3px ·
 *   뜻 만나기 제목 · 도감 카드 제목 4px(`.qt .tag` · `.dlgh .tag`).
 * 제품이 제목 크기 딱지를 한 값(3px)으로 두어 뜻 만나기 · 도감에서 1px 낮았다. jsdom 은 CSS 모듈을 입히지 않아
 * 규칙 자체를 읽어 잠그고, 계산된 값은 실측(`mobile-explorers-qa.mjs` `conceptHeadStyle`)이 실제 브라우저에서 잰다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(__dirname, "../../components/math-explorers/concept-head.module.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** 미디어 쿼리 밖 규칙에서 선택자 하나의 속성 값. 선택자는 글자 그대로 찾는다. */
function declared(selector: string, property: string): string | undefined {
  const top = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  for (const match of top.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((item) => item.trim());
    if (!selectors.includes(selector)) continue;
    const value = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(
      match[2],
    )?.[1];
    if (value) return value.trim();
  }
  return undefined;
}

describe("갈래 딱지 세로 자리 — 시안 4안 값", () => {
  it("이름 줄 2px", () => {
    expect(declared(".kindTag", "vertical-align")).toBe("2px");
  });
  it("뜻 만나기 제목 · 도감 카드 제목(제목 크기 딱지) 4px", () => {
    expect(declared('.kindTag[data-size="title"]', "vertical-align")).toBe(
      "4px",
    );
  });
  it("문장 조립 이름(제목 크기 이름 줄 안) 3px", () => {
    expect(declared('.row[data-size="title"] .kindTag', "vertical-align")).toBe(
      "3px",
    );
  });
  it("«오늘 다시 만날 개념» 이름은 칸보다 긴 낱말만 끊는다(첫 장 칸 넘침 막기, 검토 ⑤)", () => {
    expect(declared(".todayName", "overflow-wrap")).toBe("anywhere");
  });
});
