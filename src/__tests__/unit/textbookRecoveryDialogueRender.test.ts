// @vitest-environment node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { getTextbookCharacter } from "@/lib/textbook/characters";
import {
  conceptScriptFor,
  conceptScriptForCast,
  conceptScriptSectionKeys,
  type ConceptScriptRole,
  type ConceptTeachingScript,
} from "@/lib/textbook/conceptScripts";
import {
  DIALOGUE_BACKDROP,
  DIALOGUE_FIT,
  dialogueGapMm,
  dialogueLessonRuns,
  dialogueMarkdownHtml,
  dialogueSizeSteps,
  dialogueSizeStyle,
  dialogueSpeakerLabel,
  displayStyleMath,
  isDialoguePlacement,
  renderDialogueBoardHtml,
  renderDialogueContinueHtml,
  renderDialogueGuideHtml,
  renderDialogueHtml,
  renderDialogueInlineHtml,
  renderDialogueLessonTitleHtml,
  solveDialogueSize,
  type DialogueRenderFields,
} from "@/lib/textbook/render/blocks/dialogue";
import { DIALOGUE_CSS } from "@/lib/textbook/render/blocks/dialogueCss";
import type { RenderResources } from "@/lib/textbook/render/blocks/shared";
import {
  inlineBundleCss,
  loadTextbookLocalBundle,
} from "@/lib/textbook/render/bundle.server";
import type { EditorialBlock } from "@/lib/textbook/render/editorial";
import { TEXTBOOK_CSS } from "@/lib/textbook/render/html";
import { renderTextbookMarkdown } from "@/lib/textbook/render/markdown";

type DialogueBlock = Extract<EditorialBlock, { kind: "dialogue" }> &
  DialogueRenderFields;
type TextBlock = Extract<EditorialBlock, { kind: "text" }>;
type Cast = Record<ConceptScriptRole, string>;

const DEFAULT_CAST: Cast = {
  teacher: "teacher-f1",
  student1: "student-f1",
  student2: "student-m1",
};
const OTHER_CAST: Cast = {
  teacher: "teacher-f2",
  student1: "student-f5",
  student2: "student-m4",
};
const resources: RenderResources = {
  assetUrl: (id) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const base = {
  sourceBlockId: "dialogue",
  unitKey: "u01",
  sectionKey: "lesson",
  kind: "dialogue" as const,
};

/** The route's own projection of a manuscript turn, with the chosen cast. */
function blocksOf(script: ConceptTeachingScript, cast: Cast): DialogueBlock[] {
  return script.dialogue.map((turn, index) => ({
    ...base,
    id: `dialogue.turn-${index}`,
    speakerId: `tb-portrait-${cast[turn.role]}`,
    portraitAssetId: `asset-${cast[turn.role]}`,
    side: turn.role === "teacher" ? "left" : "right",
    expression: turn.expression,
    mirrorPortrait: turn.role !== "teacher",
    markdown: turn.markdown,
    presentation: turn.presentation,
    castRole: turn.role,
  }));
}
const nameOf = (id: string) => getTextbookCharacter(id)!.name;
const studentNames = (cast: Cast) => ({
  student1: nameOf(cast.student1),
  student2: nameOf(cast.student2),
});
const KEY = "중2::1. 수와 식::유리수와 소수";
const ALL_KEYS = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"].flatMap(
  (grade) => [
    ...conceptScriptSectionKeys(grade, 1),
    ...conceptScriptSectionKeys(grade, 2),
  ],
);
const lessonOne = (cast: Cast) =>
  blocksOf(conceptScriptForCast(KEY, studentNames(cast))!, cast).filter(
    (block) => block.presentation?.lessonKey === "v15:U01:1",
  );
const attr = (html: string, name: string) =>
  new RegExp(` ${name}="([^"]*)"`).exec(html)?.[1];

describe("a speech turn", () => {
  it("keeps each cast role in its place and names the chosen speaker, whoever is cast", () => {
    for (const cast of [DEFAULT_CAST, OTHER_CAST]) {
      const blocks = lessonOne(cast);
      expect(blocks).toHaveLength(14);
      for (const block of blocks.filter(
        (item) => item.presentation!.kind === "speech",
      )) {
        const html = renderDialogueHtml(block, resources);
        const teacher = block.castRole === "teacher";
        expect(html).toContain(
          `tb-dialogue-${teacher ? "left" : "right"} tb-speaker-${teacher ? "teacher" : "student"}`,
        );
        expect(attr(html, "data-dialogue-role")).toBe(
          teacher ? "teacher" : "student",
        );
        expect(attr(html, "data-dialogue-cast")).toBe(block.castRole);
        expect(attr(html, "data-dialogue-kind")).toBe("speech");
        expect(attr(html, "data-speaker-id")).toBe(block.speakerId);
        const name = nameOf(cast[block.castRole!]);
        expect(html).toContain(`<span class="tb-portrait-name">${name}</span>`);
        // The expression sheet is always cut to one face; it is never shown whole.
        expect(html).toContain(
          `tb-portrait-frame tb-expression-${block.expression}`,
        );
        expect(html).toContain("data-textbook-portrait-atlas");
        expect(html.includes("tb-frame-mirrored")).toBe(!teacher);
        expect(html).toContain(`/assets/asset-${cast[block.castRole!]}.png`);
      }
    }
    // The teacher's label carries "선생님" once, however the frozen name was written.
    const [first] = lessonOne(OTHER_CAST);
    for (const speakerName of [
      "지은",
      "지은 선생님",
      "지은 선생님 선생님",
      " 지은선생님 ",
    ])
      expect(
        renderDialogueHtml({ ...first!, speakerName }, resources),
      ).toContain('<span class="tb-portrait-name">지은 선생님</span>');
    expect(dialogueSpeakerLabel("선생님", "teacher")).toBe("선생님");
    expect(dialogueSpeakerLabel(" 도현 ", "student")).toBe("도현");
    // A frozen cast name wins over the character table, and only in the label.
    const student = lessonOne(OTHER_CAST).find(
      (block) => block.castRole === "student1",
    )!;
    const renamed = renderDialogueHtml(
      { ...student, speakerName: "하늘" },
      resources,
    );
    expect(renamed).toContain('<span class="tb-portrait-name">하늘</span>');
    expect(renamed).not.toContain(">다은<");
  });

  it("writes the chosen names only where the manuscript anchors them and never inside another word", () => {
    const html = lessonOne(OTHER_CAST)
      .map((block) => renderDialogueHtml(block, resources))
      .join("");
    expect(html).toContain("다은은 쓰인 모양을, 도현은 그 수의 값을 봤어.");
    expect(html).not.toMatch(/민서|지호/);
    // "짝지은" contains a teacher's name; the renderer replaces nothing in the text.
    const paired = conceptScriptForCast("중3::7. 통계::산점도와 상관관계", {
      student1: "지은",
      student2: "도현",
    })!;
    const turn = blocksOf(paired, OTHER_CAST).find(
      (block) =>
        block.markdown.includes("짝지은") &&
        block.presentation!.kind === "speech",
    )!;
    expect(renderDialogueHtml(turn, resources)).toContain("짝지은");
    expect(
      renderDialogueHtml({ ...turn, speakerName: "지은" }, resources),
    ).toContain("짝지은");
  });

  it("carries the lesson and the size as escaped attributes for QA", () => {
    const [block] = lessonOne(DEFAULT_CAST);
    const html = renderDialogueHtml(
      {
        ...block!,
        presentation: {
          kind: "speech",
          lessonKey: 'U01"><script>',
          lessonTitle: 'a < b & "c" $x^2$',
        },
        dialogueSizePt: 9.8,
      },
      resources,
    );
    expect(html).toContain(
      'data-lesson-key="U01&quot;&gt;&lt;script&gt;" data-lesson-title="a &lt; b &amp; &quot;c&quot; $x^2$"',
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain(
      'data-dialogue-font-pt="9.8" style="--tb-dialogue-size:9.8pt"',
    );
    // Without the fields the turn inherits the size from an ancestor and states none.
    const plain = renderDialogueHtml(
      { ...block!, presentation: undefined, castRole: undefined },
      resources,
    );
    expect(plain.slice(0, plain.indexOf(">") + 1)).toBe(
      '<div class="tb-dialogue tb-dialogue-atlas tb-dialogue-left tb-speaker-teacher" data-expression="question" data-speaker-id="tb-portrait-teacher-f1" data-dialogue-role="teacher" data-dialogue-kind="speech">',
    );
    for (const size of [9.25, 10.6, 9.1, Number.NaN])
      expect(() =>
        renderDialogueHtml({ ...block!, dialogueSizePt: size }, resources),
      ).toThrow(/글자 크기/);
  });

  it("shows an unknown speaker's portrait as the one picture it is, exactly as before", () => {
    for (const speakerId of [
      "teacher",
      "student1",
      "tb-portrait-custom",
      "tb-portrait-teacher-x9",
      "student-m1",
    ]) {
      const block: DialogueBlock = {
        ...base,
        id: "legacy",
        speakerId,
        portraitAssetId: "legacy-portrait",
        side: "right",
        expression: "aha",
        mirrorPortrait: true,
        markdown: "분수 $\\frac12$",
        presentation: {
          kind: "speech",
          lessonKey: "v15:U01:1",
          lessonTitle: "제목",
        },
        speakerName: "다은",
        dialogueSizePt: 9.8,
      };
      expect(renderDialogueHtml(block, resources)).toBe(
        `<div class="tb-dialogue tb-dialogue-right" data-expression="aha"><div class="tb-portrait tb-mirrored"><img data-textbook-image src="/assets/legacy-portrait.png" alt="${speakerId}"></div><div class="tb-bubble"><strong>${speakerId}</strong>${renderTextbookMarkdown("분수 $\\frac12$")}</div></div>`,
      );
    }
  });
});

describe("formulas in a dialogue", () => {
  it("sets fractions in display style without changing the stored text", () => {
    expect(displayStyleMath("값은 $\\frac{18}{6}$과 $3$이다.")).toBe(
      "값은 $\\displaystyle \\frac{18}{6}$과 $\\displaystyle 3$이다.",
    );
    const once = displayStyleMath("$\\frac12$");
    expect(displayStyleMath(once)).toBe(once);
    expect(displayStyleMath("$$\\frac12$$")).toBe("$$\\frac12$$");
    expect(displayStyleMath("값 $x")).toBe("값 $x");
    expect(displayStyleMath("수식 없음")).toBe("수식 없음");
    const block = Object.freeze({
      ...lessonOne(DEFAULT_CAST)[0]!,
    }) as DialogueBlock;
    const stored = block.markdown;
    const html = renderDialogueHtml(block, resources);
    expect(block.markdown).toBe(stored);
    expect(stored).toContain("$\\frac{18}{6}$");
    const display = renderTextbookMarkdown("$\\displaystyle \\frac{18}{6}$");
    const inline = renderTextbookMarkdown("$\\frac{18}{6}$");
    expect(display).not.toBe(inline);
    expect(html).toContain(display.replace(/^<p>|<\/p>$/g, ""));
    expect(html).not.toContain(inline.replace(/^<p>|<\/p>$/g, ""));
  });
});

describe("emphasis next to a formula", () => {
  it("prints as emphasis even when a particle follows the formula", () => {
    const source =
      "답은 **$28\\div4=7$**입니다. **굵게**와 **$1$**과 **$2$**로";
    // The shared renderer leaves these marks as asterisks.
    expect(renderTextbookMarkdown(source)).toContain("**");
    const html = dialogueMarkdownHtml(source);
    expect(html).not.toContain("**");
    expect(html.match(/<strong>/g)).toHaveLength(4);
    expect(html.match(/<\/strong>/g)).toHaveLength(4);
    expect(html).toContain(
      "<strong>굵게</strong>와 <strong><span data-textbook-math>",
    );
    // Pairs never join across paragraphs, and text without marks is left as it was.
    const apart = ["가 **나", "다** 라"].join("\n\n");
    expect(dialogueMarkdownHtml(apart)).toBe(renderTextbookMarkdown(apart));
    expect(dialogueMarkdownHtml(apart)).toContain("**");
    expect(dialogueMarkdownHtml("그냥 문장")).toBe("<p>그냥 문장</p>");
  });
});

describe("a board", () => {
  it("is a board with its own title, formula and note, not a person's bubble", () => {
    const boards = lessonOne(DEFAULT_CAST).filter(
      (block) => block.presentation!.kind === "board",
    );
    expect(boards).toHaveLength(1);
    const html = renderDialogueHtml(boards[0]!, resources);
    expect(html).toMatch(
      /^<div class="tb-dialogue-board" data-dialogue-role="board"/,
    );
    expect(html).not.toMatch(/tb-bubble|tb-portrait|<img|tb-speaker-/);
    expect(html).toContain(
      '<small class="tb-board-title"><i aria-hidden="true"></i><span>같은 수를 다른 모습으로</span></small>',
    );
    expect(html).toContain(
      '<div class="tb-board-formula"><p><span data-textbook-math>',
    );
    expect(html).not.toContain("tb-board-note");
    expect(attr(html, "data-lesson-title")).toBe(
      "분수 모양이면 모두 같은 종류일까?",
    );
    // The board on the next page has a note under its formula.
    const noted = blocksOf(conceptScriptFor(KEY)!, DEFAULT_CAST).find(
      (block) =>
        block.presentation!.lessonKey === "v15:U01:2" &&
        block.presentation!.kind === "board",
    )!;
    const second = renderDialogueHtml(noted, resources);
    expect(second).toContain("끝나는 소수와 끝없이 이어지는 소수");
    expect(second).toMatch(
      /<div class="tb-board-note"><p>.*이 계속 이어진다\.<\/p><\/div>/,
    );
    // A board taken from a bank statement is prose with its key words, not one formula.
    const law = ALL_KEYS.flatMap((key) =>
      blocksOf(conceptScriptFor(key)!, DEFAULT_CAST),
    ).find(
      (block) =>
        block.presentation!.kind === "board" &&
        block.markdown.startsWith("**덧셈의 교환법칙**"),
    )!;
    expect(law.presentation).toMatchObject({
      kind: "board",
      lessonTitle: "덧셈의 교환법칙",
    });
    const third = renderDialogueHtml(law, resources);
    expect(third).toContain("<span>덧셈의 교환법칙</span>");
    expect(third).toContain('<div class="tb-board-text"><p>');
    expect(third).not.toMatch(/tb-board-formula|tb-board-note|tb-bubble/);
    expect(third).toContain(
      renderTextbookMarkdown("$\\displaystyle a+b=b+a$").replace(
        /^<p>|<\/p>$/g,
        "",
      ),
    );
  });

  it("renders every board and every speech turn of the 360 manuscripts", () => {
    let boards = 0;
    let speech = 0;
    expect(ALL_KEYS).toHaveLength(360);
    const scripts = ALL_KEYS.map((key) => conceptScriptFor(key)!);
    for (const script of scripts)
      for (const block of blocksOf(script, OTHER_CAST)) {
        const html = renderDialogueHtml(block, resources);
        if (block.presentation!.kind === "board") {
          boards += 1;
          expect(html.startsWith('<div class="tb-dialogue-board"')).toBe(true);
          expect(html).toContain("tb-board-title");
          expect(/tb-board-formula|tb-board-text/.test(html)).toBe(true);
          expect(html).not.toContain("tb-bubble");
        } else {
          speech += 1;
          expect(html).toContain('class="tb-bubble"');
          expect(html).toContain("tb-portrait-frame");
        }
        expect(attr(html, "data-lesson-key")).toBe(
          block.presentation!.lessonKey,
        );
        // No emphasis mark is left printed as an asterisk.
        expect(html.includes("**"), block.markdown).toBe(false);
      }
    expect([boards, speech]).toEqual([187, 7605]);
  });

  it("renders the raw v15 board that a text block carries in its board node", () => {
    const block: TextBlock = {
      id: "board-1",
      sourceBlockId: "board-1",
      unitKey: "U01",
      sectionKey: "opening",
      kind: "text",
      markdown: "원본 판서",
      semantic: {
        activity: "dialogue",
        title: "나눗셈이 끝나지 않는다면?",
        source: {
          unit: "U01",
          page: 11,
          kind: "opening",
          path: "pages[10].script.blocks[6]",
        },
        node: {
          kind: "board",
          title: "끝나는 소수와 끝없이 이어지는 소수",
          tex: "\\frac38=0.375\\qquad \\frac13=0.333\\ldots",
          note: "[[0.333=0.333000\\ldots]]이고, {{[[0.333\\ldots]]}}에서는 [[3]]이 {{계속}} 이어진다.",
        },
      },
    };
    const html = renderDialogueBoardHtml(block, resources);
    expect(html).toMatch(
      /^<div class="tb-dialogue-board" data-dialogue-role="board" data-dialogue-kind="board" data-lesson-key="U01" data-lesson-title="나눗셈이 끝나지 않는다면\?">/,
    );
    expect(html).toContain("<span>끝나는 소수와 끝없이 이어지는 소수</span>");
    expect(html).toContain(
      renderTextbookMarkdown(
        "$\\displaystyle \\frac38=0.375\\qquad \\frac13=0.333\\ldots$",
      ),
    );
    expect(html).toContain("<strong>계속</strong>");
    expect(html).toMatch(/<strong><span data-textbook-math>/);
    expect(html).not.toMatch(/\[\[|\]\]|\{\{|\}\}|원본 판서/);
    // The same board as the manuscript turn: one shape for both sources.
    const fromTurn = renderDialogueHtml(
      blocksOf(conceptScriptFor(KEY)!, DEFAULT_CAST).find(
        (item) =>
          item.presentation!.lessonKey === "v15:U01:2" &&
          item.presentation!.kind === "board",
      )!,
      resources,
    );
    const shape = (text: string) =>
      text
        .replace(/ data-lesson-[a-z]+="[^"]*"/g, "")
        .replace(/<\/?strong>/g, "");
    expect(shape(html)).toBe(shape(fromTurn));
    expect(() =>
      renderDialogueBoardHtml({ ...block, semantic: undefined }, resources),
    ).toThrow(/판서 노드/);
    expect(() =>
      renderDialogueBoardHtml(
        {
          ...block,
          semantic: {
            ...block.semantic!,
            node: { kind: "board", title: "t", tex: "a$b" },
          },
        },
        resources,
      ),
    ).toThrow(/판서 수식/);
    expect(renderDialogueBoardHtml(block)).toBe(html);
    expect(isDialoguePlacement(block)).toBe(true);
    expect(isDialoguePlacement({ ...block, semantic: undefined })).toBe(false);
  });
});

describe("lessons and the page's helpers", () => {
  it("separates lessons by title as well as key, because the raw v15 pages share one key", () => {
    const pages = [
      "분수 모양이면 모두 같은 종류일까?",
      "나눗셈이 끝나지 않는다면?",
      "반복되는 부분에 이름 붙이기",
      "끝까지 쓰지 않고 자리 찾기",
    ];
    const [turn] = lessonOne(DEFAULT_CAST);
    const raw: EditorialBlock[] = pages.flatMap((lessonTitle, page) => [
      ...[0, 1, 2].map((index): EditorialBlock => ({
        ...turn!,
        id: `p${page}.turn-${index}`,
        presentation: { kind: "speech", lessonKey: "U01", lessonTitle },
      })),
      {
        id: `p${page}.board`,
        sourceBlockId: "board",
        unitKey: "U01",
        sectionKey: "opening",
        kind: "text",
        markdown: "판서",
        semantic: {
          activity: "dialogue",
          node: { kind: "board", title: "판서", tex: "1=1" },
        },
      },
      {
        ...turn!,
        id: `p${page}.turn-3`,
        presentation: { kind: "speech", lessonKey: "U01", lessonTitle },
      },
    ]);
    expect(
      dialogueLessonRuns(raw).map((run) => [
        run.lessonKey,
        run.lessonTitle,
        run.blockIds.length,
        run.speech,
        run.boards,
      ]),
    ).toEqual(pages.map((title) => ["U01", title, 5, 4, 1]));
    expect(raw.every(isDialoguePlacement)).toBe(true);
    // The product's manuscript: opening, two v15 pages … each a run of its own.
    const product = blocksOf(conceptScriptFor(KEY)!, DEFAULT_CAST);
    const runs = dialogueLessonRuns(product);
    expect(runs.slice(0, 3).map((run) => run.lessonKey)).toEqual([
      "section:m2-01-01:open",
      "v15:U01:1",
      "v15:U01:2",
    ]);
    expect(runs[1]).toMatchObject({ speech: 13, boards: 1 });
    expect(runs.reduce((n, run) => n + run.blockIds.length, 0)).toBe(
      product.length,
    );
    // Another kind of block ends a run; a turn without lesson data forms none.
    expect(
      dialogueLessonRuns([
        raw[0]!,
        { ...raw[3]!, semantic: undefined },
        raw[1]!,
        { ...turn!, id: "old", presentation: undefined },
      ]).map((run) => run.blockIds),
    ).toEqual([["p0.turn-0"], ["p0.turn-1"]]);
  });

  it("tries only 10.5pt down to 9.2pt in 0.1pt steps and never guesses a size", () => {
    expect(DIALOGUE_FIT).toEqual({
      startPt: 10.5,
      stepPt: 0.1,
      floorPt: 9.2,
      minGapMm: 0.85,
      maxGapMm: 5,
    });
    expect(dialogueSizeSteps()).toEqual([
      10.5, 10.4, 10.3, 10.2, 10.1, 10, 9.9, 9.8, 9.7, 9.6, 9.5, 9.4, 9.3, 9.2,
    ]);
    const tried: number[] = [];
    expect(
      solveDialogueSize((size) => {
        tried.push(size);
        return size <= 9.8;
      }),
    ).toEqual({ sizePt: 9.8, fits: true });
    expect(tried).toEqual([10.5, 10.4, 10.3, 10.2, 10.1, 10, 9.9, 9.8]);
    expect(solveDialogueSize(() => true)).toEqual({ sizePt: 10.5, fits: true });
    // Below the floor the text is not shrunk: the lesson goes on to the next page.
    expect(solveDialogueSize(() => false)).toEqual({
      sizePt: 9.2,
      fits: false,
    });
    expect(dialogueSizeStyle(10.3)).toBe("--tb-dialogue-size:10.3pt");
    expect(() => dialogueSizeStyle(9.15)).toThrow();
    expect(dialogueGapMm(0, 13)).toBe(0.85);
    expect(dialogueGapMm(-8, 13)).toBe(0.85);
    expect(dialogueGapMm(12, 13)).toBeCloseTo(1.85, 10);
    expect(dialogueGapMm(500, 13)).toBe(5);
    expect(dialogueGapMm(3, 1)).toBeCloseTo(3.85, 10);
    expect(DIALOGUE_BACKDROP).toEqual({
      className: "tb-dialogue-backdrop",
      paddingBlockMm: 3,
      insetInlineMm: 3.5,
    });
  });

  it("gives the projection the three strips, with the projection's own words", () => {
    expect(
      renderDialogueLessonTitleHtml({
        lessonKey: "concept:m3-05-02-c1",
        lessonTitle: "$30^\\circ$의 삼각비 <값>",
      }),
    ).toBe(
      `<p class="tb-dialogue-lesson-title" data-lesson-key="concept:m3-05-02-c1" data-lesson-title="$30^\\circ$의 삼각비 &lt;값&gt;">${renderTextbookMarkdown("$30^\\circ$").replace(/^<p>|<\/p>$/g, "")}의 삼각비 &lt;값&gt;</p>`,
    );
    expect(
      renderDialogueLessonTitleHtml(
        { lessonKey: "k", lessonTitle: "1. 제목" },
        true,
      ),
    ).toBe(
      '<p class="tb-dialogue-lesson-title" data-lesson-key="k" data-lesson-title="1. 제목" data-lesson-continued="true">1. 제목</p>',
    );
    expect(renderDialogueInlineHtml("**굵게** # 제목")).toBe("**굵게** # 제목");
    expect(renderDialogueGuideHtml("대화를 <읽으며>")).toBe(
      '<p class="tb-dialogue-guide">대화를 &lt;읽으며&gt;</p>',
    );
    expect(
      renderDialogueContinueHtml({
        label: "단원을 여는 수업",
        index: 1,
        total: 4,
        note: "다음 쪽에서 이어집니다.",
      }),
    ).toBe(
      '<div class="tb-dialogue-continue" data-dialogue-page="1" data-dialogue-pages="4"><span>단원을 여는 수업</span><b>1 / 4</b><span>다음 쪽에서 이어집니다.</span></div>',
    );
    for (const [index, total] of [
      [0, 4],
      [5, 4],
      [1.5, 4],
    ])
      expect(() =>
        renderDialogueContinueHtml({
          label: "l",
          index: index!,
          total: total!,
          note: "n",
        }),
      ).toThrow();
  });

  it("styles a turn with no background of its own and sizes everything from one property", () => {
    expect(DIALOGUE_CSS).not.toMatch(/<\/style|@import|url\(|expression\(/i);
    const rule = (selector: string) =>
      DIALOGUE_CSS.split("\n")
        .find((line) => line.startsWith(`${selector}{`))
        ?.slice(selector.length + 1, -1);
    expect(
      rule(
        ".tb-editorial.tb-editorial-dialogue,.tb-editorial.tb-editorial-dialogue.tb-stage-opening",
      ),
    ).toBe("padding:0;background:transparent;border-radius:0");
    expect(rule(".tb-dialogue.tb-dialogue-atlas")).toContain(
      "background:transparent",
    );
    expect(rule(".tb-dialogue-backdrop")).toContain("background:#f4f7f5");
    // Only the bubble, the board and the backdrop paint a background.
    expect(
      DIALOGUE_CSS.split("\n")
        .filter((line) => /background:(?!transparent|inherit)/.test(line))
        .map((line) => line.slice(0, line.indexOf("{"))),
    ).toEqual([
      ".tb-dialogue-backdrop",
      ".tb-dialogue.tb-dialogue-atlas .tb-bubble",
      ".tb-dialogue.tb-dialogue-atlas.tb-speaker-student .tb-bubble",
      ".tb-dialogue-board",
      ".tb-dialogue-continue>b",
    ]);
    expect(rule(".tb-dialogue.tb-dialogue-atlas .tb-bubble")).toContain(
      "font-size:var(--tb-dialogue-size,10.5pt)",
    );
    expect(rule(".tb-dialogue-board>.tb-board-formula")).toContain(
      "font-size:var(--tb-dialogue-size,10.5pt)",
    );
    expect(DIALOGUE_CSS.match(/font-size:[^;}]*/g)!.sort()).toEqual(
      [
        "font-size:5.5pt",
        "font-size:var(--tb-dialogue-size,10.5pt)",
        "font-size:7pt",
        "font-size:var(--tb-dialogue-size,10.5pt)",
        "font-size:var(--tb-dialogue-size,10.5pt)",
        "font-size:8pt",
        "font-size:9.2pt",
        "font-size:7pt",
        "font-size:6pt",
        "font-size:6.8pt",
      ].sort(),
    );
  });
});

/**
 * Real geometry: the first v15 lesson, typeset by Chromium with the textbook's own
 * fonts, KaTeX and portrait sheets. Nothing is mocked; it runs when a browser is asked for.
 */
describe.skipIf(process.env.TEXTBOOK_VISUAL_TEST !== "1")(
  "the first v15 lesson measured in Chromium",
  () => {
    const WIDTH_MM = 176;
    const MM = 96 / 25.4;

    async function sample(cast: Cast, cssOrder: "after" | "before") {
      const bundle = await loadTextbookLocalBundle();
      const portrait = async (id: string) =>
        `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public", getTextbookCharacter(id)!.src.slice(1)))).toString("base64")}`;
      const urls = new Map<string, string>();
      for (const id of Object.values(cast))
        urls.set(`asset-${id}`, await portrait(id));
      const real: RenderResources = {
        assetUrl: (id) => urls.get(id)!,
        qrDataUrl: () => "data:image/png;base64,AA==",
      };
      const blocks = lessonOne(cast);
      const body = `<main class="tb-measure" style="position:relative;width:${WIDTH_MM}mm">${blocks
        .map(
          (block) =>
            `<div class="tb-measure-block" data-measure-id="${block.id}" style="width:${WIDTH_MM}mm"><div class="tb-editorial tb-editorial-dialogue tb-stage-opening" data-editorial-stage="opening">${renderDialogueHtml(block, real)}</div></div>`,
        )
        .join("")}</main>`;
      const sheets =
        cssOrder === "after"
          ? `${TEXTBOOK_CSS}\n${DIALOGUE_CSS}`
          : `${DIALOGUE_CSS}\n${TEXTBOOK_CSS}`;
      return {
        blocks,
        html: `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${inlineBundleCss(bundle.fontCss, bundle.resources)}\n${inlineBundleCss(bundle.katexCss, bundle.resources)}\n${sheets}</style></head><body>${body}</body></html>`,
      };
    }

    it("places, sizes and paints the turns and the board as the v15 page does", async () => {
      const browser = await launchExportBrowser();
      try {
        for (const [cast, cssOrder] of [
          [DEFAULT_CAST, "after"],
          [OTHER_CAST, "before"],
        ] as const) {
          const { html, blocks } = await sample(cast, cssOrder);
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "load" });
          await page.evaluate(async () => {
            await document.fonts.load(
              "400 13px TextbookPretendard",
              "가나다 수학",
            );
            await document.fonts.load(
              "700 13px TextbookPretendard",
              "가나다 수학",
            );
            await document.fonts.ready;
            await Promise.all(
              Array.from(document.images).map((image) => image.decode()),
            );
          });
          const measure = (sizePt?: number) =>
            page.evaluate((size) => {
              const doc = document;
              const main = doc.querySelector<HTMLElement>("main")!;
              if (size === undefined)
                main.style.removeProperty("--tb-dialogue-size");
              else main.style.setProperty("--tb-dialogue-size", `${size}pt`);
              const box = main.getBoundingClientRect();
              const css = (element: Element, pseudo?: string) =>
                getComputedStyle(element, pseudo);
              return {
                font: getComputedStyle(doc.body).fontFamily,
                fontsLoaded: doc.fonts.check(
                  "400 13px TextbookPretendard",
                  "가나다",
                ),
                width: box.width,
                rows: Array.from(
                  doc.querySelectorAll<HTMLElement>("[data-measure-id]"),
                ).map((block) => {
                  const wrapper = block.firstElementChild!;
                  const turn = wrapper.firstElementChild as HTMLElement;
                  const rect = turn.getBoundingClientRect();
                  const bubble = turn.querySelector<HTMLElement>(".tb-bubble");
                  const frame =
                    turn.querySelector<HTMLElement>(".tb-portrait-frame");
                  const image = frame?.querySelector("img");
                  const name =
                    turn.querySelector<HTMLElement>(".tb-portrait-name");
                  const formula =
                    turn.querySelector<HTMLElement>(".tb-board-formula");
                  const inner = Array.from(
                    turn.querySelectorAll(
                      ".katex-html,.tb-portrait-frame,.tb-bubble,.tb-board-formula",
                    ),
                  ).map((element) => element.getBoundingClientRect());
                  return {
                    role: turn.dataset.dialogueRole,
                    height: block.getBoundingClientRect().height,
                    left: rect.left - box.left,
                    right: box.right - rect.right,
                    width: rect.width,
                    wrapperBackground: css(wrapper).backgroundColor,
                    wrapperPadding: css(wrapper).padding,
                    turnBackground: css(turn).backgroundColor,
                    bubbleBackground: bubble && css(bubble).backgroundColor,
                    bubbleFontPx: bubble && parseFloat(css(bubble).fontSize),
                    bubblePaddingTopPx:
                      bubble && parseFloat(css(bubble).paddingTop),
                    // Text or a formula that runs past the bubble's own edges. The tail
                    // is drawn outside the bubble on purpose and is not content.
                    bubbleOverflows:
                      bubble &&
                      Array.from(bubble.querySelectorAll("p,.katex-html")).some(
                        (element) => {
                          const inner = element.getBoundingClientRect();
                          const outer = bubble.getBoundingClientRect();
                          return (
                            inner.left < outer.left - 0.5 ||
                            inner.right > outer.right + 0.5 ||
                            inner.bottom > outer.bottom + 0.5
                          );
                        },
                      ),
                    tail: bubble && css(bubble, "::before").left,
                    frameWidth: frame?.getBoundingClientRect().width,
                    frameHeight: frame?.getBoundingClientRect().height,
                    frameOverflow: frame && css(frame).overflow,
                    frameMirrored: frame && css(frame).transform !== "none",
                    imageRatio:
                      image && frame
                        ? image.getBoundingClientRect().width /
                          frame.getBoundingClientRect().width
                        : undefined,
                    nameHeight: name?.getBoundingClientRect().height,
                    nameFontPx: name && parseFloat(css(name).fontSize),
                    formulaFontPx: formula && parseFloat(css(formula).fontSize),
                    formulaAlign: formula && css(formula).textAlign,
                    outside: inner.some(
                      (r) =>
                        r.left < box.left - 0.5 || r.right > box.right + 0.5,
                    ),
                  };
                }),
              };
            }, sizePt);

          const at105 = await measure();
          expect(at105.fontsLoaded).toBe(true);
          expect(at105.width / MM).toBeCloseTo(WIDTH_MM, 1);
          expect(at105.rows).toHaveLength(blocks.length);
          for (const [index, row] of at105.rows.entries()) {
            const block = blocks[index]!;
            // The wrapper and the turn paint nothing: no stripe behind a single turn.
            expect(row.wrapperBackground).toBe("rgba(0, 0, 0, 0)");
            expect(row.wrapperPadding).toBe("0px");
            expect(row.outside).toBe(false);
            if (block.presentation!.kind === "board") {
              expect(row.role).toBe("board");
              expect(row.width / MM).toBeCloseTo(WIDTH_MM - 17, 1);
              expect(row.left / MM).toBeCloseTo(8.5, 1);
              expect(row.turnBackground).toBe("rgb(237, 243, 231)");
              expect(row.formulaFontPx! * 0.75).toBeCloseTo(10.5, 2);
              expect(row.formulaAlign).toBe("center");
              expect(row.bubbleFontPx).toBeNull();
              continue;
            }
            const teacher = block.castRole === "teacher";
            expect(row.role).toBe(teacher ? "teacher" : "student");
            expect(row.turnBackground).toBe("rgba(0, 0, 0, 0)");
            // The role keeps its side: the teacher 3.5mm from the left, a student from the right.
            expect((teacher ? row.left : row.right) / MM).toBeCloseTo(3.5, 1);
            expect((teacher ? row.right : row.left) / MM).toBeGreaterThan(3.5);
            expect(row.width / MM).toBeLessThanOrEqual(
              (WIDTH_MM - 7) * (teacher ? 0.93 : 0.89) + 0.05,
            );
            expect(row.bubbleBackground).toBe(
              teacher ? "rgb(255, 255, 255)" : "rgb(255, 240, 184)",
            );
            expect(row.bubbleFontPx! * 0.75).toBeCloseTo(10.5, 2);
            expect(row.bubblePaddingTopPx! / MM).toBeCloseTo(1.799, 1);
            expect(row.bubbleOverflows).toBe(false);
            // The tail points at the speaker: outside the left edge for the teacher,
            // at the right edge for a student.
            if (teacher) expect(parseFloat(row.tail!)).toBeLessThan(0);
            else expect(parseFloat(row.tail!)).toBeGreaterThan(0);
            expect(row.frameWidth! / MM).toBeCloseTo(10.501, 1);
            expect(row.frameHeight! / MM).toBeCloseTo(10.501, 1);
            expect(row.frameOverflow).toBe("hidden");
            expect(row.imageRatio).toBeCloseTo(2, 2);
            expect(row.frameMirrored).toBe(!teacher);
            expect(row.nameFontPx! * 0.75).toBeCloseTo(5.5, 2);
            // The name stays on one line under the face.
            expect(row.nameHeight! / MM).toBeLessThan(3);
          }

          // One property drives the whole fit: font, portrait and padding follow it.
          const heights = new Map<number, number>();
          for (const size of dialogueSizeSteps()) {
            const measured = await measure(size);
            heights.set(
              size,
              measured.rows.reduce((sum, row) => sum + row.height, 0) / MM,
            );
            const speech = measured.rows.find((row) => row.role === "teacher")!;
            expect(speech.bubbleFontPx! * 0.75).toBeCloseTo(size, 2);
            expect(speech.frameWidth! / MM).toBeCloseTo(
              9.5 + (size - 9.2) * 0.77,
              1,
            );
            expect(speech.bubblePaddingTopPx! / MM).toBeCloseTo(
              1.5 + (size - 9.2) * 0.23,
              1,
            );
            expect(
              measured.rows.some((row) => row.outside || row.bubbleOverflows),
            ).toBe(false);
          }
          const tall = heights.get(10.5)!;
          const short = heights.get(9.2)!;
          expect(short).toBeLessThan(tall);
          const ordered = dialogueSizeSteps().map((size) => heights.get(size)!);
          for (let i = 1; i < ordered.length; i += 1)
            expect(ordered[i]!).toBeLessThanOrEqual(ordered[i - 1]! + 0.01);
          // The solver with these measured heights: the largest size under a limit
          // that the 10.5pt layout exceeds and the 9.2pt layout meets.
          const limit = (tall + short) / 2;
          const solved = solveDialogueSize(
            (size) => heights.get(size)! <= limit,
          );
          expect(solved.fits).toBe(true);
          expect(heights.get(solved.sizePt)!).toBeLessThanOrEqual(limit);
          if (solved.sizePt < 10.5)
            expect(
              heights.get(Math.round((solved.sizePt + 0.1) * 10) / 10)!,
            ).toBeGreaterThan(limit);
          expect(
            solveDialogueSize((size) => heights.get(size)! <= short - 1),
          ).toEqual({ sizePt: 9.2, fits: false });

          const out = process.env.TEXTBOOK_VISUAL_OUT;
          if (out) {
            await measure();
            await mkdir(out, { recursive: true });
            await page.evaluate((className) => {
              // What the page will paint: one backdrop from the first to the last placement.
              const doc = document;
              const main = doc.querySelector<HTMLElement>("main")!;
              const backdrop = doc.createElement("div");
              backdrop.className = className;
              backdrop.style.cssText = `left:0;top:-3mm;width:100%;height:calc(100% + 6mm);z-index:-1`;
              main.style.isolation = "isolate";
              main.style.margin = "8mm";
              main.prepend(backdrop);
            }, DIALOGUE_BACKDROP.className);
            const element = await page.$("main");
            await writeFile(
              path.join(out, `dialogue-${cast.teacher}-${cssOrder}.png`),
              await element!.screenshot({ type: "png" }),
            );
            await writeFile(
              path.join(out, `dialogue-${cast.teacher}-heights.json`),
              JSON.stringify(Object.fromEntries(heights), null, 2),
            );
          }
          await page.close();
        }
      } finally {
        await browser.close();
      }
    }, 120_000);
  },
);
