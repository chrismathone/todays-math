import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import {
  addToCart,
  forgetRemovals,
  reconcileStudioPageCart,
  rememberRemoval,
  removeAllFromCart,
  restoreToCart,
  type StudioCartRemoval,
} from "@/components/unified/studioCart";
import type { StudioProblem } from "@/components/unified/types";

/**
 * 담은 문항 — 진짜 작업실(원장님 2026-09-21 확정 안 D, 트랙 44).
 *
 * 부모는 `UnifiedWorkspace` 와 **같은 함수**(`studioCart.ts`)로 장부를 든다. 작업실의 «담음»·
 * «N문항 담기»·«담은 문항» 목록이 그 장부 하나에서 나오는지, 트랙 41 어긋남 1~4 가 사라졌는지,
 * 뺀 것을 한꺼번에 담기가 되넣지 않는지를 본다. 계산된 모양은 `e2e/cart-review` 가 브라우저에서 잰다.
 */

const saved: { current: Promise<unknown> } = { current: new Promise(() => {}) };
vi.mock("@/components/unified/studioSessionStore", () => ({
  StudioSessionStore: class {
    documentId = "doc-1";
    load = () => saved.current;
    save = () => Promise.resolve();
    clear = () => Promise.resolve();
    retain() {}
    release() {}
  },
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/math/editor/SourceEditorDisplay", () => ({
  SourceEditorDisplay: ({ value }: { value: string }) => <div>{value}</div>,
}));
vi.mock("@/components/math/editor/MathTextEditor", () => ({
  MathTextEditor: ({
    value,
    onChange,
    "aria-label": label,
  }: {
    value: string;
    onChange?: (value: string) => void;
    "aria-label"?: string;
  }) => (
    <textarea
      aria-label={label}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

function crop(id: string, patch: Partial<StudioCrop> = {}): StudioCrop {
  return {
    id,
    sourceId: "s1",
    sourceLabel: "예제",
    page: 1,
    rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
    image: "data:image/png;base64,Y3JvcA==",
    content: `본문 ${id}`,
    answer: "1",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "text",
    ...patch,
  };
}
const bank: StudioProblem = {
  id: "bank-1",
  content: "은행 문항",
  answer: "",
  solution: "",
  grade: "중1",
  chapter: "일차방정식",
  section: "일차방정식의 활용",
  difficulty: "중",
  problemCode: "B-1",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    new Proxy({}, { get: () => vi.fn() }) as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,c291cmNl",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise<Response>(() => {});
      return Response.json({
        enabled: true,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [
          {
            id: "codex",
            label: "Codex",
            status: "ready",
            detail: "사용 가능",
            image: true,
          },
        ],
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  saved.current = new Promise(() => {});
});

/** `UnifiedWorkspace` 의 장부 규칙 그대로 — `toggle`·`restoreRemoved`·`add`·새 시험지. */
function Workspace({
  initial = [],
  onExport,
  restoreRequest,
  exportRequest,
  active = true,
  canExport = true,
}: {
  initial?: StudioProblem[];
  onExport?: () => void;
  restoreRequest?: { id: number; crops: StudioCrop[] };
  exportRequest?: { id: number };
  active?: boolean;
  canExport?: boolean;
}) {
  const [picked, setPicked] = useState<StudioProblem[]>(initial);
  const [removed, setRemoved] = useState<StudioCartRemoval[]>([]);
  const remove = (problem: StudioProblem) => {
    const index = picked.findIndex((item) => item.id === problem.id);
    if (index < 0) return;
    setRemoved((items) => rememberRemoval(items, picked[index], index, picked));
    setPicked((items) => items.filter((item) => item.id !== problem.id));
  };
  return (
    <>
      <DevAiProvider>
        <StudioView
          picked={picked}
          removed={removed}
          onPageOrderChange={(order, pageCrops) => {
            const next = reconcileStudioPageCart(
              picked,
              removed,
              order,
              pageCrops,
            );
            setPicked(next.picked);
            setRemoved(next.removed);
          }}
          onAdd={(problems) => {
            setPicked((items) => addToCart(items, problems));
            setRemoved((items) =>
              forgetRemovals(
                items,
                problems.map((problem) => problem.id),
              ),
            );
          }}
          onRemove={remove}
          onRemoveAll={() => {
            const next = removeAllFromCart(picked, removed);
            setPicked(next.picked);
            setRemoved(next.removed);
          }}
          onRestore={(problem) => {
            const index =
              removed.find((item) => item.problem.id === problem.id)?.index ??
              picked.length;
            setPicked((items) => restoreToCart(items, problem, index, removed));
            setRemoved((items) => forgetRemovals(items, [problem.id]));
          }}
          onExport={onExport ?? (() => {})}
          restoreRequest={restoreRequest}
          exportRequest={exportRequest}
          active={active}
          canExport={canExport}
          storageScope="owner-a"
        />
      </DevAiProvider>
      <section aria-label="시험지 대역">
        <output aria-label="시험지 담은 문제">
          {JSON.stringify(
            picked.map((problem) => ({
              id: problem.id,
              revision: problem.studioCrop?.revision ?? 0,
              reviewed: problem.studioCrop?.reviewed ?? false,
              mode: problem.studioCrop?.mode,
            })),
          )}
        </output>
        {picked.map((problem, index) => (
          <button key={problem.id} onClick={() => remove(problem)}>
            ④ {index + 1}번 문제 빼기
          </button>
        ))}
        <button
          onClick={() => {
            setPicked([]);
            setRemoved([]);
          }}
        >
          새 시험지 (대역)
        </button>
      </section>
    </>
  );
}

async function openReview(
  crops: StudioCrop[],
  props: Parameters<typeof Workspace>[0] = {},
) {
  saved.current = Promise.resolve({
    data: {
      sources: [
        {
          id: "s1",
          name: "예제 지면",
          kind: "sample",
          pages: Math.max(1, ...crops.map((item) => item.page)),
        },
      ],
      crops,
      sourceId: "s1",
      pageNumber: 1,
      activeCropId: crops[0]?.id ?? "",
      inspectedPages: {},
      step: "review",
      grade: "중2",
      level: "secondary",
    } satisfies StudioSessionData,
    originals: new Map(),
  });
  const view = render(<Workspace {...props} />);
  await screen.findByText("이전 문제 추출 작업을 복원했습니다.");
  return view;
}

const footer = () =>
  screen.getByRole("contentinfo", { name: "문제 제작 주요 작업" });
const addButton = () =>
  within(footer()).getByRole("button", {
    name: /문항 담기|모두 담았습니다|담을 문항 없음|시험지에 담기/,
  });
const cartToggle = () =>
  within(footer()).getByRole("button", { name: /^담은 문항/ });
const card = (n: number) =>
  screen.getByRole("article", { name: `문제 ${n} 인식 결과` });
const chipOf = (n: number) =>
  card(n).querySelector<HTMLElement>("[data-studio-cart-chip]");
/** 표시의 **보이는** 글자 — 줄인 글자는 `aria-hidden` 쪽이 보이고 긴 뜻은 숨은 글자로 따로 있다. */
const chip = (n: number) => {
  const element = chipOf(n);
  if (!element) return null;
  return (
    element.querySelector('[aria-hidden="true"]')?.textContent ??
    element.textContent
  );
};
const worksheet = () =>
  JSON.parse(screen.getByLabelText("시험지 담은 문제").textContent!) as {
    id: string;
    revision: number;
    reviewed: boolean;
    mode?: string;
  }[];
const stepTab = (name: RegExp) =>
  within(screen.getByRole("navigation", { name: "제작 단계 이동" })).getByRole(
    "button",
    { name },
  );
const tabBadge = () =>
  stepTab(/3 양식 구성·출력/).querySelector("b")?.textContent;
const panel = () => screen.getByRole("region", { name: "담은 문항 목록" });

describe("작업실 «담음»은 시험지 목록 하나에서 나온다", () => {
  it("3차 재현: B쪽 제외·C 직접 빼기 뒤 B를 되살리면 C의 뺀 줄과 다시 담는 자리가 같다", async () => {
    await openReview([
      crop("A", { page: 1 }),
      crop("B", { page: 2 }),
      crop("C", { page: 3 }),
    ]);
    fireEvent.click(addButton());
    expect(worksheet().map((row) => row.id)).toEqual(["A", "B", "C"]);

    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    const excludeB = screen.getByRole("button", {
      name: "예제 지면 원본 2쪽 빼기",
    });
    await waitFor(() => expect(excludeB).toBeEnabled());
    fireEvent.click(excludeB);
    expect(worksheet().map((row) => row.id)).toEqual(["A", "C"]);

    fireEvent.click(stepTab(/2 문항 검토/));
    fireEvent.click(cartToggle());
    fireEvent.click(
      within(
        panel().querySelector<HTMLElement>('[data-cart-row="C"]')!,
      ).getByRole("button", { name: /빼기$/ }),
    );
    expect(worksheet().map((row) => row.id)).toEqual(["A"]);
    fireEvent.click(within(panel()).getByRole("button", { name: "닫기" }));

    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "예제 지면 원본 2쪽 되살리기",
      }),
    );
    expect(worksheet().map((row) => row.id)).toEqual(["A", "B"]);
    fireEvent.click(stepTab(/2 문항 검토/));
    fireEvent.click(cartToggle());

    const rows = () => within(panel()).getAllByRole("listitem");
    expect(
      rows().map((row) => [
        row.dataset.cartRow,
        row.dataset.removed,
        row.firstElementChild?.textContent,
      ]),
    ).toEqual([
      ["A", "false", "01"],
      ["B", "false", "02"],
      ["C", "true", "–"],
    ]);
    fireEvent.click(
      within(panel()).getByRole("button", { name: "문제 03 다시 담기" }),
    );
    expect(worksheet().map((row) => row.id)).toEqual(["A", "B", "C"]);
    expect(
      rows().map((row) => [
        row.dataset.cartRow,
        row.dataset.removed,
        row.firstElementChild?.textContent,
      ]),
    ).toEqual([
      ["A", "false", "01"],
      ["B", "false", "02"],
      ["C", "false", "03"],
    ]);
  });

  it("구성 탭도 현재 추출 18문항을 넘기고 기존 은행 20문항을 보존한다", async () => {
    const onExport = vi.fn();
    const existing = Array.from({ length: 20 }, (_, index) => ({
      ...bank,
      id: `bank-${index + 1}`,
    }));
    const extracted = Array.from({ length: 18 }, (_, index) =>
      crop(`extracted-${index + 1}`),
    );
    await openReview(extracted, { initial: existing, onExport });

    expect(stepTab(/2 문항 검토/)).toHaveTextContent("18");
    expect(tabBadge()).toBe("20");
    fireEvent.click(stepTab(/3 양식 구성·출력/));

    expect(onExport).toHaveBeenCalledOnce();
    expect(worksheet().map((problem) => problem.id)).toEqual([
      ...existing.map((problem) => problem.id),
      ...extracted.map((problem) => problem.id),
    ]);
    expect(tabBadge()).toBe("38");
    expect(footer()).toHaveTextContent("18문항 담음");
    // Re-entering composition must not duplicate the imported questions.
    fireEvent.click(stepTab(/3 양식 구성·출력/));
    expect(worksheet()).toHaveLength(38);
    expect(onExport).toHaveBeenCalledTimes(2);
  });

  it("빈 시험지도 추출 문항으로 구성할 수 있고 담기 전 배지는 0을 유지한다", async () => {
    const onExport = vi.fn();
    await openReview([crop("a"), crop("b")], { onExport });
    expect(tabBadge()).toBe("0");
    expect(footer()).toHaveTextContent("2문항 추가 예정");
    expect(stepTab(/3 양식 구성·출력/)).toBeEnabled();
    fireEvent.click(stepTab(/3 양식 구성·출력/));
    expect(worksheet().map((problem) => problem.id)).toEqual(["a", "b"]);
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("담은 문항 패널의 구성 버튼도 현재 추출을 넘긴다", async () => {
    const onExport = vi.fn();
    await openReview([crop("a"), crop("b")], { initial: [bank], onExport });
    fireEvent.click(cartToggle());
    fireEvent.click(
      within(panel()).getByRole("button", { name: /시험지 구성/ }),
    );
    expect(worksheet().map((problem) => problem.id)).toEqual([
      bank.id,
      "a",
      "b",
    ]);
    expect(onExport).toHaveBeenCalledOnce();
    expect(screen.queryByRole("region", { name: "담은 문항 목록" })).toBeNull();
  });

  it("구성 탭은 뺀 문항을 건너뛰고 기존 문항 순서와 반영 전 판을 보존한다", async () => {
    const onExport = vi.fn();
    const current = crop("a", { revision: 2 });
    await openReview([current, crop("b"), crop("c")], {
      initial: [
        studioProblem({ ...current, revision: 1 }),
        bank,
        studioProblem(crop("b")),
      ],
      onExport,
    });
    fireEvent.click(screen.getByRole("button", { name: "④ 3번 문제 빼기" }));
    fireEvent.click(stepTab(/3 양식 구성·출력/));
    expect(worksheet().map((problem) => problem.id)).toEqual([
      "a",
      "bank-1",
      "c",
    ]);
    expect(worksheet()[0].revision).toBe(1);
    expect(chip(1)).toBe("반영 전");
    expect(chip(2)).toBe("뺌");
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("현재 추출이 없어도 기존 시험지는 구성 탭으로 이어서 열 수 있다", async () => {
    const onExport = vi.fn();
    await openReview([], { initial: [bank], onExport });
    fireEvent.click(stepTab(/3 양식 구성·출력/));
    expect(worksheet().map((problem) => problem.id)).toEqual([bank.id]);
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("셸 구성 요청은 복원된 추출을 한 번만 담고 숨겨진 작업실에서는 실행하지 않는다", async () => {
    const onExport = vi.fn();
    const props = { initial: [bank], onExport, exportRequest: { id: 1 } };
    const view = await openReview([crop("a"), crop("b")], {
      ...props,
      active: false,
    });
    expect(worksheet().map((problem) => problem.id)).toEqual([bank.id]);
    expect(onExport).not.toHaveBeenCalled();

    view.rerender(<Workspace {...props} />);
    expect(worksheet().map((problem) => problem.id)).toEqual([
      bank.id,
      "a",
      "b",
    ]);
    expect(onExport).toHaveBeenCalledOnce();
    view.rerender(<Workspace {...props} exportRequest={{ id: 1 }} />);
    expect(onExport).toHaveBeenCalledOnce();
    view.rerender(<Workspace {...props} exportRequest={{ id: 2 }} />);
    expect(onExport).toHaveBeenCalledTimes(2);
    expect(worksheet()).toHaveLength(3);
  });

  it("복원 중 들어온 셸 구성 요청도 저장된 추출 문항을 기다린다", async () => {
    const onExport = vi.fn();
    await openReview([crop("a")], {
      initial: [bank],
      onExport,
      exportRequest: { id: 1 },
    });
    await waitFor(() =>
      expect(worksheet().map((problem) => problem.id)).toEqual([bank.id, "a"]),
    );
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("추출 복원 실패를 기존 시험지 출력 성공으로 처리하지 않는다", async () => {
    const onExport = vi.fn();
    saved.current = Promise.reject(new Error("원본 복원 실패"));
    render(
      <Workspace
        initial={[bank]}
        onExport={onExport}
        exportRequest={{ id: 1 }}
      />,
    );
    await screen.findByText("원본 복원 실패");
    expect(stepTab(/3 양식 구성·출력/)).toBeDisabled();
    expect(worksheet().map((problem) => problem.id)).toEqual([bank.id]);
    expect(onExport).not.toHaveBeenCalled();
  });

  it("출력 권한이 없으면 셸 구성 요청으로 문항을 추가하거나 이동하지 않는다", async () => {
    const onExport = vi.fn();
    await openReview([crop("a")], {
      initial: [bank],
      onExport,
      canExport: false,
      exportRequest: { id: 1 },
    });
    expect(stepTab(/3 양식 구성·출력/)).toBeDisabled();
    expect(worksheet().map((problem) => problem.id)).toEqual([bank.id]);
    expect(onExport).not.toHaveBeenCalled();
  });

  it("담으면 카드 바닥에 «담음», 목록·탭 배지·바닥 개수가 모두 시험지와 같은 수", async () => {
    await openReview([crop("a"), crop("b"), crop("c")], { initial: [bank] });
    expect(addButton()).toHaveTextContent("3문항 담기");
    expect([chip(1), chip(2), chip(3)]).toEqual([null, null, null]);
    fireEvent.click(addButton());
    expect(worksheet().map((row) => row.id)).toEqual(["bank-1", "a", "b", "c"]);
    expect([chip(1), chip(2), chip(3)]).toEqual(["담음", "담음", "담음"]);
    expect(addButton()).toHaveTextContent("모두 담았습니다");
    expect(addButton()).toBeDisabled();
    expect(cartToggle()).toHaveTextContent(/담은 문항\s*4/);
    expect(tabBadge()).toBe("4");
    expect(footer()).toHaveTextContent("3문항 담음");
    fireEvent.click(cartToggle());
    expect(cartToggle()).toHaveAttribute("aria-expanded", "true");
    // 시험지 전체 — 문제은행 문항까지, 출처와 함께.
    const rows = within(panel()).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent(/01일차방정식의 활용문제은행중1 · 중/);
    expect(rows[1]).toHaveTextContent(/02문제 01이 원본1쪽 · 중2/);
    expect(within(panel()).getByRole("heading")).toHaveTextContent(
      "담은 문항 4",
    );
    expect(panel()).toHaveTextContent("이 원본 3 · 다른 곳 1");
  });

  it("검수 완료만 눌러도 «담음» 그대로 — 시험지 판은 상태만 따라온다 (어긋남 3)", async () => {
    await openReview([crop("a"), crop("b")]);
    fireEvent.click(addButton());
    const before = worksheet();
    fireEvent.click(
      within(card(1)).getByRole("button", { name: "이 문제 검수 완료" }),
    );
    expect(chip(1)).toBe("담음");
    expect(addButton()).toHaveTextContent("모두 담았습니다");
    const after = worksheet();
    expect(after.map((row) => [row.id, row.revision])).toEqual(
      before.map((row) => [row.id, row.revision]),
    );
    expect(after[0].reviewed).toBe(true);
    fireEvent.click(
      within(card(1)).getByRole("button", { name: "검수 완료 취소" }),
    );
    expect(chip(1)).toBe("담음");
    expect(worksheet()[0].reviewed).toBe(false);
  });

  it("④ 에서 빼면 작업실도 «뺌» — 목록의 «다시 담기»로 제자리에 돌아온다 (어긋남 1)", async () => {
    await openReview([crop("a"), crop("b"), crop("c")]);
    fireEvent.click(addButton());
    fireEvent.click(screen.getByRole("button", { name: "④ 2번 문제 빼기" }));
    expect(worksheet().map((row) => row.id)).toEqual(["a", "c"]);
    expect([chip(1), chip(2), chip(3)]).toEqual(["담음", "뺌", "담음"]);
    // 뺀 것은 한꺼번에 담기가 건너뛴다 — 원장님 확정 «안 넣는다». 일부러 건너뛴 것이 있으니
    // «모두 담았습니다»가 아니라 «담을 문항 없음»(원장님 2026-09-21 확정, 트랙 47).
    expect(addButton()).toHaveTextContent("담을 문항 없음");
    expect(addButton()).toBeDisabled();
    expect(cartToggle()).toHaveTextContent(/담은 문항\s*2/);
    fireEvent.click(cartToggle());
    const out = within(panel()).getAllByRole("listitem")[1];
    expect(out).toHaveAttribute("data-removed", "true");
    expect(out).toHaveTextContent(/–문제 02이 원본뺐습니다/);
    fireEvent.click(
      within(out).getByRole("button", { name: "문제 02 다시 담기" }),
    );
    expect(worksheet().map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(chip(2)).toBe("담음");
    // 되돌리면 뺀 것이 없다 — 다시 «모두 담았습니다».
    expect(addButton()).toHaveTextContent("모두 담았습니다");
    // 초점은 같은 줄의 × 로 — 키보드로 바로 다시 뺄 수 있다.
    expect(document.activeElement).toBe(
      within(panel()).getByRole("button", { name: "문제 02 빼기" }),
    );
  });

  it("목록 × 로 빼면 «담고 내보내기»가 되넣지 않는다 (공통 ②)", async () => {
    const onExport = vi.fn();
    await openReview([crop("a"), crop("b"), crop("c")], { onExport });
    fireEvent.click(addButton());
    fireEvent.click(cartToggle());
    fireEvent.click(
      within(panel()).getByRole("button", { name: "문제 01 빼기" }),
    );
    expect(worksheet().map((row) => row.id)).toEqual(["b", "c"]);
    expect(chip(1)).toBe("뺌");
    expect(addButton()).toHaveTextContent("담을 문항 없음");
    // 뺀 줄은 흐리게 남고 초점이 «다시 담기» 로.
    expect(document.activeElement).toBe(
      within(panel()).getByRole("button", { name: "문제 01 다시 담기" }),
    );
    fireEvent.click(
      within(footer()).getByRole("button", { name: /^(담고 )?내보내기/ }),
    );
    expect(onExport).toHaveBeenCalledOnce();
    expect(worksheet().map((row) => row.id)).toEqual(["b", "c"]);
  });

  it("목록 머리의 «모두 빼기» — 전부 «뺌»으로 흐리게 남고, 빈 목록에서는 단추가 없다", async () => {
    await openReview([crop("a"), crop("b"), crop("c")]);
    fireEvent.click(addButton());
    fireEvent.click(cartToggle());
    fireEvent.click(within(panel()).getByRole("button", { name: "모두 빼기" }));
    expect(worksheet()).toEqual([]);
    expect([chip(1), chip(2), chip(3)]).toEqual(["뺌", "뺌", "뺌"]);
    const rows = within(panel()).getAllByRole("listitem");
    expect(rows.map((row) => row.dataset.removed)).toEqual([
      "true",
      "true",
      "true",
    ]);
    expect(
      within(panel()).queryByRole("button", { name: "모두 빼기" }),
    ).toBeNull();
    fireEvent.click(
      within(panel()).getByRole("button", { name: "문제 02 다시 담기" }),
    );
    expect(worksheet().map((row) => row.id)).toEqual(["b"]);
  });

  it("새 시험지를 열면 «담음»이 풀리고 다시 담을 수 있다 (어긋남 2)", async () => {
    await openReview([crop("a"), crop("b")]);
    fireEvent.click(addButton());
    expect([chip(1), chip(2)]).toEqual(["담음", "담음"]);
    fireEvent.click(screen.getByRole("button", { name: "새 시험지 (대역)" }));
    expect([chip(1), chip(2)]).toEqual([null, null]);
    expect(addButton()).toHaveTextContent("2문항 담기");
    expect(footer()).toHaveTextContent("0문항 담음");
    fireEvent.click(addButton());
    expect(worksheet().map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("담은 뒤 고치면 «반영 전» — 긴 뜻은 읽는 이름·마우스 올림에, «반영»이 같은 자리에 새 판을 넣는다", async () => {
    await openReview([crop("a"), crop("b")]);
    fireEvent.click(addButton());
    fireEvent.change(
      within(card(1)).getByRole("combobox", { name: "문제 1 출력 방식" }),
      { target: { value: "image" } },
    );
    // 원장님 2026-09-21 확정(트랙 47) — 짧게 줄여 «반영» 단추와 한 줄에.
    expect(chip(1)).toBe("반영 전");
    expect(chipOf(1)).toHaveAttribute("title", "담음 · 고친 내용 반영 전");
    // 보이는 줄인 글자는 읽지 않고, 긴 뜻을 읽는다.
    expect(
      within(chipOf(1)!).getByText("반영 전").getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      within(chipOf(1)!).getByText("담음 · 고친 내용 반영 전"),
    ).not.toHaveAttribute("aria-hidden");
    // ② 자른 문제 목록 배지도 같은 표시 — 목록 단추의 이름에 긴 뜻이 실린다(목록은 ② 단계에서 보인다).
    fireEvent.click(stepTab(/1 영역 지정/));
    fireEvent.click(screen.getByRole("button", { name: "문제&도형 잘라내기" }));
    const listItem = within(screen.getByLabelText("자른 문제 목록")).getByRole(
      "button",
      { name: /문제 01.*담음 · 고친 내용 반영 전/ },
    );
    expect(
      listItem.querySelector('[data-studio-cart-chip] [aria-hidden="true"]'),
    ).toHaveTextContent("반영 전");
    fireEvent.click(stepTab(/2 문항 검토/));
    // 고친 것은 한꺼번에 담기의 일이 아니다 — 시험지에는 있으니 «모두 담았습니다».
    expect(addButton()).toHaveTextContent("모두 담았습니다");
    expect(worksheet()[0]).toMatchObject({ id: "a", mode: "text" });
    fireEvent.click(cartToggle());
    // 목록 줄의 작은 글자는 400px 칸에 넉넉해 풀어 쓴 그대로 둔다.
    expect(within(panel()).getAllByRole("listitem")[0]).toHaveTextContent(
      "고친 내용 반영 전",
    );
    fireEvent.click(
      within(card(1)).getByRole("button", { name: "문제 1 고친 내용 반영" }),
    );
    expect(chip(1)).toBe("담음");
    expect(worksheet().map((row) => row.id)).toEqual(["a", "b"]);
    expect(worksheet()[0]).toMatchObject({ mode: "image", revision: 1 });
    expect(
      within(card(1)).queryByRole("button", { name: /고친 내용 반영/ }),
    ).toBeNull();
  });

  it("④ «원본 편집»으로 돌아온 문항은 시험지에 있으니 «담음» (어긋남 4)", async () => {
    // 같은 원본이 열려 있는데 작업실에서는 지운 문항 — 전에는 `added:false` 로 들어와 «1문항 담기»가 됐다.
    const other = crop("elsewhere", {
      rect: { x: 0.1, y: 0.5, width: 0.8, height: 0.2 },
    });
    const snapshot = studioProblem(other);
    await openReview([crop("a")], {
      initial: [snapshot],
      restoreRequest: { id: 1, crops: [snapshot.studioCrop!] },
    });
    await screen.findByText("저장한 문제의 원본과 검수 내용을 열었습니다.");
    // 되살린 문항은 작업실 목록 끝(둘째)에 붙는다.
    expect([chip(1), chip(2)]).toEqual([null, "담음"]);
    // 한꺼번에 담기는 작업실의 다른 문항(a)만 센다.
    expect(addButton()).toHaveTextContent("1문항 담기");
  });

  it("목록은 Esc 로 닫히고 여는 단추로 초점이 돌아온다 — 편집창 확대는 그대로", async () => {
    await openReview([crop("a")]);
    fireEvent.click(addButton());
    fireEvent.click(screen.getByRole("button", { name: "편집창 확대" }));
    fireEvent.click(cartToggle());
    expect(document.activeElement).toBe(within(panel()).getByRole("heading"));
    fireEvent.keyDown(within(panel()).getByRole("heading"), { key: "Escape" });
    expect(screen.queryByRole("region", { name: "담은 문항 목록" })).toBeNull();
    expect(document.activeElement).toBe(cartToggle());
    expect(screen.getByRole("button", { name: "편집창 축소" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
