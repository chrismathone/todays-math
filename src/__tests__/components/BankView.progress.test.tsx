import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BankView from "@/components/unified/BankView";
import type {
  BankData,
  BankProblem,
  StudioProblem,
} from "@/components/unified/types";

vi.mock("@/components/unified/UnifiedProblem", () => ({
  default: ({ problem }: { problem: StudioProblem }) => (
    <p>{problem.content}</p>
  ),
}));

const initialData: BankData = {
  countUnit: "question",
  version: 2,
  queryKey: "fixture",
  problems: [],
  total: 0,
  page: 1,
  pageSize: 20,
  grades: [{ grade: "중1", count: 100 }],
  chapters: [],
};
const problem = (content: string): BankProblem => ({
  familyKey: null,
  originProblemId: null,
  questionTypeRaw: null,
  id: content,
  content,
  answer: "1",
  solution: "",
  grade: "중1",
  chapter: "수와 연산",
  section: "",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});
const requests: {
  resolve: (response: Response) => void;
  signal: AbortSignal;
}[] = [];

beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((resolve) => {
          requests.push({ resolve, signal: init.signal as AbortSignal });
        }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

function mount() {
  return render(
    <BankView
      initialData={initialData}
      initialFilters={{ q: "처음" }}
      selected={[]}
      onToggle={vi.fn()}
      onExport={vi.fn()}
    />,
  );
}

describe("problem bank waiting feedback", () => {
  it("keeps selection disabled while pending and ignores an older response", async () => {
    mount();
    expect(
      screen.getByRole("progressbar", { name: "문제를 찾고 있어요" }),
    ).not.toHaveAttribute("aria-valuenow");
    expect(
      screen.getByRole("checkbox", { name: "이 페이지 전체 담기" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "문제 검색" }), {
      target: { value: "다음" },
    });
    fireEvent.submit(screen.getByRole("search"));
    expect(requests).toHaveLength(2);
    expect(requests[0].signal.aborted).toBe(true);
    await act(async () =>
      requests[1].resolve(
        Response.json({
          ...initialData,
          problems: [problem("새 결과")],
          total: 1,
        }),
      ),
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("새 결과")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "이 페이지 전체 담기" }),
    ).toBeEnabled();
    await act(async () =>
      requests[0].resolve(
        Response.json({
          ...initialData,
          problems: [problem("오래된 결과")],
          total: 1,
        }),
      ),
    );
    expect(screen.queryByText("오래된 결과")).not.toBeInTheDocument();
    expect(screen.getByText("새 결과")).toBeInTheDocument();
  });

  it("replaces progress with an actionable error and starts a fresh wait on retry", async () => {
    mount();
    await act(async () =>
      requests[0].resolve(
        Response.json({ error: "연결이 끊겼습니다." }, { status: 503 }),
      ),
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("연결이 끊겼습니다.");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });
});
