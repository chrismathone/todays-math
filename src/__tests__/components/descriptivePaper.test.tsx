import { beforeAll, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { createNativeAuthoredTask } from "@/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "@/lib/engine/descriptiveAuthor/adapters";
import { rectangleAuthor } from "@/lib/engine/descriptiveAuthor/rectangleDemo";
import {
  descriptiveWritingLayout,
  toNativeDescriptivePrint,
  type NativeDescriptivePrint,
} from "@/lib/print/descriptive";
import { WritingArea } from "@/components/print/WritingArea";
import { DescriptiveAnswerArea } from "@/components/print/DescriptiveAnswerArea";
import { DescriptiveRubricPage } from "@/components/print/DescriptiveRubricPage";
import { DescriptiveAnswerSheet } from "@/components/print/DescriptiveAnswerSheet";
import { TestPrint } from "@/components/print/TestPrint";
import { PastPaperTemplate } from "@/components/print/templates/PastPaperTemplate";
import type {
  TestPrintDocument,
  TestPrintProblem,
} from "@/components/print/types";
import { packProblems } from "@/lib/printPack";
import { assessSeat } from "@/lib/printOverflow";

let data: NativeDescriptivePrint;
let problem: TestPrintProblem;
beforeAll(async () => {
  const task = await createNativeAuthoredTask(
    rectangleAuthor,
    20261020,
    0,
    createNativeHelperAdapters(async () => ({ ok: true, svg: "<svg></svg>" })),
  );
  data = toNativeDescriptivePrint(task.problem);
  problem = {
    id: task.problem.externalId,
    orderIndex: 1,
    content: task.problem.content,
    answer: task.problem.answer,
    solution: task.problem.solution,
    questionType: "서술형",
    nativeDescriptive: data,
    figureSvg: task.figureSvg,
  };
});
const ordinary: TestPrintProblem = {
  id: "ordinary",
  orderIndex: 0,
  content: "$1+1$을 구하시오.",
  answer: "2",
  solution: "더하면 2이다.",
  questionType: "단답형",
  score: 4,
};
const doc = (testType: "daily" | "review"): TestPrintDocument => ({
  testId: null,
  testType,
  testDate: "2026-10-20",
  className: "시연",
  section: "서술형",
  todayGoal: "과정을 쓰기",
  conceptNote: "",
  problems: [ordinary, problem, { ...ordinary, id: "last", orderIndex: 2 }],
});

describe("서술형 B — 구조화된 조립 결과를 지면에 연결", () => {
  it("기준 3개 통답란은 48mm, 소문항 3칸은 16·24·32mm로 합 72mm", () => {
    const split = descriptiveWritingLayout(data);
    expect(split.heightMm).toBe(72);
    expect(split.sections?.map((s) => s.heightMm)).toEqual([16, 24, 32]);
    expect(
      descriptiveWritingLayout({ ...data, requirements: [] }).heightMm,
    ).toBe(48);
  });
  it("넘침 자도 서술형의 고정 답란 높이를 센다", () => {
    const short = {
      ...problem,
      nativeDescriptive: { ...data, requirements: [] },
    };
    const split = assessSeat(problem, 838);
    const whole = assessSeat(short, 838);
    expect(split.px - whole.px).toBeCloseTo((24 * 96) / 25.4, 5);
  });
  it("공용 부품은 모눈·줄·빈칸, 머리표·높이·분할을 받는다", () => {
    for (const pattern of ["grid", "lines", "blank"] as const) {
      const { container, unmount } = render(
        <WritingArea
          pattern={pattern}
          heightMm={48}
          heading="내 설명"
          sections={[
            { label: "⑴", heightMm: 16 },
            { label: "⑵", heightMm: 32 },
          ]}
        />,
      );
      expect(container.querySelector("[data-writing-area]")).toHaveAttribute(
        "data-pattern",
        pattern,
      );
      expect(container.textContent).toContain("내 설명");
      expect(container.querySelectorAll("[data-writing-section]")).toHaveLength(
        2,
      );
      unmount();
    }
  });
  it("학생 답란에는 채점 기준·모범답·정답을 넣지 않는다", () => {
    const { container } = render(
      <DescriptiveAnswerArea data={data} number={2} />,
    );
    expect(container.querySelectorAll("[data-writing-section]")).toHaveLength(
      3,
    );
    for (const text of [
      "채점 기준",
      "선행 오류",
      data.modelAnswer,
      problem.answer,
    ])
      expect(container.textContent).not.toContain(text);
    expect(container.textContent).toContain("⑶");
  });
  it.each(["daily", "review"] as const)(
    "%s 실제 출력은 문항 아래 답란, 일반 풀이 공간은 유지",
    (kind) => {
      const { container } = render(<TestPrint data={doc(kind)} />);
      const native = container.querySelector('[data-problem-number="2"]')!;
      expect(native.querySelector("[data-descriptive-answer]")).not.toBeNull();
      expect(native.textContent).not.toContain("내 정답");
      expect(native.textContent).toContain("[8점]");
      expect(
        container.querySelector('[data-problem-number="1"]')?.textContent,
      ).toContain("내 정답");
      expect(
        container.querySelector('[data-problem-number="1"]')?.textContent,
      ).not.toContain("[4점]");
      expect(container.textContent).not.toContain("채점 기준");
      const pages = packProblems(doc(kind).problems);
      expect(
        pages.find((p) => p.problems.some((p) => p.nativeDescriptive))
          ?.problems,
      ).toHaveLength(1);
      expect(pages.flatMap((p) => p.problems.map((p) => p.id))).toEqual(
        doc(kind).problems.map((p) => p.id),
      );
    },
  );
  it("기출 문제지는 답란 없이, 서술형만 번호 옆 배점; 별도 답안지는 같은 B", () => {
    const { container } = render(
      <PastPaperTemplate
        meta={{ academyName: "오늘 수학", title: "기출형", subtitle: "" }}
        page={1}
        columns={[[ordinary], [problem]]}
        numberOf={(p) => (p === ordinary ? 1 : 2)}
        scoreOf={() => 4}
      />,
    );
    expect(container.querySelector("[data-writing-area]")).toBeNull();
    expect(container.textContent).not.toContain("4점");
    expect(container.textContent).toContain("8점");
    const sheet = render(
      <DescriptiveAnswerSheet items={[{ number: 2, data }]} title="기출형" />,
    );
    expect(
      sheet.container.querySelectorAll("[data-writing-section]"),
    ).toHaveLength(3);
    expect(sheet.container.textContent).toContain("문 2");
    expect(sheet.container.textContent).not.toContain(
      data.rubric.criteria[0].expected,
    );
  });
  it("교사용 한 쪽에 기준별 □·부분점수·합계·선행 오류를 보존", () => {
    const { container } = render(
      <DescriptiveRubricPage items={[{ number: 2, data }]} title="채점 시연" />,
    );
    expect(container.querySelectorAll("[data-print-page]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-criterion]")).toHaveLength(3);
    expect(container.querySelector("p div")).toBeNull();
    expect(container.textContent).toContain("서술형 합계");
    expect(container.textContent).toContain("/ 8점");
    expect(container.textContent).toContain("다시 감점하지 않는다");
    expect(container.textContent?.match(/□/g)?.length).toBe(11);
    expect(container.querySelector("[data-writing-area]")).toBeNull();
  });
  it("TestPrint 교사용은 일반 문항 번호를 보존하고 서술형 채점표를 중복하지 않는다", () => {
    const { container } = render(
      <TestPrint data={doc("daily")} initialMode="answers" />,
    );
    expect(container.querySelectorAll("[data-criterion]")).toHaveLength(3);
    expect(
      container.querySelector('[data-testid="answer-heading-3"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="answer-heading-2"]'),
    ).toBeNull();
    expect(container.querySelector("[data-writing-area]")).toBeNull();
  });
});
