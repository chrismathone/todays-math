/**
 * 구조 전용 편집 칸 — 화면에서 고친 구조가 **실제 저장 요청**과 **미리보기 렌더**에 그대로 실리는가.
 *
 * 화면이 «그렇게 그렸다» 를 되비추지 않는다. 저장은 실제 client 가 만든 PUT 본문을 보고(모킹한 API 호출이 아니다),
 * 지면은 미리보기가 쓰는 실제 경로(`buildSectionPreview` → 렌더 모형 → 블록 HTML)로 본다.
 * 자료는 자동 구성이 실제로 만드는 블록이다. 열어 보기만 한 블록은 저장본과 글자 하나 다르지 않아야 한다.
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

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/textbook/quickCreateClient", () => ({
  httpQuickCreateApi: {
    listUnits: vi.fn(async () => ({ units: [] })),
    create: vi.fn(),
  },
}));

import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import type { TextbookEditionDetail } from "@/contracts/textbook.contract";
import {
  textbookSemanticSchema,
  type TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import type {
  BookSummary,
  EditionDetail,
  SectionDetail,
} from "@/components/textbook/model";
import { buildSectionPreview } from "@/components/textbook/previewModel";
import { editStructure } from "@/components/textbook/structureFields";
import { TextbookStudioView } from "@/components/textbook/TextbookStudioView";
import {
  createTextbookApi,
  type TextbookStudioApi,
} from "@/lib/textbook/client";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import { appendUnitIntro } from "@/lib/textbook/server/quickCreate/unitIntro";
import { writingActivity } from "@/lib/textbook/server/quickCreateRecovery";
import openings from "@/lib/textbook/scripts/unit-openings.json";

const BOOK_ID = "00000000-0000-4000-8000-0000000000a1";
const EDITION_ID = "00000000-0000-4000-8000-0000000000aa";
const SECTION_ID = "00000000-0000-4000-8000-0000000000d1";
const when = "2026-10-06T00:00:00.000Z";

const book: BookSummary = {
  bookId: BOOK_ID,
  title: "덧셈과 뺄셈",
  shared: false,
  archived: false,
  activeEditionId: EDITION_ID,
};

function source(): TextbookEditionDetail {
  return {
    book: {
      id: BOOK_ID,
      ownerId: "00000000-0000-4000-8000-0000000000a2",
      ownerName: "원장",
      isOwner: true,
      title: "덧셈과 뺄셈",
      visibility: "private",
      sharedBranchId: null,
      archivedAt: null,
      createdAt: when,
      updatedAt: when,
      draftEditionId: EDITION_ID,
      latestPublishedEditionId: null,
    },
    edition: {
      editionId: EDITION_ID,
      label: "1",
      status: "draft",
      revision: 2,
      publishedAt: null,
      manifestHash: null,
    },
    structureRevision: 3,
    config: {
      bookId: BOOK_ID,
      schoolLevel: "elementary",
      grade: 3,
      semester: 1,
      volume: 1,
      volumeCount: 1,
      displayCode: "3-1-1",
      title: "덧셈과 뺄셈",
      curriculumVersion: "2022",
      mode: "integrated",
      pageBudget: { target: 32, tolerance: 0, strict: false },
      print: {
        paper: "A4",
        innerMarginMm: 15,
        outerMarginMm: 15,
        sectionStart: "even-left",
        coverMode: "separate",
        firstPhysicalPageIndex: 1,
      },
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
    },
    outline: [
      {
        unitKey: "unit-1",
        title: "덧셈과 뺄셈",
        sourceUnitIds: [],
        prerequisites: [],
        goals: [],
        conceptLectureRefs: [],
        sections: [],
      },
    ],
    issues: [],
  };
}

function edition(): EditionDetail {
  return {
    editionId: EDITION_ID,
    bookId: BOOK_ID,
    title: "덧셈과 뺄셈",
    structureRevision: 3,
    aggregateRevision: 9,
    config: {
      paper: "A4",
      workLineMm: 7,
      answerPolicy: "never",
      volumeCode: "3-1-1",
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
    },
    structureSource: source(),
    units: [
      {
        unitKey: "unit-1",
        title: "덧셈과 뺄셈",
        sections: [
          {
            sectionId: SECTION_ID,
            title: "여는 쪽",
            status: "saved" as const,
            parity: "even-left" as const,
          },
        ],
      },
    ],
  };
}

/** 자동 구성이 실제로 만드는 단원 도입 — 은행의 첫 단원 */
function introBlock(): ManuscriptBlock {
  const opening = openings.openings[0]!;
  const added: ManuscriptBlock[][] = [];
  appendUnitIntro({
    components: { unitIntro: true },
    units: opening.sections.map((row) => ({
      grade: opening.grade,
      chapter: opening.chapter,
      section: row.title,
    })),
    chapter: opening.chapter,
    addSection: (
      _title: string,
      _template: string,
      blocks: ManuscriptBlock[],
    ) => added.push(blocks),
  } as unknown as Parameters<typeof appendUnitIntro>[0]);
  return added[0]![0]!;
}

/** 자동 구성이 실제로 만드는 질문 기록 */
const logBlock = () =>
  writingActivity(
    "questionLog",
    "질문 기록",
    [
      "소단원·문항 번호와 막힌 부분을 적으세요.",
      "시도한 방법과 물어볼 질문을 구체적으로 적으세요.",
      "설명을 들은 뒤 새로 알게 된 이유를 자신의 말로 적으세요.",
    ],
    4,
  );

const boardBlock = (): ManuscriptBlock => ({
  blockId: "00000000-0000-4000-8000-0000000000b3",
  kind: "text",
  markdown: "선분",
  semantic: textbookSemanticSchema.parse({
    activity: "dialogue",
    title: "선분의 뜻",
    node: { kind: "board", title: "선분", tex: "\\overline{AB}" },
  }),
});

function sectionWith(
  templateKey: string,
  block: ManuscriptBlock,
): SectionDetail {
  if (block.kind !== "text") throw new Error("글 블록이 아니다");
  return {
    sectionId: SECTION_ID,
    editionId: EDITION_ID,
    unitKey: "unit-1",
    sectionKey: "opening",
    templateKey,
    title: "여는 쪽",
    revision: 3,
    aggregateRevision: 3,
    status: "saved",
    parity: "even-left",
    parityMessage: null,
    blocks: [
      {
        id: block.blockId,
        kind: "text",
        text: block.markdown,
        ...(block.semantic ? { semantic: block.semantic } : {}),
      },
    ],
    answer: "",
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
    openEdition: vi.fn(async () => edition()),
    createEdition: unused,
    createSection: unused,
    readConcept: unused,
    getSection: unused,
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
  } as TextbookStudioApi;
}

type Put = {
  url: string;
  body: {
    expectedRevision: number;
    unitKey: string;
    section: { blocks: (ManuscriptBlock & { semantic?: TextbookSemantic })[] };
  };
};

/** 실제 client 의 구획 저장 — 화면이 넘긴 원고가 어떤 PUT 본문이 되는지 본다 */
function realSave() {
  const puts: Put[] = [];
  const real = createTextbookApi(async (url, init) => {
    const body = JSON.parse(String(init?.body)) as Put["body"];
    puts.push({ url: String(url), body });
    return Response.json({
      data: {
        section: {
          id: SECTION_ID,
          unitKey: body.unitKey,
          revision: body.expectedRevision + 1,
          section: body.section,
          updatedAt: when,
        },
        aggregateRevision: 10,
        replayed: false,
      },
    });
  });
  return { puts, saveSection: real.saveSection };
}

async function openStudio(
  detail: SectionDetail,
  overrides: Partial<TextbookStudioApi> = {},
) {
  const save = realSave();
  render(
    <TextbookStudioView
      api={api({
        getSection: vi.fn(async () => structuredClone(detail)),
        saveSection: save.saveSection,
        ...overrides,
      })}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "열기" }));
  fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
  await screen.findByRole("button", { name: "내용 수정" });
  return save;
}

const closing = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("단원 도입 — 닫힌 모양과 연 모양", () => {
  it("닫혀 있으면 주요 글과 개수 한 줄을 읽기 모양으로 보이고, 고칠 수 없는 본문 칸은 없다", async () => {
    const block = introBlock();
    const opening = openings.openings[0]!;
    await openStudio(sectionWith("auto-unit-intro", block));
    expect(screen.getByText(`단원 도입 · ${opening.title}`)).toBeVisible();
    expect(screen.getByText(opening.question)).toBeVisible();
    expect(screen.getByText(opening.explanation)).toBeVisible();
    expect(screen.getByText(opening.keyPhrase)).toBeVisible();
    expect(
      screen.getByText(
        `학습 목표 ${opening.sections.length} · 학습 순서 ${opening.sections.length} · 출발점 ${opening.check.length}`,
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "본문" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "질문" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내용 수정" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("«내용 수정» 을 누르면 같은 자리에 두 묶음이 열린다 — 칸 이름은 지면의 제목 그대로다", async () => {
    const opening = openings.openings[0]!;
    await openStudio(sectionWith("auto-unit-intro", introBlock()));
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    expect(screen.getByRole("button", { name: "접기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const first = screen.getByRole("group", { name: "여는 글" });
    expect(
      within(first).getByRole("textbox", { name: "도입 제목" }),
    ).toHaveValue(opening.title);
    expect(within(first).getByRole("textbox", { name: "질문" })).toHaveValue(
      opening.question,
    );
    expect(within(first).getByRole("textbox", { name: "설명" })).toHaveValue(
      opening.explanation,
    );
    expect(
      within(first).getByRole("textbox", { name: "핵심 문구" }),
    ).toHaveValue(opening.keyPhrase);
    const guide = screen.getByRole("group", { name: "배움의 길잡이" });
    expect(
      within(guide).getAllByRole("textbox", {
        name: /^이 단원의 학습 목표 \d+$/,
      }),
    ).toHaveLength(opening.sections.length);
    expect(
      within(guide).getAllByRole("textbox", {
        name: /^선택한 범위의 학습 순서 \d+$/,
      }),
    ).toHaveLength(opening.sections.length);
    expect(
      within(guide).getAllByRole("textbox", { name: /^나의 출발점 \d+$/ }),
    ).toHaveLength(opening.check.length);
    expect(
      within(guide).getByRole("textbox", { name: "날짜 문구" }),
    ).toHaveValue("공부를 시작한 날");
    // 항목을 더하거나 빼는 단추는 없다(1판은 문구만) — 두 묶음 안에는 입력뿐이다
    expect(within(first).queryByRole("button")).toBeNull();
    expect(within(guide).queryByRole("button")).toBeNull();
  });
});

describe("고친 구조의 저장 — 실제 저장 요청으로 본다", () => {
  it("질문을 고치면 블록 머리에 «저장 전» 이 붙고, 접어도 남으며, 저장 요청에는 고친 구조와 그대로인 본문이 실린다", async () => {
    const block = introBlock();
    const opening = openings.openings[0]!;
    const { puts } = await openStudio(sectionWith("auto-unit-intro", block));
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    fireEvent.change(screen.getByRole("textbox", { name: "질문" }), {
      target: { value: "수는 어디까지 더할 수 있을까?" },
    });
    expect(
      screen.getByText(`단원 도입 · ${opening.title} · 저장 전`),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    // 접어도 고친 글이 요약에 보이고 표시가 남는다
    expect(screen.getByText("수는 어디까지 더할 수 있을까?")).toBeVisible();
    expect(
      screen.getByText(`단원 도입 · ${opening.title} · 저장 전`),
    ).toBeVisible();
    expect(closing()).toBe(true);

    save();
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.url).toContain(
      `/editions/${EDITION_ID}/sections/${SECTION_ID}`,
    );
    expect(puts[0]!.body.expectedRevision).toBe(3);
    const sent = puts[0]!.body.section.blocks[0]!;
    const original = plain(block) as typeof sent;
    // 본문은 그대로다 — 조판이 본문의 꼴을 쪽 나눔에 쓴다
    expect(sent.kind === "text" && sent.markdown).toBe(
      original.kind === "text" && original.markdown,
    );
    const node = sent.semantic!.node as { question: string };
    expect(node.question).toBe("수는 어디까지 더할 수 있을까?");
    // 고친 칸 말고는 저장본과 같다 — 출처 기록도 그대로 실린다
    expect({
      ...sent,
      semantic: {
        ...sent.semantic,
        node: { ...sent.semantic!.node, question: opening.question },
      },
    }).toEqual(original);

    // 저장하면 표시가 사라진다
    await waitFor(() =>
      expect(
        screen.queryByText(`단원 도입 · ${opening.title} · 저장 전`),
      ).not.toBeInTheDocument(),
    );
    expect(closing()).toBe(false);
  });

  it("열었다 닫고 그대로 저장하면 요청의 블록이 손대지 않은 구획의 저장 요청과 글자 하나 다르지 않다", async () => {
    const block = introBlock();
    const detail = sectionWith("auto-unit-intro", block);
    const { puts } = await openStudio(detail);
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    expect(closing()).toBe(false);
    save();
    await waitFor(() => expect(puts).toHaveLength(1));

    // 같은 client 로, 화면을 거치지 않은 같은 구획을 저장한 요청
    const untouched = realSave();
    await untouched.saveSection({
      editionId: EDITION_ID,
      sectionId: SECTION_ID,
      expectedRevision: 3,
      requestId: "00000000-0000-4000-8000-0000000000f1",
      section: structuredClone(detail),
    });
    expect(JSON.stringify(puts[0]!.body.section)).toBe(
      JSON.stringify(untouched.puts[0]!.body.section),
    );
    // 그리고 그 블록은 생성기가 낸 블록과 내용이 같다
    expect(puts[0]!.body.section.blocks[0]).toEqual(plain(block));
  });

  it("고쳤다가 되돌리면 «저장 전» 이 사라지고, 떠날 때 묻지 않는다", async () => {
    const opening = openings.openings[0]!;
    await openStudio(sectionWith("auto-unit-intro", introBlock()));
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    const keyPhrase = screen.getByRole("textbox", { name: "핵심 문구" });
    fireEvent.change(keyPhrase, { target: { value: "" } });
    expect(
      screen.getByText(`단원 도입 · ${opening.title} · 저장 전`),
    ).toBeVisible();
    fireEvent.change(keyPhrase, { target: { value: opening.keyPhrase } });
    expect(
      screen.queryByText(`단원 도입 · ${opening.title} · 저장 전`),
    ).not.toBeInTheDocument();
    expect(closing()).toBe(false);
  });

  it("질문 기록: 닫힌 요약, 질문 문구와 작성선 수를 고쳐 저장한다 — 질문의 개수는 그대로다", async () => {
    const block = logBlock();
    const { puts } = await openStudio(sectionWith("auto-question-log", block));
    expect(screen.getByText("질문 기록")).toBeVisible();
    expect(screen.getByText("질문 3 · 질문마다 작성선 4줄")).toBeVisible();
    expect(
      screen.getByText("소단원·문항 번호와 막힌 부분을 적으세요."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    fireEvent.change(screen.getByRole("textbox", { name: "질문 2" }), {
      target: { value: "어디까지 해 봤는지 적으세요." },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "질문마다 작성선" }),
      {
        target: { value: "6" },
      },
    );
    save();
    await waitFor(() => expect(puts).toHaveLength(1));
    const sent = puts[0]!.body.section.blocks[0]!;
    expect(sent.semantic!.node).toEqual({
      kind: "writing",
      prompts: [
        "소단원·문항 번호와 막힌 부분을 적으세요.",
        "어디까지 해 봤는지 적으세요.",
        "설명을 들은 뒤 새로 알게 된 이유를 자신의 말로 적으세요.",
      ],
      lines: 6,
    });
    expect(sent.kind === "text" && sent.markdown).toBe(
      block.kind === "text" && block.markdown,
    );
  });

  it("판서: 수식에 $ 를 넣으면 저장을 막고 사유를 보인다 — 고치면 풀린다", async () => {
    const { puts } = await openStudio(sectionWith("auto-lesson", boardBlock()));
    expect(screen.getByText("판서 · 선분")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    const tex = screen.getByRole("textbox", { name: "수식" });
    fireEvent.change(tex, { target: { value: "$\\overline{CD}$" } });
    expect(
      screen.getByText("판서 수식에는 $ 기호와 줄바꿈을 쓸 수 없습니다."),
    ).toBeVisible();
    const button = screen.getByRole("button", { name: "이 구획 저장" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(puts).toHaveLength(0);

    fireEvent.change(tex, { target: { value: "\\overline{CD}" } });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByRole("textbox", { name: "주석" }), {
      target: { value: "두 점을 잇는다" },
    });
    save();
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.body.section.blocks[0]!.semantic!.node).toEqual({
      kind: "board",
      title: "선분",
      tex: "\\overline{CD}",
      note: "두 점을 잇는다",
    });
  });
});

describe("저장을 막는 구조 — 단추만 막은 것이 아니다", () => {
  const invalid = (): ManuscriptBlock => ({
    ...boardBlock(),
    semantic: textbookSemanticSchema.parse({
      activity: "dialogue",
      title: "선분의 뜻",
      node: { kind: "board", title: "선분", tex: "$\\overline{AB}$" },
    }),
  });
  const reason = "판서 수식에는 $ 기호와 줄바꿈을 쓸 수 없습니다.";

  it("저장 후 이동도 같은 사유로 저장하지 않고, 이동하지도 않는다", async () => {
    const { requestTextbookNavigation } =
      await import("@/lib/textbook/navigation");
    const { puts } = await openStudio(sectionWith("auto-lesson", boardBlock()));
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    fireEvent.change(screen.getByRole("textbox", { name: "수식" }), {
      target: { value: "$x$" },
    });
    const proceed = vi.fn();
    act(() => {
      requestTextbookNavigation(proceed);
    });
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "저장하지 않은 수정" }),
      ).getByRole("button", { name: "저장 후 이동" }),
    );
    await act(async () => {});
    expect(puts).toHaveLength(0);
    expect(proceed).not.toHaveBeenCalled();
    expect(screen.getAllByText(reason).length).toBeGreaterThan(0);
  });

  it("개념을 구획에 잇는 저장도 저장본에 든 잘못된 판서를 다시 싣지 않는다", async () => {
    const saveConcept = vi.fn(async (input: { conceptKey: string }) => ({
      revision: 1,
      aggregateRevision: 11,
      concept: {
        conceptKey: input.conceptKey,
        unitKey: "unit-1",
        sectionKey: "opening",
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
    }));
    const { puts } = await openStudio(sectionWith("auto-lesson", invalid()), {
      saveConcept: saveConcept as unknown as TextbookStudioApi["saveConcept"],
    });
    fireEvent.change(screen.getByRole("textbox", { name: "개념 키" }), {
      target: { value: "common-denominator" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "개념 제목" }), {
      target: { value: "통분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "개념 원고 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
    await waitFor(() => expect(saveConcept).toHaveBeenCalledOnce());
    expect(
      (await screen.findAllByText("개념 저장 완료 · 구획 연결 실패")).length,
    ).toBeGreaterThan(0);
    // 개념은 저장됐고, 구획에는 아무것도 쓰지 않았다
    expect(puts).toHaveLength(0);
    expect(screen.getAllByText(reason).length).toBeGreaterThan(0);
  });
});

describe("연 상태는 그 구획의 것이다", () => {
  it("다른 구획에 다녀오면 구조 편집 칸은 다시 닫혀 있다 — 고친 것은 없으니 묻지도 않는다", async () => {
    const OTHER = "00000000-0000-4000-8000-0000000000d2";
    const first = sectionWith("auto-unit-intro", introBlock());
    const second: SectionDetail = {
      ...sectionWith("basic", {
        blockId: "00000000-0000-4000-8000-0000000000b9",
        kind: "text",
        markdown: "둘째 쪽 본문",
      }),
      sectionId: OTHER,
      sectionKey: "second",
      title: "둘째 쪽",
      parity: "continue",
    };
    const two = edition();
    two.units[0]!.sections.push({
      sectionId: OTHER,
      title: "둘째 쪽",
      status: "saved",
      parity: "continue",
    });
    await openStudio(first, {
      openEdition: vi.fn(async () => two),
      getSection: vi.fn(async (_edition: string, sectionId: string) =>
        structuredClone(sectionId === OTHER ? second : first),
      ),
    });
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    expect(screen.getByRole("button", { name: "접기" })).toBeVisible();

    // 세부 화면의 목차로 옮긴다 — 편집기는 화면에 그대로 남고 원고만 바뀐다
    const outline = within(screen.getByRole("navigation", { name: "단원" }));
    const sectionButton = (title: string) =>
      outline
        .getAllByRole("button", { name: new RegExp(title) })
        .find((button) => !button.hasAttribute("aria-label"))!;
    fireEvent.click(sectionButton("둘째 쪽"));
    expect(await screen.findByRole("textbox", { name: "본문" })).toHaveValue(
      "둘째 쪽 본문",
    );
    fireEvent.click(sectionButton("여는 쪽"));
    expect(
      await screen.findByRole("button", { name: "내용 수정" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "접기" })).toBeNull();
  });
});

describe("고친 구조의 지면 — 미리보기가 쓰는 실제 경로로 본다", () => {
  /** 미리보기 모형이 낸 블록을 실제 블록 렌더로 그린다 */
  function printed(detail: SectionDetail): string {
    const result = buildSectionPreview({
      edition: edition(),
      section: detail,
      variant: "student",
    });
    if (!result.ok) throw new Error(result.message);
    return result.model.sections
      .flatMap((section) => section.blocks)
      .map((block) => renderBlockHtml(block, result.resources))
      .join("\n");
  }
  const edit = (
    detail: SectionDetail,
    changes: [string, string][],
  ): SectionDetail => {
    const block = detail.blocks[0]!;
    const original = block.semantic!;
    return {
      ...detail,
      blocks: [
        {
          ...block,
          semantic: changes.reduce(
            (current, [key, value]) =>
              editStructure(original, current, key, value),
            original,
          ),
        },
      ],
    };
  };

  it("단원 도입: 고친 질문 · 목표 · 출발점이 지면에 나오고 옛 글은 나오지 않는다 — 본문에 남은 옛 글은 찍히지 않는다", () => {
    const opening = openings.openings[0]!;
    const detail = sectionWith("auto-unit-intro", introBlock());
    const before = printed(detail);
    expect(before).toContain(opening.question);

    const after = printed(
      edit(detail, [
        ["node.question", "고친 질문입니다"],
        ["node.goals.0", "고친 첫 목표"],
        ["node.check.1", "고친 둘째 출발점"],
        ["title", "고친 도입 제목"],
      ]),
    );
    expect(after).toContain("고친 질문입니다");
    expect(after).toContain("고친 첫 목표");
    expect(after).toContain("고친 둘째 출발점");
    expect(after).toContain("고친 도입 제목");
    expect(after).not.toContain(opening.question);
    // 본문(markdown)에는 옛 질문이 그대로 남아 있다 — 그래도 지면은 구조에서 나온다
    expect(
      detail.blocks[0]!.kind === "text" && detail.blocks[0]!.text,
    ).toContain(opening.question);
  });

  it("질문 기록: 고친 질문이 나오고, 작성선은 질문마다 고른 수만큼 찍힌다", () => {
    const detail = sectionWith("auto-question-log", logBlock());
    const count = (html: string) =>
      html.split('class="tb-semantic-line"').length - 1;
    expect(count(printed(detail))).toBe(3 * 4);
    const after = printed(
      edit(detail, [
        ["node.prompts.0", "고친 첫 질문"],
        ["node.lines", "6"],
      ]),
    );
    expect(after).toContain("고친 첫 질문");
    expect(after).not.toContain("소단원·문항 번호와 막힌 부분을 적으세요.");
    expect(count(after)).toBe(3 * 6);
  });

  it("손대지 않은 구조는 지면도 그대로다", () => {
    const detail = sectionWith("auto-unit-intro", introBlock());
    expect(printed(edit(detail, []))).toBe(printed(detail));
    const reverted = edit(detail, [
      ["node.question", "잠깐 고친 질문"],
      ["node.question", openings.openings[0]!.question],
    ]);
    expect(printed(reverted)).toBe(printed(detail));
    expect(JSON.stringify(reverted)).toBe(JSON.stringify(detail));
  });
});
