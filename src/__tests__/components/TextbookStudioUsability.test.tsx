/**
 * 관리자 사용성 점검 후속 — 교재 제작 화면(T01~T07 · D05 · D06).
 *
 * 화면이 «그렇게 그렸다»를 되비추지 않는다. 재는 것은 실패 경로다:
 * 저장하지 않은 원고를 덮는 이동 · 확정은 됐는데 다시 읽기가 실패한 발행 · 개념만 저장되고 구획에 잇지 못한 상태 ·
 * 늦게 끝난 내보내기 · 보지 않은 내용의 해시로 보내는 영상 연결.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  TextbookStudioView,
  leavingHref,
} from "@/components/textbook/TextbookStudioView";
import {
  installDialogPolyfill,
  pickContent,
} from "@/__tests__/helpers/textbookContentPicker";
import { requestTextbookNavigation } from "@/lib/textbook/navigation";

const book: BookSummary = {
  bookId: "book-1",
  title: "분수의 덧셈",
  shared: false,
  archived: false,
  activeEditionId: "edition-1",
};

function editionOf(
  status: "draft" | "published" = "draft",
  unitCount = 1,
): EditionDetail {
  const units = Array.from({ length: unitCount }, (_, index) => ({
    unitKey: `unit-${index + 1}`,
    title: index === 0 ? "분수의 덧셈" : `단원 ${index + 1}`,
  }));
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
      outline: units.map((unit, index) => ({
        ...unit,
        sourceUnitIds: [],
        prerequisites: [],
        goals: [],
        conceptLectureRefs: [],
        sections:
          index === 0
            ? [
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
              ]
            : [],
      })),
    } as unknown as NonNullable<EditionDetail["structureSource"]>,
    units: units.map((unit, index) => ({
      ...unit,
      sections:
        index === 0
          ? [
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
            ]
          : [],
    })),
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

async function openStudio(client: TextbookStudioApi) {
  const view = render(<TextbookStudioView api={client} />);
  fireEvent.click(await screen.findByRole("button", { name: "열기" }));
  fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
  expect(await screen.findByRole("textbox", { name: "대사" })).toBeVisible();
  return view;
}

const edit = (value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: "대사" }), {
    target: { value },
  });

/** 새로고침 · 탭 닫기를 흉내 낸다 — 화면이 막으면 true */
installDialogPolyfill();

const closing = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

/** 작업실이 다른 화면으로 바꾸려 한다 — 붙잡히지 않았으면 true(부른 쪽이 바로 이동) */
const leaveWorkspace = (proceed: () => void) => {
  let allowed = true;
  act(() => {
    allowed = requestTextbookNavigation(proceed);
  });
  return allowed;
};

const prompt = () => screen.getByRole("group", { name: "저장하지 않은 수정" });
const noPrompt = () =>
  expect(
    screen.queryByRole("group", { name: "저장하지 않은 수정" }),
  ).not.toBeInTheDocument();

function wireConcept(
  overrides: Partial<TextbookConcept> = {},
): TextbookConcept {
  return {
    conceptKey: "common-denominator",
    unitKey: "unit-1",
    sectionKey: "dialogue",
    title: "통분",
    kind: "정의",
    unitId: null,
    body: {
      goal: "",
      prerequisites: [],
      definition: "분모를 같게 한다",
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

const conceptDraft: ConceptDraft = {
  conceptKey: "orphan",
  title: "통분",
  kind: "정의",
  goal: "",
  prerequisites: "",
  definition: "분모를 같게 한다",
  conditions: "",
  examples: "",
  counterexamples: "",
  misconceptions: "",
  explainPrompt: "",
  blankForms: ["term", "cloze"],
};

type Material = Awaited<ReturnType<TextbookStudioApi["readPreviewMaterial"]>>;

/** 문항 하나의 확정본이 든 미리보기 자료 */
function material(
  contentHash = "a".repeat(64),
  content = "처음 본 내용",
  concepts: TextbookConcept[] = [],
): Material {
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
    concepts,
    qrTargets: [],
    conceptQrTargets: [],
  } as unknown as Material;
}

let revoke: ReturnType<typeof vi.fn>;
beforeEach(() => {
  navigation.push.mockClear();
  // jsdom 에는 없다 — 화면이 주소를 해제하는지 본다
  revoke = vi.fn();
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revoke,
    configurable: true,
    writable: true,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("교재 편집 칸 키보드 이동", () => {
  it("원고와 미리보기의 선택, 포커스, 연결된 패널을 함께 바꾼다", async () => {
    render(<TextbookStudioView api={api()} viewport="mobile" />);
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    const tabs = within(screen.getByRole("tablist", { name: "편집 칸" }));
    const manuscript = tabs.getByRole("tab", { name: "원고" });
    const preview = tabs.getByRole("tab", { name: "미리보기" });
    manuscript.focus();
    expect(manuscript.tabIndex).toBe(0);
    expect(preview.tabIndex).toBe(-1);
    fireEvent.keyDown(manuscript, { key: "ArrowRight" });
    expect(preview).toHaveFocus();
    expect(preview).toHaveAttribute("aria-selected", "true");
    expect(
      document.getElementById(preview.getAttribute("aria-controls")!),
    ).toHaveAttribute("aria-labelledby", preview.id);
    fireEvent.keyDown(preview, { key: "Home" });
    expect(manuscript).toHaveFocus();
    expect(
      document.getElementById(manuscript.getAttribute("aria-controls")!),
    ).toHaveAttribute("aria-labelledby", manuscript.id);
    fireEvent.keyDown(manuscript, { key: "End" });
    expect(preview).toHaveFocus();
    fireEvent.keyDown(preview, { key: "ArrowLeft" });
    expect(manuscript).toHaveFocus();
    expect(manuscript.tabIndex).toBe(0);
    expect(preview.tabIndex).toBe(-1);
  });
});

describe("T01 — 구획 정답 메모", () => {
  it("저장 요청에 실리고, PDF 에 인쇄되지 않는다고 원고와 미리보기에서 알린다", async () => {
    const saveSection = vi.fn(async () => ({
      revision: 4,
      aggregateRevision: 10,
    }));
    await openStudio(api({ saveSection }));
    const memo = screen.getByRole("textbox", { name: "구획 정답 메모" });
    expect(memo).toHaveValue("11/12");
    expect(memo).toHaveAccessibleDescription(/PDF에 인쇄되지 않습니다/);
    fireEvent.change(memo, { target: { value: "새 메모" } });
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    expect(saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        section: expect.objectContaining({ answer: "새 메모" }),
      }),
    );

    // 교사용 지면 — 메모는 지면 밖에 «인쇄되지 않음»과 함께 보인다
    fireEvent.click(screen.getByRole("button", { name: "교사용" }));
    const note = screen.getByRole("note", { name: "구획 정답 메모" });
    expect(note).toHaveTextContent("PDF에 인쇄되지 않음");
    expect(note).toHaveTextContent("새 메모");
    expect(screen.getByRole("region", { name: "지면" })).not.toHaveTextContent(
      "새 메모",
    );
    // 학생용 지면 — 어디에도 없다
    fireEvent.click(screen.getByRole("button", { name: "학생용" }));
    expect(
      screen.queryByRole("note", { name: "구획 정답 메모" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("새 메모")).not.toBeInTheDocument();
  });
});

describe("T02 · T03 — 저장하지 않은 원고를 덮는 이동", () => {
  it("완성 보기에서 다른 구획을 눌러도 원고를 덮지 않고 묻는다", async () => {
    await openStudio(api());
    edit("고친 문장");
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    pickContent({ group: "연습" });
    // 경고는 완성 보기에서도 보인다 — 원고를 덮지 않았다(아래에서 고친 문장이 그대로인 것을 본다)
    expect(prompt()).toBeVisible();
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "계속 편집" }),
    );
    noPrompt();
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "고친 문장",
    );
  });

  it("완성 보기에서 목록을 눌러도 확인 칸이 보이고, 버리기를 고르면 목록으로 간다", async () => {
    await openStudio(api());
    edit("고친 문장");
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(prompt()).toBeVisible();
    // 아직 떠나지 않았다
    expect(screen.queryByRole("button", { name: "열기" })).toBeNull();
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    );
    expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
  });

  it("저장 후 이동을 거듭 눌러도 저장은 한 번이다", async () => {
    let release!: (value: {
      revision: number;
      aggregateRevision: number;
    }) => void;
    const saveSection = vi.fn(
      () =>
        new Promise<{ revision: number; aggregateRevision: number }>(
          (resolve) => {
            release = resolve;
          },
        ),
    );
    await openStudio(api({ saveSection }));
    edit("고친 문장");
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    const go = within(prompt()).getByRole("button", { name: "저장 후 이동" });
    fireEvent.click(go);
    fireEvent.click(go);
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    expect(go).toBeDisabled();
    expect(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    ).toBeDisabled();
    release({ revision: 4, aggregateRevision: 10 });
    expect(await screen.findByRole("button", { name: "열기" })).toBeVisible();
    expect(saveSection).toHaveBeenCalledOnce();
    expect(saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        section: expect.objectContaining({
          blocks: [
            expect.objectContaining({
              turns: [expect.objectContaining({ text: "고친 문장" })],
            }),
          ],
        }),
      }),
    );
  });

  it("고친 것이 남아 있을 때만 새로고침 · 탭 닫기를 경고한다 — 원래 값으로 되돌리면 풀린다", async () => {
    await openStudio(api());
    expect(closing()).toBe(false);
    edit("고친 문장");
    expect(closing()).toBe(true);
    edit("저장된 문장");
    expect(closing()).toBe(false);
  });

  it("화면이 보이는 동안 다른 경로로 나가는 링크는 먼저 묻고, 버리기를 고르면 그 경로로 간다", async () => {
    render(
      <div>
        <a href="/account">내정보</a>
        <TextbookStudioView api={api()} />
      </div>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    edit("고친 문장");
    // fireEvent 는 기본 동작이 막혔으면 false 를 돌려준다
    expect(fireEvent.click(screen.getByRole("link", { name: "내정보" }))).toBe(
      false,
    );
    expect(prompt()).toBeVisible();
    expect(navigation.push).not.toHaveBeenCalled();
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    );
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/account"),
    );
  });

  it("작업실의 다른 화면에 가려져 있으면 링크를 막지 않는다 — 보이지 않는 확인 칸에 갇히지 않는다", async () => {
    const { container } = render(
      <div>
        <a href="/account">내정보</a>
        <main>
          <TextbookStudioView api={api()} />
        </main>
      </div>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    edit("고친 문장");
    container.querySelector("main")!.hidden = true;
    const link = screen.getByRole("link", { name: "내정보" });
    let blocked: boolean | null = null;
    link.addEventListener("click", (event) => {
      blocked = event.defaultPrevented;
      event.preventDefault(); // jsdom 이 실제로 이동하려 들지 않게
    });
    fireEvent.click(link);
    expect(blocked).toBe(false);
    expect(
      screen.queryByRole("group", { name: "저장하지 않은 수정", hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("새 탭 · 내려받기 · 다른 출처 · 같은 화면 안의 이동은 «떠나는 링크»가 아니다", () => {
    const probe = (
      attributes: Record<string, string>,
      init: MouseEventInit = {},
    ) => {
      const anchor = document.createElement("a");
      for (const [name, value] of Object.entries(attributes))
        anchor.setAttribute(name, value);
      document.body.append(anchor);
      let result: string | null = "not-called";
      anchor.addEventListener("click", (event) => {
        result = leavingHref(event);
        event.preventDefault();
      });
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, ...init }),
      );
      anchor.remove();
      return result;
    };
    expect(probe({ href: "/account?tab=security#password" })).toBe(
      "/account?tab=security#password",
    );
    expect(probe({ href: "/files/a.pdf", download: "" })).toBeNull();
    expect(probe({ href: "/account", target: "_blank" })).toBeNull();
    expect(probe({ href: "https://example.com/account" })).toBeNull();
    expect(probe({ href: "#bank" })).toBeNull();
    expect(probe({ href: "/account" }, { ctrlKey: true })).toBeNull();
    expect(probe({ href: "/account" }, { button: 1 })).toBeNull();
  });
});

describe("T04 — 발행 확정 뒤의 다시 읽기", () => {
  const job = { jobId: "job-1", issues: [], completedSteps: 1, totalSteps: 1 };

  async function reserveAndFinalize(client: TextbookStudioApi) {
    await openStudio(client);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확정" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "확정" }));
  }

  it("확정이 성공하면 다시 읽기 전에 잠그고, 읽기가 실패하면 읽기만 다시 시도한다", async () => {
    const openEdition = vi
      .fn()
      .mockResolvedValueOnce(editionOf())
      .mockRejectedValueOnce(
        new TextbookRequestError("판본을 읽지 못했습니다.", 503),
      )
      .mockResolvedValueOnce(editionOf("published"));
    const finalize = vi.fn(async () => ({
      ...job,
      status: "finalized" as const,
    }));
    await reserveAndFinalize(
      api({
        openEdition,
        reserve: vi.fn(async () => ({ ...job, status: "ready" as const })),
        finalize,
      }),
    );
    const failed = await screen.findByRole("alert");
    expect(failed).toHaveTextContent(
      "발행은 완료되었습니다. 최신 판본 상태를 불러오지 못했습니다.",
    );
    expect(failed).toHaveTextContent("판본을 읽지 못했습니다.");
    // 다시 읽지 못했어도 이미 잠겼다 — 원고를 고칠 수 없고 확정도 다시 보낼 수 없다
    expect(
      screen.getByText(
        "발행되었거나 보관된 교재입니다. 원고를 고치려면 새 초안을 만드세요.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "확정" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다시 출제" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "원고" }));
    expect(screen.getByRole("textbox", { name: "대사" })).toBeDisabled();

    fireEvent.click(
      within(failed).getByRole("button", { name: "판본 다시 불러오기" }),
    );
    await waitFor(() => expect(openEdition).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    // 다시 시도한 것은 읽기뿐이다
    expect(finalize).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    expect(
      screen.getByRole("link", { name: "학생용 PDF 내려받기" }),
    ).toBeVisible();
  });

  it("확정 응답을 받지 못하면 다시 보내지 않고 판본부터 읽어 발행 여부를 확인한다", async () => {
    const openEdition = vi
      .fn()
      .mockResolvedValueOnce(editionOf())
      .mockResolvedValueOnce(editionOf("published"));
    const finalize = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await reserveAndFinalize(
      api({
        openEdition,
        reserve: vi.fn(async () => ({ ...job, status: "ready" as const })),
        finalize,
      }),
    );
    // 판본을 읽어 보니 발행돼 있었다 — 잠그고, 확정은 한 번만 보냈다
    expect(
      await screen.findByText(
        "발행되었거나 보관된 교재입니다. 원고를 고치려면 새 초안을 만드세요.",
      ),
    ).toBeVisible();
    expect(openEdition).toHaveBeenCalledTimes(2);
    expect(finalize).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "확정" })).toBeDisabled();
  });

  it("확정 응답도 판본 읽기도 실패하면 «결과를 모른다»고 알리고 읽기만 다시 권한다", async () => {
    const openEdition = vi
      .fn()
      .mockResolvedValueOnce(editionOf())
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const finalize = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await reserveAndFinalize(
      api({
        openEdition,
        reserve: vi.fn(async () => ({ ...job, status: "ready" as const })),
        finalize,
      }),
    );
    const unknown = await screen.findByRole("alert");
    expect(unknown).toHaveTextContent(
      "발행 결과를 확인하지 못했습니다. 판본 상태를 다시 불러와 확인해 주세요.",
    );
    fireEvent.click(
      within(unknown).getByRole("button", { name: "판본 다시 불러오기" }),
    );
    await waitFor(() => expect(openEdition).toHaveBeenCalledTimes(3));
    expect(finalize).toHaveBeenCalledOnce();
  });

  it("저장하지 않은 수정이 있으면 확정을 보내지 않는다 — 발행하면 그 수정을 저장할 길이 없다", async () => {
    const finalize = vi.fn();
    await openStudio(
      api({
        reserve: vi.fn(async () => ({ ...job, status: "ready" as const })),
        finalize,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확정" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "원고" }));
    edit("고친 문장");
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "확정" }));
    expect(
      await screen.findByText("수정한 원고를 저장한 뒤 발행해 주세요."),
    ).toBeVisible();
    expect(finalize).not.toHaveBeenCalled();
  });
});

describe("T05 — 개념 저장과 구획 연결", () => {
  const savedConcept = (input: { conceptKey: string }) => ({
    revision: 1,
    aggregateRevision: 11,
    concept: wireConcept({ conceptKey: input.conceptKey }),
  });

  async function createConcept() {
    fireEvent.change(screen.getByRole("textbox", { name: "개념 키" }), {
      target: { value: "common-denominator" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "개념 제목" }), {
      target: { value: "통분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "개념 원고 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "개념 저장" }));
  }

  it("개념은 저장되고 구획 연결이 실패하면 그 상태를 남기고, 다시 시도는 연결만 한다", async () => {
    const saveConcept = vi.fn(async (input: { conceptKey: string }) =>
      savedConcept(input),
    ) as unknown as TextbookStudioApi["saveConcept"];
    const saveSection = vi
      .fn()
      .mockRejectedValueOnce(
        new TextbookRequestError("다른 곳에서 구획을 고쳤습니다.", 409),
      )
      .mockResolvedValueOnce({ revision: 5, aggregateRevision: 13 });
    // 다시 시도할 때 서버의 지금 구획을 읽는다 — 남이 고쳐 revision 이 올라가 있다
    const getSection = vi
      .fn()
      .mockResolvedValueOnce(section())
      .mockResolvedValue(section({ revision: 4 }));
    await openStudio(api({ saveConcept, saveSection, getSection }));
    edit("고친 문장");
    await createConcept();

    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("개념 저장 완료 · 구획 연결 실패");
    expect(failure).toHaveTextContent("다른 곳에서 구획을 고쳤습니다.");
    expect(saveConcept).toHaveBeenCalledOnce();
    // 연결은 저장된 구획에 블록만 더해 보냈다 — 저장하지 않은 문장은 싣지 않았다
    expect(saveSection).toHaveBeenCalledOnce();
    expect(saveSection.mock.calls[0]![0]).toMatchObject({
      expectedRevision: 3,
      section: {
        blocks: [
          { kind: "dialogue", turns: [{ text: "저장된 문장" }] },
          { kind: "concept", conceptKey: "common-denominator" },
        ],
      },
    });
    // 원고와 개념은 그대로 남아 있다
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "고친 문장",
    );
    expect(screen.getByRole("group", { name: "개념 원고" })).toBeVisible();

    fireEvent.click(
      within(failure).getByRole("button", { name: "구획 연결 다시 시도" }),
    );
    await waitFor(() => expect(saveSection).toHaveBeenCalledTimes(2));
    // 개념을 다시 만들지 않았다 — 연결만 했고, 서버의 지금 revision 위에 붙였다
    expect(saveConcept).toHaveBeenCalledOnce();
    expect(saveSection.mock.calls[1]![0]).toMatchObject({
      expectedRevision: 4,
      section: {
        blocks: [
          { kind: "dialogue" },
          { kind: "concept", conceptKey: "common-denominator" },
        ],
      },
    });
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("textbox", { name: "대사" })).toHaveValue(
      "고친 문장",
    );
  });

  it("다시 시도했을 때 서버에 이미 붙어 있으면 다시 쓰지 않는다", async () => {
    const saveConcept = vi.fn(async (input: { conceptKey: string }) =>
      savedConcept(input),
    ) as unknown as TextbookStudioApi["saveConcept"];
    const saveSection = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const linked = section({ revision: 4 });
    linked.blocks.push({
      id: "concept-block",
      kind: "concept",
      conceptKey: "common-denominator",
    });
    // 첫 요청은 응답만 잃었다 — 서버에는 붙어 있다
    const getSection = vi
      .fn()
      .mockResolvedValueOnce(section())
      .mockResolvedValue(linked);
    await openStudio(api({ saveConcept, saveSection, getSection }));
    await createConcept();
    const failure = await screen.findByRole("alert");
    fireEvent.click(
      within(failure).getByRole("button", { name: "구획 연결 다시 시도" }),
    );
    expect(
      await screen.findByText("구획에 개념을 연결했습니다."),
    ).toBeVisible();
    expect(saveSection).toHaveBeenCalledOnce();
    expect(saveConcept).toHaveBeenCalledOnce();
  });

  it("저장돼 있지만 놓이지 않은 개념을 골라 이 구획에 잇는다 — 개념을 새로 만들지 않는다", async () => {
    const saveSection = vi.fn(async () => ({
      revision: 4,
      aggregateRevision: 10,
    }));
    const saveConcept = vi.fn();
    const readConcept = vi.fn(async () => ({
      revision: 2,
      concept: wireConcept({ conceptKey: "orphan", sectionKey: null }),
      draft: conceptDraft,
    })) as unknown as TextbookStudioApi["readConcept"];
    await openStudio(
      api({
        readPreviewMaterial: vi.fn(async () =>
          material("a".repeat(64), "내용", [
            wireConcept({ conceptKey: "orphan", sectionKey: null }),
            wireConcept({ conceptKey: "placed", sectionKey: "practice" }),
          ]),
        ),
        saveSection,
        saveConcept,
        readConcept,
      }),
    );
    const choice = await screen.findByRole("combobox", { name: "저장된 개념" });
    expect(
      within(choice).getByRole("option", { name: "통분 · orphan" }),
    ).toBeInTheDocument();
    // 이미 어느 구획에 놓인 개념은 고르기에 없다
    expect(within(choice).queryByRole("option", { name: /placed/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "이 구획에 연결" }));
    expect(
      await screen.findByText("구획에 개념을 연결했습니다."),
    ).toBeVisible();
    expect(saveSection).toHaveBeenCalledOnce();
    expect(saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 3,
        section: expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({ kind: "concept", conceptKey: "orphan" }),
          ]),
        }),
      }),
    );
    expect(readConcept).toHaveBeenCalledWith("edition-1", "orphan");
    expect(saveConcept).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "개념 원고" })).toBeVisible();
  });
});

describe("T06 — 가져오기 오류", () => {
  it("가져오기 칸 옆에 자리와 함께 뜨고, 판본 검수 항목과 섞이지 않는다", async () => {
    const importPackage = vi.fn(async () => ({
      mode: "archive" as const,
      rejected: true as const,
      issues: [
        {
          severity: "error" as const,
          message: "구획 열쇠가 겹칩니다.",
          path: "units › 0 › sections › 1",
        },
      ],
    }));
    render(<TextbookStudioView api={api({ importPackage })} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "기존 원고 가져오기" }),
    );
    const panel = screen.getByRole("region", { name: "가져오기" });
    fireEvent.change(within(panel).getByLabelText("파일"), {
      target: {
        files: [new File(["{}"], "교재.json", { type: "application/json" })],
      },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "올리기" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "가져오지 못했습니다. 아래 항목을 고친 뒤 다시 올려 주세요.",
    );
    const list = within(panel).getByRole("list", {
      name: "가져오기 확인 항목",
    });
    expect(list).toHaveTextContent("units › 0 › sections › 1");
    expect(list).toHaveTextContent("구획 열쇠가 겹칩니다.");
    expect(importPackage).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "archive", fileName: "교재.json" }),
    );
    // 고친 파일을 다시 올릴 수 있다
    expect(within(panel).getByRole("button", { name: "올리기" })).toBeEnabled();

    // 책을 열어도 판본 검수에는 섞이지 않는다
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    fireEvent.click(screen.getByRole("button", { name: "검수" }));
    expect(screen.getByText("표시할 검수 항목이 없습니다.")).toBeVisible();
    expect(screen.queryByText("구획 열쇠가 겹칩니다.")).toBeNull();
  });

  it("통신 실패도 가져오기 칸에 뜬다", async () => {
    const importPackage = vi.fn(async () => {
      throw new TextbookRequestError("파일이 너무 큽니다.", 413);
    });
    render(<TextbookStudioView api={api({ importPackage })} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "기존 원고 가져오기" }),
    );
    const panel = screen.getByRole("region", { name: "가져오기" });
    fireEvent.change(within(panel).getByLabelText("파일"), {
      target: { files: [new File(["{}"], "교재.json")] },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "올리기" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "가져오지 못했습니다. 파일이 너무 큽니다.",
    );
  });
});

describe("T07 — 내보낸 파일 링크", () => {
  it("그 판본의 것만 보이고, 목록으로 나가면 주소를 해제하며 다시 열어도 남아 있지 않다", async () => {
    const readExport = vi.fn(async () => ({
      href: "blob:first",
      label: "교환 파일",
    }));
    await openStudio(api({ readExport }));
    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    const link = await screen.findByRole("link", {
      name: "분수의 덧셈 교환 파일",
    });
    expect(link).toHaveAttribute("href", "blob:first");
    expect(link).toHaveAttribute("download", "textbook-edition-1-r9.json");
    expect(revoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    expect(revoke).toHaveBeenCalledWith("blob:first");
    expect(screen.queryByRole("link", { name: /교환 파일/ })).toBeNull();
  });

  it("원고를 저장해 판본이 바뀌면 지난 내보내기 링크를 거둔다", async () => {
    const saveSection = vi.fn(async () => ({
      revision: 4,
      aggregateRevision: 10,
    }));
    await openStudio(
      api({
        readExport: vi.fn(async () => ({
          href: "blob:old",
          label: "교환 파일",
        })),
        saveSection,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    await screen.findByRole("link", { name: "분수의 덧셈 교환 파일" });
    edit("고친 문장");
    fireEvent.click(screen.getByRole("button", { name: "이 구획 저장" }));
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /교환 파일/ })).toBeNull(),
    );
    await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:old"));
  });

  it("늦게 끝난 내보내기는 화면에 올리지 않고 주소를 해제한다", async () => {
    let release!: (value: { href: string; label: string }) => void;
    const readExport = vi.fn(
      () =>
        new Promise<{ href: string; label: string }>((resolve) => {
          release = resolve;
        }),
    );
    await openStudio(api({ readExport }));
    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    release({ href: "blob:late", label: "교환 파일" });
    await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:late"));
    expect(screen.queryByRole("link", { name: /교환 파일/ })).toBeNull();
  });

  it("저장하지 않은 수정이 있으면 내보내지 않는다 — 파일에는 저장된 원고만 들어간다", async () => {
    const readExport = vi.fn();
    await openStudio(api({ readExport }));
    edit("고친 문장");
    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    expect(
      await screen.findByText("수정한 원고를 저장한 뒤 내보내 주세요."),
    ).toBeVisible();
    expect(readExport).not.toHaveBeenCalled();
  });
});

describe("D05 — 배정과 새 구획", () => {
  it("발행 전 판본의 배정은 사유를 먼저 보이고 보내지 않는다", async () => {
    const createAssignment = vi.fn();
    await openStudio(
      api({
        listAssignments: vi.fn(async () => []),
        listClasses: vi.fn(async () => [{ id: "class-1", label: "월수반" }]),
        createAssignment,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "배정" }));
    const panel = await screen.findByRole("region", { name: "배정" });
    expect(within(panel).getByRole("note")).toHaveTextContent(
      "발행한 판본만 배정할 수 있습니다. 발행 탭에서 확정한 뒤 배정하세요.",
    );
    await within(panel).findByRole("option", { name: "월수반" });
    const add = within(panel).getByRole("button", { name: "배정 추가" });
    expect(add).toBeDisabled();
    fireEvent.submit(add.closest("form")!);
    expect(createAssignment).not.toHaveBeenCalled();
  });

  it("반 목록을 불러오는 동안에는 «반이 없습니다»라고 하지 않는다", async () => {
    let release!: (value: { id: string; label: string }[]) => void;
    await openStudio(
      api({
        openEdition: vi.fn(async () => editionOf("published")),
        listAssignments: vi.fn(async () => []),
        listClasses: vi.fn(
          () =>
            new Promise<{ id: string; label: string }[]>((resolve) => {
              release = resolve;
            }),
        ),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "배정" }));
    const panel = await screen.findByRole("region", { name: "배정" });
    expect(
      within(panel).getByRole("option", {
        name: "반 목록을 불러오는 중입니다",
      }),
    ).toBeInTheDocument();
    expect(within(panel).queryByText("반이 없습니다")).toBeNull();
    expect(
      within(panel).getByRole("button", { name: "배정 추가" }),
    ).toBeDisabled();
    release([]);
    expect(
      await within(panel).findByRole("option", { name: "반이 없습니다" }),
    ).toBeInTheDocument();
    expect(within(panel).getByText("배정할 대상이 없습니다.")).toBeVisible();
  });

  it("새 구획은 고른 단원에 넣고, 구획 키를 비우면 겹치지 않는 키를 지어 보낸다", async () => {
    const two = editionOf("draft", 2);
    const createSection = vi.fn(async (input: { unitKey: string }) =>
      section({ sectionId: "section-9", unitKey: input.unitKey }),
    ) as unknown as TextbookStudioApi["createSection"];
    await openStudio(
      api({ openEdition: vi.fn(async () => two), createSection }),
    );
    // 기본값은 지금 연 구획의 단원이다
    const unit = screen.getByRole("combobox", { name: "넣을 단원" });
    expect(unit).toHaveValue("unit-1");
    fireEvent.change(unit, { target: { value: "unit-2" } });
    fireEvent.change(screen.getByRole("textbox", { name: "새 구획 제목" }), {
      target: { value: "유형 연습" },
    });
    expect(screen.getByRole("combobox", { name: "지면 틀" })).toHaveValue(
      "basic",
    );
    fireEvent.click(screen.getByRole("button", { name: "구획 추가" }));
    await waitFor(() => expect(createSection).toHaveBeenCalledOnce());
    expect(createSection).toHaveBeenCalledWith(
      expect.objectContaining({
        unitKey: "unit-2",
        templateKey: "basic",
        title: "유형 연습",
        sectionKey: expect.stringMatching(/^s-[0-9a-f]{8}$/),
      }),
    );
  });

  it("구획 키와 지면 틀의 직접 입력은 그대로 쓸 수 있다", async () => {
    const createSection = vi.fn(async () =>
      section({ sectionId: "section-9" }),
    ) as unknown as TextbookStudioApi["createSection"];
    await openStudio(api({ createSection }));
    fireEvent.change(screen.getByRole("textbox", { name: "새 구획 제목" }), {
      target: { value: "유형 연습" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "지면 틀" }), {
      target: { value: "custom" },
    });
    // 틀을 적기 전에는 보낼 수 없다
    expect(screen.getByRole("button", { name: "구획 추가" })).toBeDisabled();
    fireEvent.change(
      screen.getByRole("textbox", { name: "지면 틀 직접 입력" }),
      { target: { value: "template.dialogue" } },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "구획 키" }), {
      target: { value: "my-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "구획 추가" }));
    await waitFor(() => expect(createSection).toHaveBeenCalledOnce());
    expect(createSection).toHaveBeenCalledWith(
      expect.objectContaining({
        unitKey: "unit-1",
        sectionKey: "my-key",
        templateKey: "template.dialogue",
      }),
    );
  });
});

describe("D06 — 영상 등록과 연결", () => {
  const registered = (title: string): VideoBinding => ({
    bindingId: "video-1",
    videoId: "video-1",
    snapshotId: "",
    role: "concept-prep",
    status: "draft",
    policy: "unknown",
    label: title,
    startSeconds: 0,
    endSeconds: null,
    contentHash: null,
  });

  it("유튜브 주소에서 영상 ID 만 꺼내 등록하고, 유튜브가 아닌 주소는 보내지 않는다", async () => {
    const createVideo = vi.fn(async (input: { title: string }) =>
      registered(input.title),
    ) as unknown as TextbookStudioApi["createVideo"];
    await openStudio(
      api({
        listVideos: vi.fn(async () => []),
        listVideoChoices: vi.fn(async () => []),
        createVideo,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "영상" }));
    const address = await screen.findByRole("textbox", {
      name: "유튜브 주소 또는 ID",
    });
    fireEvent.change(screen.getByRole("textbox", { name: "영상 제목" }), {
      target: { value: "통분 풀이" },
    });
    fireEvent.change(address, {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s" },
    });
    expect(screen.getByText("영상 ID dQw4w9WgXcQ")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "영상 등록" }));
    await waitFor(() => expect(createVideo).toHaveBeenCalledOnce());
    expect(createVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "통분 풀이",
        providerVideoId: "dQw4w9WgXcQ",
      }),
    );
    // 등록한 영상이 고르기에 들어온다 — 영상 번호를 외워 적지 않는다
    expect(
      await screen.findByRole("option", { name: "통분 풀이 · dQw4w9WgXcQ" }),
    ).toBeInTheDocument();

    fireEvent.change(address, {
      target: { value: "https://example.com/watch?v=dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "영상 등록" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "유튜브 주소나 11자 영상 ID를 넣어 주세요.",
    );
    expect(createVideo).toHaveBeenCalledOnce();
  });

  it("연결은 화면에서 본 내용의 해시를 보낸다 — 그사이 바뀐 최신 값을 몰래 채우지 않고, 서버의 409 를 그대로 보여 준다", async () => {
    const readPreviewMaterial = vi
      .fn()
      .mockResolvedValueOnce(material("a".repeat(64), "처음 본 내용"))
      .mockResolvedValue(material("b".repeat(64), "나중에 바뀐 내용"));
    const bindVideo = vi.fn(async () => {
      throw new TextbookRequestError(
        "검수한 뒤에 문항 내용이 바뀌었습니다. 다시 확인한 뒤 게시해 주세요.",
        409,
      );
    });
    await openStudio(
      api({
        readPreviewMaterial,
        listVideos: vi.fn(async () => []),
        listVideoChoices: vi.fn(async () => [
          { id: "video-1", label: "통분 풀이 · dQw4w9WgXcQ" },
        ]),
        patchEdition: vi.fn(async () => editionOf()),
        bindVideo,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "영상" }));
    await screen.findByRole("option", { name: "1번" });
    fireEvent.change(screen.getByRole("combobox", { name: "문항" }), {
      target: { value: "snap-1" },
    });
    const seen = screen.getByRole("group", { name: "확인한 문항 내용" });
    expect(seen).toHaveTextContent("처음 본 내용");

    // 그사이 판본이 바뀌어 화면의 자료가 새로 읽힌다 — 같은 문항의 내용 해시가 달라졌다
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    await waitFor(() => expect(readPreviewMaterial).toHaveBeenCalledTimes(2));
    // 확인한 내용은 본 그대로다
    expect(
      screen.getByRole("group", { name: "확인한 문항 내용" }),
    ).toHaveTextContent("처음 본 내용");

    fireEvent.click(screen.getByRole("button", { name: "영상 연결" }));
    await waitFor(() => expect(bindVideo).toHaveBeenCalledOnce());
    expect(bindVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: "snap-1",
        videoId: "video-1",
        contentHash: "a".repeat(64),
      }),
    );
    expect(
      await screen.findByText(
        "검수한 뒤에 문항 내용이 바뀌었습니다. 다시 확인한 뒤 게시해 주세요.",
      ),
    ).toBeVisible();
    expect(screen.getByText("연결된 영상이 없습니다.")).toBeVisible();
  });

  it("문항 내용을 확인하지 않고는 연결을 보내지 않는다", async () => {
    const bindVideo = vi.fn();
    await openStudio(
      api({
        readPreviewMaterial: vi.fn(async () => material()),
        listVideos: vi.fn(async () => []),
        listVideoChoices: vi.fn(async () => [
          { id: "video-1", label: "통분 풀이 · dQw4w9WgXcQ" },
        ]),
        bindVideo,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "영상" }));
    await screen.findByRole("option", { name: "1번" });
    fireEvent.click(screen.getByRole("button", { name: "영상 연결" }));
    expect(
      await screen.findByText(
        "문항과 영상을 고르고 문항 내용을 확인해 주세요.",
      ),
    ).toBeVisible();
    expect(bindVideo).not.toHaveBeenCalled();
  });

  it("고급 입력에 적은 값은 고른 값보다 먼저 쓴다", async () => {
    const bindVideo = vi.fn(async () => ({
      ...registered("영상"),
      bindingId: "bind-1",
      snapshotId: "snap-9",
      role: "problem-solution" as const,
    }));
    await openStudio(
      api({
        readPreviewMaterial: vi.fn(async () => material()),
        listVideos: vi.fn(async () => []),
        listVideoChoices: vi.fn(async () => []),
        bindVideo,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "영상" }));
    await screen.findByRole("option", { name: "1번" });
    fireEvent.change(screen.getByRole("textbox", { name: "확정본" }), {
      target: { value: "snap-9" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "영상 번호" }), {
      target: { value: "video-9" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "내용 해시" }), {
      target: { value: "c".repeat(64) },
    });
    fireEvent.click(screen.getByRole("button", { name: "영상 연결" }));
    await waitFor(() => expect(bindVideo).toHaveBeenCalledOnce());
    expect(bindVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: "snap-9",
        videoId: "video-9",
        contentHash: "c".repeat(64),
      }),
    );
  });
});

describe("T03 — 작업실이 교재 화면을 떠나려 할 때", () => {
  const line = () => screen.getByRole("textbox", { name: "대사" });

  it("고친 것이 없고 처리 중도 아니면 붙잡지 않는다 — 부른 쪽이 바로 이동한다", async () => {
    await openStudio(api());
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(true);
    expect(proceed).not.toHaveBeenCalled();
    noPrompt();
  });

  it("계속 편집을 고르면 이동하지 않고 입력이 그대로다", async () => {
    await openStudio(api());
    edit("고친 문장");
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(false);
    expect(prompt()).toBeVisible();
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "계속 편집" }),
    );
    noPrompt();
    expect(proceed).not.toHaveBeenCalled();
    expect(line()).toHaveValue("고친 문장");
  });

  it("버리고 이동을 고르면 원고를 되돌린 뒤 한 번 이동한다 — 교재는 연 채로 남는다", async () => {
    await openStudio(api());
    edit("고친 문장");
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(false);
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    );
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    noPrompt();
    expect(line()).toHaveValue("저장된 문장");
    // 고친 것이 없으니 이제는 붙잡지 않는다
    expect(leaveWorkspace(vi.fn())).toBe(true);
  });

  it("저장 후 이동은 저장이 성공한 뒤에만 이동하고, 저장 중에는 다른 이동도 붙잡는다", async () => {
    let release!: (value: {
      revision: number;
      aggregateRevision: number;
    }) => void;
    const saveSection = vi.fn(
      () =>
        new Promise<{ revision: number; aggregateRevision: number }>(
          (resolve) => {
            release = resolve;
          },
        ),
    );
    await openStudio(api({ saveSection }));
    edit("고친 문장");
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(false);
    const go = within(prompt()).getByRole("button", { name: "저장 후 이동" });
    fireEvent.click(go);
    fireEvent.click(go);
    await waitFor(() => expect(saveSection).toHaveBeenCalledOnce());
    expect(proceed).not.toHaveBeenCalled();
    // 저장이 도는 동안 다시 떠나려 하면 붙잡기만 한다 — 그 길은 부르지 않는다
    const second = vi.fn();
    expect(leaveWorkspace(second)).toBe(false);
    expect(
      screen.getByText("처리 중입니다. 끝난 뒤 다시 눌러 주세요."),
    ).toBeVisible();
    await act(async () => {
      release({ revision: 4, aggregateRevision: 10 });
    });
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    expect(second).not.toHaveBeenCalled();
    expect(saveSection).toHaveBeenCalledOnce();
    expect(line()).toHaveValue("고친 문장");
  });

  it("저장이 실패하면 이동하지 않고 원고와 확인 칸이 남는다", async () => {
    const saveSection = vi.fn(async () => {
      throw new TextbookRequestError("저장하지 못했습니다.", 500);
    });
    await openStudio(api({ saveSection }));
    edit("고친 문장");
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(false);
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "저장 후 이동" }),
    );
    expect(await screen.findByText("저장하지 못했습니다.")).toBeVisible();
    expect(proceed).not.toHaveBeenCalled();
    expect(line()).toHaveValue("고친 문장");
    expect(prompt()).toBeVisible();
  });

  it("이 화면이 가려져 있으면 붙잡지 않는다 — 다른 화면 사이의 이동을 막지 않는다", async () => {
    const { container } = render(
      <main>
        <TextbookStudioView api={api()} />
      </main>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "세부 편집" }));
    await screen.findByRole("textbox", { name: "대사" });
    edit("고친 문장");
    container.querySelector("main")!.hidden = true;
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(true);
    expect(proceed).not.toHaveBeenCalled();
  });

  it("불러오기 · 저장이 도는 동안에는 새로고침 · 탭 닫기도 경고하고, 작업실 이동도 붙잡는다", async () => {
    let release!: (value: SectionDetail) => void;
    const getSection = vi.fn(
      () =>
        new Promise<SectionDetail>((resolve) => {
          release = resolve;
        }),
    );
    render(<TextbookStudioView api={api({ getSection })} />);
    fireEvent.click(await screen.findByRole("button", { name: "열기" }));
    await waitFor(() => expect(getSection).toHaveBeenCalled());
    // 고친 것은 없지만 처리 중이다
    expect(closing()).toBe(true);
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(false);
    noPrompt();
    await act(async () => {
      release(section());
    });
    await screen.findByRole("button", { name: "세부 편집" });
    expect(closing()).toBe(false);
    expect(proceed).not.toHaveBeenCalled();
    expect(leaveWorkspace(vi.fn())).toBe(true);
  });
});

describe("T03 — 승인한 이동이 같은 이동을 다시 물어 올 때 (주소 동기화)", () => {
  /**
   * 작업실은 주소의 # · 뒤로가기를 이렇게 처리한다: 넘겨준 길(`proceed`)이 주소를 되돌려 놓고 같은 동기화를 다시 돌리며,
   * 그 동기화가 `requestTextbookNavigation` 을 **또** 부른다. 그때 화면은 아직 다시 그려지기 전이라
   * 「고친 것이 있다」는 옛 상태를 보고 있다 — 승인한 이동을 다시 붙잡으면 저장 · 버리기를 하고도 떠나지 못한다.
   */
  const reentrant = () => {
    const outcomes: boolean[] = [];
    const proceed = vi.fn(() => {
      outcomes.push(requestTextbookNavigation(() => {}));
    });
    return { outcomes, proceed };
  };

  it("버리고 이동 — 넘겨준 길이 다시 물어도 붙잡지 않는다", async () => {
    await openStudio(api());
    edit("고친 문장");
    const { outcomes, proceed } = reentrant();
    expect(leaveWorkspace(proceed)).toBe(false);
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    );
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    expect(outcomes).toEqual([true]);
    noPrompt();
  });

  it("저장 후 이동 — 저장이 끝난 직후 넘겨준 길이 다시 물어도 붙잡지 않는다", async () => {
    const saveSection = vi.fn(async () => ({
      revision: 4,
      aggregateRevision: 10,
    }));
    await openStudio(api({ saveSection }));
    edit("고친 문장");
    const { outcomes, proceed } = reentrant();
    expect(leaveWorkspace(proceed)).toBe(false);
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "저장 후 이동" }),
    );
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    expect(outcomes).toEqual([true]);
    expect(saveSection).toHaveBeenCalledOnce();
    noPrompt();
    expect(
      screen.queryByText("처리 중입니다. 끝난 뒤 다시 눌러 주세요."),
    ).not.toBeInTheDocument();
  });

  it("승인은 그 이동에만 쓰인다 — 다시 고치면 다음 이동은 다시 붙잡는다", async () => {
    await openStudio(api());
    edit("고친 문장");
    const { proceed } = reentrant();
    expect(leaveWorkspace(proceed)).toBe(false);
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    );
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    edit("또 고친 문장");
    const later = vi.fn();
    expect(leaveWorkspace(later)).toBe(false);
    expect(prompt()).toBeVisible();
    expect(later).not.toHaveBeenCalled();
  });

  it("넘겨준 길이 다시 묻지 않아도 승인이 남아 다음 이동을 그냥 보내지 않는다", async () => {
    await openStudio(api());
    edit("고친 문장");
    const proceed = vi.fn();
    expect(leaveWorkspace(proceed)).toBe(false);
    fireEvent.click(
      within(prompt()).getByRole("button", { name: "버리고 이동" }),
    );
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    edit("또 고친 문장");
    expect(leaveWorkspace(vi.fn())).toBe(false);
    expect(prompt()).toBeVisible();
  });
});
