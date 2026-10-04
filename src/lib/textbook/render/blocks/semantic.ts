import type { TextbookSourceFragment } from "@/contracts/textbookSemantic.contract";
import type { RenderBlock } from "../model";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { imageHtml, type RenderResources } from "./shared";
import { dialogueMarkdownHtml, v15DisplayMarkdown } from "./dialogue";

function inlineMarkdown(source: string): string {
  const html = dialogueMarkdownHtml(v15DisplayMarkdown(source));
  return /^<p>[\s\S]*<\/p>$/.test(html) && !html.slice(3, -4).includes("<p>")
    ? html.slice(3, -4)
    : html;
}

/** The validated tree has no URL, arbitrary style, event handler or executable HTML. */
export function renderSourceFragments(
  nodes: readonly TextbookSourceFragment[],
  resources?: RenderResources,
): string {
  return nodes
    .map((node) => {
      const attributes = node.attributes;
      const attrs = `${attributes?.className ? ` class="${esc(attributes.className)}"` : ""}${attributes?.colSpan ? ` colspan="${attributes.colSpan}"` : ""}${attributes?.rowSpan ? ` rowspan="${attributes.rowSpan}"` : ""}`;
      if (node.tag === "br") return "<br>";
      if (node.tag === "img") {
        if (!resources || !attributes?.assetId)
          throw new Error("원본 구조의 고정 그림 자산을 읽을 수 없습니다.");
        return imageHtml(
          resources,
          attributes.assetId,
          attributes.alt ?? "그림",
        ).replace(
          "<img ",
          `<img${attributes.className ? ` class="${esc(attributes.className)}"` : ""} `,
        );
      }
      return `<${node.tag}${attrs}>${node.rawText ? inlineMarkdown(node.rawText) : ""}${renderSourceFragments(node.children ?? [], resources)}</${node.tag}>`;
    })
    .join("");
}

export function writingLinesHtml(lines: number): string {
  return `<div class="tb-semantic-lines" data-writing-space aria-label="작성 공간">${'<div class="tb-semantic-line"></div>'.repeat(lines)}</div>`;
}

/** Independently selected activities use their own instructions and bounded writing spaces. */
export function renderSemanticTextHtml(
  block: Extract<RenderBlock, { kind: "text" }>,
  resources?: RenderResources,
): string | null {
  const semantic = block.semantic;
  const node = semantic?.node;
  if (!semantic || !node) return null;
  if (node.kind === "fragments") {
    const content = renderSourceFragments(node.fragments, resources);
    const marked =
      semantic.source?.kind === "unitSpreadLeft"
        ? content.replaceAll(
            "<img ",
            '<img data-textbook-decorative-bleed-mm="4" ',
          )
        : content;
    return `<section class="tb-source-fragments" data-source-kind="${esc(semantic.source?.kind ?? semantic.activity)}">${marked}</section>`;
  }
  if (node.kind === "writing")
    return `<section class="tb-writing-activity" data-activity="${semantic.activity}">${node.prompts.map((prompt) => `<div class="tb-writing-prompt">${md(prompt)}${writingLinesHtml(node.lines)}</div>`).join("")}</section>`;
  if (node.kind === "references")
    return `<section class="tb-references" data-activity="${semantic.activity}" aria-label="${esc(semantic.title ?? "쪽수 안내")}">${node.entries.map((entry) => `<div class="tb-reference-row" data-reference-key="${esc(entry.key)}"><span>${md(entry.label)}</span><span class="tb-reference-page" aria-label="쪽수">${esc(entry.pageLabel ?? "")}</span></div>`).join("")}</section>`;
  if (node.kind === "exampleGroup")
    return `<section class="tb-example-group" data-example-group="${esc(node.groupId)}"><h3>${esc(node.title)}</h3><div class="tb-example-strategy">${md(node.strategy)}</div><p>대표예제의 풀이를 확인하고 연결된 확인 문제를 스스로 풀어 보세요.</p></section>`;
  return null;
}

export const SEMANTIC_ACTIVITY_CSS = `
.tb-writing-activity{font-size:9pt;line-height:1.85}.tb-writing-prompt+.tb-writing-prompt{margin-top:4mm}
.tb-semantic-lines{width:100%;margin-top:2mm;background:white}.tb-semantic-line{height:7mm;border-bottom:.265mm solid #d9e2db}
.tb-references{width:100%;font-size:9pt;line-height:1.7}.tb-reference-row{display:grid;grid-template-columns:minmax(0,1fr) 18mm;align-items:center;gap:3mm;min-height:9mm;border-bottom:.265mm solid var(--tb-light)}
.tb-reference-row>span:first-child{min-width:0}.tb-reference-row p{margin:0}.tb-reference-page{display:flex;justify-content:flex-end;align-items:center;width:18mm;height:9mm;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}
.tb-example-group{border-top:.6mm solid var(--tb-accent);background:var(--tb-soft);padding:3mm 4mm;font-size:8.5pt}.tb-example-group h3{font-size:11pt}.tb-example-strategy{margin-bottom:2mm}
`;
