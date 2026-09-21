import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectHwpxLayout } from "@/lib/export/hwpxLayout";

describe("HWPX body layout", () => {
  beforeEach(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.matches("[data-unified-paper]"))
          return new DOMRect(0, 0, 794, 1123);
        if (this.matches("[data-template-root]"))
          return new DOMRect(0, 0, 793.7, 1122.5);
        if (this.matches("[data-question-column]"))
          return new DOMRect(50, 100, 408, 900);
        if (this.matches("[data-solving-area]"))
          return new DOMRect(478, 100, 272, 900);
        return new DOMRect(50, 100, 700, 900);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  async function collect(body: string) {
    const source = document.createElement("div");
    source.innerHTML = `<section data-unified-paper>${body}</section>`;
    document.body.append(source);
    return (await collectHwpxLayout(source)).pages[0];
  }

  it("keeps an unequal right solving area outside the single text column", async () => {
    const page = await collect(
      '<div class="measure-body" data-solving-layout style="display:grid;grid-template-columns:408px 272px;gap:20px"><div data-question-column></div><div data-solving-area style="background:rgb(37,76,64)"></div></div>',
    );
    expect(page.body).toEqual({
      x: 50,
      y: 100,
      w: 408,
      h: 900,
      columns: 1,
      gap: 0,
    });
    expect(page.objects).toContainEqual({
      type: "rect",
      x: 478,
      y: 100,
      w: 272,
      h: 900,
      color: "#254c40",
    });
  });

  /**
   * 우리 쪽 틀(`[data-unified-paper]`)은 템플릿 뿌리를 **감싼다** — mathg-gen 은 뿌리가 곧 쪽이라 뿌리 배경을
   * `el !== page` 로 뺀다. 뿌리의 종이색(793.7×1122.5, y=0)이 도형으로 실리면 writer 가 구역 위 여백을
   * `min(모든 도형 y)` = 0 → 8px 로 잡아, 넘친 쪽이 종이 맨 위 2mm 에서 시작한다
   * (docs/planning/tracks/reports/hwpx-writer-port.md §6 — 그 도형 하나만 빼면 45.3px).
   */
  it("쪽 전체를 덮는 종이 배경은 도형으로 싣지 않는다 — 쪽 안의 칸 배경은 그대로", async () => {
    const page = await collect(
      '<div data-template-root style="background:#FCFCF8"><div class="measure-body" style="display:flex"></div><div data-solving-area style="background:rgb(37,76,64)"></div></div>',
    );
    expect(
      page.objects.filter((object) => object.type === "rect" && object.y < 1),
    ).toEqual([]);
    expect(page.objects).toContainEqual({
      type: "rect",
      x: 478,
      y: 100,
      w: 272,
      h: 900,
      color: "#254c40",
    });
  });

  it.each([
    ["display:flex", 1, 0],
    ["display:grid;grid-template-columns:337px 337px;gap:26px", 2, 26],
  ])(
    "preserves ordinary one- and two-column page geometry (%s)",
    async (style, columns, gap) => {
      const page = await collect(
        `<div class="measure-body" style="${style}"></div>`,
      );
      expect(page.body).toEqual({
        x: 50,
        y: 100,
        w: 700,
        h: 900,
        columns,
        gap,
      });
    },
  );
});

describe("HWPX 격자 칸 표시 — writer 가 격자 한 행을 한 문단으로 묶게", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  /** 칸마다 data-top/left 로 자리를 준다 — jsdom 은 배치를 안 한다. */
  function mount(html: string) {
    const root = document.createElement("section");
    root.innerHTML = html;
    document.body.append(root);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const el = this as HTMLElement;
        const top = Number(el.dataset.top ?? 0);
        const left = Number(el.dataset.left ?? 0);
        return new DOMRect(left, top, 100, 20);
      },
    );
    return root;
  }

  it("같은 위쪽 끝의 칸은 한 행, 행 안 차례는 문서 차례 — 분수로 기준선이 달라도", async () => {
    const { gridCellMarks } = await import("@/lib/export/hwpxLayout");
    const root = mount(`
      <div data-hwpx-grid>
        <div data-top="100" data-left="0"><span id="ga">(가)</span></div>
        <div data-top="100" data-left="160"><span id="na">(나)</span></div>
        <div data-top="140" data-left="0"><span id="da">(다)</span></div>
        <div data-top="140.6" data-left="160"><span id="ra">(라)</span></div>
      </div>
      <p id="outside">격자 밖</p>`);
    const mark = gridCellMarks(root);
    const at = (id: string) => mark(root.querySelector(`#${id}`)!);
    expect(at("ga")).toEqual({ gridId: 1, gridRow: 0, gridCol: 0 });
    expect(at("na")).toEqual({ gridId: 1, gridRow: 0, gridCol: 1 });
    expect(at("da")).toEqual({ gridId: 1, gridRow: 1, gridCol: 0 });
    expect(at("ra")).toEqual({ gridId: 1, gridRow: 1, gridCol: 1 });
    expect(at("outside")).toBeUndefined();
  });

  it("표시 없는 격자(쪽 본문 2단 등)는 칸으로 보지 않는다", async () => {
    const { gridCellMarks } = await import("@/lib/export/hwpxLayout");
    const root = mount(`
      <div class="measure-body" style="display:grid">
        <div data-top="0"><span id="a">1.</span></div>
        <div data-top="0" data-left="400"><span id="b">2.</span></div>
      </div>`);
    expect(gridCellMarks(root)(root.querySelector("#a")!)).toBeUndefined();
  });

  it("격자마다 번호가 따로다 — 둘째 격자는 gridId 2", async () => {
    const { gridCellMarks } = await import("@/lib/export/hwpxLayout");
    const root = mount(`
      <div data-hwpx-grid><div data-top="0"><i id="a">ㄱ</i></div></div>
      <div data-hwpx-grid><div data-top="50"><i id="b">①</i></div></div>`);
    const mark = gridCellMarks(root);
    expect(mark(root.querySelector("#a")!)?.gridId).toBe(1);
    expect(mark(root.querySelector("#b")!)?.gridId).toBe(2);
  });
});

describe("HWPX 친 띄어쓰기 — 고정 공백 자리에서 글 조각을 끊는다", () => {
  const original = Object.getOwnPropertyDescriptor(
    Range.prototype,
    "getBoundingClientRect",
  );
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    if (original)
      Object.defineProperty(Range.prototype, "getBoundingClientRect", original);
    else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
  });

  /**
   * 편집기는 친 여러 칸을 «고정 공백(U+00A0) × (n−1) + 보통 공백»으로 싣는다(트랙 42). 수집기가 글 조각을
   * `\s+` → 한 칸으로 접으면(JS `\s` 는 U+00A0 포함) 지면의 네 칸이 한글에서 한 칸이 됐다.
   * 고정 공백에서 조각을 끊으면 writer 가 그 간격을 미리보기 x 의 탭 멈춤으로 옮긴다.
   */
  it("«갑    을»(친 네 칸)은 «갑»·«을» 두 조각 — 사이는 미리보기 간격 그대로", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.matches("[data-unified-paper]"))
          return new DOMRect(0, 0, 794, 1123);
        return new DOMRect(0, 0, 700, 20);
      },
    );
    // 글자마다 8px — 조각의 자리를 셀 수 있게 한다(jsdom 은 배치를 안 한다).
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: function (this: Range) {
        return new DOMRect(
          this.startOffset * 8,
          0,
          (this.endOffset - this.startOffset) * 8,
          16,
        );
      },
    });
    const source = document.createElement("div");
    source.innerHTML = `<section data-unified-paper><p>갑\u00A0\u00A0\u00A0 을</p></section>`;
    document.body.append(source);
    const page = (await collectHwpxLayout(source)).pages[0]!;
    const texts = page.objects.filter((object) => object.type === "text");
    expect(texts.map((object) => [object.text, object.x])).toEqual([
      ["갑", 0],
      ["을", 40],
    ]);
  });

  it("보통 공백 한 칸은 예전 그대로 한 조각", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.matches("[data-unified-paper]"))
          return new DOMRect(0, 0, 794, 1123);
        return new DOMRect(0, 0, 700, 20);
      },
    );
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: function (this: Range) {
        return new DOMRect(
          this.startOffset * 8,
          0,
          (this.endOffset - this.startOffset) * 8,
          16,
        );
      },
    });
    const source = document.createElement("div");
    source.innerHTML = `<section data-unified-paper><p>갑 을</p></section>`;
    document.body.append(source);
    const page = (await collectHwpxLayout(source)).pages[0]!;
    expect(
      page.objects
        .filter((object) => object.type === "text")
        .map((object) => object.text),
    ).toEqual(["갑 을"]);
  });
});
