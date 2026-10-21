/**
 * **교과서 행의 그림 글 고침** — D-164 ③④ 2단계 묶음을 만드는 규칙(순수 함수 · DB 를 모른다).
 * 묶음은 `textbook-figure-text.ts` 가 만들고 공유 DB 에는 리드가 `apply-row-repairs.ts` 로 쓴다.
 *
 * ## ㉠ 위치 표현 — 지면에서 그림은 글 **아래**다(합의 ③)
 * - «오른쪽 · 왼쪽 + 그림 · 표 · 그래프 · 좌표평면 · 전개도 · 도형 · 히스토그램 …» → «다음 …»
 * - «오른쪽은 · 왼쪽은» → «다음은» · «오른쪽과 같이/같을 …» → «다음과 같이/같을 …»
 * - «아래 …»는 그대로(이미 맞다). «위 …»는 안 본다 — 데이터에 그림을 가리키는 «위 그림»이 없고(있는 것은 본문의 식을 가리키는
 *   «위 식»), «좌표평면 위의 도형»처럼 «~ 위의»가 흔해 잘못 바꿀 자리만 있다.
 * - 🔴 **방향 뜻은 고치지 않는다**(«오른쪽 도형을 왼쪽으로 옮기시오» · «그림의 왼쪽과 오른쪽은 각각»): 바꿀 표현 밖에 방향 낱말
 *   (오른쪽 · 왼쪽 · 위쪽 · 아래쪽)이 하나라도 있는 행은 규칙으로 안 바꾼다 — 사람이 읽어 정한 목록(`overrides`)만 바꾼다.
 *   «과 · 와 · 의» 뒤의 «오른쪽은»(«왼쪽과 오른쪽은»)도 방향이다. 식 안(`$…$`)은 안 본다.
 *
 * ## ㉡ 그림 자리 `[그림:n]` — 행마다 그림을 보고 확인한 결정대로만(자동 연결 금지 · 합의 ④)
 * - `label`(④): 글 없이 번호만 남은 소문항(«⑴ [그림] ⑵ [그림]») — 번호를 그 그림의 캡션으로 `[그림:k] ⑴` 줄에 옮긴다.
 * - `desc`(③): 설명 뒤 소문항 — 그림을 첫 소문항 앞(또는 정한 소문항 글 뒤)에 `[그림:k]` 줄로.
 * - `perSubq`(③): 소문항마다 제 그림 — 그 소문항 글 뒤에 `[그림:k]` 줄로.
 * 자리를 넣는 행은 옛 `[그림]` 표지를 다 걷는다(자리 줄이 그림을 세우고, 교재 렌더러는 표지를 글로 찍는다).
 * 표지를 걷어 낱말과 조사 사이가 줄로 갈리면(«크기 ⏎ [그림] [그림] 를 …» — 예전 줄바꿈 수리의 자국) 붙인다.
 *
 * 쓰기 전 관문은 둘이다 — `sameVisibleText`(보이는 글자가 위치 표현을 바꾼 것 말고는 같다)와 제품의 쓰기 검사
 * `checkFigureSlotsForWrite`(은행 · 교재 지면에서 자리가 다 선다). 둘 다 CLI 가 부른다.
 */

/** 그림 · 표 같은 «보이는 것» — 위치 낱말 뒤에 오면 그림을 가리키는 말이다(리드 집계 `census-position-refs.ts` 와 같은 목록 · «식»은 뺐다). */
export const POSITION_OBJECTS = [
  "그림그래프",
  "꺾은선그래프",
  "막대그래프",
  "띠그래프",
  "원그래프",
  "도수분포표",
  "히스토그램",
  "계산 과정",
  "좌표평면",
  "수직선",
  "전개도",
  "그래프",
  "도형",
  "그림",
  "상자",
  "표",
] as const;

const OBJECT_ALT = POSITION_OBJECTS.map((o) => o.replace(" ", "\\s")).join("|");
/** «오른쪽 그림» · «오른쪽의 표» — 낱말 머리의 위치 낱말(«맨오른쪽»이 아니다). */
const REF = new RegExp(
  `(?<![가-힣])(오른쪽|왼쪽)(의)?(\\s?)(?=(?:${OBJECT_ALT}))`,
  "g",
);
/** «오른쪽은 …이다» — 그림을 가리키는 주어. */
const SELF = /(?<![가-힣])(오른쪽|왼쪽)은(?=\s)/g;
/** «오른쪽과 같이 · 같을 · 같은». */
const ALIKE = /(?<![가-힣])(오른쪽|왼쪽)(과|와)(?=\s?같)/g;
/** 방향 낱말 — 바꿀 표현 밖에 이것이 있으면 그 행은 규칙으로 안 바꾼다. */
const DIRECTION = /오른쪽|왼쪽|위쪽|아래쪽/g;

export interface PositionEdit {
  at: number;
  from: string;
  to: string;
}

/** `at` 이 식(`$ … $` · `$$ … $$`) 안인가 — `\$` 는 글자 «$» 다. `$$` 는 한 덩어리 구분자다(둘로 세면 식 밖이 된다 — Codex). */
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

/** 바꿀 후보 — 자리와 바꿀 글(아직 안 바꿈). */
function positionCandidates(content: string, word = "다음"): PositionEdit[] {
  const out: PositionEdit[] = [];
  for (const m of content.matchAll(REF))
    out.push({ at: m.index!, from: m[0], to: `${word}${m[3] ? " " : ""}` });
  for (const m of content.matchAll(SELF)) {
    // «왼쪽과 오른쪽은» · «그림의 오른쪽은» — 그림 속 방향이다
    if (
      /(?:과|와|의)\s*$/.test(
        content.slice(Math.max(0, m.index! - 3), m.index!),
      )
    )
      continue;
    out.push({ at: m.index!, from: m[0], to: `${word}은` });
  }
  for (const m of content.matchAll(ALIKE)) {
    if (/의\s*$/.test(content.slice(Math.max(0, m.index! - 3), m.index!)))
      continue;
    out.push({
      at: m.index!,
      from: m[0],
      to: `${word}${m[2] === "와" ? "과" : m[2]}`,
    });
  }
  return out
    .filter((edit) => !insideMath(content, edit.at))
    .sort((a, b) => a.at - b.at);
}

export interface PositionRewrite {
  content: string;
  edits: PositionEdit[];
  /** 규칙으로 안 바꾼 까닭(바꿀 후보가 있었는데 안 바꿨다) — 없으면 null. */
  held: string | null;
}

/**
 * 위치 표현을 «다음 …»으로 — 규칙으로 바꿀 수 있는 행만. `word` 는 바꿀 낱말(«다음은 다음 그림의»처럼 같은 문장에 «다음»이
 * 이미 있는 행은 사람이 «아래»를 고른다 — `overrides`).
 */
export function rewritePositionRefs(
  content: string,
  word = "다음",
): PositionRewrite {
  const edits = positionCandidates(content, word);
  if (edits.length === 0) return { content, edits, held: null };
  const covered = (at: number) =>
    edits.some((edit) => edit.at <= at && at < edit.at + edit.from.length);
  const other = [...content.matchAll(DIRECTION)].find(
    (m) => !covered(m.index!) && !insideMath(content, m.index!),
  );
  if (other)
    return {
      content,
      edits: [],
      held: `방향 낱말이 같이 있다: «${content.slice(Math.max(0, other.index! - 8), other.index! + 8).replace(/\n/g, "⏎")}»`,
    };
  let out = "";
  let last = 0;
  for (const edit of edits) {
    out += content.slice(last, edit.at) + edit.to;
    last = edit.at + edit.from.length;
  }
  return { content: out + content.slice(last), edits, held: null };
}

/** 사람이 읽어 정한 바꿈 — 규칙이 안 바꾸는 행(방향 낱말이 같이 있다) · 낱말을 «아래»로 고른 행. */
export interface PositionOverride {
  code: string;
  /** 바꿀 낱말(«다음» · «아래»). `skip` 이면 이 행은 위치 표현을 안 바꾼다. */
  word: "다음" | "아래" | "skip";
  /** 방향 낱말이 같이 있어도 바꾼다(사람이 그 낱말이 그림 속 방향이 아님을 읽었다). */
  force?: boolean;
  reason: string;
}

/** 규칙 + 사람의 결정으로 위치 표현을 바꾼다. */
export function applyPosition(
  content: string,
  override: PositionOverride | undefined,
): PositionRewrite {
  if (override?.word === "skip")
    return {
      content,
      edits: [],
      held: `사람이 안 바꾸기로: ${override.reason}`,
    };
  const word = override?.word ?? "다음";
  if (!override?.force) return rewritePositionRefs(content, word);
  const edits = positionCandidates(content, word);
  let out = "";
  let last = 0;
  for (const edit of edits) {
    out += content.slice(last, edit.at) + edit.to;
    last = edit.at + edit.from.length;
  }
  return { content: out + content.slice(last), edits, held: null };
}

/* ────────────────────────────────────────────────────────────────────────
 * ㉡ 그림 자리
 * ──────────────────────────────────────────────────────────────────────── */

export type SlotKind = "label" | "desc" | "perSubq";

export interface SlotDecision {
  code: string;
  kind: SlotKind;
  /**
   * 그림(1부터 — `figureUrls` 차례) → 번호(본문의 꼴 그대로 «⑴» · «(1)»). desc 는 «before-first»(첫 소문항 앞) ·
   * «at-marker»(홀로 선 첫 `[그림]` 표지 자리 — 자료 줄의 제목 그림처럼 설명 바로 뒤에 서야 하는 것)도 된다.
   */
  mapping: { figure: number; number: string }[];
  /** 행을 본 사람(검토자)의 근거 한 줄. */
  evidence: string;
}

const FIGURE_MARKER = "[그림]";
/** 소문항 번호 — «⑴» · «(1)»(본문에 적힌 꼴). */
const NUMBER = /[⑴-⒇]|\((?:[1-9]|1[0-9])\)/;
/** 번호만 선 자리(앞뒤가 빈칸 · 줄 끝). */
const BARE_NUMBER = new RegExp(`(?<=^|\\s)(${NUMBER.source})(?=\\s|$)`, "g");
/** 표지를 걷은 줄이 조사 · 서술격으로 시작하면 앞 줄의 낱말에 붙던 것이다(«크기 ⏎ [그림] 를» · «직육면체 ⏎ [그림] 이다»). */
const PARTICLE_HEAD =
  /^(?:을|를|이|가|은|는|의|에|와|과|로|으로|도|만|이다|이고|이며|입니다|이므로|인|일)(?=[\s,.]|$)/;

/** 옛 `[그림]` 표지를 걷는다 — 표지만 선 줄은 줄째, 낱말과 조사 사이에 끼인 표지는 둘을 붙인다. */
export function dropFigureMarkers(content: string): string {
  const lines = content.split("\n").map((line) =>
    line.includes(FIGURE_MARKER)
      ? line
          .split(FIGURE_MARKER)
          .join(" ")
          .replace(/[ \t]{2,}/g, " ")
          .trim()
      : line,
  );
  const out: string[] = [];
  lines.forEach((line, i) => {
    const touched = content.split("\n")[i]!.includes(FIGURE_MARKER);
    if (touched && line === "") return;
    const previous = out[out.length - 1];
    if (
      touched &&
      previous !== undefined &&
      /[가-힣]$/.test(previous) &&
      PARTICLE_HEAD.test(line)
    ) {
      out[out.length - 1] = previous + line;
      return;
    }
    out.push(touched ? line.replace(/^\s+/, "") : line);
  });
  return out.join("\n");
}

/** 첫 소문항 번호가 머리에 선 줄의 차례(없으면 -1). */
function firstNumberLine(lines: readonly string[]): number {
  return lines.findIndex((line) =>
    new RegExp(`^\\s*(?:${NUMBER.source})`).test(line),
  );
}

/** 번호 `number` 의 소문항이 끝나는 줄(다음 번호 줄 앞 · 없으면 끝) — 그 뒤에 자리를 넣는다. */
function segmentEnd(lines: readonly string[], number: string): number {
  const head = (line: string) =>
    new RegExp(`^\\s*(?:${NUMBER.source})`).exec(line)?.[0].trim();
  const start = lines.findIndex((line) => head(line) === number);
  if (start < 0) return -1;
  let end = start + 1;
  while (end < lines.length && !head(lines[end]!)) end += 1;
  return end;
}

/**
 * 결정대로 자리 줄을 넣은 본문 — 못 넣으면 그 까닭.
 * `content` 는 위치 표현을 이미 바꾼 본문이다.
 */
export function placeSlots(
  content: string,
  decision: SlotDecision,
): { content: string } | { why: string } {
  const slot = (figure: number, caption: string) =>
    caption ? `[그림:${figure}] ${caption}` : `[그림:${figure}]`;
  if (decision.kind === "label") {
    const bare = dropFigureMarkers(content);
    const numbers = [...bare.matchAll(BARE_NUMBER)].map((m) => m[1]!);
    const byNumber = new Map(decision.mapping.map((m) => [m.number, m.figure]));
    if (
      numbers.length !== decision.mapping.length ||
      numbers.some((n) => !byNumber.has(n))
    )
      return {
        why: `번호(${numbers.join(" ")})와 결정(${decision.mapping.map((m) => m.number).join(" ")})이 다르다`,
      };
    // 번호만 선 소문항이라 번호를 걷은 자리는 빈칸뿐이다 — 걷고, 끝에 자리 줄을 번호 차례대로 붙인다
    const text = bare
      .replace(BARE_NUMBER, "")
      .split("\n")
      .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
      .filter((line) => line.trim() !== "")
      .join("\n");
    return {
      content: [text, ...numbers.map((n) => slot(byNumber.get(n)!, n))].join(
        "\n",
      ),
    };
  }
  if (
    decision.kind === "desc" &&
    decision.mapping.some((m) => m.number === "at-marker")
  ) {
    // 홀로 선 첫 표지 줄을 자리 줄로 — 나머지 표지는 걷는다
    const raw = content.split("\n");
    const at = raw.findIndex((line) => line.trim() === FIGURE_MARKER);
    if (at < 0 || decision.mapping.some((m) => m.number !== "at-marker"))
      return {
        why: "홀로 선 [그림] 표지 줄이 없다(또는 표지 자리와 다른 자리를 섞었다)",
      };
    raw.splice(at, 1, ...decision.mapping.map((m) => slot(m.figure, "")));
    return { content: dropFigureMarkers(raw.join("\n")) };
  }
  const lines = dropFigureMarkers(content).split("\n");
  if (decision.kind === "desc") {
    const groups = new Map<string, number[]>();
    for (const m of decision.mapping)
      groups.set(m.number, [...(groups.get(m.number) ?? []), m.figure]);
    // 뒤에서부터 넣는다 — 앞의 줄 차례가 안 밀린다
    const places = [...groups].map(([number, figures]) => ({
      at:
        number === "before-first"
          ? firstNumberLine(lines)
          : segmentEnd(lines, number),
      figures,
    }));
    if (places.some((p) => p.at < 0))
      return { why: "자리를 넣을 소문항 줄을 못 찾았다" };
    for (const p of places.sort((a, b) => b.at - a.at))
      lines.splice(p.at, 0, ...p.figures.map((f) => slot(f, "")));
    return { content: lines.join("\n") };
  }
  // perSubq — 소문항마다 그 글 뒤에
  const places = decision.mapping.map((m) => ({
    at: segmentEnd(lines, m.number),
    figure: m.figure,
  }));
  if (places.some((p) => p.at < 0))
    return { why: "자리를 넣을 소문항 줄을 못 찾았다" };
  for (const p of places.sort((a, b) => b.at - a.at))
    lines.splice(p.at, 0, slot(p.figure, ""));
  return { content: lines.join("\n") };
}

/** 보이는 글자 — 표지 · 자리 표기 · 빈칸을 뺀 것. */
export function visibleText(content: string): string {
  return content
    .replace(/\[그림:\d+\]/g, "")
    .split(FIGURE_MARKER)
    .join("")
    .replace(/\s+/g, "");
}

/**
 * 고친 본문의 보이는 글자가 «위치 표현을 바꾼 앞 본문»과 같은가 — 자리 줄은 번호를 캡션으로 옮길 뿐 글자를 더하거나 빼지 않는다.
 */
export function sameVisibleText(positioned: string, after: string): boolean {
  return visibleText(positioned) === visibleText(after);
}
