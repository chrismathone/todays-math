import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
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
import type {
  ConceptBlankBank,
  ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { composeSheets } from "@/lib/concept-blank/compose";
import { pickPool } from "@/lib/concept-blank/manualPick";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import { loadGradeBank } from "@/lib/concept-blank/bank/load";
import { BLANK_TREE } from "@/lib/concept-blank/sections";

vi.mock("@/lib/concept-blank/bank/load", () => ({
  loadGradeBank: vi.fn(),
}));

vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: ({ sheets, code }: ConceptBlankPaperProps) => (
    <pre data-testid="preview" data-code={code}>
      {JSON.stringify(sheets)}
    </pre>
  ),
}));
const zero = { 하: 0, 중: 0, 상: 0 };
const initial: ConceptBlankSelection = {
  sections: [...new Set(FIXTURE_BANK.concepts.map((p) => p.section))],
  forms: [{ form: "term", counts: { 하: 2, 중: 1, 상: 1 }, extras: zero }],
};
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
    `/?blank=${encodeSelection(initial)}#conceptBlank`,
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});
const mode = (name: string) =>
  within(screen.getByRole("group", { name: "개념 질문 싣는 방법" })).getByRole(
    "button",
    { name },
  );
function open() {
  fireEvent.click(mode("직접"));
  return within(
    screen.getByRole("dialog", { name: "B 개념 질문 — 문항 고르기" }),
  );
}
const printed = () =>
  decodeSelection(
    new URL(
      screen.getByRole("link", { name: "인쇄하기" }).getAttribute("href")!,
      "http://localhost",
    ).searchParams.get("s"),
  )!;

describe("H2 문제 고르기", () => {
  it.each(["도착 전 적용", "도착 후 적용", "도착한 문항만 해제"])(
    "은행 로딩 중 연 창은 미도착 학년의 고른 문항을 보존한다: %s",
    async (scenario) => {
      const e6Section = BLANK_TREE.find((grade) => grade.grade === "초6")!
        .chapters[0].sections[0].key;
      const e6Bank: ConceptBlankBank = {
        concepts: [
          { ...FIXTURE_BANK.concepts[0], id: "fx-e6", section: e6Section },
        ],
        ox: [],
        apply: [],
        figures: [],
      };
      const pending = new Map<string, (bank: ConceptBlankBank) => void>();
      vi.mocked(loadGradeBank).mockImplementation(
        (grade) => new Promise((resolve) => pending.set(grade, resolve)),
      );
      const saved = selectionFromPicks([
        pickPool(FIXTURE_BANK, initial.sections, "term", "main")[0],
        pickPool(e6Bank, [e6Section], "term", "main")[0],
      ]);
      const code = encodeSelection(saved);
      window.history.replaceState(null, "", `/?blank=${code}`);
      render(<ConceptBlankView />);
      await act(async () => pending.get("초5")!(FIXTURE_BANK));
      fireEvent.click(
        screen.getByRole("button", { name: "개념 질문 문항 고르기" }),
      );
      const dialog = within(
        screen.getByRole("dialog", { name: "B 개념 질문 — 문항 고르기" }),
      );
      if (scenario === "도착한 문항만 해제") {
        fireEvent.click(dialog.getByRole("checkbox"));
      }
      if (scenario === "도착 전 적용") {
        fireEvent.click(dialog.getByRole("button", { name: "적용" }));
        expect(new URL(location.href).searchParams.get("blank")).toBe(code);
      }
      await act(async () => pending.get("초6")!(e6Bank));
      if (scenario !== "도착 전 적용") {
        fireEvent.click(dialog.getByRole("button", { name: "적용" }));
      }
      const expected =
        scenario === "도착한 문항만 해제" ? saved.pick!.slice(1) : saved.pick;
      expect(printed().pick).toEqual(expected);
      expect(JSON.parse(screen.getByTestId("preview").textContent!)).toEqual(
        composeSheets(printed(), {
          ...FIXTURE_BANK,
          concepts: [...FIXTURE_BANK.concepts, ...e6Bank.concepts],
        }),
      );
    },
  );

  it("체크 칸은 해당 문항 본문을 접근성 설명으로 읽고 답은 포함하지 않는다", () => {
    render(<ConceptBlankView bank={FIXTURE_BANK} />);
    const dialog = open();
    for (const checkbox of dialog.getAllByRole("checkbox")) {
      const row = checkbox.closest("li")!;
      const prompt = row.querySelector("[data-pick-prompt]")!;
      expect(checkbox).toHaveAccessibleDescription(prompt.textContent!);
      expect(prompt.id).not.toBe("");
      expect(checkbox).toHaveAttribute("aria-describedby", prompt.id);
      fireEvent.click(within(row).getByRole("button", { name: "답 보기" }));
      expect(checkbox).toHaveAccessibleDescription(prompt.textContent!);
    }
  });

  it("이전 exact 주소의 형식·문항 순서를 미리보기와 인쇄에 보존한다", () => {
    const term = pickPool(FIXTURE_BANK, initial.sections, "term", "main");
    const cloze = pickPool(FIXTURE_BANK, initial.sections, "cloze", "main");
    const saved = selectionFromPicks([cloze.at(-1)!, term.at(-1)!, term[0]]);
    window.history.replaceState(null, "", `/?blank=${encodeSelection(saved)}`);
    render(<ConceptBlankView bank={FIXTURE_BANK} />);
    expect(printed().pick).toEqual(saved.pick);
    expect(printed().forms).toEqual(saved.forms);
  });

  it("저장한 문항이 은행에서 사라져도 주소를 덮어쓰지 않으며 재확인 전 저장·인쇄를 막는다", () => {
    const picks = pickPool(
      FIXTURE_BANK,
      initial.sections,
      "term",
      "main",
    ).slice(0, 2);
    const saved = selectionFromPicks(picks);
    const code = encodeSelection(saved);
    window.history.replaceState(null, "", `/?blank=${code}`);
    render(
      <ConceptBlankView
        bank={{
          ...FIXTURE_BANK,
          concepts: FIXTURE_BANK.concepts.filter(
            (entry) => entry.id !== picks[0].entryId,
          ),
        }}
        storageScope="pick-test"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("다시 확인");
    expect(screen.getByRole("button", { name: "인쇄하기" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "내 시험지에 저장" }),
    ).toBeDisabled();
    expect(new URL(location.href).searchParams.get("blank")).toBe(code);
    fireEvent.click(
      screen.getByRole("button", { name: "개념 질문 문항 고르기" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(printed().pick).toEqual(picks.slice(1));
  });
  it("직접 → 고르기 → 적용: 파란 읽기 칸·만들 지면 수·코드 없음·미리보기가 정확한 문항을 따른다", () => {
    render(<ConceptBlankView bank={FIXTURE_BANK} />);
    const dialog = open();
    const boxes = dialog.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    expect(dialog.getByText("고름 1")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "질문" })).toHaveTextContent(
      "질문 1",
    );
    fireEvent.click(dialog.getByRole("button", { name: "적용" }));
    expect(
      screen.queryByRole("spinbutton", { name: "개념 질문 질문 하" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("개념 질문 질문 하 고른 수"),
    ).toHaveTextContent("1");
    expect(
      within(screen.getByRole("region", { name: "만들 지면" })).getByText(
        "문항 1",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("없음 — 직접 고른 형식이 있습니다"),
    ).toBeInTheDocument();
    expect(printed().pick).toHaveLength(1);
    expect(JSON.parse(screen.getByTestId("preview").textContent!)).toEqual(
      composeSheets(printed(), FIXTURE_BANK),
    );
    expect(screen.getByTestId("preview")).not.toHaveAttribute("data-code");
  });

  it("목록 문장은 누르는 표면이 아니고, 답 보기만 답을 펼치며, 취소는 선택을 버린다", () => {
    render(<ConceptBlankView bank={FIXTURE_BANK} />);
    const dialog = open();
    const row = dialog.getAllByRole("checkbox")[0].closest("li")!;
    const text = row.querySelector("[data-pick-prompt]")!;
    fireEvent.click(text);
    expect(within(row).getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(within(row).getByRole("button", { name: "답 보기" }));
    expect(within(row).getByText("답", { exact: true })).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.click(dialog.getByRole("button", { name: "취소" }));
    fireEvent.click(
      screen.getByRole("button", { name: "개념 질문 문항 고르기" }),
    );
    expect(screen.getByText("고름 0")).toBeInTheDocument();
  });

  it("자동으로 갔다 직접으로 돌아와도 적용한 선택을 보존한다", () => {
    render(<ConceptBlankView bank={FIXTURE_BANK} />);
    const dialog = open();
    fireEvent.click(dialog.getAllByRole("checkbox")[0]);
    fireEvent.click(dialog.getByRole("button", { name: "적용" }));
    const saved = printed().pick;
    fireEvent.click(mode("자동"));
    expect(printed().pick).toBeUndefined();
    open();
    expect(screen.getByText("고름 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(printed().pick).toEqual(saved);
  });

  it("종류와 고른 것만 거르기, 오른쪽 빼기, 목표 수의 빈 칸 채우기를 제공한다", () => {
    render(<ConceptBlankView bank={FIXTURE_BANK} />);
    const dialog = open();
    fireEvent.change(dialog.getByRole("spinbutton", { name: "채울 수 하" }), {
      target: { value: "1" },
    });
    fireEvent.change(dialog.getByRole("spinbutton", { name: "채울 수 중" }), {
      target: { value: "0" },
    });
    fireEvent.change(dialog.getByRole("spinbutton", { name: "채울 수 상" }), {
      target: { value: "0" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "빈 칸만 자동으로" }));
    expect(dialog.getByText("고름 1")).toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "고른 것만" }));
    expect(dialog.getAllByRole("checkbox")).toHaveLength(1);
    const tray = within(
      dialog.getByRole("complementary", { name: "고른 문항" }),
    );
    fireEvent.click(tray.getByRole("button", { name: /빼기$/ }));
    expect(dialog.queryAllByRole("checkbox")).toHaveLength(0);
    fireEvent.click(dialog.getByRole("button", { name: "○×" }));
    expect(dialog.getByText("자동으로 채울 수 · ○×")).toBeInTheDocument();
  });

  it("직접과 자동을 섞은 저장 → 다시 열기 → 인쇄 주소가 같은 문항을 유지한다", async () => {
    let document: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init?: RequestInit) => {
        if (init?.method === "PUT") {
          const body = JSON.parse(String(init.body));
          document = {
            ...body,
            id: decodeURIComponent(String(url).split("/").pop()!),
            revision: 1,
            createdAt: "2026-11-12T00:00:00Z",
            updatedAt: "2026-11-12T00:00:00Z",
            problemCount: 1,
          };
        }
        return Response.json({ data: document });
      }),
    );
    const view = render(
      <ConceptBlankView bank={FIXTURE_BANK} storageScope="pick-test" />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "문장 빈칸 켜기" }));
    const dialog = open();
    fireEvent.click(dialog.getAllByRole("checkbox")[0]);
    fireEvent.click(dialog.getByRole("button", { name: "적용" }));
    const before = printed();
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장됨" })).toBeDisabled(),
    );
    expect(
      (document!.payload as { selection: ConceptBlankSelection }).selection
        .pick,
    ).toEqual(before.pick);
    view.unmount();
    window.history.replaceState(null, "", "/#conceptBlank");
    render(
      <ConceptBlankView
        bank={FIXTURE_BANK}
        storageScope="pick-test"
        openDocument={{ id: String(document!.id), version: 1 }}
      />,
    );
    await screen.findByRole("link", { name: "인쇄하기" });
    expect(printed().pick).toEqual(before.pick);
    expect(JSON.parse(screen.getByTestId("preview").textContent!)).toEqual(
      composeSheets(printed(), FIXTURE_BANK),
    );
  });
});
