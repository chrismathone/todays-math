import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArithmeticWorkbench from "@/components/arithmetic/LegacyArithmeticWorkbench";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  type ArithmeticGenerateRequest,
} from "@/contracts/arithmetic.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";

/** Answers render through KaTeX; read the visible copy, not the hidden MathML track. */
const visibleText = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll(".katex-mathml").forEach((node) => node.remove());
  return copy.textContent ?? "";
};

vi.mock("@/components/unified/WorksheetEditor", () => ({
  default: (
    props: import("react").ComponentProps<
      typeof import("@/components/unified/WorksheetEditor").default
    >,
  ) => (
    <section aria-label="공통 출력 편집기">
      {props.stepNavigation?.items.map((item) => (
        <button key={item.id} disabled={item.disabled} onClick={item.onSelect}>
          {item.label}
        </button>
      ))}
      <select
        aria-label="공통 양식"
        value={props.printOptions?.template}
        onChange={(event) =>
          props.setPrintOptions?.({ template: event.target.value as "modern" })
        }
      >
        <option value="yuhyung">유형</option>
        <option value="modern">모던</option>
      </select>
      <output aria-label="공통 정답 방식">
        {props.printOptions?.quickAnswerOnly ? "답만" : "해설 포함"}
      </output>
      <output aria-label="공통 문항 수">{props.selected.length}</output>
      {props.outputNotice}
    </section>
  ),
}));

const requests: ArithmeticGenerateRequest[] = [];
const sheets: ArithmeticSheetPayload[] = [];
const currentProblems = () =>
  screen.getByRole("region", { name: "생성한 문항 검토" })?.textContent;
const make = () =>
  fireEvent.click(
    screen.getByRole("button", {
      name: /^(연습지 만들기|모든 회차 숫자 바꾸기)$/,
    }),
  );

beforeEach(() => {
  requests.length = 0;
  sheets.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (url, init) => {
      if (String(url) === "/api/arithmetic/catalog")
        return Response.json({
          data: {
            engineVersion: ARITHMETIC_ENGINE_VERSION,
            catalogVersion: ARITHMETIC_CATALOG_VERSION,
            writerEnabled: true,
          },
        });
      if (String(url) === "/api/arithmetic/generate") {
        const request = JSON.parse(String(init?.body));
        requests.push(request);
        const sheet = buildArithmeticSheet(request);
        sheets.push(sheet);
        return Response.json({ data: sheet });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function ready() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "연습지 만들기" })).toBeEnabled(),
  );
}

describe("arithmetic workbench", () => {
  it("allows 200 questions per round and rejects more than ten rounds", async () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "두 자리 덧셈 · 받아올림 0회 문항 수",
      }),
      { target: { value: "200" } },
    );
    expect(screen.getByLabelText("회차")).toHaveAttribute("max", "10");
    fireEvent.change(screen.getByLabelText("회차"), {
      target: { value: "11" },
    });
    expect(screen.getByText(/회차는 1.*10/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "연습지 만들기" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "2" } });
    expect(screen.getByRole("button", { name: "연습지 만들기" })).toBeEnabled();
    make();
    await screen.findByText(/400문항을 생성하고/);
    expect(
      within(
        await screen.findByRole("region", { name: "생성한 문항 검토" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(200);
    expect(
      screen.getByRole("tab", { name: "2회차 200문항" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("offers a 종류 filter whose choices follow the chosen 연산 영역", () => {
    render(<ArithmeticWorkbench canOutput preview />);
    const options = () =>
      within(screen.getByLabelText("종류"))
        .getAllByRole("option")
        .map((option) => option.textContent);
    expect(options()).toEqual([
      "전체",
      "한 자리 덧셈",
      "한 자리 뺄셈",
      "두 자리 세로 덧셈",
      "두 자리 세로 뺄셈",
      "곱셈구구",
      "두 자리 수 곱하기 한 자리 수",
      "두 자리 수 나누기 한 자리 수",
    ]);
    fireEvent.change(screen.getByLabelText("연산 영역"), {
      target: { value: "곱셈" },
    });
    expect(options()).toEqual([
      "전체",
      "곱셈구구",
      "두 자리 수 곱하기 한 자리 수",
    ]);
    fireEvent.change(screen.getByLabelText("종류"), {
      target: { value: "times-table" },
    });
    const cards = within(screen.getByLabelText("연산 유형")).getAllByRole(
      "button",
    );
    expect(cards).toHaveLength(9);
    for (const card of cards)
      expect(card.querySelector("strong")?.textContent).toMatch(/^\d단$/);
    // Switching the area resets the kind to 전체 and swaps its choices.
    fireEvent.change(screen.getByLabelText("연산 영역"), {
      target: { value: "나눗셈" },
    });
    expect(screen.getByLabelText("종류")).toHaveValue("전체");
    expect(options()).toEqual(["전체", "두 자리 수 나누기 한 자리 수"]);
    expect(
      within(screen.getByLabelText("연산 유형")).getAllByRole("button"),
    ).toHaveLength(9);
  });
  it("randomly adds distinct filtered presets and preserves their default constraints and selected count", () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.change(screen.getByLabelText("연산 영역"), {
      target: { value: "곱셈" },
    });
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "단" },
    });
    fireEvent.change(screen.getByLabelText("무작위 유형 수"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "무작위로 담기" }));
    const quantities = screen.getAllByRole("spinbutton", { name: / 문항 수$/ });
    expect(quantities).toHaveLength(3);
    expect(quantities[0]).toHaveValue(20);
    for (const input of quantities.slice(1)) {
      expect(input.getAttribute("aria-label")).toMatch(/^\d단 문항 수$/);
      expect(input).toHaveValue(9);
    }
    expect(
      new Set(quantities.map((input) => input.getAttribute("aria-label"))).size,
    ).toBe(3);
  });
  it("keeps save and output gates while allowing local review", async () => {
    const save = vi.spyOn(PrivateCloudClient.prototype, "save");
    render(<ArithmeticWorkbench canOutput={false} preview />);
    make();
    await screen.findByRole("region", { name: "생성한 문항 검토" });
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "3 양식 구성·출력" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("region", { name: "공통 출력 편집기" }),
    ).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
  it("generates over the web, changes operands on regeneration and keeps answers off question pages", async () => {
    render(<ArithmeticWorkbench canOutput storageScope="teacher" />);
    await ready();
    make();
    await screen.findByText(/20문항을 생성하고/);
    const first = currentProblems();
    expect(screen.queryByLabelText("정답")).toBeNull();
    expect(
      within(
        screen.getByRole("region", { name: "생성한 문항 검토" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(20);
    make();
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() => expect(currentProblems()).not.toBe(first));
    expect(requests[0].seed).not.toBe(requests[1].seed);
    expect(requests[0].rounds).toEqual(requests[1].rounds);
    expect(Object.keys(requests[0].rounds[0].skills[0]).sort()).toEqual([
      "constraints",
      "count",
      "skillId",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "정답 보기" }));
    expect(
      screen
        .getAllByLabelText("정답")
        .map((item) => visibleText(item).replace("정답 ", "")),
    ).toEqual(sheets[1].rounds[0].items.map((item) => item.answer));
  });

  it("enforces a fixed table capacity and permits different presets of one operation", async () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.click(
      screen.getByRole("button", { name: "두 자리 덧셈 · 받아올림 0회 빼기" }),
    );
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "2단" },
    });
    fireEvent.click(
      within(screen.getByLabelText("연산 유형")).getByRole("button", {
        name: /^2단/,
      }),
    );
    const count = screen.getByRole("spinbutton", { name: "2단 문항 수" });
    expect(count).toHaveValue(9);
    fireEvent.change(count, { target: { value: "10" } });
    expect(
      screen.getByRole("button", { name: "연습지 만들기" }),
    ).toBeDisabled();
    fireEvent.change(count, { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "3단" },
    });
    fireEvent.click(
      within(screen.getByLabelText("연산 유형")).getByRole("button", {
        name: /^3단/,
      }),
    );
    expect(screen.getByRole("spinbutton", { name: "2단 문항 수" })).toHaveValue(
      9,
    );
    expect(screen.getByRole("spinbutton", { name: "3단 문항 수" })).toHaveValue(
      9,
    );
    make();
    await screen.findByText(/18문항을 생성하고/);
    const text = currentProblems();
    expect(text).toContain("2");
    expect(text).toContain("3");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("saves snapshots with revisions and reopens without regenerating or racing the load", async () => {
    let stored: PrivateDocument | undefined;
    const save = vi
      .spyOn(PrivateCloudClient.prototype, "save")
      .mockImplementation(async (id, kind, title, payload, revision) => {
        expect(revision).toBe(stored?.revision ?? null);
        stored = {
          id,
          kind,
          title,
          payload: structuredClone(payload),
          revision: (stored?.revision ?? 0) + 1,
          problemCount: 20,
          createdAt: "2026-10-14T00:00:00Z",
          updatedAt: "2026-10-14T00:00:00Z",
        } as PrivateDocument;
        return stored;
      });
    const onDocumentChange = vi.fn();
    const view = render(
      <ArithmeticWorkbench
        canOutput
        storageScope="teacher"
        onDocumentChange={onDocumentChange}
      />,
    );
    await ready();
    make();
    await screen.findByText(/20문항을 생성하고/);
    const original = within(
      screen.getByRole("region", { name: "생성한 문항 검토" }),
    )
      .getAllByRole("listitem")
      .map((item) => item.textContent)
      .join("");
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    await screen.findByRole("region", { name: "공통 출력 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await screen.findByText(
      "내 시험지에 저장했습니다. 다음에 같은 문항과 양식으로 열 수 있습니다.",
    );
    expect(onDocumentChange).toHaveBeenCalledWith(stored!.id);
    expect(stored?.payload.presentation).toMatchObject({ step: "output" });
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    fireEvent.change(screen.getByLabelText("학습지 제목"), {
      target: { value: "덧셈 집중 연습" },
    });
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    await screen.findByRole("region", { name: "공통 출력 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(stored?.revision).toBe(2));
    expect(save.mock.calls[1][0]).toBe(save.mock.calls[0][0]);
    expect(save.mock.calls.map((call) => call[4])).toEqual([null, 1]);
    expect(stored?.payload.rounds).toEqual(sheets[0].rounds);
    view.unmount();
    let resolve!: (value: PrivateDocument) => void;
    vi.spyOn(PrivateCloudClient.prototype, "get").mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(
      <ArithmeticWorkbench
        canOutput
        storageScope="teacher"
        initialDocumentId={stored!.id}
      />,
    );
    expect(screen.getByRole("button", { name: "작업 중…" })).toBeDisabled();
    resolve(stored!);
    await screen.findByText(/저장된 연산식과 정답/);
    await screen.findByRole("region", { name: "공통 출력 편집기" });
    expect(requests).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(screen.getByLabelText("학습지 제목")).toHaveValue("덧셈 집중 연습");
    expect(
      within(screen.getByRole("region", { name: "생성한 문항 검토" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
        .join(""),
    ).toBe(original);
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    expect(
      screen.getByRole("spinbutton", {
        name: "두 자리 덧셈 · 받아올림 0회 문항 수",
      }),
    ).toHaveValue(20);
  });

  it("opens shared output and preserves controlled format and sheet across steps", async () => {
    render(<ArithmeticWorkbench canOutput preview />);
    make();
    await screen.findByText(/20문항을 생성하고/);
    const before = within(
      screen.getByRole("region", { name: "생성한 문항 검토" }),
    )
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    const template = await screen.findByLabelText("공통 양식");
    fireEvent.change(template, { target: { value: "modern" } });
    expect(screen.getByLabelText("공통 정답 방식")).toHaveTextContent("답만");
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(
      within(screen.getByRole("region", { name: "생성한 문항 검토" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    expect(await screen.findByLabelText("공통 양식")).toHaveValue("modern");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("names a review group after the picked preset and reports a tiny preset's regeneration next to it", async () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.click(
      screen.getByRole("button", { name: "두 자리 덧셈 · 받아올림 0회 빼기" }),
    );
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "더하기" },
    });
    const catalog = screen.getByLabelText("연산 유형");
    fireEvent.click(
      within(catalog).getByRole("button", {
        name: /^3 더하기 · 받아올림 있음/,
      }),
    );
    fireEvent.click(
      within(catalog).getByRole("button", {
        name: /^9 더하기 · 받아올림 없음/,
      }),
    );
    expect(
      screen.getByRole("spinbutton", {
        name: "3 더하기 · 받아올림 있음 문항 수",
      }),
    ).toHaveValue(3);
    make();
    await screen.findByText(/4문항을 생성하고/);
    const review = screen.getByRole("region", { name: "생성한 문항 검토" });
    expect(
      within(review).queryByRole("region", { name: /한 자리 덧셈/ }),
    ).toBeNull();
    const group = within(review).getByRole("region", {
      name: "3 더하기 · 받아올림 있음 · 가로셈",
    });
    const single = within(review).getByRole("region", {
      name: "9 더하기 · 받아올림 없음 · 가로셈",
    });
    const operands = () =>
      within(group)
        .getAllByRole("listitem")
        .map((item) =>
          /(\d)\s*\+\s*(\d)/.exec(visibleText(item))!.slice(1).join("+"),
        );
    const before = operands();
    expect(before.map((text) => text.slice(-1))).toEqual(["3", "3", "3"]);
    fireEvent.click(
      within(group).getByRole("button", {
        name: "3 더하기 · 받아올림 있음 · 가로셈 숫자 바꾸기",
      }),
    );
    await waitFor(() =>
      expect(
        within(group).getByText(/3문항은 선택한 문항끼리 자리만 바꿨습니다/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /만들 수 있는 식을 모두 담고 있어/,
    );
    expect(operands()).not.toEqual(before);
    expect(new Set(operands())).toEqual(new Set(before));
    fireEvent.click(
      within(single).getByRole("button", {
        name: "9 더하기 · 받아올림 없음 · 가로셈 숫자 바꾸기",
      }),
    );
    await waitFor(() =>
      expect(
        within(single).getByText(/바꿀 숫자가 없습니다/),
      ).toBeInTheDocument(),
    );
    expect(within(group).queryByText(/자리만 바꿨습니다/)).toBeNull();
    expect(within(single).getByText(/바꿀 숫자가 없습니다/)).toHaveTextContent(
      /기존 문항을 유지/,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "모든 회차 숫자 바꾸기" }),
    );
    await screen.findByText(/4문항을 생성하고/);
    expect(screen.queryByText(/바꿀 숫자가 없습니다/)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("enables catalog and basket controls from state alone, like the grade workbench", () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "3 더하기" },
    });
    const catalog = screen.getByLabelText("연산 유형");
    const cards = within(catalog).getAllByRole("button");
    expect(cards).toHaveLength(2);
    const random = screen.getByRole("button", { name: "무작위로 담기" });
    const removeSelected = screen.getByRole("button", {
      name: "선택한 유형 빼기",
    });
    const selectAll = screen.getByLabelText("담은 유형 전체 선택");
    expect(random).toBeEnabled();
    expect(removeSelected).toBeDisabled();
    for (const card of cards) fireEvent.click(card);
    for (const card of cards) {
      expect(card).toHaveAttribute("aria-pressed", "true");
      expect(card).toBeEnabled();
    }
    // Everything visible is in the basket: nothing is left to add.
    expect(random).toBeDisabled();
    fireEvent.click(cards[0]);
    expect(cards[0]).toHaveAttribute("aria-pressed", "false");
    expect(random).toBeEnabled();
    fireEvent.click(cards[0]);
    expect(removeSelected).toBeDisabled();
    fireEvent.click(selectAll);
    expect(removeSelected).toBeEnabled();
    expect(removeSelected).toHaveTextContent("선택 빼기 (3)");
    fireEvent.click(removeSelected);
    expect(
      screen.getByText("왼쪽에서 연습할 유형을 담으세요."),
    ).toBeInTheDocument();
    expect(selectAll).toBeDisabled();
    expect(removeSelected).toBeDisabled();
    for (const card of cards) {
      expect(card).toHaveAttribute("aria-pressed", "false");
      expect(card).toBeEnabled();
    }
    expect(random).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "연습지 만들기" }),
    ).toBeDisabled();
    // A full round budget disables every add path but keeps removal open.
    fireEvent.click(cards[0]);
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "3 더하기 · 받아올림 없음 문항 수",
      }),
      { target: { value: "200" } },
    );
    expect(cards[1]).toBeDisabled();
    expect(random).toBeDisabled();
    expect(cards[0]).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "3 더하기 · 받아올림 없음 빼기" }),
    ).toBeEnabled();
  });
});
