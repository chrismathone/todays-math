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

const requests: ArithmeticGenerateRequest[] = [];
const sheets: ArithmeticSheetPayload[] = [];
const currentProblems = () =>
  document.querySelector('[data-page-kind="questions"]')?.textContent;
const make = () =>
  fireEvent.click(
    screen.getByRole("button", {
      name: /^(연습지 만들기|같은 조건으로 다시 만들기)$/,
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
  it("generates over the web, changes operands on regeneration and keeps answers off question pages", async () => {
    render(<ArithmeticWorkbench canOutput storageScope="teacher" />);
    await ready();
    make();
    await screen.findByText(/20문항을 생성하고/);
    const first = currentProblems();
    expect(document.querySelector('[data-page-kind="answers"]')).toBeNull();
    expect(
      document.querySelectorAll(
        '[data-page-kind="questions"] [aria-label="답란"]',
      ),
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
    fireEvent.change(screen.getByLabelText("출력 구성"), {
      target: { value: "both" },
    });
    const answers = document.querySelector('[data-page-kind="answers"]')!;
    const answerCells = [...answers.querySelectorAll("div > div > span")].map(
      (item) => item.textContent,
    );
    expect(answerCells).toEqual(
      sheets[1].rounds[0].items.map((item) => item.answer),
    );
    expect(answers.textContent).not.toContain("해설");
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
    expect(text).toContain("2 ×");
    expect(text).toContain("3 ×");
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
    const original = currentProblems();
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await screen.findByText("내 시험지에 저장했습니다.");
    expect(onDocumentChange).toHaveBeenCalledWith(stored!.id);
    fireEvent.change(screen.getByLabelText("학습지 제목"), {
      target: { value: "덧셈 집중 연습" },
    });
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(stored?.revision).toBe(2));
    expect(save.mock.calls[1][0]).toBe(save.mock.calls[0][0]);
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
    expect(requests).toHaveLength(1);
    expect(
      currentProblems()?.replace("덧셈 집중 연습", "연산 기초 다지기 1회"),
    ).toBe(original);
    expect(
      screen.getByRole("spinbutton", {
        name: "두 자리 덧셈 · 받아올림 0회 문항 수",
      }),
    ).toHaveValue(20);
  });

  it("prints only the chosen paper pages, then removes the temporary print portal", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      expect(document.body).toHaveAttribute("data-arithmetic-print", "true");
      const portal = document.querySelector("[data-arithmetic-print-root]")!;
      expect(
        portal.querySelectorAll("[data-page-kind=questions]"),
      ).toHaveLength(2);
      expect(portal.querySelectorAll("[data-page-kind=answers]")).toHaveLength(
        1,
      );
      expect(portal.textContent).not.toContain("담은 유형");
    });
    render(<ArithmeticWorkbench canOutput preview />);
    make();
    await screen.findByText(/20문항을 생성하고/);
    fireEvent.change(screen.getByLabelText("쪽당 문항"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("출력 구성"), {
      target: { value: "both" },
    });
    fireEvent.click(screen.getByRole("button", { name: "인쇄 / PDF" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(document.querySelector("[data-arithmetic-print-root]")).toBeNull(),
    );
    expect(document.body).not.toHaveAttribute("data-arithmetic-print");
    Reflect.deleteProperty(document, "fonts");
  });
});
