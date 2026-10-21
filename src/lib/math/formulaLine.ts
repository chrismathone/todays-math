/**
 * «글 다음 식만 있는 문단» — 한 줄 여백 + 가운데 (원장님 2026-10-20).
 *
 * 원장님 말씀: *「글과 식 사이에 한 줄 정도 여백을 두고, 식만 가운데 정렬」*. 엔진은 식을 빈 줄로 떼어
 * 두었는데(`…구하시오.\n\n$563\times42$`) 문단 사이 여백이 0 이라(프리플라이트 · 죽은 `prose-p:my-2` ·
 * 인쇄 `.document p{margin:0}`) 식이 글 바로 아래 왼쪽에 붙어 나갔다.
 *
 * 🔴 **지면(remark 플러그인 `remarkFormulaLines`)과 높이 자(`estimateProblemPx`)가 이 파일 하나를 쓴다.**
 *    한쪽만 여백을 알면 자가 재는 지면과 실제 지면이 한 줄씩 갈린다.
 *
 * 켜는 곳은 발문(`ProblemContent`) 하나다 — 보기 · 상자 · 정답 · 해설은 그대로. 여백은 식 **위**에만 둔다.
 */

export type ParagraphKind = "text" | "formula" | "other";

/** 식 하나(`$…$` · 한 줄 `$$…$$`)와, 식이 여럿이면 쉼표로 가른 나열만. */
const ONE = String.raw`(?:\$\$[^$\n]+\$\$|\$[^$\n]+\$)`;
const FORMULA_ONLY = new RegExp(String.raw`^\s*${ONE}(?:\s*[,，]\s*${ONE})*\s*[,，]?\s*$`);

/**
 * 식만 있는 문단인가.
 *
 * 식 여럿을 **공백만으로** 이은 문단은 아니다 — 파서가 «…아닌 것은?» 뒤의 식 줄들(번호 없는 보기)을
 * 한 문단으로 합친 자국이다(`parseProblemContent` `keepMeaningfulParagraphs`). 엔진이 쓰는 나열은
 * 늘 쉼표로 가른다(«$\frac{5}{7}$,  $\frac{6}{7}$»). — Codex 검토 2026-10-20
 */
export function isFormulaOnlyParagraph(paragraph: string): boolean {
  return FORMULA_ONLY.test(paragraph);
}

/**
 * 문단 차례에서 «글 바로 뒤의 식 문단»을 고른다. 앞에 글이 없는 식(계산만 있는 문항)은 손대지 않는다.
 * 식 문단이 **잇달면** 손대지 않는다 — 번호 없는 보기다(`markStandaloneFormula` ㉢ 과 같은 판단).
 * 상자 · 표 같은 다른 덩어리(`other`) 바로 뒤의 식도 그대로다.
 */
export function formulaLinePlan(kinds: readonly ParagraphKind[]): boolean[] {
  return kinds.map(
    (kind, i) =>
      kind === "formula" &&
      kinds[i - 1] === "text" &&
      kinds[i + 1] !== "formula",
  );
}

/** 마크다운 문단 문자열의 갈래 — 높이 자가 쓴다(지면은 같은 판정을 mdast 에서 한다). */
export function paragraphKind(paragraph: string): ParagraphKind {
  const t = paragraph.trim();
  // 여러 줄 `$$⏎…⏎$$` 는 remark 가 문단이 아닌 수식 블록으로 읽는다 — 지면 플러그인도 `other` 로 본다.
  if (/^(?:>|\||<(?:보기|조건|상자|나란히))/.test(t) || (t.startsWith("$$") && t.includes("\n")))
    return "other";
  return isFormulaOnlyParagraph(t) ? "formula" : "text";
}

/** 발문 하나에서 이 규칙이 더하는 여백 줄 수. */
export function formulaGapLines(question: string): number {
  const paragraphs = question
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return formulaLinePlan(paragraphs.map(paragraphKind)).filter(Boolean).length;
}
