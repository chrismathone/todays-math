/** The print DOM is the single layout source for PDF, print and HWPX. */
export interface HwpxObject {
  type: "text" | "equation" | "image" | "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  latex?: string;
  imageId?: string;
  color?: string;
  font?: string;
  fontSize?: number;
  letterSpacing?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  baseline?: number;
  lineHeight?: number;
  blockId?: number;
  /** 지면 격자(`[data-hwpx-grid]`)의 칸 — writer 가 격자 한 행을 한 문단으로 묶는다. */
  gridId?: number;
  gridRow?: number;
  gridCol?: number;
}

export interface HwpxGridCell {
  gridId: number;
  gridRow: number;
  gridCol: number;
}

/**
 * 격자 칸 표시 — 지면의 `[data-hwpx-grid]` 바로 아래 자식이 한 칸이다.
 *
 * 한 칸에 분수가 들면 그 칸의 기준선만 내려간다(트랙 46 은 칸이 위쪽 정렬이었고, 트랙 51 부터 글 칸은
 * 기준선 맞춤이라 이번엔 **옆 칸의 위쪽 끝**이 내려온다). writer 가 기준선으로만 줄을 세우면 한 행이
 * 칸마다 갈라지고 y 순으로 뒤섞인다(원장님 9번: (바)가 (마)보다 먼저). 그래서 칸 차례는 **문서 차례**로,
 * 행은 격자가 앞에서부터 가로로 채운다는 사실로 적는다 — 칸이 앞 칸보다 오른쪽이 아니면 새 행이다.
 * 위쪽 끝·기준선 어느 쪽도 안 본다(칸 세로 맞춤이 바뀌어도 행이 안 갈린다).
 */
export function gridCellMarks(root: Element) {
  const grids = new Map<Element, number>();
  const cells = new Map<Element, HwpxGridCell>();
  const markGrid = (grid: Element) => {
    const gridId = grids.size + 1;
    grids.set(grid, gridId);
    const children = [...grid.children].filter(
      (child) => child.getBoundingClientRect().width > 0,
    );
    let gridRow = -1;
    let gridCol = 0;
    let previousLeft = Infinity;
    for (const child of children) {
      const left = child.getBoundingClientRect().left;
      if (left <= previousLeft + 1) {
        gridRow += 1;
        gridCol = 0;
      } else gridCol += 1;
      previousLeft = left;
      cells.set(child, { gridId, gridRow, gridCol });
    }
  };
  return (el: Element): HwpxGridCell | undefined => {
    const cell = el.closest("[data-hwpx-grid] > *");
    if (!cell || !root.contains(cell)) return undefined;
    if (!grids.has(cell.parentElement!)) markGrid(cell.parentElement!);
    return cells.get(cell);
  };
}
export interface HwpxPage {
  objects: HwpxObject[];
  body?: {
    x: number;
    y: number;
    w: number;
    h: number;
    columns: number;
    gap: number;
  };
}
const color = (value: string) => {
  const rgba = value.match(/[\d.]+/g)?.map(Number);
  return rgba && rgba.length >= 3 && (rgba[3] ?? 1) > 0
    ? "#" +
        rgba
          .slice(0, 3)
          .map((n) =>
            Math.round(n * (rgba[3] ?? 1) + 255 * (1 - (rgba[3] ?? 1)))
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")
    : undefined;
};
const fontName = (value: string) =>
  value.split(",")[0].trim().replace(/["']/g, "");
async function png(
  element: HTMLImageElement | SVGSVGElement,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * 3);
  canvas.height = Math.ceil(height * 3);
  const context = canvas.getContext("2d")!;
  const img = new Image();
  img.crossOrigin = "anonymous";
  let url: string | undefined;
  if (element instanceof SVGSVGElement) {
    const clone = element.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.style.color = getComputedStyle(element).color;
    url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml",
      }),
    );
    img.src = url;
  } else img.src = element.currentSrc || element.src;
  try {
    await img.decode();
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("그림 변환에 실패했습니다.")),
        "image/png",
      ),
    );
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export async function collectHwpxLayout(
  source: HTMLElement,
  onProgress?: (current: number, total: number) => void,
) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.cssText +=
    ";display:block!important;position:fixed;left:-100000px;top:0;width:210mm;min-width:0;transform:none;pointer-events:none;--preview-scale:1;--preview-trailing-space:0px;";
  clone.setAttribute("aria-hidden", "true");
  document.body.append(clone);
  const assets: Record<string, Blob> = {},
    pages: HwpxPage[] = [];
  try {
    await document.fonts.ready;
    await Promise.all(
      [...clone.querySelectorAll("img")].map((img) =>
        img.decode().catch(() => {
          throw new Error(
            "불러오지 못한 그림이 있습니다. 그림을 확인한 뒤 다시 내보내 주세요.",
          );
        }),
      ),
    );
    const pageNodes = [
      ...clone.querySelectorAll<HTMLElement>("[data-unified-paper]"),
    ];
    if (!pageNodes.length)
      throw new Error("미리보기 페이지를 찾을 수 없습니다.");
    for (const page of pageNodes) {
      const pageRect = page.getBoundingClientRect(),
        decorations: HwpxObject[] = [],
        contents: HwpxObject[] = [];
      const blocks = new Map<Element, number>();
      const gridCell = gridCellMarks(page);
      const box = (rect: DOMRect) => ({
        x: rect.x - pageRect.x,
        y: rect.y - pageRect.y,
        w: rect.width,
        h: rect.height,
      });
      const styleFor = (el: Element) => {
        const s = getComputedStyle(el);
        let block = el.closest("p, li, h1, h2, h3, h4, h5, h6, td, th");
        if (!block) {
          block = el;
          while (
            block.parentElement &&
            (getComputedStyle(block).display === "inline" ||
              block.classList.contains("katex"))
          )
            block = block.parentElement;
        }
        if (!blocks.has(block)) blocks.set(block, blocks.size + 1);
        return {
          ...gridCell(el),
          blockId: blocks.get(block),
          lineHeight: parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5,
          font: fontName(s.fontFamily),
          fontSize: parseFloat(s.fontSize),
          letterSpacing: parseFloat(s.letterSpacing) || 0,
          color: color(s.color) ?? "#111111",
          bold: parseInt(s.fontWeight) >= 600,
          italic: s.fontStyle === "italic",
          underline:
            s.textDecorationLine.includes("underline") || !!el.closest("u"),
        };
      };
      const visible = (el: Element) => {
        const s = getComputedStyle(el);
        return (
          s.display !== "none" &&
          s.visibility !== "hidden" &&
          s.opacity !== "0" &&
          el.getBoundingClientRect().width > 0
        );
      };
      // 쪽 전체를 덮는 배경은 종이 자체다. 우리 쪽 틀은 템플릿 뿌리를 감싸서(mathg-gen 은 뿌리가 곧 쪽)
      // 뿌리의 종이색이 y=0 도형으로 실리면 writer 가 구역 위 여백을 8px 로 잡는다(hwpx-writer-port §6).
      const coversPage = (rect: DOMRect) =>
        rect.left <= pageRect.left + 1 &&
        rect.top <= pageRect.top + 1 &&
        rect.right >= pageRect.right - 1 &&
        rect.bottom >= pageRect.bottom - 1;
      for (const el of [page, ...page.querySelectorAll<HTMLElement>("*")]) {
        if (!visible(el) || el.closest(".katex, svg")) continue;
        const rect = el.getBoundingClientRect(),
          s = getComputedStyle(el),
          background = color(s.backgroundColor);
        if (background && el !== page && !coversPage(rect))
          decorations.push({ type: "rect", ...box(rect), color: background });
        if (s.backgroundImage.includes("linear-gradient")) {
          const gridInk = color(
            s.backgroundImage.match(/rgba?\([^)]+\)/)?.[0] ??
              "rgba(14,14,16,.08)",
          )!;
          const sizes = s.backgroundSize.match(/[\d.]+/g)?.map(Number) ?? [
              24, 24,
            ],
            bounds = box(rect);
          const stepX = sizes[0] || 24,
            stepY = sizes[1] || 24;
          for (
            let y = s.backgroundImage.includes("90deg") ? 0 : stepY - 1;
            y < bounds.h;
            y += stepY
          )
            decorations.push({
              type: "rect",
              x: bounds.x,
              y: bounds.y + y,
              w: bounds.w,
              h: 0.7,
              color: gridInk,
            });
          if (s.backgroundImage.includes("90deg"))
            for (let x = 0; x < bounds.w; x += stepX)
              decorations.push({
                type: "rect",
                x: bounds.x + x,
                y: bounds.y,
                w: 0.7,
                h: bounds.h,
                color: gridInk,
              });
        }
        for (const side of ["Top", "Bottom", "Left", "Right"] as const) {
          const thickness = parseFloat(s[`border${side}Width`]),
            ink = color(s[`border${side}Color`]);
          if (!thickness || !ink || s[`border${side}Style`] === "none")
            continue;
          const bounds = box(rect);
          if (side === "Top" || side === "Bottom") {
            if (side === "Bottom") bounds.y += bounds.h - thickness;
            bounds.h = thickness;
          } else {
            if (side === "Right") bounds.x += bounds.w - thickness;
            bounds.w = thickness;
          }
          const borderStyle = s[`border${side}Style`];
          if (borderStyle === "dashed" || borderStyle === "dotted") {
            const horizontal = side === "Top" || side === "Bottom",
              length = horizontal ? bounds.w : bounds.h;
            const dash = thickness * (borderStyle === "dotted" ? 1 : 3);
            for (let pos = 0; pos < length; pos += dash * 2)
              decorations.push({
                type: "rect",
                ...bounds,
                ...(horizontal
                  ? { x: bounds.x + pos, w: Math.min(dash, length - pos) }
                  : { y: bounds.y + pos, h: Math.min(dash, length - pos) }),
                color: ink,
              });
          } else decorations.push({ type: "rect", ...bounds, color: ink });
        }
      }
      for (const el of page.querySelectorAll<HTMLElement | SVGSVGElement>(
        ".katex, img, svg",
      )) {
        if (!visible(el)) continue;
        if (el.parentElement?.closest(".katex, svg")) continue;
        let rect = el.getBoundingClientRect();
        if (el.classList.contains("katex")) {
          // 좁은 칸에서 KaTeX 가 줄바꿈되면 외곽 상자의 x 는 **둘째 줄의 왼쪽 끝**이라 writer 가 수식을
          // 앞말보다 앞에 세웠다(3열 〈보기〉: «$y=3x^2$ (가)»). 기준선은 아래에서 첫 줄(첫 strut)로
          // 재므로, 자리도 첫 줄 조각으로 맞춘다. 한글 수식은 줄을 안 바꾼다 — 한 줄로 그 자리에 선다.
          const fragments = [
            ...(el.querySelector(".katex-html")?.getClientRects() ?? []),
          ].filter((fragment) => fragment.width > 0 && fragment.height > 0);
          if (
            fragments.length > 1 &&
            Math.abs(fragments[fragments.length - 1]!.top - fragments[0]!.top) >
              2
          )
            rect = fragments[0]!;
          const encoded = el.getAttribute("data-export-tex");
          const latex = encoded
            ? decodeURIComponent(encoded)
            : el.querySelector('annotation[encoding="application/x-tex"]')
                ?.textContent;
          if (!latex) throw new Error("원본 식을 찾지 못한 수식이 있습니다.");
          const strut = el.querySelector<HTMLElement>(
            ".katex-html > .katex-base > .katex-strut",
          );
          const baseline = strut
            ? strut.getBoundingClientRect().bottom +
              (parseFloat(getComputedStyle(strut).verticalAlign) || 0) -
              pageRect.y
            : rect.bottom - pageRect.y;
          contents.push({
            type: "equation",
            ...box(rect),
            ...styleFor(el),
            baseline,
            latex,
          });
        } else {
          const imageId = `image${Object.keys(assets).length + 1}`;
          assets[`BinData/${imageId}.png`] = await png(
            el as HTMLImageElement | SVGSVGElement,
            rect.width,
            rect.height,
          );
          contents.push({
            type: "image",
            ...box(rect),
            ...gridCell(el),
            imageId,
          });
        }
      }
      const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement!,
          text = node.textContent ?? "";
        if (
          !text.trim() ||
          parent.closest(".katex, svg, style, script") ||
          !visible(parent)
        )
          continue;
        const range = document.createRange(),
          style = styleFor(parent);
        let start = -1,
          end = 0,
          lineTop = 0;
        const flush = () => {
          if (start < 0) return;
          range.setStart(node!, start);
          range.setEnd(node!, end);
          const rect = range.getBoundingClientRect(),
            value = text.slice(start, end).replace(/\s+/g, " ");
          if (value.trim() && rect.width > 0)
            contents.push({
              type: "text",
              ...box(rect),
              ...style,
              baseline: rect.bottom - pageRect.y - style.fontSize * 0.2,
              text: value,
            });
          start = -1;
        };
        let offset = 0;
        let afterTyped = false;
        for (const char of text) {
          // 친 여러 칸(편집기가 싣는 고정 공백 U+00A0 × (n−1) + 보통 공백 1)에서 글 조각을 끊는다.
          // 아래 `\s+` 접기는 U+00A0 도 접어 지면의 네 칸이 한글에서 한 칸이 됐다(트랙 42 §7).
          // 끊으면 writer 가 두 조각 사이를 미리보기 x 의 탭 멈춤(좁으면 공백)으로 옮긴다 — 공백 글자로
          // 채우면 한글 글꼴 폭만큼 밀린다(`write_row` 주석).
          if (char === "\u00A0") {
            flush();
            afterTyped = true;
            offset += char.length;
            continue;
          }
          if (afterTyped && /\s/.test(char)) {
            offset += char.length;
            continue;
          }
          afterTyped = false;
          range.setStart(node, offset);
          range.setEnd(node, offset + char.length);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0) {
            if (start >= 0 && Math.abs(rect.y - lineTop) > 2) flush();
            if (start < 0) {
              start = offset;
              lineTop = rect.y;
            }
            end = offset + char.length;
          }
          offset += char.length;
        }
        flush();
      }
      // A right solving area is page artwork beside one text column, not a
      // second equal-width problem column. Its SVG/borders are collected above.
      const bodyNode =
        page.querySelector<HTMLElement>(
          "[data-solving-layout] > [data-question-column]",
        ) ?? page.querySelector<HTMLElement>(".measure-body, [data-hwpx-body]");
      let body: HwpxPage["body"];
      if (bodyNode) {
        const s = getComputedStyle(bodyNode),
          bounds = box(bodyNode.getBoundingClientRect());
        const tracks = s.gridTemplateColumns
          .split(" ")
          .map(parseFloat)
          .filter(Number.isFinite);
        const columns =
          tracks.length >= 2 || Number(s.columnCount) === 2 ? 2 : 1;
        const gap =
          columns === 1
            ? 0
            : tracks.length >= 2
              ? bounds.w - tracks[0] * 2
              : parseFloat(s.columnGap);
        body = { ...bounds, columns, gap };
      }
      pages.push({ objects: [...decorations, ...contents], body });
      onProgress?.(pages.length, pageNodes.length);
    }
    return { pages, assets };
  } finally {
    clone.remove();
  }
}
