import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("@/lib/textbook/quickCreateClient", () => ({
  httpQuickCreateApi: {
    listUnits: vi.fn(async () => ({ units: [] })),
    create: vi.fn(),
  },
}));

import type { TextbookStudioApi } from "@/lib/textbook/client";
import { TextbookRequestError } from "@/lib/textbook/client";
import type {
  BookSummary,
  ConceptDraft,
  EditionDetail,
  SectionDetail,
  VideoBinding,
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

const edition: EditionDetail = {
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
          status: "draft",
          parity: "even-left",
        },
        {
          sectionId: "section-2",
          title: "연습",
          status: "draft",
          parity: "continue",
        },
      ],
    },
  ],
};

function section(answer = "11/12"): SectionDetail {
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
    parityMessage:
      "유형 연습이 홀수 쪽에서 시작합니다. 이전 구획을 조정하세요.",
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
    answer,
    portraits: [],
    picks: [],
    items: [],
    concept: null,
  };
}

function api(overrides: Partial<TextbookStudioApi> = {}): TextbookStudioApi {
  const unused = vi.fn(async () => {
    throw new Error("이 시험이 호출하지 않는 API입니다.");
  });
  return {
    listBooks: vi.fn(async () => [book]),
    createBook: unused,
    openEdition: vi.fn(async () => edition),
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

async function openStudio(
  client: TextbookStudioApi,
  audience: "teacher" | "student" = "teacher",
) {
  render(<TextbookStudioView api={client} audience={audience} />);
  fireEvent.click(await screen.findByRole("button", { name: "열기" }));
  fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
  expect(await screen.findByRole("textbox", { name: "대사" })).toBeVisible();
}

function wireConcept(
  overrides: Partial<TextbookConcept> = {},
): TextbookConcept {
  return {
    conceptKey: "prime-definition",
    unitKey: "unit-1",
    sectionKey: "dialogue",
    title: "소수",
    kind: "정의",
    unitId: null,
    body: {
      goal: "",
      prerequisites: [],
      definition: "1과 자신만으로 나누어진다",
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
    ...overrides,
  };
}

/** 발행한 판본 — 서버가 돌려주는 판본 상태가 published 다 */
function publishedEdition(): EditionDetail {
  const published = structuredClone(edition);
  if (published.structureSource)
    published.structureSource.edition = {
      editionId: "edition-1",
      label: "1",
      status: "published",
      revision: 9,
      publishedAt: "2026-10-04T00:00:00Z",
      manifestHash: null,
    };
  return published;
}

/** 문항 하나의 확정본이 든 미리보기 자료 — 영상 연결이 이 내용을 보여 준다 */
function videoMaterial(
  contentHash = "a".repeat(64),
  content = "두 분수를 더하시오.",
) {
  return {
    items: [{ itemId: "item-1", snapshotId: "snap-1", displayNumber: "1" }],
    snapshots: [
      {
        snapshotId: "snap-1",
        contentHash,
        payload: { content, answer: "11/12" },
      },
    ],
    assets: [],
    concepts: [],
    qrTargets: [],
    conceptQrTargets: [],
  } as unknown as Awaited<ReturnType<TextbookStudioApi["readPreviewMaterial"]>>;
}

describe("TextbookStudioView", () => {
  it("keeps the chosen character visible while editing an automatic dialogue", async () => {
    const draft = section();
    const dialogue = draft.blocks[0];
    if (dialogue?.kind !== "dialogue") throw new Error("fixture");
    dialogue.turns[0]!.speakerId = "tb-portrait-student-f3";
    await openStudio(api({ getSection: vi.fn(async () => draft) }));
    expect(screen.getByRole("combobox", { name: "화자" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "유나" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "대사" }), {
      target: { value: "수정한 설명" },
    });
    expect(screen.getByRole("option", { name: "유나" })).toBeInTheDocument();
  });
  it("opens a finished preview and creates PDF with one click using one reservation", async () => {
    const job = {
      jobId: "pdf-reservation",
      issues: [],
      completedSteps: 0,
      totalSteps: 1,
    };
    const published = structuredClone(edition);
    if (published.structureSource)
      published.structureSource.edition = {
        editionId: "edition-1",
        label: "1",
        status: "published",
        revision: 9,
        publishedAt: "2026-10-04T00:00:00Z",
        manifestHash: null,
      };
    const client = api({
      preflight: vi.fn(async () => ({ ok: true, issues: [] })),
      reserve: vi.fn(async () => ({ ...job, status: "reserved" as const })),
      stepPublish: vi.fn(async () => ({
        ...job,
        status: "ready" as const,
        completedSteps: 1,
      })),
      finalize: vi.fn(async () => ({
        ...job,
        status: "finalized" as const,
        completedSteps: 1,
      })),
      openEdition: vi
        .fn()
        .mockResolvedValueOnce(edition)
        .mockResolvedValueOnce(published),
    });
    render(<TextbookStudioView api={client} />);
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "PDF 만들기" }));
    expect(
      await screen.findByRole("link", { name: "학생용 PDF 내려받기" }),
    ).toHaveAttribute(
      "href",
      "/api/textbook/editions/edition-1/pdf?kind=student",
    );
    expect(client.stepPublish).toHaveBeenCalledWith(
      "edition-1",
      "pdf-reservation",
    );
    expect(client.finalize).toHaveBeenCalledWith(
      "edition-1",
      "pdf-reservation",
    );
    expect(
      screen.queryByRole("textbox", { name: "대사" }),
    ).not.toBeInTheDocument();
  });

  it("shows preflight issues without reserving a PDF job", async () => {
    const client = api({
      preflight: vi.fn(async () => ({ ok: false, issues: [] })),
      reserve: vi.fn(),
    });
    render(<TextbookStudioView api={client} />);
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "PDF 만들기" }));
    await waitFor(() =>
      expect(
        screen.getByText("PDF를 만들기 전에 아래 항목을 확인해 주세요."),
      ).toBeVisible(),
    );
    expect(client.reserve).not.toHaveBeenCalled();
  });
  it("keeps the local sentence when the server reports a revision conflict", async () => {
    const client = api({
      saveSection: vi.fn(async () => {
        throw new TextbookRequestError("다른 저장", 409, {
          serverRevision: 4,
          serverSection: {
            ...section(),
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
                    text: "서버 문장",
                    portraitAssetId: "portrait.teacher",
                    mirror: false,
                  },
                ],
              },
            ],
          },
        });
      }),
    });
    await openStudio(client);
    fireEvent.change(screen.getByRole("textbox", { name: "대사" }), {
      target: { value: "내가 고친 문장" },
    });
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "수정은 그대로 두었습니다.",
    );
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "내가 고친 문장",
    );
    expect(screen.queryByText("저장됨")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "서버 내용 보기" }));
    expect(screen.getByText("서버 문장")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "내가 고친 문장",
    );
  });

  it("rejects a blank pick that returns to an earlier group", async () => {
    await openStudio(api());
    async function add(form: string, sectionKey: string, entryId: string) {
      fireEvent.change(screen.getByRole("textbox", { name: "소단원" }), {
        target: { value: sectionKey },
      });
      fireEvent.change(screen.getByRole("textbox", { name: "항목 ID" }), {
        target: { value: entryId },
      });
      fireEvent.change(screen.getByRole("combobox", { name: "형식" }), {
        target: { value: form },
      });
      fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
    }
    await add("recall", "초5::약분::통분", "e5-1");
    await add("term", "초5::약분::통분", "e5-1");
    await add("recall", "초5::약분::통분", "e5-3");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "같은 형식과 소단원이 떨어져 다시 나옵니다.",
    );
    expect(screen.getByRole("button", { name: "이 구획 저장" })).toBeDisabled();
  });

  it("shows a failed preflight and does not enable finalize", async () => {
    const client = api({
      preflight: vi.fn(async () => ({
        ok: false as const,
        issues: [
          { severity: "error" as const, message: "필수 영상이 없습니다." },
        ],
      })),
    });
    await openStudio(client);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "발행 전 확인" }));
    expect(
      await screen.findByText("발행 전 확인에서 막혔습니다."),
    ).toBeVisible();
    expect(screen.getByText("필수 영상이 없습니다.")).toBeVisible();
    expect(screen.getByRole("button", { name: "확정" })).toBeDisabled();
    expect(screen.queryByText("발행됨")).not.toBeInTheDocument();
  });

  it("does not show the answer on the student page or to a student audience", async () => {
    await openStudio(api());
    const paper = screen.getByRole("region", { name: "지면" });
    expect(screen.getByRole("textbox", { name: "구획 정답 메모" })).toHaveValue(
      "11/12",
    );
    expect(paper).not.toHaveTextContent("11/12");

    fireEvent.click(screen.getByRole("button", { name: "학생용" }));
    expect(
      screen.queryByRole("textbox", { name: "구획 정답 메모" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("11/12")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "교사용" }));
    const teacherPaper = screen.getByRole("region", { name: "지면" });
    expect(teacherPaper).not.toHaveTextContent("11/12");
    expect(teacherPaper).toHaveTextContent(
      "판본 원본이 없어 측정하지 않습니다.",
    );
    expect(
      screen.queryByRole("textbox", { name: "구획 정답 메모" }),
    ).not.toBeInTheDocument();
  });

  it("gives a student audience no answer and no teacher preview switch", async () => {
    await openStudio(api(), "student");
    expect(screen.queryByText("11/12")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "교사용" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "구획 정답 메모" }),
    ).not.toBeInTheDocument();
  });

  it("saves a concept body, blank forms, and a confirmation request", async () => {
    const saveConcept = vi.fn(async (input) => {
      expect(input.expectedRevision).toBe(0);
      expect(input.source).toBeNull();
      expect(input.concept.kind).toBe("정의");
      expect(input.concept.blankForms).toEqual(["term", "cloze"]);
      expect(input.concept.definition).toBe("분모를 같게 한다");
      expect(input.confirmEntryIds).toEqual(["e5-1"]);
      return {
        revision: 1,
        aggregateRevision: 11,
        concept: {
          title: input.concept.title,
          kind: input.concept.kind,
          blankForms: [...input.concept.blankForms],
          blankItems: [
            {
              entryKind: "concept",
              entryId: "e5-1",
              review: { status: "confirmed" },
            },
          ],
        },
      } as Awaited<ReturnType<TextbookStudioApi["saveConcept"]>>;
    });
    // 개념만 저장하고 끝나지 않는다 — 이 구획에 개념 블록을 이어 저장한다
    const saveSection = vi.fn(async () => ({
      revision: 4,
      aggregateRevision: 12,
    }));
    await openStudio(api({ saveConcept, saveSection }));
    fireEvent.change(screen.getByRole("textbox", { name: "개념 키" }), {
      target: { value: "common-denominator" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "개념 제목" }), {
      target: { value: "통분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "개념 원고 만들기" }));
    fireEvent.change(screen.getByRole("textbox", { name: "정의" }), {
      target: { value: "분모를 같게 한다" },
    });
    expect(screen.getByRole("button", { name: "질문" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "빈칸" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "소단원" }), {
      target: { value: "초5::약분::통분" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "항목 ID" }), {
      target: { value: "e5-1" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "형식" }), {
      target: { value: "term" },
    });
    fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "e5-1 확인 요청" }));
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
    expect(await screen.findByText("개념을 저장했습니다.")).toBeVisible();
    expect(saveConcept).toHaveBeenCalledOnce();
    expect(saveConcept).toHaveBeenCalledWith(
      expect.objectContaining({ links: [], confirmLinkIds: [] }),
    );
    expect(screen.getByText(/e5-1 · 확인/)).toBeVisible();
    expect(saveSection).toHaveBeenCalledOnce();
    expect(saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: "section-1",
        expectedRevision: 3,
        section: expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({
              kind: "concept",
              conceptKey: "common-denominator",
            }),
          ]),
        }),
      }),
    );
  });

  it("reorders the outline with the structure revision and restores it after 409", async () => {
    const patchEdition = vi.fn(
      async (input: {
        expectedRevision: number;
        source: NonNullable<EditionDetail["structureSource"]>;
      }) => {
        expect(input.expectedRevision).toBe(3);
        return {
          ...edition,
          structureSource: input.source,
          units: input.source.outline.map((unit) => ({
            unitKey: unit.unitKey,
            title: unit.title,
            sections: unit.sections.map((row) => ({
              sectionId: row.id,
              title: row.title,
              status: "saved" as const,
              parity: "continue" as const,
            })),
          })),
        };
      },
    );
    await openStudio(api({ patchEdition }));
    fireEvent.click(screen.getByRole("button", { name: "대화 아래로" }));
    expect(await screen.findByText("목차를 저장했습니다.")).toBeVisible();
    expect(
      patchEdition.mock.calls[0]?.[0].source.outline[0]?.sections.map(
        (row) => row.id,
      ),
    ).toEqual(["section-2", "section-1"]);
    const practice = screen.getByRole("button", { name: "연습 아래로" });
    const dialogue = screen.getByRole("button", { name: "대화 아래로" });
    expect(
      practice.compareDocumentPosition(dialogue) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("restores the outline when the structure save conflicts", async () => {
    await openStudio(
      api({
        patchEdition: vi.fn(async () => {
          throw new TextbookRequestError("다른 저장", 409);
        }),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "대화 아래로" }));
    expect(await screen.findByText("다른 저장")).toBeVisible();
    const dialogue = screen.getByRole("button", { name: "대화 아래로" });
    const practice = screen.getByRole("button", { name: "연습 아래로" });
    expect(
      dialogue.compareDocumentPosition(practice) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("captures with the aggregate revision and keeps an unsaved sentence", async () => {
    const fresh = section();
    fresh.revision = 4;
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
    const getSection = vi
      .fn()
      .mockResolvedValueOnce(section())
      .mockResolvedValueOnce(fresh);
    const captureItems = vi.fn(async () => ({
      items: fresh.items,
      excluded: [],
      aggregateRevision: 10,
    }));
    const unitId = "00000000-0000-4000-8000-0000000000a1";
    const problemId = "00000000-0000-4000-8000-0000000000b1";
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
    fireEvent.change(screen.getByRole("textbox", { name: "대사" }), {
      target: { value: "고친 문장" },
    });
    fireEvent.click(screen.getByRole("button", { name: "문제에서 가져오기" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "E51402-K7M2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    expect(await screen.findByText("문항 블록")).toBeVisible();
    expect(captureItems).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 9,
        testId: null,
        problemIds: [problemId],
      }),
    );
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "고친 문장",
    );
  });

  it("saves an explicit student solution policy with the structure revision", async () => {
    const patchEdition = vi.fn(async () => edition);
    await openStudio(api({ patchEdition }));
    fireEvent.change(
      within(screen.getByRole("form", { name: "교재 설정" })).getByRole(
        "combobox",
        { name: "학생 글 해설" },
      ),
      { target: { value: "assigned" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    expect(await screen.findByText("설정을 저장했습니다.")).toBeVisible();
    expect(patchEdition).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 3,
        source: expect.objectContaining({
          config: expect.objectContaining({
            studentSolutionPolicy: "assigned",
          }),
        }),
      }),
    );
  });

  it("shows a video publish failure and does not mark the row published", async () => {
    const row: VideoBinding = {
      bindingId: "bind-1",
      videoId: "video-1",
      snapshotId: "snap-1",
      role: "problem-solution",
      status: "draft",
      policy: "optional",
      label: "예제 영상",
      startSeconds: 0,
      endSeconds: null,
      contentHash: null,
    };
    const updateVideo = vi.fn(async () => {
      throw new TextbookRequestError("영상을 찾지 못했습니다.", 404);
    });
    await openStudio(
      api({
        listVideos: vi.fn(async () => [row]),
        listVideoChoices: vi.fn(async () => []),
        readPreviewMaterial: vi.fn(async () => videoMaterial()),
        updateVideo,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "영상" }));
    expect(await screen.findByText(/예제 영상 · 초안/)).toBeVisible();
    // 내용을 보기 전에는 게시를 보낼 수 없다
    expect(screen.getByRole("button", { name: "게시" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "내용 확인" }));
    fireEvent.click(screen.getByRole("button", { name: "게시" }));
    expect(await screen.findByText("영상을 찾지 못했습니다.")).toBeVisible();
    expect(screen.getByText(/예제 영상 · 초안/)).toBeVisible();
    expect(screen.queryByText(/예제 영상 · 게시$/)).not.toBeInTheDocument();
    expect(updateVideo).toHaveBeenCalledOnce();
    expect(updateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ contentHash: "a".repeat(64) }),
    );
  });

  it("links the chosen bank problem and does not mark a refused register as linked", async () => {
    const linked = section();
    const problemId = "00000000-0000-4000-8000-0000000000c1";
    linked.items = [
      {
        itemId: "item-1",
        problemId: "",
        label: "1 · 후보",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared",
      },
    ];
    const readItemDetail = vi.fn(async () => ({
      candidates: [{ problemId, problemCode: "E56-1" }],
    }));
    const linkItem = vi.fn(async () => ({
      aggregateRevision: 10,
      item: {
        itemId: "item-1",
        problemId,
        label: "1 · 연결됨",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared" as const,
      },
    }));
    await openStudio(
      api({
        getSection: vi.fn(async () => linked),
        readItemDetail,
        linkItem,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    expect(await screen.findByRole("option", { name: "E56-1" })).toBeVisible();
    expect(readItemDetail).toHaveBeenCalledWith("edition-1", "item-1");
    expect(linkItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "선택한 문항 연결" }));
    expect(await screen.findByText(/1 · 연결됨/)).toBeVisible();
    expect(linkItem).toHaveBeenCalledWith(
      "edition-1",
      "item-1",
      expect.any(String),
      9,
      problemId,
    );
    expect(screen.getByText(/1 · 연결됨/)).toBeVisible();
  });

  it("registers a pending bank item and leaves the placement unlinked", async () => {
    const placed = section();
    const unitId = "00000000-0000-4000-8000-0000000000d1";
    const problemId = "00000000-0000-4000-8000-0000000000c1";
    placed.items = [
      {
        itemId: "item-1",
        problemId: "",
        label: "1 · 연결 없음",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared",
      },
    ];
    const linkItem = vi.fn();
    const registerItem = vi.fn(async () => ({
      aggregateRevision: 10,
      item: {
        itemId: "item-1",
        problemId: "",
        label: "1 · 연결 없음",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared" as const,
      },
      problem: {
        problemId,
        problemCode: "E51402-K7M2",
        reviewStatus: "pending" as const,
      },
      candidates: [{ problemId, problemCode: "E51402-K7M2" }],
    }));
    await openStudio(
      api({
        getSection: vi.fn(async () => placed),
        linkItem,
        registerItem,
        listUnits: vi.fn(async () => [{ id: unitId, label: "초5 분수 통분" }]),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "등록" }));
    expect(
      await screen.findByRole("option", { name: "초5 분수 통분" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "검수 대기로 등록" }));
    expect(await screen.findByText(/검수 대기 문항 E51402-K7M2/)).toBeVisible();
    expect(screen.getByText(/1 · 연결 없음/)).toBeVisible();
    expect(registerItem).toHaveBeenCalledWith(
      "edition-1",
      "item-1",
      expect.any(String),
      9,
      { unitId, difficulty: "기본", problemType: "계산" },
    );
    expect(linkItem).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("option", { name: "E51402-K7M2" }),
    ).toBeVisible();
  });

  it("shows the figure refusal and does not mark the placement linked", async () => {
    const placed = section();
    placed.items = [
      {
        itemId: "item-1",
        problemId: "",
        label: "1 · 연결 없음",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared",
      },
    ];
    const registerItem = vi.fn(async () => {
      throw new TextbookRequestError(
        "그림이 있는 문항은 여기서 등록하지 않습니다. 문제은행의 등록 화면에서 그림과 함께 등록해 주세요.",
        422,
      );
    });
    await openStudio(
      api({
        getSection: vi.fn(async () => placed),
        registerItem,
        listUnits: vi.fn(async () => [
          {
            id: "00000000-0000-4000-8000-0000000000d1",
            label: "초5 분수 통분",
          },
        ]),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "등록" }));
    expect(
      await screen.findByRole("option", { name: "초5 분수 통분" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "검수 대기로 등록" }));
    expect(
      await screen.findByText(/그림이 있는 문항은 여기서 등록하지 않습니다/),
    ).toBeVisible();
    expect(screen.getByText(/1 · 연결 없음/)).toBeVisible();
    expect(screen.queryByText(/연결됨/)).not.toBeInTheDocument();
  });

  it("does not post a link when the item has no bank candidates", async () => {
    const linked = section();
    linked.items = [
      {
        itemId: "item-1",
        problemId: "",
        label: "1 · 후보",
        snapshotHash: null,
        currentHash: null,
        state: "uncompared",
      },
    ];
    const readItemDetail = vi.fn(async () => ({ candidates: [] }));
    const linkItem = vi.fn();
    await openStudio(
      api({
        getSection: vi.fn(async () => linked),
        readItemDetail,
        linkItem,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    expect(
      await screen.findByText("연결할 은행 문항이 없습니다."),
    ).toBeVisible();
    expect(linkItem).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "선택한 문항 연결" }),
    ).not.toBeInTheDocument();
  });

  it("creates a book with the chosen grade and margins", async () => {
    const createBook = vi.fn(async () => book);
    render(<TextbookStudioView api={api({ createBook })} />);
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
    fireEvent.change(screen.getByRole("combobox", { name: "학년" }), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "안쪽 여백" }), {
      target: { value: "12" },
    });
    expect(
      screen.getByText(
        "주요 구획은 짝수 왼쪽에서 시작합니다. 여백은 8mm 이상 40mm 이하입니다.",
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "새 교재" }));
    expect(createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "분수",
        volumeCode: "2-1-1",
        grade: 6,
        schoolLevel: "elementary",
        semester: 1,
        innerMarginMm: 12,
        outerMarginMm: 15,
        coverMode: "separate",
        mode: "integrated",
      }),
    );
  });

  it("opens the edition named by initialEditionId and does not reopen it from the list", async () => {
    const client = api();
    render(
      <TextbookStudioView
        api={client}
        initialEditionId="00000000-0000-4000-8000-0000000000aa"
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    expect(await screen.findByRole("textbox", { name: "대사" })).toBeVisible();
    expect(client.openEdition).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-0000000000aa",
    );
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
    expect(client.openEdition).toHaveBeenCalledOnce();
  });

  it("does not open an edition when the id is not a uuid", async () => {
    const client = api();
    render(<TextbookStudioView api={client} initialEditionId="not-a-uuid" />);
    expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
    expect(client.openEdition).not.toHaveBeenCalled();
  });

  it("does not replace a dirty section when the deep link changes", async () => {
    const client = api();
    const nextId = "00000000-0000-4000-8000-0000000000bb";
    const { rerender } = render(
      <TextbookStudioView
        api={client}
        initialEditionId="00000000-0000-4000-8000-0000000000aa"
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    const sentence = await screen.findByRole("textbox", { name: "대사" });
    fireEvent.change(sentence, { target: { value: "고친 문장" } });
    rerender(<TextbookStudioView api={client} initialEditionId={nextId} />);
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "고친 문장",
    );
    expect(client.openEdition).not.toHaveBeenCalledWith(nextId);
  });

  it("links a published concept lecture on the unit outline", async () => {
    const source = structuredClone(edition.structureSource);
    if (!source) throw new Error("fixture");
    source.outline[0]?.sourceUnitIds.push(
      "00000000-0000-4000-8000-0000000000bb",
    );
    const opened = { ...edition, structureSource: source };
    const linked = section();
    linked.concept = {
      conceptKey: "common-denominator",
      title: "통분",
      kind: "정의",
      goal: "",
      prerequisites: "",
      definition: "",
      conditions: "",
      examples: "",
      counterexamples: "",
      misconceptions: "",
      explainPrompt: "",
      blankForms: ["term", "cloze"],
    };
    const listUnitLectures = vi.fn(async () => [
      {
        lectureId: "00000000-0000-4000-8000-0000000000cc",
        title: "통분 강의",
        status: "published" as const,
      },
      {
        lectureId: "00000000-0000-4000-8000-0000000000dd",
        title: "초안 강의",
        status: "draft" as const,
      },
    ]);
    const patchEdition = vi.fn(async () => opened);
    await openStudio(
      api({
        openEdition: vi.fn(async () => opened),
        getSection: vi.fn(async () => linked),
        listUnitLectures,
        patchEdition,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "강의 찾기" }));
    expect(
      await screen.findByRole("option", { name: "통분 강의" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "초안 강의" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    expect(await screen.findByText("강의를 연결했습니다.")).toBeVisible();
    expect(listUnitLectures).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-0000000000bb",
    );
    expect(patchEdition).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 3,
        source: expect.objectContaining({
          outline: [
            expect.objectContaining({
              conceptLectureRefs: [
                {
                  lectureId: "00000000-0000-4000-8000-0000000000cc",
                  conceptKey: "common-denominator",
                },
              ],
            }),
          ],
        }),
      }),
    );
  });

  it("records a teacher observation on a published concept", async () => {
    const source = structuredClone(edition.structureSource);
    if (!source) throw new Error("fixture");
    source.edition = {
      editionId: "00000000-0000-4000-8000-000000000011",
      label: "1",
      status: "published",
      revision: 9,
      publishedAt: "2026-10-03T00:00:00.000Z",
      manifestHash: null,
    };
    const opened = { ...edition, structureSource: source };
    const linked = section();
    linked.concept = {
      conceptKey: "common-denominator",
      title: "통분",
      kind: "정의",
      goal: "",
      prerequisites: "",
      definition: "",
      conditions: "",
      examples: "",
      counterexamples: "",
      misconceptions: "",
      explainPrompt: "",
      blankForms: ["term"],
    };
    const recordObservation = vi.fn(async () => ({
      reviewStatus: "pending" as const,
    }));
    const classId = "00000000-0000-4000-8000-0000000000c1";
    const studentId = "00000000-0000-4000-8000-0000000000ee";
    await openStudio(
      api({
        openEdition: vi.fn(async () => opened),
        getSection: vi.fn(async () => linked),
        recordObservation,
        listClasses: vi.fn(async () => [
          { id: classId, label: "월수반 · 초5" },
        ]),
        listStudents: vi.fn(async () => [{ id: studentId, label: "김민서" }]),
      }),
    );
    const form = screen.getByRole("form", { name: "종이 활동" });
    expect(
      await within(form).findByRole("option", { name: "김민서" }),
    ).toBeVisible();
    fireEvent.change(within(form).getByRole("textbox", { name: "관찰" }), {
      target: { value: "분모를 같게 한다고 말했다." },
    });
    fireEvent.click(within(form).getByRole("button", { name: "기록" }));
    expect(await screen.findByText(/검수 전입니다/)).toBeVisible();
    expect(recordObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        editionId: "edition-1",
        conceptKey: "common-denominator",
        studentId: "00000000-0000-4000-8000-0000000000ee",
        form: "term",
        observation: "분모를 같게 한다고 말했다.",
      }),
    );
  });

  it("assigns the chosen student by name", async () => {
    const classId = "00000000-0000-4000-8000-0000000000c1";
    const studentId = "00000000-0000-4000-8000-0000000000ee";
    const createAssignment = vi.fn(async () => ({
      assignmentId: "00000000-0000-4000-8000-0000000000f1",
      target: { kind: "student" as const, studentId, label: "김민서" },
      startsAt: "2026-10-03T00:00:00.000Z",
      expiresAt: null,
      revoked: false,
    }));
    await openStudio(
      api({
        openEdition: vi.fn(async () => publishedEdition()),
        listAssignments: vi.fn(async () => []),
        listClasses: vi.fn(async () => [
          { id: classId, label: "월수반 · 초5" },
        ]),
        listStudents: vi.fn(async () => [{ id: studentId, label: "김민서" }]),
        createAssignment,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "배정" }));
    const panel = await screen.findByRole("region", { name: "배정" });
    expect(
      await within(panel).findByRole("option", { name: "월수반 · 초5" }),
    ).toBeVisible();
    fireEvent.change(within(panel).getByRole("combobox", { name: "대상" }), {
      target: { value: "student" },
    });
    expect(
      await within(panel).findByRole("option", { name: "김민서" }),
    ).toBeVisible();
    fireEvent.click(within(panel).getByRole("button", { name: "배정 추가" }));
    expect(createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        editionId: "edition-1",
        target: { kind: "student", studentId, label: "김민서" },
        expiresAt: null,
      }),
    );
  });

  it("reissues the chosen order and reports a duplicate without opening a test", async () => {
    navigation.push.mockClear();
    const source = structuredClone(edition.structureSource);
    if (!source) throw new Error("fixture");
    source.edition = {
      editionId: "00000000-0000-4000-8000-000000000011",
      label: "1",
      status: "published",
      revision: 9,
      publishedAt: "2026-10-03T00:00:00.000Z",
      manifestHash: null,
    };
    const classId = "00000000-0000-4000-8000-0000000000c1";
    const unitId = "00000000-0000-4000-8000-0000000000d1";
    const testId = "00000000-0000-4000-8000-0000000000d2";
    const item = (itemId: string, displayNumber: string) => ({
      itemId,
      editionId: "edition-1",
      snapshotId: "snap-1",
      linkStatus: "linked" as const,
      sourceTestId: null,
      sourceTestProblemId: null,
      unitKey: "unit-1",
      sectionKey: "dialogue",
      learningStage: "basic" as const,
      displayNumber,
      orderIndex: 0,
      layout: {
        columnSpan: 1 as const,
        minWorkLines: 0,
        preferredWorkLines: 0,
        maxWorkLines: 0,
        keepTogether: false,
      },
      qrTargetId: null,
    });
    const reissue = vi
      .fn()
      .mockRejectedValueOnce(
        new TextbookRequestError(
          "낼 수 없는 문항 1건이 들어 있습니다. 1(같은 문항을 두 번 골랐습니다.)",
          422,
        ),
      )
      .mockResolvedValueOnce({
        testId,
        problemCount: 3,
        titlePersisted: false as const,
        replayed: false,
      });
    await openStudio(
      api({
        openEdition: vi.fn(async () => ({
          ...edition,
          structureSource: source,
        })),
        readPreviewMaterial: vi.fn(async () => ({
          items: [item("item-a", "2"), item("item-b", "1")],
          snapshots: [],
          assets: [],
          concepts: [],
          qrTargets: [],
          conceptQrTargets: [],
        })),
        listClasses: vi.fn(async () => [
          { id: classId, label: "월수반 · 초5" },
        ]),
        listUnits: vi.fn(async () => [{ id: unitId, label: "초5 분수 통분" }]),
        reissue,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 출제" }));
    const panel = await screen.findByRole("region", { name: "다시 출제" });
    expect(
      await within(panel).findByRole("option", { name: "월수반 · 초5" }),
    ).toBeVisible();
    expect(
      await within(panel).findByRole("option", { name: "초5 분수 통분" }),
    ).toBeVisible();
    fireEvent.change(within(panel).getByRole("combobox", { name: "반" }), {
      target: { value: classId },
    });
    fireEvent.change(
      within(panel).getByRole("combobox", { name: "범위 끝 단원" }),
      { target: { value: unitId } },
    );
    fireEvent.click(within(panel).getByRole("button", { name: "2 추가" }));
    fireEvent.click(within(panel).getByRole("button", { name: "2 추가" }));
    fireEvent.click(
      within(panel).getByRole("button", { name: "시험지 만들기" }),
    );
    expect(
      await screen.findByText(/같은 문항을 두 번 골랐습니다/),
    ).toBeVisible();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(reissue).toHaveBeenCalledWith(
      expect.objectContaining({ itemIds: ["item-a", "item-a"], classId }),
    );
    fireEvent.click(within(panel).getByRole("button", { name: "1 추가" }));
    fireEvent.click(within(panel).getByRole("button", { name: "1 위로" }));
    fireEvent.click(within(panel).getByRole("button", { name: "1 위로" }));
    fireEvent.change(within(panel).getByRole("textbox", { name: "제목" }), {
      target: { value: "복습" },
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "시험지 만들기" }),
    );
    expect(await screen.findByText(/제목은 저장되지 않았습니다/)).toBeVisible();
    expect(reissue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        itemIds: ["item-b", "item-a", "item-a"],
        classId,
        title: "복습",
        testType: "daily",
        rangeEndUnitId: unitId,
      }),
    );
    expect(navigation.push).toHaveBeenCalledWith(`/tests/${testId}`);
  });

  it("shows the missing snapshot instead of an unmeasured page", async () => {
    const source = structuredClone(edition.structureSource);
    if (!source) throw new Error("fixture");
    source.edition = {
      editionId: "00000000-0000-4000-8000-000000000011",
      label: "1",
      status: "draft",
      revision: 2,
      publishedAt: null,
      manifestHash: null,
    };
    source.config = {
      ...source.config,
      print: {
        paper: "A4",
        innerMarginMm: 15,
        outerMarginMm: 15,
        sectionStart: "even-left",
        coverMode: "separate",
        firstPhysicalPageIndex: 1,
      },
    };
    const placed = section();
    placed.blocks = [
      ...placed.blocks,
      { id: "block-problem", kind: "problems", itemIds: ["item-1"] },
    ];
    await openStudio(
      api({
        openEdition: vi.fn(async () => ({
          ...edition,
          structureSource: source,
        })),
        getSection: vi.fn(async () => placed),
      }),
    );
    expect(
      await screen.findByText(
        "문항 확정본이 이 화면에 없어 측정하지 않습니다.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/공유 지면 렌더러/)).not.toBeInTheDocument();
  });

  it("saves the real cover and first printed page without changing the even-left start", async () => {
    const source = structuredClone(edition.structureSource);
    if (!source) throw new Error("fixture");
    source.config = {
      ...source.config,
      print: {
        paper: "A4",
        innerMarginMm: 15,
        outerMarginMm: 15,
        sectionStart: "even-left",
        coverMode: "separate",
        firstPhysicalPageIndex: 1,
      },
    };
    const patchEdition = vi.fn(async () => edition);
    await openStudio(
      api({
        openEdition: vi.fn(async () => ({
          ...edition,
          structureSource: source,
        })),
        patchEdition,
      }),
    );
    const form = screen.getByRole("form", { name: "교재 설정" });
    fireEvent.change(within(form).getByRole("combobox", { name: "표지" }), {
      target: { value: "included" },
    });
    fireEvent.change(
      within(form).getByRole("textbox", { name: "첫 인쇄 쪽" }),
      {
        target: { value: "3" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    expect(await screen.findByText("설정을 저장했습니다.")).toBeVisible();
    expect(patchEdition).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          config: expect.objectContaining({
            print: expect.objectContaining({
              coverMode: "included",
              firstPhysicalPageIndex: 3,
              sectionStart: "even-left",
            }),
          }),
        }),
      }),
    );
  });

  it("disables published manuscript edits and still opens a definition and a new draft", async () => {
    const source = structuredClone(edition.structureSource);
    if (!source) throw new Error("fixture");
    source.edition = {
      editionId: "00000000-0000-4000-8000-000000000011",
      label: "1",
      status: "published",
      revision: 2,
      publishedAt: "2026-10-03T00:00:00.000Z",
      manifestHash: null,
    };
    const placed = section();
    placed.blocks = [
      ...placed.blocks,
      {
        id: "concept-block",
        kind: "concept",
        conceptKey: "prime-definition",
      },
    ];
    const createEdition = vi.fn(async () => ({
      ...edition,
      editionId: "edition-copy",
    }));
    await openStudio(
      api({
        openEdition: vi.fn(async () => ({
          ...edition,
          structureSource: source,
        })),
        getSection: vi.fn(async () => placed),
        readConcept: vi.fn(async () => ({
          revision: 2,
          draft: {
            conceptKey: "prime-definition",
            title: "소수",
            kind: "정의",
            goal: "",
            prerequisites: "",
            definition: "1과 자신만으로 나누어진다",
            conditions: "",
            examples: "",
            counterexamples: "",
            misconceptions: "",
            explainPrompt: "",
            blankForms: ["term", "cloze"],
          },
          concept: wireConcept({
            links: [
              {
                linkId: "factorization-review",
                target: {
                  namespace: "explorer-card",
                  cardId: "factorization-review",
                },
                relation: "same",
                review: {
                  status: "confirmed",
                  candidateRule: "manual",
                  reviewedBy: "11111111-1111-4111-8111-111111111111",
                  reviewedAt: "2026-10-03T00:00:00.000Z",
                  targetHash: "a".repeat(64),
                },
              },
            ],
          }),
        })) as TextbookStudioApi["readConcept"],
        createEdition,
      }),
    );
    expect(screen.getByRole("button", { name: "이 구획 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "설정 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "대화 위로" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "정의 불러오기" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "내보내기" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "다시 출제" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    expect(screen.getByRole("button", { name: "발행 전 확인" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "새 초안" }));
    expect(await screen.findByText("새 초안을 만들었습니다.")).toBeVisible();
    expect(createEdition).toHaveBeenCalledWith(
      "book-1",
      "edition-1",
      expect.any(String),
    );
  });

  it.each(["concept", "picks"] as const)(
    "saves dirty %s before leaving the list",
    async (changed) => {
      const placed = section();
      placed.status = "saved";
      placed.picks = [
        {
          blankSectionKey: "중1::소인수분해::소인수분해",
          entryKind: "concept",
          entryId: "m1-01-02-c3",
          form: "term",
          level: "중",
          reviewStatus: "candidate",
        },
      ];
      placed.blocks = [
        ...placed.blocks,
        {
          id: "concept-block",
          kind: "concept",
          conceptKey: "prime-definition",
        },
      ];
      const savedEdition: EditionDetail = {
        ...edition,
        units: edition.units.map((unit) => ({
          ...unit,
          sections: unit.sections.map((row) => ({ ...row, status: "saved" })),
        })),
      };
      const saveConcept = vi.fn(async (input) => ({
        revision: 5,
        aggregateRevision: 12,
        concept: wireConcept({
          title: input.concept.title,
          kind: input.concept.kind,
          blankForms: [...input.concept.blankForms],
          blankItems: [],
          links: input.links,
        }),
      })) as TextbookStudioApi["saveConcept"];
      const saveSection = vi.fn(async () => ({
        revision: 4,
        aggregateRevision: 10,
      }));
      await openStudio(
        api({
          openEdition: vi.fn(async () => savedEdition),
          getSection: vi.fn(async () => placed),
          readConcept: vi.fn(async () => ({
            revision: 4,
            draft: {
              conceptKey: "prime-definition",
              title: "소수",
              kind: "정의",
              goal: "",
              prerequisites: "",
              definition: "1과 자신만으로 나누어진다",
              conditions: "",
              examples: "기존 예",
              counterexamples: "",
              misconceptions: "",
              explainPrompt: "",
              blankForms: ["term", "cloze"],
            },
            concept: wireConcept(),
          })) as TextbookStudioApi["readConcept"],
          saveConcept,
          saveSection,
        }),
      );
      expect(screen.getByRole("button", { name: "대화저장됨" })).toBeVisible();
      if (changed === "concept") {
        fireEvent.change(screen.getByRole("textbox", { name: "예" }), {
          target: { value: "임시표식" },
        });
      } else {
        fireEvent.click(screen.getByRole("button", { name: "거절" }));
      }
      expect(screen.getByRole("button", { name: "대화저장 전" })).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: "목록" }));
      expect(screen.getByText("저장하지 않은 수정이 있습니다.")).toBeVisible();
      expect(screen.getByRole("textbox", { name: "대사" })).toBeVisible();
      expect(saveConcept).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "계속 편집" }));
      expect(
        screen.queryByText("저장하지 않은 수정이 있습니다."),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "예" })).toHaveValue(
        changed === "concept" ? "임시표식" : "기존 예",
      );
      expect(saveConcept).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "목록" }));
      fireEvent.click(screen.getByRole("button", { name: "저장 후 이동" }));
      expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
      expect(saveConcept).toHaveBeenCalledWith(
        expect.objectContaining({
          concept: expect.objectContaining({
            examples: changed === "concept" ? "임시표식" : "기존 예",
          }),
          picks: [
            expect.objectContaining({
              entryId: "m1-01-02-c3",
              reviewStatus: changed === "picks" ? "rejected" : "candidate",
            }),
          ],
          links: [],
          confirmLinkIds: [],
        }),
      );
      expect(saveSection).not.toHaveBeenCalled();
    },
  );
  it.each([
    "body",
    "confirmation",
    "conflict",
    "shadow-reject",
    "new-body",
  ] as const)(
    "reopens existing blank references and preserves explicit confirmation: %s",
    async (mode) => {
      const placed = section();
      placed.blocks.push({
        id: "concept-block",
        kind: "concept",
        conceptKey: "prime-definition",
      });
      const draftConcept: ConceptDraft = {
        conceptKey: "prime-definition",
        title: "소수",
        kind: "정의",
        goal: "",
        prerequisites: "",
        definition: "1과 자신만으로 나누어진다",
        conditions: "",
        examples: "기존 예",
        counterexamples: "",
        misconceptions: "",
        explainPrompt: "",
        blankForms: ["term", "cloze"],
      };
      const reference: TextbookConcept["blankItems"][number] = {
        blankSectionKey: "중1::소인수분해::소인수분해",
        entryKind: "concept",
        entryId: "m1-01-02-c3",
        review: {
          status: "confirmed",
          candidateRule: "manual",
          reviewedBy: "teacher",
          reviewedAt: "2026-10-03",
          targetHash: "hash",
        },
      };
      const source = wireConcept({
        blankForms: draftConcept.blankForms,
        blankItems: [reference],
      });
      const saveSection = vi.fn(async () => ({
        revision: 4,
        aggregateRevision: 10,
      }));
      let calls = 0;
      const saveConcept = vi.fn(async (input) => {
        calls += 1;
        if (mode === "conflict" && calls === 1)
          throw new TextbookRequestError("다른 곳에서 수정됨", 409);
        return {
          revision: 5,
          aggregateRevision: 12,
          concept: { ...source, ...input.concept },
        };
      }) as TextbookStudioApi["saveConcept"];
      const client = api({
        getSection: vi.fn(async () => placed),
        saveSection,
        readConcept: vi.fn(async () => ({
          revision: 4,
          draft: draftConcept,
          concept: source,
        })) as TextbookStudioApi["readConcept"],
        saveConcept,
      });
      await openStudio(client);
      expect(placed.picks).toEqual([]);
      const existing = screen.getByRole("list", { name: "기존 개념백지 연결" });
      expect(within(existing).getByText(/m1-01-02-c3 · 확인/)).toBeVisible();
      fireEvent.click(
        within(existing).getByRole("button", { name: "m1-01-02-c3 확인 요청" }),
      );
      const hasPick = mode === "shadow-reject" || mode === "new-body";
      if (hasPick) {
        fireEvent.change(screen.getByRole("textbox", { name: "소단원" }), {
          target: { value: reference.blankSectionKey },
        });
        fireEvent.change(screen.getByRole("textbox", { name: "항목 ID" }), {
          target: { value: reference.entryId },
        });
        fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
        fireEvent.click(
          screen.getByRole("button", {
            name: mode === "shadow-reject" ? "거절" : "m1-01-02-c3 확인 요청",
          }),
        );
      }
      if (mode !== "confirmation" && mode !== "shadow-reject") {
        fireEvent.change(screen.getByRole("textbox", { name: "예" }), {
          target: { value: "수정된 예" },
        });
        if (!hasPick) {
          expect(
            within(existing).getByText(/본문 변경 · 재확인 필요/),
          ).toBeVisible();
          fireEvent.click(
            within(existing).getByRole("button", {
              name: "m1-01-02-c3 확인 요청",
            }),
          );
        }
      }
      fireEvent.click(screen.getByRole("button", { name: "목록" }));
      expect(screen.getByText("저장하지 않은 수정이 있습니다.")).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: "저장 후 이동" }));
      if (mode === "conflict") {
        expect(await screen.findByText("다른 곳에서 수정됨")).toBeVisible();
        expect(
          within(existing).getByRole("button", {
            name: "m1-01-02-c3 확인 취소",
          }),
        ).toBeVisible();
        expect(screen.getByRole("textbox", { name: "예" })).toHaveValue(
          "수정된 예",
        );
        fireEvent.click(screen.getByRole("button", { name: "저장 후 이동" }));
      }
      expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
      expect(saveConcept).toHaveBeenLastCalledWith(
        expect.objectContaining({
          picks: hasPick
            ? [
                expect.objectContaining({
                  entryId: reference.entryId,
                  confirmRequested: false,
                  reviewStatus:
                    mode === "shadow-reject" ? "rejected" : "candidate",
                }),
              ]
            : [],
          source,
          confirmEntryIds: hasPick ? [] : ["m1-01-02-c3"],
          confirmLinkIds: [],
          concept: expect.objectContaining({
            examples:
              mode === "confirmation" || mode === "shadow-reject"
                ? "기존 예"
                : "수정된 예",
          }),
        }),
      );
      expect(client.saveSection).not.toHaveBeenCalled();
    },
  );
});
