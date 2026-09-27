/**
 * 책장 넘김 빛 띠(`question-page-turn.module.css` 의 `.page::after`)는 **칸 안에서만** 움직인다.
 *
 * 원장님 제보(2026-09-27, 운영 PC): 개념 탐험 «정의 조립» 문제 칸 아래에 쓸데없는 가로 막대 — 손잡이가 칸 폭의 약 75%.
 * 원인: 이 무늬를 받는 칸은 전부 **스크롤 칸**(`overflow: auto` — 탐험 문제 칸·과정 문제 칸·복습 문제 칸)인데, 빛 띠가
 * 상자째 `transform: translateX(35%)` 로 옮겨지고(`animation … both`) 끝난 뒤에도 투명한 채 그 자리에 남았다.
 * 옮겨진 상자가 칸의 스크롤 범위를 칸 폭의 35% 만큼 넓혔다(실측: 800 폭 PC 칸 744px → 넘침 260px, 빛 띠를 끄면 0).
 * 폰은 막대가 겹쳐 떠서 안 보였을 뿐 같은 넘침이었다.
 *
 * 그래서 빛 띠는 상자를 옮기지 않고 **그라데이션 자리만** 옮긴다. 이 시험은 그 약속을 지킨다 —
 * 빛 띠 상자는 칸을 꼭 덮고(`inset: 0`), 빛 띠의 움직임(keyframes)에 상자를 옮기거나 키우는 속성이 없다.
 * 실제 넘침(스크롤 폭)은 폰 실측이 잰다: `scripts/qa/mobile-explorers-qa.mjs` 의 `paneOverflow`(모든 활동·PC·폰).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(__dirname, "../../components/math-srs/question-page-turn.module.css"),
  "utf8",
);

/** `선택자 { … }` 한 덩이의 속을 돌려준다(중첩 없는 규칙만). */
function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} 규칙이 없다`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}
/** `@keyframes 이름 { … }` 의 속(안쪽 괄호까지). */
function keyframes(name: string): string {
  const start = css.indexOf(`@keyframes ${name} {`);
  expect(start, `@keyframes ${name} 가 없다`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index++) {
    if (css[index] === "{") depth++;
    if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  throw new Error(`@keyframes ${name} 가 닫히지 않았다`);
}

describe("책장 넘김 빛 띠는 스크롤 칸을 넓히지 않는다", () => {
  const light = ruleBody('.page[data-page-turn="true"]::after');
  const animation = /animation:\s*([A-Za-z-]+)/.exec(light)?.[1];

  it("빛 띠 상자는 칸을 꼭 덮는다", () => {
    expect(light).toMatch(/position:\s*absolute/);
    expect(light).toMatch(/inset:\s*0;/);
    expect(light).not.toMatch(
      /\b(transform|translate|scale|width|left|right|margin)\s*:/,
    );
  });

  it("빛 띠의 움직임에 상자를 옮기거나 키우는 속성이 없다", () => {
    expect(animation).toBeTruthy();
    const frames = keyframes(animation!);
    expect(frames).not.toMatch(
      /\b(transform|translate|scale|rotate|inset|left|right|top|bottom|width|height|margin|padding)\s*:/,
    );
    // 옮기는 것은 그라데이션 자리뿐 — 처음과 끝이 다르다(띠가 지나간다).
    const shift = [...frames.matchAll(/--paper-light:\s*(-?[\d.]+%)/g)].map(
      (match) => match[1],
    );
    expect(shift).toHaveLength(2);
    expect(shift[0]).not.toBe(shift[1]);
  });
});
