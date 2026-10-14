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
  it("allows 100 questions in each of two rounds and explains the total size cap", async () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "두 자리 덧셈 · 받아올림 0회 문항 수",
      }),
      { target: { value: "100" } },
    );
    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "3" } });
    expect(
      screen.getByText(/한 번에 총 200문항까지 만들 수 있습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "연습지 만들기" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "2" } });
    expect(screen.getByRole("button", { name: "연습지 만들기" })).toBeEnabled();
    make();
    await screen.findByText(/200문항을 생성하고/);
    expect(
      within(
        screen.getByRole("region", { name: "생성한 문항 검토" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(100);
    expect(
      screen.getByRole("tab", { name: "2회차 100문항" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("randomly adds distinct filtered presets and preserves their default constraints and selected count", () => {
    render(<ArithmeticWorkbench canOutput preview />);
    fireEvent.change(screen.getByLabelText("연산 종류"), {
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
        .map((item) => item.textContent?.replace("정답 ", "")),
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
});
