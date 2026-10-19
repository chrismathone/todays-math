import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";
import {
  ClassExamReportPaper,
  StudentExamReportPaper,
} from "@/components/exam-report/ExamReportPaper";

describe("H1 공용 성적표 지면", () => {
  it("S1은 실제 뷰모델의 점수·오답·문장만 한 쪽에 그린다", () => {
    const { student } = reportFixture("normal");
    const html = renderToStaticMarkup(
      <StudentExamReportPaper report={student} />,
    );
    expect(html.match(/data-unified-paper=/g)).toHaveLength(1);
    expect(html).toContain("서하린");
    expect(html).toContain("80");
    expect(html).toContain(student.teacherNote);
    expect(html).toContain("8번");
    expect(html).not.toContain("예시 자료");
    expect(html).not.toContain("반 평균");
  });

  it("옵션을 끄면 오답·재시험·원장님 문장을 본문과 기록 현황에서 뺀다", () => {
    const { student } = reportFixture("normal");
    const html = renderToStaticMarkup(
      <StudentExamReportPaper
        report={student}
        options={{ mode: "M1", wrong: false, retry: false, note: false }}
      />,
    );
    expect(html.match(/data-unified-paper=/g)).toHaveLength(1);
    expect(html).not.toContain("틀린 문항");
    expect(html).not.toContain("재시험");
    expect(html).not.toContain("원장님 문장");
  });

  it("M1 만점은 요약 한 쪽이며, 재시험과 빈 문장을 지어내지 않는다", () => {
    const { student, classroom } = reportFixture("perfect");
    const html = renderToStaticMarkup(
      <StudentExamReportPaper
        report={{ ...student, teacherNote: "" }}
        options={{ mode: "M1", average: classroom.rollup }}
      />,
    );
    expect(html.match(/data-unified-paper=/g)).toHaveLength(1);
    expect(html).toContain("반 평균");
    expect(html).not.toContain("재시험");
    expect(html).not.toContain("· 원장님 문장");
    expect(html).not.toContain("별도 재시험의 지어낸 기록");
  });

  it.each(["absent", "ungraded", "perfect", "zero", "long"] as const)(
    "%s의 상태·긴 글을 그대로 보존한다",
    (scenario) => {
      const { student } = reportFixture(scenario);
      const html = renderToStaticMarkup(
        <StudentExamReportPaper report={student} />,
      );
      expect(html).toContain(student.student.name);
      expect(html).toContain(student.teacherNote);
      if (scenario === "absent")
        expect(html).toContain("결시하여 문항별 기록이 없습니다.");
      if (scenario === "ungraded")
        expect(html).toContain("채점 후 문항별 기록을 확인합니다.");
      if (scenario === "perfect")
        expect(html).toContain("틀린 문항이 없습니다.");
    },
  );

  it("미완료를 0점으로 만들지 않고 무배점은 원문항 수와 100점 환산을 함께 보인다", () => {
    const { student } = reportFixture("normal");
    const incomplete = {
      ...student,
      status: "incomplete" as const,
      correctCount: null,
      score: { ...student.score, value: null },
    };
    expect(
      renderToStaticMarkup(<StudentExamReportPaper report={incomplete} />),
    ).toContain("채점 중");
    const unweighted = {
      ...student,
      score: {
        value: 16,
        maximum: 20,
        unit: "questions" as const,
        storedValue: 80,
      },
    };
    const html = renderToStaticMarkup(
      <StudentExamReportPaper report={unweighted} />,
    );
    expect(html).toContain("/ 20문항");
    expect(html).toContain("80점");
    expect(html).toContain("100점 만점");
    expect(html).toContain("20문항 중 16문항");
  });

  it("C2는 집계의 명단 순서·정오·문항별 정답 수를 가로 A4에 싣는다", () => {
    const { classroom } = reportFixture("normal");
    const html = renderToStaticMarkup(
      <ClassExamReportPaper report={classroom} />,
    );
    expect(html).toContain('data-landscape="true"');
    expect(html).toContain("○");
    expect(html).toContain("×");
    expect(html).toContain("정답 수");
    expect(html).toContain("결시");
    expect(html).toContain("미채점");
    expect(html.indexOf("서하린")).toBeLessThan(html.indexOf("윤해온"));
  });
  it("H1은 85점 만점도 정수 100점 환산과 원래 점수를 함께 그린다", () => {
    const { student } = reportFixture("normal");
    const html = renderToStaticMarkup(
      <StudentExamReportPaper
        report={{
          ...student,
          score: { value: 70, maximum: 85, unit: "points", storedValue: 70 },
        }}
      />,
    );
    expect(html).toContain("82점");
    expect(html).toContain("100점 만점");
    expect(html).toContain("85점 중 70점");
  });
  it("H1도 이력이 두 회부터만 추이를 그리고 선택 해제하면 칸을 뺀다", () => {
    const { student } = reportFixture("normal");
    const history = [
      { date: "2026-09-24", title: "9월", score100: 0 },
      { date: "2026-10-24", title: "10월", score100: 100 },
    ];
    const draw = (count: number, trend = true) =>
      renderToStaticMarkup(
        <StudentExamReportPaper
          report={{ ...student, history: history.slice(0, count) }}
          options={{ trend }}
        />,
      );
    expect(draw(1)).not.toContain("data-exam-report-trend");
    expect(draw(2)).toContain("data-exam-report-trend");
    expect(draw(2)).toContain('data-trend-score="0"');
    expect(draw(2)).toContain('data-trend-score="100"');
    expect(draw(2, false)).not.toContain("data-exam-report-trend");
  });
});

describe("기존 M1 저장값의 요약 출력 호환", () => {
  it.each(["normal", "zero", "long", "absent", "ungraded"] as const)(
    "%s에서도 S1과 같은 표·쪽수를 출력하고 문항 본문·해설은 싣지 않는다",
    (scenario) => {
      const { student } = reportFixture(scenario);
      const questions = student.questions.map((q) => ({
        ...q,
        content: "성적표에 싣지 않을 문항 원문",
        answer: "성적표에 싣지 않을 정답",
        solution: "성적표에 싣지 않을 긴 해설".repeat(1500),
        figureUrls: ["/figures/report-hidden.png"],
      }));
      const report = {
        ...student,
        questions,
        wrongQuestions: questions.filter((q) => q.isCorrect === false),
      };
      const before = JSON.stringify(report);
      const draw = (mode: "S1" | "M1") =>
        renderToStaticMarkup(
          <StudentExamReportPaper report={report} options={{ mode }} />,
        );
      const html = draw("M1");
      expect(html).toBe(draw("S1"));
      expect(html).not.toMatch(
        /싣지 않을|report-hidden|data-report-question|er-problem|틀린 문항 풀이/,
      );
      expect(html).toContain(student.teacherNote);
      expect(JSON.stringify(report)).toBe(before);
    },
  );
});
