import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import type { StudioProblem } from "@/components/unified/types";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
} from "@/components/unified/draftStore";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType }>) => {
    const Component = lazy(loader);
    return function Dynamic(props: object) {
      return (
        <Suspense fallback={null}>
          <Component {...props} />
        </Suspense>
      );
    };
  },
}));
vi.mock("@/components/unified/useDevAi", () => ({
  DevAiProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/unified/DevAiStatusPanel", () => ({
  default: () => null,
}));
vi.mock("@/components/exam-builder/MathExamBuilder", () => ({
  default: ({
    editor,
    onQuestionsChange,
  }: {
    editor: { selected: StudioProblem[] };
    onQuestionsChange: (problems: StudioProblem[]) => void;
  }) => (
    <>
      <h2>문제은행 열림</h2>
      <output aria-label="시험지 구성 문항">
        {editor.selected.map((item) => item.id).join(",")}
      </output>
      <button
        onClick={() =>
          onQuestionsChange([
            ...editor.selected,
            {
              id: "locked",
              content: "출제 잠금",
              answer: "1",
              solution: "해설",
              grade: "중1",
              chapter: "수와 연산",
              section: "정수와 유리수",
              difficulty: "중",
              problemCode: "LOCKED-1",
              figureUrls: [],
              figureSvg: null,
              figureDims: [],
              figureSourceMm: [],
              eligible: false,
              ineligibleReason: "출제가 잠긴 문항입니다.",
            },
          ])
        }
      >
        잠긴 문제 담기 검증
      </button>
    </>
  ),
}));
vi.mock("@/components/unified/StudioView", () => ({
  default: ({
    stepRequest,
    importRequest,
  }: {
    stepRequest?: { id: number; step: string };
    importRequest?: { files: File[] };
  }) => (
    <p>
      자료 작업실 열림: 단계{" "}
      {stepRequest ? `${stepRequest.step} ${stepRequest.id}` : "없음"} · 파일{" "}
      {importRequest?.files.length ?? 0}
    </p>
  ),
}));
vi.mock("@/components/unified/print/WorksheetPrint", () => ({
  WorksheetPrint: () => <p>시험지 미리보기</p>,
}));
const initialData = {
  problems: [],
  total: 0,
  page: 1,
  pageSize: 20,
  grades: [],
  chapters: [],
};
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/#export");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdom 은 `showModal()` 이 없다 — 저장한 시험지 삭제 확인이 모달 창이다(2026-09-19).
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
function seed() {
  const store = createWorkspaceDraftStore();
  store.hydrate();
  store.importDraft({
    version: 1,
    title: "저장한 시험지",
    problems: [{ id: "p1", content: "1+1" }],
    columns: 1,
    answers: false,
  });
  return store.getSnapshot().draft.id;
}

describe("workspace action wiring", () => {
  it("rejects ineligible bank rows at the workspace selection boundary", async () => {
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /문제은행에서 담기/ }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "잠긴 문제 담기 검증" }),
    );
    expect(screen.getByLabelText("시험지 구성 문항")).toBeEmptyDOMElement();
    // 옆 메뉴에 «시험지 · 내보내기» 줄이 없다(원장님 2026-10-01) — 옆 «현재 시험지 · 편집 이어가기»로
    fireEvent.click(screen.getByRole("button", { name: /편집 이어가기/ }));
    expect(
      await screen.findByRole("button", { name: /문제은행에서 담기/ }),
    ).toBeVisible();
  });
  it("opens the bank from the empty worksheet", async () => {
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /문제은행에서 담기/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "문제은행 열림" }),
    ).toBeVisible();
    expect(location.hash).toBe("#bank");
  });
  it("opens the source picker and delivers the chosen files to Studio", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "자료 가져오기" }),
    );
    expect(click).toHaveBeenCalledOnce();
    const input = click.mock.instances[0] as HTMLInputElement;
    expect(input.accept).toMatch(/pdf/);
    fireEvent.change(input, {
      target: {
        files: [new File(["fixture"], "page.png", { type: "image/png" })],
      },
    });
    expect(
      await screen.findByText("자료 작업실 열림: 단계 없음 · 파일 1"),
    ).toBeVisible();
    expect(location.hash).toBe("#studio");
  });
  it("opens a JSON picker when there is no saved work and imports the selected worksheet", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "저장한 작업 불러오기" }),
    );
    expect(click).toHaveBeenCalledOnce();
    const input = click.mock.instances[0] as HTMLInputElement;
    expect(input.accept).toMatch(/json/);
    const value = {
      version: 1,
      title: "파일로 가져온 시험지",
      problems: [{ id: "p1", content: "1+1" }],
      columns: 1,
      answers: false,
    };
    const file = new File([JSON.stringify(value)], "worksheet.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => JSON.stringify(value),
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(
      await screen.findByDisplayValue("파일로 가져온 시험지"),
    ).toBeVisible();
  });
  // 원장님 2026-09-21 안 A — 「이전 검토 단계」 단추를 없애고 단계 탭 「OCR · 디지털화」가 그 일을 한다.
  it("restores a saved worksheet and requests the review step on each tab press", async () => {
    seed();
    const store = createWorkspaceDraftStore();
    store.hydrate();
    store.createDraft();
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "저장한 작업 불러오기" }),
    );
    expect(await screen.findByDisplayValue("저장한 시험지")).toBeVisible();
    const reviewTab = () =>
      within(
        screen.getByRole("navigation", { name: "제작 단계 이동" }),
      ).getByRole("button", { name: /^OCR · 디지털화/ });
    fireEvent.click(reviewTab());
    expect(
      await screen.findByText("자료 작업실 열림: 단계 review 1 · 파일 0"),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /편집 이어가기/ }));
    fireEvent.click(reviewTab());
    // 같은 밀리초에 두 번 눌러도 둘째가 묻히지 않는다 — 요청 번호가 셈이라서.
    expect(
      await screen.findByText("자료 작업실 열림: 단계 review 2 · 파일 0"),
    ).toBeVisible();
  });
  it("renames, opens and confirms deletion from the library board", async () => {
    const id = seed();
    window.history.replaceState(null, "", "/#library");
    render(<UnifiedWorkspace initialData={initialData} />);
    const rename = await screen.findByRole("button", {
      name: "저장한 시험지 이름 변경",
    });
    const card = rename.closest("tr")!;
    fireEvent.click(rename);
    // 이름 변경도 겹쳐 뜨는 창이다(2026-09-19) — 카드 안에는 입력칸이 없다.
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    const renameDialog = screen.getByRole("dialog", { name: "이름 변경" });
    fireEvent.change(
      within(renameDialog).getByRole("textbox", { name: "새 시험지 이름" }),
      { target: { value: "이름 바꾼 시험지" } },
    );
    fireEvent.click(
      within(renameDialog).getByRole("button", { name: "이름 저장" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "이름 변경" }),
    ).not.toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "이름 바꾼 시험지 편집" }),
    ).toBeVisible();
    expect(
      JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!).drafts.find(
        (draft: { id: string }) => draft.id === id,
      ).title,
    ).toBe("이름 바꾼 시험지");
    fireEvent.click(
      within(card).getByRole("button", { name: "이름 바꾼 시험지 편집" }),
    );
    expect(await screen.findByDisplayValue("이름 바꾼 시험지")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "내 시험지" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "이름 바꾼 시험지 삭제" }),
    );
    expect(
      JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!).drafts,
    ).toHaveLength(1);
    const confirm = screen.getByRole("dialog", {
      name: "‘이름 바꾼 시험지’ 시험지를 삭제할까요?",
    });
    fireEvent.click(within(confirm).getByRole("button", { name: "삭제 확인" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "이름 바꾼 시험지 편집" }),
      ).not.toBeInTheDocument(),
    );
    expect(JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!).drafts).toEqual(
      [],
    );
  });
});
