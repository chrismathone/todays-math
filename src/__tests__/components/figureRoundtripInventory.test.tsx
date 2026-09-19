import { readFileSync } from "node:fs";
import path from "node:path";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import {
  cleanFigureForSave,
  prepareFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { svgFromImage } from "@/components/unified/figure-editor/figureDocument";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { svgDataUrl } from "@/lib/svgDataUrl";

/**
 * 원장님 2026-09-19 «편집 모드에서는 안 보이는데 검수 모드에서는 보이는 이유가 뭘까?» — 평행사변형 ABCD 의
 * □AFCE 문항에서 검수 카드에는 A–E·F–C·**F–E** 가 보이는데 도형 편집기에는 F–E 만 없었다.
 *
 * 그림 데이터에는 F–E 가 **없었다.** 검수 카드의 표시기(`SourceEditorRenderer` 의 옛 «폐곡선 자동 닫기»)가
 * 끝이 하나씩 남은 두 점(E·F)을 «닫히지 않은 사각형»으로 보고 선을 지어 그었다. 편집기와 저장 결과는
 * 데이터 그대로다. 그래서 같은 그림이 화면마다 선 수가 달랐다.
 *
 * 한 표 — 같은 SVG 를 네 자리에서 센다: 데이터 · 검수 카드 · 편집기 캔버스 · 편집기 저장(svg·dataUrl).
 * 조판(MathJax)은 라벨을 글리프로 바꿀 뿐 선·곡선 수를 바꾸지 않는다 — 여기서는 원문 그대로 둔다.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

const FIXTURES = path.join(__dirname, "..", "fixtures", "figure-roundtrip");
/** 엔진이 그린 그대로(스펙은 같은 폴더의 *.spec.json) → 작업실 도형 생성과 같은 정리 */
const figure = (name: string) =>
  cleanFigureForSave(
    prepareFigureSvg(readFileSync(path.join(FIXTURES, name), "utf8")),
  );
const KINDS = [
  "line",
  "path",
  "polyline",
  "polygon",
  "circle",
  "ellipse",
  "rect",
  "text",
] as const;
function inventory(root: Element | null | undefined) {
  if (!root) return null;
  return Object.fromEntries(
    KINDS.map((kind) => [kind, root.querySelectorAll(kind).length]),
  );
}
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;

const identity = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  inverse() {
    return this;
  },
  multiply() {
    return this;
  },
};
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 380, height: 270 }),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("같은 도형이 검수 카드·편집기·저장 결과에서 같은 요소 수", () => {
  it.each([
    ["평행사변형 + AE·FC (F–E 없음 — 원장님 문항)", "parallelogram-no-fe.svg"],
    ["평행사변형 + AE·FC·FE", "parallelogram.svg"],
    ["□AFCE 음영", "parallelogram-region.svg"],
  ])("%s", async (_name, file) => {
    const svg = figure(file);
    const card = render(
      <SourceEditorDisplay
        value="평행사변형 ABCD 에서 □AFCE 의 넓이를 구하시오. [그림1]"
        figures={[{ svg, imageData: svgDataUrl(svg), label: "도형 1-1" }]}
      />,
    );
    const shown = card.container.querySelector('[data-figure-index="0"]');
    const reviewCard = inventory(
      shown?.localName === "svg" ? shown : shown?.querySelector("svg"),
    );
    card.unmount();

    const onSave = vi.fn<(result: StudioFigureSaveResult) => void>();
    render(
      <StudioFigureEditor
        image={svgDataUrl(svg)}
        initialSvg={svg}
        index={0}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    const canvas = document.querySelector("#figure-editor-canvas > svg");
    const editor = inventory(canvas);
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0];

    const data = inventory(parse(svg));
    expect({
      검수카드: reviewCard,
      편집기: editor,
      저장svg: inventory(parse(saved.svg)),
      저장그림: inventory(parse(svgFromImage(saved.dataUrl)!)),
    }).toEqual({
      검수카드: data,
      편집기: data,
      저장svg: data,
      저장그림: data,
    });
  });
});
