import type { RenderBlock, TextbookRenderModel } from "./model";
import type { TextbookPage } from "../layout/paginate";
import { blockWidthMm } from "../layout/paginate";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "./markdown";
import {
  hasUnlinkedFigureChoices,
  UNLINKED_FIGURE_CHOICES_NOTICE,
} from "@/lib/problem/choiceFigureIndex";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";

export interface RenderResources {
  assetUrl: (assetId: string) => string;
  qrDataUrl: (qrTargetId: string, url: string) => string;
}
const attrUrl = (url: string) => {
  if (
    !/^(?:data:image\/(?:png|jpeg|webp|svg\+xml);base64,|https:\/\/textbook\.invalid\/|\/(?!\/))/.test(
      url,
    )
  )
    throw new Error("지면에는 고정 로컬 자산 URL만 허용합니다.");
  return esc(url);
};
export function renderBlockHtml(
  block: RenderBlock,
  resources: RenderResources,
): string {
  const image = (id: string, alt: string, width?: number) =>
    `<img data-textbook-image src="${attrUrl(resources.assetUrl(id))}" alt="${esc(alt)}"${width ? ` style="width:${width}mm;max-width:100%"` : ""}>`;
  const qr = (id: string, url: string) =>
    `<figure class="tb-qr" data-qr-id="${esc(id)}" data-qr-url="${esc(url)}"><img src="${attrUrl(resources.qrDataUrl(id, url))}" alt="해설 QR"><figcaption>해설 보기</figcaption></figure>`;
  switch (block.kind) {
    case "unit-intro":
      return `<section class="tb-unit-intro"><p>이 단원의 배움</p><h1>${esc(block.title)}</h1><h3>배울 내용</h3><ul>${block.goals.map((goal) => `<li>${md(goal)}</li>`).join("")}</ul>${block.prerequisites.length ? `<h3>준비할 개념</h3><ul>${block.prerequisites.map((goal) => `<li>${md(goal)}</li>`).join("")}</ul>` : ""}</section>`;
    case "heading":
      return `<h2 class="tb-section-heading">${esc(block.title)}</h2>`;
    case "text":
      return `<div class="tb-prose">${md(block.markdown)}</div>`;
    case "image":
      return `<figure class="tb-figure">${image(block.assetId, block.caption ?? "그림")}${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
    case "dialogue":
      return `<div class="tb-dialogue tb-dialogue-${block.side}" data-expression="${esc(block.expression)}"><div class="tb-portrait${block.mirrorPortrait ? " tb-mirrored" : ""}">${image(block.portraitAssetId, block.speakerId)}</div><div class="tb-bubble"><strong>${esc(block.speakerId)}</strong>${md(block.markdown)}</div></div>`;
    case "concept": {
      const b = block.body;
      const list = (title: string, rows: string[]) =>
        rows.length
          ? `<div class="tb-concept-part"><h4>${title}</h4><ul>${rows.map((r) => `<li>${md(r)}</li>`).join("")}</ul></div>`
          : "";
      return `<section class="tb-concept"><h3>${esc(block.title)}</h3><div class="tb-goal">${md(b.goal)}</div>${list("준비할 개념", b.prerequisites)}<div class="tb-definition">${md(b.definition)}</div>${b.conditions ? `<div>${md(b.conditions)}</div>` : ""}${list("예", b.examples)}${list("반례", b.counterexamples)}${list("주의할 점", b.misconceptions)}${b.explainPrompt ? `<div class="tb-prompt">${md(b.explainPrompt)}</div>` : ""}${block.qr ? qr(block.qr.id, block.qr.url) : ""}</section>`;
    }
    case "recall":
      return `<section class="tb-recall" data-phase="${block.phase}">${block.pieces.map((p) => (p.kind === "blank" ? `<span class="tb-blank tb-blank-${p.scope}" aria-label="빈칸"></span>` : `<div class="tb-recall-text">${md(p.markdown)}</div>`)).join("")}${block.repetitionChecks ? '<div class="tb-repetition">1 ○　2 ○　3 ○　4 ○</div>' : ""}</section>`;
    case "problem": {
      const { choices } = parseProblemContent(block.content);
      // Classify with the shared parser, but render the original Markdown.
      // Its normalized output has no source offsets, so place the one notice
      // before the whole prose rather than reconstructing or splitting it.
      const figureNotice = hasUnlinkedFigureChoices(
        block.figures.length,
        block.figures.map((f) => f.choiceIndex),
        choices,
      )
        ? `<p class="tb-choice-figure-notice">${esc(UNLINKED_FIGURE_CHOICES_NOTICE)}</p>`
        : "";
      const figures = block.figures
        .map(
          (f) =>
            `<figure class="tb-problem-figure" data-choice-index="${f.choiceIndex ?? "unknown"}">${f.choiceIndex && f.choiceIndex > 0 ? `<span class="tb-choice-label">${f.choiceIndex}번 보기</span>` : ""}${image(f.assetId, f.altText ?? "문제 그림", f.sourceWidthMm ?? undefined)}</figure>`,
        )
        .join("");
      const answer =
        block.answer !== undefined
          ? `<section class="tb-answer"><h4>정답${block.sourcePageLabel ? ` · 문제 ${esc(block.sourcePageLabel)}쪽` : ""}</h4>${md(block.answer)}${block.solution !== null && block.solution !== undefined ? `<div>${md(block.solution)}</div>` : ""}</section>`
          : block.publicWorkedExample
            ? `<section class="tb-worked"><h4>함께 풀어 보기</h4>${md(block.publicWorkedExample.answer)}${block.publicWorkedExample.solution ? md(block.publicWorkedExample.solution) : ""}</section>`
            : "";
      const lines =
        block.answer === undefined && !block.publicWorkedExample
          ? block.layout.preferredWorkLines
          : 0;
      return `<section class="tb-problem"><header class="tb-problem-head"><strong>${esc(block.displayNumber)}</strong>${block.questionType ? `<span>${esc(block.questionType)}</span>` : ""}</header>${figureNotice}<div class="tb-prose">${md(block.content)}</div>${figures}${answer}<div class="tb-work-area" style="min-height:${Math.max(lines * 7, block.qr ? 27 : 0)}mm">${lines ? `<div class="tb-work-lines" aria-label="풀이 공간" style="min-height:${lines * 7}mm">${'<div class="tb-work-line"></div>'.repeat(lines)}</div>` : ""}${block.qr ? qr(block.qr.id, block.qr.url) : ""}</div></section>`;
    }
  }
}

export const TEXTBOOK_CSS = `
@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}
.tb-paper,.tb-measure{font-family:TextbookPretendard,sans-serif;font-size:10pt;line-height:1.65;color:#172a30;font-synthesis:none;overflow-wrap:anywhere}
.tb-paper{position:relative;width:210mm;height:297mm;background:white;break-after:page;flex:none}.tb-paper:last-child{break-after:auto}
.tb-paper h1,.tb-paper h2,.tb-paper h3,.tb-measure h1,.tb-measure h2,.tb-measure h3{line-height:1.35;margin:0 0 3mm;font-weight:700}
.tb-paper h4,.tb-measure h4{margin:2mm 0 1mm;line-height:1.5}.tb-paper p,.tb-measure p{margin:0 0 2mm}.tb-paper p:last-child,.tb-measure p:last-child{margin-bottom:0}
.tb-paper ul,.tb-paper ol,.tb-measure ul,.tb-measure ol{margin:1mm 0;padding-left:6mm}.tb-paper li p,.tb-measure li p{margin:0}
.tb-paper img,.tb-measure img{max-width:100%;height:auto;display:block}.tb-paper pre,.tb-measure pre{white-space:pre-wrap;font-size:9pt}
.tb-header{position:absolute;top:15mm;height:18mm;border-bottom:.45mm solid #174f55;display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:3mm;font-size:9pt;gap:5mm}
.tb-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;text-align:center;font-size:9pt;color:#52636a}
.tb-block{position:absolute;display:flex;flex-direction:column}.tb-block-inner{width:100%;height:100%;display:flex;flex-direction:column}.tb-block-inner>*{flex-shrink:0}
.tb-section-heading{font-size:17pt;padding:2mm 0;border-bottom:.2mm solid #92b7b3}.tb-problem{height:100%;display:flex;flex-direction:column}.tb-problem-head{display:flex;gap:3mm;align-items:baseline;margin-bottom:2mm}.tb-problem-head strong{font-size:15pt;color:#174f55}.tb-problem-head span{font-size:8pt;color:#50656a}
.tb-work-area{position:relative;display:flex;margin-top:3mm;flex:1}.tb-work-lines{flex:1}.tb-work-line{height:7mm;border-bottom:.2mm solid #aabcb9}
.tb-qr{width:24mm;margin:0 0 0 3mm;flex:none;align-self:flex-end;text-align:center}.tb-qr img{width:24mm;height:24mm;image-rendering:pixelated}.tb-qr figcaption{font-size:7pt;line-height:3mm}
.tb-problem-figure,.tb-figure{margin:2mm 0}.tb-figure img{max-height:180mm;object-fit:contain;margin:auto}.tb-problem-figure img{max-height:120mm;object-fit:contain;margin:auto}.tb-choice-label{font-size:8pt}.tb-figure figcaption{font-size:8pt;text-align:center;margin-top:2mm}
.tb-answer,.tb-worked{margin-top:3mm;padding:3mm;border-left:1mm solid #7ba3a0;background:#f1f7f5}.tb-concept{border:.3mm solid #8dafaa;padding:4mm}.tb-concept .tb-qr{margin-top:3mm;margin-left:auto}.tb-goal{font-size:9pt;color:#315958;margin-bottom:3mm}.tb-definition{padding:3mm;background:#edf5f2}.tb-concept-part{margin-top:2mm}
.tb-dialogue{display:flex;align-items:flex-start;gap:4mm}.tb-dialogue-right{flex-direction:row-reverse}.tb-portrait{width:22mm;flex:none}.tb-mirrored img{transform:scaleX(-1)}.tb-bubble{flex:1;min-width:0;padding:4mm;border:.3mm solid #a0b9b5;border-radius:4mm}.tb-bubble>strong{font-size:8pt;color:#436961}
.tb-recall{padding:4mm;border:.3mm solid #b5c9c4}.tb-recall-text{display:inline}.tb-recall-text p{display:inline}.tb-blank{display:inline-block;vertical-align:middle;border-bottom:.3mm solid #455b59;height:8mm;min-width:22mm;margin:0 1mm}.tb-blank-sentence{display:block;width:100%;height:21mm}.tb-repetition{margin-top:4mm;text-align:right}
.tb-paper table,.tb-measure table{border-collapse:collapse;width:100%;table-layout:fixed}.tb-paper td,.tb-measure td{border:.2mm solid #9ab5b0;padding:2mm}.tb-paper blockquote,.tb-measure blockquote{margin:2mm 0;padding-left:4mm;border-left:.5mm solid #8dafaa}
.tb-paper .katex,.tb-measure .katex{font-size:1.12em}.tb-paper .katex-display,.tb-measure .katex-display{margin:2mm 0;text-align:left}.tb-paper .katex-display>.katex,.tb-measure .katex-display>.katex{white-space:normal}
.tb-cover{padding:55mm 25mm}.tb-cover h1{font-size:32pt;margin-top:15mm}.tb-cover p{font-size:16pt}.tb-cover .tb-cover-code{color:#174f55;border-top:2mm solid #174f55;padding-top:5mm}.tb-spread{display:flex;gap:6mm;align-items:flex-start}.tb-measure-block{margin:0;padding:0;display:flow-root}.tb-measure{position:absolute;left:0;top:0}
.tb-unit-intro{padding:25mm 8mm 8mm}.tb-unit-intro h1{font-size:28pt;margin:6mm 0 18mm}.tb-unit-intro h3{margin-top:10mm}
@media screen{.tb-paper{box-shadow:0 2px 10px #0002}.tb-spread{overflow:auto}}@media print{.tb-spread{display:block}.tb-paper{box-shadow:none}}
`;

export function renderPageHtml(
  page: TextbookPage,
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  if (page.kind === "cover")
    return `<article class="tb-paper tb-cover" data-textbook-page="${page.physicalPageIndex}"><div class="tb-cover-code">${esc(model.config.displayCode)}</div><h1>${esc(model.title)}</h1><p>${model.config.grade}학년 · ${model.config.semester}학기 · ${model.config.volume}권</p><p>${model.variant === "answers" ? "정답과 해설" : ""}</p></article>`;
  const blocks = new Map(
    model.sections.flatMap((s) => s.blocks).map((b) => [b.id, b]),
  );
  const left =
    page.physicalPageIndex % 2 === 0
      ? model.config.print.outerMarginMm
      : model.config.print.innerMarginMm;
  const right =
    page.physicalPageIndex % 2 === 0
      ? model.config.print.innerMarginMm
      : model.config.print.outerMarginMm;
  return `<article class="tb-paper" data-textbook-page="${page.physicalPageIndex}" data-section-key="${esc(page.sectionKey)}"><header class="tb-header" style="left:${left}mm;right:${right}mm"><span>${esc(model.title)}</span><strong>${esc(page.unitTitle)}</strong></header>${page.blocks
    .map((p) => {
      const block = blocks.get(p.blockId);
      if (!block) throw new Error(`Missing rendered block ${p.blockId}`);
      return `<div class="tb-block" data-block-id="${esc(block.id)}"${p.itemId ? ` data-item-id="${esc(p.itemId)}"` : ""} style="left:${p.xMm}mm;top:${p.yMm}mm;width:${p.widthMm}mm;height:${p.heightMm}mm"><div class="tb-block-inner">${renderBlockHtml(block, resources)}</div></div>`;
    })
    .join(
      "",
    )}<footer class="tb-footer">${esc(page.printedPageLabel)}</footer></article>`;
}

export function measurementHtml(
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  return `<main class="tb-measure">${model.sections
    .flatMap((s) => s.blocks)
    .map(
      (block) =>
        `<div class="tb-measure-block" data-measure-id="${esc(block.id)}" style="width:${blockWidthMm(model.config, block)}mm">${renderBlockHtml(block, resources)}</div>`,
    )
    .join("")}</main>`;
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
