import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      name: /^(연습지 만들기|같은 조건으로 다시 만들기)$/,
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
    const first = document.querySelector(
      '[data-page-kind="questions"]',
    )?.textContent;
    expect(document.querySelector('[data-page-kind="answers"]')).toBeNull();
    make();
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() =>
      expect(
        document.querySelector('[data-page-kind="questions"]')?.textContent,
      ).not.toBe(first),
    );
    expect(requests[0].seed).not.toBe(requests[1].seed);
    expect(requests[0].rounds).toEqual(requests[1].rounds);
    expect(Object.keys(requests[0].rounds[0].allocations[0]).sort()).toEqual([
      "count",
      "typeId",
    ]);
    fireEvent.change(screen.getByLabelText("출력 구성"), {
      target: { value: "answers" },
    });
    expect(document.querySelector('[data-page-kind="questions"]')).toBeNull();
    expect(document.querySelector('[data-page-kind="answers"]')).not.toBeNull();
    expect(
      document.querySelector('[data-page-kind="answers"]')?.textContent,
    ).not.toContain("해설");
  });
  it("reopens different round snapshots intact, saves the same payload and restores first-round allocations for regeneration", async () => {
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
      />,
    );
    await screen.findByText(/저장된 식과 정답을 그대로 열었습니다/);
    expect(screen.getByLabelText(fraction.title + " 문항 수")).toHaveValue(3);
    expect(screen.getByLabelText("회차")).toHaveValue(2);
    expect(
      document.querySelectorAll(
        '[data-page-kind="questions"] [aria-label="답란"]',
      ),
    ).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "내 시험지에 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "saved-grade",
        "arithmeticSheet",
        savedDocument.title,
        payload,
        4,
      ),
    );
    expect(requests).toHaveLength(0);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "같은 조건으로 다시 만들기" }),
      ).toBeEnabled(),
    );
    make();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].rounds).toEqual([
      { allocations: [{ typeId: fraction.id, count: 3 }] },
      { allocations: [{ typeId: fraction.id, count: 3 }] },
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
