import type { EditorialBlock } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { qrHtml, type RenderResources } from "./shared";

export function renderConceptHtml(
  block: Extract<EditorialBlock, { kind: "concept" }>,
  resources: RenderResources,
): string {
  const b = block.body;
  const list = (title: string, rows: string[], style: string) =>
    rows.length
      ? `<div class="tb-concept-part tb-concept-${style}"><h4>${title}</h4><ul>${rows.map((r) => `<li>${md(r)}</li>`).join("")}</ul></div>`
      : "";
  const code =
    /(?:C|concept[-_]?)(\d+)/i.exec(block.conceptKey)?.[1] ??
    /(?:^|[-_])(\d+)$/.exec(block.conceptKey)?.[1] ??
    "01";
  return `<section class="tb-concept">${block.continuation ? "" : `<h3 class="tb-concept-title"><span class="tb-concept-number">${esc(code.padStart(2, "0"))}</span>${esc(block.title)}</h3>`}${b.goal ? `<div class="tb-goal"><b>배움의 목표</b><div>${md(b.goal)}</div></div>` : ""}${list("준비할 개념", b.prerequisites, "prerequisites")}${b.definition ? `<div class="tb-definition"><h4>정의와 성질</h4>${md(b.definition)}</div>` : ""}${b.conditions ? `<div class="tb-conditions"><h4>조건 확인</h4><div>${md(b.conditions)}</div></div>` : ""}${list("예로 확인", b.examples, "examples")}${list("반례 · 구별하기", b.counterexamples, "nonexamples")}${list("헷갈리지 않기", b.misconceptions, "caution")}${b.explainPrompt ? `<div class="tb-prompt"><b>내 말로 설명</b><div>${md(b.explainPrompt)}</div></div>` : ""}${block.qr ? qrHtml(resources, block.qr.id, block.qr.url) : ""}</section>`;
}
