import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const article = (title: string) =>
  within(
    screen.getByRole("heading", { name: title, level: 2 }).closest("article")!,
  );
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
    await screen.findByRole("heading", { name: "추출 원본" });
    fireEvent.click(article("추출 원본").getByRole("button", { name: "열기" }));
    expect(openExtraction).toHaveBeenCalledWith("source");
    fireEvent.click(article("내 시험지").getByRole("button", { name: "열기" }));
    expect(openDraft).toHaveBeenCalledWith("worksheet");
    await waitFor(() =>
      expect(
        article("추출 원본").getByRole("button", {
          name: "추출 원본 이름 변경",
        }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      article("추출 원본").getByRole("button", { name: "추출 원본 이름 변경" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "새 자료 이름" }), {
      target: { value: "바꾼 원본" },
    });
    fireEvent.click(screen.getByRole("button", { name: "이름 저장" }));
    await screen.findByRole("heading", { name: "바꾼 원본" });
    expect(server.documents.get("owner-a:source")?.title).toBe("바꾼 원본");
    fireEvent.click(
      article("바꾼 원본").getByRole("button", { name: "바꾼 원본 삭제" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "바꾼 원본" }),
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
    await screen.findByRole("heading", { name: "읽기 자료" });
    expect(
      screen.queryByRole("button", { name: "열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "읽기 자료 이름 변경" }),
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
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(await screen.findByText("아직 저장한 자료가 없어요")).toBeVisible();
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
      "오늘의 수학 학습지",
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
    await screen.findByRole("heading", { name: "오늘의 수학 학습지" });
    const card = screen
      .getByRole("heading", { name: "오늘의 수학 학습지", level: 2 })
      .closest("article")!;
    const trigger = within(card).getByRole("button", {
      name: "오늘의 수학 학습지 삭제",
    });
    await waitFor(() => expect(trigger).toBeEnabled());
    const open = () => {
      trigger.focus();
      fireEvent.click(trigger);
      return screen.getByRole("dialog", {
        name: "‘오늘의 수학 학습지’ 자료를 삭제할까요?",
      });
    };
    return { server, card, trigger, open, deleted };
  }

  it("opens a modal dialog instead of expanding the card", async () => {
    const { card, open } = await seeded();
    const dialog = open();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");
    expect(card.contains(dialog)).toBe(false);
    expect(within(card).queryByText(/삭제할까요/)).not.toBeInTheDocument();
    expect(
      within(card).queryByRole("button", { name: "삭제 확인" }),
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
    const { server, card, open, deleted } = await seeded(
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
    expect(within(card).queryByRole("status")).not.toBeInTheDocument();
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
        screen.queryByRole("heading", { name: "오늘의 수학 학습지" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: "worksheet" }),
    );
    expect(server.documents.has("owner-a:worksheet")).toBe(false);
  });

  it("keeps the dialog open and shows the failure inside it", async () => {
    const { server, card, open } = await seeded();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.rename("worksheet", "다른 기기 변경", 1);
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제 확인" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "다른 창이나 기기",
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "삭제 확인" }),
    ).toBeEnabled();
    expect(server.documents.has("owner-a:worksheet")).toBe(true);
  });

  it("leaves rename inline in the card", async () => {
    const { card } = await seeded();
    fireEvent.click(
      within(card).getByRole("button", {
        name: "오늘의 수학 학습지 이름 변경",
      }),
    );
    expect(
      within(card).getByRole("textbox", { name: "새 자료 이름" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    await screen.findByRole("heading", { name: "오늘의 수학 학습지" });
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("button", { name: "취소" })).toBeEnabled();
  });

  it("still shows progress when the owner presses refresh", async () => {
    await seeded();
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(screen.getByText("저장한 자료를 불러오는 중입니다…")).toBeVisible();
    await screen.findByRole("heading", { name: "오늘의 수학 학습지" });
  });
});
