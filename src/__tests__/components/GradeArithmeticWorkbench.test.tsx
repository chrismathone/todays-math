import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GradeArithmeticWorkbench from "@/components/arithmetic/GradeArithmeticWorkbench";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  type ArithmeticV2GenerateRequest,
} from "@/contracts/arithmeticV2.contract";
import {
  listArithmeticV2Types,
  buildArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";

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

const types = listArithmeticV2Types();
const requests: ArithmeticV2GenerateRequest[] = [];
const build = (rounds: ArithmeticV2GenerateRequest["rounds"]) =>
  buildArithmeticV2Sheet({
    engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
    seed: "reopen-grade-ui",
    rounds,
  });
const make = () =>
  fireEvent.click(
    screen.getByRole("button", {
      name: /^(연습지 만들기|숫자 바꿔 새로 만들기)$/,
    }),
  );
beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (url, init) => {
      if (String(url) === "/api/arithmetic/v2/catalog")
        return Response.json({
          data: {
            engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
            catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
            writerEnabled: true,
          },
        });
      if (String(url) === "/api/arithmetic/v2/generate") {
        const request = JSON.parse(String(init?.body));
        requests.push(request);
        return Response.json({ data: buildArithmeticV2Sheet(request) });
      }
      if (String(url).endsWith("/labels"))
        return Response.json({ error: "unavailable" }, { status: 503 });
      throw new Error("Unexpected URL: " + url);
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const ready = () =>
  waitFor(() =>
    expect(screen.getByRole("button", { name: "연습지 만들기" })).toBeEnabled(),
  );

describe("grade arithmetic user flow", () => {
  it("randomly adds the requested number only from current grade/strand/search, preserving existing quantities", () => {
    render(<GradeArithmeticWorkbench canOutput preview />);
    fireEvent.change(screen.getByLabelText(types[0].title + " 문항 수"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("학년"), {
      target: { value: "초6" },
    });
    fireEvent.change(screen.getByLabelText("연산 영역"), {
      target: { value: "분수" },
    });
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "분수" },
    });
    fireEvent.change(screen.getByLabelText("무작위 유형 수"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "무작위로 담기" }));
    const quantities = screen.getAllByRole("spinbutton", { name: / 문항 수$/ });
    expect(quantities).toHaveLength(3);
    expect(screen.getByLabelText(types[0].title + " 문항 수")).toHaveValue(7);
    const allowed = types
      .filter((type) => type.grade === "초6" && type.strand === "분수")
      .map((type) => type.title + " 문항 수");
    for (const input of quantities.slice(1))
      expect(allowed).toContain(input.getAttribute("aria-label"));
    expect(
      new Set(quantities.map((input) => input.getAttribute("aria-label"))).size,
    ).toBe(3);
  });
  it("uses only implemented grade filters and generates with fresh seeds through the web endpoint", async () => {
    render(<GradeArithmeticWorkbench canOutput storageScope="teacher" />);
    await ready();
    const grade = screen.getByLabelText("학년") as HTMLSelectElement;
    expect([...grade.options].map((option) => option.value)).toEqual([
      "전체",
      ...["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3"].filter(
        (value) => types.some((type) => type.grade === value),
      ),
    ]);
    make();
    await screen.findByText(/문항을 생성하고 정답을 확인했습니다/);
    const first = screen.getByRole("region", {
      name: "생성한 문항 검토",
    }).textContent;
    expect(screen.queryByLabelText("정답")).toBeNull();
    expect(screen.queryByLabelText("학년")).toBeNull();
    expect(
      within(
        screen.getByRole("navigation", { name: "연산 제작 단계" }),
      ).getByRole("button", { name: "2 문항 검토" }),
    ).toHaveAttribute("aria-current", "step");
    make();
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "생성한 문항 검토" }).textContent,
      ).not.toBe(first),
    );
    expect(requests[0].seed).not.toBe(requests[1].seed);
    expect(requests[0].rounds).toEqual(requests[1].rounds);
    expect(Object.keys(requests[0].rounds[0].allocations[0]).sort()).toEqual([
      "count",
      "typeId",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "정답 보기" }));
    expect(screen.getAllByLabelText("정답")).toHaveLength(
      requests[1].rounds[0].allocations[0].count,
    );
    fireEvent.click(screen.getByRole("button", { name: "정답 숨기기" }));
    expect(screen.queryByLabelText("정답")).toBeNull();
  });
  it("reopens different round snapshots intact, saves the same payload and preserves each round allocation for regeneration", async () => {
    const fraction = types.find(
      (type) => type.grade === "초6" && type.strand === "분수",
    )!;
    const radical = types.find((type) => type.strand === "근호")!;
    const payload = build([
      { allocations: [{ typeId: fraction.id, count: 3 }] },
      { allocations: [{ typeId: radical.id, count: 2 }] },
    ]);
    const savedDocument: PrivateDocument = {
      id: "saved-grade",
      kind: "arithmeticSheet",
      title: "분수와 근호 복습",
      revision: 4,
      problemCount: 5,
      createdAt: "2026-10-14",
      updatedAt: "2026-10-14",
      payload,
    };
    vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue(
      savedDocument,
    );
    const save = vi
      .spyOn(PrivateCloudClient.prototype, "save")
      .mockResolvedValue({ ...savedDocument, revision: 5 });
    render(
      <GradeArithmeticWorkbench
        canOutput
        storageScope="teacher"
        initialDocumentId={savedDocument.id}
        initialStep="output"
      />,
    );
    await screen.findByText(/저장된 식과 정답을 그대로 열었습니다/);
    expect(await screen.findByLabelText("공통 문항 수")).toHaveTextContent("5");
    expect(requests).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(
      within(
        screen.getByRole("region", { name: "생성한 문항 검토" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "saved-grade",
        "arithmeticSheet",
        savedDocument.title,
        expect.objectContaining(payload),
        4,
      ),
    );
    expect(requests).toHaveLength(0);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "숫자 바꿔 새로 만들기" }),
      ).toBeEnabled(),
    );
    make();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].rounds).toEqual([
      { allocations: [{ typeId: fraction.id, count: 3 }] },
      { allocations: [{ typeId: radical.id, count: 2 }] },
    ]);
  });
  it("rejects a corrupted saved answer and never regenerates it silently", async () => {
    const payload = build([
      { allocations: [{ typeId: types[0].id, count: 1 }] },
    ]);
    payload.rounds[0].items[0].answer.text = "wrong";
    vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue({
      id: "bad",
      kind: "arithmeticSheet",
      title: "연산",
      revision: 1,
      problemCount: 1,
      createdAt: "2026-10-14",
      updatedAt: "2026-10-14",
      payload,
    });
    render(
      <GradeArithmeticWorkbench
        canOutput
        storageScope="teacher"
        initialDocumentId="bad"
      />,
    );
    await screen.findByRole("alert");
    expect(requests).toHaveLength(0);
    expect(document.querySelector('[data-page-kind="questions"]')).toBeNull();
  });
});
