import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fitFrameToContent,
  renderFittedFigure,
} from "@/components/unified/figure-editor/figureFrame";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * «다 보이게» — 그림을 손으로 끌어 틀 밖으로 내보내면 편집 화면에서만 잘린다(저장하면 `fitFigureViewport` 가
 * 다시 맞춘다). 원장님 2026-09-20 확정: 끌 때마다 자동으로 넓히지 않고 **단추 하나**로 한다.
 *
 * 이 트랙의 제일 중요한 성질: **틀을 다시 잡는 규칙이 저장할 때와 같아야 한다.** 갈리면 «단추를 눌러 본 모습»과
 * «저장한 모습»이 달라진다. 그래서 두 길이 `renderFittedFigure` 한 함수를 탄다 — 아래 시험이 그것을 못 박는다.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    // MathJax 는 이 시험의 관심이 아니다 — 틀은 아래 getBBox 가 정한다.
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

/** 화면이 잰 그림의 실제 경계 — 시험마다 갈아 끼운다. */
let box = { x: 0, y: 0, width: 100, height: 100 };
beforeEach(() => {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => box,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const root = (source: string) =>
  new DOMParser().parseFromString(source, "image/svg+xml").documentElement;
const viewBoxOf = (source: string) =>
  root(source)
    .getAttribute("viewBox")!
    .trim()
    .split(/[\s,]+/)
    .map(Number);
const attr = (source: string, name: string) => root(source).getAttribute(name);
/** 루트 말고 안의 요소들 — 틀만 바뀌었는지 보려고. */
const childrenOf = (source: string) =>
  [...root(source).children].map((node) =>
    new XMLSerializer().serializeToString(node),
  );

const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 200 100" width="200" height="100">` +
  `<line x1="10" y1="10" x2="190" y2="90" stroke="#111111" stroke-width="2"/>` +
  `<text x="150" y="40" font-size="18" data-mj="C">C</text>` +
  `</svg>`;

describe("그림 틀 «다 보이게» — 지금 내용에 맞추기", () => {
  it("틀 밖으로 나간 그림을 다 들인다 — 저장할 때와 같은 틀", async () => {
    // 왼쪽 30·위 10 밖으로 나갔고 오른쪽·아래로도 넘쳤다(원장님 화면: 점 C 와 선 끝이 잘림)
    box = { x: -30, y: -10, width: 240, height: 140 };
    const next = await fitFrameToContent(figure);
    expect(next).not.toBeNull();
    // 여백 = max(10, 큰 변 240*0.04) = 10 — 재는 쪽·여백 모두 fitFigureViewport 그대로
    expect(viewBoxOf(next!)).toEqual([-40, -20, 260, 160]);
    // 그림 전체가 틀 안에 든다
    const [x, y, w, h] = viewBoxOf(next!);
    expect(x).toBeLessThanOrEqual(box.x);
    expect(y).toBeLessThanOrEqual(box.y);
    expect(x + w).toBeGreaterThanOrEqual(box.x + box.width);
    expect(y + h).toBeGreaterThanOrEqual(box.y + box.height);
  });

  it("저장본과 **같은 틀** — viewBox·width·height 가 글자까지 같다", async () => {
    box = { x: -30, y: -10, width: 240, height: 140 };
    const [next, saved] = await Promise.all([
      fitFrameToContent(figure),
      renderFittedFigure(figure),
    ]);
    for (const name of ["viewBox", "width", "height"])
      expect(attr(next!, name)).toBe(attr(saved, name));
  });

  it("넓히기만이 아니라 **줄이기도** 한다 — 쓸데없이 넓던 여백을 정리한다", async () => {
    box = { x: 50, y: 20, width: 40, height: 30 };
    const next = await fitFrameToContent(figure);
    expect(viewBoxOf(next!)).toEqual([40, 10, 60, 50]);
    expect(attr(next!, "width")).toBe("60");
    expect(attr(next!, "height")).toBe("50");
  });

  it("이미 맞으면 null — 부르는 쪽이 되돌리기 자리를 안 만든다", async () => {
    box = { x: -30, y: -10, width: 240, height: 140 };
    const once = await fitFrameToContent(figure);
    expect(once).not.toBeNull();
    expect(await fitFrameToContent(once!)).toBeNull();
  });

  it("틀만 바꾼다 — 글자 크기·선 굵기·요소는 하나도 안 건드린다", async () => {
    box = { x: -30, y: -10, width: 240, height: 140 };
    const next = await fitFrameToContent(figure);
    expect(childrenOf(next!)).toEqual(childrenOf(figure));
  });

  it("크기 고정 요소가 있어도 맞춘다 — 틀만 바꾸니 막을 이유가 없다", async () => {
    const locked = figure.replace("<line ", `<line data-size-locked="true" `);
    box = { x: -30, y: -10, width: 240, height: 140 };
    const next = await fitFrameToContent(locked);
    expect(viewBoxOf(next!)).toEqual([-40, -20, 260, 160]);
    expect(childrenOf(next!)).toEqual(childrenOf(locked));
  });

  it("width·height 가 없던 원문에는 새로 적지 않는다 — 두 번째 누름이 멈춘다", async () => {
    const bare = `<svg xmlns="${SVG_NS}" viewBox="0 0 200 100"><line x1="10" y1="10" x2="190" y2="90" stroke="#111111"/></svg>`;
    box = { x: -30, y: -10, width: 240, height: 140 };
    const next = await fitFrameToContent(bare);
    expect(viewBoxOf(next!)).toEqual([-40, -20, 260, 160]);
    expect(attr(next!, "width")).toBeNull();
    expect(attr(next!, "height")).toBeNull();
    expect(await fitFrameToContent(next!)).toBeNull();
  });

  it("틀을 재지 못하면 아무 일도 안 한다", async () => {
    box = { x: 0, y: 0, width: 0, height: 0 };
    expect(await fitFrameToContent(figure)).toBeNull();
  });
});
