import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import userEvent from "@testing-library/user-event";
import type { EnglishBankMakerSeed } from "@/contracts/englishBank.contract";
import { signOutAction } from "@/app/actions/auth";
import {
  WORKSPACE_MENUS,
  workspaceMenuProduct,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
} from "@/components/unified/draftStore";
import { privateServer } from "../fixtures/privateCloud";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  studioMount: vi.fn(),
  bankMount: vi.fn(),
  teachingMount: vi.fn(),
  overviewMount: vi.fn(),
  conceptMount: vi.fn(),
  conceptBlankMount: vi.fn(),
  englishMount: vi.fn(),
  englishSetOpened: vi.fn(),
}));

describe.each([
  {
    view: "srs" as const,
    heading: "SRS 패널",
    eventName: "course-srs-before-leave",
  },
  {
    view: "textbook" as const,
    heading: "교재 패널",
    eventName: "textbook-before-leave",
  },
])("$view shell transitions", ({ view, heading: panelHeading, eventName }) => {
  it.each(["sidebar", "keyboard", "hashchange", "popstate"])(
    "defers %s until the editor approves and keeps selection while canceled",
    async (method) => {
      window.history.replaceState(
        null,
        "",
        `/?classId=class-1&studentId=student-2#${view}`,
      );
      render(
        <UnifiedWorkspace
          initialData={initialData}
          allowedMenus={["home", view]}
        />,
      );
      await screen.findByRole("heading", { name: panelHeading });
      let dirty = true;
      let proceed: (() => void) | undefined;
      const prevent = (event: Event) => {
        if (!dirty) return;
        event.preventDefault();
        proceed = (event as CustomEvent<{ proceed: () => void }>).detail
          .proceed;
      };
      window.addEventListener(eventName, prevent);
      try {
        if (method === "sidebar")
          fireEvent.click(screen.getByRole("button", { name: "오늘의 작업" }));
        else if (method === "keyboard") {
          screen.getByRole("button", { name: "오늘의 작업" }).focus();
          await userEvent.setup().keyboard("{Enter}");
        } else
          act(() => {
            window.history.replaceState(null, "", "/?classId=foreign#home");
            window.dispatchEvent(new Event(method));
          });
        expect(proceed).toBeTypeOf("function");
        expect(
          screen.getByRole("heading", { name: panelHeading }),
        ).toBeVisible();
        expect(window.location.hash).toBe(`#${view}`);
        expect(
          new URLSearchParams(window.location.search).get("studentId"),
        ).toBe("student-2");
        dirty = false;
        act(() => proceed!());
        expect(
          await screen.findByRole("heading", { name: "오늘의 작업" }),
        ).toBeVisible();
        expect(window.location.hash).toBe("");
      } finally {
        window.removeEventListener(eventName, prevent);
      }
    },
  );
});
vi.mock("@/components/textbook/TextbookStudioView", () => ({
  TextbookStudioView: () => <h2>교재 패널</h2>,
}));
const router = { replace: mocks.replace };
const bankSeed: EnglishBankMakerSeed = {
  requestId: "10000000-0000-4000-8000-000000000021",
  examId: "exam-from-bank",
  path: "cloze",
  passageRef: {
    passageId: "10000000-0000-4000-8000-000000000022",
    textRevision: 1,
    snapshotHash: "a".repeat(64),
  },
  title: "은행 원문",
  text: "Students learn together.",
};
vi.mock("@/components/english/bank/EnglishResourceBank", () => ({
  default: function ResourceBankProbe({
    active,
    onUsePassage,
    onOpenListening,
  }: {
    active?: boolean;
    onUsePassage: (seed: EnglishBankMakerSeed) => void;
    onOpenListening: (id: string) => void;
  }) {
    return (
      <div hidden={!active}>
        <h2>영어 자료은행 패널</h2>
        <button onClick={() => onUsePassage(bankSeed)}>
          은행 지문으로 제작
        </button>
        <button onClick={() => onOpenListening("listening-from-bank")}>
          은행 듣기 열기
        </button>
      </div>
    );
  },
}));
vi.mock("@/components/english/listening/ListeningStudio", () => ({
  default: ({
    active,
    openSetRequest,
  }: {
    active?: boolean;
    openSetRequest?: { id: string };
  }) => (
    <div hidden={!active}>
      <h2>듣기 패널</h2>
      <span data-testid="listening-open-set">{openSetRequest?.id}</span>
    </div>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<{ default: ComponentType } | ComponentType>,
  ) => {
    const Component = lazy(async () => {
      const loaded = await loader();
      return typeof loaded === "function" ? { default: loaded } : loaded;
    });
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
  DevAiProvider: ({
    children,
    enabled,
  }: {
    children: ReactNode;
    enabled: boolean;
  }) => (
    <div data-testid="ai-provider" data-enabled={enabled}>
      {children}
    </div>
  ),
}));
vi.mock("@/components/unified/DevAiStatusPanel", () => ({
  default: () => <button>AI 연결 설정</button>,
}));
vi.mock("@/components/exam-builder/MathExamBuilder", () => ({
  default: function BankProbe({
    editor,
    canOutput,
  }: {
    editor: { navigate: (view: "export") => void };
    canOutput: boolean;
  }) {
    useEffect(() => {
      mocks.bankMount();
    }, []);
    return (
      <>
        <h2>은행 패널</h2>
        <button onClick={() => editor.navigate("export")}>
          내보내기 우회 검증
        </button>
        <span data-testid="bank-export-access">{String(canOutput)}</span>
      </>
    );
  },
}));
vi.mock("@/components/unified/StudioView", () => ({
  default: function StudioProbe({
    canExport,
    documentId,
  }: {
    canExport: boolean;
    documentId?: string;
  }) {
    const [value, setValue] = useState("");
    useEffect(() => {
      mocks.studioMount();
    }, []);
    return (
      <>
        <h2>자료 패널</h2>
        <input
          aria-label="진행 중인 자료"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <span data-testid="studio-export-access">{String(canExport)}</span>
        <span data-testid="studio-document-id">{documentId ?? ""}</span>
      </>
    );
  },
}));
vi.mock("@/components/unified/TeachingView", () => ({
  default: function TeachingProbe() {
    useEffect(() => {
      mocks.teachingMount();
    }, []);
    return <h2>수업 패널</h2>;
  },
}));
vi.mock("@/components/unified/ConceptView", () => ({
  default: function ConceptProbe() {
    useEffect(() => {
      mocks.conceptMount();
    }, []);
    return <h2>개념 패널</h2>;
  },
}));
// «개념 백지»(D-150) — 셸이 주는 active 만 보이는 탐침
vi.mock("@/components/concept-blank/ConceptBlankView", () => ({
  default: function ConceptBlankProbe({ active }: { active?: boolean }) {
    useEffect(() => {
      mocks.conceptBlankMount();
    }, []);
    return (
      <>
        <h2>개념 백지 패널</h2>
        <span data-testid="concept-blank-active">{String(active)}</span>
      </>
    );
  },
}));
vi.mock("@/components/math-srs/CourseDashboard", () => ({
  default: () => <h2>SRS 패널</h2>,
}));
// «오늘의 영어» 뷰 셋의 뿌리(D-148) — 셸이 주는 props 만 보이는 탐침
vi.mock("@/components/english/EnglishStudio", () => ({
  default: function EnglishProbe({
    view,
    bankSeed,
    openSetRequest,
    onSetOpened,
    newExamOpen,
    onNotice,
  }: {
    view: string;
    bankSeed?: EnglishBankMakerSeed;
    openSetRequest?: { id: string; version: number };
    onSetOpened: () => void;
    newExamOpen: boolean;
    onNotice: (message: string, tone?: "status" | "alert") => void;
  }) {
    useEffect(() => {
      mocks.englishMount();
    }, []);
    return (
      <>
        <h2>영어 패널</h2>
        <span data-testid="english-view">{view}</span>
        <span data-testid="english-bank-seed">{bankSeed?.requestId ?? ""}</span>
        <span data-testid="english-open-set">{openSetRequest?.id ?? ""}</span>
        <span data-testid="english-new-exam">{String(newExamOpen)}</span>
        <button
          onClick={() => {
            mocks.englishSetOpened();
            onSetOpened();
          }}
        >
          세트 열림 알림
        </button>
        <button onClick={() => onNotice("영어 알림 줄", "status")}>
          영어 알림
        </button>
      </>
    );
  },
}));
vi.mock("@/components/unified/TeachingOverview", () => ({
  default: function OverviewProbe() {
    useEffect(() => {
      mocks.overviewMount();
    }, []);
    return <h2>수업 요약</h2>;
  },
}));
vi.mock("@/components/unified/print/WorksheetPrint", () => ({
  WorksheetPrint: () => <p>인쇄 미리보기</p>,
}));

const initialData = {
  problems: [],
  total: 0,
  page: 1,
  pageSize: 20,
  grades: [],
  chapters: [],
};
const user = { name: "김선생", email: "teacher@example.com" };
const fetchMock = vi.fn<typeof fetch>();
const response = (menus: WorkspaceMenu[], extra = {}) =>
  new Response(
    JSON.stringify({
      data: {
        id: "teacher-one",
        ...user,
        role: "director",
        isAdmin: false,
        approvalStatus: "approved",
        menus,
        ...extra,
      },
    }),
    { status: 200 },
  );
function nav() {
  return within(screen.getByRole("navigation", { name: "작업실 메뉴" }));
}
/**
 * 시험지 화면으로 — 옆 메뉴에 «시험지 · 내보내기» 줄이 없다(원장님 2026-10-01). 시험지 쪽 화면이 아니면
 * «시험지 만들기»로 간 뒤 옆 «현재 시험지 · 편집 이어가기»로 연다.
 */
async function openWorksheet() {
  if (!screen.queryByRole("button", { name: /편집 이어가기/ }))
    fireEvent.click(nav().getByRole("button", { name: "시험지 만들기" }));
  fireEvent.click(await screen.findByRole("button", { name: /편집 이어가기/ }));
}
function nextCheck() {
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
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
  fetchMock
    .mockReset()
    .mockImplementation(async () => new Response(null, { status: 503 }));
  const cloud = privateServer();
  cloud.switchAccount("teacher-one");
  vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) =>
    String(url).startsWith("/api/library/")
      ? cloud.transport(url, init)
      : fetchMock(url, init),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("per-account workspace menu access", () => {
  it("opens the standalone English bank without mounting exam-dependent screens", async () => {
    window.history.replaceState(null, "", "/#english-bank");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-bank"]}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "영어 자료은행 패널" }),
    ).toBeVisible();
    expect(nav().getByRole("button", { name: "자료은행" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(mocks.englishMount).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "오늘 영어 작업실" }),
    ).toBeVisible();
  });

  it("hands bank selections to the correct existing English panes", async () => {
    window.history.replaceState(null, "", "/#english-bank");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-bank", "english-maker", "english-listening"]}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "은행 지문으로 제작" }),
    );
    expect(await screen.findByTestId("english-bank-seed")).toHaveTextContent(
      bankSeed.requestId,
    );
    expect(window.location.hash).toBe("#english-maker");
    fireEvent.click(nav().getByRole("button", { name: "자료은행" }));
    expect(
      screen.getByRole("heading", { name: "영어 자료은행 패널" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "영어 패널" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "은행 듣기 열기" }));
    expect(await screen.findByTestId("listening-open-set")).toHaveTextContent(
      "listening-from-bank",
    );
    expect(window.location.hash).toBe("#english-listening");
  });

  it("does not enqueue a maker seed when bank navigation is cancelled", async () => {
    window.history.replaceState(null, "", "/#english-bank");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-bank", "english-maker"]}
      />,
    );
    const cancel = (event: Event) => event.preventDefault();
    window.addEventListener("english-bank-before-leave", cancel);
    try {
      fireEvent.click(
        await screen.findByRole("button", { name: "은행 지문으로 제작" }),
      );
      expect(window.location.hash).toBe("#english-bank");
      expect(mocks.englishMount).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("english-bank-before-leave", cancel);
    }
    fireEvent.click(nav().getByRole("button", { name: "AI 문제 제작" }));
    expect(
      await screen.findByTestId("english-bank-seed"),
    ).toBeEmptyDOMElement();
  });
  it("uses the branch library name without a sidebar count and confirms worksheet scope before publishing", async () => {
    const cloud = privateServer();
    cloud.switchAccount("teacher-one");
    cloud.documents.set("teacher-one:saved-draft", {
      id: "saved-draft",
      kind: "draft",
      title: "공유할 시험지",
      problemCount: 1,
      revision: 1,
      visibility: "private",
      sharedBranchId: null,
      createdAt: "2026-10-02T00:00:00Z",
      updatedAt: "2026-10-02T00:00:00Z",
      payload: {
        version: 1,
        title: "공유할 시험지",
        problems: [{ id: "p1", content: "1+1" }],
        columns: 1,
        answers: false,
      },
    });
    const branchId = "30000000-0000-4000-8000-000000000003";
    fetchMock.mockImplementation(async () =>
      response(["export", "library"], { branchId }),
    );
    vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) =>
      String(url).startsWith("/api/library/")
        ? cloud.transport(url, init)
        : fetchMock(url, init),
    );
    window.history.replaceState(null, "", "/#export");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["export", "library"]}
        currentUser={{ ...user, branchId }}
        storageScope="teacher-one"
      />,
    );
    const save = await screen.findByRole("button", {
      name: "우리학원 시험지에 저장",
    });
    expect(
      nav().getByRole("button", { name: "우리학원 시험지" }).textContent,
    ).toBe("우리학원 시험지보관함");
    fireEvent.click(save);
    expect(
      screen.getByRole("dialog", { name: "우리학원 시험지에 저장" }),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: "학원에 비공개" })).toBeChecked();
    expect(cloud.documents.get("teacher-one:saved-draft")?.visibility).toBe(
      "private",
    );
    fireEvent.click(screen.getByRole("radio", { name: "학원에 공개" }));
    fireEvent.click(screen.getByRole("button", { name: "저장 확인" }));
    await waitFor(() =>
      expect(cloud.documents.get("teacher-one:saved-draft")?.visibility).toBe(
        "branch",
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(save);
    expect(screen.getByRole("radio", { name: "학원에 공개" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    // A new membership must not carry the old branch's public default forward.
    fetchMock.mockImplementation(async () =>
      response(["export", "library"], {
        branchId: "40000000-0000-4000-8000-000000000004",
      }),
    );
    await act(async () => {
      nextCheck();
      fireEvent.focus(window);
    });
    fireEvent.click(save);
    expect(screen.getByRole("radio", { name: "학원에 비공개" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "학원에 비공개" }));
    fireEvent.click(screen.getByRole("button", { name: "저장 확인" }));
    await waitFor(() =>
      expect(cloud.documents.get("teacher-one:saved-draft")?.visibility).toBe(
        "private",
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fetchMock.mockImplementation(async () =>
      response(["export", "library"], { branchId: null }),
    );
    await act(async () => {
      nextCheck();
      fireEvent.focus(window);
    });
    expect(nav().getByRole("button", { name: "내 시험지" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "내 시험지에 저장" }),
    ).toBeVisible();
    expect(cloud.documents.has("teacher-one:saved-draft")).toBe(true);
  });

  it.each(["home", "teaching", "concept", "srs"] as const)(
    "only warms worksheets from home and never saves on direct %s entry",
    async (tab) => {
      const cloud = privateServer();
      cloud.switchAccount("teacher-one");
      cloud.documents.set("teacher-one:saved-draft", {
        id: "saved-draft",
        kind: "draft",
        title: "기존 시험지",
        problemCount: 1,
        revision: 1,
        createdAt: "2026-09-23T00:00:00.000Z",
        updatedAt: "2026-09-23T00:00:00.000Z",
        payload: {
          version: 1,
          title: "기존 시험지",
          problems: [{ id: "p1", content: "1+1" }],
          columns: 1,
          answers: false,
        },
      });
      const menus = WORKSPACE_MENUS.map((menu) => menu.id);
      fetchMock.mockImplementation(async () => response(menus));
      vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) =>
        String(url).startsWith("/api/library/")
          ? cloud.transport(url, init)
          : fetchMock(url, init),
      );
      window.history.replaceState(null, "", `/#${tab}`);
      const get = vi.spyOn(Storage.prototype, "getItem");
      render(
        <UnifiedWorkspace
          initialData={initialData}
          currentUser={user}
          storageScope="teacher-one"
          allowedMenus={menus}
        />,
      );
      const heading = {
        home: "오늘의 작업",
        teaching: "수업 패널",
        concept: "개념 패널",
        srs: "SRS 패널",
      }[tab];
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      expect(fireEvent.keyDown(window, { key: "s", ctrlKey: true })).toBe(true);
      act(() => window.dispatchEvent(new Event("pagehide")));
      if (tab === "home") {
        await waitFor(() =>
          expect(
            cloud.transport.mock.calls.some(([url]) =>
              String(url).endsWith("/saved-draft"),
            ),
          ).toBe(true),
        );
        expect(
          cloud.transport.mock.calls.every(
            ([, init]) => !init?.method || init.method === "GET",
          ),
        ).toBe(true);
      } else {
        expect(cloud.transport).not.toHaveBeenCalled();
      }
      expect(
        get.mock.calls.some(([key]) => key.startsWith(DRAFT_STORE_KEY)),
      ).toBe(tab === "home");
      expect(screen.queryByText("계정에 저장됨")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/저장한 시험지를 불러오고/),
      ).not.toBeInTheDocument();

      await openWorksheet();
      const title = await screen.findByRole("textbox", { name: "제목" });
      expect(cloud.transport).toHaveBeenCalled();
      expect(
        within(screen.getByRole("banner")).queryByText(/저장|작업 준비/),
      ).not.toBeInTheDocument();
      fireEvent.change(title, { target: { value: "탭 이동 전 시험지" } });
      fireEvent.click(nav().getByRole("button", { name: "오늘의 개념" }));
      await waitFor(() =>
        expect(
          cloud.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
        ).toBe(true),
      );
      await act(async () => {});
      cloud.transport.mockClear();
      expect(fireEvent.keyDown(window, { key: "s", ctrlKey: true })).toBe(true);
      act(() => window.dispatchEvent(new Event("pagehide")));
      await act(async () => {});
      expect(cloud.transport).not.toHaveBeenCalled();
      await openWorksheet();
      expect(
        await screen.findByDisplayValue("탭 이동 전 시험지"),
      ).toBeVisible();
      expect(cloud.transport).not.toHaveBeenCalled();
    },
  );

  it("starts a new worksheet explicitly from SRS without requiring a prior worksheet visit", async () => {
    const cloud = privateServer();
    cloud.switchAccount("teacher-one");
    const menus: WorkspaceMenu[] = ["srs", "export"];
    fetchMock.mockImplementation(async () => response(menus));
    vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) =>
      String(url).startsWith("/api/library/")
        ? cloud.transport(url, init)
        : fetchMock(url, init),
    );
    window.history.replaceState(null, "", "/#srs");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        currentUser={user}
        storageScope="teacher-one"
        allowedMenus={menus}
      />,
    );
    await screen.findByRole("heading", { name: "SRS 패널" });
    fireEvent.click(screen.getByRole("button", { name: "새 시험지 만들기" }));
    const dialog = screen.getByRole("dialog", {
      name: "어디서부터 시작할까요?",
    });
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "SRS에서 시작한 시험지" },
    });
    expect(cloud.transport).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /빈 시험지로 시작하기/ }),
    );
    await waitFor(() => expect(window.location.hash).toBe("#export"));
    await waitFor(() =>
      expect(
        [...cloud.documents.values()].some(
          (document) => document.title === "SRS에서 시작한 시험지",
        ),
      ).toBe(true),
    );
  });

  it("restores a stable extraction query after fresh login and ignores it without studio access", async () => {
    window.history.replaceState(
      null,
      "",
      "/?extraction=saved-extraction#studio",
    );
    fetchMock.mockImplementation(async () => response(["studio", "library"]));
    const view = render(
      <UnifiedWorkspace
        initialData={initialData}
        currentUser={user}
        storageScope="teacher-one"
        allowedMenus={["studio", "library"]}
      />,
    );
    expect(await screen.findByTestId("studio-document-id")).toHaveTextContent(
      "saved-extraction",
    );
    view.unmount();
    mocks.studioMount.mockClear();
    fetchMock.mockImplementation(async () => response(["library"]));
    render(
      <UnifiedWorkspace
        initialData={initialData}
        currentUser={user}
        storageScope="teacher-one"
        allowedMenus={["library"]}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "내 시험지" }),
    ).toBeVisible();
    expect(mocks.studioMount).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#library");
  });
  it("keeps all development menus and shortcuts when access is omitted", async () => {
    render(<UnifiedWorkspace initialData={initialData} />);
    // 수학 제품의 메뉴만 — 영어 메뉴(D-148)는 브랜드 자리 «고르기 단추»로 넘어간 뒤의 옆 메뉴에 선다.
    // «시험지 · 내보내기»는 옆 메뉴에 줄이 없다(원장님 2026-10-01 — 문제 추출 · 시험지 만들기 · 내 시험지의 끝 단계).
    for (const menu of WORKSPACE_MENUS.filter(
      (item) =>
        workspaceMenuProduct(item.id) === "math" && item.id !== "export",
    ))
      expect(
        nav().getByRole("button", {
          name: menu.id === "bank" ? "시험지 만들기" : menu.label,
        }),
      ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "문제은행 바로 검색" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "수업 요약" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "AI 연결 설정" }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("puts «오늘의 개념» right below «수업 · 학생 관리» and mounts it only with the concept menu (D-124 ⑽)", async () => {
    const { unmount } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["teaching", "concept"]}
      />,
    );
    expect(
      nav()
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(["수업 · 학생 관리", "오늘의 개념"]);
    fireEvent.click(nav().getByRole("button", { name: "오늘의 개념" }));
    expect(
      await screen.findByRole("heading", { name: "개념 패널" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#concept");
    unmount();

    mocks.conceptMount.mockClear();
    window.history.replaceState(null, "", "/#concept");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["teaching"]}
      />,
    );
    expect(
      nav().queryByRole("button", { name: "오늘의 개념" }),
    ).not.toBeInTheDocument();
    await screen.findByRole("heading", { name: "수업 패널" });
    expect(mocks.conceptMount).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#teaching");
  });

  it("puts «개념 백지» right below «오늘의 개념», keeps it mounted when leaving and needs the conceptBlank menu (D-150)", async () => {
    const { unmount } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["teaching", "concept", "conceptBlank", "srs"]}
      />,
    );
    expect(
      nav()
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual([
      "수업 · 학생 관리",
      "오늘의 개념",
      "개념 백지",
      "오늘의 기억 · SRS",
    ]);
    fireEvent.click(nav().getByRole("button", { name: "개념 백지" }));
    expect(
      await screen.findByRole("heading", { name: "개념 백지 패널" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#conceptBlank");
    expect(screen.getByTestId("concept-blank-active")).toHaveTextContent(
      "true",
    );
    // 다른 메뉴로 가도 고르기를 잃지 않게 숨김으로 남고, 뷰에는 «지금 안 보임»을 알린다
    fireEvent.click(nav().getByRole("button", { name: "오늘의 개념" }));
    expect(screen.getByTestId("concept-blank-active")).toHaveTextContent(
      "false",
    );
    expect(mocks.conceptBlankMount).toHaveBeenCalledOnce();
    unmount();

    mocks.conceptBlankMount.mockClear();
    window.history.replaceState(null, "", "/#conceptBlank");
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["teaching", "concept"]}
      />,
    );
    expect(
      nav().queryByRole("button", { name: "개념 백지" }),
    ).not.toBeInTheDocument();
    await screen.findByRole("heading", { name: "수업 패널" });
    expect(mocks.conceptBlankMount).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#teaching");
  });

  it("hides disabled navigation, home cards, search, create choices and AI controls", () => {
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["home", "library"]}
      />,
    );
    expect(nav().getAllByRole("button")).toHaveLength(2);
    expect(
      screen.queryByRole("textbox", { name: "문제은행 바로 검색" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "자료 가져오기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "새 시험지 만들기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "AI 연결 설정" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("나의 수업 공간")).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-provider")).toHaveAttribute(
      "data-enabled",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "빠른 검색 열기" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(
      dialog.queryByRole("textbox", { name: "빠른 문제 검색" }),
    ).not.toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "내 시험지" })).toBeVisible();
    expect(
      dialog.queryByRole("button", { name: "문제은행" }),
    ).not.toBeInTheDocument();
    expect(mocks.bankMount).not.toHaveBeenCalled();
    expect(mocks.studioMount).not.toHaveBeenCalled();
    expect(mocks.teachingMount).not.toHaveBeenCalled();
    expect(mocks.overviewMount).not.toHaveBeenCalled();
  });

  it("rejects direct hash, history and browser-storage attempts and chooses the first allowed menu", async () => {
    window.history.replaceState(null, "", "/#studio");
    localStorage.setItem("today-math-workspace-view", "studio");
    localStorage.setItem(
      "today-math-allowed-menus",
      JSON.stringify(["studio"]),
    );
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["bank", "library"]}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "은행 패널" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#bank");
    for (const event of ["popstate", "hashchange"]) {
      act(() => {
        window.history.pushState(null, "", "/#teaching");
        window.dispatchEvent(new Event(event));
      });
      expect(window.location.hash).toBe("#bank");
    }
    fireEvent.click(screen.getByRole("button", { name: "내보내기 우회 검증" }));
    expect(window.location.hash).toBe("#bank");
    expect(screen.getByTestId("bank-export-access")).toHaveTextContent("false");
    expect(mocks.studioMount).not.toHaveBeenCalled();
    expect(mocks.teachingMount).not.toHaveBeenCalled();
  });

  it("keeps account settings and sign-out in the sidebar when every menu is disabled", async () => {
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={[]}
        currentUser={user}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "사용할 수 있는 메뉴가 없습니다" }),
    ).toBeVisible();
    expect(nav().queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
    fireEvent.click(screen.getByLabelText("내정보 메뉴"));
    expect(screen.getByRole("link", { name: "내정보 설정" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeVisible();
    fireEvent.submit(
      screen.getByRole("button", { name: "로그아웃" }).closest("form")!,
    );
    await waitFor(() => expect(signOutAction).toHaveBeenCalledOnce());
    expect(screen.getByText(user.email)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "빠른 검색 열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "새 시험지 만들기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("시험지 작업 파일 가져오기"),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.bankMount).not.toHaveBeenCalled();
    expect(mocks.overviewMount).not.toHaveBeenCalled();
  });

  it("«시험지 · 내보내기»는 옆 메뉴에 따로 없다 — 문제 추출 · 시험지 만들기 · 내 시험지의 끝 단계(원장님 2026-10-01)", async () => {
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["home", "bank", "studio", "export", "library"]}
        currentUser={user}
      />,
    );
    expect(
      nav().queryByRole("button", { name: "시험지 · 내보내기" }),
    ).not.toBeInTheDocument();
    // 화면은 그대로 있다 — 시험지 만들기에서 옆 «현재 시험지 · 편집 이어가기»로
    fireEvent.click(nav().getByRole("button", { name: "시험지 만들기" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /편집 이어가기/ }),
    );
    // 빈 시험지 화면 — 담는 길 셋이 뜬다
    expect(
      await screen.findByRole("button", { name: /문제은행에서 담기/ }),
    ).toBeVisible();
  });

  it("shows worksheet access in the sidebar without a duplicate header button", () => {
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["export"]}
        currentUser={user}
      />,
    );
    expect(
      nav().getByRole("button", { name: "시험지 · 내보내기" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("banner")).queryByRole("button", {
        name: /시험지 편집 열기|담은 문제/,
      }),
    ).toBeNull();
  });

  it("shows the higher management link only for the superadmin", () => {
    const { rerender } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={[]}
        currentUser={user}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "관리" }),
    ).not.toBeInTheDocument();
    rerender(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={[]}
        currentUser={{ ...user, isAdmin: true, isSuperAdmin: true }}
      />,
    );
    expect(screen.getByRole("link", { name: "관리" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("filters new worksheet choices and editor links to permitted destinations", async () => {
    render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["export"]} />,
    );
    // 안 A(2026-09-21) — 큰 제목 대신 같은 띠다. 자료 제작을 못 쓰는 계정이면
    // 앞 세 탭은 아예 서지 않고 제목도 「시험지 구성」이 된다.
    expect(
      await screen.findByRole("heading", { name: "시험지 구성" }),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "제작 단계 이동" }),
      ).getAllByRole("button"),
    ).toHaveLength(1);
    for (const name of ["원본 가져오기", "문제&도형 잘라내기"])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "문제은행에서 담기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "자료 가져오기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "이전 검토 단계" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "새 시험지 만들기" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(
      dialog.getByRole("button", { name: /빈 시험지로 시작하기/ }),
    ).toBeVisible();
    expect(
      dialog.queryByRole("button", { name: /문제은행에서 만들기/ }),
    ).not.toBeInTheDocument();
    expect(
      dialog.queryByRole("button", { name: /내 자료로 만들기/ }),
    ).not.toBeInTheDocument();
  });

  it("ignores a pending worksheet file read after export access is revoked", async () => {
    const { rerender } = render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["export"]} />,
    );
    await screen.findByRole("button", { name: "저장한 작업 불러오기" });
    let finishRead: ((value: string) => void) | undefined;
    const file = new File(["pending"], "worksheet.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: () =>
        new Promise<string>((resolve) => {
          finishRead = resolve;
        }),
    });
    fireEvent.change(screen.getByLabelText("시험지 작업 파일 가져오기"), {
      target: { files: [file] },
    });
    rerender(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["library"]} />,
    );
    await act(async () =>
      finishRead!(
        JSON.stringify({
          version: 1,
          title: "권한 없는 가져오기",
          problems: [{ id: "p1", content: "1+1" }],
          columns: 1,
          answers: false,
        }),
      ),
    );
    expect(window.location.hash).toBe("#library");
    expect(screen.queryByText("권한 없는 가져오기")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "작업 파일 불러오기" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_STORE_KEY) ?? "").not.toContain(
      "권한 없는 가져오기",
    );
  });

  it("keeps saved worksheets readable without exposing their disabled editor", async () => {
    const store = createWorkspaceDraftStore();
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "보관 중인 시험지",
      problems: [{ id: "p1", content: "1+1" }],
      columns: 1,
      answers: false,
    });
    render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["library"]} />,
    );
    expect(
      await screen.findByText("보관 중인 시험지", { exact: true }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "보관 중인 시험지 편집" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "보관 중인 시험지 이름 변경" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#library");
  });

  it("updates access on focus, unmounts revoked panels and retains the current scoped draft", async () => {
    const store = createWorkspaceDraftStore(() => ({
      getItem: (key) => localStorage.getItem(`${key}:teacher-one`),
      setItem: (key, value) =>
        localStorage.setItem(`${key}:teacher-one`, value),
    }));
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "초기 시험지",
      problems: [{ id: "p1", content: "1+1" }],
      columns: 1,
      answers: false,
    });
    fetchMock.mockImplementation(async () => response(["export", "studio"]));
    render(
      <UnifiedWorkspace
        initialData={initialData}
        currentUser={user}
        storageScope="teacher-one"
        allowedMenus={["export", "studio"]}
      />,
    );
    const title = await screen.findByRole("textbox", { name: "제목" });
    fireEvent.change(title, { target: { value: "권한 변경 중인 시험지" } });
    fireEvent.click(nav().getByRole("button", { name: "문제 추출" }));
    expect(
      await screen.findByRole("heading", { name: "자료 패널" }),
    ).toBeVisible();
    nextCheck();
    fetchMock.mockImplementation(async () =>
      response([], { isAdmin: true, isSuperAdmin: true }),
    );
    fireEvent.focus(window);
    await waitFor(() => expect(nav().queryAllByRole("button")).toHaveLength(0));
    expect(
      screen.getByRole("heading", { name: "사용할 수 있는 메뉴가 없습니다" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "자료 패널", hidden: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "관리" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByTestId("ai-provider")).toHaveAttribute(
      "data-enabled",
      "false",
    );
    nextCheck();
    fetchMock.mockImplementation(async () => response(["export"]));
    fireEvent.focus(window);
    expect(
      await screen.findByDisplayValue("권한 변경 중인 시험지"),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        localStorage.getItem(`${DRAFT_STORE_KEY}:cloud:teacher-one`),
      ).toContain("권한 변경 중인 시험지"),
    );
  });

  it("checks access every 30 seconds without remounting a still-allowed studio", async () => {
    const interval = vi.spyOn(window, "setInterval");
    const clear = vi.spyOn(window, "clearInterval");
    fetchMock.mockImplementation(async () => response(["studio"]));
    const { unmount } = render(
      <UnifiedWorkspace
        initialData={initialData}
        currentUser={user}
        storageScope="teacher-one"
        allowedMenus={["studio"]}
      />,
    );
    const field = await screen.findByRole("textbox", {
      name: "진행 중인 자료",
    });
    fireEvent.change(field, { target: { value: "검토 중인 크롭" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(interval).toHaveBeenCalledWith(expect.any(Function), 30_000);
    const accessInterval = interval.mock.calls.findIndex(
      ([, delay]) => delay === 30_000,
    );
    const tick = interval.mock.calls[accessInterval][0];
    const intervalId = interval.mock.results[accessInterval].value;
    nextCheck();
    fetchMock.mockImplementation(async () => response(["studio", "teaching"]));
    act(() => tick(undefined));
    await waitFor(() =>
      expect(
        nav().getByRole("button", { name: "수업 · 학생 관리" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("검토 중인 크롭")).toBeVisible();
    expect(mocks.studioMount).toHaveBeenCalledOnce();
    expect(mocks.teachingMount).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/account/access",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
    unmount();
    expect(clear).toHaveBeenCalledWith(intervalId);
  });

  it.each([
    [401, undefined, "/login"],
    [403, undefined, "/approval-pending"],
    [200, "pending", "/approval-pending"],
    [200, "rejected", "/approval-pending"],
  ])(
    "withdraws features and redirects denied access (%s / %s)",
    async (status, approvalStatus, destination) => {
      fetchMock.mockImplementation(async () =>
        status === 200
          ? response(["bank"], { approvalStatus })
          : new Response(null, { status }),
      );
      render(
        <UnifiedWorkspace
          initialData={initialData}
          currentUser={user}
          allowedMenus={["home"]}
        />,
      );
      await waitFor(() =>
        expect(mocks.replace).toHaveBeenCalledWith(destination),
      );
      expect(nav().queryAllByRole("button")).toHaveLength(0);
      fireEvent.click(screen.getByLabelText("내정보 메뉴"));
      expect(screen.getByRole("button", { name: "로그아웃" })).toBeVisible();
    },
  );
});

/**
 * D-148 — 브랜드 자리 «고르기 단추»(시안 C)와 영어 뷰 셋. 제품은 뷰에서 파생하고(`english*` → 영어) 저장하지 않는다.
 * 수학 순서 시험은 위 묶음 그대로(영어 탭은 **제품별 목록**이라 수학 목록에 끼지 않는다).
 */
describe("제품 전환 — 브랜드 자리 고르기 단추 (D-148)", () => {
  const ALL = WORKSPACE_MENUS.map((menu) => menu.id);
  const MATH_ONLY = ALL.filter((menu) => workspaceMenuProduct(menu) === "math");
  const brand = () => screen.getByRole("button", { name: /제품 고르기/ });
  const ENGLISH_NAV = [
    "오늘의 작업",
    "시험지 만들기",
    "AI 문제 제작",
    "내 문제 세트",
  ];
  const SET_ID = "73000000-0000-4000-8000-000000000001";

  it.each([
    ["english-school", "english", "오늘의 작업"],
    ["english-maker", "english-maker", "AI 문제 제작"],
    ["english-library", "english-library", "내 문제 세트"],
  ] as const)(
    "opens only the allowed English menu %s even from a forbidden hash",
    async (menu, view, label) => {
      window.history.replaceState(null, "", "/#english");
      render(
        <UnifiedWorkspace initialData={initialData} allowedMenus={[menu]} />,
      );
      expect(await screen.findByTestId("english-view")).toHaveTextContent(view);
      const nav = within(
        screen.getByRole("navigation", { name: "작업실 메뉴" }),
      );
      expect(nav.getAllByRole("button")).toHaveLength(
        menu === "english-library" ? 2 : 1,
      );
      expect(nav.getByRole("button", { name: label })).toHaveAttribute(
        "aria-current",
        "page",
      );
      if (menu !== "english-school")
        expect(
          screen.queryByRole("button", { name: "새 시험 등록" }),
        ).not.toBeInTheDocument();
    },
  );

  it("switches products to the first allowed English view", async () => {
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["home", "english-maker"]}
      />,
    );
    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 영어" }));
    expect(await screen.findByTestId("english-view")).toHaveTextContent(
      "english-maker",
    );
    expect(window.location.hash).toBe("#english-maker");
  });
  it("maximizes English without remounting its work and restores navigation with Escape", async () => {
    window.history.replaceState(null, "", "/#english-questions");
    const { container } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-library", "english-maker"]}
      />,
    );
    const panel = await screen.findByTestId("english-view");
    expect(panel).toHaveTextContent("english-questions");
    fireEvent.click(screen.getByRole("button", { name: "화면 최대화" }));
    expect(container.querySelector('[data-maximized="true"]')).not.toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "작업실 메뉴" }),
    ).toBeNull();
    expect(screen.getByTestId("english-view")).toBe(panel);
    expect(screen.getByRole("button", { name: "화면 복원" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.getByRole("navigation", { name: "작업실 메뉴" }),
    ).toBeVisible();
    expect(screen.getByTestId("english-view")).toBe(panel);
    expect(screen.getByRole("button", { name: "화면 최대화" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("상단바의 «화면 최대화»는 수학에도 같은 자리에 선다 — 옆 메뉴를 숨기고 Esc 로 되돌린다", async () => {
    const { container } = render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={MATH_ONLY} />,
    );
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "화면 최대화" }));
    expect(container.querySelector('[data-maximized="true"]')).not.toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "작업실 메뉴" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "화면 복원" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.getByRole("navigation", { name: "작업실 메뉴" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "화면 최대화" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("옆 메뉴는 두 제품이 같은 짜임이다 — 위는 공통 메뉴, 금 아래는 그 제품만의 메뉴", async () => {
    const labels = () =>
      nav()
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"));
    const groupStarts = () =>
      Array.from(
        document.querySelectorAll('nav [data-nav-group-start="true"]'),
      ).map((item) => item.querySelector("button")?.getAttribute("aria-label"));
    const iconOf = (name: string) =>
      nav().getByRole("button", { name }).querySelector("svg")?.innerHTML;
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    expect(labels()).toEqual([
      "오늘의 작업",
      "시험지 만들기",
      "문제 추출",
      "내 시험지",
      "교재 제작",
      "수업 · 학생 관리",
      "오늘의 개념",
      "개념 백지",
      "오늘의 기억 · SRS",
    ]);
    // 수학: 금은 «교재 제작» 위 — 영어에 짝이 없는 메뉴는 전부 아래 묶음이다
    expect(groupStarts()).toEqual(["교재 제작"]);
    const mathIcons = ["오늘의 작업", "시험지 만들기"].map(iconOf);
    const mathFolder = iconOf("내 시험지");

    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 영어" }));
    await screen.findByRole("heading", { name: "영어 패널" });
    expect(labels()).toEqual([...ENGLISH_NAV, "영어듣기", "자료은행"]);
    expect(groupStarts()).toEqual(["영어듣기"]);
    // 같은 자리 · 같은 일의 메뉴는 그림도 같다
    expect(["오늘의 작업", "시험지 만들기"].map(iconOf)).toEqual(mathIcons);
    expect(iconOf("내 문제 세트")).toBe(mathFolder);
    // 한 제품 안에서 같은 그림이 두 번 서지 않는다(접힌 옆 메뉴는 그림만 보인다)
    const english = labels().map((name) => iconOf(name!));
    expect(new Set(english).size).toBe(english.length);
  });

  it("금은 아래 묶음의 첫 메뉴에 붙는다 — 공통 메뉴가 하나도 없으면 금도 없다", () => {
    const groupStarts = () =>
      Array.from(
        document.querySelectorAll('nav [data-nav-group-start="true"]'),
      ).map((item) => item.querySelector("button")?.getAttribute("aria-label"));
    const { unmount } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["home", "teaching", "concept"]}
      />,
    );
    // «교재 제작»이 꺼진 계정: 금은 다음 메뉴로 내려간다(예전에는 «수업 · 학생 관리»에 박혀 있었다)
    expect(groupStarts()).toEqual(["수업 · 학생 관리"]);
    unmount();
    const second = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["home", "concept", "srs"]}
      />,
    );
    expect(groupStarts()).toEqual(["오늘의 개념"]);
    second.unmount();
    const third = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["teaching", "concept"]}
      />,
    );
    expect(groupStarts()).toEqual([]);
    third.unmount();
    render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-listening", "english-bank"]}
      />,
    );
    expect(groupStarts()).toEqual([]);
  });

  it("does not send a set deep link without library access and removes a revoked view", async () => {
    window.history.replaceState(null, "", `/?set=${SET_ID}#english-library`);
    const { rerender } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-library", "english-maker"]}
      />,
    );
    expect(await screen.findByTestId("english-open-set")).toHaveTextContent(
      SET_ID,
    );
    rerender(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={["english-maker"]}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("english-view")).toHaveTextContent(
        "english-maker",
      ),
    );
    expect(screen.getByTestId("english-open-set")).toBeEmptyDOMElement();
    expect(
      within(
        screen.getByRole("navigation", { name: "작업실 메뉴" }),
      ).queryByRole("button", { name: "내 문제 세트" }),
    ).not.toBeInTheDocument();
  });

  it("제품 목록은 권한 있는 제품만 — 영어 메뉴가 없으면 지금 모습 그대로(▾ 없음 · 목록 없음)", () => {
    const { unmount } = render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={MATH_ONLY} />,
    );
    expect(screen.queryByRole("button", { name: /제품 고르기/ })).toBeNull();
    const plain = screen.getByRole("button", { name: "오늘 수학 홈" });
    expect(plain).not.toHaveAttribute("aria-haspopup");
    fireEvent.click(plain);
    expect(screen.queryByRole("listbox", { name: "제품" })).toBeNull();
    expect(window.location.hash).toBe("");
    unmount();

    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    const picker = brand();
    expect(picker).toHaveAttribute("aria-haspopup", "listbox");
    expect(picker).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(picker);
    const list = within(screen.getByRole("listbox", { name: "제품" }));
    expect(
      list.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["오늘 수학", "오늘 영어"]);
    expect(list.getByRole("option", { name: "오늘 수학" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(picker).toHaveAttribute("aria-expanded", "true");
  });

  it("영어 메뉴만 있는 계정은 제품이 하나라 목록이 없고 옆 메뉴가 바로 영어 탭 셋이다", async () => {
    render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["english"]} />,
    );
    expect(screen.queryByRole("button", { name: /제품 고르기/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "오늘 영어 작업실" }),
    ).toBeVisible();
    expect(
      nav()
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(ENGLISH_NAV);
    expect(
      await screen.findByRole("heading", { name: "영어 패널" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#english");
    expect(screen.getByRole("button", { name: "새 시험 등록" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "새 시험지 만들기" }),
    ).toBeNull();
  });

  it("영어로 넘어가면 허용된 영어 메뉴와 새 시험 등록이 보이고 수학 메뉴도 유지된다", async () => {
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 영어" }));
    expect(
      nav()
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([...ENGLISH_NAV, "영어듣기", "자료은행"]);
    expect(nav().getByRole("button", { name: "오늘의 작업" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(window.location.hash).toBe("#english");
    expect(
      await screen.findByRole("heading", { name: "영어 패널" }),
    ).toBeVisible();
    expect(screen.getByTestId("english-view")).toHaveTextContent("english");
    // 옆 메뉴는 두 제품이 한 벌이다 — 수학에 없는 캡션 줄은 영어에도 없다(원장님 2026-10-08)
    expect(screen.queryByText("오늘 영어", { selector: "p" })).toBeNull();
    expect(screen.getByRole("button", { name: "새 시험 등록" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "새 시험지 만들기" }),
    ).toBeNull();
    expect(screen.queryByRole("listbox", { name: "제품" })).toBeNull();
    expect(brand()).toHaveAccessibleName("제품 고르기 — 오늘 영어");
    expect(
      within(screen.getByRole("banner")).getByText("오늘의 작업"),
    ).toBeVisible();

    // 옆 메뉴 파란 단추 → 셸 modal «english-exam» 이 영어 뷰에 전해진다(창은 영어 뷰가 그린다)
    fireEvent.click(screen.getByRole("button", { name: "새 시험 등록" }));
    expect(screen.getByTestId("english-new-exam")).toHaveTextContent("true");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(nav().getByRole("button", { name: "내 문제 세트" }));
    expect(window.location.hash).toBe("#english-library");
    expect(screen.getByTestId("english-view")).toHaveTextContent(
      "english-library",
    );
    expect(screen.getByTestId("english-new-exam")).toHaveTextContent("false");

    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 수학" }));
    // «시험지 · 내보내기»는 옆 메뉴에 줄이 없다(원장님 2026-10-01)
    expect(nav().getAllByRole("button")).toHaveLength(MATH_ONLY.length - 1);
    expect(window.location.hash).toBe("");
    expect(brand()).toHaveAccessibleName("제품 고르기 — 오늘 수학");
    // 영어 뷰는 숨김으로 남는다(상태를 잃지 않는다) — 다시 마운트하지 않는다
    expect(mocks.englishMount).toHaveBeenCalledOnce();
    expect(screen.queryByRole("heading", { name: "영어 패널" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "영어 패널", hidden: true }),
    ).toBeInTheDocument();
  });

  it("고르기 단추는 키보드로 오간다 — ↑↓ Enter Esc · 바깥 클릭 닫힘 · 포커스 되돌림", async () => {
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    const picker = brand();
    picker.focus();
    fireEvent.keyDown(picker, { key: "ArrowDown" });
    const list = screen.getByRole("listbox", { name: "제품" });
    const options = within(list).getAllByRole("option");
    expect(options[0]).toHaveFocus();
    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();
    fireEvent.keyDown(options[1], { key: "ArrowDown" });
    expect(options[0]).toHaveFocus();
    fireEvent.keyDown(options[0], { key: "ArrowUp" });
    expect(options[1]).toHaveFocus();
    fireEvent.keyDown(options[1], { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "제품" })).toBeNull();
    expect(picker).toHaveFocus();
    expect(window.location.hash).toBe("");

    fireEvent.keyDown(picker, { key: "ArrowDown" });
    fireEvent.keyDown(
      within(screen.getByRole("listbox", { name: "제품" })).getAllByRole(
        "option",
      )[0],
      { key: "ArrowDown" },
    );
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    expect(window.location.hash).toBe("#english");
    expect(screen.queryByRole("listbox", { name: "제품" })).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "영어 패널" }),
    ).toBeVisible();

    fireEvent.click(brand());
    expect(screen.getByRole("listbox", { name: "제품" })).toBeVisible();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox", { name: "제품" })).toBeNull();
  });

  it("#english-maker 를 바로 열면 만들기 탭이 켜지고 브레드크럼이 그 이름이다", async () => {
    window.history.replaceState(null, "", "/#english-maker");
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    expect(
      await screen.findByRole("heading", { name: "영어 패널" }),
    ).toBeVisible();
    expect(screen.getByTestId("english-view")).toHaveTextContent(
      "english-maker",
    );
    expect(nav().getByRole("button", { name: "AI 문제 제작" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(screen.getByRole("banner")).getByText("AI 문제 제작"),
    ).toBeVisible();
    expect(window.location.hash).toBe("#english-maker");
    // 빠른 검색에는 두 제품이 다 선다
    fireEvent.click(screen.getByRole("button", { name: "빠른 검색 열기" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "내 문제 세트" })).toBeVisible();
    expect(dialog.getByRole("button", { name: "내 시험지" })).toBeVisible();
    fireEvent.click(dialog.getByRole("button", { name: "내 시험지" }));
    expect(window.location.hash).toBe("#library");
    // «시험지 · 내보내기»는 옆 메뉴에 줄이 없다(원장님 2026-10-01)
    expect(nav().getAllByRole("button")).toHaveLength(MATH_ONLY.length - 1);
  });

  it("영어 메뉴가 없으면 #english 는 첫 허용 메뉴로 떨어지고 영어 뷰는 마운트되지 않는다", async () => {
    window.history.replaceState(null, "", "/#english-library");
    render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["library"]} />,
    );
    expect(
      await screen.findByRole("heading", { name: "내 시험지" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#library");
    expect(mocks.englishMount).not.toHaveBeenCalled();
  });

  it("?set= 딥링크는 영어 뷰에 세트 id 를 넘기고, 열리면 URL 에서 set 을 지운다", async () => {
    window.history.replaceState(null, "", `/?set=${SET_ID}#english`);
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    expect(await screen.findByTestId("english-open-set")).toHaveTextContent(
      SET_ID,
    );
    expect(window.location.search).toBe(`?set=${SET_ID}`);
    fireEvent.click(screen.getByRole("button", { name: "세트 열림 알림" }));
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#english-library");
  });

  it("?set= 은 해시가 없어도 영어 뷰를 열고, 모양이 틀리면 넘기지 않는다", async () => {
    window.history.replaceState(null, "", `/?set=${SET_ID}`);
    const { unmount } = render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />,
    );
    expect(await screen.findByTestId("english-open-set")).toHaveTextContent(
      SET_ID,
    );
    expect(window.location.hash).toBe("#english-library");
    unmount();
    mocks.englishMount.mockClear();

    window.history.replaceState(null, "", "/?set=not-a-uuid#english");
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    expect(await screen.findByTestId("english-open-set")).toHaveTextContent("");
  });

  it("영어 권한이 없으면 ?set= 은 무시된다", async () => {
    window.history.replaceState(null, "", `/?set=${SET_ID}#english`);
    render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={MATH_ONLY} />,
    );
    expect(
      await screen.findByRole("heading", { name: "오늘의 작업" }),
    ).toBeVisible();
    expect(mocks.englishMount).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("접힌 옆 메뉴 — 두 제품이 같은 머리다: 마크(고르기 단추)가 접기 단추 위에 서고 딱지 «수» · «영»이 붙는다", async () => {
    const root = () => document.querySelector("[data-sidebar-collapsed]")!;
    const { unmount } = render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={MATH_ONLY} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "왼쪽 메뉴 접기" }));
    // 제품 하나 계정도 같은 표지 · 같은 딱지 — 접힌 머리의 배치는 제품을 보지 않는다
    expect(root()).toHaveAttribute("data-product", "math");
    expect(screen.getByTestId("product-badge")).toHaveTextContent("수");
    unmount();
    // 접힘은 브라우저 설정으로 남는다 — 다음 렌더가 그것을 되살리지 않게 지운다
    localStorage.removeItem("today-math-sidebar-collapsed");

    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    fireEvent.click(screen.getByRole("button", { name: "왼쪽 메뉴 접기" }));
    expect(
      screen.getByRole("button", { name: "왼쪽 메뉴 펼치기" }),
    ).toBeVisible();
    expect(root()).toHaveAttribute("data-product", "math");
    const mathBadge = screen.getByTestId("product-badge");
    expect(mathBadge).toHaveTextContent("수");
    expect(mathBadge).toHaveAttribute("aria-hidden", "true");
    // 딱지는 브랜드 단추의 마크 안에 있다 — 수학에서도 접힌 채 마크를 눌러 제품을 바꾼다
    expect(brand().contains(mathBadge)).toBe(true);
    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 영어" }));
    expect(root()).toHaveAttribute("data-product", "english");
    const badge = screen.getByTestId("product-badge");
    expect(badge).toHaveTextContent("영");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(brand().contains(badge)).toBe(true);
    fireEvent.click(brand());
    expect(screen.getByRole("listbox", { name: "제품" })).toBeVisible();
    fireEvent.click(screen.getByRole("option", { name: "오늘 수학" }));
    expect(root()).toHaveAttribute("data-product", "math");
    expect(screen.getByTestId("product-badge")).toHaveTextContent("수");
  });

  it("영어만 있는 계정도 접힘에서 표지와 딱지 «영»이 붙는다 (검토 #9)", () => {
    render(
      <UnifiedWorkspace initialData={initialData} allowedMenus={["english"]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "왼쪽 메뉴 접기" }));
    expect(document.querySelector("[data-sidebar-collapsed]")).toHaveAttribute(
      "data-product",
      "english",
    );
    expect(screen.getByTestId("product-badge")).toHaveTextContent("영");
  });

  it("옆 메뉴의 «AI 작업 연결» 판은 수학 제품에만 선다 (검토 #3)", async () => {
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    expect(
      screen.getByRole("button", { name: "AI 연결 설정" }),
    ).toBeInTheDocument();
    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 영어" }));
    await screen.findByRole("heading", { name: "영어 패널" });
    expect(screen.queryByRole("button", { name: "AI 연결 설정" })).toBeNull();
    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 수학" }));
    expect(
      screen.getByRole("button", { name: "AI 연결 설정" }),
    ).toBeInTheDocument();
  });

  it("제품 목록에서 Tab 으로 초점이 목록 밖으로 나가면 닫힌다 (검토 #13)", () => {
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    fireEvent.click(brand());
    const options = within(
      screen.getByRole("listbox", { name: "제품" }),
    ).getAllByRole("option");
    options[0].focus();
    // 목록 안에서 옮기는 것은 그대로
    fireEvent.focusOut(options[0], { relatedTarget: options[1] });
    expect(screen.getByRole("listbox", { name: "제품" })).toBeVisible();
    // 목록 밖(윗줄 «빠른 검색 열기»)으로 나가면 닫힌다
    fireEvent.focusOut(options[1], {
      relatedTarget: screen.getByRole("button", { name: "빠른 검색 열기" }),
    });
    expect(screen.queryByRole("listbox", { name: "제품" })).toBeNull();
    expect(brand()).toHaveAttribute("aria-expanded", "false");
  });

  it("영어에서는 «현재 시험지» 카드 · 담기 바가 안 뜨고, 영어 뷰의 알림은 셸 알림 줄로 나온다", async () => {
    const store = createWorkspaceDraftStore();
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "수학 시험지",
      problems: [{ id: "p1", content: "1+1" }],
      columns: 1,
      answers: false,
    });
    window.history.replaceState(null, "", "/#export");
    render(<UnifiedWorkspace initialData={initialData} allowedMenus={ALL} />);
    expect(await screen.findByText("현재 시험지")).toBeVisible();
    fireEvent.click(brand());
    fireEvent.click(screen.getByRole("option", { name: "오늘 영어" }));
    expect(screen.queryByText("현재 시험지")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "제목" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "영어 알림" }));
    expect(screen.getByRole("status")).toHaveTextContent("영어 알림 줄");
  });
});
