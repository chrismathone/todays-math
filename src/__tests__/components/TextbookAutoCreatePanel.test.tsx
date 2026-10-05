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
  RECOMMENDED_QUICK_CREATE_COMPONENTS,
  type QuickCreateCatalog,
  type QuickCreateInput,
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
type CatalogWithAvailability = {
  units: (QuickCreateCatalog["units"][number] & {
    availability?: Record<
      QuickCreateInput["difficulty"],
      { total: number; written: number }
    >;
  })[];
};
function availableCatalog(
  total: number,
  written: number,
): CatalogWithAvailability {
  return {
    units: [
      {
        ...catalog.units[0]!,
        // Raw bank counts and other difficulties must not inflate the summary.
        problemCount: 100,
        availability: {
          basic: { total: 40, written: 10 },
          standard: { total, written },
          challenge: { total: 0, written: 0 },
        },
      },
    ],
  };
}
function enableAllComponents() {
  fireEvent.click(screen.getByText("교재 구성 선택"));
  const controls = screen.getAllByRole("switch");
  expect(controls).toHaveLength(28);
  for (const control of controls)
    if (control.getAttribute("aria-checked") !== "true")
      fireEvent.click(control);
  return controls;
}

describe("simple textbook creation", () => {
  it("creates an inclusive range without title, curriculum code or page-budget entry", async () => {
    const client = api();
    const onCreated = vi.fn(async () => {});
    render(<AutoCreatePanel api={client} onCreated={onCreated} />);
    await screen.findAllByRole("option", { name: "지수법칙" });
    expect(
      screen.getByText(
        "선택한 난이도의 사용 가능한 문제 수는 만들 때 확인합니다.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/난이도 사용 가능/)).not.toBeInTheDocument();
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
    const firstStudentChoices = screen.getAllByRole("button", {
      name: /^첫 번째 학생 /,
    });
    const secondStudentChoices = screen.getAllByRole("button", {
      name: /^두 번째 학생 /,
    });
    expect(firstStudentChoices).toHaveLength(10);
    expect(secondStudentChoices).toHaveLength(10);
    fireEvent.click(firstStudentChoices[9]!);
    fireEvent.click(secondStudentChoices[8]!);
    fireEvent.click(
      screen.getByRole("button", { name: "이 범위로 교재 만들기" }),
    );
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.objectContaining({ dialogue: false, rest: true }),
        cast: expect.objectContaining({
          teacherId: "teacher-m5",
          student1Id: "student-m5",
          student2Id: "student-m4",
        }),
      }),
    );
  });

  it.each([0, 1])(
    "creates with all 28 components and an eight-question maximum when only %i written questions are available",
    async (written) => {
      const adjustedResult = {
        ...result,
        warnings: ["서술형 부족분을 다른 문제 구성에 배분했습니다."],
      };
      const client = api({
        listUnits: vi.fn(async () => availableCatalog(8, written)),
        create: vi.fn(async () => adjustedResult),
      });
      const onCreated = vi.fn(async () => {});
      render(<AutoCreatePanel api={client} onCreated={onCreated} />);
      await screen.findAllByRole("option", { name: "유리수와 소수" });
      const controls = enableAllComponents();
      const count = screen.getByRole("spinbutton", {
        name: "소단원당 최대 문제 수",
      });
      expect(count).toHaveValue(8);
      expect(
        screen.getByText(
          `표준 난이도 사용 가능 8문제 · 서술형 ${written}문제 포함`,
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          /서술형이 부족하면 부족한 수만큼 켜 둔 .*자동 배분합니다/,
        ),
      ).toBeVisible();
      expect(screen.getByText(/28가지 구성 · 최대 8문제/)).toBeVisible();
      fireEvent.click(screen.getByText("등장인물 선택"));
      fireEvent.click(screen.getAllByRole("button", { name: /^선생님 / })[9]!);
      const submit = screen.getByRole("button", {
        name: "이 범위로 교재 만들기",
      });
      expect(submit).toBeEnabled();
      fireEvent.click(submit);
      await waitFor(() =>
        expect(onCreated).toHaveBeenCalledWith(adjustedResult),
      );
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: "standard",
          problemCountPerUnit: 8,
          includeConcepts: true,
          components: Object.fromEntries(
            Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [
              key,
              true,
            ]),
          ),
          cast: expect.objectContaining({ teacherId: "teacher-m5" }),
          requestId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        }),
      );
      for (const control of controls)
        expect(control).toHaveAttribute("aria-checked", "true");
      expect(count).toHaveValue(8);
    },
  );

  it("keeps the requested maximum when the selected difficulty has fewer eligible questions", async () => {
    const client = api({
      listUnits: vi.fn(async () => availableCatalog(3, 1)),
      create: vi.fn(async () => ({ ...result, problemCount: 3 })),
    });
    render(<AutoCreatePanel api={client} onCreated={async () => {}} />);
    await screen.findAllByRole("option", { name: "유리수와 소수" });
    enableAllComponents();
    expect(
      screen.getByText("표준 난이도 사용 가능 3문제 · 서술형 1문제 포함"),
    ).toBeVisible();
    expect(screen.getByText(/문제가 부족한 1개 소단원/)).toBeVisible();
    const submit = screen.getByRole("button", {
      name: "이 범위로 교재 만들기",
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: "standard",
          problemCountPerUnit: 8,
        }),
      ),
    );
  });

  it("still creates concepts and selected content when there are zero eligible questions", async () => {
    const conceptResult = {
      ...result,
      problemCount: 0,
      warnings: ["사용 가능한 문제가 없어 문제 구성을 생략했습니다."],
    };
    const client = api({
      listUnits: vi.fn(async () => availableCatalog(0, 0)),
      create: vi.fn(async () => conceptResult),
    });
    const onCreated = vi.fn(async () => {});
    render(<AutoCreatePanel api={client} onCreated={onCreated} />);
    await screen.findAllByRole("option", { name: "유리수와 소수" });
    enableAllComponents();
    expect(
      screen.getByText(/사용 가능한 문제가 없어 문제 구성은 생략합니다/),
    ).toBeVisible();
    expect(
      screen.getByText(/켜 둔 개념과 다른 구성은 그대로 담습니다/),
    ).toBeVisible();
    const submit = screen.getByRole("button", {
      name: "이 범위로 교재 만들기",
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(conceptResult));
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: "standard",
        problemCountPerUnit: 8,
        includeConcepts: true,
        components: expect.objectContaining({
          dialogue: true,
          concepts: true,
          written: true,
        }),
      }),
    );
  });

  it("updates availability with difficulty and checks shortages per unit across the range", async () => {
    const first = availableCatalog(12, 4).units[0]!;
    const second = {
      ...availableCatalog(2, 0).units[0]!,
      id: ids[1]!,
      label: "순환소수",
    };
    const client = api({
      listUnits: vi.fn(async () => ({ units: [first, second] })),
    });
    render(<AutoCreatePanel api={client} onCreated={async () => {}} />);
    await screen.findAllByRole("option", { name: "순환소수" });
    fireEvent.change(screen.getByRole("combobox", { name: "끝 범위" }), {
      target: { value: ids[1] },
    });
    expect(
      screen.getByText("표준 난이도 사용 가능 14문제 · 서술형 4문제 포함"),
    ).toBeVisible();
    expect(screen.getByText(/문제가 부족한 1개 소단원/)).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "난이도" }), {
      target: { value: "basic" },
    });
    expect(
      screen.getByText("기초 난이도 사용 가능 80문제 · 서술형 20문제 포함"),
    ).toBeVisible();
    expect(
      screen.queryByText(/문제가 부족한 \d개 소단원/),
    ).not.toBeInTheDocument();
  });

  it.each([false, true])(
    "blocks zero-question creation without learning content, including written-only mode %s",
    async (writtenOnly) => {
      const client = api({
        listUnits: vi.fn(async () => availableCatalog(writtenOnly ? 12 : 0, 0)),
      });
      render(<AutoCreatePanel api={client} onCreated={async () => {}} />);
      await screen.findAllByRole("option", { name: "유리수와 소수" });
      fireEvent.click(screen.getByText("교재 구성 선택"));
      fireEvent.click(screen.getByRole("button", { name: "모두 끄기" }));
      fireEvent.click(
        screen.getByRole("switch", {
          name: writtenOnly ? /서술형/ : /유형·실전 문제/,
        }),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "사용 가능한 문제가 없습니다. 범위나 난이도를 바꾸거나 개념 구성을 켜 주세요.",
      );
      const submit = screen.getByRole("button", {
        name: "이 범위로 교재 만들기",
      });
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      expect(client.create).not.toHaveBeenCalled();
      expect(
        screen.queryByText(/다른 구성은 그대로 담습니다/),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("switch", { name: /개념 정리/ }));
      expect(submit).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByText(/켜 둔 개념과 다른 구성은 그대로 담습니다/),
      ).toBeVisible();
    },
  );

  it("does not promise redistribution to disabled problem stages", async () => {
    const client = api({
      listUnits: vi.fn(async () => availableCatalog(12, 0)),
    });
    render(<AutoCreatePanel api={client} onCreated={async () => {}} />);
    await screen.findAllByRole("option", { name: "유리수와 소수" });
    fireEvent.click(screen.getByText("교재 구성 선택"));
    fireEvent.click(screen.getByRole("switch", { name: /유형·실전 문제/ }));
    fireEvent.click(screen.getByRole("switch", { name: /대표예제와 풀이/ }));
    fireEvent.click(screen.getByRole("switch", { name: /서술형/ }));
    expect(screen.getByText(/준비된 서술형만 담고/)).toBeVisible();
    expect(
      screen.getByText(/사용 가능한 문제가 없어 문제 구성은 생략합니다/),
    ).toBeVisible();
    expect(screen.queryByText(/자동 배분합니다/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /복습 문제/ }));
    expect(
      screen.getByText(
        "서술형이 부족하면 부족한 수만큼 켜 둔 복습 문제에 자동 배분합니다.",
      ),
    ).toBeVisible();
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
      RECOMMENDED_QUICK_CREATE_COMPONENTS,
    );
  });
});
