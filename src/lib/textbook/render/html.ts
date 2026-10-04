import type { RenderBlock, TextbookRenderModel } from "./model";
import type { TextbookPage } from "../layout/paginate";
import { blockWidthMm } from "../layout/paginate";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "./markdown";
import {
  hasUnlinkedFigureChoices,
  UNLINKED_FIGURE_CHOICES_NOTICE,
} from "@/lib/problem/choiceFigureIndex";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { getTextbookCharacter } from "../characters";

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
  const image = (
    id: string,
    alt: string,
    width?: number,
    portraitAtlas = false,
  ) =>
    `<img data-textbook-image${portraitAtlas ? " data-textbook-portrait-atlas" : ""} src="${attrUrl(resources.assetUrl(id))}" alt="${esc(alt)}"${width ? ` style="width:${width}mm;max-width:100%"` : ""}>`;
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
    case "dialogue": {
      // Frozen bytes are addressed by SHA256. Only our explicit speaker namespace opts into
      // atlas clipping, so older single-image portraits and imported speakers keep their layout.
      const character = block.speakerId.startsWith("tb-portrait-")
        ? getTextbookCharacter(block.speakerId.slice("tb-portrait-".length))
        : undefined;
      if (character) {
        const expressions = {
          neutral: "편안한 표정",
          question: "질문하는 표정",
          thinking: "생각하는 표정",
          aha: "깨달은 표정",
        };
        const expression = Object.hasOwn(expressions, block.expression)
          ? (block.expression as keyof typeof expressions)
          : "neutral";
        return `<div class="tb-dialogue tb-dialogue-atlas tb-dialogue-${block.side} tb-speaker-${character.role}" data-expression="${expression}" data-speaker-id="${esc(block.speakerId)}"><div class="tb-portrait"><span class="tb-portrait-frame tb-expression-${expression}${block.mirrorPortrait ? " tb-frame-mirrored" : ""}">${image(block.portraitAssetId, `${character.name} · ${expressions[expression]}`, undefined, true)}</span><span class="tb-portrait-name">${esc(character.name)}</span></div><div class="tb-bubble">${md(block.markdown)}</div></div>`;
      }
      return `<div class="tb-dialogue tb-dialogue-${block.side}" data-expression="${esc(block.expression)}"><div class="tb-portrait${block.mirrorPortrait ? " tb-mirrored" : ""}">${image(block.portraitAssetId, block.speakerId)}</div><div class="tb-bubble"><strong>${esc(block.speakerId)}</strong>${md(block.markdown)}</div></div>`;
    }
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
  return `<article class="tb-paper tb-page-${page.physicalPageIndex % 2 === 0 ? "even" : "odd"}" data-textbook-page="${page.physicalPageIndex}" data-section-key="${esc(page.sectionKey)}" data-template-key="${esc(section?.templateKey ?? "")}"><header class="tb-header" style="left:${left}mm;right:${right}mm"><span>${esc(model.title)}</span><strong>${esc(page.unitTitle)}</strong></header>${page.blocks
    .map((p) => {
      const block = blocks.get(p.blockId);
      if (!block) throw new Error(`Missing rendered block ${p.blockId}`);
      return `<div class="tb-block" data-template-key="${esc(templates.get(block.id) ?? "")}" data-block-id="${esc(block.id)}"${p.itemId ? ` data-item-id="${esc(p.itemId)}"` : ""} style="left:${p.xMm}mm;top:${p.yMm}mm;width:${p.widthMm}mm;height:${p.heightMm}mm"><div class="tb-block-inner">${renderBlockHtml(block, resources)}</div></div>`;
    })
    .join(
      "",
    )}<footer class="tb-footer" style="left:${left}mm;right:${right}mm"><strong>${esc(page.printedPageLabel)}</strong><span>${esc(page.sectionTitle)}</span><span class="tb-footer-brand">INJAEWON<i aria-hidden="true"></i></span></footer></article>`;
}

export function measurementHtml(
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  return `<main class="tb-measure">${model.sections
    .flatMap((section) =>
      section.blocks.map(
        (block) =>
          `<div class="tb-measure-block" data-template-key="${esc(section.templateKey)}" data-measure-id="${esc(block.id)}" style="width:${blockWidthMm(model.config, block)}mm">${renderBlockHtml(block, resources)}</div>`,
      ),
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
