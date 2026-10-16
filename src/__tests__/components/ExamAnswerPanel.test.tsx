/**
 * 시험지 만들기 · 문항 검토 — 문항 오른쪽에 정답 · 해설을 상시로 (2026-08-21 원장님 확정 선례
 * `ReviewProblemCard` 와 같은 규칙: 분수 보기는 문항 단위 · 해설은 `SolutionText` 줄 나눔 · «해설 없음»).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExamAnswerPanel from "@/components/exam-builder/ExamAnswerPanel";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import type { StudioProblem } from "@/components/unified/types";

afterEach(cleanup);
const problem = (patch: Partial<StudioProblem> = {}): StudioProblem => ({
  id: "p1",
  content: "다음을 계산하시오.",
  answer: "12",
  solution: "1. 먼저 더한다. 2. 그다음 곱한다.",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  ...patch,
});

describe("ExamAnswerPanel", () => {
  it("정답과 해설을 함께 보이고 해설은 줄을 나눈다", () => {
    render(<ExamAnswerPanel problem={problem()} />);
    const panel = screen.getByRole("complementary", { name: "정답과 해설" });
    expect(within(panel).getByText("정답")).toBeInTheDocument();
    expect(within(panel).getByText("12")).toBeInTheDocument();
    expect(within(panel).getByText("해설")).toBeInTheDocument();
    expect(panel.textContent).toContain("먼저 더한다");
    expect(panel.textContent).toContain("그다음 곱한다");
  });

  it("해설이 비면 «해설 없음», 정답 자리표시자는 «정답 없음»으로 둔다", () => {
    render(
      <ExamAnswerPanel
        problem={problem({ answer: MISSING_ANSWER, solution: "  " })}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "정답과 해설" });
    expect(within(panel).getByText("정답 없음")).toBeInTheDocument();
    expect(within(panel).getByText("해설 없음")).toBeInTheDocument();
    expect(panel.textContent).not.toContain(MISSING_ANSWER);
  });

  it("초등 문항은 본문과 같은 분수 보기(대분수)를 정답 · 해설에도 쓴다", () => {
    render(
      <ExamAnswerPanel
        problem={problem({
          grade: "초5",
          answer: "$\\frac{7}{3}$",
          solution: "$\\frac{7}{3}$ 이다.",
        })}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "정답과 해설" });
    // 7/3 → 2와 1/3 — 가분수 원문(7)이 분자로 남지 않는다
    expect(panel.innerHTML).not.toMatch(/frac\{7\}/);
    expect(panel.querySelectorAll(".katex").length).toBeGreaterThan(0);
  });
});
