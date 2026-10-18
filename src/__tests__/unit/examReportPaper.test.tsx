import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";
import {
  ClassExamReportPaper,
  StudentExamReportPaper,
} from "@/components/exam-report/ExamReportPaper";
import {
  paginateWrongQuestions,
  estimateWrongQuestionMm,
  WRONG_PAGE_BODY_MM,
} from "@/lib/examReport/paginate";

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

  it("미완료와 무배점을 0점이나 100점으로 만들지 않는다", () => {
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
    expect(html).not.toContain("100점");
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
});

describe("M1 오답 쪽 나누기", () => {
  const questions = () => reportFixture("zero").student.wrongQuestions;

  it("0개는 빈 쪽을 만들지 않고, 1개는 한 쪽이다", () => {
    expect(paginateWrongQuestions([])).toEqual([]);
    expect(paginateWrongQuestions(questions().slice(0, 1))).toEqual([
      questions().slice(0, 1),
    ]);
  });

  it("많은 오답의 원문·순서를 한 번씩 보존하며 쪽당 두 문항을 넘지 않는다", () => {
    const source = questions();
    const before = JSON.stringify(source);
    const pages = paginateWrongQuestions(source);
    expect(pages.flat()).toEqual(source);
    expect(pages).toHaveLength(10);
    expect(pages.every((page) => page.length <= 2)).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("큰 그림과 긴 해설을 높이에 포함해 한 문항이 한 쪽을 쓴다", () => {
    const source = questions().slice(0, 2);
    const illustrated = {
      ...source[0],
      figureSvg: '<svg viewBox="0 0 200 340"><path d="M0 0L200 340"/></svg>',
      solution: "양변에서 같은 수를 뺍니다. ".repeat(6),
    };
    expect(estimateWrongQuestionMm(illustrated)).toBeGreaterThan(
      estimateWrongQuestionMm(source[0]),
    );
    expect(paginateWrongQuestions([illustrated, source[1]])).toEqual([
      [illustrated],
      [source[1]],
    ]);
  });

  it("모르는 그림 크기도 0으로 세지 않는다", () => {
    const question = questions()[0];
    expect(
      estimateWrongQuestionMm({
        ...question,
        figureUrls: ["/figures/example.png"],
      }),
    ).toBeGreaterThan(estimateWrongQuestionMm(question));
  });

  it("한 쪽보다 긴 문항은 잘라 싣지 않고 사유를 반환한다", () => {
    const question = {
      ...questions()[0],
      solution: "긴 해설입니다. ".repeat(1500),
    };
    expect(estimateWrongQuestionMm(question)).toBeGreaterThan(
      WRONG_PAGE_BODY_MM,
    );
    expect(() => paginateWrongQuestions([question])).toThrow(/1번.*한 쪽/);
  });
});
