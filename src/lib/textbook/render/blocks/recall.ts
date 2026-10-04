import type { EditorialBlock } from "../editorial";
import { renderTextbookMarkdown as md } from "../markdown";

const recallTextHtml = (markdown: string) =>
  `${/^\s/.test(markdown) ? " " : ""}${md(markdown)}${/\s$/.test(markdown) ? " " : ""}`;

export function renderRecallHtml(
  block: Extract<EditorialBlock, { kind: "recall" }>,
): string {
  const modes = {
    study: ["개념학습", "정의와 성질을 읽고 예를 들어 설명하시오."],
    keywords: ["빈칸개념암기", "빈칸에 알맞은 용어와 식을 쓰시오."],
    sentences: ["통문장개념암기", "책을 보지 않고 각 항목을 문장으로 쓰시오."],
  };
  const introduction = block.continuation
    ? ""
    : `<div class="tb-recall-phases" aria-label="개념 정리 순서">${Object.entries(
        modes,
      )
        .map(
          ([phase, [title]], i) =>
            `<span${phase === block.phase ? ' class="tb-recall-active" aria-current="step"' : ""}>${String(i + 1).padStart(2, "0")} ${title}</span>`,
        )
        .join(
          "",
        )}</div><div class="tb-recall-checkbar"><b>${modes[block.phase][1]}</b><span>이름 __________　날짜 __________</span></div>`;
  return `<section class="tb-recall${block.continuation ? " tb-recall-continuation" : ""}" data-phase="${block.phase}">${introduction}<div class="tb-recall-content">${block.pieces.map((p) => (p.kind === "blank" ? `<span class="tb-blank tb-blank-${p.scope}" role="textbox" aria-label="${p.scope === "sentence" ? "문장으로 개념 쓰기" : "빈칸"}"></span>` : `<div class="tb-recall-text">${recallTextHtml(p.markdown)}</div>`)).join("")}</div>${block.repetitionChecks ? '<div class="tb-repetition" aria-label="학습 반복 확인">1회 ○　2회 ○　3회 ○　4회 ○</div>' : ""}${block.lastPart === false ? "" : `<p class="tb-study-footer">${block.phase === "study" ? "조건과 예를 함께 확인한다." : "이 단원의 개념학습으로 채점한다."}</p>`}</section>`;
}
