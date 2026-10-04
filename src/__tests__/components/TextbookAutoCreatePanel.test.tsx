import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutoCreatePanel } from "@/components/textbook/AutoCreatePanel";
import type { QuickCreateApi } from "@/lib/textbook/quickCreateClient";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateCatalog,
  type QuickCreateResult,
} from "@/contracts/textbookQuickCreate.contract";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const catalog: QuickCreateCatalog = {
  units: ["유리수와 소수", "순환소수", "지수법칙"].map((section, index) => ({
    id: ids[index]!,
    label: section,
    chapter: "수와 식",
    section,
    problemCount: 12,
    conceptCount: 3,
  })),
};
const result: QuickCreateResult = {
  book: {
    id: "44444444-4444-4444-8444-444444444444",
    ownerId: ids[0]!,
    ownerName: "교사",
    isOwner: true,
    title: "중2 수와 식",
    visibility: "private",
    sharedBranchId: null,
    archivedAt: null,
    createdAt: "2026-10-04T00:00:00.000Z",
    updatedAt: "2026-10-04T00:00:00.000Z",
    draftEditionId: ids[1]!,
    latestPublishedEditionId: null,
  },
  problemCount: 8,
  conceptCount: 3,
  warnings: [],
};
const api = (overrides: Partial<QuickCreateApi> = {}): QuickCreateApi => ({
  listUnits: vi.fn(async () => catalog),
  create: vi.fn(async () => result),
  ...overrides,
});

describe("simple textbook creation", () => {
  it("creates an inclusive range without title, curriculum code or page-budget entry", async () => {
    const client = api();
    const onCreated = vi.fn(async () => {});
    render(<AutoCreatePanel api={client} onCreated={onCreated} />);
    await screen.findAllByRole("option", { name: "지수법칙" });
    fireEvent.change(screen.getByRole("combobox", { name: "끝 범위" }), {
      target: { value: ids[2] },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "난이도" }), {
      target: { value: "challenge" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "이 범위로 교재 만들기" }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(result));
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolLevel: "middle",
        grade: 2,
        semester: 1,
        startUnitId: ids[0],
        endUnitId: ids[2],
        difficulty: "challenge",
        problemCountPerUnit: 8,
        includeConcepts: true,
      }),
    );
    expect(vi.mocked(client.create).mock.calls[0]![0]).not.toHaveProperty(
      "title",
    );
  });

  it("submits component switches and the selected character", async () => {
    const client = api();
    render(<AutoCreatePanel api={client} onCreated={async () => {}} />);
    await screen.findAllByRole("option", { name: "지수법칙" });
    fireEvent.click(screen.getByText("교재 구성 선택"));
    fireEvent.click(screen.getByRole("switch", { name: /개념 대화/ }));
    fireEvent.click(screen.getByRole("switch", { name: /쉬어가기/ }));
    fireEvent.click(screen.getByText("등장인물 선택"));
    const teacherChoices = screen.getAllByRole("button", { name: /^선생님 / });
    expect(teacherChoices).toHaveLength(10);
    fireEvent.click(teacherChoices[9]!);
    fireEvent.click(
      screen.getByRole("button", { name: "이 범위로 교재 만들기" }),
    );
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.objectContaining({ dialogue: false, rest: true }),
        cast: expect.objectContaining({ teacherId: "teacher-m5" }),
      }),
    );
  });

  it("prevents creating an empty manuscript when every component is off", async () => {
    render(<AutoCreatePanel api={api()} onCreated={async () => {}} />);
    await screen.findAllByRole("option", { name: "지수법칙" });
    fireEvent.click(screen.getByText("교재 구성 선택"));
    for (const control of screen.getAllByRole("switch"))
      if (control.getAttribute("aria-checked") === "true")
        fireEvent.click(control);
    expect(
      screen.getByRole("button", { name: "이 범위로 교재 만들기" }),
    ).toBeDisabled();
    expect(
      screen.getByText("표지 외에 구성을 하나 이상 켜 주세요."),
    ).toBeVisible();
  });

  it("ignores stale semester responses and prevents using the previous scope while loading", async () => {
    let resolveOld!: (value: QuickCreateCatalog) => void;
    const client = api({
      listUnits: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveOld = resolve;
            }),
        )
        .mockResolvedValueOnce({
          units: [{ ...catalog.units[2]!, id: ids[2]!, label: "2학기 단원" }],
        }),
    });
    render(<AutoCreatePanel api={client} onCreated={async () => {}} />);
    fireEvent.change(screen.getByRole("combobox", { name: "학기" }), {
      target: { value: "2" },
    });
    await screen.findAllByRole("option", { name: "2학기 단원" });
    await act(async () => {
      resolveOld(catalog);
    });
    expect(
      screen.queryByRole("option", { name: "유리수와 소수" }),
    ).not.toBeInTheDocument();
    expect(client.listUnits).toHaveBeenLastCalledWith({
      schoolLevel: "middle",
      grade: 2,
      semester: 2,
    });
  });

  it("retries an unchanged failed creation with the same request ID", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("연결이 끊겼습니다."))
      .mockResolvedValueOnce(result);
    render(
      <AutoCreatePanel api={api({ create })} onCreated={async () => {}} />,
    );
    await screen.findAllByRole("option", { name: "지수법칙" });
    fireEvent.click(
      screen.getByRole("button", { name: "이 범위로 교재 만들기" }),
    );
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "이 범위로 교재 만들기" }),
    );
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[0]![0].requestId).toBe(
      create.mock.calls[1]![0].requestId,
    );
    expect(create.mock.calls[1]![0].components).toEqual(
      DEFAULT_QUICK_CREATE_COMPONENTS,
    );
  });
});
