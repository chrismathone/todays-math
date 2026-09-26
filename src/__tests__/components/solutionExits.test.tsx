/**
 * 🔴 **해설을 그리는 출구는 한 조합(`SolutionText`)만 지난다** — 후보정 조사 D·L (2026-09-26).
 *
 * 인쇄 정답지·문제은행은 `solutionForDisplay → MathText` 였는데, 시험지 해설지(`AnswerPage`)·
 * 관리자 미리보기·옛 작업 화면은 줄 나눔을 빠뜨렸고, 작업실·검수 콘솔은 **본문 렌더러**
 * (`ProblemContent`)로 그려 해설 속 `1.`·`①` 줄을 **보기 격자**로 잘랐다. 같은 해설이 화면마다
 * 줄도, 새는 것도 달랐다. 소스 배선은 `solutionWiring.test.ts` 가 세고, 여기서는 **렌더 결과**로 잰다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText, SolutionText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { AnswerPage } from "@/components/unified/print/AnswerPage";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";
import { solutionForDisplay } from "@/lib/solutionSteps";

const R = String.raw;
const NL = "\n";

const SOLUTIONS = [
  "밑변은 $5$이다. 높이는 $4$이다.",
  R`이동 거리는 $8$ 이고 $$s=8$$ 이다. 따라서 답은 $8$이다.`,
  "풀이 순서는 다음과 같다." +
    NL +
    "1. 양변에 $2$를 곱한다." +
    NL +
    "2. 이항하여 $x=3$ 이다.",
  R`경우를 나누자. ① $x>0$ 일 때 $f(x)=x$ 이다. ② $x<0$ 일 때 $f(x)=-x$ 이다.`,
];

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("SolutionText 는 `solutionForDisplay → MathText(div)` 한 조합이다", () => {
  it.each(SOLUTIONS.map((s) => [s.slice(0, 24), s] as const))("%s", (_l, s) => {
    expect(html(<SolutionText text={s} />)).toBe(
      html(<MathText as="div" text={solutionForDisplay(s) ?? ""} />),
    );
  });

  it("비었으면 대신 보일 글을 쓴다", () => {
    expect(html(<SolutionText text={null} fallback="해설 없음" />)).toBe(
      html(<MathText as="div" text="해설 없음" />),
    );
    expect(html(<SolutionText text="" />)).toBe(
      html(<MathText as="div" text="" />),
    );
  });
});

describe("[D] 시험지 해설지(AnswerPage)도 같은 조합으로 해설을 그린다", () => {
  const problem = (solution: string): StudioProblem => ({
    id: "p1",
    content: "문제",
    answer: "8",
    solution,
    grade: "고1",
    chapter: "",
    section: "",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  });

  it.each(SOLUTIONS.map((s) => [s.slice(0, 24), s] as const))("%s", (_l, s) => {
    const page = html(
      <AnswerPage
        page={1}
        totalPages={1}
        columns={1}
        meta={{ title: "학습지", subject: "수학" }}
        problems={[{ id: "p1", variant: { ...problem(s), topic: "" } }]}
        startingNumber={1}
        options={DEFAULT_PRINT_OPTIONS}
        measure={{ columnWidthPx: 480 }}
      />,
    );
    // 고등 해설은 분수 보기가 원문 그대로다(`fractionViewFor`) — 줄 나눔만 더해진 모양이어야 한다.
    expect(page).toContain(html(<SolutionText text={s} />));
  });

  it("🔴 줄 나눔이 실제로 들어간다 — 두 문장이 한 줄로 붙지 않는다", () => {
    const page = html(
      <AnswerPage
        page={1}
        totalPages={1}
        columns={1}
        meta={{ title: "학습지", subject: "수학" }}
        problems={[
          { id: "p1", variant: { ...problem(SOLUTIONS[0]!), topic: "" } },
        ]}
        startingNumber={1}
        options={DEFAULT_PRINT_OPTIONS}
        measure={{ columnWidthPx: 480 }}
      />,
    );
    expect(page).toMatch(/이다\.<br\/?>/);
  });
});

describe("[L] 해설 속 `1.`·`①` 줄은 보기 격자가 아니다", () => {
  const steps = SOLUTIONS[2]!;
  const circled = SOLUTIONS[3]!;

  it("본문 렌더러는 보기 격자로 자른다 — 그래서 해설에 쓰면 안 된다(대조)", () => {
    const body = html(
      <ProblemContent content={solutionForDisplay(steps) ?? ""} />,
    );
    expect(body).toContain("data-hwpx-grid");
  });

  it.each([
    ["번호 줄", steps],
    ["원문자 줄", circled],
  ])("SolutionText — %s 은 문장 그대로다", (_l, s) => {
    const out = html(<SolutionText text={s} />);
    expect(out).not.toContain("data-hwpx-grid");
    // 원문의 한글 문장이 전부 그대로 있다(보기 칸으로 흩어지지 않았다).
    for (const sentence of s.match(/[가-힣][가-힣 ]+/g) ?? [])
      expect(out.replace(/<[^>]+>/g, "")).toContain(sentence.trim());
  });
});
