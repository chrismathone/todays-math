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
import type { PrivateDocumentSummary } from "@/contracts/privateWorkspace.contract";
import PrivateLibrary from "@/components/unified/PrivateLibrary";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { privateServer, sessionData } from "../fixtures/privateCloud";

// jsdom 은 `showModal()` 이 없다 — 작업실 시험(`UnifiedWorkspace.access`)과 같은 대역.
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
beforeEach(() => {
  showModal.mockClear();
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: showModal },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
const boardRow = (title: string) =>
  within(screen.getByRole("button", { name: `${title} 열기` }).closest("tr")!);
const boardItems: PrivateDocumentSummary[] = [
  {
    id: "alpha",
    kind: "draft",
    title: "Alpha 학습지",
    problemCount: 12,
    revision: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "beta",
    kind: "draft",
    title: "beta 평가",
    problemCount: 4,
    revision: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-03T00:00:00Z",
  },
  {
    id: "gamma",
    kind: "extraction",
    title: "Gamma 추출 자료",
    problemCount: 25,
    revision: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-02T00:00:00Z",
  },
];
const boardProps = () => ({
  storageScope: "owner-a",
  canExport: true,
  canStudio: true,
  onOpenDraft: vi.fn(),
  onOpenExtraction: vi.fn(),
});
const listResponse = (items: PrivateDocumentSummary[]) =>
  Response.json({ data: items, meta: { total: items.length } });
const titles = () =>
  within(screen.getByRole("table", { name: "저장한 자료 목록" }))
    .getAllByRole("button", { name: / 열기$/ })
    .map((button) => button.textContent);

describe("private library board", () => {
  it("keeps saved arithmetic output in its library category, outside autosaved work", async () => {
    const arithmetic: PrivateDocumentSummary = {
      ...boardItems[0],
      kind: "arithmeticSheet",
      title: "분수 연산 복습",
      workflow: { source: "arithmetic", step: "output" },
    };
    const working: PrivateDocumentSummary = {
      ...boardItems[1],
      workflow: { source: "bank", step: "review" },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => listResponse([arithmetic, working])),
    );
    const onOpenArithmetic = vi.fn();
    render(
      <PrivateLibrary
        {...boardProps()}
        canArithmetic
        onOpenArithmetic={onOpenArithmetic}
      />,
    );
    await screen.findByRole("button", { name: "분수 연산 복습 수정" });
    expect(
      screen.queryByRole("button", { name: "분수 연산 복습 이어서 작업" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "작업 중 1" }));
    expect(
      screen.queryByRole("button", { name: "분수 연산 복습 열기" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "연산 연습지 1" }));
    fireEvent.click(
      screen.getByRole("button", { name: "분수 연산 복습 수정" }),
    );
    await waitFor(() => expect(onOpenArithmetic).toHaveBeenCalledWith("alpha"));
  });
  it("separates working documents and resumes the saved stage while edit opens output", async () => {
    const working = {
      ...boardItems[0],
      workflow: { source: "bank" as const, step: "review" as const },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => listResponse([working, boardItems[1]])),
    );
    const props = boardProps();
    render(<PrivateLibrary {...props} />);
    await screen.findByRole("button", { name: "Alpha 학습지 이어서 작업" });
    fireEvent.click(screen.getByRole("button", { name: "작업 중 1" }));
    expect(screen.queryByRole("button", { name: "beta 평가 열기" })).toBeNull();
    expect(screen.getByText("2 문항 검토")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Alpha 학습지 이어서 작업" }),
    );
    await waitFor(() =>
      expect(props.onOpenDraft).toHaveBeenCalledWith("alpha", {
        mode: "resume",
        workflow: working.workflow,
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Alpha 학습지 수정" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Alpha 학습지 수정" }));
    await waitFor(() =>
      expect(props.onOpenDraft).toHaveBeenLastCalledWith("alpha"),
    );
  });
  it("shows branch authors, separates colliding IDs, opens a private copy, and filters to mine", async () => {
    const mine = {
      ...boardItems[0],
      ownerId: "owner-a",
      ownerName: "나",
      visibility: "private" as const,
    };
    const colleague = {
      ...boardItems[0],
      ownerId: "owner-b",
      ownerName: "동료",
      visibility: "branch" as const,
      title: "공개 시험지",
    };
    const transport = vi.fn<typeof fetch>(async (url, init) => {
      if (init?.method === "POST")
        return Response.json({
          data: {
            ...colleague,
            id: "new-copy",
            ownerId: "owner-a",
            visibility: "private",
          },
        });
      return listResponse(
        String(url).includes("mine=true") ? [mine] : [mine, colleague],
      );
    });
    vi.stubGlobal("fetch", transport);
    const props = boardProps();
    render(<PrivateLibrary {...props} branchId="branch-a" />);
    expect(
      screen.getByRole("heading", { name: "우리학원 시험지" }),
    ).toBeVisible();
    const shared = await screen.findByRole("button", {
      name: "공개 시험지 사본으로 열기",
    });
    expect(screen.getByText(/작성자: 동료/)).toBeVisible();
    expect(
      within(shared.closest("tr")!).queryByRole("button", {
        name: /삭제/,
      }),
    ).toBeNull();
    expect(
      boardRow(mine.title).getByRole("button", { name: /정보/ }),
    ).toBeVisible();
    fireEvent.click(shared);
    await waitFor(() =>
      expect(props.onOpenDraft).toHaveBeenCalledWith("new-copy"),
    );
    expect(
      transport.mock.calls.find(([, init]) => init?.method === "POST")?.[0],
    ).toBe("/api/library/documents/alpha?ownerId=owner-b");
    fireEvent.click(screen.getByRole("checkbox", { name: "내 시험지만 보기" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "공개 시험지 사본으로 열기" }),
      ).toBeNull(),
    );
    expect(screen.getByText(/저장한 자료/)).toHaveTextContent(
      "저장한 자료 1개",
    );
  });

  it("drops shared rows and branch controls when membership changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        listResponse(
          String(url).includes("mine=true")
            ? []
            : [{ ...boardItems[0], ownerId: "owner-b", ownerName: "동료" }],
        ),
      ),
    );
    const props = boardProps();
    const view = render(<PrivateLibrary {...props} branchId="branch-a" />);
    await screen.findByText(/작성자: 동료/);
    view.rerender(<PrivateLibrary {...props} branchId={null} />);
    expect(screen.getByRole("heading", { name: "내 시험지" })).toBeVisible();
    expect(screen.queryByText(/작성자: 동료/)).toBeNull();
    expect(
      screen.queryByRole("checkbox", { name: "내 시험지만 보기" }),
    ).toBeNull();
  });

  it("shows six columns, counts, newest order and client-side search, kind and sorting without writes", async () => {
    const transport = vi.fn<typeof fetch>(async () => listResponse(boardItems));
    vi.stubGlobal("fetch", transport);
    render(<PrivateLibrary {...boardProps()} />);
    await screen.findByRole("table");
    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(["번호", "종류", "자료 이름", "문항 수", "최근 수정", "관리"]);
    expect(titles()).toEqual(["beta 평가", "Gamma 추출 자료", "Alpha 학습지"]);
    expect(boardRow("Alpha 학습지").getAllByRole("cell")).toHaveLength(6);
    expect(screen.getByText(/저장한 자료/).textContent).toBe("저장한 자료 3개");

    fireEvent.change(screen.getByRole("combobox", { name: "자료 정렬" }), {
      target: { value: "name" },
    });
    expect(titles()).toEqual(["Alpha 학습지", "beta 평가", "Gamma 추출 자료"]);
    fireEvent.change(screen.getByRole("combobox", { name: "자료 정렬" }), {
      target: { value: "count" },
    });
    expect(titles()).toEqual(["Gamma 추출 자료", "Alpha 학습지", "beta 평가"]);
    fireEvent.change(screen.getByRole("combobox", { name: "자료 종류" }), {
      target: { value: "draft" },
    });
    expect(titles()).toEqual(["Alpha 학습지", "beta 평가"]);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "저장한 자료 검색" }),
      { target: { value: "  ALPHA  " } },
    );
    expect(titles()).toEqual(["Alpha 학습지"]);
    expect(screen.getByText(/저장한 자료/)).toHaveTextContent(
      "저장한 자료 3개 · 검색 결과 1개",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "자료 종류" }), {
      target: { value: "extraction" },
    });
    expect(
      screen.getByRole("heading", { name: "조건에 맞는 자료가 없습니다" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "검색 조건 초기화" }));
    expect(titles()).toEqual(["Gamma 추출 자료", "Alpha 학습지", "beta 평가"]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(
      transport.mock.calls.every(
        ([, init]) => !init?.method || init.method === "GET",
      ),
    ).toBe(true);
  });

  it("opens titles by keyboard, reports failures in the row and permits retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => listResponse(boardItems)),
    );
    const props = boardProps();
    props.onOpenDraft.mockRejectedValueOnce(
      new Error("열기 실패: 다시 시도해 주세요."),
    );
    render(<PrivateLibrary {...props} />);
    const title = await screen.findByRole("button", {
      name: "Alpha 학습지 열기",
    });
    const user = userEvent.setup();
    title.focus();
    await user.keyboard("{Enter}");
    expect(
      await boardRow("Alpha 학습지").findByRole("alert"),
    ).toHaveTextContent("열기 실패");
    expect(title).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(
        boardRow("Alpha 학습지").queryByRole("alert"),
      ).not.toBeInTheDocument(),
    );
    expect(props.onOpenDraft).toHaveBeenNthCalledWith(1, "alpha");
    expect(props.onOpenDraft).toHaveBeenNthCalledWith(2, "alpha");
  });

  // 원장님 2026-10-01 «개념 백지를 담아서 내 시험지에 저장하고 다음에 또 쓸수 있게»(26 §9 ⑾).
  it("lists a saved concept blank as «개념 백지», filters it and opens it in the concept blank tab", async () => {
    const blank: PrivateDocumentSummary = {
      id: "blank-1",
      kind: "conceptBlank",
      title: "합동 백지",
      problemCount: 30,
      revision: 2,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => listResponse([...boardItems, blank])),
    );
    const props = { ...boardProps(), onOpenConceptBlank: vi.fn() };
    const { rerender } = render(<PrivateLibrary {...props} canConceptBlank />);
    await screen.findByRole("table");
    expect(boardRow("합동 백지").getByText("개념 백지")).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "자료 종류" }), {
      target: { value: "conceptBlank" },
    });
    expect(titles()).toEqual(["합동 백지"]);
    fireEvent.click(screen.getByRole("button", { name: "합동 백지 열기" }));
    await waitFor(() =>
      expect(props.onOpenConceptBlank).toHaveBeenCalledWith("blank-1"),
    );
    expect(props.onOpenDraft).not.toHaveBeenCalled();
    expect(props.onOpenExtraction).not.toHaveBeenCalled();

    // 개념 백지 메뉴가 없으면 열 수 없다(정보 · 삭제는 그대로)
    rerender(<PrivateLibrary {...props} canConceptBlank={false} />);
    expect(
      screen.queryByRole("button", { name: "합동 백지 열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "합동 백지 정보" }),
    ).toBeEnabled();
  });

  it("caps a concept blank's new name at the sheet title limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        listResponse([
          {
            id: "blank-1",
            kind: "conceptBlank",
            title: "합동 백지",
            problemCount: 30,
            revision: 2,
            createdAt: "2026-10-01T00:00:00Z",
            updatedAt: "2026-10-01T00:00:00Z",
          },
        ]),
      ),
    );
    render(<PrivateLibrary {...boardProps()} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "합동 백지 정보" }),
    );
    expect(screen.getByRole("textbox", { name: "자료 이름" })).toHaveAttribute(
      "maxLength",
      "40",
    );
  });

  it("preserves both types and management actions when opening permissions are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => listResponse(boardItems)),
    );
    const props = boardProps();
    render(
      <PrivateLibrary
        {...props}
        canExport={false}
        canStudio={false}
        onImport={vi.fn()}
      />,
    );
    await screen.findByRole("table");
    expect(
      screen.queryByRole("button", { name: /열기$/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("열기 권한 없음")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Gamma 추출 자료 정보" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Gamma 추출 자료 삭제" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "작업 파일 불러오기" }),
    ).not.toBeInTheDocument();
    expect(props.onOpenDraft).not.toHaveBeenCalled();
    expect(props.onOpenExtraction).not.toHaveBeenCalled();
  });

  it("ignores an older list that finishes after a focus refresh and clears loading", async () => {
    const replies: ((response: Response) => void)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => replies.push(resolve))),
    );
    render(<PrivateLibrary {...boardProps()} />);
    fireEvent(window, new Event("focus"));
    expect(replies).toHaveLength(2);
    await act(async () => replies[1](listResponse([boardItems[1]])));
    expect(titles()).toEqual(["beta 평가"]);
    expect(
      screen.queryByText("저장한 자료를 불러오는 중입니다…"),
    ).not.toBeInTheDocument();
    await act(async () => replies[0](listResponse([boardItems[0]])));
    expect(titles()).toEqual(["beta 평가"]);
  });

  it("discards the old account immediately and ignores its delayed refresh", async () => {
    let release!: (response: Response) => void;
    let hold = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const owner = new Headers(init?.headers).get("x-workspace-owner");
        if (owner === "owner-b") return listResponse([boardItems[1]]);
        if (hold)
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        return listResponse([boardItems[0]]);
      }),
    );
    const props = boardProps();
    const { rerender } = render(<PrivateLibrary {...props} />);
    await screen.findByRole("button", { name: "Alpha 학습지 열기" });
    hold = true;
    fireEvent(window, new Event("focus"));
    rerender(<PrivateLibrary {...props} storageScope="owner-b" />);
    expect(
      screen.queryByRole("button", { name: "Alpha 학습지 열기" }),
    ).not.toBeInTheDocument();
    await screen.findByRole("button", { name: "beta 평가 열기" });
    await act(async () => release(listResponse([boardItems[0]])));
    expect(titles()).toEqual(["beta 평가"]);
  });
});

describe("private library", () => {
  it("lists both kinds, opens stable IDs, and waits for persisted rename/delete results", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.save(
      "worksheet",
      "draft",
      "내 시험지",
      { problems: [] },
      null,
    );

    await client.save(
      "source",
      "extraction",
      "추출 원본",
      { data: sessionData(), assets: {} },
      null,
    );
    vi.stubGlobal("fetch", server.transport);
    const openDraft = vi.fn();
    const openExtraction = vi.fn();
    const deleted = vi.fn();
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport
        canStudio
        onOpenDraft={openDraft}
        onOpenExtraction={openExtraction}
        onDeleted={deleted}
      />,
    );
    await screen.findByRole("button", { name: "추출 원본 열기" });
    fireEvent.click(
      boardRow("추출 원본").getByRole("button", { name: /열기$/ }),
    );
    expect(openExtraction).toHaveBeenCalledWith("source");
    fireEvent.click(
      boardRow("내 시험지").getByRole("button", { name: /열기$/ }),
    );
    expect(openDraft).toHaveBeenCalledWith("worksheet");
    await waitFor(() =>
      expect(
        boardRow("추출 원본").getByRole("button", {
          name: "추출 원본 정보",
        }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      boardRow("추출 원본").getByRole("button", {
        name: "추출 원본 정보",
      }),
    );
    // 추출 자료는 이름을 200자까지 — 시험지(80자)와 다르다. 창으로 옮겨도 그대로.
    expect(screen.getByRole("textbox", { name: "자료 이름" })).toHaveAttribute(
      "maxLength",
      "200",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "자료 이름" }), {
      target: { value: "바꾼 원본" },
    });
    fireEvent.click(screen.getByRole("button", { name: "이름 저장" }));
    await screen.findByRole("button", { name: "바꾼 원본 열기" });
    expect(server.documents.get("owner-a:source")?.title).toBe("바꾼 원본");
    fireEvent.click(
      boardRow("바꾼 원본").getByRole("button", { name: "바꾼 원본 삭제" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "바꾼 원본 열기" }),
      ).not.toBeInTheDocument(),
    );
    expect(deleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: "source", revision: 2 }),
    );
    expect(server.documents.has("owner-a:source")).toBe(false);
  });
  it("keeps library-only rename/delete available while editor and studio actions remain hidden", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.save(
      "worksheet",
      "draft",
      "읽기 자료",
      { problems: [] },
      null,
    );
    vi.stubGlobal("fetch", server.transport);
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport={false}
        canStudio={false}
        onOpenDraft={vi.fn()}
        onOpenExtraction={vi.fn()}
      />,
    );
    await screen.findByText("읽기 자료");
    expect(
      screen.queryByRole("button", { name: /열기$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "읽기 자료 정보" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "작업 파일 불러오기" }),
    ).not.toBeInTheDocument();
    await client.rename("worksheet", "다른 기기 변경", 1);
    fireEvent.click(screen.getByRole("button", { name: "읽기 자료 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "다른 창이나 기기",
    );
    expect(server.documents.has("owner-a:worksheet")).toBe(true);
  });
  it("shows helpful loading, empty and failed-list states with retry", async () => {
    const server = privateServer();
    server.fail(503);
    vi.stubGlobal("fetch", server.transport);
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport
        canStudio
        onOpenDraft={vi.fn()}
        onOpenExtraction={vi.fn()}
      />,
    );
    expect(screen.getByText("저장한 자료를 불러오는 중입니다…")).toBeVisible();
    await screen.findByRole("alert");
    expect(
      screen.queryByText("아직 저장한 자료가 없어요"),
    ).not.toBeInTheDocument();
    server.fail(0);
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(await screen.findByText("아직 저장한 자료가 없어요")).toBeVisible();
  });

  it("offers the new worksheet action from a genuinely empty library", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => listResponse([])),
    );
    const onNew = vi.fn();
    render(<PrivateLibrary {...boardProps()} onNew={onNew} />);
    await screen.findByRole("heading", { name: "아직 저장한 자료가 없어요" });
    fireEvent.click(screen.getByRole("button", { name: "새 시험지 만들기" }));
    expect(onNew).toHaveBeenCalledOnce();
  });
});

/**
 * 2026-09-19 원장님 «내 시험지 삭제 시에 카드가 늘어나지 말고 덧씌우기 같은 이중창 같은 형식으로».
 * 확인 문구가 카드 **안에** 펼쳐지면 카드가 길어져 옆 카드와 높이가 어긋났다. 이제는 작업실의
 * `<dialog>` 를 `showModal()` 로 띄운다 — 카드 높이가 그대로인 것은 브라우저에서 잰다(jsdom 은
 * 배치를 안 한다). 여기서는 «문구가 카드 밖 모달에만 있는가»와 닫기·초점·잠금·오류를 지킨다.
 */
describe("private library delete confirmation dialog", () => {
  async function seeded(wrap?: (transport: typeof fetch) => typeof fetch) {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.save(
      "worksheet",
      "draft",
      "오늘 수학 학습지",
      { problems: [] },
      null,
    );
    vi.stubGlobal("fetch", wrap ? wrap(server.transport) : server.transport);
    const deleted = vi.fn();
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport
        canStudio
        onOpenDraft={vi.fn()}
        onOpenExtraction={vi.fn()}
        onDeleted={deleted}
      />,
    );
    await screen.findByRole("button", { name: "오늘 수학 학습지 열기" });
    const row = screen
      .getByRole("button", { name: "오늘 수학 학습지 열기" })
      .closest("tr")!;
    const trigger = within(row).getByRole("button", {
      name: "오늘 수학 학습지 삭제",
    });
    await waitFor(() => expect(trigger).toBeEnabled());
    const open = () => {
      trigger.focus();
      fireEvent.click(trigger);
      return screen.getByRole("dialog", {
        name: "‘오늘 수학 학습지’ 자료를 삭제할까요?",
      });
    };
    return { server, row, trigger, open, deleted };
  }

  it("opens a modal dialog instead of expanding the row", async () => {
    const { row, open } = await seeded();
    const dialog = open();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");
    expect(row.contains(dialog)).toBe(false);
    expect(within(row).queryByText(/삭제할까요/)).not.toBeInTheDocument();
    expect(
      within(row).queryByRole("button", { name: "삭제 확인" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "취소" })).toHaveFocus();
    expect(
      within(dialog).getByRole("button", { name: "삭제 확인" }),
    ).toBeEnabled();
  });

  it("closes on cancel, Esc and backdrop and returns focus to the delete button", async () => {
    const { server, trigger, open } = await seeded();
    fireEvent.click(within(open()).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    const escape = new Event("cancel", { cancelable: true });
    fireEvent(open(), escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    const dialog = open();
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      x: 300,
      y: 200,
      left: 300,
      top: 200,
      right: 870,
      bottom: 420,
      width: 570,
      height: 220,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(dialog, { clientX: 40, clientY: 40 });
    fireEvent.click(dialog, { clientX: 40, clientY: 40 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(server.documents.has("owner-a:worksheet")).toBe(true);
  });

  it("calls the existing delete, locks the dialog while pending and shows progress inside it", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { server, row, open, deleted } = await seeded(
      (transport) => async (input, init) => {
        if (init?.method === "DELETE") await gate;
        return transport(input, init);
      },
    );
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제 확인" }));
    expect(await within(dialog).findByRole("status")).toHaveTextContent(
      "처리 중…",
    );
    expect(within(row).queryByRole("status")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "삭제 확인" }),
    ).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
    // 처리 중에는 Esc 로도 닫지 않는다 — 결과(오류)를 볼 자리를 남긴다.
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBe(dialog);
    release();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "오늘 수학 학습지 열기" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: "worksheet" }),
    );
    expect(server.documents.has("owner-a:worksheet")).toBe(false);
  });

  it("keeps the dialog open and shows the failure inside it", async () => {
    const { server, row, open } = await seeded();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.rename("worksheet", "다른 기기 변경", 1);
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제 확인" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "다른 창이나 기기",
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(row).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "삭제 확인" }),
    ).toBeEnabled();
    expect(server.documents.has("owner-a:worksheet")).toBe(true);
  });

  /**
   * 2026-09-19 원장님 결정(리드 추가 지시) — «정보»도 삭제와 같은 겹쳐 뜨는 창으로.
   * 창 안에 지금의 입력칸(라벨 «자료 이름», 시험지 80자·추출 자료 200자)과 [취소][이름 저장].
   */
  describe("rename dialog", () => {
    const renameTrigger = (row: HTMLElement) =>
      within(row).getByRole("button", {
        name: "오늘 수학 학습지 정보",
      });
    const openRename = (row: HTMLElement) => {
      const trigger = renameTrigger(row);
      trigger.focus();
      fireEvent.click(trigger);
      return screen.getByRole("dialog", { name: "시험지 정보" });
    };

    it("opens a modal with the current name selected instead of expanding the row", async () => {
      const { row } = await seeded();
      const dialog = openRename(row);
      expect(showModal).toHaveBeenCalledTimes(1);
      expect(row.contains(dialog)).toBe(false);
      expect(within(row).queryByRole("textbox")).not.toBeInTheDocument();
      const input = within(dialog).getByRole("textbox", {
        name: "자료 이름",
      }) as HTMLInputElement;
      expect(input).toHaveValue("오늘 수학 학습지");
      expect(input).toHaveAttribute("maxLength", "80");
      expect(input).toHaveFocus();
      expect([input.selectionStart, input.selectionEnd]).toEqual([
        0,
        "오늘 수학 학습지".length,
      ]);
      expect(
        within(dialog)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["취소", "이름 저장"]);
    });

    it("locks save for a blank name", async () => {
      const { server, row } = await seeded();
      const dialog = openRename(row);
      fireEvent.change(within(dialog).getByRole("textbox"), {
        target: { value: "  " },
      });
      expect(
        within(dialog).getByRole("button", { name: "이름 저장" }),
      ).toBeDisabled();
      fireEvent.submit(within(dialog).getByRole("textbox"));
      expect(server.documents.get("owner-a:worksheet")?.title).toBe(
        "오늘 수학 학습지",
      );
    });

    it("saves on Enter, locks while pending and closes on success", async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const { server, row } = await seeded(
        (transport) => async (input, init) => {
          if (init?.method === "PATCH") await gate;
          return transport(input, init);
        },
      );
      const dialog = openRename(row);
      const input = within(dialog).getByRole("textbox");
      fireEvent.change(input, { target: { value: "  1학기 기말  " } });
      fireEvent.submit(input);
      expect(await within(dialog).findByRole("status")).toHaveTextContent(
        "처리 중…",
      );
      expect(within(row).queryByRole("status")).not.toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "이름 저장" }),
      ).toBeDisabled();
      expect(
        within(dialog).getByRole("button", { name: "취소" }),
      ).toBeDisabled();
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
      expect(screen.getByRole("dialog")).toBe(dialog);
      release();
      await screen.findByRole("button", { name: "1학기 기말 열기" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(server.documents.get("owner-a:worksheet")?.title).toBe(
        "1학기 기말",
      );
      expect(
        screen.getByRole("button", { name: "1학기 기말 정보" }),
      ).toHaveFocus();
    });

    it("keeps the dialog open and shows the failure inside it", async () => {
      const { server, row } = await seeded();
      const client = new PrivateCloudClient("owner-a", server.transport);
      await client.rename("worksheet", "다른 기기 변경", 1);
      const dialog = openRename(row);
      fireEvent.change(
        within(dialog).getByRole("textbox", { name: "자료 이름" }),
        { target: { value: "새 제목" } },
      );
      fireEvent.click(
        within(dialog).getByRole("button", { name: "이름 저장" }),
      );
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "다른 창이나 기기",
      );
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(within(row).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("closes on cancel, Esc and backdrop and returns focus to the rename button", async () => {
      const { server, row } = await seeded();
      fireEvent.click(
        within(openRename(row)).getByRole("button", { name: "취소" }),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(renameTrigger(row)).toHaveFocus();

      const escape = new Event("cancel", { cancelable: true });
      fireEvent(openRename(row), escape);
      expect(escape.defaultPrevented).toBe(true);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(renameTrigger(row)).toHaveFocus();

      const dialog = openRename(row);
      vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
        x: 300,
        y: 200,
        left: 300,
        top: 200,
        right: 870,
        bottom: 420,
        width: 570,
        height: 220,
        toJSON: () => ({}),
      });
      fireEvent.pointerDown(dialog, { clientX: 40, clientY: 40 });
      fireEvent.click(dialog, { clientX: 40, clientY: 40 });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(renameTrigger(row)).toHaveFocus();
      expect(server.documents.get("owner-a:worksheet")?.title).toBe(
        "오늘 수학 학습지",
      );
    });
  });

  /**
   * 브라우저에서 잰 결함(2026-09-19): 모달 창에서 Tab 이 마지막 단추를 지나면 초점이 주소창으로
   * 나갔다가 돌아온다 — 그때 `window` 의 focus 가 목록을 다시 읽는데, 그동안 격자를 «불러오는 중»
   * 으로 **바꿔 끼워** 카드와 그 안의 확인 창이 통째로 사라졌다. 자동 저장이 쏘는
   * `private-library-change` 도 같다. 뒤에서 다시 읽는 동안에는 카드를 그대로 둔다.
   */
  it("keeps the dialog while the list refreshes in the background", async () => {
    let release!: () => void;
    let hold = false;
    let lists = 0;
    const { open } = await seeded((transport) => async (input, init) => {
      if (String(input).startsWith("/api/library/documents?")) {
        lists++;
        if (hold)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
      }
      return transport(input, init);
    });
    expect(lists).toBe(1);
    const dialog = open();
    hold = true;
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    expect(
      screen.queryByText("저장한 자료를 불러오는 중입니다…"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBe(dialog);
    hold = false;
    release();
    window.dispatchEvent(
      new CustomEvent("private-library-change", { detail: "owner-a" }),
    );
    await waitFor(() => expect(lists).toBe(3));
    await screen.findByRole("button", { name: "오늘 수학 학습지 열기" });
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("button", { name: "취소" })).toBeEnabled();
  });

  it("still shows progress when the owner presses refresh", async () => {
    await seeded();
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(screen.getByText("저장한 자료를 불러오는 중입니다…")).toBeVisible();
    await screen.findByRole("button", { name: "오늘 수학 학습지 열기" });
  });

  it("preserves an open dialog across a new remote revision without confirming unseen changes", async () => {
    const { server, open } = await seeded();
    const dialog = open();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await act(async () => {
      await client.rename("worksheet", "다른 기기 변경", 1);
      window.dispatchEvent(new Event("focus"));
    });
    await screen.findByRole("button", { name: "다른 기기 변경 열기" });
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("heading")).toHaveTextContent(
      "오늘 수학 학습지",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제 확인" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "다른 창이나 기기",
    );
    expect(server.documents.get("owner-a:worksheet")?.revision).toBe(2);
    expect(server.documents.has("owner-a:worksheet")).toBe(true);
  });

  it.each(["rename", "delete"] as const)(
    "does not let a stale list undo a successful %s",
    async (action) => {
      let hold = false;
      let release!: () => void;
      const { row, open } = await seeded((transport) => async (input, init) => {
        const response = await transport(input, init);
        if (hold && String(input).startsWith("/api/library/documents?")) {
          hold = false;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }
        return response;
      });
      hold = true;
      fireEvent(window, new Event("focus"));
      await waitFor(() => expect(release).toBeTypeOf("function"));
      if (action === "rename") {
        fireEvent.click(
          within(row).getByRole("button", {
            name: "오늘 수학 학습지 정보",
          }),
        );
        fireEvent.change(screen.getByRole("textbox", { name: "자료 이름" }), {
          target: { value: "확정한 새 이름" },
        });
        fireEvent.click(screen.getByRole("button", { name: "이름 저장" }));
        await screen.findByRole("button", { name: "확정한 새 이름 열기" });
      } else {
        fireEvent.click(
          within(open()).getByRole("button", { name: "삭제 확인" }),
        );
        await screen.findByRole("heading", {
          name: "아직 저장한 자료가 없어요",
        });
      }
      await act(async () => release());
      expect(
        screen.queryByRole("button", { name: "오늘 수학 학습지 열기" }),
      ).not.toBeInTheDocument();
      if (action === "rename")
        expect(
          screen.getByRole("button", { name: "확정한 새 이름 열기" }),
        ).toBeVisible();
      else expect(screen.queryByRole("table")).not.toBeInTheDocument();
    },
  );
});
