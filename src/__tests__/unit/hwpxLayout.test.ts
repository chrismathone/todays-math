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
