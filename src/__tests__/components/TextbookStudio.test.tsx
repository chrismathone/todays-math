import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TextbookStudioApi } from "@/lib/textbook/client";
import { TextbookRequestError } from "@/lib/textbook/client";
import type {
  BookSummary,
  EditionDetail,
  SectionDetail,
  VideoBinding,
} from "@/components/textbook/model";
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
    listUnitLectures: unused,
    recordObservation: unused,
    createVideo: unused,
    bindVideo: unused,
    updateVideo: unused,
    readItemDetail: unused,
    linkItem: unused,
    registerItem: unused,
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
  expect(await screen.findByRole("textbox", { name: "대사" })).toBeVisible();
}

describe("TextbookStudioView", () => {
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
    expect(screen.getByRole("textbox", { name: "교사용 정답" })).toHaveValue(
      "11/12",
    );
    expect(paper).not.toHaveTextContent("11/12");

    fireEvent.click(screen.getByRole("button", { name: "학생용" }));
    expect(
      screen.queryByRole("textbox", { name: "교사용 정답" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("11/12")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "교사용" }));
    expect(
      within(screen.getByRole("region", { name: "지면" })).getByText(/11\/12/),
    ).toBeVisible();
  });

  it("gives a student audience no answer and no teacher preview switch", async () => {
    await openStudio(api(), "student");
    expect(screen.queryByText("11/12")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "교사용" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "교사용 정답" }),
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
    await openStudio(api({ saveConcept }));
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
    expect(screen.getByRole("button", { name: "용어" })).toHaveAttribute(
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
    fireEvent.click(screen.getByRole("button", { name: "확인 요청" }));
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
    expect(await screen.findByText("개념을 저장했습니다.")).toBeVisible();
    expect(saveConcept).toHaveBeenCalledOnce();
    expect(screen.getByText(/e5-1 · 확인/)).toBeVisible();
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
    await openStudio(api({ getSection, captureItems }));
    fireEvent.change(screen.getByRole("textbox", { name: "대사" }), {
      target: { value: "고친 문장" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "문제 ID" }), {
      target: { value: "problem-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "문항 가져오기" }));
    expect(await screen.findByText("문항 블록")).toBeVisible();
    expect(captureItems).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 9 }),
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
      contentHash: "a".repeat(64),
    };
    const updateVideo = vi.fn(async () => {
      throw new TextbookRequestError("영상을 찾지 못했습니다.", 404);
    });
    await openStudio(
      api({
        listVideos: vi.fn(async () => [row]),
        updateVideo,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "영상" }));
    expect(await screen.findByText(/예제 영상 · 초안/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "게시" }));
    expect(await screen.findByText("영상을 찾지 못했습니다.")).toBeVisible();
    expect(screen.getByText(/예제 영상 · 초안/)).toBeVisible();
    expect(screen.queryByText(/예제 영상 · 게시$/)).not.toBeInTheDocument();
    expect(updateVideo).toHaveBeenCalledOnce();
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
    const registerItem = vi.fn(async () => {
      throw new TextbookRequestError(
        "등록 계약이 아직 없습니다. 공유 스키마가 오기 전에는 요청을 보내지 않습니다.",
        400,
      );
    });
    await openStudio(
      api({
        getSection: vi.fn(async () => linked),
        readItemDetail,
        linkItem,
        registerItem,
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
    fireEvent.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText(/등록 계약이 아직 없습니다/)).toBeVisible();
    expect(screen.getByText(/1 · 연결됨/)).toBeVisible();
    expect(registerItem).toHaveBeenCalledOnce();
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
    await openStudio(
      api({
        openEdition: vi.fn(async () => opened),
        getSection: vi.fn(async () => linked),
        recordObservation,
      }),
    );
    const form = screen.getByRole("form", { name: "종이 활동" });
    fireEvent.change(within(form).getByRole("textbox", { name: "학생" }), {
      target: { value: "00000000-0000-4000-8000-0000000000ee" },
    });
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
});
