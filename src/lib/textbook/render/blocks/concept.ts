import type { TextbookSourceFragment } from "@/contracts/textbookSemantic.contract";
import type { EditorialBlock } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { recallDisplayRows } from "./recall";
import { renderSourceFragments } from "./semantic";
import { qrHtml, type RenderResources } from "./shared";

/**
 * Typed image nodes resolve their URL through the resources. The shared renderer is given
 * them on every call; a version that does not read them yet ignores the argument.
 */
const renderFragments = renderSourceFragments as (
  nodes: readonly TextbookSourceFragment[],
  resources?: RenderResources,
) => string;

type ConceptBlock = Extract<EditorialBlock, { kind: "concept" }> & {
  /** 1-based position among the book's concepts, counted by the render model. */
  ordinal?: number;
};

/**
 * The printed number is the book order, or a code the author wrote (C03, concept-12).
 * A generated key such as `concept-<uuid>` has no number: its digits are not an order.
 */
function conceptNumber(block: ConceptBlock): string {
  if (Number.isInteger(block.ordinal) && block.ordinal! > 0)
    return String(block.ordinal).padStart(2, "0");
  const authored = /^(?:c|concept[-_]?)(\d{1,3})$/i.exec(block.conceptKey);
  return authored ? authored[1].padStart(2, "0") : "";
}

function titleHtml(block: ConceptBlock, title: string): string {
  if (block.continuation) return "";
  const number = conceptNumber(block);
  return `<h3 class="tb-concept-title" data-anchor="concept-title">${number ? `<span class="tb-concept-number">${esc(number)}</span>` : ""}${esc(title)}</h3>`;
}

export function renderConceptHtml(
  block: Extract<EditorialBlock, { kind: "concept" }>,
  resources: RenderResources,
): string {
  const concept: ConceptBlock = block;
  const node = concept.semantic?.node;
  const qr = block.qr ? qrHtml(resources, block.qr.id, block.qr.url) : "";
  // One source concept: its own name, and its explanation, example and caution kept together.
  if (node?.kind === "concept")
    return `<section class="tb-concept tb-concept-card" data-concept-id="${esc(node.conceptId)}">${titleHtml(concept, node.title)}<div class="tb-concept-rows">${recallDisplayRows(
      node.rows,
      "study",
      true,
    )
      .map(
        (row) =>
          `<div class="tb-concept-row" data-row-key="${esc(row.rowKey)}" data-concept-id="${esc(node.conceptId)}"><div class="tb-concept-row-label">${esc(row.label)}</div><div class="tb-concept-row-body">${md(row.pieces.map((piece) => (piece.kind === "blank" ? "" : piece.markdown)).join(""))}</div></div>`,
      )
      .join("")}</div>${qr}</section>`;
  if (node?.kind === "fragments")
    return `<section class="tb-concept tb-source-fragments" data-source-kind="${esc(concept.semantic?.source?.kind ?? "concept")}">${titleHtml(concept, block.title)}${renderFragments(node.fragments, resources)}${qr}</section>`;
  // No source rows (an edited or older manuscript): the saved body is printed as written.
  const b = block.body;
  const list = (title: string, rows: string[], style: string) =>
    rows.length
      ? `<div class="tb-concept-part tb-concept-${style}"><h4>${title}</h4><ul>${rows.map((r) => `<li>${md(r)}</li>`).join("")}</ul></div>`
      : "";
  return `<section class="tb-concept">${titleHtml(concept, block.title)}${b.goal ? `<div class="tb-goal"><b>배움의 목표</b><div>${md(b.goal)}</div></div>` : ""}${list("준비할 개념", b.prerequisites, "prerequisites")}${b.definition ? `<div class="tb-definition"><h4>정의와 성질</h4>${md(b.definition)}</div>` : ""}${b.conditions ? `<div class="tb-conditions"><h4>조건 확인</h4><div>${md(b.conditions)}</div></div>` : ""}${list("예로 확인", b.examples, "examples")}${list("반례 · 구별하기", b.counterexamples, "nonexamples")}${list("헷갈리지 않기", b.misconceptions, "caution")}${b.explainPrompt ? `<div class="tb-prompt"><b>내 말로 설명</b><div>${md(b.explainPrompt)}</div></div>` : ""}${qr}</section>`;
}
