import type {
  TextbookSemantic,
  TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";
import type { RenderBlock } from "../model";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { imageHtml, type RenderResources } from "./shared";
import { dialogueMarkdownHtml, v15DisplayMarkdown } from "./dialogue";
import { bankActivityOf, renderBankActivityHtml } from "./bankActivities";

function inlineMarkdown(source: string): string {
  const html = dialogueMarkdownHtml(v15DisplayMarkdown(source));
  return /^<p>[\s\S]*<\/p>$/.test(html) && !html.slice(3, -4).includes("<p>")
    ? `${/^\s/.test(source) ? " " : ""}${html.slice(3, -4)}${/\s$/.test(source) ? " " : ""}`
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

/**
 * 이 글 블록의 **지면에 찍히는 글**이 본문(markdown)이 아니라 구조(`semantic.node`)에서 나오는가.
 * 편집 화면이 «본문» 입력을 열어 둘지 정할 때 쓴다 — 본문을 고쳐도 지면의 글이 바뀌지 않는 블록은 입력을 닫는다.
 * 아래 `renderSemanticTextHtml` · 판서(`board`) · 단원 도입(`auto-unit-intro` 틀의 `unitIntro`)의 갈래와 같은 종류만 답한다.
 * 은행 활동(`rows`)은 설명 활동만 참이다 — 자유 백지 · 개념 지도는 본문을 읽는다. 여기서 확인하지 않은 종류는 false 다(지금처럼 고칠 수 있다).
 *
 * ⚠️ 재는 것은 «찍히는 글» 이지 «쪽 나눔» 이 아니다. 조판(`layout/paginate.ts`)은 글 블록의 본문이 «제목 한 줄» 꼴이면
 * 다음 블록과 붙여 넘긴다 — 구조에서 나오는 블록도 저장된 본문이 그 꼴이면 그렇게 놓인다. 입력을 닫아도 저장된 본문은
 * 그대로라 그 배치는 바뀌지 않는다(닫히는 것은 본문을 고쳐 그 배치를 바꾸는 길뿐이다).
 */
export function textPrintsFromStructure(
  semantic: TextbookSemantic | undefined,
  templateKey: string,
): boolean {
  const node = semantic?.node;
  if (!node) return false;
  // 은행 활동 셋 가운데 설명 활동만 본문을 읽지 않는다(자유 백지 · 개념 지도는 본문이 «작성 방법» 으로 찍힌다)
  if (bankActivityOf(semantic) === "explainActivity") return true;
  switch (node.kind) {
    case "fragments":
    case "writing":
    case "references":
    case "exampleGroup":
    case "board":
      return true;
    case "unitIntro":
      return templateKey === "auto-unit-intro";
    default:
      return false;
  }
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
  const bankActivity = renderBankActivityHtml(block);
  if (bankActivity !== null) return bankActivity;
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
  if (node.kind === "exampleGroup") {
    const sourceTitle = semantic.source
      ? /^Y(\d+)\s+(.+)$/.exec(node.title)
      : null;
    const number = sourceTitle?.[1] ?? block.exampleGroupNumber;
    return `<section class="tb-example-group tb-pair-heading${semantic.source ? " tb-source-example-heading" : ""}" data-example-group="${esc(node.groupId)}"><div class="tb-paired-title">${number ? `<span class="tb-pair-index"><small>유형</small><b>${String(number).padStart(2, "0")}</b></span>` : ""}<h3>${esc(sourceTitle?.[2] ?? node.title)}</h3></div>${node.strategyKind === "captured-solution" ? "" : `<div class="tb-example-strategy">${semantic.source ? `<b>풀이전략</b>${dialogueMarkdownHtml(v15DisplayMarkdown(node.strategy))}` : md(node.strategy)}</div>`}</section>`;
  }
  return null;
}

export const SEMANTIC_ACTIVITY_CSS = `
.tb-writing-activity{font-size:9pt;line-height:1.85}.tb-writing-prompt+.tb-writing-prompt{margin-top:4mm}
.tb-semantic-lines{width:100%;margin-top:2mm;background:white}.tb-semantic-line{height:7mm;border-bottom:.265mm solid #d9e2db}
.tb-references{width:100%;font-size:9pt;line-height:1.7}.tb-reference-row{display:grid;grid-template-columns:minmax(0,1fr) 18mm;align-items:center;gap:3mm;min-height:9mm;border-bottom:.265mm solid var(--tb-light)}
.tb-reference-row>span:first-child{min-width:0}.tb-reference-row p{margin:0}.tb-reference-page{display:flex;justify-content:flex-end;align-items:center;width:18mm;height:9mm;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}
.tb-example-group{border-top:.6mm solid var(--tb-accent);background:var(--tb-soft);padding:3mm 4mm;font-size:8.5pt}.tb-example-group h3{font-size:11pt}.tb-example-strategy{margin-bottom:2mm}
`;
