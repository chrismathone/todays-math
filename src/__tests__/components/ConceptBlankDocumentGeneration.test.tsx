import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { loadGradeBank } from "@/lib/concept-blank/bank/load";

vi.mock("@/lib/concept-blank/bank/load", () => ({ loadGradeBank: vi.fn() }));
vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: ({ sheets }: ConceptBlankPaperProps) => (
    <pre>{JSON.stringify(sheets)}</pre>
  ),
}));
function selection(id: string, title: string) {
  const entry = FIXTURE_BANK.concepts.find((item) => item.id === id)!;
  return selectionFromPicks(
    [
      {
        form: "term",
        entryKind: "concept",
        entryId: id,
        blankSectionKey: entry.section,
        level: entry.level,
      },
    ],
    title,
  );
}
const first = selection("fx-corr", "문서 하나");
const second = selection("fx-cong-prop", "문서 둘");
function document(id: string, value: ConceptBlankSelection, revision: number) {
  return {
    id,
    kind: "conceptBlank",
    title: value.title,
    payload: { selection: value },
    problemCount: 1,
    revision,
    visibility: "private",
    sharedBranchId: null,
    createdAt: "2026-11-12T00:00:00Z",
    updatedAt: "2026-11-12T00:00:00Z",
  };
}
function cloud() {
  type Request = { id: string; resolve: (response: Response) => void };
  const reads: Request[] = [];
  const writes: (Request & {
    body: {
      title: string;
      expectedRevision: number;
      payload: { selection: ConceptBlankSelection };
    };
  })[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          const id = decodeURIComponent(String(input).split("/").pop()!);
          if (init?.method === "PUT")
            writes.push({ id, resolve, body: JSON.parse(String(init.body)) });
          else reads.push({ id, resolve });
        }),
    ),
  );
  return {
    reads,
    writes,
    read: async (
      index: number,
      value: ConceptBlankSelection,
      revision: number,
    ) => {
      const request = reads[index];
      await act(async () =>
        request.resolve(
          Response.json({ data: document(request.id, value, revision) }),
        ),
      );
    },
    write: async (index: number, revision: number) => {
      const request = writes[index];
      await act(async () =>
        request.resolve(
          Response.json({
            data: document(
              request.id,
              request.body.payload.selection,
              revision,
            ),
          }),
        ),
      );
    },
    failRead: async (index: number, status = 503) => {
      await act(async () =>
        reads[index].resolve(
          Response.json({ error: { message: "읽기 실패" } }, { status }),
        ),
      );
    },
    failWrite: async (index: number, status = 503) => {
      await act(async () =>
        writes[index].resolve(
          Response.json({ error: { message: "저장 실패" } }, { status }),
        ),
      );
    },
  };
}
const props = { bank: FIXTURE_BANK, storageScope: "generation-test" };
const openOne = { id: "doc-one", version: 1 };
const picker = () =>
  screen.getByRole("button", { name: "개념 질문 문항 고르기" });
const save = () =>
  screen.getByRole("button", { name: /시험지에 저장|저장됨|저장 중/ });
function edit(title: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
    target: { value: title },
  });
}
async function startSave(title: string) {
  edit(title);
  await act(async () => fireEvent.click(save()));
}
function address() {
  return new URL(window.location.href);
}
function printed() {
  return decodeSelection(
    new URL(
      screen.getByRole("link", { name: "인쇄하기" }).getAttribute("href")!,
      "http://localhost",
    ).searchParams.get("s"),
  )!;
}
function navigate(id: string) {
  act(() => {
    window.history.pushState(null, "", `/?blankDoc=${id}#conceptBlank`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  vi.mocked(loadGradeBank).mockReset();
  window.history.replaceState(
    null,
    "",
    `/?blank=${encodeSelection(first)}#conceptBlank`,
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("문서 세대에 속한 비동기 작업", () => {
  it("새 문서를 읽는 도중 새로고침해도 새 id와 옛 선택을 함께 복원하지 않는다", async () => {
    const api = cloud();
    const view = render(<ConceptBlankView {...props} openDocument={openOne} />);
    await api.read(0, first, 1);
    view.rerender(
      <ConceptBlankView
        {...props}
        openDocument={{ id: "doc-two", version: 2 }}
      />,
    );
    expect(picker()).toBeDisabled();
    // 전환 주소는 새 문서 id만 담거나 이미 확정된 같은 문서의 선택을 담아야 한다.
    const pending = address();
    expect(pending.searchParams.get("blankDoc")).toBe("doc-two");
    expect(pending.searchParams.get("blank")).toBeNull();
    view.unmount();
    render(<ConceptBlankView {...props} />);
    await api.read(2, second, 7);
    expect(printed().pick).toEqual(second.pick);
    await startSave("다시 연 문서 둘");
    expect(api.writes[0]).toMatchObject({
      id: "doc-two",
      body: {
        expectedRevision: 7,
        payload: { selection: { pick: second.pick } },
      },
    });
    await api.write(0, 8);
  });

  it("이전 문서의 늦은 PUT은 새 문서의 저장 대상과 revision을 되돌리지 않는다", async () => {
    const api = cloud();
    render(<ConceptBlankView {...props} openDocument={openOne} />);
    await api.read(0, first, 1);
    await startSave("문서 하나 수정");
    navigate("doc-two");
    await api.read(1, second, 7);
    await api.write(0, 2);
    expect(address().searchParams.get("blankDoc")).toBe("doc-two");
    expect(printed().pick).toEqual(second.pick);
    await startSave("문서 둘 수정");
    expect(api.writes[1]).toMatchObject({
      id: "doc-two",
      body: {
        expectedRevision: 7,
        payload: { selection: { pick: second.pick } },
      },
    });
    await api.write(1, 8);
  });

  it.each([
    ["PUT 먼저", 1],
    ["GET 먼저", 1],
    ["PUT 먼저", 9],
    ["GET 먼저", 9],
  ])(
    "저장과 탭 복귀 조회가 겹쳐도 잠금을 풀고 최신 revision을 지킨다: %s / GET revision %s",
    async (order, readRevision) => {
      const api = cloud();
      const view = render(
        <ConceptBlankView {...props} active openDocument={openOne} />,
      );
      await api.read(0, first, 1);
      await startSave("문서 하나 수정");
      view.rerender(
        <ConceptBlankView {...props} active={false} openDocument={openOne} />,
      );
      view.rerender(
        <ConceptBlankView {...props} active openDocument={openOne} />,
      );
      expect(api.reads).toHaveLength(2);
      if (order === "PUT 먼저") {
        await api.write(0, 2);
        await api.read(1, first, Number(readRevision));
      } else {
        await api.read(1, first, Number(readRevision));
        await api.write(0, 2);
      }
      expect(picker()).toBeEnabled();
      expect(
        screen.queryByText("저장된 자료를 불러오는 중…"),
      ).not.toBeInTheDocument();
      expect(printed().pick).toEqual(first.pick);
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        "문서 하나 수정",
      );
      await startSave("두 번째 수정");
      expect(api.writes[1]).toMatchObject({
        id: "doc-one",
        body: { expectedRevision: Math.max(2, Number(readRevision)) },
      });
      await api.write(1, Math.max(2, Number(readRevision)) + 1);
    },
  );

  it("이전 저장이 끝나지 않아도 새 문서의 저장을 막지 않고 옛 실패로 새 저장 잠금을 풀지 않는다", async () => {
    const api = cloud();
    render(<ConceptBlankView {...props} openDocument={openOne} />);
    await api.read(0, first, 1);
    await startSave("문서 하나 수정");
    navigate("doc-two");
    await api.read(1, second, 7);
    edit("문서 둘 수정");
    expect(save()).toBeEnabled();
    await act(async () => fireEvent.click(save()));
    expect(api.writes).toHaveLength(2);
    await api.failWrite(0);
    await api.read(2, first, 2); // PrivateCloudClient의 잃어버린 PUT 응답 확인도 끝낸다.
    expect(save()).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await api.write(1, 8);
    expect(screen.getByRole("button", { name: "저장됨" })).toBeInTheDocument();
    expect(address().searchParams.get("blankDoc")).toBe("doc-two");
  });

  it("문서가 바뀌면 이전 문서의 저장 확인 창도 닫는다", async () => {
    const api = cloud();
    render(
      <ConceptBlankView
        {...props}
        branchId="branch-one"
        openDocument={openOne}
      />,
    );
    await api.read(0, first, 1);
    edit("저장 확인 대기");
    fireEvent.click(save());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    navigate("doc-two");
    await api.read(1, second, 7);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });

  it("옛 PUT의 늦은 409와 저장 확인 조회는 새 문서를 바꾸거나 충돌 재시도를 시작하지 않는다", async () => {
    const api = cloud();
    render(<ConceptBlankView {...props} openDocument={openOne} />);
    await api.read(0, first, 1);
    await startSave("문서 하나 수정");
    navigate("doc-two");
    await api.read(1, second, 7);
    await api.failWrite(0, 409);
    await api.read(2, first, 4); // 공용 클라이언트의 확인 조회 뒤 View가 추가로 재조회하지 않는다.
    expect(api.reads).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await startSave("문서 둘 수정");
    expect(api.writes[1]).toMatchObject({
      id: "doc-two",
      body: { expectedRevision: 7 },
    });
    await api.write(1, 8);
  });

  it.each(["최신본", "삭제됨"])(
    "충돌 뒤 재조회 도중 문서를 바꾸면 옛 %s 응답도 버린다",
    async (result) => {
      const api = cloud();
      render(<ConceptBlankView {...props} openDocument={openOne} />);
      await api.read(0, first, 1);
      await startSave("문서 하나 수정");
      await api.failWrite(0, 409);
      await api.read(1, first, 4); // 공용 클라이언트의 확인 조회는 일치하지 않음 → View의 충돌 재조회.
      expect(api.reads).toHaveLength(3);
      navigate("doc-two");
      await api.read(3, second, 7);
      if (result === "최신본") await api.read(2, first, 4);
      else await api.failRead(2, 404);
      expect(api.writes).toHaveLength(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(picker()).toBeEnabled();
      await startSave("문서 둘 수정");
      expect(api.writes[1]).toMatchObject({
        id: "doc-two",
        body: { expectedRevision: 7 },
      });
      await api.write(1, 8);
    },
  );

  it("복귀 조회를 취소하고 다시 돌아와도 옛 조회의 완료가 새 조회의 잠금을 풀지 않는다", async () => {
    const api = cloud();
    const view = render(
      <ConceptBlankView {...props} active openDocument={openOne} />,
    );
    await api.read(0, first, 1);
    const toggle = (active: boolean) =>
      view.rerender(
        <ConceptBlankView {...props} active={active} openDocument={openOne} />,
      );
    toggle(false);
    toggle(true);
    toggle(false);
    toggle(true);
    expect(api.reads).toHaveLength(3);
    await api.read(1, first, 1);
    expect(picker()).toBeDisabled();
    await api.failRead(2);
    expect(picker()).toBeEnabled();
    expect(printed().pick).toEqual(first.pick);
    await startSave("재조회 뒤 저장");
    expect(api.writes[0].body.expectedRevision).toBe(1);
    await api.write(0, 2);
  });

  it("충돌 재조회도 복귀 조회가 받은 더 높은 revision을 되돌리지 않는다", async () => {
    const api = cloud();
    const view = render(
      <ConceptBlankView {...props} active openDocument={openOne} />,
    );
    await api.read(0, first, 1);
    await startSave("충돌 중인 제목");
    await api.failWrite(0, 409);
    await api.read(1, first, 3);
    expect(api.reads).toHaveLength(3);
    view.rerender(
      <ConceptBlankView {...props} active={false} openDocument={openOne} />,
    );
    view.rerender(
      <ConceptBlankView {...props} active openDocument={openOne} />,
    );
    await api.read(3, { ...first, title: "복귀 조회 최신 4" }, 4);
    await api.read(2, { ...first, title: "충돌 조회 과거 3" }, 3);
    expect(picker()).toBeEnabled();
    await startSave("재시도 제목");
    expect(api.writes[1]).toMatchObject({
      id: "doc-one",
      body: { expectedRevision: 4 },
    });
    await api.write(1, 5);
  });

  it.each(["성공", "실패"])(
    "이전 세대의 은행 %s 응답을 버리고 새 세대의 은행을 기다린다",
    async (result) => {
      const api = cloud();
      const banks: {
        resolve: (bank: typeof FIXTURE_BANK) => void;
        reject: (error: Error) => void;
      }[] = [];
      vi.mocked(loadGradeBank).mockImplementation(
        () => new Promise((resolve, reject) => banks.push({ resolve, reject })),
      );
      const view = render(
        <ConceptBlankView
          storageScope={props.storageScope}
          openDocument={openOne}
        />,
      );
      await api.read(0, first, 1);
      view.rerender(
        <ConceptBlankView
          storageScope={props.storageScope}
          openDocument={{ id: "doc-two", version: 2 }}
        />,
      );
      await api.read(1, second, 7);
      expect(banks).toHaveLength(2);
      await act(async () =>
        result === "성공"
          ? banks[0].resolve(FIXTURE_BANK)
          : banks[0].reject(new Error("old bank")),
      );
      expect(picker()).toBeDisabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await act(async () => banks[1].resolve(FIXTURE_BANK));
      expect(picker()).toBeEnabled();
      expect(printed().pick).toEqual(second.pick);
    },
  );
});
