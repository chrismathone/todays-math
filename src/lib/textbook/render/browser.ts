"use client";
import {
  A4,
  alignTextbookSpreads,
  paginateTextbookSections,
  type TextbookLayout,
} from "../layout/paginate";
import {
  measurementHtml,
  recallMeasurementHtml,
  TEXTBOOK_CSS,
  renderPageHtml,
  type RenderResources,
} from "./html";
import {
  recoveryMeasurePlan,
  measureRecoveryDom,
  applyRecoveryMeasurements,
  assertRecoveryMeasurementBudget,
  measureIntroGeometry,
  dialogueMeasurementModel as buildDialogueMeasurementModel,
} from "./recoveryMeasurement";
import type { TextbookRenderModel } from "./model";
import { getTextbookCharacter } from "../characters";
import {
  applySourceWriting,
  measureSourceWritingDom,
  resetSourceWriting,
  sourceWritingBlockIds,
} from "./sourceWriting";

export const TEXTBOOK_PREVIEW_FONT_CSS = [400, 700]
  .map(
    (weight) =>
      `@font-face{font-family:TextbookPretendard;src:url('/textbook/editorial/fonts/NotoSansKR-${weight}.ttf') format('truetype');font-weight:${weight};font-display:block}`,
  )
  .join("\n");

/** Same markup, physical widths and measured paginator as the server. Call with authorized asset/QR data. */
export async function measureTextbookPreview(
  model: TextbookRenderModel,
  resources: RenderResources,
  options: {
    fontCss?: string;
    katexCss?: string;
    signal?: AbortSignal;
    recallMeasurementModel?: TextbookRenderModel;
    dialogueMeasurementModel?: TextbookRenderModel;
  } = {},
): Promise<TextbookLayout> {
  resetSourceWriting(model);
  const sizingModel = buildDialogueMeasurementModel(
    options.dialogueMeasurementModel ?? model,
    model,
  );
  assertRecoveryMeasurementBudget(sizingModel, options.recallMeasurementModel);
  if (model.sections.reduce((n, s) => n + s.blocks.length, 0) > 600)
    throw new Error(
      "한 번에 미리 볼 구획을 줄여 주세요. 최대 600개 블록입니다.",
    );
  const host = document.createElement("div"),
    style = document.createElement("style");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;contain:layout style;";
  host.dataset.recoveryMeasureHost = crypto.randomUUID();
  style.textContent =
    (options.fontCss ?? TEXTBOOK_PREVIEW_FONT_CSS) +
    (options.katexCss ?? "") +
    TEXTBOOK_CSS;
  host.append(style);
  const content = document.createElement("div");
  content.innerHTML =
    measurementHtml(sizingModel, resources) +
    (options.recallMeasurementModel
      ? recallMeasurementHtml(options.recallMeasurementModel, resources)
      : "");
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
    applyRecoveryMeasurements(
      model,
      measureRecoveryDom({
        ...recoveryMeasurePlan(
          sizingModel,
          model.config.print.firstPhysicalPageIndex,
        ),
        rootSelector: `[data-recovery-measure-host="${host.dataset.recoveryMeasureHost}"]`,
      }),
    );
    // Remove private canonical text before measuring or returning the student layout.
    content.innerHTML = measurementHtml(model, resources);
    await Promise.all(
      Array.from(host.querySelectorAll("img")).map((image) => image.decode()),
    );
    const introFits = measureIntroGeometry(host);
    const measurements = Array.from(
      host.querySelectorAll<HTMLElement>("[data-measure-id]"),
    ).map((e) => {
      const rect = e.getBoundingClientRect();
      for (const child of e.querySelectorAll(".katex-html,img,table,pre")) {
        const frame = child.matches("img[data-textbook-portrait-atlas]")
          ? child.parentElement
          : null;
        const speaker = frame?.closest<HTMLElement>(
          ".tb-dialogue-atlas[data-speaker-id]",
        )?.dataset.speakerId;
        const visible =
          frame?.matches(".tb-portrait-frame") &&
          speaker?.startsWith("tb-portrait-") &&
          getTextbookCharacter(speaker.slice("tb-portrait-".length)) &&
          getComputedStyle(frame).overflow === "hidden"
            ? frame
            : child;
        const r = visible.getBoundingClientRect();
        const bleedPx =
          child instanceof HTMLElement &&
          child.dataset.textbookDecorativeBleedMm === "4"
            ? (4 * 96) / 25.4
            : 0;
        if (
          r.left < rect.left - 1.89 - bleedPx ||
          r.right > rect.right + 1.89 + bleedPx
        )
          throw new Error(
            `수식·그림이 블록 너비를 넘습니다: ${e.dataset.measureId}`,
          );
      }
      return {
        blockId: e.dataset.measureId!,
        heightMm: Math.ceil(((rect.height * 25.4) / 96) * 100) / 100,
        widthMm: (rect.width * 25.4) / 96,
        ...(introFits[e.dataset.measureId!] === undefined
          ? {}
          : { introTextFits: introFits[e.dataset.measureId!] }),
      };
    });
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { includeCover: model.config.print.coverMode === "included" },
    );
    if (model.variant === "student")
      alignTextbookSpreads(layout.pages, model.sections);
    const sourceWritingIds = sourceWritingBlockIds(model);
    if (sourceWritingIds.length) {
      content.innerHTML = layout.pages
        .map((page) => renderPageHtml(page, model, resources, layout.pages))
        .join("");
      await Promise.all(
        Array.from(host.querySelectorAll("img")).map((image) => image.decode()),
      );
      if (options.signal?.aborted)
        throw new DOMException("Aborted", "AbortError");
      applySourceWriting(
        model,
        layout,
        measureSourceWritingDom({
          blockIds: sourceWritingIds,
          rootSelector: `[data-recovery-measure-host="${host.dataset.recoveryMeasureHost}"]`,
        }),
      );
    }
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
