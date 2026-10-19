import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";
import { StudentExamReportPaper } from "@/components/exam-report/ExamReportPaper";

vi.mock("@/components/math/BoxQuoteCard", () => ({
  BoxQuoteCard: () => {
    throw new Error("성적표에서 상태·DOM 측정 카드 호출 금지");
  },
}));

describe("H1 요약의 서버·브라우저 렌더", () => {
  it("기존 M1도 문항의 보기 상자를 렌더하지 않고 서버와 같은 요약을 보인다", () => {
    const { student } = reportFixture("normal");
    const box = "> <보기:cols=2>\n>\n> $x=1$\n>\n> $x=2$";
    const question = {
      ...student.wrongQuestions[0],
      content: `다음 보기에서 고르시오.\n\n${box}`,
      answer: box,
      solution: box,
    };
    const node = (
      <StudentExamReportPaper
        report={{ ...student, wrongQuestions: [question] }}
        options={{ mode: "M1" }}
      />
    );
    const serverHtml = renderToStaticMarkup(node);
    const expected = document.createElement("div");
    expected.innerHTML = serverHtml;
    const { container } = render(node);
    expect(container.querySelectorAll("[data-box-card]")).toHaveLength(0);
    // DOM에서 쓴 style과 HTML 속성으로 파싱한 style의 공백·끝 세미콜론만 정규화한다.
    for (const root of [expected, container]) {
      for (const element of root.querySelectorAll<HTMLElement>("[style]")) {
        element.setAttribute("style", element.style.cssText);
      }
    }
    expect(container.innerHTML).toBe(expected.innerHTML);
    expect(container.querySelector("[data-box-drawn]")).toBeNull();
  });
});
