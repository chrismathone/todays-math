import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EnglishStudio from "@/components/english/EnglishStudio";
import { englishSetUpdateSchema } from "@/contracts/english.contract";
import { server } from "@/mocks/server";
import {
  ENGLISH_MOCK_SETS,
  ENGLISH_SET_DRAFT_ID,
} from "@/mocks/handlers/english";
import { Harness, installDialogShim, makeLog } from "./EnglishStudio.harness";

const original = ENGLISH_MOCK_SETS[0]!;
const done = ENGLISH_MOCK_SETS[1]!;
const discardTitle = "저장하지 않은 변경 사항을 버릴까요?";
const title = () => screen.getByRole("textbox", { name: "세트 이름" });
const changeTitle = (value: string) =>
  fireEvent.change(title(), { target: { value } });
const unloadBlocked = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};
async function openDraft() {
  const log = makeLog();
  render(<Harness log={log} openSetId={ENGLISH_SET_DRAFT_ID} />);
  await screen.findByRole("textbox", { name: "세트 이름" });
  return log;
}
beforeEach(() => {
  localStorage.clear();
  installDialogShim();
});

describe("English editor acknowledged draft safety", () => {
  it("confirms destructive back, cancellation preserves edits, and discard returns to the list", async () => {
    await openDraft();
    changeTitle("저장하지 않은 제목");
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    const dialog = within(screen.getByRole("dialog", { name: discardTitle }));
    expect(dialog.getByRole("button", { name: "취소" })).toHaveFocus();
    fireEvent.click(dialog.getByRole("button", { name: "취소" }));
    expect(title()).toHaveValue("저장하지 않은 제목");
    expect(unloadBlocked()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    fireEvent.click(screen.getByRole("button", { name: "변경 사항 버리기" }));
    expect(
      await screen.findByRole("heading", { name: "내 문제 세트" }),
    ).toBeVisible();
    expect(unloadBlocked()).toBe(false);
  });

  it("warns on refresh only for changed fields and removes protection on revert, save and unmount", async () => {
    await openDraft();
    expect(unloadBlocked()).toBe(false);
    changeTitle("다른 제목");
    expect(unloadBlocked()).toBe(true);
    changeTitle(original.title);
    expect(unloadBlocked()).toBe(false);
    fireEvent.change(screen.getByRole("combobox", { name: "검토 상태" }), {
      target: { value: "검토 중" },
    });
    expect(unloadBlocked()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("모든 변경 사항이 저장되었습니다.");
    expect(unloadBlocked()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(screen.queryByRole("dialog", { name: discardTitle })).toBeNull();
  });

  it("preserves edits across hidden menus and reopening the same set, but confirms replacement", async () => {
    await openDraft();
    changeTitle("남길 제목");
    fireEvent.click(screen.getByRole("button", { name: "학교 메뉴" }));
    expect(screen.queryByRole("dialog", { name: discardTitle })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "세트 이름" })).toBeNull();
    expect(unloadBlocked()).toBe(true);
    fireEvent.click(
      await screen.findByRole("button", { name: `${original.title} 열기` }),
    );
    expect(title()).toHaveValue("남길 제목");
    expect(screen.queryByRole("dialog", { name: discardTitle })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "학교 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: `${done.title} 열기` }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: discardTitle })).getByRole(
        "button",
        { name: "취소" },
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "보관함 메뉴" }));
    expect(title()).toHaveValue("남길 제목");
    fireEvent.click(screen.getByRole("button", { name: "학교 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: `${done.title} 열기` }));
    fireEvent.click(screen.getByRole("button", { name: "변경 사항 버리기" }));
    await waitFor(() => expect(title()).toHaveValue(done.title));
    expect(unloadBlocked()).toBe(false);
  });

  it("protects an existing draft from a replacement deep link", async () => {
    const props = {
      view: "english-library" as const,
      newExamOpen: false,
      onNavigate: vi.fn(),
      onNewExam: vi.fn(),
      onNewExamClose: vi.fn(),
      onSetOpened: vi.fn(),
      onNotice: vi.fn(),
    };
    const mounted = render(
      <EnglishStudio
        {...props}
        openSetRequest={{ id: original.id, version: 1 }}
      />,
    );
    await screen.findByRole("textbox", { name: "세트 이름" });
    changeTitle("딥링크보다 먼저 쓴 제목");
    mounted.rerender(
      <EnglishStudio {...props} openSetRequest={{ id: done.id, version: 2 }} />,
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: discardTitle }),
    );
    fireEvent.click(dialog.getByRole("button", { name: "취소" }));
    expect(title()).toHaveValue("딥링크보다 먼저 쓴 제목");
    expect(props.onSetOpened).toHaveBeenCalledTimes(2);
  });

  it("preserves a hidden editor while registering a new exam", async () => {
    await openDraft();
    changeTitle("시험 등록 뒤에도 남길 제목");
    fireEvent.click(screen.getByRole("button", { name: "학교 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "새 시험 등록(셸)" }));
    const dialog = within(screen.getByRole("dialog", { name: "새 시험 등록" }));
    fireEvent.change(dialog.getByRole("textbox", { name: "학교 이름" }), {
      target: { value: "정화중학교" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "등록" }));
    await screen.findByRole("button", { name: "정화중학교" });
    fireEvent.click(screen.getByRole("button", { name: "보관함 메뉴" }));
    expect(title()).toHaveValue("시험 등록 뒤에도 남길 제목");
    expect(unloadBlocked()).toBe(true);
  });

  it("does not refetch over new edits when the first save acknowledgement follows a conflict reload", async () => {
    let reads = 0;
    let writes = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`/api/english/sets/${original.id}`, () => {
        reads += 1;
        return HttpResponse.json({ data: { ...original, revision: reads } });
      }),
      http.put(`/api/english/sets/${original.id}`, async ({ request }) => {
        writes += 1;
        if (writes === 1)
          return HttpResponse.json(
            {
              error: {
                code: "REVISION_MISMATCH",
                message: "최신 내용을 불러오세요.",
              },
            },
            { status: 409 },
          );
        const body = englishSetUpdateSchema.parse(await request.json());
        await gate;
        return HttpResponse.json({
          data: { ...original, ...body, revision: body.revision + 1 },
        });
      }),
    );
    const log = makeLog();
    render(<Harness log={log} />);
    fireEvent.click(
      await screen.findByRole("button", { name: `${original.title} 열기` }),
    );
    await screen.findByRole("textbox", { name: "세트 이름" });
    changeTitle("충돌 전 제목");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    fireEvent.click(screen.getByRole("button", { name: "변경 사항 버리기" }));
    await screen.findByRole("textbox", { name: "세트 이름" });
    changeTitle("다시 전송한 제목");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(writes).toBe(2));
    changeTitle("응답보다 늦은 입력");
    await act(async () => {
      release();
    });
    await waitFor(() =>
      expect(log.notices.at(-1)?.message).toContain("저장 중 입력한 내용"),
    );
    expect(title()).toHaveValue("응답보다 늦은 입력");
    expect(reads).toBe(2);
    expect(unloadBlocked()).toBe(true);
  });

  it("keeps inputs typed during save dirty, uses the acknowledged revision next, and blocks replacement in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: ReturnType<typeof englishSetUpdateSchema.parse>[] = [];
    server.use(
      http.put(`/api/english/sets/${original.id}`, async ({ request }) => {
        const body = englishSetUpdateSchema.parse(await request.json());
        bodies.push(body);
        if (bodies.length === 1) await gate;
        return HttpResponse.json({
          data: { ...original, ...body, revision: body.revision + 1 },
        });
      }),
    );
    const log = await openDraft();
    changeTitle("전송한 제목");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(screen.getByRole("button", { name: "목록" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "세트 삭제" })).toBeDisabled();
    changeTitle("저장 중 추가한 제목");
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 수정" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "1번 문제 해설·채점 기준" }),
      { target: { value: "저장 중 추가한 해설" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "학교 메뉴" }));
    fireEvent.click(
      await screen.findByRole("button", { name: `${done.title} 열기` }),
    );
    expect(log.notices.at(-1)?.message).toContain("처리 중");
    expect(screen.queryByRole("dialog", { name: discardTitle })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "보관함 메뉴" }));
    await act(async () => {
      release();
    });
    await screen.findByText("저장하지 않은 변경 사항이 있습니다.");
    expect(title()).toHaveValue("저장 중 추가한 제목");
    expect(
      screen.getByRole("textbox", { name: "1번 문제 해설·채점 기준" }),
    ).toHaveValue("저장 중 추가한 해설");
    expect(unloadBlocked()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    const print = within(screen.getByRole("dialog", { name: "인쇄" }));
    expect(print.queryByRole("link", { name: "학생용" })).toBeNull();
    fireEvent.click(print.getByRole("button", { name: "변경 사항 저장" }));
    await print.findByRole("link", { name: "학생용" });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toMatchObject({
      title: "저장 중 추가한 제목",
      revision: original.revision + 1,
    });
    expect(bodies[1].questions?.[0].explanation).toBe("저장 중 추가한 해설");
    expect(unloadBlocked()).toBe(false);
  });

  it("gates print until saved and uses persisted review status, including status-only changes", async () => {
    await openDraft();
    fireEvent.change(screen.getByRole("combobox", { name: "검토 상태" }), {
      target: { value: "검토 완료" },
    });
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    const print = within(screen.getByRole("dialog", { name: "인쇄" }));
    expect(print.getByRole("button", { name: "학생용" })).toBeDisabled();
    expect(print.getByRole("button", { name: "교사용" })).toBeDisabled();
    expect(print.queryByRole("link")).toBeNull();
    expect(
      print.getByText("아직 검토 완료하지 않은 문제입니다."),
    ).toBeVisible();
    fireEvent.click(print.getByRole("button", { name: "변경 사항 저장" }));
    expect(await print.findByRole("link", { name: "학생용" })).toHaveAttribute(
      "href",
      `/english/sets/${original.id}/print?view=student`,
    );
    expect(print.queryByText("아직 검토 완료하지 않은 문제입니다.")).toBeNull();
  });

  it("keeps print blocked and the draft intact when saving fails", async () => {
    server.use(
      http.put(`/api/english/sets/${original.id}`, () =>
        HttpResponse.json(
          {
            error: { code: "INTERNAL_ERROR", message: "저장에 실패했습니다." },
          },
          { status: 500 },
        ),
      ),
    );
    await openDraft();
    changeTitle("재시도할 제목");
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    const print = within(screen.getByRole("dialog", { name: "인쇄" }));
    fireEvent.click(print.getByRole("button", { name: "변경 사항 저장" }));
    expect(await print.findByRole("alert")).toHaveTextContent(
      "저장에 실패했습니다.",
    );
    expect(print.queryByRole("link")).toBeNull();
    expect(title()).toHaveValue("재시도할 제목");
    expect(unloadBlocked()).toBe(true);
  });

  it("blocks saved-id print after a revision conflict even if edits are reverted", async () => {
    server.use(
      http.put(`/api/english/sets/${original.id}`, () =>
        HttpResponse.json(
          {
            error: {
              code: "REVISION_MISMATCH",
              message: "다른 곳에서 먼저 저장됐습니다.",
            },
          },
          { status: 409 },
        ),
      ),
    );
    await openDraft();
    changeTitle("충돌한 제목");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByRole("alert");
    changeTitle(original.title);
    // A subsequent network failure must not clear the known stale revision.
    server.use(
      http.put(`/api/english/sets/${original.id}`, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "재시도 실패" } },
          { status: 500 },
        ),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("재시도 실패");
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    const print = within(screen.getByRole("dialog", { name: "인쇄" }));
    expect(print.queryByRole("link")).toBeNull();
    expect(print.getByText(/다시 불러온 뒤 인쇄/)).toBeVisible();
  });
});
