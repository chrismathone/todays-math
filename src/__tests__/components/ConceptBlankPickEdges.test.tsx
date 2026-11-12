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
import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import {
  CONCEPT_BLANK_FORM_LABELS,
  type ConceptBlankBank,
  type ConceptBlankForm,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { loadGradeBank } from "@/lib/concept-blank/bank/load";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { pickPool } from "@/lib/concept-blank/manualPick";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";

vi.mock("@/lib/concept-blank/bank/load", () => ({
  loadGradeBank: vi.fn(),
}));
vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: ({ sheets }: ConceptBlankPaperProps) => (
    <pre data-testid="preview">{JSON.stringify(sheets)}</pre>
  ),
}));

const zero = { 하: 0, 중: 0, 상: 0 };
const sections = [
  ...new Set(FIXTURE_BANK.concepts.map((entry) => entry.section)),
];
const autoForm = (form: ConceptBlankForm) => ({
  form,
  counts: { ...zero, 하: 1 },
  extras: { ...zero },
});
function showSelection(
  selection: ConceptBlankSelection,
  bank?: ConceptBlankBank,
) {
  const code = encodeSelection(selection);
  expect(decodeSelection(code)).toEqual(selection);
  window.history.replaceState(null, "", `/?blank=${code}#conceptBlank`);
  return render(<ConceptBlankView bank={bank} />);
}
function printSelection() {
  const url = new URL(
    screen.getByRole("link", { name: "인쇄하기" }).getAttribute("href")!,
    "http://localhost",
  );
  const selection = decodeSelection(url.searchParams.get("s"));
  expect(selection).not.toBeNull();
  return selection!;
}
function chooseOne(form: ConceptBlankForm) {
  fireEvent.click(
    within(
      screen.getByRole("group", {
        name: `${CONCEPT_BLANK_FORM_LABELS[form]} 싣는 방법`,
      }),
    ).getByRole("button", { name: "직접" }),
  );
  const element = screen.getByRole("dialog", { name: /문항 고르기/ });
  const dialog = within(element);
  fireEvent.click(dialog.getByRole("checkbox", { name: "1번 문항 고르기" }));
  expect(dialog.getByText("고름 1")).toBeInTheDocument();
  expect(() =>
    fireEvent.click(
      within(element.querySelector("header")!).getByRole("button", {
        name: "적용",
      }),
    ),
  ).not.toThrow();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
  window.history.replaceState(null, "", "/#conceptBlank");
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("개념 백지 고르기 경계 입력", () => {
  it.each(["term", "cloze"] as const)(
    "옛 자동 주소의 중복 %s 형식을 직접 한 문항으로 바꿔도 실패하지 않는다",
    (form) => {
      showSelection(
        { sections, forms: [autoForm(form), autoForm(form)] },
        FIXTURE_BANK,
      );
      chooseOne(form);
      const saved = printSelection();
      expect(saved.forms.map((entry) => entry.form)).toEqual([form]);
      expect(saved.pick).toEqual([
        pickPool(FIXTURE_BANK, sections, form, "main")[0],
      ]);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it.each(["term", "cloze"] as const)(
    "중복 %s 형식은 첫 항목의 counts와 extras를 보존한다",
    (form) => {
      const first = {
        form,
        counts: { ...zero, 하: 1 },
        extras: form === "term" ? { ...zero, 하: 1 } : { ...zero, 중: 1 },
      };
      const later = {
        form,
        counts: { ...zero, 중: 1 },
        extras: form === "term" ? { ...zero, 중: 1 } : { ...zero, 상: 1 },
      };
      showSelection({ sections, forms: [first, later] }, FIXTURE_BANK);
      expect(printSelection().forms).toEqual([first]);
      expect(printSelection()).not.toHaveProperty("pick");
      chooseOne(form);
      fireEvent.click(
        within(
          screen.getByRole("group", {
            name: `${CONCEPT_BLANK_FORM_LABELS[form]} 싣는 방법`,
          }),
        ).getByRole("button", { name: "자동" }),
      );
      expect(printSelection().forms).toEqual([first]);
      expect(printSelection()).not.toHaveProperty("pick");
    },
  );

  it.each([false, true])(
    "C→B의 첫 등장 순서를 직접 적용·주소 재열기에도 보존한다 (B 중복: %s)",
    (duplicate) => {
      const forms = [autoForm("cloze"), autoForm("term")];
      const view = showSelection(
        { sections, forms: duplicate ? [...forms, autoForm("term")] : forms },
        FIXTURE_BANK,
      );
      chooseOne("term");
      const saved = printSelection();
      expect(saved.forms.map(({ form }) => form)).toEqual(["cloze", "term"]);
      expect(saved.pick?.filter(({ form }) => form === "term")).toHaveLength(1);
      expect(
        new Set(saved.pick?.map((pick) => `${pick.form}:${pick.entryId}`)).size,
      ).toBe(saved.pick?.length);
      view.unmount();
      render(<ConceptBlankView bank={FIXTURE_BANK} />);
      expect(printSelection()).toEqual(saved);
    },
  );

  it("닫은 둘러보기의 실패 학년 전체를 재시도하고 준비된 학년은 다시 받지 않는다", async () => {
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
    const fail = async (grade: string) => {
      await act(async () =>
        pending.get(grade)!.reject(new Error("chunk unavailable")),
      );
    };
    const arrive = async (grade: string) => {
      await act(async () =>
        pending
          .get(grade)!
          .resolve(
            grade === "초5"
              ? FIXTURE_BANK
              : { concepts: [], ox: [], apply: [], figures: [] },
          ),
      );
    };
    const requests = () =>
      vi.mocked(loadGradeBank).mock.calls.map(([grade]) => grade);
    showSelection({ sections, forms: [autoForm("term")] });
    await arrive("초5");
    chooseOne("term");
    const before = printSelection();
    fireEvent.click(screen.getByRole("button", { name: "단원 고르기 열기" }));
    const units = within(screen.getByRole("dialog", { name: "단원 선택" }));
    fireEvent.click(units.getByRole("button", { name: "초6" }));
    await fail("초6");
    fireEvent.click(units.getByRole("button", { name: "중1" }));
    await fail("중1");
    fireEvent.click(units.getByRole("button", { name: /^초5/ }));
    fireEvent.click(units.getByRole("button", { name: "선택 완료" }));
    expect(requests()).toEqual(["초5", "초6", "중1"]);
    expect(printSelection()).toEqual(before);
    expect(
      screen.getByRole("button", { name: "개념 질문 문항 고르기" }),
    ).toBeEnabled();

    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "다시 시도",
      }),
    );
    expect(requests()).toEqual(["초5", "초6", "중1", "초6", "중1"]);
    await fail("초6");
    await arrive("중1");
    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "다시 시도",
      }),
    );
    expect(requests()).toEqual(["초5", "초6", "중1", "초6", "중1", "초6"]);
    await arrive("초6");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(printSelection()).toEqual(before);
  });
});
