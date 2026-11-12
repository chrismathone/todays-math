import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { ComponentProps } from "react";
import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import type {
  ConceptBlankPick,
  ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import type { FillTargets } from "@/components/concept-blank/ConceptBlankQuestionPicker";
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";

const captured = vi.hoisted(() => ({
  apply: undefined as
    ((picks: ConceptBlankPick[], targets: FillTargets) => void) | undefined,
}));
vi.mock(
  "@/components/concept-blank/ConceptBlankQuestionPicker",
  async (original) => {
    const { default: Picker } =
      await original<
        typeof import("@/components/concept-blank/ConceptBlankQuestionPicker")
      >();
    return {
      default: (props: ComponentProps<typeof Picker>) => {
        captured.apply = props.onApply;
        return <Picker {...props} />;
      },
    };
  },
);
vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: ({ sheets }: ConceptBlankPaperProps) => (
    <pre data-testid="preview">{JSON.stringify(sheets)}</pre>
  ),
}));
const zero = { 하: 0, 중: 0, 상: 0 };
const first = selection("fx-corr", "문서 하나");
const second = selection("fx-cong-prop", "문서 둘");
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
function document(id: string, value: ConceptBlankSelection, revision = 1) {
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
  const pending = new Map<string, ((response: Response) => void)[]>();
  const writes: {
    id: string;
    body: {
      title: string;
      expectedRevision: number;
      payload: { selection: ConceptBlankSelection };
    };
  }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const id = decodeURIComponent(String(input).split("/").pop()!);
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body));
        writes.push({ id, body });
        return Promise.resolve(
          Response.json({
            data: document(
              id,
              body.payload.selection,
              body.expectedRevision + 1,
            ),
          }),
        );
      }
      return new Promise<Response>((resolve) =>
        pending.set(id, [...(pending.get(id) ?? []), resolve]),
      );
    }),
  );
  return {
    writes,
    arrive: async (id: string, value: ConceptBlankSelection, revision = 1) => {
      await act(async () =>
        pending.get(id)!.shift()!(
          Response.json({ data: document(id, value, revision) }),
        ),
      );
    },
    fail: async (id: string) => {
      await act(async () =>
        pending.get(id)!.shift()!(
          Response.json({ error: { message: "읽기 실패" } }, { status: 503 }),
        ),
      );
    },
  };
}
const button = () =>
  screen.getByRole("button", { name: "개념 질문 문항 고르기" });
const printed = () =>
  decodeSelection(
    new URL(
      screen.getByRole("link", { name: "인쇄하기" }).getAttribute("href")!,
      "http://localhost",
    ).searchParams.get("s"),
  )!;
const props = { bank: FIXTURE_BANK, storageScope: "pick-document-test" };
function show(id = "doc-one", version = 1) {
  window.history.replaceState(
    null,
    "",
    `/?blank=${encodeSelection(first)}#conceptBlank`,
  );
  return render(<ConceptBlankView {...props} openDocument={{ id, version }} />);
}
async function saveAsEdited() {
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
    target: { value: "새 제목" },
  });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" })),
  );
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
  captured.apply = undefined;
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("고르기 창의 문서 신분", () => {
  it("다른 문서를 읽는 동안에는 고르기를 열거나 이전 선택을 저장할 수 없다", async () => {
    const api = cloud();
    const view = show();
    await api.arrive("doc-one", first);
    view.rerender(
      <ConceptBlankView
        {...props}
        openDocument={{ id: "doc-two", version: 2 }}
      />,
    );
    expect(button()).toBeDisabled();
    expect(button()).toHaveAccessibleDescription("문서를 불러오는 중");
    fireEvent.click(button());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /저장됨|내 시험지에 저장/ }),
    ).toBeDisabled();
    await api.arrive("doc-two", second, 7);
    fireEvent.click(button());
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getAllByRole("checkbox")[1]).toBeChecked();
    fireEvent.click(dialog.getByRole("button", { name: "적용" }));
    await saveAsEdited();
    expect(api.writes[0]).toMatchObject({
      id: "doc-two",
      body: {
        expectedRevision: 7,
        payload: { selection: { pick: second.pick } },
      },
    });
  });

  it.each(["다른 문서", "같은 문서 다시 열기"])(
    "이미 열린 창과 예전 적용 콜백을 무효화한다: %s",
    async (kind) => {
      const api = cloud();
      const view = show();
      await api.arrive("doc-one", first);
      fireEvent.click(button());
      const oldApply = captured.apply!;
      const id = kind === "다른 문서" ? "doc-two" : "doc-one";
      view.rerender(
        <ConceptBlankView {...props} openDocument={{ id, version: 2 }} />,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(button()).toBeDisabled();
      await api.arrive(id, second, 7);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      act(() =>
        oldApply(first.pick!, { main: first.forms[0].counts, extra: zero }),
      );
      expect(printed().pick).toEqual(second.pick);
      fireEvent.click(button());
      fireEvent.click(screen.getByRole("button", { name: "적용" }));
      await saveAsEdited();
      expect(api.writes[0]).toMatchObject({
        id,
        body: {
          expectedRevision: 7,
          payload: { selection: { pick: second.pick } },
        },
      });
    },
  );

  it("주소에서 문서를 읽는 동안 고르기를 막고 읽은 뒤 주소의 미저장 고르기를 보존한다", async () => {
    const api = cloud();
    window.history.replaceState(
      null,
      "",
      `/?blankDoc=doc-one&blank=${encodeSelection(first)}#conceptBlank`,
    );
    render(<ConceptBlankView {...props} />);
    expect(button()).toBeDisabled();
    await api.arrive("doc-one", second, 4);
    expect(button()).toBeEnabled();
    expect(printed().pick).toEqual(first.pick);
    await saveAsEdited();
    expect(api.writes[0]).toMatchObject({
      id: "doc-one",
      body: {
        expectedRevision: 4,
        payload: { selection: { pick: first.pick } },
      },
    });
  });

  it("열린 창에서 주소로 다른 문서를 탐색해도 옛 창을 닫고 새 문서를 읽는다", async () => {
    const api = cloud();
    show();
    await api.arrive("doc-one", first);
    fireEvent.click(button());
    const oldApply = captured.apply!;
    act(() => {
      window.history.pushState(null, "", "/?blankDoc=doc-two#conceptBlank");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button()).toBeDisabled();
    await api.arrive("doc-two", second, 8);
    act(() =>
      oldApply(first.pick!, { main: first.forms[0].counts, extra: zero }),
    );
    expect(printed().pick).toEqual(second.pick);
    await saveAsEdited();
    expect(api.writes[0]).toMatchObject({
      id: "doc-two",
      body: {
        expectedRevision: 8,
        payload: { selection: { pick: second.pick } },
      },
    });
  });

  it("이전 문서의 늦은 응답은 최신 문서와 새 창의 선택을 바꾸지 않는다", async () => {
    const api = cloud();
    const view = show();
    view.rerender(
      <ConceptBlankView
        {...props}
        openDocument={{ id: "doc-two", version: 2 }}
      />,
    );
    expect(button()).toBeDisabled();
    await api.arrive("doc-two", second, 8);
    fireEvent.click(button());
    await api.arrive("doc-one", first, 2);
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(printed().pick).toEqual(second.pick);
    await saveAsEdited();
    expect(api.writes[0].id).toBe("doc-two");
  });

  it("문서 읽기 실패 뒤에도 고르기를 막고 재시도 성공 후에만 새 선택을 연다", async () => {
    const api = cloud();
    const view = show();
    await api.arrive("doc-one", first);
    fireEvent.click(button());
    view.rerender(
      <ConceptBlankView
        {...props}
        openDocument={{ id: "doc-two", version: 2 }}
      />,
    );
    await api.fail("doc-two");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "자료 다시 불러오기" }));
    await api.arrive("doc-two", second, 9);
    expect(button()).toBeEnabled();
    expect(printed().pick).toEqual(second.pick);
  });
});
