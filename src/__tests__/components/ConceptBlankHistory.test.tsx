import { useEffect, useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";

vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: ({ sheets }: ConceptBlankPaperProps) => (
    <pre>{JSON.stringify(sheets)}</pre>
  ),
}));
const zero = { 하: 0, 중: 0, 상: 0 };
const automatic: ConceptBlankSelection = {
  sections: [...new Set(FIXTURE_BANK.concepts.map(({ section }) => section))],
  forms: [{ form: "term", counts: { 하: 2, 중: 1, 상: 1 }, extras: zero }],
};
function exact(id: string, title: string) {
  const entry = FIXTURE_BANK.concepts.find((candidate) => candidate.id === id)!;
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
const first = exact("fx-corr", "첫 번째 선택");
const second = exact("fx-cong-prop", "두 번째 선택");
const selectionUrl = (
  selection: ConceptBlankSelection,
  hash = "#conceptBlank",
) => `/?blank=${encodeSelection(selection)}${hash}`;
function atConcept() {
  const url = new URL(window.location.href);
  return (
    url.hash === "#conceptBlank" ||
    url.searchParams.has("blank") ||
    url.searchParams.has("blankDoc")
  );
}
/** 작업실처럼 다른 화면에서는 숨기고, 메뉴는 pushState + active 변경만 수행한다. */
function PersistentHost({ storageScope }: { storageScope?: string }) {
  const [active, setActive] = useState(atConcept);
  useEffect(() => {
    const sync = () => setActive(atConcept());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return (
    <>
      <button
        onClick={() => {
          window.history.pushState(null, "", "/#conceptBlank");
          setActive(true);
        }}
      >
        개념 백지 메뉴
      </button>
      <div hidden={!active}>
        <ConceptBlankView
          bank={FIXTURE_BANK}
          active={active}
          storageScope={storageScope}
        />
      </div>
    </>
  );
}
async function traverse(direction: "back" | "forward") {
  await act(
    async () =>
      new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
        window.history[direction]();
      }),
  );
}
function printed() {
  return decodeSelection(
    new URL(
      screen.getByRole("link", { name: "인쇄하기" }).getAttribute("href")!,
      "http://localhost",
    ).searchParams.get("s"),
  )!;
}
function chooseTwo() {
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "개념 질문 싣는 방법" }),
    ).getByRole("button", { name: "직접" }),
  );
  const dialog = within(screen.getByRole("dialog", { name: /문항 고르기/ }));
  fireEvent.click(dialog.getByRole("checkbox", { name: "1번 문항 고르기" }));
  fireEvent.click(dialog.getByRole("checkbox", { name: "2번 문항 고르기" }));
  fireEvent.click(dialog.getByRole("button", { name: "적용" }));
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
    target: { value: "아직 저장하지 않은 제목" },
  });
  expect(printed().pick).toHaveLength(2);
  return printed();
}
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("개념 백지 주소와 다른 작업실 화면의 탐색", () => {
  it.each(["/", "/#library", "/?other=1"])(
    "%s로 뒤로 갔다 메뉴로 돌아와도 미저장 직접 선택·제목을 보존한다",
    async (away) => {
      window.history.replaceState(null, "", away);
      window.history.pushState(null, "", selectionUrl(automatic));
      render(<PersistentHost />);
      const before = chooseTwo();
      await traverse("back");
      expect(
        window.location.pathname +
          window.location.search +
          window.location.hash,
      ).toBe(away);
      expect(
        screen.queryByRole("textbox", { name: "제목" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "개념 백지 메뉴" }));
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        before.title,
      );
      expect(printed()).toEqual(before);
      expect(
        within(
          screen.getByRole("group", { name: "개념 질문 싣는 방법" }),
        ).getByRole("button", { name: "직접" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        decodeSelection(
          new URL(window.location.href).searchParams.get("blank"),
        ),
      ).toEqual(before);
    },
  );

  it.each(["#conceptBlank", ""])(
    "blank 주소끼리 뒤로/앞으로는 각 주소의 선택과 제목을 복원한다 (해시: %s)",
    async (hash) => {
      window.history.replaceState(null, "", selectionUrl(first, hash));
      window.history.pushState(null, "", selectionUrl(second, hash));
      render(<PersistentHost />);
      expect(printed().pick).toEqual(second.pick);
      await traverse("back");
      expect(printed().pick).toEqual(first.pick);
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        first.title,
      );
      await traverse("forward");
      expect(printed().pick).toEqual(second.pick);
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        second.title,
      );
    },
  );

  it.each(["#conceptBlank", ""])(
    "blankDoc 주소끼리 뒤로/앞으로는 해당 저장본을 읽는다 (해시: %s)",
    async (hash) => {
      const reads: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const id = String(input).split("/").pop()!;
          reads.push(id);
          const selection = id === "doc-one" ? first : second;
          return Response.json({
            data: {
              id,
              kind: "conceptBlank",
              title: selection.title,
              payload: { selection },
              problemCount: 1,
              revision: 7,
              visibility: "private",
              sharedBranchId: null,
              createdAt: "2026-11-12T00:00:00Z",
              updatedAt: "2026-11-12T00:00:00Z",
            },
          });
        }),
      );
      window.history.replaceState(null, "", `/?blankDoc=doc-one${hash}`);
      window.history.pushState(null, "", `/?blankDoc=doc-two${hash}`);
      render(<PersistentHost storageScope="history-test" />);
      await waitFor(() => expect(printed().pick).toEqual(second.pick));
      await traverse("back");
      await waitFor(() => expect(printed().pick).toEqual(first.pick));
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        first.title,
      );
      await traverse("forward");
      await waitFor(() => expect(printed().pick).toEqual(second.pick));
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        second.title,
      );
      expect(reads).toEqual(["doc-two", "doc-one", "doc-two"]);
    },
  );

  it("선택 인수가 없는 명시적 개념 백지 주소는 빈 선택으로 탐색할 수 있다", async () => {
    window.history.replaceState(null, "", "/#conceptBlank");
    window.history.pushState(null, "", selectionUrl(first));
    render(<PersistentHost />);
    await traverse("back");
    expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue("");
    expect(
      screen.queryByRole("link", { name: "인쇄하기" }),
    ).not.toBeInTheDocument();
    await traverse("forward");
    expect(printed().pick).toEqual(first.pick);
  });
});
