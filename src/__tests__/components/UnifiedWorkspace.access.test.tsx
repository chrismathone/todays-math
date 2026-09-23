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
import {
  WORKSPACE_MENUS,
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
}));
const router = { replace: mocks.replace };
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
vi.mock("@/components/unified/BankView", () => ({
  default: function BankProbe({
    onExport,
    canExport,
  }: {
    onExport: () => void;
    canExport: boolean;
  }) {
    useEffect(() => {
      mocks.bankMount();
    }, []);
    return (
      <>
        <h2>은행 패널</h2>
        <button onClick={onExport}>내보내기 우회 검증</button>
        <span data-testid="bank-export-access">{String(canExport)}</span>
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
vi.mock("@/components/math-srs/CourseDashboard", () => ({
  default: () => <h2>SRS 패널</h2>,
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
  it.each(["home", "teaching", "concept", "srs"] as const)(
    "does not load or save worksheets when entering %s directly",
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
      expect(cloud.transport).not.toHaveBeenCalled();
      expect(
        get.mock.calls.some(([key]) => key.startsWith(DRAFT_STORE_KEY)),
      ).toBe(false);
      expect(screen.queryByText("계정에 저장됨")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/저장한 시험지를 불러오고/),
      ).not.toBeInTheDocument();

      fireEvent.click(nav().getByRole("button", { name: "시험지 · 내보내기" }));
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
      fireEvent.click(nav().getByRole("button", { name: "시험지 · 내보내기" }));
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
    for (const menu of WORKSPACE_MENUS)
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

  it("shows only the access notice and account actions when every menu is disabled", () => {
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
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeVisible();
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

  it("shows the admin link only for explicit admin identity, including zero-menu admins", () => {
    const { rerender } = render(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={[]}
        currentUser={user}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "관리자" }),
    ).not.toBeInTheDocument();
    rerender(
      <UnifiedWorkspace
        initialData={initialData}
        allowedMenus={[]}
        currentUser={{ ...user, isAdmin: true }}
      />,
    );
    expect(screen.getByRole("link", { name: "관리자" })).toHaveAttribute(
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
    fireEvent.click(nav().getByRole("button", { name: "자료 제작" }));
    expect(
      await screen.findByRole("heading", { name: "자료 패널" }),
    ).toBeVisible();
    nextCheck();
    fetchMock.mockImplementation(async () => response([], { isAdmin: true }));
    fireEvent.focus(window);
    await waitFor(() => expect(nav().queryAllByRole("button")).toHaveLength(0));
    expect(
      screen.getByRole("heading", { name: "사용할 수 있는 메뉴가 없습니다" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "자료 패널", hidden: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "관리자" })).toHaveAttribute(
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
      expect(
        screen.getByRole("button", { name: "로그아웃" }),
      ).toBeInTheDocument();
    },
  );
});
