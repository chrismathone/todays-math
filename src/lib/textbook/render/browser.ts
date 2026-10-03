"use client";
import {
  A4,
  alignTextbookSpreads,
  paginateTextbookSections,
  type TextbookLayout,
} from "../layout/paginate";
import { measurementHtml, TEXTBOOK_CSS, type RenderResources } from "./html";
import type { TextbookRenderModel } from "./model";

export const TEXTBOOK_PREVIEW_FONT_CSS =
  "@font-face{font-family:TextbookPretendard;src:url('/fonts/PretendardVariable.woff2') format('woff2');font-weight:45 920;font-display:block}";

/** Same markup, physical widths and measured paginator as the server. Call with authorized asset/QR data. */
export async function measureTextbookPreview(
  model: TextbookRenderModel,
  resources: RenderResources,
  options: { fontCss?: string; katexCss?: string; signal?: AbortSignal } = {},
): Promise<TextbookLayout> {
  if (model.sections.reduce((n, s) => n + s.blocks.length, 0) > 600)
    throw new Error(
      "한 번에 미리 볼 구획을 줄여 주세요. 최대 600개 블록입니다.",
    );
  const host = document.createElement("div"),
    style = document.createElement("style");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;contain:layout style;";
  style.textContent =
    (options.fontCss ?? TEXTBOOK_PREVIEW_FONT_CSS) +
    (options.katexCss ?? "") +
    TEXTBOOK_CSS;
  host.append(style);
  const content = document.createElement("div");
  content.innerHTML = measurementHtml(model, resources);
  host.append(content);
  document.body.append(host);
  try {
    await Promise.all([
      document.fonts.load("400 13px TextbookPretendard", "가나다 수학"),
      document.fonts.load("700 13px TextbookPretendard", "가나다 수학"),
    ]);
    await document.fonts.ready;
    await Promise.all(
      Array.from(host.querySelectorAll("img")).map((i) => i.decode()),
    );
    if (options.signal?.aborted) throw new Error("Preview aborted");
    const measurements = Array.from(
      host.querySelectorAll<HTMLElement>("[data-measure-id]"),
    ).map((e) => {
      const rect = e.getBoundingClientRect();
      for (const child of e.querySelectorAll(".katex-html,img,table,pre")) {
        const r = child.getBoundingClientRect();
        if (r.left < rect.left - 1.89 || r.right > rect.right + 1.89)
          throw new Error(
            `수식·그림이 블록 너비를 넘습니다: ${e.dataset.measureId}`,
          );
      }
      return {
        blockId: e.dataset.measureId!,
        heightMm: Math.ceil(((rect.height * 25.4) / 96) * 100) / 100,
        widthMm: (rect.width * 25.4) / 96,
      };
    });
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { includeCover: model.config.print.coverMode === "included" },
    );
    if (model.variant === "student") alignTextbookSpreads(layout.pages);
    if (
      layout.pages.some((p) =>
        p.blocks.some(
          (b) => b.yMm + b.heightMm > A4.bodyBottomMm + A4.toleranceMm,
        ),
      )
    )
      throw new Error("미리보기 본문 영역을 넘었습니다.");
    return layout;
  } finally {
    host.remove();
  }
}
