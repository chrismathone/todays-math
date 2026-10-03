import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Problem } from "@prisma/client";
import { serializeProblem } from "@/lib/serializers";
import { problemSchema } from "@/contracts/problem.contract";
import { reviewConsoleRowSchema } from "@/contracts/review.contract";
import { toConsoleRow, type ProblemWithUnit } from "@/lib/review/consoleRow";
import { toPrintProblem } from "@/lib/print/toPrintProblem";
import { UNIFIED_PROBLEM_SELECT, toBankProblem } from "@/lib/unifiedPreview";
import { ProblemCard } from "@/components/problem/ProblemCard";
import { ProblemExcerpt } from "@/components/problem/ProblemExcerpt";
import { ReviewConsole } from "@/components/review/ReviewConsole";
import { parseImport } from "@/components/unified/draftStore";
import { BANK_CHOICE_FIGURES } from "../fixtures/bankChoiceFigures";
vi.mock("server-only", () => ({}));

const p = BANK_CHOICE_FIGURES[0]!;
const row = {
  ...p,
  id: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  unitId: "00000000-0000-4000-8000-000000000003",
  problemCode: "J30501-79GN",
  source: "past_exam" as const,
  originProblemId: null,
  familyKey: null,
  difficulty: "기본" as const,
  problemType: "계산",
  questionType: "객관식",
  reviewStatus: "approved" as const,
  directUseAllowed: true,
  pool: "shared" as const,
  figureSvg: null,
  sourceFile: null,
  school: null,
  subject: null,
  examId: null,
  questionNumber: null,
  solutionSource: "original",
  unit: { grade: "중3", chapter: "이차함수", section: "그래프" },
  createdAt: new Date("2026-10-03T00:00:00Z"),
  updatedAt: new Date("2026-10-03T00:00:00Z"),
};

describe("B1 — DB 행에서 지면까지 연결 정보 보존", () => {
  it("일반 응답 계약과 검수 응답 계약은 연결을 보존하고 옛 응답은 [] 이다", () => {
    const serialized = serializeProblem(row as unknown as Problem);
    const reviewed = toConsoleRow(row as unknown as ProblemWithUnit);
    expect(problemSchema.parse(serialized).choiceFigureIndex).toEqual(
      p.choiceFigureIndex,
    );
    expect(reviewConsoleRowSchema.parse(reviewed).choiceFigureIndex).toEqual(
      p.choiceFigureIndex,
    );
    const old: Partial<typeof serialized> = { ...serialized };
    const oldReview: Partial<typeof reviewed> = { ...reviewed };
    delete old.choiceFigureIndex;
    delete oldReview.choiceFigureIndex;
    expect(problemSchema.parse(old).choiceFigureIndex).toEqual([]);
    expect(reviewConsoleRowSchema.parse(oldReview).choiceFigureIndex).toEqual(
      [],
    );
  });

  it("인쇄 매퍼와 통합 조회가 연결을 싣는다", () => {
    expect(toPrintProblem(row, 1).choiceFigureIndex).toEqual(
      p.choiceFigureIndex,
    );
    expect(UNIFIED_PROBLEM_SELECT.choiceFigureIndex).toBe(true);
    expect(toBankProblem(row).choiceFigureIndex).toEqual(p.choiceFigureIndex);
  });

  it("옛 저장본을 다시 열 수 있고 새 저장본의 연결은 끝까지 유지된다", () => {
    const source = {
      ...p,
      solution: "",
      grade: "중3",
      chapter: "",
      section: "",
      difficulty: "기본",
      problemCode: "",
      figureSvg: null,
    };
    const restored = parseImport({
      version: 1,
      title: "보기 그림",
      problems: [source],
    });
    expect(restored.problems[0]!.choiceFigureIndex).toEqual(
      p.choiceFigureIndex,
    );
    const old: Partial<typeof source> = { ...source };
    delete old.choiceFigureIndex;
    expect(
      parseImport({ version: 1, title: "옛 저장본", problems: [old] })
        .problems[0]!.choiceFigureIndex ?? [],
    ).toEqual([]);
  });

  it("일반 카드·발췌·검수 콘솔도 실제로 보기 칸 안에 그림을 받는다", () => {
    const problem = problemSchema.parse(
      serializeProblem(row as unknown as Problem),
    );
    const reviewed = reviewConsoleRowSchema.parse(
      toConsoleRow(row as unknown as ProblemWithUnit),
    );
    for (const view of [
      <ProblemCard key="card" problem={problem} />,
      <ProblemExcerpt key="excerpt" problem={problem} />,
      <ReviewConsole
        key="review"
        queues={[
          {
            key: "figure",
            label: "그림",
            why: "보기 그림",
            look: "번호와 그림",
            remaining: 3,
          },
        ]}
        initialKey="figure"
        initialRows={Array(3).fill(reviewed)}
        reviewedByMe={0}
      />,
    ]) {
      const { container, unmount } = render(view);
      expect(container.querySelectorAll("[data-hwpx-grid] img")).toHaveLength(
        5,
      );
      unmount();
    }
  });
});
