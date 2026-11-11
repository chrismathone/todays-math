// Ported from D:/mathg-gen at 9b52813: src/lib/blocksToMarkdown.ts; source remains read-only.
/**
 * typed-block(`contents` + `choices`) → markdown 직렬화기.
 *
 * **역할 (옵션 B)**: OCR 이 네이티브 typed-block 을 emit 하고 블록을 정전으로 두되,
 * 기존 렌더(`MarkdownRenderer`)·해설(`solutions`)·변형(`variants`)·인쇄·파싱
 * (`problemAdapter`)은 *markdown 문자열*을 소비한다. 이 직렬화기가 블록 →
 * 기존 `text` 와 *동일한 형식* 의 markdown 을 만들어 그 소비자들을 무변경으로 유지한다.
 *
 * **round-trip 계약 (CRITICAL)**: 출력 markdown 은
 *   - `problemAdapter.extractChoices` 가 끝의 `①…⑤` 한 줄을 정확히 5 보기로 분리하고,
 *   - `problemAdapter.stripChoicesLine` 이 첫 ①②③④⑤ 줄부터 제거해 본문만 남기고,
 *   - `MarkdownRenderer` 가 inline `$…$`/블록 `$$…$$`/GFM 표/`> ` 박스/`[그림N]`/inline `<svg>` 를
 *     기존과 동일하게 렌더
 * 하도록 형식을 *기존 OCR markdown 과 맞춘다*. (이 계약이 깨지면 보기 grid·박스·도형이 깨짐.)
 *
 * **박스 매핑**: 블록은 testchange 네이티브 라벨 `<보기>`/`<조건>`/`<상자>` 를 쓴다
 * (PR3 에서 커넥터가 그대로 박스 렌더). 웹은 여기서 blockquote(`> `)로 변환해 동일 렌더.
 */

import type { ContentBlock, ChoiceGroup, SubQuestion } from "./contracts";
import { boxHeaderMarkdown, type BoxColumns } from "@/lib/math/boxHeader";
import {
  hasGeometryContext,
  type NBlock,
  normalizeChoiceGroups,
  normalizeContents,
} from "./contentParser";

/** 보기 마커 ①..⑩. */
const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

/**
 * 박스 라벨 prefix (testchange 네이티브 표기). 인식이 원본 박스의 열 배치를 머리에 적으면
 * `<보기:cols=2>` 다(트랙 46) — 그 열 수는 인용 상자 머리로 그대로 옮긴다(`boxHeaderMarkdown`).
 */
const BOX_MARKER_RE = /^<(보기|조건|상자)(?::cols=([1-3]))?>/;

const isBoxText = (b: ContentBlock): boolean =>
  b.type === "text" && BOX_MARKER_RE.test(b.value.trimStart());

/**
 * 모델이 이야기/지문 본문에 raw `> ` (markdown blockquote 마커) 를 붙여 emit 한 경우
 * (서답형 독수리 사례 — OCR 모델 오류). `<보기>`(`<` 시작) 박스와 구분 — 줄머리 `>` 로
 * 시작하는 순수 blockquote 텍스트만. 이런 블록은 인라인 join 하면 직전 블록과 붙어 `>` 가
 * 줄 중간으로 가 `&gt;` 로 노출 + 다음 블록이 박스로 끌려가므로, 블록레벨로 분리한다.
 */
const isRawBlockquote = (b: ContentBlock): boolean =>
  b.type === "text" && /^\s*>\s/.test(b.value);

const isSvgText = (b: ContentBlock): boolean =>
  b.type === "text" && b.value.trimStart().toLowerCase().startsWith("<svg");

/** 표 셀이 명백한 LaTeX(백슬래시·위첨자·아래첨자·중괄호)면 `$…$` 로 감싸 KaTeX 렌더. */
const needsMathWrap = (cell: string): boolean => /[\\^_{}]/.test(cell);

/** 수·문자·연산 기호·괄호만 든 칸 — 한글이나 다른 글자가 하나라도 있으면 아니다. */
const BARE_MATH_CELL = /^[0-9A-Za-z\s+\-−×÷·*/=<>≤≥().,:%]+$/;
/** `1,000` · `12,345,678` — 수식 안의 쉼표는 뒤가 벌어진다(`{,}` 로 적어야 붙는다). */
const THOUSANDS = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

/**
 * LaTeX 표지는 없지만 **수식으로 서야 하는** 칸 — `0` · `15` · `a` · `2x+1` · `(0, 15)`.
 *
 * 인식은 표를 `rows: string[][]` 로 주고 칸에 `$` 를 안 붙인다. 발문은 수를 전부 수식으로 적으므로
 * (`$1$시간마다`) 표의 수만 보통 글자로 서면 한 문항 안에서 글꼴이 갈린다(원장님 2026-09-21).
 * 글자가 **둘 이상 이어지면** 낱말·단위다(`cm` · `kg` · `sin` · `AB`) — 감싸면 c·m 기울임으로 서므로 그대로 둔다.
 */
const isBareMath = (cell: string): boolean =>
  BARE_MATH_CELL.test(cell) &&
  /[0-9A-Za-z]/.test(cell) &&
  !/[A-Za-z]{2,}/.test(cell);

/** 한글 설명은 셀의 일반 글자로, 수식은 별도 토큰으로 둔다. TeX 인수 안의 글은 건드리지 않는다. */
const mixedTableCell = (cell: string): string | undefined => {
  // 환경·짝 구분자·첨자 중간을 끊으면 수식 구조가 달라진다.
  if (/\\(?:begin|end|left|right)\b|[_^]\s*[가-힣]/.test(cell))
    return undefined;
  let depth = 0;
  let start = 0;
  let result = "";
  const math = (value: string) => {
    const inner = value.trim();
    if (!inner) return value;
    const wrapped = needsMathWrap(inner)
      ? `$${inner}$`
      : isBareMath(inner)
        ? tableCellMath(inner)
        : inner;
    return value.replace(inner, () => wrapped);
  };
  for (let i = 0; i < cell.length; i++) {
    if (cell[i] === "\\") {
      i++;
      continue;
    }
    if (cell[i] === "{") depth++;
    else if (cell[i] === "}") depth--;
    else if (depth === 0 && /[가-힣]/.test(cell[i]!)) {
      const prose = cell.slice(i).match(/^[가-힣]+(?:[ \t]+[가-힣]+)*/)![0];
      result += math(cell.slice(start, i)) + prose;
      i += prose.length - 1;
      start = i + 1;
    }
  }
  return start > 0 ? result + math(cell.slice(start)) : undefined;
};

/**
 * 인식한 표의 칸 하나 → 그 칸의 글(수식이면 `$…$` 로 감싼). 검수 카드·편집기(`tableToGfm`)와 지면(`NativeProblem`)이
 * **같이** 쓴다 — 전에는 같은 판정(`[\\^_{}]`)이 두 파일에 따로 있었다.
 */
export const tableCellMath = (raw: string): string => {
  const cell = (raw ?? "").trim();
  if (!cell || cell.includes("$")) return cell;
  if (needsMathWrap(cell)) return mixedTableCell(cell) ?? `$${cell}$`;
  if (!isBareMath(cell)) return cell;
  const grouped = THOUSANDS.test(cell) ? cell.replace(/,/g, "{,}") : cell;
  return `$${grouped.replace(/%/g, "\\%")}$`;
};

/** GFM 표의 칸 — 셀 구분자(`|`)와 충돌하지 않게 피한다(절댓값 |x|·집합표기 {x | ...} 셀이 표를 깨뜨림). */
export const tableCellMarkdown = (raw: string): string =>
  tableCellMath(raw).replace(/\|/g, "\\|");

/** 2D 셀 배열 → GFM 표 markdown. rows[0] = 헤더 행. */
const tableToGfm = (rows: string[][]): string => {
  const safe = (rows ?? []).filter((r) => Array.isArray(r));
  if (safe.length === 0) return "";
  const cols = Math.max(...safe.map((r) => r.length));
  const padRow = (r: string[]): string => {
    const cells = r.map(tableCellMarkdown);
    while (cells.length < cols) cells.push("");
    return `| ${cells.join(" | ")} |`;
  };
  const header = padRow(safe[0]);
  const sep = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
  const body = safe.slice(1).map(padRow);
  return [header, sep, ...body].join("\n");
};

/**
 * `<보기>/<조건>/<상자>` 박스 텍스트 → blockquote(`> `). 항목 구분자 "•" 는 줄 분리.
 *
 * 보기·조건 박스는 라벨 헤더(`> <보기>`)를 *보존* 한다 — sanitizeText 가 `<`/`>` 를
 * `&lt;`/`&gt;` 로 escape 하고(CLAUDE.md §2-5), MarkdownRenderer 의
 * wrapBareConditionBoxes(COND_BOX_HEADER_RE) 가 그 헤더로 박스를 인식해 `<보기>` 제목 +
 * 다단 grid 로 렌더한다(OLD markdown 경로와 동일). 라벨을 strip 하면 헤더·grid 가
 * 사라지는 회귀라 반드시 유지. `<상자>`(라벨 없는 박스)는 헤더 없이 prose 만 — 일반
 * 테두리 박스로 렌더되며 "상자" 리터럴은 노출하지 않는다.
 */
const boxToBlockquote = (value: string): string => {
  let v = value.trim();
  let kind = ""; // "보기" | "조건" | "상자"
  let cols: BoxColumns | null = null;
  const marker = BOX_MARKER_RE.exec(v);
  if (marker) {
    kind = marker[1]!;
    cols = marker[2] ? (Number(marker[2]) as BoxColumns) : null;
    v = v.slice(marker[0].length).trim();
  }
  const items = v
    .split(/\s*(?=•)/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lines = items.length > 0 ? items : v ? [v] : [];
  // Separate the label/items as paragraphs, retaining source bullets and keeping
  // every continuation inside the quote (also consumed by score placement).
  const body = lines.map((line) =>
    line
      .split(/\r?\n/)
      .map((part) => `> ${part}`)
      .join("\n"),
  );
  // 보기·조건 만 라벨 헤더 보존(렌더러가 보기/조건 헤더만 인식). 상자·기타는 헤더 없음.
  if (kind === "보기" || kind === "조건") {
    return [`> ${boxHeaderMarkdown(kind, cols)}`, ...body].join("\n>\n");
  }
  return body.join("\n>\n");
};

/** 인라인 직렬화 (문장 내 / 보기 내) — text 는 그대로, 수식은 `$…$`. */
const inlinePiece = (b: ContentBlock): string => {
  if (b.type === "equation" || b.type === "equation_block") {
    // 모델이 contract 위반해 이미 $-wrap 한 경우 이중 래핑 방지 (KaTeX 깨짐).
    const v = b.value
      .trim()
      .replace(/^\$+|\$+$/g, "")
      .trim();
    return v ? `$${v}$` : "";
  }
  if (b.type === "table") return inlineTable(b.rows ?? []);
  return b.value;
};

/**
 * 보기 안에 든 표 — 한 줄 글로 푼다. 칸은 표의 칸과 같은 규칙(`tableCellMath`)으로 수식을 감싼다.
 *
 * 전에는 «드물다»며 칸을 공백으로 이어 붙이기만 해서 `\angle \mathrm{ABE}` 가 화면에 날것으로 찍혔다(원장님 2026-09-21).
 * 이 모양은 «(가)·(나)·(다) 에 알맞은 것» 을 고르는 **보기 표**에서 온다 — 인식은 보기마다 머리행 + 값행 두 줄짜리 표를 준다.
 * 그 두 줄은 짝지어 «(가) …, (나) …, (다) …» 로 적는다(머리행을 보기마다 따로 늘어놓지 않는다). 짝이 안 맞으면 칸을 차례로.
 */
const inlineTable = (rows: string[][]): string => {
  const cells = rows
    .filter((row) => Array.isArray(row))
    .map((row) => row.map(tableCellMath));
  const [head, values] = cells;
  if (
    cells.length === 2 &&
    head!.length === values!.length &&
    head!.every(Boolean) &&
    values!.some(Boolean)
  )
    return head!
      .map((label, index) => `${label} ${values![index]}`.trim())
      .join(", ");
  return cells.flat().filter(Boolean).join(" ").trim();
};

/**
 * 인라인 조각 잇기 — 맞닿은 두 인라인 수식 사이에는 빈칸 하나를 둔다. `$s,$` 뒤에 `$t$` 를 그대로 붙이면
 * `$s,$$t$` 의 `$$` 가 가운데 수식의 여닫이로 읽혀 그 뒤의 짝이 통째로 어긋난다(원장님 2026-11-11 «15번
 * 문제 이상하게 됨» — 수식 사이의 빈칸 조각이 정규화에서 빠진 탓).
 */
const joinInline = (left: string, piece: string): string =>
  left.endsWith("$") && piece.startsWith("$")
    ? `${left} ${piece}`
    : left + piece;

const serializeChoiceContents = (contents: ContentBlock[]): string =>
  (contents ?? []).map(inlinePiece).reduce(joinInline, "").trim();

/** 문장 끝 — 이 뒤에 오는 수식은 문장 한가운데가 아니다. */
const SENTENCE_END = /(?:[.?!:。]|\n)\s*$/;

/**
 * 문장 한가운데의 equation_block — 앞 글이 문장 끝이 아니고, 뒤 글이 빈칸 · 줄바꿈 없이 문장을 이어 가면
 * («의 두 부분집합», «를 만족시키는» …) 원본에서 줄머리에 왔을 뿐인 인라인 수식이다. 가운데 수식으로 두면
 * 문장 하나가 세 덩이로 갈라져 수식이 혼자 한 줄을 차지한다(원장님 2026-11-11 «왜 일부 수식에서 이렇게
 * 혼자 거대한 공간 차지하는지»). 인식 지시문에도 같은 규칙이 있지만 모델이 어긴다 — 여기서 결정적으로 고친다.
 */
const midSentenceBlock = (
  previous: NBlock | undefined,
  next: NBlock | undefined,
): boolean =>
  !!previous &&
  !!next &&
  !previous.boxMember &&
  !next.boxMember &&
  (previous.type === "text" || previous.type === "equation") &&
  next.type === "text" &&
  previous.value.trim() !== "" &&
  !SENTENCE_END.test(previous.value) &&
  /^[가-힣,.)]/.test(next.value);

/**
 * 블록 + 보기 → markdown (`OCRProblem.text` 파생값).
 *
 * 인라인 블록(text/equation)은 *공백 없이 이어붙인다* — 모델이 블록 경계에 필요한
 * 공백을 text value 에 이미 포함하므로(예: equation "30" + text "개의 공을" →
 * "$30$개의 공을"). equation_block/table/박스/inline-svg 는 블록 레벨로 빈 줄 분리.
 */
export const blocksToMarkdown = (
  contents: ContentBlock[],
  choices: ChoiceGroup[] = [],
  subQuestions: SubQuestion[] = [],
): string => {
  // content_parser 정규화 (병합·쉼표분리·확통로만·박스경계) — 웹 미리보기를 HWP 출력에
  // 맞춘다. 저장 블록·wire 는 네이티브 그대로(커넥터가 단독 재정규화 — 이중정규화 0).
  const norm: NBlock[] = normalizeContents(contents ?? [], subQuestions);
  // 선택지 force_geo = 본문(정규화 후) 기하 문맥 (대륜중 #1 — 점 좌표 선택지 로만+이탤릭).
  const geo = hasGeometryContext(norm);

  const out: string[] = []; // 블록 레벨 청크 (빈 줄로 join)
  let inline = ""; // 현재 인라인 런
  let boxRun: NBlock[] = []; // 연속 box_member 블록 (멀티블록 박스 그룹핑)

  const flushInline = (): void => {
    const s = inline.trim();
    if (s) out.push(s);
    inline = "";
  };
  const flushBoxRun = (): void => {
    if (boxRun.length === 0) return;
    // 박스 멤버 블록들을 인라인 직렬화 후 한 blockquote 로 — 멀티블록 보기 박스가
    // 마커 블록만 박스화되고 항목이 유출되던 "박스 미완"(사용자 보고) 차단.
    const concat = boxRun.map(inlinePiece).reduce(joinInline, "").trim();
    if (concat) out.push(boxToBlockquote(concat));
    boxRun = [];
  };

  for (const [index, b] of norm.entries()) {
    if (!b || typeof b.type !== "string") continue;
    if (b.boxMember) {
      flushInline();
      boxRun.push(b);
      continue;
    }
    flushBoxRun();
    if (
      b.type === "equation_block" &&
      midSentenceBlock(norm[index - 1], norm[index + 1])
    ) {
      inline = joinInline(inline, inlinePiece(b));
    } else if (b.type === "equation_block") {
      flushInline();
      const v = b.value.trim();
      if (v) out.push(`$$${v}$$`);
    } else if (b.type === "table") {
      flushInline();
      const gfm = tableToGfm(b.rows ?? []);
      if (gfm) out.push(gfm);
    } else if (isSvgText(b)) {
      flushInline();
      out.push(b.value.trim());
    } else if (isBoxText(b)) {
      // 태깅 안 된 단일 블록 박스 fallback (box_member 일관 태깅 후엔 드묾).
      flushInline();
      out.push(boxToBlockquote(b.value));
    } else if (isRawBlockquote(b)) {
      // 모델이 본문에 raw `> ` blockquote 를 붙인 경우 — 블록레벨로 분리(앞뒤 flush).
      // 인라인 join 을 막아 직전 블록의 `&gt;` 누출 + 다음 블록의 박스 끌려감을 방지.
      flushInline();
      out.push(b.value.trim());
    } else {
      // text 또는 equation — 인라인 런에 누적
      inline = joinInline(inline, inlinePiece(b));
    }
  }
  flushInline();
  flushBoxRun();

  // 보기 → ①..⑤ 한 줄 (rule 4b). 본문과 빈 줄로 분리. extractChoices 가 끝에서 파싱.
  const valid = normalizeChoiceGroups(choices ?? [], geo);
  if (valid.length > 0) {
    const line = valid
      .map((c) => {
        const marker = CIRCLED[c.number - 1] ?? `(${c.number})`;
        // 빈 보기는 placeholder 로 채운다 — 비면 마커가 인접("① ② …")해 extractChoices
        // 정규식(마커 뒤 비-마커 1+ 필수)이 5개 매치에 실패 → 객관식이 주관식으로 오인.
        const content =
          serializeChoiceContents(c.contents) || "$\\boxed{\\phantom{0}}$";
        return `${marker} ${content}`;
      })
      .join(" ");
    out.push(line);
  }

  // D3: 소문항 (1)(2) — 각 소문항을 자기 본문(+보기)으로 직렬화. 줄머리 `(번호) ` 는
  // 인쇄 경로 splitSubQuestions(/^\s*\(\d+\)\s/)가 소문항으로 인식해 풀이 공간을 분리.
  // 개별 배점 있으면 끝에 `[N점]` 표기(웹/인쇄 표시 — HWP 는 wire 구조로 별도 렌더).
  for (const sub of subQuestions ?? []) {
    if (!sub || !Array.isArray(sub.contents)) continue;
    const body = blocksToMarkdown(sub.contents, sub.choices ?? []);
    // 모델이 인쇄된 소문항 마커 "(1)" 까지 contents 에 전사한 경우, 아래 prepend 와
    // 겹쳐 "(1) (1) ..." 중복 표기됨(사용자 보고 2026-06-22). 선두 "(숫자)" 1회 strip.
    // 좌표쌍 "(1, 2)" 는 `\(\d+\)` 가 콤마에서 끊겨 매칭 안 되므로 안전.
    const bodyNoMarker = body.replace(/^\s*\(\d+\)\s*/, "");
    const scoreTag =
      typeof sub.score === "number" && sub.score > 0
        ? ` [${sub.printedScore ?? sub.score}점]`
        : "";
    const line = `(${sub.number}) ${bodyNoMarker}${scoreTag}`.trim();
    if (line) out.push(line);
  }

  return out.join("\n\n");
};
