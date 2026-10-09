import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProblemCard } from "@/components/problem/ProblemCard";
import BankView from "@/components/unified/BankView";
import type { BankData, BankProblem } from "@/components/unified/types";
import { MOCK_PROBLEM_WITH_FRACTION } from "@/mocks/data";
import {
  pastExamReference,
  textbookReference,
} from "../fixtures/problemSourceReference";

vi.mock("@/components/unified/UnifiedProblem", () => ({
  default: ({ problem }: { problem: BankProblem }) => <p>{problem.content}</p>,
}));

afterEach(() => vi.unstubAllGlobals());

const bankProblem: BankProblem = {
  id: "generated-question",
  problemCode: "J20101-A02-001",
  content: "생성한 문제",
  answer: "2",
  solution: "풀이",
  grade: "중2",
  chapter: "수와 연산",
  section: "정수",
  difficulty: "기본",
  source: "manual",
  familyKey: "mid:integer",
  originProblemId: null,
  questionTypeRaw: "단답형",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  reviewStatus: "approved",
  sourceReference: pastExamReference,
};

function mountBank(problem = bankProblem) {
  const data: BankData = {
    problems: [problem],
    total: 1,
    page: 1,
    pageSize: 12,
    grades: [{ grade: "중2", count: 1 }],
    chapters: ["수와 연산"],
  };
  return render(
    <BankView
      initialData={data}
      selected={[]}
      onToggle={vi.fn()}
      onExport={vi.fn()}
    />,
  );
}

describe("teacher problem source references", () => {
  it("shows a transform reference while preserving the AI transformation badge", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <ProblemCard
        problem={{
          ...MOCK_PROBLEM_WITH_FRACTION,
          source: "transformed",
          originProblemId: pastExamReference.problemId,
          sourceReference: pastExamReference,
        }}
      />,
    );
    expect(
      screen.getByText("기출 변형 · OO중 2025년 1학기 중간 12번 기반"),
    ).toBeVisible();
    expect(screen.getByTitle("AI 변형")).toBeVisible();
    expect(screen.queryByTitle("기출 추출")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows textbook metadata without changing the engine badge", () => {
    render(
      <ProblemCard
        problem={{
          ...MOCK_PROBLEM_WITH_FRACTION,
          source: "manual",
          familyKey: "elem:division",
          sourceReference: textbookReference,
        }}
      />,
    );
    expect(screen.getByText(/^교과서 기반 · 천재교육/)).toBeVisible();
    expect(screen.getByTitle("초등 엔진 생성")).toBeVisible();
    expect(screen.queryByTitle("교과서 추출")).not.toBeInTheDocument();
  });

  it("does not create empty metadata on old problem cards", () => {
    const { container } = render(
      <ProblemCard
        problem={{ ...MOCK_PROBLEM_WITH_FRACTION, sourceReference: null }}
      />,
    );
    expect(container.querySelector("[data-source-reference]")).toBeNull();
  });

  it("shows the same supplied reference in a bank card and its selected detail without a request", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    mountBank();
    const label = "기출 기반 · OO중 2025년 1학기 중간 12번";
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByTitle("중등 엔진 생성")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    const dialog = screen.getByRole("dialog", { name: "J20101-A02-001 상세" });
    expect(within(dialog).getByText("원문 출처")).toBeVisible();
    expect(within(dialog).getByText(label)).toBeVisible();
    expect(within(dialog).getByTitle("중등 엔진 생성")).toBeVisible();
    expect(within(dialog).queryByTitle("기출 추출")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a missing exam readable through its source code in the selected detail", () => {
    mountBank({
      ...bankProblem,
      source: "transformed",
      originProblemId: pastExamReference.problemId,
      sourceReference: {
        ...pastExamReference,
        exam: null,
        school: null,
        subject: null,
        questionNumber: null,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("기출 변형 · J20101-A01-012 기반"),
    ).toBeVisible();
    expect(dialog).not.toHaveTextContent("2025년");
  });

  it("omits the reference row in the selected detail when the response has none", () => {
    mountBank({ ...bankProblem, sourceReference: undefined });
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    expect(
      within(screen.getByRole("dialog")).queryByText("원문 출처"),
    ).not.toBeInTheDocument();
  });
});
