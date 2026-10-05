import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EditionDetail, SectionDetail } from "@/components/textbook/model";
import type { TextbookStudioApi } from "@/lib/textbook/client";
import type { TextbookRenderModel } from "@/lib/textbook/render/model";
import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";
import { simpleSectionLabels } from "@/components/textbook/simpleNavigation";
import productionNavigation from "@/__tests__/fixtures/textbookProductionNavigation.json";
import {
  alignTextbookSpreads,
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/textbook/quickCreateClient", () => ({
  httpQuickCreateApi: { listUnits: vi.fn(async () => ({ units: [] })) },
}));
// jsdom has no physical layout. Supply measured block sizes to the real paginator;
// keep the real preview model, SectionMeasure, spread renderer and navigation.
vi.mock("@/lib/textbook/render/browser", () => ({
  measureTextbookPreview: vi.fn(async (model: TextbookRenderModel) => {
    const measurements = model.sections.flatMap((section) =>
      section.blocks.map((block) => ({
        blockId: block.id,
        heightMm: block.kind === "heading" ? 10 : 140,
        widthMm: blockWidthMm(model.config, block),
      })),
    );
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      {
        includeCover: model.config.print.coverMode === "included",
      },
    );
    if (model.variant === "student") alignTextbookSpreads(layout.pages);
    return layout;
  }),
}));

import { TextbookStudioView } from "@/components/textbook/TextbookStudioView";

const editionId = "00000000-0000-4000-8000-000000000011";
const bookId = "00000000-0000-4000-8000-000000000010";

function fixture() {
  const sections: SectionDetail[] = [
    ["guide", "학습 안내", "unit-1", "even-left", 3],
    ["practice", "유형 연습", "unit-1", "continue", 3],
    ["review", "다음 단원", "unit-2", "continue", 1],
  ].map(([key, title, unitKey, parity, count], index) => ({
    sectionId: `00000000-0000-4000-8000-00000000002${index}`,
    editionId,
    unitKey: String(unitKey),
    sectionKey: String(key),
    templateKey: "learning-guide",
    title: String(title),
    parity: parity as SectionDetail["parity"],
    revision: 1,
    aggregateRevision: 1,
    status: "draft",
    parityMessage: null,
    blocks: Array.from({ length: Number(count) }, (_, blockIndex) => ({
      id: `${key}-${blockIndex}`,
      kind: "text" as const,
      text: `${title} 본문 ${blockIndex + 1}`,
    })),
    answer: "",
    portraits: [],
    picks: [],
    items: [],
    concept: null,
  }));
  const units = ["unit-1", "unit-2"].map((unitKey) => ({
    unitKey,
    title: unitKey === "unit-1" ? "덧셈과 뺄셈" : "평면도형",
    sections: sections
      .filter((section) => section.unitKey === unitKey)
      .map((section) => ({
        sectionId: section.sectionId,
        title: section.title,
        status: section.status,
        parity: section.parity,
      })),
  }));
  const edition: EditionDetail = {
    editionId,
    bookId,
    title: "초3 1학기",
    structureRevision: 1,
    aggregateRevision: 1,
    config: {
      paper: "A4",
      workLineMm: 7,
      answerPolicy: "never",
      volumeCode: "3-1-1",
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
    },
    units,
    structureSource: {
      book: {
        id: bookId,
        ownerId: "00000000-0000-4000-8000-000000000012",
        ownerName: "선생님",
        isOwner: true,
        title: "초3 1학기",
        visibility: "private",
        sharedBranchId: null,
        archivedAt: null,
        createdAt: "2026-10-03T00:00:00.000Z",
        updatedAt: "2026-10-03T00:00:00.000Z",
        draftEditionId: editionId,
        latestPublishedEditionId: null,
      },
      edition: {
        editionId,
        label: "1",
        status: "draft",
        revision: 1,
        publishedAt: null,
        manifestHash: null,
      },
      structureRevision: 1,
      config: {
        bookId,
        schoolLevel: "elementary",
        grade: 3,
        semester: 1,
        volume: 1,
        volumeCount: 1,
        title: "초3 1학기",
        displayCode: "3-1-1",
        curriculumVersion: "2022",
        mode: "integrated",
        pageBudget: { target: 32, tolerance: 0, strict: false },
        print: {
          paper: "A4",
          innerMarginMm: 15,
          outerMarginMm: 15,
          sectionStart: "even-left",
          coverMode: "included",
          firstPhysicalPageIndex: 1,
        },
        videoPolicy: "optional",
        studentSolutionPolicy: "never",
      },
      outline: units.map((unit) => ({
        unitKey: unit.unitKey,
        title: unit.title,
        sourceUnitIds: [],
        prerequisites: [],
        goals: [],
        conceptLectureRefs: [],
        sections: unit.sections.map((section) => ({
          id: section.sectionId,
          sectionKey: sections.find((s) => s.sectionId === section.sectionId)!
            .sectionKey,
          title: section.title,
          revision: 1,
        })),
      })),
      issues: [],
    },
  };
  const client = {
    listBooks: vi.fn(async () => [
      {
        bookId,
        title: edition.title,
        shared: false,
        archived: false,
        activeEditionId: editionId,
      },
    ]),
    openEdition: vi.fn(async () => edition),
    getSection: vi.fn(async (_editionId: string, sectionId: string) => {
      const section = sections.find((row) => row.sectionId === sectionId);
      if (!section) throw new Error("missing section fixture");
      return structuredClone(section);
    }),
    readPreviewMaterial: vi.fn(async () => ({
      items: [],
      snapshots: [],
      assets: [],
      concepts: [],
      qrTargets: [],
      conceptQrTargets: [],
    })),
  } as unknown as TextbookStudioApi;
  return { client, edition, sections };
}

function capturedNavigationFixture() {
  const base = fixture();
  const sections: SectionDetail[] = productionNavigation.units.flatMap((unit) =>
    unit.sections.map((section) => ({
      ...base.sections[0]!,
      sectionId: section.id,
      unitKey: unit.unitKey,
      sectionKey: section.sectionKey,
      templateKey: section.templateKey,
      title: section.title,
      parity: section.startPolicy as SectionDetail["parity"],
      blocks: section.blocks.map((block) => ({
        id: block.blockId,
        kind: "text" as const,
        text: block.markdown,
        semantic: block.semantic as TextbookSemantic,
      })),
    })),
  );
  const units = productionNavigation.units.map((unit) => ({
    unitKey: unit.unitKey,
    title: unit.title,
    sections: sections.filter((section) => section.unitKey === unit.unitKey),
  }));
  const edition: EditionDetail = {
    ...base.edition,
    units,
    structureSource: {
      ...base.edition.structureSource!,
      outline: productionNavigation.units.map((unit) => ({
        unitKey: unit.unitKey,
        title: unit.title,
        sourceUnitIds: [],
        prerequisites: [],
        goals: [],
        conceptLectureRefs: [],
        sections: unit.sections.map((section) => ({
          id: section.id,
          sectionKey: section.sectionKey,
          title: section.title,
          revision: 1,
        })),
      })),
    },
  };
  vi.mocked(base.client.openEdition).mockResolvedValue(edition);
  vi.mocked(base.client.getSection).mockImplementation(
    async (_editionId, sectionId) => {
      const section = sections.find((row) => row.sectionId === sectionId);
      if (!section) throw new Error("missing captured navigation section");
      return structuredClone(section);
    },
  );
  return { client: base.client, edition, sections };
}

async function openPreview(client: TextbookStudioApi) {
  render(<TextbookStudioView api={client} />);
  fireEvent.click(await screen.findByRole("button", { name: "열기" }));
  const preview = await screen.findByRole("region", { name: "미리보기" });
  await waitFor(() =>
    expect(preview.querySelector(".tb-cover")).not.toBeNull(),
  );
  return preview;
}

describe("textbook preview page and section navigation", () => {
  it("names all captured production activities and retains their destinations after leaving the contents", async () => {
    const { client, sections } = capturedNavigationFixture();
    const preview = await openPreview(client);
    const navigation = screen.getByRole("navigation", { name: "교재 내용" });
    const expected = [
      "표지 · 목차",
      "학습 안내",
      "학습 계획",
      "질문 기록",
      "수와 식",
      "유리수와 소수 · 개념 대화",
      "유리수와 소수 · 준비 학습",
      "유리수와 소수 · 오류 점검",
      "유리수와 소수 · 개념 이해",
      "유리수와 소수 · 용어 암기",
      "유리수와 소수 · 개념 학습",
      "유리수와 소수 · 핵심어 빈칸",
      "유리수와 소수 · 통문장 개념 암기",
      "유리수와 소수 · 대화 읽기 확인",
      "유리수와 소수 · 자유 개념 백지",
      "유리수와 소수 · 설명 활동",
      "유리수와 소수 · 개념 지도",
      "유리수와 소수 · 개념 기초 확인",
      "유리수와 소수 · 대표예제와 확인",
      "유리수와 소수 · 유형 연습",
      "유리수와 소수 · 추론 활동",
      "유리수와 소수 · 누적 복습",
      "유리수와 소수 · 단원 평가",
      "쉬어가기 · 지도 위의 작은 걸음",
      "개념 색인",
      "유형 색인",
    ];
    const names = () =>
      within(navigation)
        .getAllByRole("button")
        .map((button) => button.textContent);
    expect(names()).toEqual(expected);
    expect(new Set(names()).size).toBe(expected.length);
    expect(within(preview).getByText("표지", { exact: true })).toBeVisible();
    expect(
      within(navigation).getByRole("button", { name: "표지 · 목차" }),
    ).toHaveAttribute("aria-pressed", "true");

    const target = within(navigation).getByRole("button", {
      name: "유리수와 소수 · 자유 개념 백지",
    });
    fireEvent.click(target);
    await waitFor(() => expect(target).toHaveAttribute("aria-pressed", "true"));
    expect(client.getSection).toHaveBeenLastCalledWith(
      editionId,
      sections[14]!.sectionId,
    );
    expect(client.getSection).toHaveBeenCalledTimes(2);
    expect(names()).toEqual(expected);
    expect(preview.querySelector(".tb-cover")).toBeNull();
  });

  it("numbers repeated activity fragments in outline order without numbering different activities or changing input", () => {
    const { edition, sections } = capturedNavigationFixture();
    const contents = sections[0]!;
    const dialogue = sections[5]!;
    const references = contents.blocks[0]!.semantic!.node;
    if (references?.kind !== "references")
      throw new Error("missing captured contents references");
    const dialogueReference = references.entries.find(
      (entry) => entry.targetSectionKey === dialogue.sectionKey,
    )!;
    dialogueReference.label += " (1/7)";
    const second = {
      ...dialogue,
      sectionId: "dialogue-continuation",
      sectionKey: `${dialogue.sectionKey}.part-19`,
    };
    edition.units[1]!.sections.push(second);
    edition.structureSource!.outline[1]!.sections.push({
      id: second.sectionId,
      sectionKey: second.sectionKey,
      title: second.title,
      revision: 1,
    });
    references.entries.push({
      ...dialogueReference,
      key: second.sectionKey,
      targetSectionKey: second.sectionKey,
      label: "유리수와 소수 · 개념 대화 (2/7)",
    });
    const before = JSON.stringify({ edition, contents });
    const labels = simpleSectionLabels(edition, contents);
    expect(labels.get(dialogue.sectionId)).toBe(
      "유리수와 소수 · 개념 대화 (1/2)",
    );
    expect(labels.get(second.sectionId)).toBe(
      "유리수와 소수 · 개념 대화 (2/2)",
    );
    expect(labels.get(sections[10]!.sectionId)).toBe(
      "유리수와 소수 · 개념 학습",
    );
    expect(JSON.stringify({ edition, contents })).toBe(before);
  });

  it("preserves legacy/manual titles and rejects missing, unknown, renamed or other-edition metadata", () => {
    const { edition, sections } = capturedNavigationFixture();
    const contents = sections[0]!;
    const original = edition.units.flatMap((unit) =>
      unit.sections.map((section) => section.title),
    );
    for (const metadata of [
      null,
      { ...contents, templateKey: "manual-contents" },
      { ...contents, editionId: "another-edition" },
    ]) {
      expect([...simpleSectionLabels(edition, metadata).values()]).toEqual(
        original,
      );
    }
    const references = contents.blocks[0]!.semantic!.node;
    if (references?.kind !== "references")
      throw new Error("missing captured contents references");
    references.entries.find(
      (entry) => entry.targetSectionKey === sections[5]!.sectionKey,
    )!.label = "유리수와 소수 · 알 수 없는 활동";
    edition.units[1]!.sections[2]!.title = "선생님이 붙인 제목";
    const labels = simpleSectionLabels(edition, contents);
    expect(labels.get(sections[5]!.sectionId)).toBe("유리수와 소수");
    expect(labels.get(sections[6]!.sectionId)).toBe("선생님이 붙인 제목");
    expect(labels.get(sections[23]!.sectionId)).toBe(
      "쉬어가기 · 지도 위의 작은 걸음",
    );
  });

  it("names the contents alone when the cover is separate or belongs to another first section", () => {
    const { edition, sections } = capturedNavigationFixture();
    const contents = sections[0]!;
    edition.structureSource!.config.print.coverMode = "separate";
    expect(simpleSectionLabels(edition, contents).get(contents.sectionId)).toBe(
      "목차",
    );
    edition.structureSource!.config.print.coverMode = "included";
    edition.units[0]!.sections.reverse();
    expect(simpleSectionLabels(edition, contents).get(contents.sectionId)).toBe(
      "목차",
    );
  });

  it("advances from the cover through measured spreads and every continue section, then returns to the prior last spread", async () => {
    const { client, sections } = fixture();
    const preview = await openPreview(client);
    const next = within(preview).getByRole("button", { name: "다음 쪽" });
    const previous = within(preview).getByRole("button", { name: "이전 쪽" });
    expect(within(preview).getByText("표지", { exact: true })).toBeVisible();
    expect(previous).toBeDisabled();

    fireEvent.click(next);
    expect(await within(preview).findByText("학습 안내 본문 1")).toBeVisible();
    expect(within(preview).getByText("학습 안내 본문 2")).toBeVisible();
    expect(preview.querySelector(".tb-cover")).toBeNull();
    fireEvent.click(next);
    expect(await within(preview).findByText("학습 안내 본문 3")).toBeVisible();
    fireEvent.click(next);
    expect(await within(preview).findByText("유형 연습 본문 1")).toBeVisible();
    expect(preview.querySelector(".tb-cover")).toBeNull();
    expect(client.getSection).toHaveBeenLastCalledWith(
      editionId,
      sections[1]!.sectionId,
    );
    fireEvent.click(next);
    expect(await within(preview).findByText("유형 연습 본문 3")).toBeVisible();
    fireEvent.click(next);
    expect(await within(preview).findByText("다음 단원 본문 1")).toBeVisible();
    expect(next).toBeDisabled();
    expect(client.getSection).toHaveBeenLastCalledWith(
      editionId,
      sections[2]!.sectionId,
    );

    fireEvent.click(previous);
    expect(await within(preview).findByText("유형 연습 본문 3")).toBeVisible();
    expect(
      within(preview).queryByText("유형 연습 본문 1"),
    ).not.toBeInTheDocument();
    fireEvent.click(previous);
    expect(await within(preview).findByText("유형 연습 본문 1")).toBeVisible();
    fireEvent.click(previous);
    expect(await within(preview).findByText("학습 안내 본문 3")).toBeVisible();
    fireEvent.click(previous);
    expect(await within(preview).findByText("학습 안내 본문 1")).toBeVisible();
    fireEvent.click(previous);
    expect(
      await within(preview).findByText("표지", { exact: true }),
    ).toBeVisible();
    expect(preview.querySelector(".tb-cover")).not.toBeNull();
    // 쪽 번호가 없는 면에는 쪽 번호 안내도 없다
    expect(
      within(preview).queryByText(/구획 미리보기의 임시 쪽 번호입니다/),
    ).toBeNull();
    expect(previous).toBeDisabled();
    expect(client.getSection).toHaveBeenCalledTimes(5);
  });

  it("opens a selected body section without repeating the cover and preserves its section context", async () => {
    const { client } = fixture();
    const preview = await openPreview(client);
    const outline = screen.getByRole("navigation", { name: "교재 내용" });
    fireEvent.click(within(outline).getByRole("button", { name: "유형 연습" }));
    expect(await within(preview).findByText("유형 연습 본문 1")).toBeVisible();
    expect(preview.querySelector(".tb-cover")).toBeNull();
    expect(within(preview).getByText("유형 연습 · 2 · 3쪽")).toBeVisible();
    // 이 번호는 구획 하나만 놓고 센 것이다 — 전체 교재의 쪽 번호가 아님을 곁에 알린다
    expect(
      within(preview).getByText(
        "구획 미리보기의 임시 쪽 번호입니다. 전체 교재의 쪽 번호는 PDF에서 확인하세요.",
      ),
    ).toBeVisible();
  });

  it.each(["editor", "complete preview"])(
    "keeps the unsaved-edit guard and backward destination in %s",
    async (view) => {
      const { client } = fixture();
      const preview = await openPreview(client);
      fireEvent.click(
        within(screen.getByRole("navigation", { name: "교재 내용" })).getByRole(
          "button",
          { name: "유형 연습" },
        ),
      );
      await within(preview).findByText("유형 연습 본문 1");
      fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
      fireEvent.change(screen.getAllByRole("textbox", { name: "본문" })[0]!, {
        target: { value: "수정한 유형 연습" },
      });
      if (view === "complete preview") {
        fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
      }
      fireEvent.click(screen.getByRole("button", { name: "이전 쪽" }));
      expect(
        await screen.findByRole("button", { name: "버리고 이동" }),
      ).toBeVisible();
      expect(client.getSection).toHaveBeenCalledTimes(2);
      fireEvent.click(screen.getByRole("button", { name: "버리고 이동" }));
      expect(
        await within(
          screen.getByRole("region", { name: "미리보기" }),
        ).findByText("학습 안내 본문 3"),
      ).toBeVisible();
    },
  );

  it("guards direct section selection after returning to the complete preview with unsaved edits", async () => {
    const { client } = fixture();
    await openPreview(client);
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "본문" })[0]!, {
      target: { value: "아직 저장하지 않은 본문" },
    });
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "교재 내용" })).getByRole(
        "button",
        { name: "유형 연습" },
      ),
    );
    expect(
      await screen.findByText("저장하지 않은 수정이 있습니다."),
    ).toBeVisible();
    expect(client.getSection).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(client.getSection).toHaveBeenCalledTimes(1);
  });

  it("disables both turn controls while the next section loads, preventing duplicate requests", async () => {
    const { client, sections } = fixture();
    let completeSection: (section: SectionDetail) => void = () => {
      throw new Error("missing resolver");
    };
    const delayed = new Promise<SectionDetail>((resolve) => {
      completeSection = resolve;
    });
    vi.mocked(client.getSection)
      .mockResolvedValueOnce(sections[0]!)
      .mockImplementationOnce(() => delayed);
    const preview = await openPreview(client);
    const next = within(preview).getByRole("button", { name: "다음 쪽" });
    const previous = within(preview).getByRole("button", { name: "이전 쪽" });
    fireEvent.click(next);
    await within(preview).findByText("학습 안내 본문 1");
    fireEvent.click(next);
    await within(preview).findByText("학습 안내 본문 3");
    fireEvent.click(next);
    expect(next).toBeDisabled();
    expect(previous).toBeDisabled();
    fireEvent.click(next);
    fireEvent.click(previous);
    expect(client.getSection).toHaveBeenCalledTimes(2);
    completeSection(sections[1]!);
    expect(await within(preview).findByText("유형 연습 본문 1")).toBeVisible();
    expect(next).toBeEnabled();
    expect(previous).toBeEnabled();
  });
});
