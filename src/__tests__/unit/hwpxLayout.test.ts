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
