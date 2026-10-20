import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import { createWorkspaceDraftStore } from "@/components/unified/draftStore";
import type { StudioCartRemoval } from "@/components/unified/studioCart";
import type { StudioProblem } from "@/components/unified/types";

/**
 * 담은 문항 장부의 배선 — 원장님 2026-09-21 확정(트랙 41 안 D, 트랙 44 구현).
 *
 * 작업실은 시험지의 담은 목록(`selected`)을 **그대로** 받고, 빼기·되돌리기는 ④·문제은행과 같은
 * `toggle` 길을 탄다. 뺀 기억은 시험지마다 따로다 — 새 시험지를 열면 비고(어긋남 2), ④ 에서 뺀 것도
 * 작업실이 안다(어긋남 1).
 *
 * 작업실은 대역이다(진짜 작업실은 `StudioView.cart.test.tsx`·`e2e/cart-review`). 대역은 받은 장부를
 * 글자로 적고, 누르면 받은 손잡이를 부른다 — 배선만 본다.
 */

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType }>) => {
    // 직접 #bank 진입의 선적재와 지연 렌더 모두 같은 배선 대역을 사용한다.
    if (loader.toString().includes("MathExamBuilder")) return BankDouble;
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
vi.mock("@/components/unified/print/WorksheetPrint", () => ({
  WorksheetPrint: () => <p>시험지 미리보기</p>,
}));
const bankProblem = vi.hoisted(() => ({
  id: "bank-1",
  content: "은행 문항",
  grade: "중1",
  chapter: "일차방정식",
  section: "일차방정식의 활용",
  difficulty: "중",
  problemCode: "B-1",
  answer: "",
  solution: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
}));
function BankDouble({
  editor: { selected },
  onQuestionsChange,
}: {
  editor: { selected: StudioProblem[] };
  onQuestionsChange: (problems: StudioProblem[]) => void;
}) {
  return (
    <section aria-label="문제은행 대역">
      <p>문제은행 담은 문제 {selected.length}</p>
      <button
        onClick={() =>
          onQuestionsChange(
            selected.some((problem) => problem.id === bankProblem.id)
              ? selected.filter((problem) => problem.id !== bankProblem.id)
              : [...selected, bankProblem],
          )
        }
      >
        {selected.some((problem) => problem.id === bankProblem.id)
          ? "담기 완료"
          : "문제 담기"}
      </button>
    </section>
  );
}
vi.mock("@/components/exam-builder/MathExamBuilder", () => ({
  default: BankDouble,
}));
vi.mock("@/components/unified/StudioView", () => ({
  default: function StudioDouble({
    picked = [],
    removed = [],
    onAdd,
    onRemove,
    onRestore,
    onExport,
    exportRequest,
  }: {
    picked?: StudioProblem[];
    removed?: StudioCartRemoval[];
    onAdd: (problems: StudioProblem[]) => void;
    onRemove?: (problem: StudioProblem) => void;
    onRestore?: (problem: StudioProblem) => void;
    onExport: () => void;
    exportRequest?: { id: number };
  }) {
    // 작업실에 있을 때 «편집 이어가기»는 작업실에 출력 요청을 보낸다 — 작업실이 담고 나서
    // `onExport` 로 넘긴다(4842701cd, 2026-10-15). 대역은 요청마다 한 번 넘기기만 한다.
    const handled = useRef<number | undefined>(undefined);
    useEffect(() => {
      if (!exportRequest || handled.current === exportRequest.id) return;
      handled.current = exportRequest.id;
      onExport();
    }, [exportRequest, onExport]);
    return (
      <section aria-label="작업실 대역">
        <output aria-label="작업실이 받은 담은 목록">
          {picked.map((problem) => problem.id).join(",")}
        </output>
        <output aria-label="작업실이 받은 뺀 기억">
          {removed.map((item) => `${item.problem.id}@${item.index}`).join(",")}
        </output>
        {picked.map((problem) => (
          <button key={problem.id} onClick={() => onRemove?.(problem)}>
            {problem.id} 빼기
          </button>
        ))}
        {removed.map((item) => (
          <button
            key={item.problem.id}
            onClick={() => onRestore?.(item.problem)}
          >
            {item.problem.id} 다시 담기
          </button>
        ))}
        <button
          onClick={() =>
            onAdd([{ ...picked[0], answer: "반영한 정답" } as StudioProblem])
          }
        >
          첫 문항 반영
        </button>
      </section>
    );
  },
}));

const initialData = {
  problems: [],
  total: 0,
  page: 1,
  pageSize: 20,
  grades: [],
  chapters: [],
};

function studioProblemFixture(id: string, page: number) {
  return {
    id,
    content: `문항 ${id}`,
    grade: "중2",
    sourceLabel: `원본.pdf · ${page}쪽`,
    studioCrop: {
      id,
      sourceId: "source-a",
      sourceLabel: "원본.pdf",
      page,
      rect: { x: 0, y: 0, width: 1, height: 1 },
      image: "data:image/png;base64,AA==",
      content: "",
      answer: "",
      solution: "",
      level: "secondary",
      grade: "중2",
      mode: "image",
    },
  };
}

function seed() {
  const store = createWorkspaceDraftStore();
  store.hydrate();
  const ok = store.importDraft({
    version: 1,
    title: "담은 시험지",
    problems: [
      studioProblemFixture("a", 1),
      studioProblemFixture("b", 2),
      studioProblemFixture("c", 3),
    ],
    columns: 1,
    answers: false,
  });
  if (!ok) throw new Error("검증용 시험지를 넣지 못했습니다.");
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/#export");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
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

const menu = (name: string) =>
  within(screen.getByRole("navigation", { name: "작업실 메뉴" })).getByRole(
    "button",
    { name },
  );
async function toStudio() {
  fireEvent.click(menu("문제 추출"));
  return screen.findByRole("region", { name: "작업실 대역" });
}
/**
 * 새로 연 화면은 빈 시험지로 선다 — 저장한 시험지는 «저장한 작업 불러오기»로 **명시적으로** 연다
 * (ec2d38fdb · 4842701cd, 2026-10-15). 불러온 수학 시험지는 시험지 만들기(문제은행)의 출력 단계로 간다.
 */
async function resume() {
  // 빈 시험지에는 카드가 없다. 빠른 실행으로 편집 화면을 연 뒤 저장본을 명시적으로 불러온다.
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  fireEvent.click(
    within(
      await screen.findByRole("dialog", { name: "무엇을 찾으시나요?" }),
    ).getByRole("button", { name: "시험지 · 내보내기" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "저장한 작업 불러오기" }),
  );
  await screen.findByText("저장한 시험지를 불러왔습니다.");
}
async function toOrder() {
  // 옆 메뉴에 «시험지 · 내보내기» 줄이 없다(원장님 2026-10-01) — 옆 «현재 시험지 · 편집 이어가기»로
  fireEvent.click(screen.getByRole("button", { name: /편집 이어가기/ }));
  fireEvent.click(await screen.findByRole("tab", { name: /문제 순서/ }));
}
const orderIds = () =>
  within(screen.getByRole("tabpanel", { name: /문제 순서/ }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("strong")?.textContent);
const studioPicked = () =>
  screen.getByLabelText("작업실이 받은 담은 목록").textContent;
const studioRemoved = () =>
  screen.getByLabelText("작업실이 받은 뺀 기억").textContent;

describe("현재 시험지 카드 노출", () => {
  it.each(["home", "bank", "export", "library"] as const)(
    "담은 문항이 없는 %s 화면에서는 카드와 편집 이어가기가 없다",
    async (view) => {
      window.history.replaceState(null, "", `/#${view}`);
      render(<UnifiedWorkspace initialData={initialData} />);
      if (view === "bank")
        await screen.findByRole("region", { name: "문제은행 대역" });
      else if (view === "export")
        await screen.findByRole("button", { name: "저장한 작업 불러오기" });
      else if (view === "library")
        await screen.findByRole("heading", { name: "아직 저장한 시험지가 없어요" });
      else await screen.findByRole("heading", { name: "오늘의 작업" });
      expect(screen.queryByText("현재 시험지")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /편집 이어가기/ }),
      ).not.toBeInTheDocument();
    },
  );

  it("한 문항을 담으면 카드가 생기고 마지막 문항을 빼면 다시 숨긴다", async () => {
    window.history.replaceState(null, "", "/#bank");
    render(<UnifiedWorkspace initialData={initialData} />);
    fireEvent.click(await screen.findByRole("button", { name: "문제 담기" }));
    expect(screen.getByText("현재 시험지")).toBeVisible();
    expect(screen.getByText("1문항", { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /편집 이어가기/ }));
    expect(await screen.findByRole("textbox", { name: "제목" })).toBeVisible();
    expect(location.hash).toBe("#export");
    fireEvent.click(menu("시험지 만들기"));
    fireEvent.click(await screen.findByRole("button", { name: "담기 완료" }));
    expect(screen.getByText("문제은행 담은 문제 0")).toBeVisible();
    expect(screen.queryByText("현재 시험지")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /편집 이어가기/ }),
    ).not.toBeInTheDocument();
  });

  it("문제 추출에서는 시험지에 담기 전에도 카드를 보이고 출력 요청을 보낸다", async () => {
    render(<UnifiedWorkspace initialData={initialData} />);
    await toStudio();
    expect(studioPicked()).toBe("");
    expect(screen.getByText("현재 시험지")).toBeVisible();
    expect(screen.getByText("0문항", { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /편집 이어가기/ }));
    expect(
      await screen.findByRole("button", { name: /문제은행에서 담기/ }),
    ).toBeVisible();
    expect(location.hash).toBe("#export");
    expect(screen.queryByText("현재 시험지")).not.toBeInTheDocument();
  });

  it("저장본이 있어도 빈 시험지로 시작하고 내 시험지에서 열면 카드가 생긴다", async () => {
    seed();
    window.history.replaceState(null, "", "/#bank");
    render(<UnifiedWorkspace initialData={initialData} />);
    expect(await screen.findByText("문제은행 담은 문제 0")).toBeVisible();
    expect(screen.queryByText("현재 시험지")).not.toBeInTheDocument();
    fireEvent.click(menu("내 시험지"));
    fireEvent.click(
      await screen.findByRole("button", { name: "담은 시험지 편집" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "문제은행 대역" })).toHaveTextContent(
        "문제은행 담은 문제 3",
      ),
    );
    expect(screen.getByText("현재 시험지")).toBeVisible();
    expect(screen.getByText("3문항", { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /편집 이어가기/ }));
    expect(await screen.findByRole("textbox", { name: "제목" })).toHaveValue(
      "담은 시험지",
    );
  });
});

describe("담은 문항 장부 배선", () => {
  it("작업실은 시험지 목록을 그대로 받고, ④ 에서 뺀 것을 뺀 자리와 함께 안다 (어긋남 1)", async () => {
    seed();
    render(<UnifiedWorkspace initialData={initialData} />);
    await resume();
    await toOrder();
    expect(orderIds()).toEqual(["1쪽", "2쪽", "3쪽"]);
    fireEvent.click(screen.getByRole("button", { name: "2번 문제 빼기" }));
    expect(orderIds()).toEqual(["1쪽", "3쪽"]);
    await toStudio();
    expect(studioPicked()).toBe("a,c");
    expect(studioRemoved()).toBe("b@1");
    // 작업실의 «다시 담기» — 뺀 자리로 돌아가고 기억이 풀린다.
    fireEvent.click(screen.getByRole("button", { name: "b 다시 담기" }));
    expect(studioPicked()).toBe("a,b,c");
    expect(studioRemoved()).toBe("");
    await toOrder();
    expect(orderIds()).toEqual(["1쪽", "2쪽", "3쪽"]);
  });

  it("작업실에서 빼면 ④·문제은행과 같은 길 — 알림 줄 «되돌리기»도 기억을 푼다", async () => {
    seed();
    render(<UnifiedWorkspace initialData={initialData} />);
    await resume();
    await toStudio();
    fireEvent.click(screen.getByRole("button", { name: "a 빼기" }));
    expect(studioPicked()).toBe("b,c");
    expect(studioRemoved()).toBe("a@0");
    expect(screen.getByText("시험지에서 문제를 뺐습니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(studioPicked()).toBe("a,b,c");
    expect(studioRemoved()).toBe("");
  });

  it("반영은 같은 자리에서 갈고, 문제은행에서 다시 담으면 뺀 기억이 풀린다", async () => {
    seed();
    render(<UnifiedWorkspace initialData={initialData} />);
    await resume();
    await toStudio();
    fireEvent.click(screen.getByRole("button", { name: "첫 문항 반영" }));
    expect(studioPicked()).toBe("a,b,c");
    fireEvent.click(menu("시험지 만들기"));
    fireEvent.click(await screen.findByRole("button", { name: "문제 담기" }));
    expect(screen.getByText("문제은행 담은 문제 4")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "담기 완료" }));
    await toStudio();
    expect(studioPicked()).toBe("a,b,c");
    expect(studioRemoved()).toBe("bank-1@3");
    fireEvent.click(menu("시험지 만들기"));
    fireEvent.click(await screen.findByRole("button", { name: "문제 담기" }));
    await toStudio();
    expect(studioPicked()).toBe("a,b,c,bank-1");
    expect(studioRemoved()).toBe("");
    await toOrder();
    // 반영한 판이 제자리(첫째)에 있다.
    expect(orderIds()[0]).toBe("1쪽");
  });

  it("뺀 기억은 시험지와 같이 저장된다 — 새로 고친 뒤에도 뺀 자리와 함께 남는다 (트랙 47)", async () => {
    seed();
    const first = render(<UnifiedWorkspace initialData={initialData} />);
    await resume();
    await toOrder();
    fireEvent.click(screen.getByRole("button", { name: "2번 문제 빼기" }));
    await toStudio();
    fireEvent.click(screen.getByRole("button", { name: "a 빼기" }));
    expect(studioRemoved()).toBe("b@1,a@0");
    // 화면을 내리면(새로 고침) 저장소에 남은 것만 돌아온다 — 다시 불러오면.
    first.unmount();
    render(<UnifiedWorkspace initialData={initialData} />);
    await resume();
    await toStudio();
    expect(studioPicked()).toBe("c");
    expect(studioRemoved()).toBe("b@1,a@0");
    // «다시 담기»도 저장된 기억으로 뺀 자리에 돌아간다 — a 가 먼저 돌아오면 첫째 자리.
    fireEvent.click(screen.getByRole("button", { name: "a 다시 담기" }));
    expect(studioPicked()).toBe("a,c");
    expect(studioRemoved()).toBe("b@1");
  });

  it("새 시험지를 열면 담은 목록도 뺀 기억도 빈다 (어긋남 2)", async () => {
    seed();
    render(<UnifiedWorkspace initialData={initialData} />);
    await resume();
    await toStudio();
    fireEvent.click(screen.getByRole("button", { name: "c 빼기" }));
    expect(studioRemoved()).toBe("c@2");
    // 옆 메뉴의 «새 시험지 만들기»를 걷어(2026-10-17) «내 시험지»의 «새 시험지»로 연다.
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "작업실 메뉴" })).getByRole(
        "button",
        { name: "내 시험지" },
      ),
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "새 시험지" }))[0]!,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /내 자료로 만들기/ }),
    );
    await waitFor(() => expect(studioPicked()).toBe(""));
    expect(studioRemoved()).toBe("");
    // 새 시험지 창이 닫힐 때까지 기다린다 — 닫는 효과가 시험 뒤에 돌면 대역 `close` 가 이미 없다.
    await waitFor(() =>
      expect(document.querySelector("dialog[open]")).toBeNull(),
    );
  });
});
