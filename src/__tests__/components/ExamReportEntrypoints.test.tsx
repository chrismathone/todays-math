import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GradedExamReportLinks } from "@/components/unified/ExamPublicationParts";
import type { ExamPublicationSummary } from "@/contracts/examPublication.contract";

describe("낸 시험 줄의 반별 성적표 입구", () => {
  it("반마다 채점을 끝낸 것만 열고, 미채점·빈 명단은 제외한다", () => {
    const publication: ExamPublicationSummary = {
      id: "publication",
      documentId: "doc",
      title: "10월 월말평가",
      examType: "monthly",
      testDate: "2026-10-24",
      createdAt: "2026-10-24T00:00:00Z",
      problemCount: 20,
      classes: [
        {
          classId: "one",
          className: "가람반",
          testId: "test-one",
          students: 8,
          graded: 7,
          absent: 1,
          remaining: 0,
        },
        {
          classId: "two",
          className: "나래반",
          testId: "test-two",
          students: 8,
          graded: 7,
          absent: 0,
          remaining: 1,
        },
        {
          classId: "empty",
          className: "빈반",
          testId: "test-empty",
          students: 0,
          graded: 0,
          absent: 0,
          remaining: 0,
        },
      ],
    };
    render(<GradedExamReportLinks publications={[publication]} />);
    expect(
      screen.getByRole("link", { name: "가람반 성적표 · 10/24" }),
    ).toHaveAttribute("href", "/exam-reports/test-one");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
