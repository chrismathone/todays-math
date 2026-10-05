/**
 * 교재 제작 검수 보고서(2026-10-05) 후속 — 응답을 기다리는 사이의 입력 · 이동 · 선택 · 다시 시도.
 *
 * 재는 것은 «기다리는 사이» 다. 요청을 손에 쥐고, 그사이에 고치거나 옮기거나 다시 누른 뒤에 풀어 준다.
 * 응답이 바로 오는 시험으로는 이 경계가 보이지 않는다.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/textbook/quickCreateClient", () => ({
  httpQuickCreateApi: {
    listUnits: vi.fn(async () => ({ units: [] })),
    create: vi.fn(),
  },
}));

import type { TextbookStudioApi } from "@/lib/textbook/client";
import type { QuickCreateApi } from "@/lib/textbook/quickCreateClient";
import type {
  QuickCreateCatalog,
  QuickCreateResult,
} from "@/contracts/textbookQuickCreate.contract";
import type {
  BookSummary,
  EditionDetail,
  NamedChoice,
  SectionDetail,
} from "@/components/textbook/model";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import { TextbookStudioView } from "@/components/textbook/TextbookStudioView";

const book: BookSummary = {
  bookId: "book-1",
  title: "분수의 덧셈",
  shared: false,
  archived: false,
  activeEditionId: "edition-1",
};

function editionOf(status: "draft" | "published" = "draft"): EditionDetail {
  return {
    editionId: "edition-1",
    bookId: "book-1",
    title: "분수의 덧셈",
    structureRevision: 3,
    aggregateRevision: 9,
    config: {
      paper: "A4",
      workLineMm: 7,
      answerPolicy: "never",
      volumeCode: "2-1-1",
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
    },
    structureSource: {
      config: {
        title: "분수의 덧셈",
        displayCode: "2-1-1",
        videoPolicy: "optional",
        studentSolutionPolicy: "never",
        pageBudget: { target: 32, tolerance: 0, strict: false },
      },
      ...(status === "published"
        ? {
            edition: {
              editionId: "edition-1",
              label: "1",
              status: "published",
              revision: 9,
              publishedAt: "2026-10-04T00:00:00Z",
              manifestHash: null,
            },
          }
        : {}),
      outline: [
        {
          unitKey: "unit-1",
          title: "분수의 덧셈",
          sourceUnitIds: [],
          prerequisites: [],
          goals: [],
          conceptLectureRefs: [],
          sections: [
            {
              id: "section-1",
              sectionKey: "dialogue",
              title: "대화",
              revision: 1,
            },
            {
              id: "section-2",
              sectionKey: "practice",
              title: "연습",
              revision: 1,
            },
          ],
        },
      ],
    } as unknown as NonNullable<EditionDetail["structureSource"]>,
    units: [
      {
        unitKey: "unit-1",
        title: "분수의 덧셈",
        sections: [
          {
            sectionId: "section-1",
            title: "대화",
            status: "draft" as const,
            parity: "even-left" as const,
          },
          {
            sectionId: "section-2",
            title: "연습",
            status: "draft" as const,
            parity: "continue" as const,
          },
        ],
      },
    ],
  };
}

function section(overrides: Partial<SectionDetail> = {}): SectionDetail {
  return {
    sectionId: "section-1",
    editionId: "edition-1",
    unitKey: "unit-1",
    sectionKey: "dialogue",
    templateKey: "template.dialogue",
    title: "대화",
    revision: 3,
    aggregateRevision: 3,
    status: "draft",
    parity: "even-left",
    parityMessage: null,
    blocks: [
      {
        id: "block-1",
        kind: "dialogue",
        turns: [
          {
            id: "turn-1",
            speaker: "선생님",
            speakerId: "speaker.teacher",
            expression: "평온",
            side: "왼쪽",
            text: "저장된 문장",
            portraitAssetId: "portrait.teacher",
            mirror: false,
          },
        ],
      },
    ],
    answer: "11/12",
    portraits: [],
    picks: [],
    items: [],
    concept: null,
    ...overrides,
  };
}

function api(overrides: Partial<TextbookStudioApi> = {}): TextbookStudioApi {
  const unused = vi.fn(async () => {
    throw new Error("이 시험이 호출하지 않는 API입니다.");
  });
  return {
    listBooks: vi.fn(async () => [book]),
    createBook: unused,
    openEdition: vi.fn(async () => editionOf()),
    createEdition: unused,
    createSection: unused,
    readConcept: unused,
    getSection: vi.fn(async () => section()),
    saveSection: unused,
    patchEdition: unused,
    deleteSection: unused,
    captureItems: unused,
    diffItem: unused,
    recaptureItem: unused,
    saveConcept: unused,
    searchCatalog: unused,
    listAssignments: unused,
    createAssignment: unused,
    revokeAssignment: unused,
    listVideos: unused,
    listVideoChoices: unused,
    listUnitLectures: unused,
    recordObservation: unused,
    createVideo: unused,
    bindVideo: unused,
    updateVideo: unused,
    readItemDetail: unused,
    linkItem: unused,
    registerItem: unused,
    reissue: unused,
    listUnits: unused,
    listClasses: unused,
    listStudents: unused,
    listOwnedTests: unused,
    listUnitProblems: unused,
    readPreviewMaterial: unused,
    preflight: unused,
    reserve: unused,
    stepPublish: unused,
    finalize: unused,
    readJob: unused,
    readExport: unused,
    importPackage: unused,
    ...overrides,
  };
}

/** 응답을 손에 쥔다 — 시험이 풀어 줄 때까지 요청은 «기다리는 중» 이다 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function openStudio(
  client: TextbookStudioApi,
  quickApi?: QuickCreateApi,
) {
  const view = render(
    <TextbookStudioView api={client} {...(quickApi ? { quickApi } : {})} />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "열기" }));
  fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
  expect(await screen.findByRole("textbox", { name: "대사" })).toBeVisible();
  return view;
}

const line = () => screen.getByRole("textbox", { name: "대사" });
const edit = (value: string) => fireEvent.change(line(), { target: { value } });

/** 새로고침 · 탭 닫기를 흉내 낸다 — 화면이 막으면 true */
const closing = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("B01 — 구획 저장을 기다리는 사이의 입력", () => {
  it("저장 중에 더 고친 문장은 남고, 그 문장은 «저장 전» 으로 남아 다음 저장에 실린다", async () => {
    const first = deferred<{ revision: number; aggregateRevision: number }>();
    const saveSection = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ revision: 5, aggregateRevision: 11 });
    await openStudio(api({ saveSection }));
    edit("A 문장");
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    // 요청에 실린 것은 누른 때의 원고(A)다
    expect(saveSection.mock.calls[0]![0]).toMatchObject({
      expectedRevision: 3,
      section: { blocks: [{ turns: [{ text: "A 문장" }] }] },
    });
    // 저장은 가장 잦고 짧은 일이다 — 입력을 막지 않는다
    expect(line()).toBeEnabled();
    edit("B 문장");
    await act(async () => {
      first.resolve({ revision: 4, aggregateRevision: 10 });
    });

    // A 의 응답이 B 를 A 로 되돌리지 않는다
    expect(line()).toHaveValue("B 문장");
    // «저장됨» 으로 보이지 않는다 — 떠나려 하면 경고한다
    expect(closing()).toBe(true);
    expect(
      screen.getByText(
        "구획을 저장했습니다. 저장 중에 고친 내용은 아직 저장되지 않았습니다.",
      ),
    ).toBeVisible();

    // 다음 저장은 방금 받은 revision 위에 B 를 싣는다 — 409 로 튕기지 않는다
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    await waitFor(() => expect(saveSection).toHaveBeenCalledTimes(2));
    expect(saveSection.mock.calls[1]![0]).toMatchObject({
      expectedRevision: 4,
      section: { blocks: [{ turns: [{ text: "B 문장" }] }] },
    });
    await waitFor(() => expect(closing()).toBe(false));
    expect(line()).toHaveValue("B 문장");
  });

  it("저장 중에 고치지 않았으면 지금처럼 «저장됨» 이다", async () => {
    const first = deferred<{ revision: number; aggregateRevision: number }>();
    const saveSection = vi.fn(() => first.promise);
    await openStudio(
      api({
        saveSection: saveSection as unknown as TextbookStudioApi["saveSection"],
      }),
    );
    edit("A 문장");
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    await act(async () => {
      first.resolve({ revision: 4, aggregateRevision: 10 });
    });
    expect(line()).toHaveValue("A 문장");
    expect(closing()).toBe(false);
  });
});

describe("B02 — 문항 가져오기 · 개념 저장이 도는 사이", () => {
  const unitId = "00000000-0000-4000-8000-0000000000a1";
  const problemId = "00000000-0000-4000-8000-0000000000b1";
  const captured = () => {
    const fresh = section({ revision: 4 });
    fresh.blocks = [
      ...fresh.blocks,
      { id: "block-problem", kind: "problems", itemIds: ["item-9"] },
    ];
    fresh.items = [
      {
        itemId: "item-9",
        problemId: "problem-1",
        label: "1 · 연결됨",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared",
      },
    ];
    return fresh;
  };
  type Captured = Awaited<ReturnType<TextbookStudioApi["captureItems"]>>;

  async function startCapture(request: Promise<Captured>) {
    const fresh = captured();
    const captureItems = vi.fn(() => request);
    const getSection = vi
      .fn()
      .mockResolvedValueOnce(section())
      .mockResolvedValue(fresh);
    await openStudio(
      api({
        getSection,
        captureItems,
        listUnits: vi.fn(async () => [{ id: unitId, label: "초5 분수 통분" }]),
        listUnitProblems: vi.fn(async () => [
          { id: problemId, label: "E51402-K7M2" },
        ]),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "E51402-K7M2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    await waitFor(() => expect(captureItems).toHaveBeenCalledOnce());
    return { captureItems, getSection, fresh };
  }

  it("가져오기가 도는 동안에는 원고 입력을 잠그고, 거듭 눌러도 요청은 한 번이다", async () => {
    const request = deferred<Captured>();
    const { captureItems, fresh } = await startCapture(request.promise);
    // 늦은 응답이 덮을 «그사이의 수정» 이 생기지 않는다
    expect(line()).toBeDisabled();
    // 구획을 새로 만들어 화면을 옮기는 길도 같이 잠근다
    expect(screen.getByRole("button", { name: "구획 추가" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    expect(captureItems).toHaveBeenCalledOnce();

    await act(async () => {
      request.resolve({
        items: fresh.items,
        excluded: [],
        aggregateRevision: 10,
      } as Captured);
    });
    expect(await screen.findByText("문항 블록")).toBeVisible();
    await waitFor(() => expect(line()).toBeEnabled());
  });

  it("가져오기가 도는 동안에는 다른 구획으로 옮기지 않는다 — 응답이 다른 구획의 편집기에 떨어지지 않는다", async () => {
    const request = deferred<Captured>();
    const { getSection, fresh } = await startCapture(request.promise);
    const before = getSection.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    const other = screen.getByRole("button", { name: "연습" });
    expect(other).toBeDisabled();
    fireEvent.click(other);
    expect(getSection).toHaveBeenCalledTimes(before);

    await act(async () => {
      request.resolve({
        items: fresh.items,
        excluded: [],
        aggregateRevision: 10,
      } as Captured);
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "연습" })).toBeEnabled(),
    );
  });

  it("가져오기가 실패해도 잠금은 풀린다", async () => {
    const request = deferred<Captured>();
    await startCapture(request.promise);
    expect(line()).toBeDisabled();
    await act(async () => {
      request.reject(new Error("문항을 담지 못했습니다."));
    });
    expect(await screen.findByText("문항을 담지 못했습니다.")).toBeVisible();
    expect(line()).toBeEnabled();
  });

  it("개념 저장이 도는 동안에는 원고 입력을 잠그고, 거듭 눌러도 요청은 한 번이다", async () => {
    type SavedConcept = Awaited<ReturnType<TextbookStudioApi["saveConcept"]>>;
    const request = deferred<SavedConcept>();
    const saveConcept = vi.fn(() => request.promise);
    const saveSection = vi.fn(async () => ({
      revision: 4,
      aggregateRevision: 12,
    }));
    await openStudio(
      api({
        saveConcept: saveConcept as unknown as TextbookStudioApi["saveConcept"],
        saveSection: saveSection as unknown as TextbookStudioApi["saveSection"],
      }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "개념 키" }), {
      target: { value: "common-denominator" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "개념 제목" }), {
      target: { value: "통분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "개념 원고 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
    await waitFor(() => expect(saveConcept).toHaveBeenCalledOnce());

    expect(line()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
    expect(saveConcept).toHaveBeenCalledOnce();

    const concept: TextbookConcept = {
      conceptKey: "common-denominator",
      unitKey: "unit-1",
      sectionKey: "dialogue",
      title: "통분",
      kind: "정의",
      unitId: null,
      body: {
        goal: "",
        prerequisites: [],
        definition: "",
        conditions: null,
        examples: [],
        counterexamples: [],
        misconceptions: [],
        explainPrompt: null,
      },
      blankItems: [],
      links: [],
      mappingVersion: "1",
      derivedFromConceptKey: null,
      frozen: null,
    };
    await act(async () => {
      request.resolve({
        revision: 1,
        aggregateRevision: 11,
        concept,
      } as SavedConcept);
    });
    expect(await screen.findByText("개념을 저장했습니다.")).toBeVisible();
    expect(line()).toBeEnabled();
  });
});

describe("B03 — 간편 생성이 끝났을 때", () => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  ];
  const catalog: QuickCreateCatalog = {
    units: ["유리수와 소수", "순환소수", "지수법칙"].map((name, index) => ({
      id: ids[index]!,
      label: name,
      chapter: "수와 식",
      section: name,
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
      draftEditionId: "edition-new",
      latestPublishedEditionId: null,
    },
    problemCount: 8,
    conceptCount: 3,
    warnings: [],
  };

  async function startQuickCreate(
    client: TextbookStudioApi,
    request: Promise<QuickCreateResult>,
  ) {
    const quickApi: QuickCreateApi = {
      listUnits: vi.fn(async () => catalog),
      create: vi.fn(() => request),
    };
    render(<TextbookStudioView api={client} quickApi={quickApi} />);
    await screen.findAllByRole("option", { name: "지수법칙" });
    const submit = screen.getByRole("button", {
      name: "이 범위로 교재 만들기",
    });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(quickApi.create).toHaveBeenCalledOnce());
    return quickApi;
  }

  it("그사이 다른 교재를 열어 고치고 있으면 그 원고를 밀어내지 않고, 만든 사실만 알린다", async () => {
    const request = deferred<QuickCreateResult>();
    const openEdition = vi.fn(async () => editionOf());
    await startQuickCreate(api({ openEdition }), request.promise);
    // 생성이 도는 동안 아래 목록의 기존 교재를 연다
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    edit("고친 문장");

    await act(async () => {
      request.resolve(result);
    });
    // 새 교재를 열러 가지 않았다 — 고치던 원고가 그대로다
    expect(openEdition).toHaveBeenCalledOnce();
    expect(line()).toHaveValue("고친 문장");
    expect(
      screen.getByText(
        "중2 수와 식 교재를 만들었습니다. 목록에서 열 수 있습니다.",
      ),
    ).toBeVisible();
  });

  it("목록에서 기다렸으면 지금처럼 만든 교재를 바로 연다", async () => {
    const request = deferred<QuickCreateResult>();
    const openEdition = vi.fn(async () => editionOf());
    await startQuickCreate(api({ openEdition }), request.promise);
    await act(async () => {
      request.resolve(result);
    });
    await waitFor(() =>
      expect(openEdition).toHaveBeenCalledWith("edition-new"),
    );
    expect(
      await screen.findByText(/8문제와 3개 개념을 담았습니다\./),
    ).toBeVisible();
  });
});

describe("B04 — PDF · 발행이 도는 사이", () => {
  const job = { jobId: "job-1", issues: [], completedSteps: 0, totalSteps: 1 };
  type Job = Awaited<ReturnType<TextbookStudioApi["stepPublish"]>>;

  it("PDF 를 만드는 동안 세부 편집으로 들어가도 원고를 고칠 수 없다 — 발행 잠금에 갇힐 수정이 생기지 않는다", async () => {
    const step = deferred<Job>();
    const finalize = vi.fn(async () => ({
      ...job,
      status: "finalized" as const,
      completedSteps: 1,
    }));
    const client = api({
      preflight: vi.fn(async () => ({ ok: true, issues: [] })),
      reserve: vi.fn(async () => ({ ...job, status: "reserved" as const })),
      stepPublish: vi.fn(() => step.promise),
      finalize,
      openEdition: vi
        .fn()
        .mockResolvedValueOnce(editionOf())
        .mockResolvedValue(editionOf("published")),
    });
    render(<TextbookStudioView api={client} />);
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "PDF 만들기" }));
    await waitFor(() => expect(client.stepPublish).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    expect(await screen.findByRole("textbox", { name: "대사" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이 구획 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "글 추가" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "구획 추가" })).toBeDisabled();

    await act(async () => {
      step.resolve({
        ...job,
        status: "ready" as const,
        completedSteps: 1,
      } as Job);
    });
    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());
    // 발행이 끝나면 발행 잠금이 이어받는다 — 그사이 고친 것이 없으니 버릴 것도 없다
    await waitFor(() => expect(line()).toBeDisabled());
  });

  it("세부 화면에서 확정이 도는 동안 원고 탭으로 가도 원고를 고칠 수 없다", async () => {
    const request = deferred<Job>();
    const finalize = vi.fn(() => request.promise);
    await openStudio(
      api({
        reserve: vi.fn(async () => ({ ...job, status: "ready" as const })),
        finalize: finalize as unknown as TextbookStudioApi["finalize"],
        openEdition: vi
          .fn()
          .mockResolvedValueOnce(editionOf())
          .mockResolvedValue(editionOf("published")),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확정" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "확정" }));
    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "원고" }));
    expect(line()).toBeDisabled();

    await act(async () => {
      request.resolve({
        ...job,
        status: "finalized" as const,
        completedSteps: 1,
      } as Job);
    });
    await waitFor(() => expect(line()).toBeDisabled());
  });
});

describe("B06 — 단원 · 반을 바꾸는 사이의 선택", () => {
  const unitA = "00000000-0000-4000-8000-0000000000a1";
  const unitB = "00000000-0000-4000-8000-0000000000a2";

  it("단원을 바꾸면 앞 단원에서 고른 문제를 바로 거두고, 새 목록이 올 때까지 가져오지 않는다", async () => {
    const second = deferred<NamedChoice[]>();
    const captureItems = vi.fn();
    const listUnitProblems = vi
      .fn()
      .mockResolvedValueOnce([{ id: "problem-a", label: "문제 A" }])
      .mockImplementationOnce(() => second.promise);
    await openStudio(
      api({
        captureItems,
        listUnits: vi.fn(async () => [
          { id: unitA, label: "단원 A" },
          { id: unitB, label: "단원 B" },
        ]),
        listUnitProblems,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "문제 A" }));
    fireEvent.change(screen.getByRole("combobox", { name: "단원" }), {
      target: { value: unitB },
    });

    // 화면은 단원 B 인데 단원 A 의 선택이 남아 있지 않다
    expect(
      screen.queryByRole("checkbox", { name: "문제 A" }),
    ).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "문항 가져오기" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(captureItems).not.toHaveBeenCalled();
    // 불러오는 중을 «문제가 없다» 로 말하지 않는다
    expect(
      screen.queryByText("이 단원의 문제가 없습니다."),
    ).not.toBeInTheDocument();

    await act(async () => {
      second.resolve([]);
    });
    expect(await screen.findByText("이 단원의 문제가 없습니다.")).toBeVisible();
  });

  it("반을 바꾸면 앞 반의 시험지를 바로 거두고, 새 목록이 올 때까지 가져오지 않는다", async () => {
    const second = deferred<NamedChoice[]>();
    const captureItems = vi.fn();
    const listOwnedTests = vi
      .fn()
      .mockResolvedValueOnce([{ id: "test-a", label: "A반 시험지" }])
      .mockImplementationOnce(() => second.promise);
    await openStudio(
      api({
        captureItems,
        listClasses: vi.fn(async () => [
          { id: "class-a", label: "A반" },
          { id: "class-b", label: "B반" },
        ]),
        listStudents: vi.fn(async () => []),
        listOwnedTests,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "시험지에서 가져오기" }),
    );
    await screen.findByRole("option", { name: "A반 시험지" });
    fireEvent.change(screen.getByRole("combobox", { name: "반" }), {
      target: { value: "class-b" },
    });

    expect(
      screen.queryByRole("option", { name: "A반 시험지" }),
    ).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "문항 가져오기" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(captureItems).not.toHaveBeenCalled();

    await act(async () => {
      second.resolve([{ id: "test-b", label: "B반 시험지" }]);
    });
    await screen.findByRole("option", { name: "B반 시험지" });
    await waitFor(() => expect(submit).toBeEnabled());
  });
});

describe("B07 — 응답을 받지 못한 직접 생성의 다시 시도", () => {
  async function fillManual(title = "분수") {
    fireEvent.change(await screen.findByRole("textbox", { name: "제목" }), {
      target: { value: title },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "권 코드" }), {
      target: { value: "2-1-1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "교육과정" }), {
      target: { value: "2022" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "목표 쪽수" }), {
      target: { value: "32" },
    });
  }
  const create = () =>
    fireEvent.click(screen.getByRole("button", { name: "새 교재" }));

  it("같은 입력으로 다시 누르면 같은 요청 번호 · 같은 교재 번호로 보낸다 — 첫 요청이 서버에서 성공했어도 한 권이다", async () => {
    const createBook = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ...book, bookId: "book-2", title: "분수" });
    render(<TextbookStudioView api={api({ createBook })} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "직접 원고 만들기" }),
    );
    await fillManual();
    create();
    await waitFor(() => expect(createBook).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "새 교재" })).toBeEnabled(),
    );
    create();
    await waitFor(() => expect(createBook).toHaveBeenCalledTimes(2));

    const [first, second] = createBook.mock.calls.map((call) => call[0]);
    expect(first.requestId).toEqual(expect.any(String));
    expect(first.bookId).toEqual(expect.any(String));
    expect(second.requestId).toBe(first.requestId);
    expect(second.bookId).toBe(first.bookId);
  });

  it("입력을 바꿔 다시 누르면 새 요청이다", async () => {
    const createBook = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ...book, bookId: "book-2", title: "소수" });
    render(<TextbookStudioView api={api({ createBook })} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "직접 원고 만들기" }),
    );
    await fillManual();
    create();
    await waitFor(() => expect(createBook).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "새 교재" })).toBeEnabled(),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "소수" },
    });
    create();
    await waitFor(() => expect(createBook).toHaveBeenCalledTimes(2));

    const [first, second] = createBook.mock.calls.map((call) => call[0]);
    expect(second.requestId).not.toBe(first.requestId);
    expect(second.bookId).not.toBe(first.bookId);
  });

  it("성공한 뒤 같은 입력으로 또 만들면 새 요청이다 — 같은 이름의 둘째 권을 막지 않는다", async () => {
    const createBook = vi.fn(async () => ({
      ...book,
      bookId: "book-2",
      title: "분수",
    }));
    render(
      <TextbookStudioView
        api={api({
          createBook: createBook as unknown as TextbookStudioApi["createBook"],
        })}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "직접 원고 만들기" }),
    );
    await fillManual();
    create();
    await waitFor(() => expect(createBook).toHaveBeenCalledOnce());
    // 성공하면 양식이 비워진다 — 같은 값을 다시 채워 만든다
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(""),
    );
    await fillManual();
    create();
    await waitFor(() => expect(createBook).toHaveBeenCalledTimes(2));

    const calls = createBook.mock.calls as unknown as [
      { requestId: string; bookId: string },
    ][];
    expect(calls[1]![0].requestId).not.toBe(calls[0]![0].requestId);
    expect(calls[1]![0].bookId).not.toBe(calls[0]![0].bookId);
  });
});

describe("늦은 응답 — 그사이 다른 판본이 열렸을 때", () => {
  const E2 = "00000000-0000-4000-8000-0000000000e2";
  const editionTwo = (): EditionDetail => {
    const base = editionOf();
    return {
      ...base,
      editionId: E2,
      bookId: "book-2",
      title: "소수의 곱셈",
      structureSource: {
        ...base.structureSource,
        outline: [
          {
            unitKey: "unit-1",
            title: "소수의 곱셈",
            sourceUnitIds: [],
            prerequisites: [],
            goals: [],
            conceptLectureRefs: [],
            sections: [
              {
                id: "section-9",
                sectionKey: "dialogue",
                title: "다른 대화",
                revision: 1,
              },
            ],
          },
        ],
      } as unknown as NonNullable<EditionDetail["structureSource"]>,
      units: [
        {
          unitKey: "unit-1",
          title: "곱셈 단원",
          sections: [
            {
              sectionId: "section-9",
              title: "다른 대화",
              status: "draft" as const,
              parity: "even-left" as const,
            },
          ],
        },
      ],
    };
  };
  const otherSection = () => {
    const other = section({
      sectionId: "section-9",
      editionId: E2,
      title: "다른 대화",
    });
    const block = other.blocks[0]!;
    if (block.kind === "dialogue") block.turns[0]!.text = "다른 판본 문장";
    return other;
  };
  const openEdition = () =>
    vi.fn(async (id: string) => (id === E2 ? editionTwo() : editionOf()));

  /** 주소 동기화가 다른 판본을 열게 한다 — 화면 안의 이동 관문을 지나지 않는 길이다 */
  async function switchEdition(
    view: Awaited<ReturnType<typeof openStudio>>,
    client: TextbookStudioApi,
  ) {
    view.rerender(<TextbookStudioView api={client} initialEditionId={E2} />);
    expect(await screen.findByText("소수의 곱셈")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    await waitFor(() => expect(line()).toHaveValue("다른 판본 문장"));
  }

  it("저장 응답이 다른 판본의 원고를 덮지 않는다", async () => {
    const request = deferred<{ revision: number; aggregateRevision: number }>();
    const saveSection = vi.fn(() => request.promise);
    const client = api({
      openEdition: openEdition(),
      getSection: vi.fn(async (editionId: string) =>
        editionId === E2 ? otherSection() : section(),
      ),
      saveSection: saveSection as unknown as TextbookStudioApi["saveSection"],
    });
    const view = await openStudio(client);
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    await switchEdition(view, client);

    await act(async () => {
      request.resolve({ revision: 4, aggregateRevision: 10 });
    });
    expect(line()).toHaveValue("다른 판본 문장");
    expect(closing()).toBe(false);
  });

  it("가져오기 응답이 다른 판본의 편집기에 떨어지지 않는다", async () => {
    type Captured = Awaited<ReturnType<TextbookStudioApi["captureItems"]>>;
    const request = deferred<Captured>();
    const fresh = section({ revision: 4 });
    fresh.blocks = [
      ...fresh.blocks,
      { id: "block-problem", kind: "problems", itemIds: ["item-9"] },
    ];
    let firstEdition = 0;
    const captureItems = vi.fn(() => request.promise);
    const client = api({
      openEdition: openEdition(),
      getSection: vi.fn(async (editionId: string) =>
        editionId === E2
          ? otherSection()
          : firstEdition++ === 0
            ? section()
            : fresh,
      ),
      captureItems,
      listUnits: vi.fn(async () => [
        { id: "00000000-0000-4000-8000-0000000000a1", label: "초5 분수 통분" },
      ]),
      listUnitProblems: vi.fn(async () => [
        { id: "00000000-0000-4000-8000-0000000000b1", label: "E51402-K7M2" },
      ]),
    });
    const view = await openStudio(client);
    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "E51402-K7M2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    await waitFor(() => expect(captureItems).toHaveBeenCalledOnce());
    await switchEdition(view, client);

    await act(async () => {
      request.resolve({
        items: [],
        excluded: [],
        aggregateRevision: 10,
      } as Captured);
    });
    await waitFor(() => expect(line()).toBeEnabled());
    expect(line()).toHaveValue("다른 판본 문장");
    expect(screen.queryByText("문항 블록")).not.toBeInTheDocument();
  });
});

describe("B01 · B02 보완 — 저장 후 이동 · 가져오기가 남기는 것", () => {
  it("저장 후 이동이 도는 동안에는 원고 입력을 잠근다 — 떠나기로 한 뒤의 입력이 이동에 묻히지 않는다", async () => {
    const { requestTextbookNavigation } =
      await import("@/lib/textbook/navigation");
    const request = deferred<{ revision: number; aggregateRevision: number }>();
    const saveSection = vi.fn(() => request.promise);
    await openStudio(
      api({
        saveSection: saveSection as unknown as TextbookStudioApi["saveSection"],
      }),
    );
    edit("고친 문장");
    const proceed = vi.fn();
    act(() => {
      requestTextbookNavigation(proceed);
    });
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "저장하지 않은 수정" }),
      ).getByRole("button", { name: "저장 후 이동" }),
    );
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    expect(line()).toBeDisabled();
    expect(proceed).not.toHaveBeenCalled();

    await act(async () => {
      request.resolve({ revision: 4, aggregateRevision: 10 });
    });
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
  });

  it("가져온 뒤에도 편집 중이던 개념 원고가 남는다", async () => {
    type SavedConcept = Awaited<ReturnType<TextbookStudioApi["saveConcept"]>>;
    const conceptBlock = {
      id: "block-concept",
      kind: "concept" as const,
      conceptKey: "common-denominator",
    };
    const fresh = section({ revision: 5 });
    fresh.blocks = [
      ...fresh.blocks,
      conceptBlock,
      { id: "block-problem", kind: "problems", itemIds: ["item-9"] },
    ];
    const saveConcept = vi.fn(
      async (input: { conceptKey: string }) =>
        ({
          revision: 1,
          aggregateRevision: 11,
          concept: {
            conceptKey: input.conceptKey,
            unitKey: "unit-1",
            sectionKey: "dialogue",
            title: "통분",
            kind: "정의",
            unitId: null,
            body: {
              goal: "",
              prerequisites: [],
              definition: "",
              conditions: null,
              examples: [],
              counterexamples: [],
              misconceptions: [],
              explainPrompt: null,
            },
            blankItems: [],
            links: [],
            mappingVersion: "1",
            derivedFromConceptKey: null,
            frozen: null,
          },
        }) as SavedConcept,
    );
    await openStudio(
      api({
        saveConcept: saveConcept as unknown as TextbookStudioApi["saveConcept"],
        saveSection: vi.fn(async () => ({
          revision: 4,
          aggregateRevision: 12,
        })) as unknown as TextbookStudioApi["saveSection"],
        getSection: vi
          .fn()
          .mockResolvedValueOnce(section())
          .mockResolvedValue(fresh),
        captureItems: vi.fn(async () => ({
          items: [],
          excluded: [],
          aggregateRevision: 13,
        })) as unknown as TextbookStudioApi["captureItems"],
        listUnits: vi.fn(async () => [
          {
            id: "00000000-0000-4000-8000-0000000000a1",
            label: "초5 분수 통분",
          },
        ]),
        listUnitProblems: vi.fn(async () => [
          { id: "00000000-0000-4000-8000-0000000000b1", label: "E51402-K7M2" },
        ]),
      }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "개념 키" }), {
      target: { value: "common-denominator" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "개념 제목" }), {
      target: { value: "통분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "개념 원고 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
    expect(await screen.findByText("개념을 저장했습니다.")).toBeVisible();
    expect(screen.getByRole("group", { name: "개념 원고" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "E51402-K7M2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    expect(await screen.findByText("문항 블록")).toBeVisible();
    // 서버에서 다시 읽은 구획에는 개념 원고가 없다 — 그것으로 편집 중이던 개념을 지우지 않는다
    expect(screen.getByRole("group", { name: "개념 원고" })).toBeVisible();
    expect(closing()).toBe(false);
  });

  it("가져온 뒤 구획을 다시 읽지 못해도 이미 담겨 있던 문항 목록이 남는다", async () => {
    const item = (itemId: string, label: string) => ({
      itemId,
      problemId: `problem-${itemId}`,
      label,
      snapshotHash: null,
      currentHash: null,
      state: "uncompared" as const,
    });
    const initial = section({ items: [item("item-1", "기존 문항")] });
    initial.blocks = [
      ...initial.blocks,
      { id: "block-old", kind: "problems", itemIds: ["item-1"] },
    ];
    await openStudio(
      api({
        getSection: vi
          .fn()
          .mockResolvedValueOnce(initial)
          .mockRejectedValue(new Error("구획을 읽지 못했습니다.")),
        // 서버는 이번에 담은 문항만 돌려준다
        captureItems: vi.fn(async () => ({
          items: [item("item-2", "새 문항")],
          excluded: [],
          aggregateRevision: 10,
        })) as unknown as TextbookStudioApi["captureItems"],
        listUnits: vi.fn(async () => [
          {
            id: "00000000-0000-4000-8000-0000000000a1",
            label: "초5 분수 통분",
          },
        ]),
        listUnitProblems: vi.fn(async () => [
          { id: "00000000-0000-4000-8000-0000000000b1", label: "E51402-K7M2" },
        ]),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "E51402-K7M2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    expect(await screen.findByText(/새 문항/)).toBeVisible();
    expect(screen.getByText(/기존 문항/)).toBeVisible();
  });
});

describe("B02 인접 — 문항 하나의 작업이 늦게 끝났을 때", () => {
  it("다시 고정의 응답이 그사이 연 다른 구획의 문항 목록에 끼어들지 않는다", async () => {
    type Recaptured = Awaited<ReturnType<TextbookStudioApi["recaptureItem"]>>;
    const request = deferred<Recaptured>();
    const item = {
      itemId: "item-1",
      problemId: "problem-1",
      label: "기존 문항",
      snapshotHash: null,
      currentHash: null,
      state: "uncompared" as const,
    };
    const first = section({ items: [item] });
    first.blocks = [
      ...first.blocks,
      { id: "block-old", kind: "problems", itemIds: ["item-1"] },
    ];
    const second = section({
      sectionId: "section-2",
      sectionKey: "practice",
      title: "연습",
      parity: "continue",
    });
    const recaptureItem = vi.fn(() => request.promise);
    await openStudio(
      api({
        getSection: vi.fn(async (_edition: string, sectionId: string) =>
          sectionId === "section-2" ? second : first,
        ),
        recaptureItem:
          recaptureItem as unknown as TextbookStudioApi["recaptureItem"],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 고정" }));
    await waitFor(() => expect(recaptureItem).toHaveBeenCalledOnce());
    // 이 작업은 이동을 막지 않는다 — 그사이 다른 구획을 연다
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "연습" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await waitFor(() =>
      expect(screen.queryByText(/기존 문항/)).not.toBeInTheDocument(),
    );

    await act(async () => {
      request.resolve({
        item: { ...item, label: "다시 고정한 문항" },
        aggregateRevision: 12,
      } as Recaptured);
    });
    expect(screen.queryByText(/다시 고정한 문항/)).not.toBeInTheDocument();
    expect(closing()).toBe(false);
  });
});

describe("B03 보완 — 생성 양식이 화면에서 사라진 뒤", () => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ];
  const catalog: QuickCreateCatalog = {
    units: ["유리수와 소수", "순환소수"].map((name, index) => ({
      id: ids[index]!,
      label: name,
      chapter: "수와 식",
      section: name,
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
      draftEditionId: "edition-new",
      latestPublishedEditionId: null,
    },
    problemCount: 8,
    conceptCount: 3,
    warnings: [],
  };

  async function start(
    client: TextbookStudioApi,
    request: Promise<QuickCreateResult>,
  ) {
    const quickApi: QuickCreateApi = {
      listUnits: vi.fn(async () => catalog),
      create: vi.fn(() => request),
    };
    render(<TextbookStudioView api={client} quickApi={quickApi} />);
    await screen.findAllByRole("option", { name: "순환소수" });
    const submit = screen.getByRole("button", {
      name: "이 범위로 교재 만들기",
    });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(quickApi.create).toHaveBeenCalledOnce());
  }

  it("다른 교재를 연 뒤 생성이 실패하면 지금 화면에 알린다 — 사라진 양식에만 적어 두지 않는다", async () => {
    const request = deferred<QuickCreateResult>();
    await start(api(), request.promise);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });

    await act(async () => {
      request.reject(new Error("문제를 담지 못했습니다."));
    });
    expect(
      await screen.findByText(
        "교재를 만들지 못했습니다. 문제를 담지 못했습니다.",
      ),
    ).toBeVisible();
  });

  it("다른 교재를 열었다가 목록으로 돌아와 있어도 새 교재로 끌고 가지 않는다 — 목록에 올리고 알린다", async () => {
    const request = deferred<QuickCreateResult>();
    const openEdition = vi.fn(async () => editionOf());
    await start(api({ openEdition }), request.promise);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    await screen.findByRole("button", { name: "세부 편집" });
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    await screen.findByRole("button", { name: "이 범위로 교재 만들기" });

    await act(async () => {
      request.resolve(result);
    });
    expect(openEdition).toHaveBeenCalledOnce();
    expect(
      await screen.findByText(
        "중2 수와 식 교재를 만들었습니다. 목록에서 열 수 있습니다.",
      ),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: "열기" })).toHaveLength(2);
  });
});

describe("B04 보완 — 발행 결과를 확인하지 못한 동안", () => {
  const job = { jobId: "job-1", issues: [], completedSteps: 1, totalSteps: 1 };

  it("결과를 모르는 동안에는 원고와 확정을 잠그고, 판본을 다시 읽어 초안이면 푼다", async () => {
    const openEdition = vi
      .fn()
      .mockResolvedValueOnce(editionOf())
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(editionOf());
    const finalize = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await openStudio(
      api({
        openEdition,
        reserve: vi.fn(async () => ({ ...job, status: "ready" as const })),
        finalize,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확정" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "확정" }));
    const unknown = await screen.findByRole("alert");
    expect(unknown).toHaveTextContent(
      "발행 결과를 확인하지 못했습니다. 판본 상태를 다시 불러와 확인해 주세요.",
    );

    // 서버에서는 발행됐을 수 있다 — 그렇다면 지금 고친 것은 저장할 길이 없고, 다시 확정을 보내서도 안 된다
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확정" })).toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "원고" }));
    expect(line()).toBeDisabled();

    fireEvent.click(
      within(unknown).getByRole("button", { name: "판본 다시 불러오기" }),
    );
    await waitFor(() => expect(openEdition).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(line()).toBeEnabled());
    expect(finalize).toHaveBeenCalledOnce();
  });
});

describe("B06 보완 — 목록을 읽지 못했을 때", () => {
  it("읽기 실패를 «문제가 없다» 로 말하지 않고, 가져오기도 열지 않는다", async () => {
    const captureItems = vi.fn();
    await openStudio(
      api({
        captureItems,
        listUnits: vi.fn(async () => [
          { id: "00000000-0000-4000-8000-0000000000a1", label: "단원 A" },
        ]),
        listUnitProblems: vi.fn(async () => {
          throw new Error("문제 목록을 읽지 못했습니다.");
        }),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    expect(
      await screen.findByText("문제 목록을 읽지 못했습니다."),
    ).toBeVisible();
    expect(
      screen.queryByText("이 단원의 문제가 없습니다."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "문항 가져오기" }),
    ).toBeDisabled();
  });
});

describe("B07 보완 — 생성을 기다리는 사이 양식에 적은 것", () => {
  it("성공 응답은 보낸 값과 같은 칸만 비운다 — 그사이 새로 적은 제목을 지우지 않는다", async () => {
    const request = deferred<BookSummary>();
    const createBook = vi.fn(() => request.promise);
    render(
      <TextbookStudioView
        api={api({
          createBook: createBook as unknown as TextbookStudioApi["createBook"],
        })}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "직접 원고 만들기" }),
    );
    fireEvent.change(await screen.findByRole("textbox", { name: "제목" }), {
      target: { value: "분수" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "권 코드" }), {
      target: { value: "2-1-1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "교육과정" }), {
      target: { value: "2022" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "목표 쪽수" }), {
      target: { value: "32" },
    });
    fireEvent.click(screen.getByRole("button", { name: "새 교재" }));
    await waitFor(() => expect(createBook).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "다음 권 제목" },
    });

    await act(async () => {
      request.resolve({ ...book, bookId: "book-2", title: "분수" });
    });
    expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
      "다음 권 제목",
    );
    expect(screen.getByRole("textbox", { name: "권 코드" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "목표 쪽수" })).toHaveValue("");
  });
});

describe("U03 — 직접 원고 만들기 양식의 빈 목록 문구", () => {
  it("만든 교재가 있으면 양식에 «만든 교재가 없습니다.» 를 내지 않는다", async () => {
    render(<TextbookStudioView api={api()} />);
    expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "직접 원고 만들기" }));
    expect(await screen.findByRole("textbox", { name: "제목" })).toBeVisible();
    expect(screen.queryByText("만든 교재가 없습니다.")).not.toBeInTheDocument();
  });

  it("만든 교재가 하나도 없으면 그대로 알린다", async () => {
    render(
      <TextbookStudioView api={api({ listBooks: vi.fn(async () => []) })} />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "직접 원고 만들기" }),
    );
    expect(await screen.findByText("만든 교재가 없습니다.")).toBeVisible();
  });
});
