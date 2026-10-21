import {
  hasUnlinkedFigureChoices,
  UNLINKED_FIGURE_CHOICES_NOTICE,
} from "@/lib/problem/choiceFigureIndex";
import {
  extractFigureSlots,
  SLOT_TOKEN_CLOSE,
  SLOT_TOKEN_OPEN,
  slottedProblem,
} from "@/lib/problem/figureSlots";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import type { EditorialBlock } from "../editorial";
import { textbookSlotCut } from "../slotCut";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import type { RenderBlock } from "../model";
import { imageHtml, qrHtml, type RenderResources } from "./shared";
import { ANSWER_CASE_GRID_STYLE } from "../answerLayout";
import { dialogueMarkdownHtml, v15DisplayMarkdown } from "./dialogue";
import { fractionChoiceRows } from "./fractionChoiceRows";
import { renderSourceFragments } from "./semantic";

/** 자리표 한 줄(`figureSlots.ts` 가 자리 줄을 바꿔 넣은 것) — 가운데 글자가 자리의 차례다. */
const SLOT_TOKEN_LINE = new RegExp(
  `^${SLOT_TOKEN_OPEN}([\\uE700-\\uE7FF])${SLOT_TOKEN_CLOSE}$`,
);

type PromptPart =
  | { kind: "text"; text: string }
  | { kind: "figures"; items: { index: number; caption: string | null }[] };

/**
 * 그림 자리 `[그림:n]`(D-164 ③④)이 든 본문을 **원문 마크다운 그대로의** 글 조각과 그림 묶음으로 가른다.
 *
 * 어느 자리가 그림으로 서는지는 은행 지면과 **같은 판정**(`slottedProblem`)이다. 교재는 원문을 제 렌더러로 그리므로
 * 파서가 다시 쓴 발문이 아니라 원문 줄을 가른다 — 그림으로 못 서는 자리 줄은 원문 그대로 글로 남는다.
 * 번호는 이 블록의 그림 배열 차례다(`model.ts` 가 스냅샷의 엔진 SVG 자리만큼 옮겨 둔다 — `snapshotSlots.ts`).
 * 자리가 없으면(또는 하나도 그림으로 안 서면) null — 그 문항은 오늘의 바이트 그대로다.
 */
function promptParts(
  content: string,
  figures: readonly { choiceIndex: number | null }[],
): {
  parts: PromptPart[];
  used: ReadonlySet<number>;
  choices: string[];
} | null {
  if (!content.includes("[그림:")) return null;
  const slotted = slottedProblem(
    content,
    figures.length,
    figures.map((figure) => figure.choiceIndex),
    figures.length > 0,
  );
  if (slotted.slots.placed.size === 0) return null;
  // 교재 렌더러는 GFM 까지 읽는다 — 자리가 그 마디(양끝 `|` 없는 표 · 지운 줄 …)를 가르면 원문 그대로(Codex 5차)
  if (textbookSlotCut(content, slotted.marks, slotted.slots.placed))
    return null;
  const parts: PromptPart[] = [];
  let text: string[] = [];
  for (const line of extractFigureSlots(content).content.split("\n")) {
    const token = SLOT_TOKEN_LINE.exec(line);
    const k = token ? token[1]!.charCodeAt(0) - 0xe700 : -1;
    const mark = slotted.marks[k];
    if (!mark || !slotted.slots.placed.has(k)) {
      text.push(mark ? mark.source : line);
      continue;
    }
    // 이어진 자리는 한 묶음 — 사이가 빈 줄뿐이면 이어진 것이다(은행 지면 `layoutFigureSlots` 와 같다)
    const pending = text.join("\n").trim() !== "";
    if (pending) parts.push({ kind: "text", text: text.join("\n") });
    text = [];
    const item = { index: mark.number - 1, caption: mark.caption };
    const last = parts[parts.length - 1];
    if (!pending && last?.kind === "figures") last.items.push(item);
    else parts.push({ kind: "figures", items: [item] });
  }
  if (text.join("\n").trim() !== "")
    parts.push({ kind: "text", text: text.join("\n") });
  return { parts, used: slotted.slots.used, choices: slotted.choices };
}

/**
 * 그림 자리 묶음 — 은행 지면과 같은 꼴(가로로 늘어서 가운데 · 쪽 사이에서 안 갈린다)에 그림마다 캡션을 바로 아래에.
 * 🔴 스타일은 요소에 직접 단다 — 교재 문서의 스타일시트에 규칙을 더하면 자리 없는 교재까지 문서 바이트가 바뀐다.
 */
const SLOT_GROUP_STYLE =
  "display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:4mm;margin:2mm 0;break-inside:avoid";
const SLOT_ITEM_STYLE =
  "margin:0;display:flex;flex-direction:column;align-items:center;max-width:100%;break-inside:avoid";
const SLOT_CAPTION_STYLE = "margin-top:1mm;text-align:center";

export function renderProblemHtml(
  block: Extract<EditorialBlock, { kind: "problem" }>,
  resources: RenderResources,
): string {
  const source = block.semantic?.source;
  const prose = source
    ? (text: string) => dialogueMarkdownHtml(v15DisplayMarkdown(text))
    : md;
  const slotted = promptParts(block.content, block.figures);
  // 보기는 은행 지면과 같은 차례로 읽는다 — 자리 줄의 캡션 «⑴» 이 보기 판정에 섞이지 않게(자리가 없으면 예전 그대로).
  const { choices } = slotted ?? parseProblemContent(block.content);
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
  // Only a new semantic bank problem marks its choice rows; saved legacy and original-source
  // problems keep their bytes.
  const rows = (html: string) =>
    block.semantic && !source ? fractionChoiceRows(html, choices.length) : html;
  const lastText = slotted
    ? slotted.parts.findLastIndex((part) => part.kind === "text")
    : -1;
  const prompt = slotted
    ? slotted.parts
        .map((part, i) =>
          part.kind === "text"
            ? // 보기 줄은 마지막 글 조각에 있다 — 분수 보기 줄 표시는 거기에만(자리는 발문의 것이다)
              i === lastText
              ? rows(prose(part.text))
              : prose(part.text)
            : `<div class="tb-figure-slots" data-figure-slots="" style="${SLOT_GROUP_STYLE}">${part.items
                .map((item) => {
                  const f = block.figures[item.index]!;
                  return `<figure class="tb-problem-figure" data-figure-slot="${item.index + 1}" data-choice-index="${f.choiceIndex ?? "unknown"}" style="${SLOT_ITEM_STYLE}">${imageHtml(resources, f.assetId, f.altText ?? "문제 그림", f.sourceWidthMm ?? undefined)}${item.caption ? `<figcaption style="${SLOT_CAPTION_STYLE}">${prose(item.caption)}</figcaption>` : ""}</figure>`;
                })
                .join("")}</div>`,
        )
        .join("")
    : rows(prose(block.content));
  // 제자리에 그린 그림은 뒤 모음에서 뺀다(은행 지면과 같다).
  const figures = block.figures
    .map((f, index) =>
      slotted?.used.has(index)
        ? ""
        : `<figure class="tb-problem-figure" data-choice-index="${f.choiceIndex ?? "unknown"}">${f.choiceIndex && f.choiceIndex > 0 ? `<span class="tb-choice-label">${f.choiceIndex}번 보기</span>` : ""}${imageHtml(resources, f.assetId, f.altText ?? "문제 그림", f.sourceWidthMm ?? undefined)}</figure>`,
    )
    .join("");
  // Answer variant: an ordinary one-column problem keeps its question in a student column and
  // sets the answer in the column beside it (see answerLayout).
  const beside =
    block.answer !== undefined &&
    (block as RenderBlock & { answerPlacement?: string }).answerPlacement ===
      "beside";
  const answer =
    block.answer !== undefined
      ? `<section class="tb-answer"${beside ? ' style="margin-top:0"' : ""}><h4>정답${block.sourcePageLabel ? ` · 문제 ${esc(block.sourcePageLabel)}쪽` : ""}</h4>${prose(block.answer)}${block.solution !== null && block.solution !== undefined ? `<div>${prose(block.solution)}</div>` : ""}</section>`
      : block.publicWorkedExample
        ? `<section class="tb-worked"><h4>${source ? "풀이" : "함께 풀어 보기 · 풀이"}</h4>${block.publicWorkedExample.solution ? `<div class="tb-worked-solution">${prose(block.publicWorkedExample.solution)}</div>` : ""}<div class="tb-worked-answer"><b>답</b>${prose(block.publicWorkedExample.answer)}</div></section>`
        : "";
  const lines =
    block.answer === undefined && !block.publicWorkedExample
      ? source
        ? (block.sourceWorkLines ?? block.layout.preferredWorkLines)
        : block.layout.preferredWorkLines
      : 0;
  // In a linked group the writer names the solved example; every other member is an unsolved
  // confirmation, whatever stage its parent activity gave it.
  const group =
    block.semantic?.node?.kind === "exampleGroup"
      ? block.semantic.node
      : undefined;
  const role = !group
    ? undefined
    : block.itemId === group.exampleItemId
      ? "example"
      : group.confirmItemIds.includes(block.itemId)
        ? "confirm"
        : undefined;
  const worked = role
    ? role === "example"
    : Boolean(
        block.publicWorkedExample ||
        (block as RenderBlock & { learningStage?: string }).learningStage ===
          "worked-example",
      );
  const qr = block.qr ? qrHtml(resources, block.qr.id, block.qr.url) : "";
  // The QR sits beside the prompt: the ruled space below keeps the full column width.
  const html = `<section class="tb-problem${source ? " tb-source-problem" : ""}${worked ? " tb-problem-worked" : ""}${role === "confirm" ? " tb-problem-confirm" : ""}${block.layout.columnSpan === 2 && !beside ? " tb-problem-wide" : ""}${beside ? " tb-problem-answer-beside" : ""}${qr ? " tb-problem-has-qr" : ""}"${source ? ` data-source-kind="${esc(source.kind)}"` : ""}${worked ? ' aria-label="대표예제"' : ""}${block.semantic ? ` data-activity="${block.semantic.activity}"` : ""}${group && role ? ` data-example-group="${esc(group.groupId)}" data-example-role="${role}"${role === "confirm" ? ` data-confirm-index="${block.exampleConfirmIndex ?? group.confirmItemIds.indexOf(block.itemId)}"` : ""}` : ""}${beside ? ' data-answer-placement="beside"' : ""}>${beside ? `<div class="tb-answer-case" style="${ANSWER_CASE_GRID_STYLE}"><div class="tb-answer-case-question${qr ? " tb-problem-has-qr" : ""}">` : ""}<header class="tb-problem-head" data-anchor="problem-head"><strong>${esc(block.displayNumber)}</strong>${worked ? '<span class="tb-example-label">대표예제</span>' : ""}${role === "confirm" ? '<span class="tb-confirm-label">확인문제</span>' : ""}${block.questionType && !source ? `<span>${esc(block.questionType)}</span>` : ""}</header><div class="tb-problem-main"><div class="tb-problem-body"><div class="tb-problem-question">${figureNotice}<div class="tb-prose">${prompt}</div>${figures}</div>${beside ? "" : answer}</div>${qr}</div>${beside ? `</div>${answer}</div>` : ""}<div class="tb-work-area" style="min-height:${lines * 7}mm"${!lines ? " data-empty-work" : ""}>${lines ? `<div class="tb-work-lines" data-writing-space="work" aria-label="풀이 공간" style="min-height:${lines * 7}mm">${'<div class="tb-work-line"></div>'.repeat(lines)}</div>` : ""}</div></section>`;
  if (!source) return html;
  const allocatedHtml = html
    .replace(/^(<section\s[^>]*)(>)/, (_, opening: string, closing: string) =>
      block.sourceQuestionMinHeightMm === undefined
        ? opening + closing
        : `${opening} style="min-height:${block.sourceQuestionMinHeightMm}mm"${closing}`,
    )
    .replace(
      '<div class="tb-work-area" style="',
      `<div class="tb-work-area" style="${block.sourceWorkMarginTopMm === undefined ? "" : `margin-top:${block.sourceWorkMarginTopMm}mm;`}`,
    );
  const header = block.semantic?.sourceQuestionHeader;
  const headStyle =
    block.sourceQuestionHeadHeightMm === undefined
      ? ""
      : ` style="height:${block.sourceQuestionHeadHeightMm}mm"`;
  let sourceHtml = allocatedHtml.replace(
    /<header class="tb-problem-head" data-anchor="problem-head">([\s\S]*?)<\/header>/,
    (_, contents: string) =>
      `<header class="tb-problem-head" data-anchor="problem-head"${headStyle}>${header ? renderSourceFragments(header, resources) : contents}</header>`,
  );
  if (block.sourceQuestionPromptMinHeightMm !== undefined)
    sourceHtml = sourceHtml.replace(
      '<div class="tb-prose">',
      `<div class="tb-prose" style="min-height:${block.sourceQuestionPromptMinHeightMm}mm">`,
    );
  if (block.sourceQuestionMainMinHeightMm !== undefined)
    sourceHtml = sourceHtml.replace(
      '<div class="tb-problem-main">',
      `<div class="tb-problem-main" style="min-height:${block.sourceQuestionMainMinHeightMm}mm">`,
    );
  return sourceHtml;
}
