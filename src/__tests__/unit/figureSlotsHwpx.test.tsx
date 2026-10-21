/**
 * 그림 자리 묶음이 HWPX 에서도 «그림들 / 캡션들»로 서는가 (D-164 ③④ · 2026-10-21 Codex 검토).
 *
 * 묶음에 격자 표시(`data-hwpx-grid`)가 없으면 수집기가 칸을 모르고, writer 의 일반 줄 묶기(`baseline_rows`)는 그림끼리
 * 한 줄로 안 묶어 «그림1 / 그림2 / 캡션1 + 캡션2» 세 문단이 됐다. 캡션 응답칸 «(\u3000\u3000\u3000\u3000)» 의 전각 공백은 수집기가
 * `\s+` 로 접어 «( )» 가 됐다. 둘을 고친 뒤를 잰다 — 높이가 다른 그림 · 두 행으로 접히는 묶음까지.
 * ⚠️ writer 시험은 Python 을 띄운다. 외장 SSD(exFAT) 작업트리에서는 `._*` 파일을 서식 틀로 읽어 실패한다(다른 HWPX 시험도 같다).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import { collectHwpxLayout, gridCellMarks } from "@/lib/export/hwpxLayout";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("수집기 — 그림 자리 칸 표시 · 전각 공백", () => {
  it("묶음의 칸마다 격자 칸이 붙는다 — 같은 줄은 한 행, 접히면 새 행(그림과 캡션은 그 칸의 것)", () => {
    const html = renderToStaticMarkup(
      <ProblemContent
        content={
          "다음 도형의 둘레를 각각 구하시오.\n[그림:1] ⑴ (\u3000\u3000\u3000)\n[그림:2] ⑵ (\u3000\u3000\u3000)\n[그림:3] ⑶ (\u3000\u3000\u3000)"
        }
        figureUrls={["/a.png", "/b.png", "/c.png"]}
        deferFigures={false}
      />,
    );
    const root = document.createElement("section");
    root.innerHTML = html;
    document.body.append(root);
    // 칸 1 · 2 는 한 줄(위쪽 끝이 같다), 칸 3 은 다음 줄(위쪽 끝이 내려간다) — 지면의 flex-wrap · items-start 그대로
    const boxes: Record<string, [number, number]> = {
      "1": [20, 0],
      "2": [190, 0],
      "3": [105, 140],
    };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const slot = this.getAttribute("data-figure-slot");
        return slot
          ? new DOMRect(boxes[slot]![0], boxes[slot]![1], 150, 120)
          : new DOMRect(0, 0, 360, 400);
      },
    );
    const cellOf = gridCellMarks(root);
    const cells = [...root.querySelectorAll("[data-figure-slot]")].map(
      (slot) => ({
        image: cellOf(slot.querySelector("img")!),
        caption: cellOf(slot.querySelector("[data-figure-caption]")!),
      }),
    );
    expect(cells).toEqual([
      {
        image: { gridId: 1, gridRow: 0, gridCol: 0 },
        caption: { gridId: 1, gridRow: 0, gridCol: 0 },
      },
      {
        image: { gridId: 1, gridRow: 0, gridCol: 1 },
        caption: { gridId: 1, gridRow: 0, gridCol: 1 },
      },
      {
        image: { gridId: 1, gridRow: 1, gridCol: 0 },
        caption: { gridId: 1, gridRow: 1, gridCol: 0 },
      },
    ]);
  });

  it("가운데 맞춤 · 폭이 다른 칸 — 다음 줄 첫 칸이 더 오른쪽이어도 새 행이다(2026-10-21 Codex 검토 B1: 70mm · 40mm)", () => {
    const html = renderToStaticMarkup(
      <ProblemContent
        content={
          "다음 그림을 보고 답하시오.\n[그림:1] ⑴ (\u3000\u3000)\n[그림:2] ⑵ (\u3000\u3000)"
        }
        figureUrls={["/a.png", "/b.png"]}
        figureSourceMm={[70, 40]}
        figureDims={[700, 350, 400, 300]}
        deferFigures={false}
      />,
    );
    const root = document.createElement("section");
    root.innerHTML = html;
    document.body.append(root);
    // 지면 실측의 꼴 — 넓은 칸(264px)이 첫 줄 가운데(왼쪽 49px), 좁은 칸(151px)이 둘째 줄 가운데(왼쪽 106px)
    const boxes: Record<string, [number, number]> = {
      "1": [49.2, 0],
      "2": [105.9, 150],
    };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const slot = this.getAttribute("data-figure-slot");
        return slot
          ? new DOMRect(boxes[slot]![0], boxes[slot]![1], 150, 130)
          : new DOMRect(0, 0, 363, 400);
      },
    );
    const cellOf = gridCellMarks(root);
    const rows = [...root.querySelectorAll("[data-figure-slot]")].map(
      (slot) => cellOf(slot.querySelector("img")!)?.gridRow,
    );
    expect(rows).toEqual([0, 1]);
  });

  it("캡션 응답칸의 전각 공백을 접지 않는다 — «⑴ (\u3000\u3000\u3000\u3000)» 그대로 · 캡션 밖은 예전처럼 접는다(Codex 7차)", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return this.matches("[data-unified-paper]")
          ? new DOMRect(0, 0, 794, 1123)
          : new DOMRect(0, 0, 700, 20);
      },
    );
    const original = Object.getOwnPropertyDescriptor(
      Range.prototype,
      "getBoundingClientRect",
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
    try {
      const source = document.createElement("div");
      source.innerHTML =
        "<section data-unified-paper><div data-figure-caption><p>⑴ (\u3000\u3000\u3000\u3000)</p></div><p>갑   을</p><p>⑵ (\u3000\u3000)</p></section>";
      document.body.append(source);
      const page = (await collectHwpxLayout(source)).pages[0]!;
      // 자리 없는 문항의 응답칸 «(　　)» 은 예전처럼 «( )» — 자리 없는 문항의 HWPX 는 바이트 그대로다
      expect(
        page.objects.filter((o) => o.type === "text").map((o) => o.text),
      ).toEqual(["⑴ (\u3000\u3000\u3000\u3000)", "갑 을", "⑵ ( )"]);
    } finally {
      if (original)
        Object.defineProperty(
          Range.prototype,
          "getBoundingClientRect",
          original,
        );
      else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
    }
  });
});

describe("writer — 칸의 첫 줄끼리(그림들) · 둘째 줄끼리(캡션들) 한 문단", () => {
  const BODY = { x: 0, y: 0, w: 363, h: 600, columns: 1 as const, gap: 0 };
  const cell = (row: number, col: number) => ({
    gridId: 1,
    gridRow: row,
    gridCol: col,
  });
  const image = (
    x: number,
    y: number,
    w: number,
    h: number,
    id: string,
    c: ReturnType<typeof cell>,
  ) => ({ type: "image" as const, x, y, w, h, imageId: id, ...c });
  const caption = (
    x: number,
    y: number,
    value: string,
    c: ReturnType<typeof cell>,
  ) => ({
    type: "text" as const,
    x,
    y,
    w: 70,
    h: 16,
    text: value,
    fontSize: 12.5,
    baseline: y + 13,
    ...c,
  });

  async function lines(objects: unknown[]) {
    const parts = await buildHwpxParts(
      HwpxPayloadSchema.parse({
        title: "그림 자리",
        pages: [{ body: BODY, objects }],
      }),
    );
    const section = new DOMParser().parseFromString(
      parts["Contents/section0.xml"],
      "application/xml",
    );
    return [...section.documentElement.children]
      .filter((node) => node.tagName === "hp:p")
      .slice(1)
      .map((p) =>
        [...p.getElementsByTagName("*")]
          .map((node) =>
            node.tagName === "hp:t" && node.parentElement?.tagName === "hp:run"
              ? (node.textContent ?? "").trim()
              : node.tagName === "hc:img"
                ? `[${node.getAttribute("binaryItemIDRef")}]`
                : "",
          )
          .filter(Boolean)
          .join(" "),
      );
  }

  it("높이가 다른 그림 둘 + 캡션 둘 — 그림 한 문단, 캡션 한 문단(제 칸 차례대로)", async () => {
    expect(
      await lines([
        image(20, 12, 150, 90, "image1", cell(0, 0)),
        image(190, 12, 150, 70, "image2", cell(0, 1)),
        caption(60, 106, "⑴ (\u3000\u3000\u3000\u3000)", cell(0, 0)),
        caption(230, 86, "⑵ (\u3000\u3000\u3000\u3000)", cell(0, 1)),
      ]),
    ).toEqual([
      "[image1] [image2]",
      "⑴ (\u3000\u3000\u3000\u3000) ⑵ (\u3000\u3000\u3000\u3000)",
    ]);
  });

  it("폭이 다른 두 줄 묶음(70mm · 40mm) — 행이 갈리면 그림 · 캡션이 행마다 따로(한 행으로 합치지 않는다)", async () => {
    expect(
      await lines([
        image(49, 12, 264, 132, "image1", cell(0, 0)),
        caption(160, 148, "⑴ (\u3000\u3000)", cell(0, 0)),
        image(106, 186, 151, 113, "image2", cell(1, 0)),
        caption(160, 303, "⑵ (\u3000\u3000)", cell(1, 0)),
      ]),
    ).toEqual(["[image1]", "⑴ (\u3000\u3000)", "[image2]", "⑵ (\u3000\u3000)"]);
  });

  it("두 행으로 접힌 묶음 — 행마다 그림 · 캡션 문단", async () => {
    expect(
      await lines([
        image(20, 12, 150, 90, "image1", cell(0, 0)),
        image(190, 12, 150, 90, "image2", cell(0, 1)),
        caption(60, 106, "⑴ (\u3000\u3000\u3000)", cell(0, 0)),
        caption(230, 106, "⑵ (\u3000\u3000\u3000)", cell(0, 1)),
        image(20, 142, 150, 80, "image3", cell(1, 0)),
        caption(60, 226, "⑶ (\u3000\u3000\u3000)", cell(1, 0)),
      ]),
    ).toEqual([
      "[image1] [image2]",
      "⑴ (\u3000\u3000\u3000) ⑵ (\u3000\u3000\u3000)",
      "[image3]",
      "⑶ (\u3000\u3000\u3000)",
    ]);
  });
});
