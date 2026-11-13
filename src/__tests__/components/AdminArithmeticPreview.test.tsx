import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminDocumentPreview from "@/components/admin/AdminDocumentPreview";
import { accountDate } from "@/components/admin/AccountReview";
import type { DocumentDetail } from "@/components/admin/documentTypes";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
} from "@/contracts/arithmetic.contract";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
} from "@/contracts/arithmeticV2.contract";

const legacy = buildArithmeticSheet({
  engineVersion: ARITHMETIC_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_CATALOG_VERSION,
  seed: "admin-lazy-preview",
  rounds: [
    {
      skills: [
        {
          skillId: "times-table",
          count: 1,
          constraints: { dans: [3], multiplier: { min: 1, max: 9 } },
        },
      ],
    },
  ],
});
const grade = buildArithmeticV2Sheet({
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
  seed: "admin-lazy-preview",
  rounds: [{ allocations: [{ typeId: "m3-trig-special-length", count: 1 }] }],
});
const document: DocumentDetail = {
  id: "saved-arithmetic",
  kind: "arithmeticSheet",
  title: "저장한 연산",
  revision: 7,
  createdAt: "2026-11-13T03:00:00.000Z",
  updatedAt: "2026-11-14T03:00:00.000Z",
  payload: legacy,
};

// No lazy/component mocks: the entry must load and run the actual readers and papers.
describe("administrator arithmetic preview loading boundary", () => {
  it("announces loading, then preserves the saved v1 question, answer and metadata", async () => {
    render(<AdminDocumentPreview userId="teacher" document={document} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "연산 미리보기를 준비하고 있습니다.",
    );
    const questions = await screen.findByRole("region", { name: "문제지 1쪽" });
    const answers = screen.getByRole("region", { name: "정답지 2쪽" });
    expect(within(questions).getByLabelText("답란")).toBeInTheDocument();
    expect(questions.querySelector("annotation")?.textContent).toContain(
      "\\times",
    );
    expect(
      answers
        .querySelector("annotation")
        ?.textContent?.replace(/^\\displaystyle /, ""),
    ).toBe(legacy.rounds[0].items[0].answer);
    const heading = screen.getAllByRole("heading", { name: document.title })[0]
      .parentElement!;
    expect(heading).toHaveTextContent(
      `버전 7 · 수정 ${accountDate(document.updatedAt)}`,
    );
    expect(
      screen.getByText("저장된 식과 답을 그대로 표시합니다."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("opens the real v2 saved figure and exact answer without changing the snapshot", async () => {
    const before = structuredClone(grade);
    render(
      <AdminDocumentPreview
        userId="teacher"
        document={{ ...document, payload: grade }}
      />,
    );
    const questions = await screen.findByRole("region", { name: "문제지 1쪽" });
    const answers = screen.getByRole("region", { name: "정답지 2쪽" });
    expect(within(questions).getByRole("img")).toHaveAttribute(
      "src",
      arithmeticToStudioProblems(grade)[0].figureUrls[0],
    );
    expect(
      [...questions.querySelectorAll("annotation")].some((node) =>
        node.textContent?.includes("\\underline{\\hspace{2em}}"),
      ),
    ).toBe(true);
    expect(
      answers
        .querySelector("annotation")
        ?.textContent?.replace(/^\\displaystyle /, ""),
    ).toBe(grade.rounds[0].items[0].answer.latex);
    expect(grade).toEqual(before);
  });

  it.each([legacy, grade])(
    "keeps snapshot validation for payload v$payloadVersion after loading",
    async (payload) => {
      const invalid = structuredClone(payload);
      if (invalid.payloadVersion === 1)
        invalid.rounds[0].items[0].answer = "999999";
      else invalid.rounds[0].items[0].answer.latex = "999999";
      render(
        <AdminDocumentPreview
          userId="teacher"
          document={{ ...document, payload: invalid }}
        />,
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "저장된 연산 명세와 정답을 확인할 수 없습니다.",
      );
      expect(screen.queryByRole("region", { name: "문제지 1쪽" })).toBeNull();
    },
  );
});
