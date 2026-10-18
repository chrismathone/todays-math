import { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BankView from "@/components/unified/BankView";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
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

const problem = (id: string, difficulty = "기본"): BankProblem => ({
  id,
  content: `${id} 문제 본문`,
  difficulty,
  grade: "중1",
  chapter: "수와 연산",
  section: "정수",
  answer: "1",
  solution: "풀이",
  problemCode: id,
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  familyKey: null,
  originProblemId: null,
  questionTypeRaw: "단답형",
  eligible: true,
});
const first = problem("first");
const second = problem("second");
const third = problem("third");
const candidate = problem("candidate");
const remote = problem("remote");
const data: BankData = {
  countUnit: "question",
  version: 2,
  queryKey: "fixture",
  problems: [first, candidate],
  total: 30,
  page: 1,
  pageSize: 12,
  grades: [{ grade: "중1", count: 30 }],
  chapters: ["수와 연산"],
};
const ratio = (values: Partial<DifficultyRatio> = {}): DifficultyRatio => ({
  연산: 0,
  기본: 0,
  응용: 0,
  심화하: 0,
  심화중: 0,
  심화상: 0,
  ...values,
});
const mutations = vi.fn();
const toggles = vi.fn();
let resolveRandom: (response: Response) => void;
let randomInit: RequestInit;
let randomUrl: string;
const nativeMethods = [
  [HTMLElement.prototype, "scrollIntoView"],
  [HTMLDialogElement.prototype, "showModal"],
  [HTMLDialogElement.prototype, "close"],
] as const;
const originalMethods = nativeMethods.map(([prototype, key]) =>
  Object.getOwnPropertyDescriptor(prototype, key),
);

beforeEach(() => {
  mutations.mockClear();
  toggles.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
      this.querySelector<HTMLButtonElement>("button")?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/random")) {
        randomInit = init!;
        randomUrl = url;
        return new Promise<Response>((resolve) => {
          resolveRandom = resolve;
        });
      }
      const params = new URL(url, "http://localhost").searchParams;
      return Response.json({ ...data, page: Number(params.get("page") || 1) });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  nativeMethods.forEach(([prototype, key], index) => {
    const original = originalMethods[index];
    if (original) Object.defineProperty(prototype, key, original);
    else Reflect.deleteProperty(prototype, key);
  });
});

function Harness({
  initial = [first, second, third],
  initialData = data,
}: {
  initial?: StudioProblem[];
  initialData?: BankData;
}) {
  const [selected, setSelected] = useState(initial);
  return (
    <>
      <output aria-label="선택 순서">
        {selected.map(({ id }) => id).join(",")}
      </output>
      <button onClick={() => setSelected([third])}>외부 선택 변경</button>
      <BankView
        initialData={initialData}
        selected={selected}
        onToggle={toggles}
        onSelectionChange={(next) => {
          mutations(next);
          setSelected(next);
        }}
        onExport={vi.fn()}
      />
    </>
  );
}
function openRandom(counts = ratio({ 기본: 2, 응용: 2 })) {
  fireEvent.click(screen.getByRole("button", { name: /난이도별 랜덤 추가/ }));
  for (const tier of DIFFICULTY_LADDER)
    fireEvent.change(
      screen.getByRole("spinbutton", { name: `${tier} 문항 수` }),
      { target: { value: counts[tier] } },
    );
}
function startRandom() {
  fireEvent.click(screen.getByRole("button", { name: /^\d+문항 랜덤 추가$/ }));
}
function selectedIds() {
  return screen.getByLabelText("선택 순서").textContent;
}
function openBasket() {
  fireEvent.click(screen.getByRole("button", { name: "담은 문제 목록 보기" }));
}
async function openPreview(number: number) {
  await userEvent.click(
    screen.getByRole("button", { name: `${number}번 담은 문제 미리보기` }),
  );
  return screen.getByRole("dialog", { name: `${number}번 문제 미리보기` });
}

describe("exam builder selection", () => {
  it("keeps custom difficulty counts when the random panel is folded", () => {
    render(<Harness />);
    openRandom(ratio({ 기본: 7 }));
    fireEvent.click(screen.getByRole("button", { name: /난이도별 랜덤 추가/ }));
    expect(
      screen.queryByRole("spinbutton", { name: "기본 문항 수" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /난이도별 랜덤 추가/ }));
    expect(
      screen.getByRole("spinbutton", { name: "기본 문항 수" }),
    ).toHaveValue(7);
  });

  it("reports zero availability without changing the existing selection", async () => {
    render(<Harness />);
    openRandom(ratio({ 심화상: 3 }));
    startRandom();
    await act(async () =>
      resolveRandom(
        Response.json({
          countUnit: "question",
          problems: [],
          available: ratio(),
          counts: ratio(),
        }),
      ),
    );
    expect(selectedIds()).toBe("first,second,third");
    expect(mutations).not.toHaveBeenCalled();
    expect(screen.getByText("요청 3문항 중 0문항을 추가했어요.")).toBeVisible();
    expect(
      screen.getByText(/심화상: 요청 3 · 추가 0 · 부족 3문항/),
    ).toBeVisible();
  });
  it("requests the entire filtered pool, removes page/difficulty, appends once and reports tier shortages", async () => {
    render(<Harness initial={[first]} />);
    fireEvent.change(screen.getByRole("combobox", { name: "학년" }), {
      target: { value: "중1" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "상세 필터" }));
    fireEvent.change(screen.getByRole("combobox", { name: "난이도" }), {
      target: { value: "심화상" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
    );
    openRandom();
    startRandom();
    expect(randomUrl).toBe("/api/studio/problems/random");
    expect(randomInit.method).toBe("POST");
    const body = JSON.parse(String(randomInit.body));
    expect(body.identity).toBe("question");
    expect(Object.fromEntries(new URLSearchParams(body.filters))).toEqual({
      identity: "question",
      grade: "중1",
    });
    expect(body.counts).toEqual(ratio({ 기본: 2, 응용: 2 }));
    expect(body.excludeIds).toEqual(["first"]);
    expect(
      screen.getByRole("button", { name: "문제를 고르는 중…" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "이 페이지 전체 담기" }),
    ).toBeDisabled();
    await act(async () =>
      resolveRandom(
        Response.json({
          countUnit: "question",
          problems: [
            first,
            remote,
            remote,
            { ...candidate, eligible: false },
            problem("wrong-tier", "심화상"),
          ],
          available: ratio({ 기본: 1 }),
          counts: ratio({ 기본: 1 }),
        }),
      ),
    );
    expect(selectedIds()).toBe("first,remote");
    expect(mutations).toHaveBeenCalledTimes(1);
    expect(toggles).not.toHaveBeenCalled();
    expect(screen.getByText("요청 4문항 중 1문항을 추가했어요.")).toBeVisible();
    expect(
      screen.getByText(/기본: 요청 2 · 추가 1 · 부족 1문항/),
    ).toBeVisible();
    expect(
      screen.getByText(/응용: 요청 2 · 추가 0 · 부족 2문항/),
    ).toBeVisible();
  });

  it("keeps selection on request failure and allows retry", async () => {
    render(<Harness />);
    openRandom();
    startRandom();
    await act(async () =>
      resolveRandom(Response.json({ error: "연결 실패" }, { status: 503 })),
    );
    expect(selectedIds()).toBe("first,second,third");
    expect(mutations).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("연결 실패");
    startRandom();
    await act(async () =>
      resolveRandom(
        Response.json({
          countUnit: "question",
          problems: [remote],
          available: ratio({ 기본: 1 }),
          counts: ratio({ 기본: 1 }),
        }),
      ),
    );
    expect(selectedIds()).toBe("first,second,third,remote");
  });

  it("preserves the latest same-draft edits while random selection is pending", async () => {
    render(<Harness />);
    openRandom(ratio({ 기본: 1 }));
    startRandom();
    fireEvent.click(screen.getByRole("button", { name: "외부 선택 변경" }));
    await act(async () =>
      resolveRandom(
        Response.json({
          countUnit: "question",
          problems: [remote],
          available: ratio({ 기본: 1 }),
          counts: ratio({ 기본: 1 }),
        }),
      ),
    );
    expect(selectedIds()).toBe("third,remote");
  });

  it("aborts on unmount so a switched draft never receives a late response", async () => {
    const view = render(<Harness />);
    openRandom();
    startRandom();
    view.unmount();
    expect((randomInit.signal as AbortSignal).aborted).toBe(true);
    await act(async () =>
      resolveRandom(
        Response.json({
          countUnit: "question",
          problems: [remote],
          available: ratio({ 기본: 1 }),
          counts: ratio({ 기본: 1 }),
        }),
      ),
    );
    expect(mutations).not.toHaveBeenCalled();
  });

  it("keeps the basket collapsed and its expanded list number-only; preview closes and restores focus", async () => {
    render(<Harness />);
    expect(
      screen.getByRole("heading", { name: "시험지 만들기" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "담은 문제 목록 보기" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("list", { name: "담은 문제 번호" }),
    ).not.toBeInTheDocument();
    openBasket();
    const list = screen.getByRole("list", { name: "담은 문제 번호" });
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["1", "2", "3"]);
    expect(list).not.toHaveTextContent("수와 연산");
    const button = within(list).getByRole("button", {
      name: "2번 담은 문제 미리보기",
    });
    let dialog = await openPreview(2);
    expect(within(dialog).getByText("second 문제 본문")).toBeVisible();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    dialog = await openPreview(2);
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    fireEvent.keyDown(
      screen.getByRole("complementary", { name: "담은 문제" }),
      { key: "Escape" },
    );
    expect(
      screen.getByRole("button", { name: "담은 문제 목록 보기" }),
    ).toHaveFocus();
  });

  it("replaces exactly the chosen position, blocks already selected candidates, and supports manual extra add", async () => {
    render(<Harness />);
    openBasket();
    const dialog = await openPreview(2);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "이 문제 교체" }),
    );
    expect(screen.getByText("2번 문제 교체 중")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "1번 문제 담기 취소" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "2번 문제 이 문제로 교체" }),
    );
    expect(selectedIds()).toBe("first,candidate,third");
    expect(mutations).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("2번 문제 교체 중")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 담기 취소" }));
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 담기" }));
    expect(selectedIds()).toBe("candidate,third,first");
  });

  it("cancels replacement without changing the selection, reorders in preview and removes with focus fallback", async () => {
    render(<Harness />);
    openBasket();
    let dialog = await openPreview(2);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "이 문제 교체" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "교체 취소" }));
    expect(selectedIds()).toBe("first,second,third");
    expect(mutations).not.toHaveBeenCalled();
    openBasket();
    dialog = await openPreview(2);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "문제 순서 앞으로" }),
    );
    expect(selectedIds()).toBe("second,first,third");
    expect(
      screen.getByRole("dialog", { name: "1번 문제 미리보기" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "문제 순서 앞으로" }),
    ).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "담기 취소" }));
    expect(selectedIds()).toBe("first,third");
    expect(
      screen.getByRole("button", { name: "담은 문제 목록 닫기" }),
    ).toHaveFocus();
  });

  it("rejects totals outside 1..100 and scales allocation with the total", () => {
    render(<Harness />);
    openRandom(ratio());
    expect(
      screen.getByRole("button", { name: "0문항 랜덤 추가" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "기본 문항 수" }), {
      target: { value: 100 },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "응용 문항 수" }), {
      target: { value: 1 },
    });
    expect(
      screen.getByRole("button", { name: "101문항 랜덤 추가" }),
    ).toBeDisabled();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "추가할 문항 수 문항" }),
      { target: { value: 20 } },
    );
    const sum = DIFFICULTY_LADDER.reduce(
      (sum, tier) =>
        sum +
        Number(
          (
            screen.getByRole("spinbutton", {
              name: `${tier} 문항 수`,
            }) as HTMLInputElement
          ).value,
        ),
      0,
    );
    expect(sum).toBe(20);
    expect(
      screen.getByRole("button", { name: "20문항 랜덤 추가" }),
    ).toBeEnabled();
  });

  it("rejects duplicate page additions and preserves selections across pages", async () => {
    render(
      <Harness
        initial={[first]}
        initialData={{ ...data, problems: [first, candidate, candidate] }}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "이 페이지 전체 담기" }),
    );
    expect(selectedIds()).toBe("first");
    expect(mutations).not.toHaveBeenCalled();
    expect(
      screen.getByText(/같은 문항은 한 번만 담을 수 있습니다/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
    );
    expect(selectedIds()).toBe("first");
  });
});
