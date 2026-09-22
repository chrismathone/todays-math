import { describe, expect, it } from "vitest";
import { typesetFigureSvg } from "@/components/unified/figure-editor/figureTypeset";
import {
  cleanFigureForSave,
  figureObjects,
} from "@/components/unified/figure-editor/figureSvgEditing";
import {
  LINE_GAP_ATTR,
  addMidLabel,
  midLabelTarget,
} from "@/components/unified/figure-editor/figureMidLabel";

/**
 * 치수선 가운데 글자 — 원장님 2026-09-22 «치수선 위에 라벨을 넣으려고 하는데, 흰색을 넣자니 배경색이 흰색이 되어버리는데,
 * 스마트하게 치수선 위에 글자 넣을 방법 없을까» → «곡선에서 바로 글자».
 * 선·곡선 한가운데에 글자를 세우고, 조판이 그 글자 상자만큼 **선에 구멍**을 낸다(배경색이 아니다).
 */
const NS = "http://www.w3.org/2000/svg";
const svg = (...parts: string[]) =>
  `<svg xmlns="${NS}" viewBox="0 0 480 360">${parts.join("")}</svg>`;
const curve = (attrs = "") =>
  `<path data-object-id="curve" d="M 100 200 Q 200 120 300 200" stroke="#111111" stroke-dasharray="5 4" fill="none"${attrs}/>`;
const read = (source: string) =>
  new DOMParser().parseFromString(source, "image/svg+xml");
const added = (source: string, id: string) =>
  read(source).querySelector(`[data-object-id="${id}"]`)!;
const num = (node: Element, name: string) => Number(node.getAttribute(name));
const holes = (doc: Document, target: Element) => {
  const ref = /^url\(#(.+)\)$/.exec(target.getAttribute("mask") ?? "")?.[1];
  const mask = ref ? doc.getElementById(ref) : null;
  return mask
    ? [...mask.querySelectorAll("polygon")].map((p) =>
        p
          .getAttribute("points")!
          .split(" ")
          .map((pair) => pair.split(",").map(Number) as [number, number]),
      )
    : [];
};
const inside = ([x, y]: [number, number], polygon: [number, number][]) => {
  const xs = polygon.map((p) => p[0]),
    ys = polygon.map((p) => p[1]);
  return (
    x > Math.min(...xs) &&
    x < Math.max(...xs) &&
    y > Math.min(...ys) &&
    y < Math.max(...ys)
  );
};

describe("가운데 글자 — 자리", () => {
  it("한 토막 곡선이면 노란 손잡이 자리(곡선의 한가운데)에 선다 — 가운데 맞춤·«뒤 선 끊기»", () => {
    const result = addMidLabel(svg(curve()), "curve", " 9 cm ")!;
    const text = added(result.svg, result.id);
    expect(text.localName).toBe("text");
    // (P0 + 2C + P2) / 4 = ((100 + 400 + 300) / 4, (200 + 240 + 200) / 4)
    expect([num(text, "x"), num(text, "y")]).toEqual([200, 160]);
    expect(text.getAttribute("data-mj")).toBe("9 cm");
    expect(text.getAttribute("text-anchor")).toBe("middle");
    expect(text.getAttribute("dominant-baseline")).toBe("central");
    expect(text.getAttribute(LINE_GAP_ATTR)).toBe("1");
    // 배경색이 아니다 — 색 칸은 «없음» 그대로
    expect(text.hasAttribute("data-text-bg")).toBe(false);
  });

  it("선이면 두 끝의 가운데 · 옮긴 요소(transform)면 옮긴 자리", () => {
    const line = `<line data-object-id="line" x1="40" y1="300" x2="200" y2="300" stroke="#111111" transform="translate(10 -20)"/>`;
    const result = addMidLabel(svg(line), "line", "6 cm")!;
    const text = added(result.svg, result.id);
    expect([num(text, "x"), num(text, "y")]).toEqual([130, 280]);
  });

  it("옆 글자들과 같은 크기 — 그림에서 가장 흔한 글자 크기", () => {
    const labels = [22, 22, 16]
      .map(
        (size, i) =>
          `<text data-object-id="t${i}" x="${10 + i * 30}" y="20" font-size="${size}">A</text>`,
      )
      .join("");
    const result = addMidLabel(svg(curve(), labels), "curve", "x")!;
    expect(added(result.svg, result.id).getAttribute("font-size")).toBe("22");
  });

  it("세울 수 없는 요소·빈 글자는 아무것도 안 한다", () => {
    const circle = `<circle data-object-id="c" cx="50" cy="50" r="20" fill="none" stroke="#111111"/>`;
    const twoCurves = `<path data-object-id="p" d="M 0 0 Q 10 10 20 0 Q 30 -10 40 0" fill="none" stroke="#111111"/>`;
    expect(addMidLabel(svg(circle), "c", "3")).toBeNull();
    expect(addMidLabel(svg(twoCurves), "p", "3")).toBeNull();
    expect(addMidLabel(svg(curve()), "curve", "  ")).toBeNull();
    const objects = figureObjects(svg(curve(), circle, twoCurves));
    expect(objects.map((o) => midLabelTarget(o))).toEqual([true, false, false]);
  });
});

describe("가운데 글자 — 조판이 선에 구멍을 낸다", () => {
  it("글자 밑을 지나는 선은 끊기고, 글자는 배경 사각형 없이 선다", async () => {
    const result = addMidLabel(svg(curve()), "curve", "9 cm")!;
    const doc = read(await typesetFigureSvg(result.svg, true));
    const path = doc.querySelector('[data-object-id="curve"]')!;
    const [hole] = holes(doc, path);
    expect(hole).toBeDefined();
    // 구멍이 글자 자리(200, 160)를 덮는다
    expect(inside([200, 160], hole)).toBe(true);
    const mask = doc.getElementById(
      /url\(#(.+)\)/.exec(path.getAttribute("mask")!)![1],
    )!;
    // 기본값(objectBoundingBox)이면 높이 0 인 가로선이 통째로 사라진다
    expect(mask.getAttribute("maskUnits")).toBe("userSpaceOnUse");
    expect(num(mask, "width")).toBeGreaterThan(480);
    const label = doc.querySelector(`[data-object-id="${result.id}"]`)!;
    expect(label.querySelector("rect")).toBeNull();
  });

  it("fill 을 안 적은 선(`<line>`)도 끊는다 — 선에는 채울 곳이 없다", async () => {
    const line = `<line data-object-id="line" x1="330" y1="90" x2="330" y2="220" stroke="#111111" stroke-dasharray="5 4"/>`;
    const result = addMidLabel(svg(line), "line", "7 cm")!;
    const doc = read(await typesetFigureSvg(result.svg, true));
    const [hole] = holes(doc, doc.querySelector('[data-object-id="line"]')!);
    expect(inside([330, 155], hole)).toBe(true);
  });

  it("칠한 면은 글자 밑이어도 구멍을 안 낸다 — 선만 끊는다", async () => {
    const face = `<polygon data-object-id="face" points="150,150 250,150 250,190 150,190" fill="#ffee00"/>`;
    const result = addMidLabel(svg(face, curve()), "curve", "9 cm")!;
    const doc = read(await typesetFigureSvg(result.svg, true));
    expect(
      doc.querySelector('[data-object-id="face"]')!.hasAttribute("mask"),
    ).toBe(false);
  });

  it("«뒤 선 끊기»가 없는 글자는 구멍을 안 낸다 — 지금 그림은 그대로", async () => {
    const plain = `<text data-object-id="t" x="200" y="160" font-size="18" text-anchor="middle" data-mj="9 cm">9 cm</text>`;
    const doc = read(await typesetFigureSvg(svg(curve(), plain), true));
    expect(doc.querySelector("mask")).toBeNull();
    expect(
      doc.querySelector('[data-object-id="curve"]')!.hasAttribute("mask"),
    ).toBe(false);
  });

  it("글자를 옮기면(transform) 구멍도 옮겨 간다", async () => {
    const result = addMidLabel(svg(curve()), "curve", "9 cm")!;
    const moved = result.svg.replace(
      `data-object-id="${result.id}"`,
      `data-object-id="${result.id}" transform="translate(0 100)"`,
    );
    const doc = read(await typesetFigureSvg(moved, true));
    const [hole] = holes(doc, doc.querySelector('[data-object-id="curve"]')!);
    expect(inside([200, 260], hole)).toBe(true);
    expect(inside([200, 160], hole)).toBe(false);
  });

  it("옮긴 선(transform)은 그 선의 좌표로 옮긴 구멍을 받는다", async () => {
    const result = addMidLabel(
      svg(curve(' transform="translate(50 0)"')),
      "curve",
      "9 cm",
    )!;
    const doc = read(await typesetFigureSvg(result.svg, true));
    const [hole] = holes(doc, doc.querySelector('[data-object-id="curve"]')!);
    // 글자는 그림 좌표 (250, 160) — 선의 좌표로는 (200, 160)
    expect(inside([200, 160], hole)).toBe(true);
  });

  it("저장 이미지에도 구멍이 남고, 원문은 끊지 않은 선 그대로 저장된다", async () => {
    const result = addMidLabel(svg(curve()), "curve", "9 cm")!;
    const saved = cleanFigureForSave(result.svg);
    expect(saved).toContain(`${LINE_GAP_ATTR}="1"`);
    expect(saved).not.toContain("mask");
    const image = read(await typesetFigureSvg(saved));
    const path = image.querySelector("path[mask]")!;
    expect(path).not.toBeNull();
    expect(holes(image, path)).toHaveLength(1);
    expect(image.querySelector("mask")!.getAttribute("maskUnits")).toBe(
      "userSpaceOnUse",
    );
  });

  it("구멍이 다르면 마스크 이름도 다르다 — 한 화면의 여러 그림이 서로의 구멍을 빌리지 않는다", async () => {
    const a = addMidLabel(svg(curve()), "curve", "9 cm")!;
    const b = addMidLabel(svg(curve()), "curve", "12 cm")!;
    const id = async (source: string) =>
      read(await typesetFigureSvg(source, true))
        .querySelector("mask")!
        .getAttribute("id");
    expect(await id(a.svg)).not.toBe(await id(b.svg));
    expect(await id(a.svg)).toBe(await id(a.svg));
  });
});
