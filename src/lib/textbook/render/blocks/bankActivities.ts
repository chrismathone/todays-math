import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import type { RenderBlock } from "../model";
import {
  escapeHtml as esc,
  renderTextbookLabel as label,
  renderTextbookMarkdown as md,
} from "../markdown";

const activities = [
  "conceptBlankTest",
  "explainActivity",
  "conceptMap",
] as const;

/** Bank rules have their own physical pitch; native source rules never use this. */
function rules(count: number): string {
  return `<div class="tb-bank-rules" data-writing-space aria-label="작성 공간">${'<span class="tb-bank-rule"></span>'.repeat(count)}</div>`;
}
function note(title: string, body: string): string {
  return `<div class="tb-bank-note"><strong>${title}</strong><span>${body}</span></div>`;
}
function status(body: string): string {
  return `<div class="tb-bank-status"><strong>${body}</strong><span>완료 ○ &nbsp; 복습 ○ &nbsp; 질문 ○</span></div>`;
}

function freeRecall(instruction: string): string {
  return `${note("작성 방법", md(instruction))}<div class="tb-bank-recall-canvas"><small>정의 → 예 → 판단 이유 → 풀이 방법</small><span class="tb-bank-watermark" aria-hidden="true">INJAEWON</span>${rules(18)}</div><div class="tb-bank-recall-checks"><div><strong>스스로 점검</strong><span>□ 정의의 조건을 빠뜨리지 않았다.</span><span>□ 예와 판단 이유를 설명했다.</span></div><div><strong>선생님과 확인</strong><span>□ 정의와 예의 관계를 확인했다.</span><span>□ 빠뜨린 조건을 찾아 보완했다.</span></div></div>${status('부족한 개념 번호를 적는다: <span class="tb-bank-field" aria-label="부족한 개념"></span>')}`;
}

function oral(rows: readonly TextbookSemanticRow[]): string {
  const route = `<div class="tb-bank-oral-route">${["예를 들어 설명", "질문 주고받기", "표현 고치기"].map((step, i) => `<span><b>${i + 1}</b>${step}</span>`).join("")}</div>`;
  const tasks = rows
    .map(
      (row, i) =>
        `<section class="tb-bank-oral-task" data-row-key="${esc(row.rowKey)}"><div class="tb-bank-oral-head"><b>${String(i + 1).padStart(2, "0")}</b><strong>${label(row.label)}</strong><small>개념 설명</small></div><p>뜻과 사용할 때의 조건을 예와 함께 설명하세요.</p>${rules(3)}<div class="tb-bank-listener"><strong>듣는 사람의 질문</strong><span>뜻이나 조건에서 빠진 부분은 없나요?</span>${rules(1)}</div></section>`,
    )
    .join("");
  const matrix = `<table class="tb-bank-oral-matrix" aria-label="나와 듣는 사람의 설명 확인"><thead><tr><th scope="col">설명 확인</th><th scope="col">나</th><th scope="col">듣는 사람</th></tr></thead><tbody>${["예나 식을 근거로 들었다.", "조건을 빠뜨리지 않았다.", "질문을 듣고 설명을 보완했다."].map((criterion) => `<tr><th scope="row">${criterion}</th><td>○</td><td>○</td></tr>`).join("")}</tbody></table>`;
  return `${route}${tasks}${matrix}<div class="tb-bank-repair">${note("고쳐 말하기", "처음 설명에서 빠뜨린 내용을 적고, 다시 설명하세요.")}${rules(2)}</div>`;
}

function conceptMap(
  rows: readonly TextbookSemanticRow[],
  instruction: string,
): string {
  // Exactly four native card slots. An incomplete last group has writable empty
  // slots, never duplicated terms or invented concepts/relationships/answers.
  const cards = Array.from({ length: 4 }, (_, i) => {
    const row = rows[i];
    return `<div class="tb-bank-map-card tb-bank-map-slot-${i + 1}"${row ? ` data-row-key="${esc(row.rowKey)}"` : ' data-empty-card="true"'}><small>${row ? `C${String(i + 1).padStart(2, "0")}` : "추가 기록"}</small><strong>${row ? label(row.label) : '<span class="tb-bank-field" aria-label="추가 개념 이름"></span>'}</strong><span class="tb-bank-map-cue">정의 · 예</span>${rules(2)}</div>`;
  }).join("");
  return `${note("작성 방법", md(instruction))}<div class="tb-bank-map-canvas"><svg class="tb-bank-map-links" viewBox="0 0 700 500" preserveAspectRatio="none" aria-hidden="true" data-map-organizer="true"><path d="M304 204C282 182 301 128 265 128 M396 204C418 182 399 128 435 128 M304 296C282 318 301 372 265 372 M396 296C418 318 399 372 435 372"/><g><circle cx="265" cy="128" r="3.5"/><circle cx="435" cy="128" r="3.5"/><circle cx="265" cy="372" r="3.5"/><circle cx="435" cy="372" r="3.5"/></g></svg>${cards}<div class="tb-bank-map-center"><svg viewBox="0 0 80 38" aria-hidden="true"><path d="M40 34V15 M40 18C10 22 9 0 28 3C38 4 43 10 40 18 M40 18C44 1 68 0 67 8C63 22 49 22 40 18"/></svg><strong>개념 연결</strong><span>개념 정리</span></div></div><div class="tb-bank-map-response"><h4><i>Q</i>개념 확인</h4><p>직접 설명할 수 있는 개념 사이의 관계를 쓰고, 정의와 예를 근거로 확인하세요.</p>${rules(3)}</div>${status("개념 사이의 관계를 확인한다.")}`;
}

/** Explicit NEW-bank opt-in only: immutable source and legacy writing fall through. */
export function renderBankActivityHtml(
  block: Extract<RenderBlock, { kind: "text" }>,
): string | null {
  const semantic = block.semantic;
  const node = semantic?.node;
  if (!semantic || semantic.source || node?.kind !== "rows") return null;
  const activity = activities.find((value) => value === semantic.activity);
  if (
    !activity ||
    !new RegExp(`^bank-activity\\.v1\\.${activity}\\.\\d+$`).test(
      node.groupKey ?? "",
    )
  )
    return null;
  const limit = activity === "explainActivity" ? 2 : 4;
  if (
    !node.rows.length ||
    node.rows.length > limit ||
    node.rows.some((row) => row.textFormat !== "bank-blank")
  )
    throw new Error("은행 활동의 개념 묶음이 허용 범위를 넘습니다.");
  const content =
    activity === "conceptBlankTest"
      ? freeRecall(block.markdown)
      : activity === "explainActivity"
        ? oral(node.rows)
        : conceptMap(node.rows, block.markdown);
  return `<section class="tb-bank-activity tb-bank-${activity}" data-bank-activity="${activity}" data-bank-activity-version="1" data-group-key="${esc(node.groupKey!)}" data-canonical-row-count="${node.rows.length}">${content}</section>`;
}

export const BANK_ACTIVITY_CSS = `
.tb-bank-activity{display:flex;flex-direction:column;gap:3mm;font-size:8pt;line-height:1.85;color:var(--tb-ink,#293936);width:100%;break-inside:avoid}
.tb-bank-activity .tb-bank-note{display:flex;align-items:baseline;gap:2mm;background:#fbf8ef;border-radius:0 2mm 2mm 2mm;padding:2.3mm 3mm;color:#666453}
.tb-bank-note>strong{flex:none;color:#7a693e;font-size:7.3pt;border-bottom:1.5pt solid #e4cd91;padding-bottom:.3mm}.tb-bank-note>span{min-width:0}.tb-bank-note p{margin:0}
.tb-bank-rules{width:100%;position:relative;z-index:1}.tb-bank-rule{display:block;width:100%;height:7mm;border-bottom:.265mm solid #dfe6d9}
.tb-bank-recall-canvas{position:relative;padding:4mm;border:.265mm solid var(--tb-light);border-top:.565mm solid var(--tb-accent);border-radius:0 5mm 0 0;background:white}
.tb-bank-recall-canvas>small{position:relative;z-index:1;display:block;font-size:7pt;color:var(--tb-accent);margin-bottom:2mm}
.tb-bank-watermark{position:absolute;left:0;right:0;top:65mm;text-align:center;font-size:38pt;font-weight:700;letter-spacing:5px;color:#f3f6f0;line-height:1;z-index:0}
.tb-bank-recall-checks{display:grid;grid-template-columns:1fr 1fr;gap:5mm;border-top:.265mm solid var(--tb-light);padding-top:2mm}.tb-bank-recall-checks>div{display:flex;flex-direction:column}
.tb-bank-status{display:flex;justify-content:space-between;gap:3mm;align-items:baseline;border-top:.265mm solid var(--tb-light);padding-top:2mm;color:var(--tb-accent);font-size:7pt}.tb-bank-status>span{flex:none;white-space:nowrap;font-weight:400;color:#82918e}.tb-bank-field{display:inline-block;vertical-align:baseline;width:28mm;border-bottom:.265mm solid #aabcb9;height:4mm}
.tb-bank-oral-route{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:1mm}.tb-bank-oral-route>span{border-bottom:.265mm solid var(--tb-light);padding-bottom:3mm}.tb-bank-oral-route b{font-size:18pt;color:var(--tb-accent);margin-right:3mm;line-height:1}
.tb-bank-oral-task{border-bottom:.265mm solid var(--tb-light);padding-bottom:3mm}.tb-bank-oral-head{display:flex;gap:3mm;align-items:baseline;margin-bottom:1mm;color:var(--tb-accent)}.tb-bank-oral-head>b{font-size:14pt;line-height:1.2}.tb-bank-oral-head>strong{font-size:10pt;min-width:0}.tb-bank-oral-head>small{flex:none;font-size:7pt;margin-left:auto;background:var(--tb-soft);border-radius:4mm;padding:.3mm 2mm}
.tb-bank-listener{background:var(--tb-soft);padding:1.5mm 3mm;margin-top:2mm}.tb-bank-listener>strong{font-size:7pt;color:var(--tb-accent);margin-right:3mm}.tb-bank-listener .tb-bank-rule{border-color:#bdcec9}
.tb-bank-activity .tb-bank-oral-matrix{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}.tb-bank-activity .tb-bank-oral-matrix th,.tb-bank-activity .tb-bank-oral-matrix td{border:0;border-bottom:.265mm solid var(--tb-light);padding:1.5mm 3mm;text-align:center;font-weight:400}.tb-bank-activity .tb-bank-oral-matrix thead th{background:var(--tb-soft);color:var(--tb-accent);font-size:7pt}.tb-bank-oral-matrix th:first-child{width:65%}.tb-bank-activity .tb-bank-oral-matrix tbody th{text-align:left}
.tb-bank-repair{width:100%}.tb-bank-map-canvas{height:126mm;position:relative;width:100%}.tb-bank-map-links{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.tb-bank-map-links path{fill:none;stroke:#8eafa2;stroke-width:1.3}.tb-bank-map-links circle{fill:white;stroke:#8eafa2;stroke-width:1.3}
.tb-bank-map-card{position:absolute;width:34.3%;height:40mm;border:.265mm solid #b5cdbf;border-top:.6mm solid #a5bd58;border-radius:4mm 10mm 4mm 10mm;padding:3mm 5mm;background:#f8faf5;box-shadow:0 .6mm 0 #dfe7d9;display:flex;flex-direction:column}
.tb-bank-map-slot-1{left:3.57%;top:5%}.tb-bank-map-slot-2{right:3.57%;top:5%}.tb-bank-map-slot-3{left:3.57%;bottom:5%}.tb-bank-map-slot-4{right:3.57%;bottom:5%}
.tb-bank-map-card>small{font-size:7pt;font-weight:700;color:#7d9f47;line-height:1.3;letter-spacing:.7px}.tb-bank-map-card>strong{font-size:10pt;color:var(--tb-accent);line-height:1.35;text-align:center;min-height:9mm;display:flex;justify-content:center;align-items:center;margin-top:1mm}.tb-bank-map-card>strong .katex{font-size:1em}.tb-bank-map-cue{text-align:center;color:#82918e;font-size:7pt;line-height:1.4}.tb-bank-map-card .tb-bank-rules{margin-top:auto}
.tb-bank-map-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:33mm;height:33mm;border-radius:50%;background:var(--tb-accent);border:1.5mm double #89b9a5;outline:.265mm solid var(--tb-accent);display:flex;flex-direction:column;justify-content:center;align-items:center;color:white;gap:1mm}.tb-bank-map-center>svg{height:8mm;width:16mm;fill:none;stroke:#d6ed75;stroke-width:1.5}.tb-bank-map-center>strong{font-size:11pt;line-height:1.3}.tb-bank-map-center>span{font-size:7pt;color:#d6ed75;border-top:.265mm solid #d6ed75;padding-top:1mm}
.tb-bank-map-response h4{display:flex;align-items:center;gap:2mm;color:var(--tb-accent);font-size:10.8pt;margin:0 0 3mm}.tb-bank-map-response h4 i{font-style:normal;color:white;background:var(--tb-accent);width:6.3mm;line-height:6.3mm;text-align:center;border-radius:0 2mm 0 2mm;font-size:8.6pt}.tb-bank-map-response p{margin:0 0 2mm}
`;
