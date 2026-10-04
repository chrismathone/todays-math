// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import {
  measurementHtml,
  renderBlockHtml,
  renderPageHtml,
  TEXTBOOK_CSS,
} from "@/lib/textbook/render/html";
import {
  editorialStage,
  editorialUnitAsset,
  type EditorialBlock,
  type EditorialStage,
} from "@/lib/textbook/render/editorial";
import type { TextbookPage } from "@/lib/textbook/layout/paginate";
import { textbookFixture } from "../helpers/textbookFixture";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
  editorialAssetUrl: (name: string) => `/reference/${name}`,
};
const base = {
  id: "editorial",
  sourceBlockId: "editorial",
  unitKey: "U03",
  sectionKey: "s1",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");

describe("v15 measured editorial page archetypes", () => {
  it.each(["student", "answers"] as const)(
    "renders original cover art, title, code and edition for %s",
    (variant) => {
      const model = createTextbookRenderModel(textbookFixture(), variant);
      model.title = "수와 식 <검증>";
      const cover: TextbookPage = {
        physicalPageIndex: 1,
        printedPageLabel: "1",
        unitKey: "",
        sectionKey: "",
        unitTitle: "",
        sectionTitle: "",
        kind: "cover",
        blocks: [],
      };
      const html = renderPageHtml(cover, model, resources);
      const dom = parse(html);
      expect(dom.querySelector("h1")?.textContent).toBe(model.title);
      expect(dom.querySelector(".tb-cover-code")?.textContent).toBe(
        model.config.displayCode,
      );
      expect(dom.querySelector(".tb-cover-art img")?.getAttribute("src")).toBe(
        "/reference/cover.png",
      );
      expect(
        dom.querySelector(".tb-cover-art img")?.getAttribute("alt"),
      ).toContain("수학 조형");
      expect(dom.querySelector(".tb-cover-top")?.textContent).toContain(
        "INJAEWON MATHEMATICS",
      );
      expect(dom.querySelector(".tb-cover-edition")?.textContent ?? "").toBe(
        variant === "answers" ? "정답과 해설" : "",
      );
    },
  );

  it.each([
    "concept",
    "recall",
    "basic",
    "practice",
    "application",
    "review",
  ] as EditorialStage[])(
    "gives %s headings six accessible tabs, subtitle and measured stage number",
    (stage) => {
      const heading: EditorialBlock & {
        subtitle: string;
        stageNumber: string;
      } = {
        ...base,
        kind: "heading",
        title: "정의와 조건",
        editorialStage: stage,
        subtitle: "직접 설명해 봅시다.",
        stageNumber: "07",
      };
      const dom = parse(renderBlockHtml(heading, resources));
      expect(dom.querySelector(".tb-section-heading")?.textContent).toBe(
        heading.title,
      );
      expect(dom.querySelector(".tb-stage-subtitle")?.textContent).toBe(
        heading.subtitle,
      );
      expect(dom.querySelector(".tb-stage-number")?.textContent).toBe("07");
      expect(dom.querySelectorAll(".tb-progress span")).toHaveLength(6);
      expect(dom.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
      expect(
        dom
          .querySelector(".tb-editorial")
          ?.getAttribute("data-editorial-stage"),
      ).toBe(stage);
    },
  );

  it("uses identical section context in measurement and placement without changing source blocks", () => {
    const model = createTextbookRenderModel(textbookFixture(1, 0), "student");
    const section = model.sections[0];
    section.templateKey = "rest";
    const heading = section.blocks[0];
    const before = JSON.stringify(heading);
    const page: TextbookPage = {
      physicalPageIndex: 2,
      printedPageLabel: "2",
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      unitTitle: section.unitTitle,
      sectionTitle: section.title,
      kind: "content",
      blocks: [
        {
          blockId: heading.id,
          column: 1,
          xMm: 16,
          yMm: 40,
          widthMm: 176,
          heightMm: 30,
        },
      ],
    };
    const measured = parse(measurementHtml(model, resources)).querySelector(
      ".tb-measure-block",
    )!;
    const placed = parse(renderPageHtml(page, model, resources)).querySelector(
      ".tb-block-inner",
    )!;
    expect(placed.innerHTML).toBe(measured.innerHTML);
    expect(
      placed.querySelector(".tb-rest-sprout img")?.getAttribute("src"),
    ).toBe("/reference/learning-sprout.png");
    expect(JSON.stringify(heading)).toBe(before);
    expect(
      parse(renderPageHtml(page, model, resources)).querySelector(
        ".tb-running-brand",
      )?.textContent,
    ).toBe("인재원 수학");
  });

  it("selects bounded original unit art and keeps all goals and prerequisites", () => {
    const block: EditorialBlock = {
      ...base,
      kind: "unit-intro",
      title: "순환소수와 분수",
      unitNumber: 5,
      goals: ["목표 원문"],
      prerequisites: ["준비 원문"],
    };
    const dom = parse(renderBlockHtml(block, resources));
    expect(dom.querySelector(".tb-unit-art img")?.getAttribute("src")).toBe(
      "/reference/u05.png",
    );
    expect(dom.querySelector(".tb-unit-number b")?.textContent).toBe("05");
    expect(dom.body.textContent).toContain("목표 원문");
    expect(dom.body.textContent).toContain("준비 원문");
    expect(editorialUnitAsset({ ...block, unitNumber: 9 })).toBe("u03.png");
    expect(
      editorialUnitAsset({ ...block, unitNumber: undefined, unitKey: "U00" }),
    ).toBe("u01.png");
  });

  it("distinguishes definition, conditions, examples, nonexamples and caution while preserving every field", () => {
    const block: RenderBlock = {
      ...base,
      kind: "concept",
      conceptKey: "C03",
      title: "유리수",
      continuation: false,
      qr: null,
      body: {
        goal: "목표 원문",
        prerequisites: ["준비 원문"],
        definition: "정의 원문",
        conditions: "조건 원문",
        examples: ["예 원문"],
        counterexamples: ["반례 원문"],
        misconceptions: ["주의 원문"],
        explainPrompt: "설명 원문",
      },
    };
    const dom = parse(renderBlockHtml(block, resources));
    for (const [selector, text] of [
      [".tb-goal", "목표 원문"],
      [".tb-definition", "정의 원문"],
      [".tb-conditions", "조건 원문"],
      [".tb-concept-examples", "예 원문"],
      [".tb-concept-nonexamples", "반례 원문"],
      [".tb-concept-caution", "주의 원문"],
      [".tb-prompt", "설명 원문"],
    ])
      expect(dom.querySelector(selector)?.textContent).toContain(text);
    expect(dom.querySelector(".tb-concept-number")?.textContent).toBe("03");
    expect(
      parse(
        renderBlockHtml({ ...block, continuation: true }, resources),
      ).querySelector(".tb-concept-title"),
    ).toBeNull();
  });

  it.each(["study", "keywords", "sentences"] as const)(
    "renders the %s recall sheet without restoring hidden source answers",
    (phase) => {
      const block: RenderBlock = {
        ...base,
        kind: "recall",
        phase,
        pieces: [
          { kind: "text", markdown: "공개 문장" },
          {
            kind: "blank",
            scope: phase === "sentences" ? "sentence" : "keyword",
          },
        ],
        repetitionChecks: phase === "study",
      };
      const dom = parse(renderBlockHtml(block, resources));
      expect(dom.querySelectorAll(".tb-recall-phases span")).toHaveLength(3);
      expect(dom.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
      expect(
        dom.querySelector(".tb-blank")?.getAttribute("aria-label"),
      ).toBeTruthy();
      expect(dom.body.textContent).toContain("공개 문장");
      expect(Boolean(dom.querySelector(".tb-repetition"))).toBe(
        phase === "study",
      );
    },
  );

  it("keeps ordinary student answers private and distinguishes intentional public worked examples", () => {
    const fixture = textbookFixture(1, 1);
    let model = createTextbookRenderModel(fixture, "student");
    const ordinary = model.sections[0].blocks.find(
      (b) => b.kind === "problem",
    )!;
    const html = renderBlockHtml(ordinary, resources);
    expect(html).not.toContain("비공개 정답");
    expect(html).not.toContain("비공개 해설");
    expect(parse(html).querySelector(".tb-work-lines")).not.toBeNull();
    fixture.items[0].learningStage = "worked-example";
    model = createTextbookRenderModel(fixture, "student");
    const worked = model.sections[0].blocks.find((b) => b.kind === "problem")!;
    const dom = parse(renderBlockHtml(worked, resources));
    expect(dom.querySelector(".tb-problem")?.getAttribute("aria-label")).toBe(
      "대표예제",
    );
    expect(dom.querySelector(".tb-worked-solution")?.textContent).toContain(
      "비공개 해설",
    );
    expect(dom.querySelector(".tb-work-lines")).toBeNull();
  });

  it("retains local resource safety and trusted fallback without runtime fetching", () => {
    const block: EditorialBlock = {
      ...base,
      kind: "heading",
      title: "단원",
      editorialStage: "unit",
    };
    expect(
      renderBlockHtml(block, { ...resources, editorialAssetUrl: undefined }),
    ).toContain("/textbook/editorial/u03.png");
    expect(() =>
      renderBlockHtml(block, {
        ...resources,
        editorialAssetUrl: () => "https://untrusted.example/image.png",
      }),
    ).toThrow(/고정 로컬/);
    expect(() =>
      renderBlockHtml(block, {
        ...resources,
        editorialAssetUrl: () => "javascript:alert(1)",
      }),
    ).toThrow(/고정 로컬/);
    expect(
      editorialStage({
        ...block,
        editorialStage: "<script>" as EditorialStage,
      }),
    ).toBe("concept");
    expect(TEXTBOOK_CSS).toContain("min-height:220mm");
  });
});
