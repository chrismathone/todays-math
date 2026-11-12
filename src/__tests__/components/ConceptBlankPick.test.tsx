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
  const delayedBanks = () => {
    const pending = new Map<
      string,
      {
        resolve: (bank: ConceptBlankBank) => void;
        reject: (error: Error) => void;
      }
    >();
    vi.mocked(loadGradeBank).mockImplementation(
      (grade) =>
        new Promise((resolve, reject) =>
          pending.set(grade, { resolve, reject }),
        ),
    );
    return {
      arrive: async (grade: string, bank: ConceptBlankBank) => {
        await act(async () => pending.get(grade)!.resolve(bank));
      },
      fail: async (grade: string) => {
        await act(async () =>
          pending.get(grade)!.reject(new Error("chunk unavailable")),
        );
      },
    };
  };
  const gradeFixture = (
    grade: string,
    sectionCount: number,
  ): ConceptBlankBank => ({
    concepts: BLANK_TREE.find((item) => item.grade === grade)!
      .chapters.flatMap((chapter) => chapter.sections)
      .slice(0, sectionCount)
      .flatMap(({ key }, index) =>
        [0, 1].map((copy) => ({
          ...FIXTURE_BANK.concepts[0],
          id: `fx-${grade === "초5" ? "e5" : "e6"}-${index}-${copy}`,
          section: key,
        })),
      ),
    ox: [],
    apply: [],
    figures: [],
  });
  const savedFromBanks = (...banks: ConceptBlankBank[]) =>
    selectionFromPicks(
      banks.flatMap((bank) =>
        pickPool(
          bank,
          [...new Set(bank.concepts.map((entry) => entry.section))],
          "term",
          "main",
        ).filter((_, index) => index % 2 === 0),
      ),
    );
  const pickerButton = () =>
    screen.getByRole("button", { name: "개념 질문 문항 고르기" });
  const showSaved = (saved: ConceptBlankSelection) => {
    const code = encodeSelection(saved);
    window.history.replaceState(null, "", `/?blank=${code}`);
    render(<ConceptBlankView storageScope="pick-test" />);
    return code;
  };

  it.each(["빈 칸만 자동으로", "모두 비우고 자동으로"])(
    "두 학년의 은행이 모두 온 뒤에만 고르기를 열어 40문항 상한을 지킨다: %s",
    async (action) => {
      const e5 = gradeFixture("초5", 20),
        e6 = gradeFixture("초6", 20);
      const saved = savedFromBanks(e5, e6);
      expect(saved.pick).toHaveLength(40);
      const loads = delayedBanks();
      const code = showSaved(saved);
      await loads.arrive("초5", e5);
      expect(pickerButton()).toBeDisabled();
      expect(pickerButton()).toHaveAccessibleDescription("은행을 불러오는 중");
      fireEvent.click(pickerButton());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(new URL(location.href).searchParams.get("blank")).toBe(code);
      await loads.arrive("초6", e6);
      expect(pickerButton()).toBeEnabled();
      fireEvent.click(pickerButton());
      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.getByText("고름 40")).toBeInTheDocument();
      const target = action === "빈 칸만 자동으로" ? 40 : 1;
      fireEvent.change(dialog.getByRole("spinbutton", { name: "채울 수 하" }), {
        target: { value: String(target) },
      });
      fireEvent.click(dialog.getByRole("button", { name: action }));
      expect(dialog.getByText(`고름 ${target}`)).toBeInTheDocument();
      fireEvent.click(dialog.getByRole("button", { name: "적용" }));
      expect(printed().pick).toHaveLength(target);
      expect(printed().forms[0].counts.하).toBe(target);
      if (target === 40) expect(printed().pick).toEqual(saved.pick);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it.each(["삭제", "소단원 변경", "난이도 변경"])(
    "지연 은행의 낡은 선택을 모두 도착한 뒤 창 한 번으로 재확인한다: %s",
    async (change) => {
      const e5 = gradeFixture("초5", 1),
        e6 = gradeFixture("초6", 2);
      const saved = savedFromBanks(e5, {
        ...e6,
        concepts: e6.concepts.slice(0, 2),
      });
      const loads = delayedBanks();
      showSaved(saved);
      await loads.arrive("초5", e5);
      expect(pickerButton()).toBeDisabled();
      fireEvent.click(pickerButton());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const changed: ConceptBlankBank = {
        ...e6,
        concepts:
          change === "삭제"
            ? e6.concepts.slice(1)
            : e6.concepts.map((entry, index) =>
                index
                  ? entry
                  : {
                      ...entry,
                      ...(change === "소단원 변경"
                        ? { section: e6.concepts[2].section }
                        : { level: "중" as const }),
                    },
              ),
      };
      await loads.arrive("초6", changed);
      expect(screen.getByRole("alert")).toHaveTextContent("다시 확인");
      fireEvent.click(pickerButton());
      expect(screen.getByText("고름 1")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "적용" }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(printed().pick).toEqual(saved.pick!.slice(0, 1));
      expect(
        screen.getByRole("button", { name: "내 시험지에 저장" }),
      ).toBeEnabled();
    },
  );

  it("아직 은행이 하나도 없어도 고르기를 잠그고 실패한 학년만 다시 시도한다", async () => {
    const e5 = gradeFixture("초5", 1),
      e6 = gradeFixture("초6", 1);
    const loads = delayedBanks();
    const saved = savedFromBanks(e5, e6);
    const code = showSaved(saved);
    expect(pickerButton()).toBeDisabled();
    expect(pickerButton()).toHaveAccessibleDescription("은행을 불러오는 중");
    await loads.arrive("초5", e5);
    await loads.fail("초6");
    expect(pickerButton()).toBeDisabled();
    expect(pickerButton()).toHaveAccessibleDescription(
      "은행을 불러오지 못했습니다 · 다시 시도",
    );
    const retry = within(pickerButton().parentElement!).getByRole("button", {
      name: "다시 시도",
    });
    fireEvent.click(retry);
    expect(pickerButton()).toHaveAccessibleDescription("은행을 불러오는 중");
    expect(vi.mocked(loadGradeBank).mock.calls.map(([grade]) => grade)).toEqual(
      ["초5", "초6", "초6"],
    );
    expect(new URL(location.href).searchParams.get("blank")).toBe(code);
    await loads.fail("초6");
    fireEvent.click(
      within(pickerButton().parentElement!).getByRole("button", {
        name: "다시 시도",
      }),
    );
    await loads.arrive("초6", e6);
    expect(pickerButton()).toBeEnabled();
    expect(printed().pick).toEqual(saved.pick);
    expect(screen.queryByText("은행을 불러오는 중")).not.toBeInTheDocument();
  });

  it("은행 로딩 중 직접으로 바꿔도 고르기 창을 열지 않는다", async () => {
    const e5 = gradeFixture("초5", 1),
      e6 = gradeFixture("초6", 1);
    const loads = delayedBanks();
    const automatic = { ...savedFromBanks(e5, e6) };
    delete automatic.pick;
    showSaved(automatic);
    await loads.arrive("초5", e5);
    fireEvent.click(mode("직접"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pickerButton()).toBeDisabled();
    await loads.arrive("초6", e6);
    fireEvent.click(pickerButton());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("선택하지 않고 둘러보는 학년의 로딩·실패는 준비된 범위의 고르기를 막지 않는다", async () => {
    const e5 = gradeFixture("초5", 1);
    const loads = delayedBanks();
    showSaved(savedFromBanks(e5));
    await loads.arrive("초5", e5);
    fireEvent.click(screen.getByRole("button", { name: "단원 고르기 열기" }));
    const units = within(screen.getByRole("dialog", { name: "단원 선택" }));
    fireEvent.click(units.getByRole("button", { name: /^초6/ }));
    fireEvent.click(units.getByRole("button", { name: "선택 완료" }));
    expect(pickerButton()).toBeEnabled();
    await loads.fail("초6");
    expect(pickerButton()).toBeEnabled();
    fireEvent.click(pickerButton());
    expect(
      screen.getByRole("dialog", { name: /문항 고르기/ }),
    ).toBeInTheDocument();
  });

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
