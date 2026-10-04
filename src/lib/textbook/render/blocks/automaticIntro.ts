import type { RenderBlock } from "../model";
import { editorialUnitAsset, editorialUnitNumber } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { editorialImage, type RenderResources } from "./shared";
import { writingLinesHtml } from "./semantic";

/** One frozen opening has three measured projections. Pagination selects a spread or a complete single page. */
export function renderAutomaticIntroHtml(
  block: RenderBlock,
  resources: RenderResources,
): string | null {
  const node = block.semantic?.node;
  if (node?.kind !== "unitIntro" || !block.unitIntroPart) return null;
  const title = block.semantic?.title ?? "단원 도입";
  const number = String(editorialUnitNumber(block)).padStart(2, "0");
  const art = editorialImage(
    resources,
    editorialUnitAsset(block),
    "수학 단원 조형 삽화",
  ).replace("<img ", '<img data-textbook-decorative-bleed-mm="4" ');
  const heading = `<div class="tb-intro-number"><small>UNIT</small><strong>${number}</strong></div><h2>${esc(title)}</h2>`;
  const question = `<div class="tb-intro-question">${md(node.question)}</div>`;
  const explanation = `<div class="tb-intro-explanation">${md(node.explanation)}</div>`;
  const key = node.keyPhrase
    ? `<div class="tb-intro-key"><i aria-hidden="true"></i>${esc(node.keyPhrase)}</div>`
    : "";
  const goals = `<section class="tb-intro-goals"><h3>이 단원의 학습 목표</h3><ul>${node.goals.map((goal) => `<li>${md(goal)}</li>`).join("")}</ul></section>`;
  const path = `<section class="tb-intro-path"><h3>선택한 범위의 학습 순서</h3><ol>${node.path.map((step) => `<li>${md(step)}</li>`).join("")}</ol></section>`;
  const check = `<section class="tb-intro-check"><h3>나의 출발점</h3>${node.check.map((prompt) => `<div>${md(prompt)}${writingLinesHtml(2)}</div>`).join("")}</section>`;
  const date = `<div class="tb-intro-date">${esc(node.dateLabel ?? "공부를 시작한 날")}<span aria-label="날짜 작성 공간">년　　월　　일</span></div>`;
  if (block.unitIntroPart === "left")
    return `<section class="tb-auto-intro tb-auto-intro-left">${heading}${question}<figure>${art}</figure>${explanation}${key}</section>`;
  if (block.unitIntroPart === "right")
    return `<section class="tb-auto-intro tb-auto-intro-right"><header><span>LEARNING ROADMAP</span><h2>배움의 길잡이</h2></header>${goals}${path}${check}${date}</section>`;
  return `<section class="tb-auto-intro tb-auto-intro-single"><header><div>${heading}${question}${explanation}${key}</div><figure>${art}</figure></header><div class="tb-intro-single-columns">${goals}${path}</div>${check}${date}</section>`;
}

export const AUTOMATIC_INTRO_CSS = `
.tb-auto-intro{color:#365746;font-size:8.25pt;line-height:1.75}.tb-auto-intro h3{font-size:10.5pt;color:var(--tb-accent);margin-bottom:2mm;border-bottom:.265mm solid var(--tb-light);padding-bottom:1.5mm}
.tb-auto-intro-left{position:relative;height:254mm;background:#f2f6ef}.tb-auto-intro-left .tb-intro-number{position:absolute;top:7mm;left:0;display:flex;gap:4mm}.tb-intro-number small{font-size:7pt;letter-spacing:1.8px;border-top:2pt solid #cee66c;padding-top:5mm;margin-top:3mm}.tb-intro-number strong{font-size:76pt;line-height:1;letter-spacing:-6px;color:#2f7e62}
.tb-auto-intro-left h2{position:absolute;top:48mm;left:0;right:0;font-size:31pt;line-height:1.25;letter-spacing:-1.7px;color:#123f35}.tb-auto-intro-left .tb-intro-question{position:absolute;top:83mm;left:0;right:4mm;font-size:11.1pt;line-height:1.7;font-weight:700}.tb-intro-question p{margin:0}
.tb-auto-intro-left figure{position:absolute;top:101mm;left:-4mm;right:-4mm;height:119mm;margin:0}.tb-auto-intro-left figure img{width:100%;height:100%;object-fit:contain}.tb-auto-intro-left .tb-intro-explanation{position:absolute;top:225mm;left:0;right:3mm;font-size:8.9pt;line-height:1.85}.tb-auto-intro-left .tb-intro-key{position:absolute;top:248mm;left:0;right:0}
.tb-intro-key{display:flex;gap:2.2mm;align-items:center;font-size:7.6pt;font-weight:700}.tb-intro-key i{width:2.2mm;height:2.2mm;background:#b6d453;transform:rotate(45deg)}
.tb-auto-intro-right{padding-top:10mm}.tb-auto-intro-right>header{border-bottom:1.1pt solid #7da28f;padding-bottom:4mm;margin-bottom:5mm}.tb-auto-intro-right>header>span{font-size:7pt;letter-spacing:.7px;font-weight:700}.tb-auto-intro-right>header h2{font-size:23pt;line-height:1.4;letter-spacing:-1px;margin:1mm 0 0}
.tb-intro-goals li,.tb-intro-path li{margin-bottom:1.7mm}.tb-intro-goals ul,.tb-intro-path ol{margin:0;padding-left:5mm}.tb-intro-path,.tb-intro-check{margin-top:5mm}.tb-intro-check>div+div{margin-top:3mm}.tb-auto-intro .tb-semantic-lines{margin-top:1mm}
.tb-auto-intro-single>header{border-bottom:1.1pt solid #7da28f;padding-bottom:4mm;margin-bottom:5mm}.tb-auto-intro-single .tb-intro-number{float:right;display:flex;gap:2mm}.tb-auto-intro-single .tb-intro-number strong{font-size:35pt}.tb-auto-intro-single h2{font-size:23pt;line-height:1.4;letter-spacing:-1px;margin-bottom:3mm}.tb-auto-intro-single .tb-intro-question{font-size:10pt;font-weight:700}.tb-auto-intro-single .tb-intro-key{margin-top:2mm}.tb-intro-single-columns{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.tb-intro-single-columns .tb-intro-path{margin-top:0}
.tb-auto-intro-single>header{display:grid;grid-template-columns:minmax(0,1fr) 45mm;gap:7mm}.tb-auto-intro-single>header>figure{margin:0}.tb-auto-intro-single>header>figure img{width:45mm;height:45mm;object-fit:contain}.tb-intro-date{display:flex;justify-content:flex-end;gap:4mm;margin-top:4mm;font-size:7.5pt}.tb-intro-date span{display:inline-block;width:43mm;border-bottom:.265mm solid #a7b7ac}
.tb-recovered[data-template-key="auto-unit-intro"]{background:#f2f6ef}.tb-recovered[data-template-key="auto-unit-intro"] .tb-edge-tab{display:none}
`;
