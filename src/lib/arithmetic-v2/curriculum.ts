import type { ArithmeticCurriculum, ArithmeticV2Definition } from "./types";

const placement = (
  semester: 1 | 2,
  unit: string,
  prerequisite?: string,
): ArithmeticCurriculum => ({
  semester,
  unit,
  ...(prerequisite ? { prerequisite } : {}),
});

/** Catalog metadata only. Never changes persisted IDs, parameters, prompts or SVGs.
 * Grade/term placement follows the curriculum audit in the accompanying report.
 */
export function arithmeticCurriculum(
  type: Pick<
    ArithmeticV2Definition,
    "id" | "grade" | "strand" | "labels" | "curriculum"
  >,
): ArithmeticCurriculum {
  if (type.curriculum) return type.curriculum;
  const { id, grade, strand, labels } = type;
  const chapter = labels.find((label) => /^[12]-\d+ /.test(label));
  if (chapter)
    return placement(
      chapter[0] === "1" ? 1 : 2,
      chapter.replace(/^[12]-\d+ /, ""),
    );
  if (id.startsWith("elem-g2-"))
    return id.includes("-mul-")
      ? placement(2, "곱셈구구")
      : placement(1, "덧셈과 뺄셈");
  if (/^e4-(?:right-)?triangle-missing-angle$/.test(id))
    return placement(1, "각도");
  if (id.startsWith("elem-g3-")) {
    if (/-(add|sub)-/.test(id)) return placement(1, "덧셈과 뺄셈");
    if (id.includes("-mul-")) return placement(2, "곱셈");
    return placement(id.includes("3x1") ? 2 : 1, "나눗셈");
  }
  if (id.startsWith("elem-g4-"))
    return strand === "분수"
      ? placement(2, "분수의 덧셈과 뺄셈")
      : strand === "소수"
        ? placement(2, "소수의 덧셈과 뺄셈")
        : placement(1, "곱셈과 나눗셈");
  if (id.startsWith("elem-g5-"))
    return strand === "소수"
      ? placement(2, "소수의 곱셈")
      : strand === "분수"
        ? placement(
            id.includes("-mul") ? 2 : 1,
            id.includes("-mul") ? "분수의 곱셈" : "분수의 덧셈과 뺄셈",
          )
        : placement(1, "자연수의 혼합 계산");
  if (id.startsWith("elem-g6-"))
    return placement(
      id.includes("-div-natural") || id.includes("-quotient") ? 1 : 2,
      strand === "소수" ? "소수의 나눗셈" : "분수의 나눗셈",
    );
  if (grade === "중1") {
    if (strand === "정수·유리수") return placement(1, "정수와 유리수");
    if (strand === "문자식") return placement(1, "문자와 식");
    if (id === "m1-parallel-angle") return placement(2, "기본 도형");
    if (/^m1-(polygon|triangle|circle|sector)-/.test(id))
      return placement(2, "평면도형의 성질");
    if (/^m1-(prism|pyramid|frustum|cylinder|cone|sphere)-/.test(id))
      return placement(2, "입체도형의 성질");
  }
  if (grade === "중2") {
    if (strand === "문자식") return placement(1, "식의 계산");
    if (labels.some((label) => label.includes("피타고라스")))
      return placement(2, "피타고라스 정리");
    if (
      labels.some((label) =>
        /닮음|무게중심|중점|선분비|이등분선|중선|평행선과 넓이/.test(label),
      )
    )
      return placement(2, "도형의 닮음");
    if (strand === "도형") return placement(2, "삼각형과 사각형의 성질");
  }
  if (grade === "중3") {
    if (/^m3-pythagoras-|^m3-right-leg-product$/.test(id))
      return placement(1, "제곱근과 실수", "중2 피타고라스·닮음 활용");
    if (strand === "근호") return placement(1, "제곱근과 실수");
    if (strand === "문자식") return placement(1, "다항식의 곱셈과 인수분해");
    if (id.startsWith("m3-trig-")) return placement(2, "삼각비");
    if (id.startsWith("m3-circle-")) return placement(2, "원의 성질");
  }
  throw new Error(`Missing arithmetic curriculum placement: ${id}`);
}
