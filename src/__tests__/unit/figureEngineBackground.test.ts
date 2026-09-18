import { describe, expect, it } from "vitest";
import {
  addFigureObject,
  cleanFigureForSave,
  figureObjects,
  prepareFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { initialFigureSource } from "@/components/unified/figure-editor/figureDocument";

// 원장님 2026-09-19 «도형 생성 시 사각형이 왜 생기나» — 도형 엔진 v2 는 캔버스 전체에 흰 바탕 rect 를
// 첫 도형으로 깐다(vendor/figure-engine/core/figure_scene.py:2906). 편집기는 문서 순서로 번호를 매겨
// 그것이 1번 «사각형»이 되고 네 모서리 조절점이 그림 바깥에 붙었다. 서버는 이제 투명으로 넘기지만
// 이미 만든 그림(초안·학습지)에는 남아 있어, 편집기에 들어오는 문에서 좁은 조건으로 걷어 낸다.
const W = 316.654;
const H = 247.324;
// 엔진 v2 출력 그대로(삼각형 ABC — 선분 둘과 라벨 하나로 줄였다)
const engine = (background: string, viewBox = `0 0 ${W} ${H}`) =>
  `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${background}
  <g>
    <line x1="148.327" y1="29.948" x2="28.327" y2="229.948" stroke="#111111" stroke-width="1.9" />
    <line x1="28.327" y1="229.948" x2="288.327" y2="229.948" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>

  </g>
  <g>
    <text x="148.327" y="24.6" font-size="16.8" text-anchor="middle" fill="#111111">A</text>
  </g>
</svg>`;
const ENGINE_BACKGROUND = `\n  <rect width="${W}" height="${H}" fill="#ffffff" />`;
const types = (svg: string) => figureObjects(svg).map((o) => o.type);
const rects = (svg: string) => (svg.match(/<rect\b/g) ?? []).length;

describe("engine background rect in the figure editor", () => {
  it("removes the v2 engine's white background so object 1 is the first real shape", () => {
    const svg = prepareFigureSvg(engine(ENGINE_BACKGROUND));
    expect(rects(svg)).toBe(0);
    expect(types(svg)).toEqual(["line", "line", "text"]);
    expect(figureObjects(svg)[0].id).toBe("obj-0");
    // 캔버스 크기는 그대로 — 바탕만 빠진다
    expect(svg).toContain(`viewBox="0 0 ${W} ${H}"`);
    // 다시 지나도 같은 요소다(cleanFigureForSave·fitFigureViewport 가 다시 부른다)
    const numbered = (value: string) =>
      figureObjects(value).map((o) => `${o.id}:${o.type}`);
    expect(numbered(prepareFigureSvg(svg))).toEqual([
      "obj-0:line",
      "obj-1:line",
      "obj-2:text",
    ]);
  });

  it.each([
    ["#fff", `<rect width="${W}" height="${H}" fill="#fff"/>`],
    ["#FFFFFF", `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`],
    ["white", `<rect width="${W}" height="${H}" fill="white"/>`],
    [
      "explicit origin and stroke none",
      `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" stroke="none"/>`,
    ],
    [
      "defs before it (scripts/figure/svg_prune.py)",
      `<defs><clipPath id="c"><rect width="1" height="1"/></clipPath></defs><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`,
    ],
  ])("also removes a white background written as %s", (_name, background) => {
    const svg = prepareFigureSvg(engine(background));
    expect(types(svg)).toEqual(["line", "line", "text"]);
  });

  it("heals drafts saved before the fix on reopen and on the next save", () => {
    const saved = cleanFigureForSave(engine(ENGINE_BACKGROUND));
    expect(rects(saved)).toBe(0);
    const reopened = initialFigureSource("", engine(ENGINE_BACKGROUND));
    expect(reopened.error).toBe("");
    expect(types(reopened.svg)).toEqual(["line", "line", "text"]);
  });

  // 사용자가 일부러 그린 흰 사각형(가림막)·elem-1 의 선 있는 rect 는 지우지 않는다
  it.each([
    [
      "an outlined rect (elem-1)",
      engine(
        `<rect width="${W}" height="${H}" fill="#ffffff" stroke="#111111" stroke-width="1.3"/>`,
      ),
    ],
    [
      "a partial white mask",
      engine(`<rect width="100" height="50" fill="#ffffff"/>`),
    ],
    [
      "an offset rect",
      engine(`<rect x="10" y="10" width="${W}" height="${H}" fill="#fff"/>`),
    ],
    [
      "a coloured fill",
      engine(`<rect width="${W}" height="${H}" fill="#f2d5c8"/>`),
    ],
    ["no fill (black)", engine(`<rect width="${W}" height="${H}"/>`)],
    [
      "a transformed rect",
      engine(
        `<rect width="${W}" height="${H}" fill="#fff" transform="rotate(5)"/>`,
      ),
    ],
    [
      "a styled rect",
      engine(
        `<rect width="${W}" height="${H}" fill="#fff" style="stroke:#111111"/>`,
      ),
    ],
    [
      "a fitted image whose viewBox moved",
      engine(ENGINE_BACKGROUND, "-12.67 -12.67 341.99 272.66"),
    ],
    // 조건을 하나씩만 어기는 표본 — 둘을 한꺼번에 어기면 하나를 꺼도 다른 하나가 지켜 줘 변이가 안 문다
    [
      "a rect shifted right only",
      engine(`<rect x="1" width="${W}" height="${H}" fill="#fff"/>`),
    ],
    [
      "a rect shifted down only",
      engine(`<rect y="1" width="${W}" height="${H}" fill="#fff"/>`),
    ],
    [
      "a narrower rect",
      engine(`<rect width="${W - 1}" height="${H}" fill="#fff"/>`),
    ],
    [
      "a shorter rect",
      engine(`<rect width="${W}" height="${H - 1}" fill="#fff"/>`),
    ],
    [
      "a canvas whose origin is not 0 0",
      engine(ENGINE_BACKGROUND, `-10 0 ${W} ${H}`),
    ],
    [
      "a canvas whose top is not 0",
      engine(ENGINE_BACKGROUND, `0 -10 ${W} ${H}`),
    ],
    [
      "a white rect drawn over other shapes",
      `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="10" y2="10" stroke="#111111"/><rect width="${W}" height="${H}" fill="#ffffff"/></svg>`,
    ],
    [
      "a white rect inside a group",
      `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><g><rect width="${W}" height="${H}" fill="#ffffff"/><line x1="0" y1="0" x2="10" y2="10" stroke="#111111"/></g></svg>`,
    ],
  ])("keeps %s", (_name, source) => {
    const svg = prepareFigureSvg(source);
    expect(rects(svg)).toBe(1);
    expect(types(svg)).toContain("rect");
    expect(rects(cleanFigureForSave(source))).toBe(1);
  });

  it("keeps a rect the user draws, even when it is the only shape", () => {
    const blank = prepareFigureSvg(
      `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>`,
    );
    const { svg } = addFigureObject(
      blank,
      "rect",
      { x: 0, y: 0 },
      { x: W, y: H },
    );
    expect(types(prepareFigureSvg(svg))).toEqual(["rect"]);
  });
});
