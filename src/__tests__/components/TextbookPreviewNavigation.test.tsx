import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { EditionDetail, SectionDetail } from "@/components/textbook/model";
import type { TextbookStudioApi } from "@/lib/textbook/client";
import type { TextbookRenderModel } from "@/lib/textbook/render/model";
import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";
import {
  contentOutline,
  simpleSectionLabels,
} from "@/components/textbook/simpleNavigation";
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

// jsdom 에는 모달 API 가 없다(실제 넘김 · 초점은 브라우저 시험이 본다).
const patched = [
  [HTMLDialogElement.prototype, "showModal"],
  [HTMLDialogElement.prototype, "close"],
] as const;
const originals = patched.map(([target, name]) =>
  Object.getOwnPropertyDescriptor(target, name),
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() =>
  patched.forEach(([target, name], i) => {
    const original = originals[i];
    if (original) Object.defineProperty(target, name, original);
    else delete (target as unknown as Record<string, unknown>)[name];
  }),
);

/** 완성 보기를 연다 — 미리보기 카드에 표지가 조판돼 올라올 때까지. */
async function openPreview(client: TextbookStudioApi) {
  render(<TextbookStudioView api={client} />);
  fireEvent.click(await screen.findByRole("button", { name: "열기" }));
  const preview = await screen.findByRole("region", { name: "미리보기" });
  await waitFor(() =>
    expect(preview.querySelector(".tb-cover")).not.toBeNull(),
  );
  return preview;
}

/** 띠가 교재 전체를 다 조판할 때까지 — 안내 줄이 «조판 n/m 구획» 에서 «N쪽» 으로 바뀐다. */
const wholeBook = (preview: HTMLElement) =>
  within(preview).findByText(/넘겨 보고.*· \d+쪽$/);

const strip = (preview: HTMLElement) =>
  within(preview).getByRole("region", { name: "교재 지면" });

/** «지금 대단원 › 구획» 한 줄. */
const where = (preview: HTMLElement) =>
  preview.querySelector("[data-book-preview-where]")!.textContent;

/** «내용 고르기» 창에서 대단원 → 소단원(→ 활동)을 고른다. */
function pickContent(path: {
  unit: string;
  group: string | RegExp;
  activity?: string;
}) {
  fireEvent.click(screen.getByRole("button", { name: "내용 고르기" }));
  const dialog = screen.getByRole("dialog", { name: "내용 고르기" });
  const column = (name: string) => within(dialog).getByRole("group", { name });
  fireEvent.click(
    within(column("대단원")).getByRole("button", { name: path.unit }),
  );
  fireEvent.click(
    within(column("소단원")).getByRole("button", { name: path.group }),
  );
  if (path.activity)
    fireEvent.click(
      within(column("활동")).getByRole("button", { name: path.activity }),
    );
}

describe("textbook preview page and section navigation", () => {
  it("puts every captured production activity behind the content picker and keeps each destination", async () => {
    const { client, edition, sections } = capturedNavigationFixture();
    const preview = await openPreview(client);
    // 화면에는 구획 단추 벽이 없다 — 지금 보는 자리 한 줄과 «내용 고르기» 단추 하나다.
    expect(screen.queryByRole("navigation", { name: "교재 내용" })).toBeNull();
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
    // 세 단 목차(대단원 → 소단원 → 활동)는 이름표 전부를 차례대로, 하나씩만 담는다.
    const outline = contentOutline(
      edition,
      simpleSectionLabels(edition, sections[0]!),
    );
    const names = outline.flatMap((unit) =>
      unit.groups.flatMap((group) => group.entries.map((entry) => entry.label)),
    );
    expect(names).toEqual(expected);
    expect(new Set(names).size).toBe(expected.length);
    expect(outline.map((unit) => unit.title)).toEqual([
      "교재 사용 안내",
      "1. 수와 식",
      "찾아보기",
    ]);
    expect(
      outline[1]!.groups.map((group) => [group.title, group.entries.length]),
    ).toEqual([
      ["수와 식", 1],
      ["유리수와 소수", 18],
      ["쉬어가기 · 지도 위의 작은 걸음", 1],
    ]);
    expect(outline[1]!.groups[1]!.entries[9]).toMatchObject({
      sectionId: sections[14]!.sectionId,
      name: "자유 개념 백지",
    });
    expect(where(preview)).toBe("교재 사용 안내 › 표지 · 목차");

    pickContent({
      unit: "1. 수와 식",
      group: /^유리수와 소수/,
      activity: "자유 개념 백지",
    });
    await waitFor(() =>
      expect(where(preview)).toBe(
        "1. 수와 식 › 유리수와 소수 · 자유 개념 백지",
      ),
    );
    // 고르면 창이 닫히고, 다시 열면 지금 보는 구획에 표시가 있다.
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "내용 고르기" }));
    const dialog = screen.getByRole("dialog", { name: "내용 고르기" });
    expect(
      within(dialog).getByRole("button", { name: "자유 개념 백지" }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(dialog).getByRole("button", { name: "1. 수와 식" }),
    ).toHaveAttribute("aria-pressed", "true");
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

  it("lays the whole book out as one strip — the cover once, every section's pages in outline order, no turn or zoom buttons", async () => {
    const { client, sections } = fixture();
    const preview = await openPreview(client);
    await wholeBook(preview);
    const pages = strip(preview);
    // 표지는 첫 구획에만 한 번 — 뒤 구획에서 되풀이하지 않는다.
    expect(pages.querySelectorAll(".tb-cover")).toHaveLength(1);
    const text = pages.textContent!;
    const order = [
      "학습 안내 본문 1",
      "학습 안내 본문 2",
      "학습 안내 본문 3",
      "유형 연습 본문 1",
      "유형 연습 본문 2",
      "유형 연습 본문 3",
      "다음 단원 본문 1",
    ].map((body) => text.indexOf(body));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // 쪽 아래에는 구획 이름과 그 구획 안의 차례 — 전체 교재의 쪽 번호는 적지 않는다.
    const captions = [
      ...pages.querySelectorAll("[data-strip-key] > figcaption"),
    ].map((caption) => caption.querySelector("strong")!.textContent);
    expect([...new Set(captions)]).toEqual([
      "학습 안내",
      "유형 연습",
      "다음 단원",
    ]);
    expect(
      within(preview).getByText(
        /전체 교재의 쪽 번호와 이어 붙는\s+자리는 PDF에서 확인하세요/,
      ),
    ).toBeVisible();
    for (const name of ["이전 쪽", "다음 쪽", "맞춤", "넓게"])
      expect(within(preview).queryByRole("button", { name })).toBeNull();
    // 구획은 한 번씩만 읽는다 — 이미 연 구획은 다시 읽지 않는다.
    expect(
      vi
        .mocked(client.getSection)
        .mock.calls.map(([, sectionId]) => sectionId)
        .sort(),
    ).toEqual(sections.map((section) => section.sectionId).sort());
  });

  it("opens a page large from the strip and turns within the enlarged view", async () => {
    const { client } = fixture();
    const preview = await openPreview(client);
    await wholeBook(preview);
    fireEvent.click(
      within(preview).getByRole("button", { name: "유형 연습 1쪽 확대" }),
    );
    const dialog = screen.getByRole("dialog", { name: "지면 확대 보기" });
    // 띠의 쪽만 센다 — 표지 지면 안에도 figure 가 있다.
    const items = [
      ...strip(preview).querySelectorAll<HTMLElement>("[data-strip-key]"),
    ];
    const at = items.findIndex((item) =>
      within(item).queryByRole("button", { name: "유형 연습 1쪽 확대" }),
    );
    expect(
      within(dialog).getByText(`${at + 1} / ${items.length}쪽`),
    ).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("jumps the strip to a picked section and opens the editor on the section seen in the strip", async () => {
    const { client, sections } = fixture();
    const preview = await openPreview(client);
    await wholeBook(preview);
    expect(where(preview)).toBe("덧셈과 뺄셈 › 학습 안내");
    pickContent({ unit: "평면도형", group: "다음 단원" });
    await waitFor(() => expect(where(preview)).toBe("평면도형 › 다음 단원"));

    // 띠를 넘겨 «유형 연습» 이 맨 앞에 오게 한다 — jsdom 은 배치를 하지 않으니 자리를 정해 준다.
    const original = HTMLElement.prototype.getBoundingClientRect;
    const rect = (left: number) => ({
      left,
      right: left + 100,
      top: 0,
      bottom: 140,
      width: 100,
      height: 140,
      x: left,
      y: 0,
      toJSON: () => ({}),
    });
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const key = this.dataset.stripKey;
        if (!key) return original.call(this);
        return rect(key.startsWith(sections[1]!.sectionId) ? 10 : -500);
      });
    fireEvent.scroll(strip(preview));
    spy.mockRestore();
    expect(where(preview)).toBe("덧셈과 뺄셈 › 유형 연습");
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    expect(await screen.findByDisplayValue("유형 연습 본문 1")).toBeVisible();
  });

  it("switches the whole strip between the student paper and the answer paper", async () => {
    const { client } = fixture();
    const preview = await openPreview(client);
    await wholeBook(preview);
    const { measureTextbookPreview } =
      await import("@/lib/textbook/render/browser");
    const variants = () =>
      vi
        .mocked(measureTextbookPreview)
        .mock.calls.map(([model]) => model.variant);
    const before = variants().length;
    expect(new Set(variants())).toEqual(new Set(["student"]));
    fireEvent.click(
      within(
        within(preview).getByRole("group", { name: "지면 종류" }),
      ).getByRole("button", { name: "교사용" }),
    );
    await waitFor(() =>
      expect(variants().slice(before)).toEqual([
        "answers",
        "answers",
        "answers",
      ]),
    );
    await wholeBook(preview);
  });

  it("keeps the unsaved-edit guard and backward destination in the editor", async () => {
    const { client } = fixture();
    const preview = await openPreview(client);
    await wholeBook(preview);
    pickContent({ unit: "덧셈과 뺄셈", group: "유형 연습" });
    await waitFor(() => expect(where(preview)).toBe("덧셈과 뺄셈 › 유형 연습"));
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "본문" })[0]!, {
      target: { value: "수정한 유형 연습" },
    });
    const before = vi.mocked(client.getSection).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "이전 쪽" }));
    expect(
      await screen.findByRole("button", { name: "버리고 이동" }),
    ).toBeVisible();
    expect(client.getSection).toHaveBeenCalledTimes(before);
    fireEvent.click(screen.getByRole("button", { name: "버리고 이동" }));
    expect(
      await within(screen.getByRole("region", { name: "미리보기" })).findByText(
        "학습 안내 본문 3",
      ),
    ).toBeVisible();
  });

  it("draws unsaved edits in the strip and guards picking another section from the complete preview", async () => {
    const { client } = fixture();
    await openPreview(client);
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "본문" })[0]!, {
      target: { value: "아직 저장하지 않은 본문" },
    });
    fireEvent.click(screen.getByRole("button", { name: "완성 교재 보기" }));
    const preview = screen.getByRole("region", { name: "미리보기" });
    await wholeBook(preview);
    // 띠의 그 구획은 저장본이 아니라 지금 원고다.
    expect(
      within(strip(preview)).getByText("아직 저장하지 않은 본문"),
    ).toBeVisible();
    pickContent({ unit: "덧셈과 뺄셈", group: "유형 연습" });
    expect(
      await screen.findByText("저장하지 않은 수정이 있습니다."),
    ).toBeVisible();
    expect(where(preview)).toBe("덧셈과 뺄셈 › 학습 안내");
    fireEvent.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(where(preview)).toBe("덧셈과 뺄셈 › 학습 안내");
  });

  it("disables both turn controls in the editor while the next section loads, preventing duplicate requests", async () => {
    const { client, sections } = fixture();
    const complete = await openPreview(client);
    await wholeBook(complete);
    fireEvent.click(screen.getByRole("button", { name: "세부 편집" }));
    const preview = screen.getByRole("region", { name: "미리보기" });
    await waitFor(() =>
      expect(preview.querySelector(".tb-cover")).not.toBeNull(),
    );
    let completeSection: (section: SectionDetail) => void = () => {
      throw new Error("missing resolver");
    };
    const delayed = new Promise<SectionDetail>((resolve) => {
      completeSection = resolve;
    });
    vi.mocked(client.getSection).mockImplementationOnce(() => delayed);
    const before = vi.mocked(client.getSection).mock.calls.length;
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
    expect(client.getSection).toHaveBeenCalledTimes(before + 1);
    completeSection(sections[1]!);
    expect(await within(preview).findByText("유형 연습 본문 1")).toBeVisible();
    expect(next).toBeEnabled();
    expect(previous).toBeEnabled();
  });
});
