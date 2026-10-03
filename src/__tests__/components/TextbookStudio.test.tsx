import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TextbookStudioApi } from "@/lib/textbook/client";
import { TextbookRequestError } from "@/lib/textbook/client";
import type {
  BookSummary,
  EditionDetail,
  SectionDetail,
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
  config: {
    paper: "A4",
    workLineMm: 7,
    answerPolicy: "never",
    volumeCode: "2-1-1",
    videoPolicy: "optional",
  },
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
    updateVideo: unused,
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
});
