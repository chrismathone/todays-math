// @vitest-environment node
/**
 * 진도판 칸 이름의 줄바꿈 자리 (D-142). 폰 320 에서 칸 글자 폭은 약 53px(10px 글자 5자 남짓)이라,
 * 띄어쓰기 없는 긴 낱말(«연립일차방정식» 7자)이 «연립일차방정 / 식»으로 쪼개졌다(운영에서도).
 * 판에 나올 수 있는 이름 전부에서 끊을 수 없는 조각이 그 폭을 넘지 않는지 본다 — 실제 폭은 Playwright 실측이 다시 잰다.
 */
import { describe, expect, it } from "vitest";
import { titlePieces } from "@/components/math-srs/journeyTitle";
import { definitionUnits } from "@/lib/math-explorers/definition-cards";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

const names = [
  ...new Set([
    ...definitionUnits.map((unit) => unit.title),
    ...definitionUnits.map((unit) => `${unit.title} 연결 복습`),
    ...COURSE_SECTIONS.map((section) => section.title),
    ...COURSE_SECTIONS.map((section) => section.chapterTitle),
    "기억 복습",
    "다음 여정",
    "다음 학습",
  ]),
];
// 10px Pretendard 기준 대략의 폭(한글 한 자 = 1). 괄호·쉼표·가운뎃점은 좁고 숫자·로마자는 중간.
const width = (text: string) =>
  [...text].reduce(
    (sum, ch) =>
      sum +
      (/[가-힣]/.test(ch)
        ? 1
        : /[()·,.:=/]/.test(ch)
          ? 0.35
          : /[×÷]/.test(ch)
            ? 0.7
            : 0.6),
    0,
  );
const LIMIT = 5.3;

describe("칸 이름 줄바꿈 자리", () => {
  it("글자는 한 자도 바꾸지 않는다 — 조각을 이으면 원래 이름", () => {
    for (const name of names) expect(titlePieces(name).join("")).toBe(name);
  });
  it(`판에 나올 수 있는 이름 ${names.length}개 전부 — 띄어쓰기와 줄바꿈 자리 사이 조각이 칸 폭(한글 ${LIMIT}자 폭)을 넘지 않는다`, () => {
    const over = names.flatMap((name) =>
      titlePieces(name)
        .flatMap((piece) => piece.split(" "))
        .filter((chunk) => width(chunk) > LIMIT)
        .map((chunk) => `${name} → ${chunk}`),
    );
    expect(over).toEqual([]);
  });
  it("합성어는 뜻이 갈리는 자리에서 · 괄호와 곱셈 · 나눗셈 기호 둘레에서 끊는다", () => {
    expect(titlePieces("연립일차방정식")).toEqual(["연립", "일차방정식"]);
    expect(titlePieces("이등변삼각형의 성질")).toEqual([
      "이등변",
      "삼각형의 성질",
    ]);
    expect(titlePieces("유리수·순환소수와 지수")).toEqual([
      "유리수·",
      "순환소수와 지수",
    ]);
    expect(titlePieces("(자연수)÷(자연수)의 몫을 분수로 나타내기")).toEqual([
      "(자연수)÷",
      "(자연수)의 몫을 분수로 나타내기",
    ]);
    expect(titlePieces("일차함수")).toEqual(["일차함수"]);
  });
});
