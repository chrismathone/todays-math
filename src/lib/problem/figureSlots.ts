/**
 * 본문의 **그림 자리** `[그림:n]` — 그림을 글 사이 그 자리에, 그림마다 바로 아래 캡션과 함께 (D-164 ③④ · 2026-10-21 합의).
 *
 * ## 표기
 *
 * 독립된 한 줄에 `[그림:1]` 또는 `[그림:1] ⑴ (　　　　)`.
 *   · `1` 은 `figureUrls` 의 **1부터 센** 번호다(`[그림:2]` = 둘째 그림). 저장된 본문에서는 끝까지 은행의 `figureUrls`
 *     차례다 — 그림 배열이 달라지는 투영(교재 스냅샷은 엔진 SVG 를 맨 앞에 둔다)은 `renumberFigureSlots` 로 고쳐 쓴다.
 *   · 뒤 글은 그 그림 **바로 아래** 캡션(번호와 그 응답칸)이다. 없으면 그림만 그 자리에. 캡션은 한 줄이다(`captionProblem`).
 *   · 이어진 자리 줄은 한 묶음이 되어 오늘의 그림 묶음처럼 가로로 늘어선다(그림마다 제 캡션을 아래에 단다).
 * 제자리에 그린 그림은 발문 뒤 그림 모음에서 뺀다 — 나머지 그림은 오늘 그대로 글 아래다.
 *
 * ## 🔴 `parseProblemContent` 보다 **먼저** 읽는다 — 글은 «자리 줄을 뺀 같은 문항»의 것
 *
 * 그 파서는 «⑴»을 소문항 표지로 보고 그 앞에서 문단을 가르고(`markSubQuestions`), «(　　)»를 답 칸으로 따로 다루며,
 * 문장부호로 안 끝난 문단을 앞 문단에 붙인다(`keepMeaningfulParagraphs`). 자리 줄이 그대로 들어가면 캡션이 그림과
 * 떨어진다. 그래서 자리 줄을 **자리표**(아래 `slotTokenOf`)로 바꿔 넣는다. 그런데 파서의 판정(상자 · 홑수식 줄 · 문단 잇기 ·
 * 소문항 차례)은 글 전체를 보므로 자리표 하나가 판정을 바꾼다 — 그래서 지면의 글은 **자리 줄을 뺀 같은 문항**을 파서에
 * 넘긴 것이고, 자리표가 든 쪽에서는 그림이 설 **자리**만 읽는다(`readSlots` · `insertSlots`). 조판(`ProblemContent`) ·
 * 넘침 자(`estimateProblemPx`) · 자리 평가(`assessSeat`) · 적재 검사(`checkFigureSlots`) · 교재 렌더가 이 파일의
 * **같은 함수**(`slottedProblem`)를 부른다 — 한쪽만 고치면 높이가 조용히 갈린다(CLAUDE.md 2026-08-18).
 *
 * 🔴 파서(`parseProblemContent.ts` · `boxBlock.ts` …)는 자리표를 모른다 — 그 파일들의 글자가 문항 형식 판정의 지문
 * (`ACTUAL_FORMAT_VERSION`)이라 고치면 운영의 저장된 형식을 다시 채워야 한다. 자리표 둘레의 일은 이 파일이 파서 뒤에서 한다.
 *
 * ## 잘못 적힌 자리는 감추지 않는다
 *
 * 번호가 범위 밖 · 같은 그림을 두 번 · 보기 칸에 들어가는 그림(`choiceFigureMode` 의 짝)인 자리는 그 자리에 **원문 그대로
 * 글로** 남긴다. 자리가 상자 · 보기 안이거나 판정(글 · 상자 · 보기)을 바꾸거나 원문의 인용 · 목록 · 코드 덩어리를 가르면
 * 자리를 **하나도** 세우지 않고 문항을 원문 그대로 읽는다 — 못 푸는 문항이 멀쩡해 보이면 안 된다(`figureMarker.ts` 와
 * 같은 원칙). 수식 · 코드 안의 자리 줄과 캡션 안에 자리 표기가 또 있는 줄은 아예 자리로 안 뽑는다.
 * 까닭은 모두 `problems` 로 낸다 — 적재 도구가 그런 행을 쓰지 않는 근거다(`checkFigureSlots`).
 *
 * ⚠️ 옛 `[그림]` 표지는 이 파일이 안 본다 — 예전 줄바꿈 수리가 옮긴 것이 섞여 있어 자리 근거로 승격하지 않는다(합의 ③).
 *    작업실 원본 문항의 `[그림N]`(쌍점 없음 · `remarkNativeContent`)과도 다른 표기다.
 */

import { choiceFigureMode, type ChoiceFigureMode } from "./choiceFigureIndex";
import { hideFigureMarker } from "./figureMarker";
import katex from "katex";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

import type { Root } from "mdast";

import { formulaLineKinds } from "@/components/math/remarkFormulaLines";
import { remarkEmptyBlockquotes } from "@/components/math/remarkNativeContent";
import { formulaLinePlan } from "@/lib/math/formulaLine";
import { practiceProblemList } from "@/lib/math/practiceProblemLayout";
import { UI_KATEX_OPTIONS } from "@/lib/math/katexRender";
import { preprocessMarkdown } from "@/lib/math/markdownPreprocess";
import {
  formulaExtentEm,
  TALL_FORMULA_EM,
} from "@/lib/textbook/render/blocks/fractionChoiceRows";

import { normalizeOcrText, parseProblemContent } from "./parseProblemContent";

/**
 * 자리표 — 자리 줄을 바꿔 넣는 글자. 사용자 영역 글자(U+E6A0 · U+E700~U+E7FF · U+E6A1)라 정규화 · 수식 자동 감싸기 ·
 * 마크다운에 안 걸린다. 가운데 글자가 자리의 차례(U+E700 + k)다.
 */
export const SLOT_TOKEN_OPEN = "\uE6A0";
export const SLOT_TOKEN_CLOSE = "\uE6A1";
/** 한 문항에 둘 수 있는 자리 수의 상한 — 가운데 글자 범위다. */
const MAX_FIGURE_SLOTS = 256;
const slotTokenOf = (k: number) =>
  `${SLOT_TOKEN_OPEN}${String.fromCharCode(0xe700 + k)}${SLOT_TOKEN_CLOSE}`;

/** 자리 줄 — 앞뒤 빈칸만 허용한다. 줄 가운데의 `[그림:1]` 은 자리가 아니다(글로 남는다). */
export const FIGURE_SLOT_LINE =
  /^[ \t]*\[그림:(\d+)\](?:[ \t]+(\S.*?))?[ \t]*$/;
/** 자리 표기 하나(줄 어디에 있든). */
const ANY_SLOT = /\[그림:\d+\]/;
/** 자리표 하나 — 가운데 글자가 자리의 차례다. */
const TOKEN = new RegExp(
  `${SLOT_TOKEN_OPEN}([\\uE700-\\uE7FF])${SLOT_TOKEN_CLOSE}`,
  "g",
);
const markAt = (code: string) => code.charCodeAt(0) - 0xe700;

export interface FigureSlotMark {
  /** 적힌 번호(1부터). */
  number: number;
  /** 그림 바로 아래 캡션. 없으면 null. */
  caption: string | null;
  /** 원문 줄(앞뒤 빈칸 뺌) — 잘못 적힌 자리를 글로 되돌릴 때 쓴다. */
  source: string;
}

/**
 * 줄마다 «이 줄 머리가 수식 · 코드 안인가» — `$$ … $$` · `\[ … \]`(블록 식) · 줄을 넘는 `$ … $` · `\( … \)` · 코드 울타리
 * (``` · ~~~). `\$` 는 글자 «$» 다. 자리 줄이 그 안에 있으면 뽑지 않는다 — 수식 구분자가 그림 앞뒤 글 조각으로 갈리고,
 * 코드 울타리는 닫는 울타리가 새 여는 울타리가 되어 뒤 본문을 삼킨다(2026-10-21 Codex 검토). 렌더러는 `\[ \]` 를 `$$` 로 읽는다.
 */
function linesInsideMath(lines: readonly string[]): boolean[] {
  let display = false;
  let inline = false;
  let fence: string | null = null;
  return lines.map((raw) => {
    const inside = display || inline || fence !== null;
    // 줄 끝 CR(CRLF 본문)은 줄의 글이 아니다 — 남기면 울타리 줄을 못 알아본다(2026-10-21 Codex 4차).
    const line = raw.replace(/\r$/, "");
    // 코드 울타리(CommonMark): 닫는 울타리는 여는 것과 같은 글자 · 그 이상 길이 · 뒤에 빈칸(공백 · 탭)만이다 — 짧은 울타리 ·
    // «```foo» · 전각 공백이 붙은 울타리는 울타리 안의 글이다(2026-10-21 Codex 3 · 4차 — 네 개짜리 울타리 안의 세 개짜리를
    // 닫힘으로 읽어 뒤 본문이 코드가 됐다).
    const fenceLine = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fenceLine && !display && !inline) {
      const [, run, rest] = fenceLine as unknown as [string, string, string];
      if (fence === null) {
        // 백틱 울타리의 정보 문자열에는 백틱이 못 든다 — 그런 줄은 울타리가 아니다
        if (!(run[0] === "`" && rest.includes("`"))) fence = run;
      } else if (
        run[0] === fence[0] &&
        run.length >= fence.length &&
        /^[ \t]*$/.test(rest)
      )
        fence = null;
      return inside;
    }
    if (fence !== null) return inside;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\\") {
        const next = line[i + 1];
        if (next === "[" && !inline) display = true;
        else if (next === "]" && !inline) display = false;
        else if (next === "(" && !display) inline = true;
        else if (next === ")" && !display) inline = false;
        i += 1;
        continue;
      }
      if (ch !== "$") continue;
      if (line[i + 1] === "$" && !inline) {
        display = !display;
        i += 1;
      } else if (!display) inline = !inline;
    }
    return inside;
  });
}

/**
 * 본문에서 자리 줄을 뽑아 자리표로 바꾼다 — `parseProblemContent` **앞에서** 부른다.
 * 자리 줄이 없으면 본문을 그대로 돌려준다(그 문항의 조판은 한 글자도 안 바뀐다).
 * `skipped` 는 자리처럼 생겼지만 뽑지 않은 줄과 그 까닭이다(검사가 짚는다).
 */
export function extractFigureSlots(content: string): {
  content: string;
  marks: FigureSlotMark[];
  skipped: string[];
} {
  if (!content.includes("[그림:")) return { content, marks: [], skipped: [] };
  const marks: FigureSlotMark[] = [];
  const skipped: string[] = [];
  const lines = content.split("\n");
  const inMath = linesInsideMath(lines);
  const out = lines.map((line, at) => {
    const m = FIGURE_SLOT_LINE.exec(line.replace(/\r$/, ""));
    if (!m) return line;
    const source = line.trim();
    const caption = m[2]?.trim() || null;
    const why = inMath[at]
      ? "수식 · 코드 안의 자리 표기"
      : caption && ANY_SLOT.test(caption)
        ? "한 줄에 자리 표기가 둘 이상"
        : marks.length >= MAX_FIGURE_SLOTS
          ? `자리가 ${MAX_FIGURE_SLOTS}개를 넘는다`
          : null;
    if (why) {
      skipped.push(`${source} — ${why}`);
      return line;
    }
    marks.push({ number: Number(m[1]), caption, source });
    return slotTokenOf(marks.length - 1);
  });
  return { content: out.join("\n"), marks, skipped };
}

export interface FigureSlotItem {
  /** `figureUrls` 의 0부터 센 번호. */
  index: number;
  caption: string | null;
}

export type FigureSlotPart =
  { kind: "text"; text: string } | { kind: "figures"; items: FigureSlotItem[] };

export interface FigureSlotLayout {
  /** 발문을 차례대로 — 글과 그림 묶음. 자리가 없으면 글 하나(발문 그대로)다. */
  parts: FigureSlotPart[];
  /** 제자리에 그린 그림(0부터) — 뒤 그림 모음에서 뺀다. */
  used: ReadonlySet<number>;
  /** 그림으로 세운 자리(`marks` 의 차례) — 원문 마크다운을 그대로 그리는 쪽(교재)이 어느 줄을 바꿀지 안다. */
  placed: ReadonlySet<number>;
  /** 그림으로 못 세우고 글로 남긴 자리의 까닭. */
  problems: string[];
}

/**
 * 파서가 낸 발문(자리표가 든 것)을 글 · 그림 묶음으로 가른다.
 *
 * @param reserved 보기 칸 · 보기 글 아래에 들어가는 그림(0부터) — 발문 자리로 쓰면 같은 그림이 두 번 그려지거나
 *                 보기에서 사라진다(`choiceFigureMode`). 그런 자리는 글로 남긴다.
 */
export function layoutFigureSlots(
  question: string,
  marks: readonly FigureSlotMark[],
  figureCount: number,
  reserved: ReadonlySet<number> = new Set(),
): FigureSlotLayout {
  const used = new Set<number>();
  const placed = new Set<number>();
  if (marks.length === 0 || !question.includes(SLOT_TOKEN_OPEN))
    return {
      parts: [{ kind: "text", text: question }],
      used,
      placed,
      problems: [],
    };

  const problems: string[] = [];
  // ⑴ 그림으로 못 세우는 자리는 그 자리에서 원문 줄로 되돌린다 — 줄 단위로 봐야 상자(`>`) 안인지 안다.
  const checked = question
    .split("\n")
    .map((line) =>
      line.replace(TOKEN, (whole, code: string) => {
        const mark = marks[markAt(code)];
        if (!mark) return whole;
        const index = mark.number - 1;
        const why = line.trimStart().startsWith(">")
          ? "상자 안"
          : mark.number < 1 || mark.number > figureCount
            ? `번호가 범위 밖(그림 ${figureCount}장)`
            : used.has(index)
              ? "같은 그림을 두 번"
              : reserved.has(index)
                ? "보기 그림"
                : null;
        if (why) {
          problems.push(`${mark.source} — ${why}`);
          return mark.source;
        }
        used.add(index);
        placed.add(markAt(code));
        return whole;
      }),
    )
    .join("\n");

  // ⑵ 남은 자리표에서 가른다. 이어진 자리는 한 묶음 — 사이 글이 빈칸뿐이면 이어진 것이다.
  const parts: FigureSlotPart[] = [];
  let last = 0;
  for (const m of checked.matchAll(TOKEN)) {
    const mark = marks[markAt(m[1]!)]!;
    const text = checked.slice(last, m.index).trim();
    const tail = parts[parts.length - 1];
    const item = { index: mark.number - 1, caption: mark.caption };
    if (text) parts.push({ kind: "text", text });
    if (!text && tail?.kind === "figures") tail.items.push(item);
    else parts.push({ kind: "figures", items: [item] });
    last = m.index! + m[0].length;
  }
  const rest = checked.slice(last).trim();
  if (rest) parts.push({ kind: "text", text: rest });
  return { parts, used, placed, problems };
}

/**
 * 보기 쪽이 그리는 그림(0부터) — 발문 자리로 못 쓴다. 갈래는 `choiceFigureMode` 그대로다(`ProblemContent` 머리말 ㉠㉡㉢):
 *   ㉠ grid — 보기 칸 안에 서는 그림 ㉡ loose — 그 보기의 글 아래에 서는 그림 ㉢ none — 없다(그림은 다 발문 쪽이다).
 */
export function choiceReservedFigures(
  mode: ChoiceFigureMode,
  choiceFigureIndex: readonly (number | null)[] | null | undefined,
  figureCount: number,
  choiceCount: number,
): Set<number> {
  if (mode.mode === "grid") return new Set(Object.values(mode.plan.byChoice));
  if (mode.mode === "none" || choiceFigureIndex?.length !== figureCount)
    return new Set();
  const reserved = new Set<number>();
  choiceFigureIndex.forEach((n, i) => {
    if (n !== null && Number.isInteger(n) && n >= 1 && n <= choiceCount)
      reserved.add(i);
  });
  return reserved;
}

/**
 * 캡션이 지면에서 실제로 그려지는 글 — 렌더러(`MathText` → `normalizeOcrText` → `preprocessMarkdown`: HTML 엔티티 풀기 ·
 * 수식 손질 · 줄바꿈 굳히기)와 **같은 전처리**를 거친 줄들이다. 자(`estimateFigureSlotGroupPx`)도 이것으로 센다.
 */
export function captionLines(caption: string): string[] {
  return preprocessMarkdown(normalizeOcrText(caption))
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, "").replace(/\\$/, ""));
}

/** 마크다운 덩어리 — 은행 렌더러(`MarkdownRenderer`)와 같은 파서(`remark-parse` + `remark-math`). */
const markdown = unified().use(remarkParse).use(remarkMath);
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

/** 여러 줄로 서는 식 — 식 안 줄바꿈 · 환경(행렬 · 연립 …). */
const MULTILINE_CAPTION_MATH = /\\\\|\\newline\b|\\begin\{/;

/**
 * 캡션의 식이 한 줄보다 높은가 — 목록으로 막지 않고 **KaTeX 로 그려 잰다**(`\\dbinom` · `\\genfrac` 처럼 목록에서 새는 것이
 * 있었다 — 2026-10-21 Codex 3차). 기준은 교재 분수 보기 줄과 같다(`TALL_FORMULA_EM` — 글 한 줄보다 위아래로 더 나간다).
 * 렌더러가 넘기는 글(전처리 뒤 — 인라인 분수는 `\\dfrac` 로 커진다)을 잰다.
 */
function hasTallMath(shown: string): boolean {
  // 식의 경계는 렌더러와 같은 파서로 — `\$` 는 글자 «$» 다(2026-10-21 Codex 4차: 정규식이 `\$` 를 여는 경계로 잡아
  // 뒤의 겹이항계수를 안 쟀다).
  const formulas: string[] = [];
  const visit = (node: MdNode) => {
    if (node.type === "inlineMath" || node.type === "math")
      formulas.push(node.value ?? "");
    node.children?.forEach(visit);
  };
  visit(markdown.parse(shown) as MdNode);
  for (const formula of formulas) {
    const html = katex.renderToString(formula, {
      ...UI_KATEX_OPTIONS,
      throwOnError: false,
      output: "html",
      displayMode: false,
    });
    const { up, down } = formulaExtentEm(html);
    if (up > TALL_FORMULA_EM.up || down > TALL_FORMULA_EM.down) return true;
  }
  return false;
}

/**
 * 캡션이 지면 한 줄로 그려지는가 — 아니면 그 까닭(없으면 null).
 * 캡션은 그림 칸 아래 한 줄이다. 렌더러의 전처리 뒤에 줄이 둘 이상(글자로 적은 «\n» · `&#10;` 같은 엔티티도 줄을 바꾼다)이거나
 * 블록 식 · 높은 식(겹분수는 한 줄의 세 배를 넘는다)이 들면 자와 지면이 갈린다(2026-10-21 Codex 검토) — 그런 캡션은 쓰지 않는다.
 */
export function captionProblem(caption: string): string | null {
  const shown = preprocessMarkdown(normalizeOcrText(caption));
  if (shown.includes("\n")) return "캡션 안의 줄바꿈";
  if (shown.includes("$$")) return "캡션 안의 블록 식";
  if (MULTILINE_CAPTION_MATH.test(shown) || hasTallMath(shown))
    return "캡션 안의 높은 식";
  return null;
}

/** 인용 줄(`>`) 덩어리 — 파서가 상자를 싣는 꼴(`renderBoxSegment`)이다. 줄 범위 `[start, end)`. */
function quotedRuns(
  lines: readonly string[],
): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  for (let at = 0; at < lines.length; at += 1) {
    if (!lines[at]!.trimStart().startsWith(">")) continue;
    const start = at;
    while (at + 1 < lines.length && lines[at + 1]!.trimStart().startsWith(">"))
      at += 1;
    runs.push({ start, end: at + 1 });
  }
  return runs;
}

/**
 * 상자 **끝에 붙은** 자리표를 상자 바로 뒤로 낸다. 흐름 글의 상자(`<조건>` …)는 끝을 소문항 표지 · 시험지 머리말로 가르는데
 * (`boxBlock.ts` `findBoxStop`), 캡션의 «⑴»을 미리 뽑아 내므로 상자가 끝을 못 만나 뒤의 자리 줄까지 마지막 항목에 잇는다
 * (2026-10-21 Codex 검토 — «<조건> ㄱ. ㄴ.» 뒤의 자리 두 줄). 자리 줄은 상자 안에 설 수 없다(자리 줄은 `>` 로 시작하지
 * 않는다) — 그래서 상자의 **마지막 줄 끝**에 자리표만 붙어 있으면 상자 뒤로 옮긴다. 자리표 뒤에 글이 더 있거나 상자 가운데에
 * 든 자리는 그대로 둔다(→ «상자 안», 그림으로 안 선다). 상자 판정 자체는 파서가 발문 통째로 한 그대로다.
 */
function liftTrailingSlots(question: string): string {
  if (!question.includes(SLOT_TOKEN_OPEN)) return question;
  const lines = question.split("\n");
  for (const { start, end } of quotedRuns(lines).reverse()) {
    const last = end - 1;
    const cut = lines[last]!.indexOf(SLOT_TOKEN_OPEN);
    const tail = cut < 0 ? "" : lines[last]!.slice(cut);
    const first = lines
      .slice(start, end)
      .findIndex((line) => line.includes(SLOT_TOKEN_OPEN));
    if (cut < 0 || start + first !== last || tail.replace(TOKEN, "").trim())
      continue;
    const block = [
      ...lines.slice(start, last),
      lines[last]!.slice(0, cut).trimEnd(),
    ];
    // 자리표만 있던 줄 · 그 앞의 빈 인용 줄(`>`)은 상자에 안 남긴다
    while (block.length && /^\s*>\s*$/.test(block[block.length - 1]!))
      block.pop();
    lines.splice(
      start,
      end - start,
      ...block,
      ...[...tail.matchAll(TOKEN)].map((m) => m[0]),
    );
  }
  return lines.join("\n");
}

/** 자리표만 선 줄을 뺀 본문 — «자리 줄이 없는 같은 문항». */
const withoutSlotLines = (tokenized: string) =>
  tokenized
    .split("\n")
    .filter((line) => !new RegExp(`^${TOKEN.source}$`).test(line))
    .join("\n");

/** 상자 머리의 열 수(`<보기:cols=2>`) — 파서가 항목 폭으로 정한다(`renderBoxSegment`). */
const BOX_COLUMNS = /^(\s*>\s*<[^<>:\s]+):cols=\w+>/;

/**
 * 발문의 상자를 **자리 줄이 없는 같은 문항**의 상자에 맞춘다 — 다르면 null.
 *
 * 상자 수 · 상자마다 줄이 같아야 한다(자리표와 머리의 열 수만 빼고). 열 수는 항목 폭으로 정하므로 끝 항목에 붙었던 자리표가
 * 2열을 1열로 바꿔 놓는다 — 자리표가 없는 상자는 그쪽 줄을 그대로 쓴다(열 수까지 같아진다). 자리표가 남은 상자(상자 가운데의
 * 자리)는 그대로 둔다 — «상자 안» 으로 원문 그대로 글이 된다.
 */
function alignBoxes(question: string, plain: string): string | null {
  const lines = question.split("\n");
  const plainLines = plain.split("\n");
  const ours = quotedRuns(lines);
  const theirs = quotedRuns(plainLines);
  const key = (rows: readonly string[]) =>
    rows
      .map((line) => line.replace(TOKEN, "").trim().replace(BOX_COLUMNS, "$1>"))
      .join("\n");
  if (
    ours.length !== theirs.length ||
    ours.some(
      (run, i) =>
        key(lines.slice(run.start, run.end)) !==
        key(plainLines.slice(theirs[i]!.start, theirs[i]!.end)),
    )
  )
    return null;
  for (let i = ours.length - 1; i >= 0; i -= 1) {
    const run = ours[i]!;
    if (
      lines
        .slice(run.start, run.end)
        .some((line) => line.includes(SLOT_TOKEN_OPEN))
    )
      continue;
    lines.splice(
      run.start,
      run.end - run.start,
      ...plainLines.slice(theirs[i]!.start, theirs[i]!.end),
    );
  }
  return lines.join("\n");
}

/** 줄바꿈 · 띄어쓰기 — 파서가 문단을 세우고 녹이며 바꾸는 글자. 전각 공백(U+3000)은 응답칸의 글자라 안 넣는다. */
const SPACE = /[ \t\n\r\f\v]/;
const visible = (text: string) => text.replace(/[ \t\n\r\f\v]+/g, "");
/** 자리표 하나 — 그 자리에서만 맞춘다(`lastIndex`). */
const TOKEN_AT = new RegExp(TOKEN.source, "y");

/** `at` 이 식(`$ … $` · `$$ … $$`) 안인가 — `\$` 는 글자 «$» 다. */
function insideMath(text: string, at: number): boolean {
  let display = false;
  let inline = false;
  for (let i = 0; i < at; i += 1) {
    if (text[i] === "\\") i += 1;
    else if (text[i] !== "$") continue;
    else if (text[i + 1] === "$" && !inline) {
      display = !display;
      i += 1;
    } else if (!display) inline = !inline;
  }
  return display || inline;
}

/** `[from, to)` 의 앞뒤 줄이 같은 인용 덩어리(`>`)인가 — 사이에 빈 줄이 있으면 덩어리가 끊긴다. */
function insideQuote(text: string, from: number, to: number): boolean {
  if (from === 0 || to >= text.length) return false;
  const lineOf = (i: number) =>
    text.slice(text.lastIndexOf("\n", i - 1) + 1).trimStart();
  return (
    lineOf(from - 1).startsWith(">") &&
    lineOf(to).startsWith(">") &&
    (text.slice(from, to).match(/\n/g) ?? []).length <= 1
  );
}

/**
 * **자리 줄을 뺀 같은 문항**의 발문에 자리표만 끼운다 — 지면의 글은 그 문항과 글자까지 같고, 그림은 자리표가 선 곳에 선다.
 *
 * 파서는 자리표가 든 발문을 그대로 판정하지 않는다 — 홑수식 줄(«마지막의 홑수식»)·문단 잇기·소문항 차례는 글 전체를 보고
 * 정하므로 자리표 하나가 판정을 바꾼다(2026-10-21 Codex 4차: 식 줄 뒤의 자리가 식의 가운데 정렬 · 위 여백을 지웠다). 그래서
 * 자리표가 든 쪽에서는 **자리**만 읽는다 — 자리표 앞에 보이는 글자가 몇 개인가. 같은 수의 글자 뒤가 자리 줄을 뺀 쪽의 자리다.
 * 두 쪽의 보이는 글자(띄어쓰기 · 줄바꿈을 뺀 것)가 다르면 판정이 글자를 바꾼 것이다 — 자리를 안 세운다.
 * 자리는 문단 사이 · 줄 사이 · 띄어쓰기 자리여야 한다(글자 사이 · 식 안 · 인용 덩어리 안은 안 세운다).
 */
function insertSlots(
  withTokens: string,
  plain: string,
): { question: string } | { why: string } {
  if (visible(withTokens.replace(TOKEN, "")) !== visible(plain))
    return {
      why: "그림 자리가 글 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 글이 다르다",
    };
  const groups: { count: number; tokens: string[] }[] = [];
  let count = 0;
  for (let i = 0; i < withTokens.length;) {
    TOKEN_AT.lastIndex = i;
    const token = TOKEN_AT.exec(withTokens);
    if (token) {
      const last = groups[groups.length - 1];
      if (last?.count === count) last.tokens.push(token[0]);
      else groups.push({ count, tokens: [token[0]] });
      i += token[0].length;
      continue;
    }
    if (!SPACE.test(withTokens[i]!)) count += 1;
    i += 1;
  }
  let out = "";
  let from = 0;
  let at = 0;
  let seen = 0;
  for (const group of groups) {
    while (seen < group.count) {
      if (!SPACE.test(plain[at]!)) seen += 1;
      at += 1;
    }
    let end = at;
    while (end < plain.length && SPACE.test(plain[end]!)) end += 1;
    const gap = plain.slice(at, end);
    if (at > 0 && end < plain.length && gap === "")
      return {
        why: "그림 자리가 글자 사이다 — 자리 줄을 뺀 같은 문항에서 앞뒤 글이 붙는다",
      };
    if (insideMath(plain, at)) return { why: "그림 자리가 식 안이다" };
    if (insideQuote(plain, at, end)) return { why: "그림 자리가 상자 안이다" };
    // 문단 사이면 문단 사이 그대로 — 자리를 그림으로 못 세워 원문 글로 되돌릴 때 앞뒤 문단을 잇지 않는다
    const sep =
      at === 0 || end === plain.length || gap.includes("\n\n") ? "\n\n" : "\n";
    out += plain.slice(from, at) + sep + group.tokens.join("\n") + sep;
    from = end;
  }
  return { question: out + plain.slice(from) };
}

/** 자리 경계를 넘어도 되는 마디가 아닌 것 — 까닭에 쓰는 이름. 목록에 없는 마디는 그 갈래 이름 그대로 쓴다. */
const NODE_NAMES: Record<string, string> = {
  blockquote: "인용",
  list: "목록",
  listItem: "목록",
  code: "코드",
  html: "HTML",
  math: "식",
  inlineMath: "식",
  table: "표",
  tableRow: "표",
  tableCell: "표",
  heading: "제목",
  strong: "굵게",
  emphasis: "기울임",
  delete: "지운 줄",
  link: "링크",
  linkReference: "링크",
  footnoteDefinition: "각주",
  paragraph: "덩어리 안 문단",
};

/**
 * 마크다운을 `gaps`(앞 조각과 뒤 조각 사이의 빈칸)에서 잘라 조각마다 그려도 같은가 — 아니면 걸리는 마디의 이름(없으면 null).
 *
 * 자리를 넘어도 되는 마디는 **루트 · 루트 바로 아래 문단 · 글자**뿐이다(문단은 자리에서 둘로 갈려도 뜻이 같다). 굵게 · 기울임 ·
 * 링크 같은 인라인 서식(2026-10-21 Codex 5차 — `**…⏎[그림:1]⏎…**` 의 별표가 드러났다) · Setext 제목 · 인용 · 목록(`>` 없이
 * 이어 쓴 줄도 그 안이다 — 4차) · 코드 · 식 · 표가 자리를 넘으면 조각마다 그린 지면이 다르다. 목록으로 막지 않고 허용
 * 목록으로 본다 — 새 마디가 생겨도 기본은 거절이다.
 */
function markdownSpan(
  tree: MdNode,
  gaps: readonly (readonly [number, number])[],
): string | null {
  const visit = (node: MdNode, parent: MdNode | null): string | null => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    // 자리는 앞 조각과 뒤 조각 사이의 빈칸 `[from, to)` 이다 — 마디가 그 양쪽에 다 걸치면 자리가 그 마디를 가른다
    // (빈칸 안에서 끝나는 마디는 아니다: 전처리가 울타리 줄 끝에 붙인 빈칸까지 코드 마디다)
    if (
      start !== undefined &&
      end !== undefined &&
      gaps.some(([from, to]) => start < from && to < end) &&
      !(
        node.type === "root" ||
        node.type === "text" ||
        (node.type === "paragraph" && parent?.type === "root")
      )
    )
      return NODE_NAMES[node.type] ?? node.type;
    for (const child of node.children ?? []) {
      const hit = visit(child, node);
      if (hit) return hit;
    }
    return null;
  };
  return visit(tree, null);
}

/**
 * 자리 줄이 **원문 마크다운**의 마디를 가르는가 — 가르면 그 까닭(없으면 null).
 *
 * 교재 렌더러는 원문 마크다운을 자리 줄에서 잘라 조각마다 그린다(`textbook/render/blocks/problem.ts`). 자리 줄을 뺀 원문을 읽어
 * 자리 경계가 마디 안이면 자른 쪽이 다르다. `isCut` 이 아닌 자리는 원문 줄 그대로 둔다(그림으로 못 세워 글로 남는 자리).
 * `parse` 는 그 렌더러의 파서다 — 여기(은행 지면과 같은 판정)는 `remark-parse + remark-math`, 교재는 GFM 까지(`textbookSlotCut`).
 */
export function slotMarkdownCut(
  tokenized: string,
  marks: readonly FigureSlotMark[],
  isCut: (k: number) => boolean,
  parse: (text: string) => unknown,
): string | null {
  const kept: string[] = [];
  const cuts: [number, number][] = [];
  let offset = 0;
  for (const line of tokenized.split("\n")) {
    const token = new RegExp(`^${TOKEN.source}$`).exec(line);
    const k = token ? markAt(token[1]!) : -1;
    if (token && isCut(k)) {
      cuts.push([offset, offset]);
      continue;
    }
    const text = token ? (marks[k]?.source ?? line) : line;
    kept.push(text);
    offset += text.length + 1;
  }
  const tree = parse(kept.join("\n")) as MdNode;
  const hit = markdownSpan(tree, cuts);
  if (hit) return `그림 자리가 원문 마크다운의 덩어리를 가른다(${hit})`;
  // 링크 정의는 문서 어디서나 앞의 참조를 바꾼다 — 조각마다 그리면 다른 조각의 정의를 못 쓴다
  const definitions = (node: MdNode): boolean =>
    node.type === "definition" ||
    node.type === "footnoteDefinition" ||
    (node.children ?? []).some(definitions);
  return definitions(tree)
    ? "그림 자리가 든 원문에 링크 · 각주 정의가 있다"
    : null;
}

/** 은행 지면이 발문 조각을 마크다운으로 읽는 글 — `ProblemContent` 는 발문을 `MarkdownRenderer`(`preprocessMarkdown`)에 바로 넘긴다. */
const shownOf = (text: string) => preprocessMarkdown(text);
/** 은행 지면의 remark 단계(`MarkdownRenderer` 의 `REMARK_PLUGINS` — 식 줄 플러그인은 아래에서 같은 함수로 따로 센다). */
const paperMarkdown = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkEmptyBlockquotes);
const paperTree = (shown: string) =>
  paperMarkdown.runSync(paperMarkdown.parse(shown)) as unknown as MdNode;

/** 마디의 꼴 — 자리(위치)는 빼고 갈래 · 값(빈칸은 한 칸으로) · 그 밖의 속성 · 아이들. */
function shape(node: MdNode): unknown {
  const fields = Object.entries(node as unknown as Record<string, unknown>)
    .filter(
      ([key, value]) =>
        key !== "position" &&
        key !== "children" &&
        key !== "data" &&
        (typeof value !== "object" || value === null),
    )
    .map(([key, value]) =>
      key === "value" && typeof value === "string"
        ? [key, value.replace(/\s+/g, " ")]
        : [key, value],
    )
    .sort(([a], [b]) => String(a).localeCompare(String(b)));
  return [fields, (node.children ?? []).map(shape)];
}

/** 자리에서 둘로 갈린 문단을 견주는 꼴 — 줄바꿈 마디는 빈칸으로, 이웃한 글은 하나로, 빈칸은 한 칸으로. */
function inlineShape(paragraphs: readonly MdNode[]): string {
  const flat: MdNode[] = [];
  paragraphs.forEach((paragraph, i) => {
    if (i > 0) flat.push({ type: "text", value: " " });
    for (const child of paragraph.children ?? [])
      flat.push(child.type === "break" ? { type: "text", value: " " } : child);
  });
  const merged: MdNode[] = [];
  for (const node of flat) {
    const last = merged[merged.length - 1];
    if (node.type === "text" && last?.type === "text")
      merged[merged.length - 1] = {
        type: "text",
        value: `${last.value ?? ""}${node.value ?? ""}`,
      };
    else merged.push(node);
  }
  return JSON.stringify(
    merged.map((node, i) => {
      if (node.type !== "text") return shape(node);
      let value = (node.value ?? "").replace(/\s+/g, " ");
      if (i === 0) value = value.trimStart();
      if (i === merged.length - 1) value = value.trimEnd();
      return shape({ type: "text", value });
    }),
  );
}

/**
 * 조각마다 읽은 나무들을 이으면 통째로 읽은 나무와 같은가 — 루트 바로 아래 마디가 차례대로 같고, 다른 것은 자리에서 둘로
 * 갈린 문단(앞 조각의 끝 문단 + 뒤 조각의 첫 문단)뿐이어야 한다(2026-10-21 Codex 7차: 조각 첫머리의 `# 물음` · `- 항목` ·
 * `> 인용` 이 통째로는 글인데 조각에서는 제목 · 목록 · 인용이 됐다 — «넘는 마디»만 보면 «새로 생기는 마디»를 놓친다).
 */
function sameTrees(whole: MdNode, pieces: readonly MdNode[]): boolean {
  const seq = pieces.flatMap((tree) =>
    (tree.children ?? []).map((node, i, all) => ({
      node,
      first: i === 0,
      last: i === all.length - 1,
    })),
  );
  let k = 0;
  for (const node of whole.children ?? []) {
    const at = seq[k];
    if (!at) return false;
    if (JSON.stringify(shape(node)) === JSON.stringify(shape(at.node))) {
      k += 1;
      continue;
    }
    if (node.type !== "paragraph" || at.node.type !== "paragraph" || !at.last)
      return false;
    const parts = [at.node];
    k += 1;
    const want = inlineShape([node]);
    while (
      inlineShape(parts) !== want &&
      seq[k]?.first &&
      seq[k]!.node.type === "paragraph" &&
      seq[k - 1]!.last
    ) {
      parts.push(seq[k]!.node);
      k += 1;
    }
    if (inlineShape(parts) !== want) return false;
  }
  return k === seq.length;
}

/** 식 문단과 그 식 줄 표지 — 지면 플러그인(`remarkFormulaLines`)과 같은 함수로 센 것. */
function formulaMarks(tree: MdNode, shown: string): string[] {
  const kinds = formulaLineKinds(tree as unknown as Root, shown);
  const plan = formulaLinePlan(kinds);
  return (tree.children ?? []).flatMap((node, i) =>
    kinds[i] === "formula"
      ? [`${plan[i] ? "줄" : "글"}:${JSON.stringify(shape(node))}`]
      : [],
  );
}

/** 연습 화면(`PracticeProblemText`)의 «도입 + 식 목록» 판정이 통째와 조각마다가 같은가. */
function samePracticeList(whole: string, pieces: readonly string[]): boolean {
  const all = practiceProblemList(whole);
  const each = pieces.map(practiceProblemList);
  if (!all) return each.every((list) => !list);
  // 식 목록은 발문 끝에 있다 — 마지막 조각이 같은 목록이고, 그 앞 조각들은 도입의 글이어야 한다
  const last = each[each.length - 1];
  return (
    !!last &&
    each.slice(0, -1).every((list) => !list) &&
    JSON.stringify(last.items) === JSON.stringify(all.items) &&
    last.compact === all.compact
  );
}

/**
 * 은행 지면은 발문을 자리에서 잘라 **조각마다** 그린다(`ProblemContent` → `MarkdownRenderer`). 그 지면이 자리 줄을 뺀 같은 문항을
 * 통째로 그린 것과 같은가 — 아니면 까닭(없으면 null). 2026-10-21 Codex 6 · 7차: 전처리(엔티티 풀기 · 수식 자동 감싸기)는 조각마다
 * 돌고, 식 줄 표지는 앞 문단을 보고, 조각 첫머리에서는 새 마디(제목 · 목록 · 인용)가 생기고, 연습 화면은 끝의 식 목록을 본다.
 * ㉮ 조각마다 전처리한 글이 통째로 전처리한 글 안에 차례대로 · 사이엔 빈칸만(전처리가 자리에서 갈리지 않는다)
 * ㉯ 그 글을 은행 렌더러의 remark 단계로 읽은 나무가 통째와 조각마다가 같다(`sameTrees` — 자리에서 갈린 문단만 허용) ·
 *    링크 정의가 없다(조각 밖의 정의는 못 쓴다)
 * ㉰ 식 문단의 식 줄 표지가 같다(지면 플러그인과 같은 `formulaLineKinds`) — 식 바로 앞의 자리는 안 세운다
 * ㉱ 연습 화면의 «도입 + 식 목록» 판정이 같다.
 */
function splitPaperProblem(question: string, plain: string): string | null {
  const pieces = question
    .split(TOKEN)
    .filter((_, i) => i % 2 === 0)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const whole = shownOf(plain);
  const shownPieces = pieces.map(shownOf);
  let at = 0;
  for (const piece of shownPieces) {
    const found = whole.indexOf(piece, at);
    if (found < 0 || whole.slice(at, found).trim() !== "")
      return "그림 자리가 지면 글의 전처리를 바꾼다 — 자리 줄을 뺀 같은 문항과 조각마다 전처리한 글이 다르다";
    at = found + piece.length;
  }
  if (whole.slice(at).trim() !== "")
    return "그림 자리가 지면 글의 전처리를 바꾼다 — 자리 줄을 뺀 같은 문항과 조각마다 전처리한 글이 다르다";
  const tree = paperTree(whole);
  const trees = shownPieces.map(paperTree);
  const definitions = (node: MdNode): boolean =>
    node.type === "definition" || (node.children ?? []).some(definitions);
  if (definitions(tree)) return "그림 자리가 든 글에 링크 정의가 있다";
  if (!sameTrees(tree, trees))
    return "그림 자리가 지면 글의 마크다운 나무를 바꾼다 — 조각마다 읽은 마디가 자리 줄을 뺀 같은 문항과 다르다";
  if (
    JSON.stringify(formulaMarks(tree, whole)) !==
    JSON.stringify(
      trees.flatMap((piece, i) => formulaMarks(piece, shownPieces[i]!)),
    )
  )
    return "그림 자리가 식 줄 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 식 문단의 가운데 줄이 다르다";
  if (!samePracticeList(plain, pieces))
    return "그림 자리가 연습 화면의 식 목록 판정을 바꾼다";
  return null;
}

/**
 * 자리표가 든 본문을 읽어 **자리 줄을 뺀 같은 문항**의 발문 · 보기에 자리표를 끼운다. 못 끼우면 그 까닭들.
 *
 * ㉠ 자리표는 파서를 지나 정확히 한 번 ㉡ 보기 안에 들지 않는다 ㉢ 보기는 자리 줄을 뺀 같은 문항과 같다
 * ㉣ 상자는 자리 줄을 뺀 같은 문항과 같다(끝 항목에 붙은 자리표는 상자 뒤로 · 열 수는 그쪽 그대로) · 자리는 상자 밖
 * ㉤ 글은 자리 줄을 뺀 같은 문항 그대로 — 자리표는 같은 수의 보이는 글자 뒤에 ㉥ 원문 마크다운의 마디를 안 가른다
 * ㉦ 조각마다 그린 지면이 통째로 그린 것과 같다(전처리 · 마크다운 마디 · 식 줄 표지 — `splitPaperProblem`).
 */
function readSlots(
  tokenized: string,
  marks: readonly FigureSlotMark[],
  hasFigure: boolean,
): { question: string; choices: string[] } | { why: string[] } {
  const withSlots = parseProblemContent(tokenized);
  const plain = parseProblemContent(withoutSlotLines(tokenized));
  const seen = new Map<number, number>();
  for (const text of [withSlots.question, ...withSlots.choices])
    for (const m of text.matchAll(TOKEN))
      seen.set(markAt(m[1]!), (seen.get(markAt(m[1]!)) ?? 0) + 1);
  const lost = marks.flatMap((mark, k) => {
    const n = seen.get(k) ?? 0;
    return n === 1
      ? []
      : [
          `${mark.source} — ${n === 0 ? "자리표가 파서에서 사라졌다" : "자리표가 둘 이상"}`,
        ];
  });
  if (lost.length) return { why: lost };
  const inChoice = withSlots.choices.flatMap((choice, i) =>
    choice.includes(SLOT_TOKEN_OPEN) ? [`${i + 1}번 보기 안의 자리`] : [],
  );
  if (inChoice.length) return { why: inChoice };
  if (JSON.stringify(withSlots.choices) !== JSON.stringify(plain.choices))
    return {
      why: [
        "그림 자리가 보기 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 보기가 다르다",
      ],
    };
  const aligned = alignBoxes(
    liftTrailingSlots(withSlots.question),
    plain.question,
  );
  if (aligned === null)
    return {
      why: [
        "그림 자리가 상자 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 상자가 다르다",
      ],
    };
  const lines = aligned.split("\n");
  const boxed = quotedRuns(lines).flatMap(({ start, end }) =>
    lines
      .slice(start, end)
      .flatMap((line) => [...line.matchAll(TOKEN)])
      .map((m) => `${marks[markAt(m[1]!)]!.source} — 상자 안`),
  );
  if (boxed.length) return { why: boxed };
  const placed = insertSlots(aligned, plain.question);
  if ("why" in placed) return { why: [placed.why] };
  const cut = slotMarkdownCut(
    tokenized,
    marks,
    () => true,
    (text) => markdown.parse(text),
  );
  if (cut) return { why: [cut] };
  const paper = splitPaperProblem(
    hideFigureMarker(placed.question, hasFigure),
    hideFigureMarker(plain.question, hasFigure),
  );
  if (paper) return { why: [paper] };
  return { question: placed.question, choices: plain.choices };
}

export interface SlottedProblem {
  /** `[그림]` 자국을 가린 발문(자리표가 든 것 — `slots` 가 가른다). */
  question: string;
  /** 보기. */
  choices: string[];
  figureMode: ChoiceFigureMode;
  slots: FigureSlotLayout;
  /** 자리 줄에서 뽑은 자리(원문 차례). */
  marks: readonly FigureSlotMark[];
  /** 자리를 그림으로 못 세운 까닭 · 자리처럼 생겼지만 안 뽑은 줄 · 캡션 문제 — 발문 · 보기 다. */
  problems: string[];
}

/**
 * 문항 하나를 지면이 그리는 차례대로 읽는다 — **조판(`ProblemContent`) · 넘침 자(`estimateProblemPx`) ·
 * 자리 평가(`assessSeat`) · 적재 도구의 검사(`checkFigureSlots`) · 교재 렌더가 같이 부르는 한 곳.**
 * 차례: 자리 줄 뽑기 → 자리 읽기(`readSlots` — 발문 · 보기는 **자리 줄을 뺀 같은 문항**의 것) → `[그림]` 자국 가리기
 * (`hideFigureMarker` — 그림이 있을 때만) → 보기 그림 짝의 갈래(`choiceFigureMode`) → 발문 자리 배치.
 * 자리 줄이 없는 문항은 오늘과 같은 값이 나온다(발문 · 보기 · 갈래가 한 글자도 안 바뀐다).
 * 자리를 못 읽으면(까닭은 `problems`) 자리를 하나도 세우지 않고 **원문 그대로** 읽는다 — 자리 줄은 글로 남고 그림은 오늘처럼
 * 글 아래다. 틀린 지면을 조용히 내지 않는다.
 */
export function slottedProblem(
  content: string,
  figureCount: number,
  choiceFigureIndex: readonly (number | null)[] | null | undefined,
  hasFigure: boolean,
): SlottedProblem {
  const slotted = extractFigureSlots(content);
  const problems: string[] = [...slotted.skipped];
  const read = slotted.marks.length
    ? readSlots(slotted.content, slotted.marks, hasFigure)
    : parseProblemContent(content);
  const plain = "why" in read ? parseProblemContent(content) : read;
  if ("why" in read) problems.push(...read.why);
  const marks = "why" in read ? [] : slotted.marks;
  for (const mark of marks) {
    const caption = mark.caption ? captionProblem(mark.caption) : null;
    if (caption) problems.push(`${mark.source} — ${caption}`);
  }
  const figureMode = choiceFigureMode(
    figureCount,
    choiceFigureIndex,
    plain.choices,
  );
  const question = hideFigureMarker(plain.question, hasFigure);
  const slots = layoutFigureSlots(
    question,
    marks,
    figureCount,
    choiceReservedFigures(
      figureMode,
      choiceFigureIndex,
      figureCount,
      plain.choices.length,
    ),
  );
  return {
    question,
    choices: plain.choices,
    figureMode,
    slots,
    marks: slotted.marks,
    problems: [...slots.problems, ...problems],
  };
}

/**
 * 이 문항의 자리가 다 그림으로 서는가 — 적재 도구가 **쓰기 전에** 본다(조판과 같은 함수를 부른다).
 * 빈 배열이면 자리마다 그림이 그 자리에 선다. 까닭이 하나라도 있으면 그 행은 쓰지 않는다.
 * 🔴 그림 속에 이미 찍힌 번호와 캡션 번호가 겹치는지는 여기서 못 본다 — 행마다 그림을 보고 대응을 확인한다(합의 ④).
 */
export function checkFigureSlots(
  content: string,
  figureCount: number,
  choiceFigureIndex: readonly (number | null)[] | null | undefined,
): string[] {
  const { problems } = slottedProblem(
    content,
    figureCount,
    choiceFigureIndex,
    figureCount > 0,
  );
  for (const line of content.split("\n"))
    if (ANY_SLOT.test(line) && !FIGURE_SLOT_LINE.test(line.replace(/\r$/, "")))
      problems.push(`줄 가운데의 자리 표기: ${line.trim()}`);
  return problems;
}

/**
 * 자리 번호를 고쳐 쓴다 — 그림 배열이 은행의 `figureUrls` 와 다른 **투영**(교재 스냅샷 · 학생 QR · 인쇄본)에서만.
 * 교재 스냅샷은 엔진 SVG 를 그림 배열 맨 앞에 둔다(`snapshotFromProblem.ts`) — 그대로 넘기면 `[그림:1]` 이 첫 스캔 그림이
 * 아니라 SVG 를 가리킨다(2026-10-21 Codex 검토). `map` 은 은행 번호(1부터) → 이 투영의 번호(1부터, 모르면 null)다.
 * 모르는 번호 · 자리가 아닌 줄은 그대로 둔다(그러면 범위 밖 자리로 글이 된다 — 감추지 않는다). 저장된 본문 · 해시는 안 바꾼다.
 */
export function renumberFigureSlots(
  content: string,
  map: (bankNumber: number) => number | null,
): string {
  if (!content.includes("[그림:")) return content;
  const lines = content.split("\n");
  const inMath = linesInsideMath(lines);
  return lines
    .map((line, at) => {
      const m = FIGURE_SLOT_LINE.exec(line.replace(/\r$/, ""));
      if (!m || inMath[at] || (m[2] && ANY_SLOT.test(m[2]))) return line;
      const next = map(Number(m[1]));
      return next === null
        ? line
        : line.replace(/\[그림:\d+\]/, `[그림:${next}]`);
    })
    .join("\n");
}
