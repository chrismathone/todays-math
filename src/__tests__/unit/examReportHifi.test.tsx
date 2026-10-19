import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExamReportHifi } from "@/app/dev/exam-report-hifi/ExamReportHifi";

describe("월말평가 성적표 Hi-fi 시안", () => {
  it("선택된 H1만 실제 공용 지면을 사용하며 H2~H4는 시안을 유지한다", () => {
    const { container } = render(<ExamReportHifi />);
    expect(
      container.querySelector("[data-exam-report-page='H1']"),
    ).not.toBeNull();
    for (const id of ["H2", "H3", "H4"]) {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${id} ·`) }),
      );
      expect(container.querySelector("[data-exam-report-page]")).toBeNull();
    }
    fireEvent.click(screen.getByRole("button", { name: /^H1 ·/ }));
    expect(
      container.querySelector("[data-exam-report-page='H1']"),
    ).not.toBeNull();
  });
  it("H1~H4마다 S1 · C2를 공용 지면 띠로 비교한다", () => {
    render(<ExamReportHifi />);
    expect(
      screen.queryByRole("button", { name: /^M1 ·/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("region", { name: "H1 · 1쪽" }).length,
    ).toBeGreaterThan(0);
    for (const id of ["H1", "H2", "H3", "H4"]) {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${id} ·`) }),
      );
      for (const mode of ["S1", "C2"]) {
        fireEvent.click(
          screen.getByRole("button", { name: new RegExp(`^${mode} ·`) }),
        );
        expect(
          screen.getByRole("region", { name: `${id} · ${mode} 지면` }),
        ).toBeInTheDocument();
      }
    }
  });

  it("비교는 기본 꺼짐이며, 켜고 끄는 값은 안을 바꾸어도 보존한다", () => {
    render(<ExamReportHifi />);
    const toggle = screen.getByRole("checkbox", { name: "반 평균" });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: /^H2 ·/ }));
    expect(toggle).toBeChecked();
    expect(screen.getAllByText(/응시 6명 기준/).length).toBeGreaterThan(0);
  });

  it("결시와 미채점을 점수로 바꾸지 않으며 학생 지면에 단원 정답률을 싣지 않는다", () => {
    render(<ExamReportHifi />);
    fireEvent.change(screen.getByLabelText("예시 상황"), {
      target: { value: "absent" },
    });
    expect(screen.getAllByText("결시").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("예시 상황"), {
      target: { value: "ungraded" },
    });
    expect(screen.getAllByText("미채점").length).toBeGreaterThan(0);
    expect(screen.queryByText("단원별 정답률")).not.toBeInTheDocument();
    expect(screen.queryByText("성취 지수")).not.toBeInTheDocument();
  });
});
