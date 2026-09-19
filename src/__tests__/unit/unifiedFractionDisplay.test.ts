import { describe, expect, it } from "vitest";
import { fractionViewFor } from "@/components/unified/fractionDisplay";

/**
 * 글 하나만 가진 문항 — 식 단위 규칙(인접 항·거듭제곱·«X=X»)을 재는 시험은 이 모양으로 부른다.
 * 본문 하나뿐인 문항의 결정은 트랙 12 의 `displayFractions(글, 학년)` 과 같다.
 */
const one = (text: string, grade: string) =>
  fractionViewFor({ grade, content: text, answer: null, solution: null })(text);

describe("unified elementary fraction display", () => {
  it("converts elementary improper fractions while preserving source", () => {
    const raw = "계산하세요. $\\frac{9}{4} + \\frac{6}{3}$";
    expect(one(raw, "초5")).toBe("계산하세요. $2\\frac{1}{4} + 2$");
    expect(raw).toContain("\\frac{9}{4}");
  });
  it("preserves secondary, proper fractions and conversion exercises", () => {
    for (const grade of ["중1", "고1", "secondary", ""])
      expect(one("$\\frac{9}{4}$", grade)).toBe("$\\frac{9}{4}$");
    expect(one("$\\frac{1}{4}$", "초5")).toBe("$\\frac{1}{4}$");
    const prompt = "가분수 $\\frac{9}{4}$를 대분수로 바꾸세요.";
    expect(one(prompt, "초5")).toBe(prompt);
  });
  it("does not change existing mixed numbers or nested fractions", () => {
    const raw = "$2\\frac{9}{4} + \\frac{\\frac{9}{4}}{3} + x^{\\frac{9}{4}}$";
    expect(one(raw, "초5")).toBe(raw);
    const converted = one("$\\frac{9}{4}$", "초5");
    expect(one(converted, "초5")).toBe(converted);
  });
  it("preserves a fraction raised to a power so grouping cannot change", () => {
    expect(one("$\\frac{9}{4}^{2}$", "초5")).toBe("$\\frac{9}{4}^{2}$");
  });

  // 초등 엔진 1,380문항에 대어 본 결과(2026-09-19)에서 나온 자리들이다. 바꿔서 뜻이 깨지면
  // 원문을 둔다 — 대분수는 «같은 수를 초등 표기로» 보이는 것이지 문제를 고치는 것이 아니다.
  // «X=X» 보호는 **식 단위** 규칙이라 문항 단위 결정(아래)과 따로 선다.
  it("keeps a calculation step that would read the same on both sides of =", () => {
    // 초6 비와 비율 해설 — 접히면 «300=300» 이 되어 계산 단계가 사라진다(08-24 와 같은 결함).
    const step = String.raw`기준량은 넓이입니다. $\frac{1500}{5}=300$`;
    expect(one(step, "초6")).toBe(step);
    const convert = String.raw`$\frac{7}{3}=2\frac{1}{3}$`;
    expect(one(convert, "초5")).toBe(convert);
    const back = String.raw`$2\frac{1}{3}=\frac{7}{3}$`;
    expect(one(back, "초5")).toBe(back);
    // 다른 값과 이어진 등식은 그대로 바꾼다.
    expect(one(String.raw`$\frac{1}{3}+2=\frac{7}{3}$`, "초5")).toBe(
      String.raw`$\frac{1}{3}+2=2\frac{1}{3}$`,
    );
    expect(one(String.raw`$\frac{10}{3}=3000$`, "초5")).toBe(
      String.raw`$3\frac{1}{3}=3000$`,
    );
    expect(one(String.raw`$\frac{6}{2}=3\frac{1}{2}$`, "초5")).toBe(
      String.raw`$3=3\frac{1}{2}$`,
    );
    const spaced = String.raw`$\frac{80}{2} = 40\,\mathrm{km}$`;
    expect(one(spaced, "초6")).toBe(spaced);
  });

  it("keeps the fraction a question names by its kind", () => {
    // 초3 분수 — 묻는 분수를 1⅕ 로 바꾸면 «진분수와 가분수 중 무엇»이 성립하지 않는다.
    const classify = String.raw`다음 분수는 진분수와 가분수 중 무엇인지 쓰시오.

$\frac{6}{5}$`;
    expect(one(classify, "초3")).toBe(classify);
    // «나타낸» 은 «나타내» 와 다른 음절이다 — 동사 목록으로는 못 잡았다.
    const shown = String.raw`$\frac{7}{3}$ 을 대분수로 나타낸 수를 쓰시오.`;
    expect(one(shown, "초4")).toBe(shown);
  });
});

/**
 * 🔴 **대분수로 보일지는 문항 하나에 한 번 정한다** (원장님 2026-09-19 «항상 뷰는 통일이야»).
 *
 * 트랙 12 판은 글마다 정했다 — 본문은 본문대로, 해설은 해설대로. 그래서 초6 «(가분수)÷(분수)»
 * 한 문항 안에서 본문 «7/2 ÷ 2/3» 은 «3½ ÷ 2/3» 으로 바뀌고, 해설 «가분수는 그대로 두고 7/2×3/2»
 * 는 원문으로 남아 **본문과 해설이 다른 수로 보였다**(초등 엔진 1,380문항 중 3문항).
 * 이제 그 문항의 모든 글(본문·정답·해설) 가운데 하나라도 분수의 이름을 부르면 문항 전체가
 * 원문이고, 아니면 문항 전체가 대분수다(초등만).
 */
describe("문항 단위 결정 — fractionViewFor", () => {
  /** 한 문항의 세 글을 같은 결정으로 보인 결과. */
  const shownAll = (problem: {
    grade: string;
    content: string;
    answer: string;
    solution: string | null;
  }) => {
    const view = fractionViewFor(problem);
    return {
      content: view(problem.content),
      answer: view(problem.answer),
      solution: problem.solution === null ? null : view(problem.solution),
    };
  };

  it("초6 «(가분수)÷(분수)» — 해설이 «가분수»를 부르면 본문·정답·해설 모두 원문이다", () => {
    // 초등 엔진 «2-1 분수의 나눗셈» 그대로(정답만 가분수로 적어 결정이 보이게 했다).
    const problem = {
      grade: "초6",
      content: String.raw`다음을 계산하시오.

$\frac{7}{2}\div\frac{2}{3}=\square$`,
      answer: String.raw`$\frac{21}{4}$`,
      solution: String.raw`가분수는 그대로 두고 나누는 수의 분모와 분자를 바꾸어 곱합니다. $\frac{7}{2}\times\frac{3}{2}=\frac{21}{4}$`,
    };
    expect(shownAll(problem)).toEqual({
      content: problem.content,
      answer: problem.answer,
      solution: problem.solution,
    });
  });

  it("초4 받아내림 — 이름을 부르지 않으면 해설의 가분수도 대분수다(«고칩니다»는 이름이 아니다)", () => {
    const problem = {
      grade: "초4",
      content: String.raw`$6\frac{6}{12}-3\frac{11}{12}=\square$`,
      answer: String.raw`$2\frac{7}{12}$`,
      solution: String.raw`분수끼리 뺄 수 없으므로 $6\frac{6}{12}=5\frac{18}{12}$로 고칩니다. $5-3=2$, $\frac{18}{12}-\frac{11}{12}=\frac{7}{12}$ 이므로 답은 $2\frac{7}{12}$ 입니다.`,
    };
    // `5\frac{18}{12}` 는 앞 숫자에 붙은 항이라 식 단위 규칙이 원래대로 둔다.
    expect(shownAll(problem).solution).toBe(
      String.raw`분수끼리 뺄 수 없으므로 $6\frac{6}{12}=5\frac{18}{12}$로 고칩니다. $5-3=2$, $1\frac{6}{12}-\frac{11}{12}=\frac{7}{12}$ 이므로 답은 $2\frac{7}{12}$ 입니다.`,
    );
  });

  it("초4 받아내림 — 본문이 «대분수»를 부르면 해설도 원문이다", () => {
    const problem = {
      grade: "초4",
      content: String.raw`대분수의 뺄셈을 하시오. $6\frac{6}{12}-3\frac{11}{12}=\square$`,
      answer: String.raw`$2\frac{7}{12}$`,
      solution: String.raw`분수끼리 뺄 수 없으므로 $6\frac{6}{12}=5\frac{18}{12}$로 고칩니다. $\frac{18}{12}-\frac{11}{12}=\frac{7}{12}$`,
    };
    expect(shownAll(problem).solution).toBe(problem.solution);
  });

  it("정답이 이름을 부르면 본문도 원문이다 — 어느 글이 부르든 문항 전체가 같다", () => {
    const problem = {
      grade: "초5",
      content: String.raw`$\frac{7}{3}$ 을 다른 모양으로 쓰시오.`,
      answer: String.raw`대분수 $2\frac{1}{3}$`,
      solution: null,
    };
    expect(shownAll(problem).content).toBe(problem.content);
  });

  it("평범한 초5 문항 — 본문·정답·해설 모두 대분수다", () => {
    expect(
      shownAll({
        grade: "초5",
        content: String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.`,
        answer: String.raw`$\frac{13}{3}$`,
        solution: String.raw`$\frac{10}{3}+1=\frac{13}{3}$`,
      }),
    ).toEqual({
      content: String.raw`$3\frac{1}{3}$ 보다 1 큰 수를 구하시오.`,
      answer: String.raw`$4\frac{1}{3}$`,
      solution: String.raw`$3\frac{1}{3}+1=4\frac{1}{3}$`,
    });
  });

  it("중학 이상·학년 모름 — 본문·정답·해설 모두 원문이다", () => {
    const problem = {
      content: String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.`,
      answer: String.raw`$\frac{13}{3}$`,
      solution: String.raw`$\frac{10}{3}+1=\frac{13}{3}$`,
    };
    for (const grade of ["중1", "고2", ""])
      expect(shownAll({ ...problem, grade })).toEqual(problem);
  });

  it("학년·정답·해설이 비어 있어도(null·undefined) 던지지 않는다", () => {
    const view = fractionViewFor({
      grade: undefined,
      content: String.raw`$\frac{7}{3}$`,
      answer: undefined,
      solution: null,
    });
    expect(view(String.raw`$\frac{7}{3}$`)).toBe(String.raw`$\frac{7}{3}$`);
  });
});
