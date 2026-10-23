import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createLocalCommercialWorkbookSource,
  COMMERCIAL_WORKBOOK_DEMO_ROSTER,
} from "@/lib/commercialWorkbooks/local";
import WorkbookImport from "@/components/commercial-workbooks/WorkbookImport";
import WorkbookAssignmentForm from "@/components/commercial-workbooks/WorkbookAssignmentForm";
import WorkbookGrading from "@/components/commercial-workbooks/WorkbookGrading";
import WorkbookWrongNotes from "@/components/commercial-workbooks/WorkbookWrongNotes";
import CommercialWorkbookWorkspace from "@/components/commercial-workbooks/CommercialWorkbookWorkspace";
import { ReferencePage } from "@/components/commercial-workbooks/WorkbookReferencePrint";
import { addressLabel } from "@/components/commercial-workbooks/presentation";
import type { WorkbookWrongNotePrint } from "@/contracts/commercialWorkbook.contract";

vi.mock("@/components/paper-strip/PaperStrip", () => ({
  PaperStrip: ({
    pages,
  }: {
    pages: { key: string; node: React.ReactNode }[];
  }) => (
    <div>
      {pages.map((page) => (
        <div key={page.key}>{page.node}</div>
      ))}
    </div>
  ),
}));

async function fixture() {
  const source = createLocalCommercialWorkbookSource();
  const books = await source.listCatalog();
  const book = await source.getEdition(books[0].id);
  const assignment = (await source.listAssignments())[0];
  return { source, book, assignment };
}

describe("commercial workbook teacher UI", () => {
  it("preserves answer-source page provenance when revising an existing table", async () => {
    const { source, book } = await fixture();
    const current = await source.reviseEdition(book.id, {
      requestId: "source-page-fixture",
      expectedRevision: book.revision,
      provenance: book.provenance,
      exercises: book.exercises.map((item) => ({
        address: item.address,
        key: item.key ? { ...item.key, sourcePage: 9 } : null,
      })),
    });
    const saved = vi.fn();
    render(
      <WorkbookImport source={source} existing={current} onSaved={saved} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "가져오기 검토" }));
    expect(
      screen.getByRole("columnheader", { name: "정답 자료 쪽" }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByLabelText(
        "판본·문항 주소·정답 및 표시한 검토 상태를 확인했습니다.",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "새 정답 개정 저장" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(
      (await source.getEdition(book.id)).exercises[0].key?.sourcePage,
    ).toBe(9);
  });
  it("shows actual registered coverage and preserves catalog search across work views", async () => {
    const { source } = await fixture();
    render(<CommercialWorkbookWorkspace source={source} demo />);
    expect(await screen.findByText("직접 만든 연습 교재 · 예시")).toBeVisible();
    expect(
      screen.getByText("등록 5문항 · 검토한 정답 3개 · 미확보 1개"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("교재 찾기"), {
      target: { value: "없는 판본" },
    });
    expect(screen.getByText("조건에 맞는 교재가 없습니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "과제 · 채점" }));
    fireEvent.click(screen.getByRole("button", { name: "교재 정답" }));
    expect(screen.getByLabelText("교재 찾기")).toHaveValue("없는 판본");
    expect(screen.getByText("로컬 체험")).toBeVisible();
  });

  it("rejects duplicate import addresses, then saves only explicitly reviewed metadata and rows", async () => {
    const source = createLocalCommercialWorkbookSource({ seed: false });
    const create = vi.spyOn(source, "createEdition");
    const saved = vi.fn();
    render(<WorkbookImport source={source} onSaved={saved} />);
    for (const [label, value] of [
      ["교재명", "우리 연습장"],
      ["출판사", "직접 작성"],
      ["정확한 판본 · 발행연도", "2026 1판"],
      ["학년", "초5"],
      ["출처와 검토 근거", "교사가 직접 작성하고 확인한 예시 정답"],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.change(screen.getByLabelText("정답표 붙여넣기"), {
      target: {
        value:
          "page,number,answerText,keyStatus\n10,01,7,reviewed\n10,01,8,reviewed",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "가져오기 검토" }));
    expect(screen.getByRole("alert")).toHaveTextContent("중복 문항 주소");
    expect(create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("정답표 붙여넣기"), {
      target: {
        value: "page,number,answerText,keyStatus\n10,01,7,reviewed\n11,01,,",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "가져오기 검토" }));
    expect(screen.getByText("정답 미확보 1개")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "교재와 정답표 저장" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(
        "판본·문항 주소·정답 및 표시한 검토 상태를 확인했습니다.",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "교재와 정답표 저장" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const actual = (await source.listCatalog())[0];
    expect(actual.metadata.edition).toBe("2026 1판");
    expect(actual.reviewedKeyCount).toBe(1);
    expect(actual.missingKeyCount).toBe(1);
  });

  it("requires exact exercises and explicit recipients, and sends the selected class and due date", async () => {
    const { source, book } = await fixture();
    const create = vi.spyOn(source, "createAssignment");
    const saved = vi.fn();
    render(
      <WorkbookAssignmentForm source={source} book={book} onSaved={saved} />,
    );
    await screen.findByRole("option", { name: "예시 수학반" });
    const button = screen.getByRole("button", {
      name: "선택한 학생에게 과제 배정",
    });
    fireEvent.click(
      screen.getByLabelText(addressLabel(book.exercises[0].address)),
    );
    fireEvent.change(screen.getByLabelText("배정할 반"), {
      target: { value: COMMERCIAL_WORKBOOK_DEMO_ROSTER[0].id },
    });
    expect(screen.getByLabelText("예시 학생 가")).not.toBeChecked();
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText("예시 학생 가"));
    fireEvent.change(screen.getByLabelText("제출 기한 (선택 · 한국 시간)"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.click(button);
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toMatchObject({
      classId: COMMERCIAL_WORKBOOK_DEMO_ROSTER[0].id,
      studentIds: [COMMERCIAL_WORKBOOK_DEMO_ROSTER[0].students[0].id],
      exerciseIds: [book.exercises[0].id],
      dueAt: "2026-11-01T14:59:00.000Z",
    });
  });

  it("persists partial teacher marks and leaves unanswered items ungraded after a reload", async () => {
    const { source, assignment } = await fixture();
    const student = assignment.targets[1];
    const { unmount } = render(
      <WorkbookGrading
        source={source}
        initial={assignment}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByLabelText("채점할 학생")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("채점할 학생"), {
      target: { value: student.studentId },
    });
    const row = screen.getByRole("group", {
      name: `${addressLabel(assignment.exercises[0].address)} 채점`,
    });
    fireEvent.click(within(row).getByRole("button", { name: "오답" }));
    fireEvent.click(screen.getByRole("button", { name: "채점 저장" }));
    await screen.findByText(`${student.studentName} · 채점 저장됨`);
    const saved = await source.getAssignment(assignment.id);
    expect(saved.targets[1].marks).toEqual({
      [assignment.exercises[0].id]: "wrong",
    });
    unmount();
    render(
      <WorkbookGrading source={source} initial={saved} onSaved={() => {}} />,
    );
    fireEvent.change(screen.getByLabelText("채점할 학생"), {
      target: { value: student.studentId },
    });
    expect(screen.getByText("미채점 4")).toBeVisible();
    expect(
      within(
        screen.getByRole("group", {
          name: `${addressLabel(assignment.exercises[0].address)} 채점`,
        }),
      ).getByRole("button", { name: "오답" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await source.listWrongNotes({ studentId: student.studentId }),
    ).toHaveLength(1);
  });

  it("retains a conflicting mark until latest comparison and explicit confirmation", async () => {
    const { source, assignment } = await fixture();
    const student = assignment.targets[1];
    render(
      <WorkbookGrading
        source={source}
        initial={assignment}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("채점할 학생"), {
      target: { value: student.studentId },
    });
    const row = screen.getByRole("group", {
      name: `${addressLabel(assignment.exercises[0].address)} 채점`,
    });
    fireEvent.click(within(row).getByRole("button", { name: "오답" }));
    await source.saveMarks(assignment.id, {
      requestId: "external-change",
      studentId: student.studentId,
      expectedRevision: 0,
      marks: [{ exerciseId: assignment.exercises[0].id, mark: "correct" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "채점 저장" }));
    await screen.findByRole("button", { name: "최신 저장본 비교" });
    expect(within(row).getByRole("button", { name: "오답" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "채점 저장" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "최신 저장본 비교" }));
    await screen.findByText("최신 저장본: 정답 / 내 입력: 오답");
    fireEvent.click(
      screen.getByRole("button", { name: "최신본 확인 · 내 입력 유지" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "채점 저장" }));
    await screen.findByText(`${student.studentName} · 채점 저장됨`);
    expect(
      (await source.getAssignment(assignment.id)).targets[1].history,
    ).toHaveLength(2);
  });

  it("persists correction memo and done state without replacing the first wrong event", async () => {
    const { source } = await fixture();
    const note = (await source.listWrongNotes())[0];
    const { unmount } = render(
      <WorkbookWrongNotes source={source} refreshVersion={0} />,
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: new RegExp(
          `${note.studentName} · ${note.edition.metadata.title}`.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          ),
        ),
      }),
    );
    fireEvent.change(screen.getByLabelText("교정 · 복습 메모"), {
      target: { value: "단위를 적고 다시 확인하기" },
    });
    fireEvent.change(screen.getAllByLabelText("복습 상태")[1], {
      target: { value: "done" },
    });
    fireEvent.click(screen.getByRole("button", { name: "오답노트 저장" }));
    await screen.findByText(/오답노트 저장됨/);
    const saved = (await source.listWrongNotes())[0];
    expect(saved.originalWrongEvent).toEqual(note.originalWrongEvent);
    expect(saved.status).toBe("done");
    unmount();
    render(<WorkbookWrongNotes source={source} refreshVersion={1} />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /예시 학생 가 · 직접 만든 연습 교재/,
      }),
    );
    expect(screen.getByLabelText("교정 · 복습 메모")).toHaveValue(
      "단위를 적고 다시 확인하기",
    );
    expect(screen.getAllByLabelText("복습 상태")[1]).toHaveValue("done");
  });

  it("keeps answer and correction memo out of student reference pages, labels teacher answers explicitly", async () => {
    const { source } = await fixture();
    const note = (await source.listWrongNotes())[0];
    const plan = await source.getWrongNotePrint({ noteIds: [note.id] });
    const item: WorkbookWrongNotePrint["items"][number] = {
      ...plan.items[0],
      correctionText: "private correction",
      answerText: "secret-answer",
      keyStatus: "unreviewed",
    };
    const { rerender } = render(
      <ReferencePage item={item} page={1} total={1} includesAnswers={false} />,
    );
    expect(screen.getByText(/원문 문제는 포함하지 않습니다/)).toBeVisible();
    expect(
      screen.queryByText(/secret-answer|private correction/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("학생용 · 정답 미포함 · 1 / 1")).toBeVisible();
    rerender(<ReferencePage item={item} page={1} total={1} includesAnswers />);
    expect(
      screen.getByText("교사용 정답: secret-answer · 검토 전"),
    ).toBeVisible();
  });
});
