import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import { createWorkspaceDraftStore } from "@/components/unified/draftStore";

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
  default: () => null,
}));
vi.mock("@/components/unified/StudioView", () => ({ default: () => null }));
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
const FILE = "[경신중][2][25-2-중간][미래엔] (원본).pdf";

function problem(id: string, page: number, number: number) {
  return {
    id,
    content: `문항 ${id}`,
    grade: "중2",
    sourceLabel: `${FILE} · ${page}쪽`,
    ocr: {
      number,
      blocks: [],
      choiceGroups: [],
      subQuestions: [],
      confidence: "high",
      choicesLayout: "auto",
      bodyMissing: false,
      choicesMissing: false,
    },
    studioCrop: {
      id: `crop-${id}`,
      sourceId: "source-a",
      sourceLabel: FILE,
      page,
      rect: { x: 0, y: 0, width: 1, height: 1 },
      image: "data:image/png;base64,AA==",
      content: "",
      answer: "",
      solution: "",
      level: "secondary",
      grade: "중2",
      mode: "image",
      added: true,
    },
  };
}

function seed() {
  const store = createWorkspaceDraftStore();
  store.hydrate();
  const ok = store.importDraft({
    version: 1,
    title: "섞인 시험지",
    // 3쪽 1번 · 1쪽 2번 · 1쪽 5번 — 원본 차례가 아니다.
    problems: [problem("c", 3, 1), problem("a", 1, 2), problem("b", 1, 5)],
    columns: 1,
    answers: false,
  });
  if (!ok) throw new Error("검증용 시험지를 넣지 못했습니다.");
}

function orderNames() {
  return within(screen.getByRole("tabpanel", { name: /문제 순서/ }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("strong")?.textContent);
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/#export");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("순서 초기화", () => {
  it("원본의 쪽·번호 차례로 되돌리고 되돌리기를 남긴다", async () => {
    seed();
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(await screen.findByRole("tab", { name: /문제 순서/ }));
    expect(orderNames()).toEqual(["3쪽 1번", "1쪽 2번", "1쪽 5번"]);
    const reset = screen.getByRole("button", { name: "순서 초기화" });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    expect(orderNames()).toEqual(["1쪽 2번", "1쪽 5번", "3쪽 1번"]);
    expect(screen.getByRole("button", { name: "순서 초기화" })).toBeDisabled();
    expect(screen.getByText("문제를 원본 차례로 되돌렸습니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(orderNames()).toEqual(["3쪽 1번", "1쪽 2번", "1쪽 5번"]);
  });
});
