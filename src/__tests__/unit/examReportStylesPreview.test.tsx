import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExamReportStyles } from "@/app/dev/exam-report-styles/ExamReportStyles";

describe("지면 스타일 비교의 조작", () => {
  it("네 첫 쪽을 지면 띠에 나란히 두고 추이는 기본 켬·평균은 기본 끔이다", () => {
    const { container } = render(<ExamReportStyles />);
    expect(
      screen.queryByRole("button", { name: "풀이 포함" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "틀린 문항 표" }),
    ).toBeInTheDocument();
    const firstPages = [
      ...container.querySelectorAll('[data-print-page="true"]'),
    ].slice(0, 4);
    expect(
      firstPages.map((node) =>
        node.parentElement?.getAttribute("data-report-style"),
      ),
    ).toEqual([
      "H1",
      "letter",
      "grid",
      "ledger",
    ]);
    expect(
      screen.getByRole("checkbox", { name: "월말평가 추이" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "반 평균" })).not.toBeChecked();
    expect(container.querySelectorAll("[data-exam-report-trend]")).toHaveLength(
      4,
    );
  });
  it("구성·상황·출력 선택을 모든 후보에 같이 적용한다", () => {
    const { container } = render(<ExamReportStyles />);
    fireEvent.click(screen.getByRole("button", { name: "숫자만" }));
    expect(container.querySelector("[data-exam-report-trend]")).toBeNull();
    expect(
      container.querySelector('[data-report-block="teacherNote"]'),
    ).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "반 평균" }));
    expect(
      container.querySelectorAll('[data-report-block="classAverage"]'),
    ).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "요약 한 장" }));
    fireEvent.change(screen.getByLabelText("예시 상황"), {
      target: { value: "wrong16" },
    });
    expect(container.querySelector("[data-solution-no]")).toBeNull();
    expect(
      container.querySelectorAll(
        '[data-wrong-table-no], [data-report-block="wrongTable"] [data-mark-no]',
      ),
    ).toHaveLength(4 * 16);
    fireEvent.click(screen.getByRole("checkbox", { name: "월말평가 추이" }));
    expect(container.querySelector("[data-exam-report-trend]")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "월말평가 추이" }));
    fireEvent.change(screen.getByLabelText("예시 상황"), {
      target: { value: "oneHistory" },
    });
    expect(container.querySelector("[data-exam-report-trend]")).toBeNull();
  });
});
