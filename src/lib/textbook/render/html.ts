import type { RenderBlock, TextbookRenderModel } from "./model";
import type { TextbookPage } from "../layout/paginate";
import { blockWidthMm } from "../layout/paginate";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "./markdown";
import {
  editorialBlock,
  editorialStage,
  EDITORIAL_STAGES,
  type EditorialBlock,
  type EditorialStage,
} from "./editorial";
import { EDITORIAL_CSS } from "./editorialCss";
import { RECOVERY_FRAME_CSS } from "./recoveryFrameCss";
import { SOURCE_CHAPTER_CSS } from "./sourceChapterCss";
import { renderConceptHtml } from "./blocks/concept";
import {
  renderDialogueHtml,
  renderDialogueBoardHtml,
  isDialoguePlacement,
  renderDialogueContinueHtml,
  renderDialogueLessonTitleHtml,
  renderDialogueGuideHtml,
} from "./blocks/dialogue";
import { DIALOGUE_CSS } from "./blocks/dialogueCss";
import { TEXTBOOK_CONTENT_CSS } from "./blocks/contentCss";
import {
  renderSemanticTextHtml,
  SEMANTIC_ACTIVITY_CSS,
} from "./blocks/semantic";
import {
  renderCoverHtml,
  renderHeadingHtml,
  renderUnitIntroHtml,
} from "./blocks/front";
import { renderProblemHtml } from "./blocks/problem";
import { renderRecallHtml } from "./blocks/recall";
import { imageHtml, type RenderResources } from "./blocks/shared";

export type { RenderResources } from "./blocks/shared";
export function renderBlockHtml(
  block: RenderBlock,
  resources: RenderResources,
): string {
  const projected = block as EditorialBlock;
  const stage = editorialStage(projected);
  return `<div class="tb-editorial${block.semantic || block.dialogueGuide || block.dialogueLesson ? " tb-recovery" : ""} tb-editorial-${block.kind} tb-stage-${stage}" data-editorial-stage="${stage}">${renderBlockContent(projected, resources, stage)}</div>`;
}
function renderBlockContent(
  block: EditorialBlock,
  resources: RenderResources,
  stage: EditorialStage,
): string {
  switch (block.kind) {
    case "unit-intro":
      return renderUnitIntroHtml(block, resources);
    case "heading":
      return renderHeadingHtml(block, resources, stage);
    case "text":
      return block.dialogueGuide
        ? renderDialogueGuideHtml(block.dialogueGuide)
        : block.dialogueLesson
          ? renderDialogueLessonTitleHtml(block.dialogueLesson)
          : block.semantic?.node?.kind === "board"
            ? renderDialogueBoardHtml(block, resources)
            : (renderSemanticTextHtml(block, resources) ??
              `<div class="tb-prose">${md(block.markdown)}</div>`);
    case "image":
      return `<figure class="tb-figure">${imageHtml(resources, block.assetId, block.caption ?? "그림")}${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
    case "dialogue":
      return renderDialogueHtml(block, resources);
    case "concept":
      return renderConceptHtml(block, resources);
    case "recall":
      return renderRecallHtml(block);
    case "problem":
      return renderProblemHtml(block, resources);
  }
}

/** v15 editorial/full palette and dialogue typography, measured within the native A4 body geometry. */
export const TEXTBOOK_CSS = `
@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}
.tb-paper,.tb-measure{--tb-accent:#086c61;--tb-dark:#073f3b;--tb-soft:#edf5f0;--tb-light:#d6e4df;--tb-signal:#d6ed75;font-family:TextbookPretendard,sans-serif;font-size:9.6pt;line-height:1.9;color:#293936;font-synthesis:none;overflow-wrap:anywhere;word-break:keep-all;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tb-paper{position:relative;width:210mm;height:297mm;background:white;break-after:page;flex:none}.tb-paper:last-child{break-after:auto}
.tb-paper h1,.tb-paper h2,.tb-paper h3,.tb-measure h1,.tb-measure h2,.tb-measure h3{line-height:1.35;margin:0 0 3mm;font-weight:700}
.tb-paper h4,.tb-measure h4{margin:2mm 0 1mm;line-height:1.5}.tb-paper p,.tb-measure p{margin:0 0 2mm}.tb-paper p:last-child,.tb-measure p:last-child{margin-bottom:0}
.tb-paper ul,.tb-paper ol,.tb-measure ul,.tb-measure ol{margin:1mm 0;padding-left:6mm}.tb-paper li p,.tb-measure li p{margin:0}
.tb-paper img,.tb-measure img{max-width:100%;height:auto;display:block}.tb-paper pre,.tb-measure pre{white-space:pre-wrap;font-size:9pt}
.tb-header{position:absolute;top:15mm;height:18mm;border-bottom:.65pt solid var(--tb-light);display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:3mm;font-size:7.2pt;gap:5mm;color:var(--tb-accent)}.tb-header strong{font-size:6.8pt;font-weight:400;color:#82918e}
.tb-footer{position:absolute;bottom:7mm;display:flex;align-items:baseline;gap:3mm;padding-top:1.8mm;font-size:6.8pt;color:#82908b}.tb-footer:before{content:'';position:absolute;top:0;left:0;width:14mm;border-top:1.5pt solid var(--tb-accent)}.tb-footer:after{content:'';position:absolute;top:0;left:18mm;right:0;border-top:.45pt solid var(--tb-light)}.tb-footer strong{font-size:15pt;letter-spacing:-.6px;line-height:1.2;color:var(--tb-accent)}.tb-footer-brand{margin-left:auto;font-weight:700;letter-spacing:1px;color:var(--tb-accent)}.tb-footer-brand i{display:inline-block;width:2.1mm;height:2.1mm;margin-left:2mm;background:var(--tb-signal);transform:rotate(45deg)}.tb-page-odd .tb-footer{flex-direction:row-reverse}.tb-page-odd .tb-footer-brand{margin-left:0;margin-right:auto}.tb-page-odd .tb-footer:before{left:auto;right:0}.tb-page-odd .tb-footer:after{left:0;right:18mm}
.tb-block{position:absolute;display:flex;flex-direction:column}.tb-block-inner{width:100%;height:100%;display:flex;flex-direction:column}.tb-block-inner>*{flex-shrink:0}
.tb-section-heading{font-size:21pt;letter-spacing:-.7px;color:var(--tb-dark);padding:3.5mm 4mm;background:var(--tb-soft);border-left:1pt solid var(--tb-accent)}.tb-problem{height:100%;display:flex;flex-direction:column}.tb-problem-head{display:flex;gap:3mm;align-items:baseline;margin-bottom:2mm}.tb-problem-head strong{font-size:16pt;line-height:1.1;letter-spacing:-.8px;color:var(--tb-accent)}.tb-problem-head span{font-size:6.2pt;color:var(--tb-accent);background:var(--tb-soft);padding:.5mm 1.5mm;border-radius:4mm}
.tb-work-area{position:relative;display:flex;margin-top:3mm;flex:1}.tb-work-lines{flex:1}.tb-work-line{height:7mm;border-bottom:.2mm solid #aabcb9}
.tb-qr{width:24mm;margin:0 0 0 3mm;flex:none;align-self:flex-end;text-align:center}.tb-qr img{width:24mm;height:24mm;image-rendering:pixelated}.tb-qr figcaption{font-size:7pt;line-height:3mm}
.tb-problem-figure,.tb-figure{margin:2mm 0}.tb-figure img{max-height:180mm;object-fit:contain;margin:auto}.tb-problem-figure img{max-height:120mm;object-fit:contain;margin:auto}.tb-choice-label{font-size:8pt}.tb-figure figcaption{font-size:8pt;text-align:center;margin-top:2mm}
.tb-answer,.tb-worked{margin-top:3mm;padding:3mm;border-top:1.3pt solid var(--tb-accent);background:#fafbf8}.tb-concept{border:0;border-left:2.3pt solid var(--tb-accent);border-radius:0 4mm 0 0;padding:3.5mm 4.5mm;background:var(--tb-soft);color:var(--tb-dark)}.tb-concept .tb-qr{margin-top:3mm;margin-left:auto}.tb-goal{font-size:8.3pt;color:var(--tb-accent);margin-bottom:3mm}.tb-definition{padding:3mm;background:#edf5f2}.tb-concept-part{margin-top:2mm}
.tb-dialogue{display:flex;align-items:flex-start;gap:4mm}.tb-dialogue-right{flex-direction:row-reverse}.tb-portrait{width:22mm;flex:none}.tb-mirrored img{transform:scaleX(-1)}.tb-bubble{flex:1;min-width:0;padding:4mm;border:.3mm solid #a0b9b5;border-radius:4mm}.tb-bubble>strong{font-size:8pt;color:#436961}
.tb-dialogue-atlas{width:fit-content;max-width:93%;gap:1.7mm;align-self:flex-start}.tb-dialogue-atlas.tb-dialogue-right{max-width:89%;align-self:flex-end;margin-left:auto}.tb-dialogue-atlas .tb-portrait{width:9.5mm;display:flex;flex-direction:column;align-items:center;gap:.15mm}.tb-portrait-frame{position:relative;display:block;width:9.5mm;height:9.5mm;flex:none;overflow:hidden;isolation:isolate}.tb-paper .tb-portrait-frame img,.tb-measure .tb-portrait-frame img{position:absolute;width:200%;height:200%;max-width:none;left:0;top:0}.tb-paper .tb-expression-question img,.tb-measure .tb-expression-question img{left:-100%}.tb-paper .tb-expression-thinking img,.tb-measure .tb-expression-thinking img{top:-100%}.tb-paper .tb-expression-aha img,.tb-measure .tb-expression-aha img{left:-100%;top:-100%}.tb-frame-mirrored{transform:scaleX(-1)}.tb-portrait-name{font-size:5.5pt;line-height:1.1;white-space:nowrap;color:#657c70}.tb-dialogue-atlas .tb-bubble{position:relative;flex:initial;padding:1.5mm 2.7mm;border:.45pt solid #dfe8e1;background:white;border-radius:.9mm 3mm 3mm 3mm;font-size:10.5pt;line-height:1.77;box-shadow:0 .3mm .4mm #253c2c08;color:#263d32}.tb-dialogue-atlas .tb-bubble:before{content:'';position:absolute;left:-1.8mm;top:2.4mm;width:2mm;height:2.6mm;background:inherit;clip-path:polygon(100% 0,0 0,100% 100%)}.tb-dialogue-atlas.tb-speaker-student .tb-bubble{background:#fff0b8;border-color:#eadfaf;border-radius:3mm .9mm 3mm 3mm}.tb-dialogue-atlas.tb-dialogue-right .tb-bubble:before{left:auto;right:-1.8mm;clip-path:polygon(0 0,100% 0,0 100%)}
.tb-recall{padding:4mm;border:.3mm solid #b5c9c4}.tb-recall-text{display:inline}.tb-recall-text p{display:inline}.tb-blank{display:inline-block;vertical-align:middle;border-bottom:.3mm solid #455b59;height:8mm;min-width:22mm;margin:0 1mm}.tb-blank-sentence{display:block;width:100%;height:21mm}.tb-repetition{margin-top:4mm;text-align:right}
.tb-paper table,.tb-measure table{border-collapse:collapse;width:100%;table-layout:fixed}.tb-paper td,.tb-measure td{border:.2mm solid #9ab5b0;padding:2mm}.tb-paper blockquote,.tb-measure blockquote{margin:2mm 0;padding-left:4mm;border-left:.5mm solid #8dafaa}
.tb-paper .katex,.tb-measure .katex{font-size:1.12em}.tb-paper .katex-display,.tb-measure .katex-display{margin:2mm 0;text-align:left}.tb-paper .katex-display>.katex,.tb-measure .katex-display>.katex{white-space:normal}
.tb-cover{padding:55mm 25mm}.tb-cover h1{font-size:32pt;margin-top:15mm}.tb-cover p{font-size:16pt}.tb-cover .tb-cover-code{color:#174f55;border-top:2mm solid #174f55;padding-top:5mm}.tb-spread{display:flex;gap:6mm;align-items:flex-start}.tb-measure-block{margin:0;padding:0;display:flow-root}.tb-measure{position:absolute;left:0;top:0}
.tb-unit-intro{padding:25mm 8mm 8mm}.tb-unit-intro h1{font-size:28pt;margin:6mm 0 18mm}.tb-unit-intro h3{margin-top:10mm}
.tb-block[data-template-key="auto-unit-intro"] .tb-section-heading,.tb-measure-block[data-template-key="auto-unit-intro"] .tb-section-heading{background:var(--tb-dark);color:white;border:0;border-radius:0 0 12mm 0;padding:12mm 7mm;font-size:28pt;letter-spacing:-1px;margin-bottom:8mm}.tb-block[data-template-key="auto-unit-intro"] .tb-section-heading:before,.tb-measure-block[data-template-key="auto-unit-intro"] .tb-section-heading:before{content:'이 단원의 배움';display:block;font-size:8pt;line-height:1.6;letter-spacing:.03em;color:var(--tb-signal);margin-bottom:4mm}.tb-block[data-template-key="auto-unit-intro"] .tb-prose,.tb-measure-block[data-template-key="auto-unit-intro"] .tb-prose{border-left:2pt solid var(--tb-accent);padding-left:4mm;font-size:10pt;line-height:1.9}.tb-block[data-template-key="auto-unit-intro"] .tb-prose h2,.tb-measure-block[data-template-key="auto-unit-intro"] .tb-prose h2{font-size:15pt;color:var(--tb-accent);margin-top:5mm}
.tb-paper[data-template-key="rest"]{background:#fffdf6}.tb-block[data-template-key="rest"] .tb-section-heading,.tb-measure-block[data-template-key="rest"] .tb-section-heading{background:transparent;border:0;padding-left:0;color:#334d35}.tb-block[data-template-key="rest"] .tb-figure img,.tb-measure-block[data-template-key="rest"] .tb-figure img{max-height:85mm}.tb-block[data-template-key="rest"] .tb-prose,.tb-measure-block[data-template-key="rest"] .tb-prose{font-size:10pt;line-height:1.9;color:#354a37}.tb-block[data-template-key="rest"] .tb-prose h3,.tb-measure-block[data-template-key="rest"] .tb-prose h3{font-size:9pt;border-top:.65pt solid #d3dec7;padding-top:3mm;margin-top:4mm;color:#5b7550}
@media screen{.tb-paper{box-shadow:0 2px 10px #0002}.tb-spread{overflow:auto}}@media print{.tb-spread{display:block}.tb-paper{box-shadow:none}}
${EDITORIAL_CSS}
${TEXTBOOK_CONTENT_CSS}
${DIALOGUE_CSS}
${SEMANTIC_ACTIVITY_CSS}
${RECOVERY_FRAME_CSS}
${SOURCE_CHAPTER_CSS}
`;

export function renderPageHtml(
  page: TextbookPage,
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  if (page.kind === "cover") {
    return renderCoverHtml(page, model, resources);
  }
  const blocks = new Map(
    model.sections.flatMap((s) => s.blocks).map((b) => [b.id, b]),
  );
  const templates = new Map(
    model.sections.flatMap((s) => s.blocks.map((b) => [b.id, s.templateKey])),
  );
  const left =
    page.physicalPageIndex % 2 === 0
      ? model.config.print.outerMarginMm
      : model.config.print.innerMarginMm;
  const right =
    page.physicalPageIndex % 2 === 0
      ? model.config.print.innerMarginMm
      : model.config.print.outerMarginMm;
  const section = model.sections.find(
    (candidate) =>
      candidate.unitKey === page.unitKey &&
      candidate.sectionKey === page.sectionKey,
  );
  const stage = editorialStage(blocks.get(page.blocks[0]?.blockId), section);
  const dialogue = page.blocks.filter((placement) => {
    const block = blocks.get(placement.blockId);
    return block && isDialoguePlacement(block);
  });
  const backdrop = dialogue.length
    ? `<div class="tb-dialogue-backdrop" aria-hidden="true" style="left:${dialogue[0].xMm}mm;top:${dialogue[0].yMm - 3}mm;width:${dialogue[0].widthMm}mm;height:${Math.max(...dialogue.map((placement) => placement.yMm + placement.heightMm)) - dialogue[0].yMm + 6}mm"></div>`
    : "";
  const dialoguePages = model.sections
    .flatMap((candidate) => candidate.blocks)
    .filter(isDialoguePlacement);
  const dialogueSource = dialogue
    .map((placement) => blocks.get(placement.blockId)!)
    .find((block) => block.semantic?.source?.scriptIndex)?.semantic?.source;
  const scriptIndex = dialogueSource?.scriptIndex;
  const scriptTotal = scriptIndex
    ? Math.max(
        ...dialoguePages
          .filter(
            (block) => block.semantic?.source?.unit === dialogueSource.unit,
          )
          .map((block) => block.semantic?.source?.scriptIndex ?? 0),
      )
    : 0;
  const continueNote = dialogue.length
    ? `<div class="tb-dialogue-page-note" style="left:${left}mm;right:${right}mm">${renderDialogueContinueHtml(
        {
          label: "단원을 여는 수업",
          index: scriptIndex ?? 1,
          total: scriptTotal || 1,
          note:
            scriptIndex && scriptIndex < scriptTotal
              ? "다음 쪽에서 이어집니다."
              : "수업에서 배운 내용을 설명해 보세요.",
        },
      )}</div>`
    : "";
  const recovered = Boolean(section?.blocks.some((block) => block.semantic));
  const placementHtml = (
    p: TextbookPage["blocks"][number],
    offsetX = 0,
    offsetY = 0,
  ) => {
    const block = blocks.get(p.blockId);
    if (!block) throw new Error(`Missing rendered block ${p.blockId}`);
    const blockSection = model.sections.find((s) =>
      s.blocks.some((b) => b.id === block.id),
    );
    return `<div class="tb-block" data-template-key="${esc(templates.get(block.id) ?? "")}" data-block-id="${esc(block.id)}"${p.itemId ? ` data-item-id="${esc(p.itemId)}"` : ""} style="left:${p.xMm - offsetX}mm;top:${p.yMm - offsetY}mm;width:${p.widthMm}mm;height:${p.heightMm}mm"><div class="tb-block-inner">${renderBlockHtml(editorialBlock(block, blockSection), resources)}</div></div>`;
  };
  const bodyBlocks = page.blocks.filter(
    (placement) => blocks.get(placement.blockId)?.kind !== "heading",
  );
  const bodyTop = Math.min(
    ...bodyBlocks.map((placement) => placement.yMm),
    ...dialogue.map((placement) => placement.yMm - 3),
  );
  const bodyEnd = Math.max(
    ...bodyBlocks.map((placement) => placement.yMm + placement.heightMm),
    ...dialogue.map((placement) => placement.yMm + placement.heightMm + 3),
  );
  const content =
    recovered && bodyBlocks.length
      ? page.blocks
          .filter(
            (placement) => blocks.get(placement.blockId)?.kind === "heading",
          )
          .map((placement) => placementHtml(placement))
          .join("") +
        `<div class="tb-reference-content" data-source-body style="position:absolute;left:${left}mm;top:${bodyTop}mm;right:${right}mm;height:${bodyEnd - bodyTop}mm">${bodyBlocks.map((placement) => placementHtml(placement, left, bodyTop)).join("")}</div>`
      : page.blocks.map((placement) => placementHtml(placement)).join("");
  return `<article class="tb-paper${recovered ? " tb-recovered" : ""} tb-stage-${stage} tb-page-${page.physicalPageIndex % 2 === 0 ? "even" : "odd"}" data-editorial-stage="${stage}" data-textbook-page="${page.physicalPageIndex}" data-section-key="${esc(page.sectionKey)}" data-template-key="${esc(section?.templateKey ?? "")}"><header class="tb-header" style="left:${left}mm;right:${right}mm"><span class="tb-running-brand"><i aria-hidden="true"></i>인재원 수학</span><span class="tb-running-context">${esc(model.config.displayCode)} · ${esc(model.title)}<small>${esc(page.unitTitle)}</small></span></header><aside class="tb-edge-tab" aria-label="현재 학습 단계">${esc(model.variant === "answers" ? "정답과 해설" : EDITORIAL_STAGES[stage].label)}</aside>${backdrop}${content}${continueNote}<footer class="tb-footer" style="left:${left}mm;right:${right}mm"><strong>${esc(page.printedPageLabel)}</strong><span>${esc(EDITORIAL_STAGES[stage].label)}</span><span class="tb-footer-brand">INJAEWON<i aria-hidden="true"></i></span></footer></article>`;
}

export function measurementHtml(
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  return `<main class="tb-measure">${model.sections
    .flatMap((section) =>
      section.blocks.map(
        (block) =>
          `<div class="tb-measure-block" data-template-key="${esc(section.templateKey)}" data-measure-id="${esc(block.id)}" style="width:${blockWidthMm(model.config, block)}mm${block.measurementMinHeightMm ? `;min-height:${block.measurementMinHeightMm}mm` : ""}">${renderBlockHtml(editorialBlock(block, section), resources)}</div>`,
      ),
    )
    .join("")}</main>`;
}
/** Only an authorized private measurement DOM receives these recall probes. */
export function recallMeasurementHtml(
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  if (
    model.sections.some((section) =>
      section.blocks.some((block) => block.kind !== "recall"),
    )
  )
    throw new Error(
      "Canonical measurement probes must contain recall rows only",
    );
  return measurementHtml(model, resources).replaceAll(
    "data-measure-id=",
    "data-recall-probe-id=",
  );
}
export function textbookHtmlDocument(
  title: string,
  body: string,
  localFontCss: string,
  katexCss: string,
): string {
  // Both CSS inputs are bundled server resources, never manuscript/API fields.
  if (/<\/style/i.test(localFontCss + katexCss))
    throw new Error("Unsafe bundled CSS");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https://textbook.invalid; font-src data: https://textbook.invalid; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${esc(title)}</title><style>${localFontCss}\n${katexCss}\n${TEXTBOOK_CSS}</style></head><body>${body}</body></html>`;
}
