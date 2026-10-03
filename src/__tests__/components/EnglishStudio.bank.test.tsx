import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import EnglishStudio from "@/components/english/EnglishStudio";
import type { EnglishBankMakerSeed } from "@/contracts/englishBank.contract";
import type { EnglishExam } from "@/contracts/english.contract";
import { ENGLISH_EXAM_A_ID, ENGLISH_EXAM_B_ID } from "@/mocks/handlers/english";

vi.mock("@/components/english/EnglishMakerView", () => ({
  default: function MakerProbe({
    exam,
    bankSeed,
    onBankSeedAccepted,
    onBankSeedHandled,
  }: {
    exam: EnglishExam;
    bankSeed?: EnglishBankMakerSeed;
    onBankSeedAccepted?: (examId: string) => void;
    onBankSeedHandled?: (requestId: string) => void;
  }) {
    return (
      <div>
        <span data-testid="maker-exam">{exam.id}</span>
        {bankSeed && (
          <>
            <button
              onClick={() => {
                onBankSeedAccepted?.(bankSeed.examId);
                onBankSeedHandled?.(bankSeed.requestId);
              }}
            >
              은행 지문 적용
            </button>
            <button onClick={() => onBankSeedHandled?.(bankSeed.requestId)}>
              기존 입력 유지
            </button>
          </>
        )}
      </div>
    );
  },
}));

const seed: EnglishBankMakerSeed = {
  requestId: "10000000-0000-4000-8000-000000000021",
  examId: ENGLISH_EXAM_B_ID,
  path: "cloze",
  passageRef: {
    passageId: "10000000-0000-4000-8000-000000000022",
    textRevision: 1,
    snapshotHash: "a".repeat(64),
  },
  title: "은행 원문",
  text: "Students learn together in the school garden.",
};
beforeEach(() => localStorage.clear());
function setup(bankSeed = seed) {
  const handled = vi.fn();
  const notice = vi.fn();
  render(
    <EnglishStudio
      view="english-maker"
      allowedMenus={["english-maker", "english-bank"]}
      newExamOpen={false}
      onNavigate={vi.fn()}
      onNewExam={vi.fn()}
      onNewExamClose={vi.fn()}
      onSetOpened={vi.fn()}
      bankSeed={bankSeed}
      onBankSeedHandled={handled}
      onNotice={notice}
    />,
  );
  return { handled, notice };
}
describe("EnglishStudio bank target handoff", () => {
  it("leaves the loading state when target validation cannot reach the server", async () => {
    server.use(
      http.get("/api/english/exams", () =>
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "시험 목록 연결 실패" } },
          { status: 503 },
        ),
      ),
    );
    const { handled } = setup();
    await waitFor(() => expect(handled).toHaveBeenCalledWith(seed.requestId));
    expect(screen.getByText("시험 목록 연결 실패")).toBeVisible();
    expect(screen.queryByText("시험 목록을 불러오는 중입니다…")).toBeNull();
  });
  it("switches the target exam only when the maker accepts the seed", async () => {
    const { handled } = setup();
    const apply = await screen.findByRole("button", { name: "은행 지문 적용" });
    expect(screen.getByTestId("maker-exam")).toHaveTextContent(
      ENGLISH_EXAM_A_ID,
    );
    fireEvent.click(apply);
    expect(screen.getByTestId("maker-exam")).toHaveTextContent(
      ENGLISH_EXAM_B_ID,
    );
    expect(localStorage.getItem("today-english-exam")).toBe(ENGLISH_EXAM_B_ID);
    expect(handled).toHaveBeenCalledWith(seed.requestId);
  });
  it("preserves the old exam when replacing the input is cancelled", async () => {
    const { handled } = setup();
    fireEvent.click(
      await screen.findByRole("button", { name: "기존 입력 유지" }),
    );
    expect(screen.getByTestId("maker-exam")).toHaveTextContent(
      ENGLISH_EXAM_A_ID,
    );
    expect(handled).toHaveBeenCalledWith(seed.requestId);
  });
  it("rejects a stale target before exposing the seed to the maker", async () => {
    const { handled, notice } = setup({
      ...seed,
      examId: "10000000-0000-4000-8000-000000000099",
    });
    await waitFor(() => expect(handled).toHaveBeenCalledWith(seed.requestId));
    expect(notice).toHaveBeenCalledWith(
      expect.stringContaining("대상 시험"),
      "alert",
    );
    expect(screen.queryByRole("button", { name: "은행 지문 적용" })).toBeNull();
    expect(screen.getByTestId("maker-exam")).toHaveTextContent(
      ENGLISH_EXAM_A_ID,
    );
  });
});
