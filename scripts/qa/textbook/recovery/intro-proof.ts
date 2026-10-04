/**
 * Automatic unit introduction and recovery measurement proof in the trusted Chromium renderer.
 *
 *   node --conditions=react-server --import tsx scripts/qa/textbook/recovery/intro-proof.ts <outDir> [--only m1-03,e3-1-1] [--no-raster] [--self-test]
 *   node --conditions=react-server --import tsx scripts/qa/textbook/recovery/intro-proof.ts <outDir> --mutants
 *
 * Reads the committed openings and the core concept bank only: no DB, no network, no AI call.
 * PDFs, PNGs, contact sheets and reports are written to <outDir>, never into the repository.
 * The single-page layout is a complete replacement page; it is never judged equal to the original spread.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import katex from "katex";
import type { Browser, Page } from "puppeteer-core";
import type {
  ManuscriptBlock,
  TextbookExchange,
} from "../../../../src/contracts/textbookExchange.contract";
import { textbookExchangeSchema } from "../../../../src/contracts/textbookExchange.contract";
import type { QuickCreateComponents } from "../../../../src/contracts/textbookQuickCreate.contract";
import { textbookSemanticNodeSchema } from "../../../../src/contracts/textbookSemantic.contract";
import { splitBlankSentence } from "../../../../src/contracts/conceptBlank.contract";
import { sectionTitleTex } from "../../../../src/lib/concept-blank/sections";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { coreConceptsForSection } from "../../../../src/lib/textbook/coreConceptBank";
import {
  editorialResourceUrl,
  loadTextbookLocalBundle,
} from "../../../../src/lib/textbook/render/bundle.server";
import {
  measurementHtml,
  recallMeasurementHtml,
  textbookHtmlDocument,
} from "../../../../src/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type TextbookRenderModel,
} from "../../../../src/lib/textbook/render/model";
import { recallMeasurementModel } from "../../../../src/lib/textbook/render/recoveryMeasurement";
import {
  renderTextbookChunk,
  type TextbookChunkResult,
} from "../../../../src/lib/textbook/render/server";
import { memoryActivityBlocks } from "../../../../src/lib/textbook/server/quickCreateRecovery";
import type {
  QuickCreateAssembly,
  SectionPlan,
} from "../../../../src/lib/textbook/server/quickCreate/context";
import { appendUnitIntro } from "../../../../src/lib/textbook/server/quickCreate/unitIntro";
import {
  unitOpenings,
  type UnitOpening,
} from "../../../../src/lib/textbook/unitOpenings";
import {
  SYNTHETIC_ORIGIN,
  textbookFixture,
} from "../../../../src/__tests__/helpers/textbookFixture";

export const OPENINGS_FILE = "src/lib/textbook/scripts/unit-openings.json";
export const PLAN_FILE =
  "docs/planning/textbook-v15-recovery-plan-final-20261005.md";
export const PLAN_SHA256 =
  "0ab8ac18fc033936e52a300752dd73894fbccfa52c740c0acc52c0d03cb04bb7";
/** The block the paginator reserves for either layout: 16mm from the top, 254mm tall. */
export const INTRO_TOP_MM = 16;
export const INTRO_HEIGHT_MM = 254;
export const DATE_LABEL = "공부를 시작한 날";
export const DATE_SLOT = "년　　월　　일";
const LABELS = {
  unit: "UNIT",
  roadmapKicker: "LEARNING ROADMAP",
  roadmap: "배움의 길잡이",
  goals: "이 단원의 학습 목표",
  path: "선택한 범위의 학습 순서",
  check: "나의 출발점",
};

export const sha256Hex = (bytes: string | Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
/** Git stores this text with LF; a Windows checkout may hold CRLF. The pinned hashes are of the LF bytes. */
export const lfSha256 = (file: string): string =>
  sha256Hex(
    readFileSync(path.join(process.cwd(), file), "utf8").replaceAll(
      "\r\n",
      "\n",
    ),
  );
/** Bytes of the committed openings file and of the frozen in-memory catalogue. */
export const parentSourceDigest = () => ({
  fileSha256: lfSha256(OPENINGS_FILE),
  memorySha256: sha256Hex(JSON.stringify(unitOpenings())),
});

/** The glyph text KaTeX prints for one formula: the page carries no TeX source to read back. */
export const katexText = (tex: string): string =>
  katex
    .renderToString(tex, { output: "html", throwOnError: true, strict: false })
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#x27|#39);/g, (_, name: string) =>
      name === "amp"
        ? "&"
        : name === "lt"
          ? "<"
          : name === "gt"
            ? ">"
            : name === "quot"
              ? '"'
              : "'",
    );
/** Whitespace-insensitive text with Markdown math written the way the DOM probes report KaTeX. */
export const squash = (text: string): string =>
  text
    .replace(/\$([^$]+)\$/g, (_, tex: string) => `⟦${katexText(tex)}⟧`)
    .replace(/\s+/g, "");

export interface IntroCase {
  caseId: string;
  opening: UnitOpening;
  /** Seed section names; absent selects the whole chapter. */
  selected?: readonly string[];
}
export interface ExpectedIntro {
  caseId: string;
  unitNumber: string;
  art: string;
  title: string;
  question: string;
  explanation: string;
  keyPhrase: string;
  goals: string[];
  path: string[];
  check: string[];
  /** Goals of the chapter that the selection leaves out. */
  unselectedGoals: string[];
  sourceHash: string;
  sourceHashes: string[];
  sourceConceptIds: string[];
}

/** Read from the frozen parent source itself, not from the writer or the selection helper. */
export function expectedIntro(
  introCase: IntroCase,
  unitNumber: number,
): ExpectedIntro {
  const { opening } = introCase;
  const wanted = introCase.selected && new Set(introCase.selected);
  const chosen = opening.sections.filter(
    (section) => !wanted || wanted.has(section.title),
  );
  return {
    caseId: introCase.caseId,
    unitNumber: String(unitNumber).padStart(2, "0"),
    art: `u${String(((unitNumber - 1) % 6) + 1).padStart(2, "0")}.png`,
    title: opening.title,
    question: opening.question,
    explanation: opening.explanation,
    keyPhrase: opening.keyPhrase,
    goals: chosen.map((section) => section.goal),
    path: chosen.map((section) => sectionTitleTex(section.title)),
    check: opening.check.map((prompt) => prompt.text),
    unselectedGoals: opening.sections
      .filter((section) => !chosen.includes(section))
      .map((section) => section.goal),
    sourceHash: opening.provenance.sourceHash,
    sourceHashes: chosen.map((section) => section.sourceHash),
    sourceConceptIds: chosen.flatMap((section) => [...section.conceptIds]),
  };
}

/** The production writer on the cursor quick-create gives it. Only the four fields it reads exist. */
export function writeIntroSection(
  introCase: IntroCase,
  unitKey: string,
): SectionPlan {
  const { opening } = introCase;
  const sections: SectionPlan[] = [];
  const titles =
    introCase.selected ?? opening.sections.map((section) => section.title);
  const ctx = {
    components: { unitIntro: true },
    units: titles.map((section, index) => ({
      id: `${introCase.caseId}-${index}`,
      grade: opening.grade,
      chapter: opening.chapter,
      section,
      orderIndex: index,
      problemCount: 0,
    })),
    chapter: opening.chapter,
    unitKey,
    addSection: (
      title: string,
      templateKey: string,
      blocks: ManuscriptBlock[],
    ): SectionPlan => {
      const section: SectionPlan = {
        id: `section-${introCase.caseId}`,
        unitKey,
        sectionKey: `s-intro-${introCase.caseId}`,
        title,
        templateKey,
        startPolicy: "continue",
        blocks,
      };
      sections.push(section);
      return section;
    },
  } as unknown as QuickCreateAssembly;
  appendUnitIntro(ctx);
  if (sections.length !== 1)
    throw new Error("The introduction writer must add one section");
  return sections[0];
}

type ExchangeSection = TextbookExchange["units"][number]["sections"][number];
const exchangeSection = (plan: SectionPlan): ExchangeSection => ({
  sectionKey: plan.sectionKey,
  title: plan.title,
  templateKey: plan.templateKey,
  startPolicy: plan.startPolicy,
  blocks: plan.blocks,
});

/** One book of one grade and term: a unit per chapter, each holding its written introduction. */
export function introBook(
  cases: readonly IntroCase[],
  extraSections: (unitIndex: number) => {
    before?: ExchangeSection[];
    after?: ExchangeSection[];
  } = () => ({}),
): TextbookExchange {
  const first = cases[0].opening;
  const exchange = textbookFixture(1, 0);
  exchange.config = {
    ...exchange.config,
    schoolLevel: first.grade.startsWith("초") ? "elementary" : "middle",
    grade: Number(first.grade.slice(1)),
    semester: first.semester,
    displayCode: `QA-${first.grade}-${first.semester}`,
    title: `단원 도입 검증 ${first.grade} ${first.semester}학기`,
    print: { ...exchange.config.print, coverMode: "separate" },
  };
  exchange.units = cases.map((introCase, index) => {
    const unitKey = `u-${introCase.caseId}`;
    const plan = writeIntroSection(introCase, unitKey);
    const extra = extraSections(index);
    return {
      unitKey,
      title: introCase.opening.chapter,
      sourceUnitIds: [],
      prerequisites: [],
      goals: (
        introCase.selected ??
        introCase.opening.sections.map((section) => section.title)
      ).map(sectionTitleTex),
      conceptLectureRefs: [],
      sections: [
        ...(extra.before ?? []),
        exchangeSection(plan),
        ...(extra.after ?? []),
      ],
    };
  });
  return textbookExchangeSchema.parse(exchange);
}

/** The whole catalogue as the books a teacher would make: one per grade and term. */
export function allIntroBooks(): Array<{
  bookId: string;
  cases: IntroCase[];
}> {
  const books = new Map<string, IntroCase[]>();
  for (const opening of unitOpenings()) {
    const bookId = `${opening.grade}-${opening.semester}`;
    books.set(bookId, [
      ...(books.get(bookId) ?? []),
      { caseId: opening.id, opening },
    ]);
  }
  return [...books].map(([bookId, cases]) => ({ bookId, cases }));
}

export type Box = [number, number, number, number];
export interface CapturedAnchor {
  name: string;
  text: string;
  boxMm: Box;
  inkMm: Box;
}
export interface CapturedIntroPage {
  physicalPageIndex: number;
  parity: "even" | "odd";
  templateKey: string;
  sectionKey: string;
  recovered: boolean;
  paperMm: [number, number];
  part: "left" | "right" | "single" | null;
  introBoxMm: Box | null;
  introText: string;
  anchors: CapturedAnchor[];
  headings: Record<string, string>;
  goals: string[];
  path: string[];
  check: Array<{
    text: string;
    lineHeightsMm: number[];
    lineWidthsMm: number[];
  }>;
  art: {
    naturalWidth: number;
    naturalHeight: number;
    complete: boolean;
    boxMm: Box;
    src: string;
  } | null;
  date: { label: string; slot: string; slotWidthMm: number } | null;
  blocks: Array<{ blockId: string; boxMm: Box }>;
  footerBoxMm: Box | null;
  footerNumber: string;
  header: string;
  fontFamily: string;
  fontReady: boolean;
  paperText: string;
}

/**
 * One plain function of `document`, kept as source text: it is evaluated as a string in Chromium
 * (no transpiler helper can enter it) and built with `new Function` for a jsdom document.
 */
export const INTRO_DOM_PROBE = String.raw`function (document) {
  var view = document.defaultView;
  var mm = 25.4 / 96;
  function strip(s) { return (s || "").replace(/\s+/g, ""); }
  function round(v) { return Math.round(v * 100) / 100; }
  function textOf(el) {
    if (!el) return "";
    var clone = el.cloneNode(true);
    var maths = clone.querySelectorAll(".katex");
    for (var i = 0; i < maths.length; i++)
      maths[i].parentNode.replaceChild(
        document.createTextNode("⟦" + strip(maths[i].textContent) + "⟧"),
        maths[i]
      );
    var spaces = clone.querySelectorAll("[data-writing-space]");
    for (var j = 0; j < spaces.length; j++) spaces[j].parentNode.removeChild(spaces[j]);
    return strip(clone.textContent);
  }
  var papers = document.querySelectorAll("[data-textbook-page]");
  var result = [];
  for (var p = 0; p < papers.length; p++) {
    (function (paper) {
      var origin = paper.getBoundingClientRect();
      function rel(l, t, r, b) {
        return [round((l - origin.left) * mm), round((t - origin.top) * mm), round((r - origin.left) * mm), round((b - origin.top) * mm)];
      }
      function box(el) { var r = el.getBoundingClientRect(); return rel(r.left, r.top, r.right, r.bottom); }
      function ink(el) {
        if (!document.createTreeWalker || !document.createRange) return box(el);
        var walker = document.createTreeWalker(el, 4);
        var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, node;
        while ((node = walker.nextNode())) {
          if (!strip(node.nodeValue)) continue;
          var hidden = false;
          for (var up = node.parentNode; up && up !== el; up = up.parentNode)
            if (up.classList && up.classList.contains("katex-mathml")) hidden = true;
          if (hidden) continue;
          var range = document.createRange();
          range.selectNodeContents(node);
          if (!range.getClientRects) return box(el);
          var rects = range.getClientRects();
          for (var k = 0; k < rects.length; k++) {
            if (rects[k].width < 0.5 || rects[k].height < 0.5) continue;
            l = Math.min(l, rects[k].left); t = Math.min(t, rects[k].top);
            r = Math.max(r, rects[k].right); b = Math.max(b, rects[k].bottom);
          }
        }
        // Text rectangles carry the font's ascent box, taller than the line: the element bounds the height.
        var outer = box(el);
        return l === Infinity ? outer : [rel(l, t, r, b)[0], outer[1], rel(l, t, r, b)[2], outer[3]];
      }
      var intro = paper.querySelector(".tb-auto-intro");
      var part = !intro ? null
        : intro.classList.contains("tb-auto-intro-left") ? "left"
        : intro.classList.contains("tb-auto-intro-right") ? "right"
        : intro.classList.contains("tb-auto-intro-single") ? "single" : null;
      var anchors = [];
      function anchor(name, el, useBox) {
        if (el) anchors.push({ name: name, text: textOf(el), boxMm: box(el), inkMm: useBox ? box(el) : ink(el) });
      }
      var headings = {}, goals = [], path = [], check = [], art = null, date = null;
      if (intro) {
        anchor("number", intro.querySelector(".tb-intro-number"));
        if (part === "right") anchor("roadmap", intro.querySelector("header"));
        else anchor("title", intro.querySelector("h2"));
        anchor("question", intro.querySelector(".tb-intro-question"));
        anchor("explanation", intro.querySelector(".tb-intro-explanation"));
        anchor("key", intro.querySelector(".tb-intro-key"));
        anchor("art", intro.querySelector("figure"), true);
        anchor("goals", intro.querySelector(".tb-intro-goals"), true);
        anchor("path", intro.querySelector(".tb-intro-path"), true);
        anchor("check", intro.querySelector(".tb-intro-check"), true);
        anchor("date", intro.querySelector(".tb-intro-date"), true);
        var names = ["goals", "path", "check"];
        for (var n = 0; n < names.length; n++) {
          var h3 = intro.querySelector(".tb-intro-" + names[n] + " h3");
          if (h3) headings[names[n]] = textOf(h3);
        }
        var items = intro.querySelectorAll(".tb-intro-goals li");
        for (var g = 0; g < items.length; g++) goals.push(textOf(items[g]));
        items = intro.querySelectorAll(".tb-intro-path li");
        for (g = 0; g < items.length; g++) path.push(textOf(items[g]));
        var checkRoot = intro.querySelector(".tb-intro-check");
        if (checkRoot)
          for (g = 0; g < checkRoot.children.length; g++) {
            var child = checkRoot.children[g];
            if (child.tagName !== "DIV") continue;
            var lines = child.querySelectorAll(".tb-semantic-line"), heights = [], widths = [];
            for (var q = 0; q < lines.length; q++) {
              var lr = lines[q].getBoundingClientRect();
              heights.push(round(lr.height * mm)); widths.push(round(lr.width * mm));
            }
            check.push({ text: textOf(child), lineHeightsMm: heights, lineWidthsMm: widths });
          }
        var image = intro.querySelector("figure img");
        if (image)
          art = {
            naturalWidth: image.naturalWidth || 0, naturalHeight: image.naturalHeight || 0,
            complete: !!image.complete, boxMm: box(image),
            src: (image.getAttribute("src") || "").slice(0, 64)
          };
        var dateRoot = intro.querySelector(".tb-intro-date");
        if (dateRoot) {
          var slot = dateRoot.querySelector("span");
          var label = dateRoot.cloneNode(true), inner = label.querySelector("span");
          if (inner) inner.parentNode.removeChild(inner);
          date = {
            label: (label.textContent || "").trim(), slot: slot ? slot.textContent : "",
            slotWidthMm: slot ? round(slot.getBoundingClientRect().width * mm) : 0
          };
        }
      }
      var blocks = [], placed = paper.querySelectorAll(".tb-block");
      for (var x = 0; x < placed.length; x++)
        blocks.push({ blockId: placed[x].getAttribute("data-block-id"), boxMm: box(placed[x]) });
      var footer = paper.querySelector(".tb-footer"), header = paper.querySelector(".tb-header");
      var number = footer && footer.querySelector("strong");
      result.push({
        physicalPageIndex: Number(paper.getAttribute("data-textbook-page")),
        parity: paper.classList.contains("tb-page-even") ? "even" : "odd",
        templateKey: paper.getAttribute("data-template-key") || "",
        sectionKey: paper.getAttribute("data-section-key") || "",
        recovered: paper.classList.contains("tb-recovered"),
        paperMm: [round(origin.width * mm), round(origin.height * mm)],
        part: part,
        introBoxMm: intro ? box(intro) : null,
        introText: textOf(intro),
        anchors: anchors, headings: headings, goals: goals, path: path, check: check, art: art, date: date,
        blocks: blocks,
        footerBoxMm: footer ? box(footer) : null,
        footerNumber: number ? strip(number.textContent) : "",
        header: header ? strip(header.textContent) : "",
        fontFamily: intro && view ? view.getComputedStyle(intro).fontFamily : "",
        fontReady: !!(document.fonts && document.fonts.check && document.fonts.check("400 13px TextbookPretendard", "가나다")),
        paperText: strip(paper.textContent)
      });
    })(papers[p]);
  }
  return result;
}`;

export interface IntroFailure {
  caseId: string;
  rule: string;
  anchor: string;
  page: number | null;
  detail: string;
}
export interface LayoutIssue {
  code: string;
  severity: string;
  message: string;
}
const SINGLE_ODD_MESSAGE =
  "홀수 시작 쪽이므로 도입의 질문·설명·목표·학습 순서·출발점을 한 쪽에 함께 배치했습니다.";
const SINGLE_FALLBACK_MESSAGE =
  "두 쪽 도입의 측정 공간이 부족하여 같은 전체 내용을 한 쪽에 함께 배치했습니다.";

const overlapMm = (a: Box, b: Box) =>
  Math.min(
    Math.min(a[2], b[2]) - Math.max(a[0], b[0]),
    Math.min(a[3], b[3]) - Math.max(a[1], b[1]),
  );

/**
 * Judges captured pages against the frozen parent source. `geometry: false` is for a DOM without
 * layout (jsdom): the text, order, count and uniqueness rules still apply.
 */
export function verifyIntro(
  expected: ExpectedIntro,
  pages: readonly CapturedIntroPage[],
  options: {
    firstPhysicalPageIndex: number;
    issues?: readonly LayoutIssue[];
    geometry?: boolean;
    /** The provenance printed nowhere but carried by the manuscript node. */
    node?: unknown;
  },
): IntroFailure[] {
  const failures: IntroFailure[] = [];
  const fail = (
    rule: string,
    anchor: string,
    detail: string,
    page: number | null = null,
  ) => failures.push({ caseId: expected.caseId, rule, anchor, page, detail });
  const geometry = options.geometry ?? true;
  const even = options.firstPhysicalPageIndex % 2 === 0;
  const wantedParts = even ? ["left", "right"] : ["single"];
  const parts = pages.map((page) => page.part);
  if (parts.join(",") !== wantedParts.join(","))
    fail(
      "layout-choice",
      "pages",
      `시작 ${options.firstPhysicalPageIndex}쪽에서 [${wantedParts}] 이어야 하는데 [${parts}] 가 나왔다`,
    );
  // A complete single page on an even start is still judged for what it holds.
  const spread = parts.join(",") === "left,right";
  pages.forEach((page, index) => {
    const at = page.physicalPageIndex;
    if (at !== options.firstPhysicalPageIndex + index)
      fail("page-order", "paper", `물리 쪽 ${at}`, at);
    if ((at % 2 === 0 ? "even" : "odd") !== page.parity)
      fail(
        "page-parity",
        "paper",
        `쪽 ${at} 의 홀짝 표지가 ${page.parity}`,
        at,
      );
    if (page.templateKey !== "auto-unit-intro" || !page.recovered)
      fail("template", "paper", `${page.templateKey}/${page.recovered}`, at);
    if (page.part === "left" && at % 2 !== 0)
      fail("spread-side", "paper", "왼쪽 면이 홀수 쪽에 놓였다", at);
    if (page.blocks.length !== 1)
      fail(
        "no-filler",
        "blocks",
        `한 쪽에 블록 ${page.blocks.length}개: ${page.blocks.map((b) => b.blockId)}`,
        at,
      );
    else if (!page.blocks[0].blockId.endsWith(`.intro-${page.part}`))
      fail("no-filler", "blocks", page.blocks[0].blockId, at);
    if (page.footerNumber !== String(at))
      fail("page-number", "footer", `꼬리말 쪽수 ${page.footerNumber}`, at);
  });

  const text = (page: CapturedIntroPage, name: string) =>
    page.anchors.filter((anchor) => anchor.name === name);
  const once = (name: string, value: string, where: string[]) => {
    const found = pages.flatMap((page) =>
      text(page, name).map((anchor) => ({ page, anchor })),
    );
    if (found.length !== 1)
      return fail(
        "retained-once",
        name,
        `${found.length}번 나왔다 (한 번이어야 한다)`,
      );
    const [{ page, anchor }] = found;
    if (!where.includes(page.part ?? ""))
      fail(
        "retained-once",
        name,
        `${page.part} 면에 있다`,
        page.physicalPageIndex,
      );
    if (anchor.text !== squash(value))
      fail(
        "text-equal",
        name,
        `지면 «${anchor.text}» ≠ 원천 «${squash(value)}»`,
        page.physicalPageIndex,
      );
  };
  const head = spread ? ["left"] : ["single"];
  const tail = spread ? ["right"] : ["single"];
  once("number", `${LABELS.unit}${expected.unitNumber}`, head);
  once("title", expected.title, head);
  once("question", expected.question, head);
  once("explanation", expected.explanation, head);
  once("key", expected.keyPhrase, head);
  if (spread) once("roadmap", `${LABELS.roadmapKicker}${LABELS.roadmap}`, tail);

  const list = (name: "goals" | "path", wanted: string[]) => {
    const holders = pages.filter((page) => text(page, name).length);
    if (holders.length !== 1)
      return fail("retained-once", name, `${holders.length}개 면에 있다`);
    const page = holders[0];
    const got = page[name];
    if (!tail.includes(page.part ?? ""))
      fail(
        "retained-once",
        name,
        `${page.part} 면에 있다`,
        page.physicalPageIndex,
      );
    if (page.headings[name] !== squash(LABELS[name]))
      fail(
        "text-equal",
        `${name}.heading`,
        page.headings[name] ?? "",
        page.physicalPageIndex,
      );
    if (got.length !== wanted.length)
      fail(
        "count",
        name,
        `지면 ${got.length}개 ≠ 원천 ${wanted.length}개`,
        page.physicalPageIndex,
      );
    wanted.forEach((value, index) => {
      if (got[index] !== squash(value))
        fail(
          "text-equal",
          `${name}[${index}]`,
          `지면 «${got[index] ?? "없음"}» ≠ 원천 «${squash(value)}»`,
          page.physicalPageIndex,
        );
    });
  };
  list("goals", expected.goals);
  list("path", expected.path);

  const checkPages = pages.filter((page) => text(page, "check").length);
  if (checkPages.length !== 1)
    fail("retained-once", "check", `${checkPages.length}개 면에 있다`);
  else {
    const page = checkPages[0];
    if (page.headings.check !== squash(LABELS.check))
      fail(
        "text-equal",
        "check.heading",
        page.headings.check ?? "",
        page.physicalPageIndex,
      );
    if (page.check.length !== expected.check.length)
      fail(
        "count",
        "check",
        `지면 ${page.check.length}개 ≠ 원천 ${expected.check.length}개`,
        page.physicalPageIndex,
      );
    expected.check.forEach((value, index) => {
      const got = page.check[index];
      if (got?.text !== squash(value))
        fail(
          "text-equal",
          `check[${index}]`,
          `지면 «${got?.text ?? "없음"}» ≠ 원천 «${squash(value)}»`,
          page.physicalPageIndex,
        );
      if (got && got.lineHeightsMm.length !== 2)
        fail(
          "writing-space",
          `check[${index}]`,
          `쓰는 줄 ${got.lineHeightsMm.length}개`,
          page.physicalPageIndex,
        );
      if (
        geometry &&
        got &&
        got.lineHeightsMm.some((height) => Math.abs(height - 7) > 0.3)
      )
        fail(
          "writing-space",
          `check[${index}]`,
          `줄 높이 ${got.lineHeightsMm}`,
          page.physicalPageIndex,
        );
      if (geometry && got && got.lineWidthsMm.some((width) => width < 100))
        fail(
          "writing-space",
          `check[${index}]`,
          `줄 너비 ${got.lineWidthsMm}`,
          page.physicalPageIndex,
        );
    });
  }

  const datePages = pages.filter((page) => page.date);
  if (datePages.length !== 1)
    fail("retained-once", "date", `${datePages.length}개 면에 있다`);
  else {
    const page = datePages[0];
    const date = page.date!;
    if (date.label !== DATE_LABEL || date.slot !== DATE_SLOT)
      fail(
        "text-equal",
        "date",
        `«${date.label}» «${date.slot}»`,
        page.physicalPageIndex,
      );
    if (geometry && Math.abs(date.slotWidthMm - 43) > 0.5)
      fail(
        "writing-space",
        "date",
        `날짜 칸 ${date.slotWidthMm}mm`,
        page.physicalPageIndex,
      );
  }

  const artPages = pages.filter((page) => page.art);
  if (artPages.length !== 1)
    fail("retained-once", "art", `${artPages.length}개 면에 있다`);
  else {
    const page = artPages[0];
    const art = page.art!;
    if (!head.includes(page.part ?? ""))
      fail(
        "retained-once",
        "art",
        `${page.part} 면에 있다`,
        page.physicalPageIndex,
      );
    if (geometry && (!art.complete || !art.naturalWidth || !art.naturalHeight))
      fail(
        "art-loaded",
        "art",
        `complete=${art.complete} ${art.naturalWidth}×${art.naturalHeight}`,
        page.physicalPageIndex,
      );
    if (
      geometry &&
      (art.boxMm[2] - art.boxMm[0] < 30 || art.boxMm[3] - art.boxMm[1] < 30)
    )
      fail(
        "art-loaded",
        "art",
        `그림 상자 ${art.boxMm}`,
        page.physicalPageIndex,
      );
    if (!geometry && !art.src.endsWith(expected.art))
      fail("art-loaded", "art", art.src, page.physicalPageIndex);
  }

  // Whole-text equality: nothing the source does not hold may be on the page, nothing dropped.
  const body = [
    LABELS.goals,
    ...expected.goals,
    LABELS.path,
    ...expected.path,
    LABELS.check,
    ...expected.check,
    DATE_LABEL,
    DATE_SLOT,
  ];
  const lead = [
    LABELS.unit,
    expected.unitNumber,
    expected.title,
    expected.question,
    expected.explanation,
    expected.keyPhrase,
  ];
  const wholeText: Record<string, string> = {
    left: squash(lead.join("")),
    right: squash([LABELS.roadmapKicker, LABELS.roadmap, ...body].join("")),
    single: squash([...lead, ...body].join("")),
  };
  for (const page of pages) {
    if (page.part && page.introText !== wholeText[page.part])
      fail(
        "no-filler",
        "intro-text",
        `전체 글이 원천과 다르다: 지면 ${page.introText.length}자 ≠ 원천 ${wholeText[page.part].length}자`,
        page.physicalPageIndex,
      );
    for (const goal of expected.unselectedGoals)
      if (page.paperText.includes(squash(goal)))
        fail(
          "selected-range",
          "goals",
          `고르지 않은 소단원의 목표가 지면에 있다: ${goal}`,
          page.physicalPageIndex,
        );
    for (const secret of [expected.sourceHash, ...expected.sourceHashes])
      if (page.paperText.includes(secret))
        fail(
          "no-filler",
          "provenance",
          "원천 해시가 지면에 찍혔다",
          page.physicalPageIndex,
        );
  }

  if (options.node !== undefined) {
    const parsed = textbookSemanticNodeSchema.safeParse(options.node);
    const node = parsed.success ? parsed.data : undefined;
    if (!node || node.kind !== "unitIntro")
      fail("source-hash", "node", "unitIntro 노드 계약을 통과하지 못했다");
    else {
      const provenance = node.provenance;
      if (
        !provenance ||
        provenance.sourceHash !== expected.sourceHash ||
        provenance.sourceHashes.join() !== expected.sourceHashes.join() ||
        provenance.sourceConceptIds.join() !== expected.sourceConceptIds.join()
      )
        fail(
          "source-hash",
          "node.provenance",
          `노드 ${provenance?.sourceHash ?? "없음"} ≠ 원천 ${expected.sourceHash}`,
        );
      if (provenance?.status !== "AI 검수" || provenance?.humanReview !== false)
        fail("source-hash", "node.provenance", "검수 상태가 바뀌었다");
    }
  }

  if (options.issues) {
    const single = options.issues.filter(
      (issue) => issue.code === "AUTO_INTRO_SINGLE_PAGE",
    );
    if (options.issues.some((issue) => issue.severity === "error"))
      fail(
        "layout-issue",
        "issues",
        options.issues.map((issue) => issue.code).join(),
      );
    if (spread ? single.length !== 0 : single.length !== 1)
      fail(
        "layout-issue",
        "AUTO_INTRO_SINGLE_PAGE",
        `경고 ${single.length}건 (${spread ? "맞쪽" : "단면"})`,
      );
    else if (
      !spread &&
      single[0].message !==
        (even ? SINGLE_FALLBACK_MESSAGE : SINGLE_ODD_MESSAGE)
    )
      fail("layout-issue", "AUTO_INTRO_SINGLE_PAGE", single[0].message);
  }

  if (geometry)
    for (const page of pages) {
      const at = page.physicalPageIndex;
      if (
        Math.abs(page.paperMm[0] - 210) > 0.3 ||
        Math.abs(page.paperMm[1] - 297) > 0.3
      )
        fail("a4", "paper", `${page.paperMm}`, at);
      if (!page.fontReady || !page.fontFamily.includes("TextbookPretendard"))
        fail("font", "intro", page.fontFamily, at);
      const intro = page.introBoxMm;
      if (!intro) continue;
      if (
        Math.abs(intro[1] - INTRO_TOP_MM) > 0.5 ||
        intro[3] > INTRO_TOP_MM + INTRO_HEIGHT_MM + 0.5 ||
        intro[0] < 0 ||
        intro[2] > 210
      )
        fail("within-body", "intro", `도입 상자 ${intro}`, at);
      const placed = page.blocks[0]?.boxMm;
      if (
        page.part !== "single" &&
        placed &&
        Math.abs(placed[3] - placed[1] - INTRO_HEIGHT_MM) > 0.5
      )
        fail(
          "within-body",
          "block",
          `맞쪽 면 블록 높이 ${placed[3] - placed[1]}`,
          at,
        );
      if (
        page.part === "left" &&
        Math.abs(intro[3] - intro[1] - INTRO_HEIGHT_MM) > 0.5
      )
        fail("within-body", "intro", `왼쪽 면 높이 ${intro[3] - intro[1]}`, at);
      if (page.footerBoxMm && page.footerBoxMm[1] < intro[3] - 0.3)
        fail(
          "within-body",
          "footer",
          `꼬리말 ${page.footerBoxMm} / 도입 ${intro}`,
          at,
        );
      for (const anchor of page.anchors) {
        const ink = anchor.inkMm;
        // The left art is drawn 4mm into each margin by design; the paper bounds it instead.
        const [left, right] =
          anchor.name === "art" ? [0, 210] : [intro[0] - 0.5, intro[2] + 0.5];
        if (
          ink[0] < left ||
          ink[2] > right ||
          ink[1] < intro[1] - 0.5 ||
          ink[3] > intro[3] + 0.5
        )
          fail(
            "overheight",
            anchor.name,
            `글·그림 ${ink} 이 도입 상자 ${intro} 를 벗어났다`,
            at,
          );
      }
      for (let i = 0; i < page.anchors.length; i++)
        for (let j = i + 1; j < page.anchors.length; j++) {
          const depth = overlapMm(page.anchors[i].inkMm, page.anchors[j].inkMm);
          if (depth > 0.3)
            fail(
              "overlap",
              `${page.anchors[i].name}×${page.anchors[j].name}`,
              `${depth.toFixed(2)}mm 겹침: ${page.anchors[i].inkMm} / ${page.anchors[j].inkMm}`,
              at,
            );
        }
    }
  return failures;
}

const firstLine = (error: unknown): string =>
  String(error instanceof Error ? error.message : error).split(/\r?\n/)[0];
export const noAssets = async (): Promise<Uint8Array> => {
  throw new Error("The proof exchange holds no stored asset");
};

/** Loads a returned artifact as it is delivered: script-free, with every network request refused. */
export async function openArtifact(
  browser: Browser,
  html: string,
): Promise<{ page: Page; blocked: string[] }> {
  const page = await browser.newPage();
  const blocked: string[] = [];
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  await page.emulateMediaType("print");
  page.on("request", (request) => {
    if (request.url().startsWith("data:")) void request.continue();
    else {
      blocked.push(request.url());
      void request.abort();
    }
  });
  await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(
    "document.fonts.ready.then(function () { return Promise.all(Array.from(document.images).map(function (i) { return i.decode().catch(function () {}); })); }).then(function () { return true; })",
  );
  return { page, blocked };
}
export const captureIntroPages = (page: Page): Promise<CapturedIntroPage[]> =>
  page.evaluate(`(${INTRO_DOM_PROBE})(document)`) as Promise<
    CapturedIntroPage[]
  >;

export interface IntroRender {
  result: TextbookChunkResult;
  pages: CapturedIntroPage[];
  blocked: string[];
}
/** One bounded production chunk: the introduction section alone, at the given start page. */
export async function renderIntroChunk(
  browser: Browser,
  exchange: TextbookExchange,
  sectionIndices: number[],
  firstPhysicalPageIndex: number,
  options: { maxPages?: number; bypassArtGuard?: boolean } = {},
): Promise<IntroRender> {
  const result = await renderTextbookChunk({
    exchange,
    readAsset: noAssets,
    officialOrigin: SYNTHETIC_ORIGIN,
    sectionIndices,
    firstPhysicalPageIndex,
    variant: "student",
    mode: "draft",
    browser: options.bypassArtGuard
      ? witnessBrowser(browser, [], true)
      : browser,
    ...(options.maxPages ? { maxPages: options.maxPages } : {}),
  });
  const { page, blocked } = await openArtifact(browser, result.html);
  try {
    return { result, pages: await captureIntroPages(page), blocked };
  } finally {
    await page.close();
  }
}

export interface SequenceProof {
  start: number;
  sections: number;
  production: string | null;
  pages: number;
  layouts: string[];
  failures: IntroFailure[];
}
/** Several introductions in one bounded chunk: each is judged on the page it actually starts. */
export async function proveSequence(
  browser: Browser,
  cases: readonly IntroCase[],
  start: number,
): Promise<SequenceProof> {
  const exchange = introBook(cases);
  const indices = cases.map((_, index) => index);
  let production: string | null = null;
  let render: IntroRender;
  try {
    render = await renderIntroChunk(browser, exchange, indices, start);
  } catch (error) {
    production = firstLine(error);
    render = await renderIntroChunk(browser, exchange, indices, start, {
      bypassArtGuard: true,
    });
  }
  const failures: IntroFailure[] = [];
  const layouts: string[] = [];
  render.pages.forEach((page, index) => {
    if (page.physicalPageIndex !== start + index || !page.part)
      failures.push({
        caseId: "sequence",
        rule: "no-filler",
        anchor: "paper",
        page: page.physicalPageIndex,
        detail: `${index}번째 쪽: 물리 쪽 ${page.physicalPageIndex}, 면 ${page.part}`,
      });
  });
  cases.forEach((introCase, index) => {
    const sectionKey = `s-intro-${introCase.caseId}`;
    const pages = render.pages.filter((page) => page.sectionKey === sectionKey);
    layouts.push(pages.map((page) => page.part).join("+"));
    failures.push(
      ...verifyIntro(expectedIntro(introCase, index + 1), pages, {
        firstPhysicalPageIndex: pages[0]?.physicalPageIndex ?? start,
        issues: render.result.issues.filter((issue) =>
          issue.path.includes(sectionKey),
        ),
        node: introNode(exchange, index),
      }),
    );
  });
  return {
    start,
    sections: cases.length,
    production,
    pages: render.pages.length,
    layouts,
    failures,
  };
}

export const introNode = (
  exchange: TextbookExchange,
  unitIndex: number,
): unknown =>
  exchange.units[unitIndex].sections
    .find((section) => section.templateKey === "auto-unit-intro")
    ?.blocks.find((block) => block.semantic?.node?.kind === "unitIntro")
    ?.semantic?.node;

// ---------------------------------------------------------------------------------------------
// Recovery measurement: private canonical recall probes
// ---------------------------------------------------------------------------------------------

export interface WitnessedPage {
  contents: string[];
  evaluations: Array<{ source: string; value?: unknown; error?: string }>;
}
const ART_INSIDE =
  "document.querySelectorAll('.tb-auto-intro-left figure').forEach(function (f) { f.style.left = '0'; f.style.right = '0'; })";
const ART_RESTORED =
  "document.querySelectorAll('.tb-auto-intro-left figure').forEach(function (f) { f.style.left = ''; f.style.right = ''; })";
const ART_GUARDS = ["Math/figure width overflow", "Content overflow"];

/**
 * Records what the production renderer sends to its pages. Without `bypassArtGuard` nothing is
 * altered. With it, the left illustration is pulled inside its block only while one of the two
 * width guards runs, and restored before anything is printed: the fixed 254mm left block measures
 * the same, and the PDF carries the production CSS. Output made this way is not production output.
 */
export function witnessBrowser(
  browser: Browser,
  log: WitnessedPage[],
  bypassArtGuard = false,
): Browser {
  return new Proxy(browser, {
    get(target, key) {
      if (key === "newPage")
        return async () => {
          const page = await target.newPage();
          const entry: WitnessedPage = { contents: [], evaluations: [] };
          log.push(entry);
          return new Proxy(page, {
            get(inner, name) {
              if (name === "setContent")
                return (
                  html: string,
                  wait?: Parameters<Page["setContent"]>[1],
                ) => {
                  entry.contents.push(html);
                  return inner.setContent(html, wait);
                };
              if (name === "evaluate")
                return async (fn: unknown, ...args: unknown[]) => {
                  const source = String(fn);
                  const guarded =
                    bypassArtGuard &&
                    ART_GUARDS.some((guard) => source.includes(guard));
                  if (guarded) await inner.evaluate(ART_INSIDE);
                  try {
                    const value = await (
                      inner.evaluate as (...all: unknown[]) => Promise<unknown>
                    )(fn, ...args);
                    entry.evaluations.push({ source, value });
                    return value;
                  } catch (error) {
                    entry.evaluations.push({ source, error: String(error) });
                    throw error;
                  } finally {
                    if (guarded) await inner.evaluate(ART_RESTORED);
                  }
                };
              const value = Reflect.get(inner, name, inner) as unknown;
              return typeof value === "function"
                ? (value as (...all: unknown[]) => unknown).bind(inner)
                : value;
            },
          });
        };
      const value = Reflect.get(target, key, target) as unknown;
      return typeof value === "function"
        ? (value as (...all: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

export type MemoryPhase = "study" | "keywords" | "sentences";
export interface MemoryVariant {
  name: string;
  phases: readonly MemoryPhase[];
}
export const MEMORY_VARIANTS: readonly MemoryVariant[] = [
  { name: "all-three", phases: ["study", "keywords", "sentences"] },
  { name: "study-off", phases: ["keywords", "sentences"] },
  { name: "sentences-only", phases: ["sentences"] },
  { name: "keywords-only", phases: ["keywords"] },
];
/** A real section of the bank with long rows and fractions. */
export const MEMORY_SECTION_KEY = "중2::1. 수와 식::유리수와 소수";
export const PROBLEM_ANSWER = "비공개 정답";
export const PROBLEM_SOLUTION = "비공개 해설";

export interface CanonicalRow {
  rowKey: string;
  label: string;
  /** The sentence with its keys in place. */
  plain: string;
  /** The sentence the keyword phase prints: every key removed. */
  visible: string;
  keys: string[];
  /** Each plain key with the text on both sides of it: present only where the key is revealed. */
  windows: string[];
  /** Plain stretches of the sentence of eight characters or more. */
  fragments: string[];
}
/** Not a bank section: two rows whose hidden key is a display fraction, taller than a blank. */
export const SYNTHETIC_TALL_SECTION = "synthetic::tall-canonical";
const entriesOf = (sectionKey: string) => {
  if (sectionKey !== SYNTHETIC_TALL_SECTION)
    return coreConceptsForSection(sectionKey);
  const [base] = coreConceptsForSection(MEMORY_SECTION_KEY);
  return [
    {
      ...base,
      id: "synthetic-tall-c1",
      term: "절반",
      definition:
        "전체를 똑같이 둘로 나눈 것 가운데 하나를 분수로 쓰면 {$\\dfrac{1}{2}$}이다.",
    },
    {
      ...base,
      id: "synthetic-tall-c2",
      term: "삼분의 이",
      definition:
        "전체를 똑같이 셋으로 나눈 것 가운데 둘을 분수로 쓰면 {$\\dfrac{2}{3}$}이고, 이 수는 {진분수}이다.",
    },
  ];
};
export function canonicalRows(sectionKey: string): CanonicalRow[] {
  return entriesOf(sectionKey).map((entry) => {
    const pieces = splitBlankSentence(entry.definition);
    return {
      rowKey: `${entry.id}.definition`,
      label: entry.term,
      plain: pieces.map((piece) => piece.text).join(""),
      visible: pieces
        .filter((piece) => piece.kind !== "key")
        .map((piece) => piece.text)
        .join(""),
      keys: pieces
        .filter((piece) => piece.kind === "key")
        .map((piece) => piece.text),
      windows: pieces.flatMap((piece, index) => {
        if (piece.kind !== "key" || piece.text.includes("$")) return [];
        const window =
          plainEdge(pieces[index - 1]?.text ?? "", "end") +
          piece.text.replace(/\s+/g, "") +
          plainEdge(pieces[index + 1]?.text ?? "", "start");
        return window.length >= piece.text.replace(/\s+/g, "").length + 4
          ? [window]
          : [];
      }),
      fragments: pieces
        .map((piece) => piece.text)
        .join("")
        .split(/\$[^$]*\$/)
        .map((part) => part.replace(/\s+/g, ""))
        .filter((part) => part.length >= 8),
    };
  });
}

/** Four general problems with private answers, then the memory rows the production writer builds. */
export function memoryExchange(
  variant: MemoryVariant,
  sectionKey = MEMORY_SECTION_KEY,
): TextbookExchange {
  const exchange = textbookFixture(1, 4);
  exchange.config.print.coverMode = "separate";
  const entries = entriesOf(sectionKey);
  if (!entries.length) throw new Error(`No bank rows for ${sectionKey}`);
  exchange.units[0].sections.push({
    sectionKey: "memory",
    title: "개념 정리",
    templateKey: "auto-lesson",
    startPolicy: "continue",
    // The writer's blocks as they are, less the link to a frozen concept row this proof does not store.
    blocks: memoryActivityBlocks({
      entries,
      conceptKey: "concept-memory-proof",
      components: {
        conceptStudy: variant.phases.includes("study"),
        clozeRecall: variant.phases.includes("keywords"),
        sentenceRecall: variant.phases.includes("sentences"),
      } as QuickCreateComponents,
    }).map((block) => {
      if (block.kind !== "concept-recall") return block;
      const rest = { ...block };
      delete rest.conceptKey;
      return rest;
    }),
  });
  return textbookExchangeSchema.parse(exchange);
}

export interface CapturedRow {
  rowKey: string;
  phase: string;
  probe: boolean;
  heightMm: number;
  styleHeight: string;
  label: string;
  body: string;
  keys: number;
  keyText: string;
  blanks: number;
  writeLines: number;
}
/** Every memory row of a document: its phase, whether it sits in a private probe, text and height. */
export const ROW_DOM_PROBE = String.raw`function (document) {
  var mm = 25.4 / 96;
  function strip(s) { return (s || "").replace(/\s+/g, ""); }
  function textOf(el) {
    if (!el) return "";
    var clone = el.cloneNode(true);
    var maths = clone.querySelectorAll(".katex");
    for (var i = 0; i < maths.length; i++)
      maths[i].parentNode.replaceChild(
        document.createTextNode("⟦" + strip(maths[i].textContent) + "⟧"),
        maths[i]
      );
    return strip(clone.textContent);
  }
  var rows = document.querySelectorAll(".tb-memory-row[data-row-key]"), result = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i], probe = false;
    for (var up = row; up; up = up.parentNode)
      if (up.getAttribute && up.getAttribute("data-recall-probe-id") !== null) probe = true;
    var keys = row.querySelectorAll(".tb-memory-key"), keyText = "";
    for (var k = 0; k < keys.length; k++) keyText += textOf(keys[k]) + "|";
    result.push({
      rowKey: row.getAttribute("data-row-key"),
      phase: row.getAttribute("data-phase") || "",
      probe: probe,
      heightMm: Math.round(row.getBoundingClientRect().height * mm * 1000) / 1000,
      styleHeight: row.style.height || "",
      label: textOf(row.querySelector(".tb-memory-label")),
      body: textOf(row.querySelector(".tb-memory-body")),
      keys: keys.length,
      keyText: keyText,
      blanks: row.querySelectorAll(".tb-blank-keyword").length,
      writeLines: row.querySelectorAll(".tb-write-line").length
    });
  }
  return result;
}`;
export const captureRows = (page: Page): Promise<CapturedRow[]> =>
  page.evaluate(`(${ROW_DOM_PROBE})(document)`) as Promise<CapturedRow[]>;

const rowText = squash;
/** Serialised HTML or JSON as searchable text: tags and whitespace removed. */
const flatText = (text: string) =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, name: string) =>
      name === "amp"
        ? "&"
        : name === "lt"
          ? "<"
          : name === "gt"
            ? ">"
            : name === "quot"
              ? '"'
              : "'",
    )
    .replace(/\s+/g, "");
/** The stretch of plain text next to a formula boundary: formula markup never matches as text. */
const plainEdge = (text: string, side: "end" | "start") => {
  const flat = (
    side === "end" ? text.split("$").at(-1)! : text.split("$")[0]
  ).replace(/\s+/g, "");
  return side === "end" ? flat.slice(-6) : flat.slice(0, 6);
};

export interface PrivacyFailure {
  rule: string;
  rowKey: string;
  phase: string;
  detail: string;
}
/**
 * What a student may be handed for these rows. `phases` are the enabled ones; the whole-sentence
 * rule applies only where the study phase (which legitimately prints the sentence) is off.
 */
export function verifyStudentPrivacy(
  canonical: readonly CanonicalRow[],
  phases: readonly MemoryPhase[],
  subject: { rows: readonly CapturedRow[]; text: string; label: string },
): PrivacyFailure[] {
  const failures: PrivacyFailure[] = [];
  const byKey = new Map(canonical.map((row) => [row.rowKey, row]));
  const text = flatText(subject.text);
  if (subject.rows.some((row) => row.probe))
    failures.push({
      rule: "private-probe",
      rowKey: "",
      phase: "",
      detail: `${subject.label}: 비공개 측정 행이 남아 있다`,
    });
  if (/data-recall-probe-id/.test(subject.text))
    failures.push({
      rule: "private-probe",
      rowKey: "",
      phase: "",
      detail: `${subject.label}: data-recall-probe-id 가 남아 있다`,
    });
  for (const marker of [PROBLEM_ANSWER, PROBLEM_SOLUTION])
    if (text.includes(marker.replace(/\s+/g, "")))
      failures.push({
        rule: "problem-answer",
        rowKey: "",
        phase: "",
        detail: `${subject.label}: 일반 문항의 «${marker}» 이 들어 있다`,
      });
  for (const row of subject.rows) {
    const source = byKey.get(row.rowKey);
    if (!source) continue;
    if (row.phase !== "study" && row.keys)
      failures.push({
        rule: "hidden-key",
        rowKey: row.rowKey,
        phase: row.phase,
        detail: `${subject.label}: 드러난 핵심어 ${row.keys}개 «${row.keyText}»`,
      });
    if (row.phase === "keywords" && row.body !== rowText(source.visible))
      failures.push({
        rule: "hidden-key",
        rowKey: row.rowKey,
        phase: row.phase,
        detail: `${subject.label}: 본문 «${row.body}» ≠ 핵심어를 뺀 문장 «${rowText(source.visible)}»`,
      });
    if (row.phase === "keywords" && row.blanks !== source.keys.length)
      failures.push({
        rule: "hidden-key",
        rowKey: row.rowKey,
        phase: row.phase,
        detail: `${subject.label}: 빈칸 ${row.blanks}개 ≠ 핵심어 ${source.keys.length}개`,
      });
    if (row.phase === "sentences" && row.body !== "")
      failures.push({
        rule: "whole-sentence",
        rowKey: row.rowKey,
        phase: row.phase,
        detail: `${subject.label}: 통문장 칸에 글 «${row.body}»`,
      });
  }
  if (!phases.includes("study"))
    for (const source of canonical) {
      for (const window of source.windows)
        if (text.includes(window))
          failures.push({
            rule: "hidden-key",
            rowKey: source.rowKey,
            phase: "",
            detail: `${subject.label}: 학습 단계가 꺼졌는데 핵심어가 앞뒤 글과 함께 들어 있다 «${window}»`,
          });
      if (!phases.includes("keywords"))
        for (const fragment of source.fragments)
          if (text.includes(fragment))
            failures.push({
              rule: "whole-sentence",
              rowKey: source.rowKey,
              phase: "",
              detail: `${subject.label}: 통문장만 켰는데 문장의 글이 들어 있다 «${fragment}»`,
            });
    }
  return failures;
}

/** The student render model of an exchange, checked as it would be serialised. */
export const verifyStudentModel = (
  exchange: TextbookExchange,
  canonical: readonly CanonicalRow[],
  phases: readonly MemoryPhase[],
): PrivacyFailure[] =>
  verifyRenderModel(
    createTextbookRenderModel(exchange, "student"),
    canonical,
    phases,
  );
/** Any render model judged as if it were handed to a student. */
export function verifyRenderModel(
  model: TextbookRenderModel,
  canonical: readonly CanonicalRow[],
  phases: readonly MemoryPhase[],
): PrivacyFailure[] {
  const failures: PrivacyFailure[] = [];
  const add = (rule: string, rowKey: string, phase: string, detail: string) =>
    failures.push({ rule, rowKey, phase, detail: `학생 모형: ${detail}` });
  const serialised = JSON.stringify(model);
  for (const marker of [PROBLEM_ANSWER, PROBLEM_SOLUTION])
    if (serialised.includes(marker))
      add("problem-answer", "", "", `«${marker}» 이 들어 있다`);
  for (const section of model.sections)
    for (const block of section.blocks) {
      if (block.kind !== "recall") continue;
      const node = block.semantic?.node;
      if (block.answersVisible)
        add("hidden-key", "", block.phase, "answersVisible");
      if (block.phase !== "study" && node?.kind === "rows")
        for (const row of node.rows)
          if (row.rawText !== "")
            add("hidden-key", row.rowKey, block.phase, "노드에 원문이 남았다");
      for (const row of block.displayRows ?? []) {
        if (
          block.phase !== "study" &&
          row.pieces.some((piece) => piece.kind === "key")
        )
          add("hidden-key", row.rowKey, block.phase, "드러난 핵심어 조각");
        if (block.phase === "sentences" && row.pieces.length)
          add("whole-sentence", row.rowKey, block.phase, "통문장 행에 조각");
      }
    }
  if (!phases.includes("study")) {
    const text = serialised.replace(/\s+/g, "");
    for (const source of canonical) {
      for (const window of source.windows)
        if (text.includes(window))
          add(
            "hidden-key",
            source.rowKey,
            "",
            `핵심어가 앞뒤 글과 함께 들어 있다 «${window}»`,
          );
      if (!phases.includes("keywords"))
        for (const fragment of source.fragments)
          if (text.includes(fragment))
            add(
              "whole-sentence",
              source.rowKey,
              "",
              `문장의 글이 들어 있다 «${fragment}»`,
            );
    }
  }
  return failures;
}

export interface MeasurementProof {
  variant: string;
  sectionKey: string;
  phases: readonly MemoryPhase[];
  rowCount: number;
  /** Witnessed production calls. */
  measurementDocuments: number;
  probeBlocks: number;
  probeRows: number;
  probeRowsWithWholeSentence: number;
  probeHoldsProblemAnswer: boolean;
  laterDocumentsWithProbe: number;
  evaluatorSource: string;
  evaluatorHasTranspilerHelper: boolean;
  evaluatorErrors: string[];
  rowHeightsMm: Record<string, number>;
  /** Independent natural heights of the same first document. */
  naturalStudentMm: Record<string, number>;
  naturalCanonicalMm: Record<string, number>;
  rowsWhereCanonicalIsTaller: string[];
  /** Final student artifact. */
  studentRows: CapturedRow[];
  heightFailures: string[];
  privacyFailures: PrivacyFailure[];
  modelFailures: PrivacyFailure[];
  pdfTextFailures: string[];
  blocked: string[];
  result: TextbookChunkResult;
  privateDocument: string;
}

const tenth = (value: number) => Math.ceil(value * 10 - 1e-6) / 10;

/** The production chunk for one memory variant, witnessed, then judged from its returned artifact. */
export async function proveMeasurement(
  browser: Browser,
  variant: MemoryVariant,
  renderVariant: "student" | "answers" = "student",
  sectionKey = MEMORY_SECTION_KEY,
): Promise<MeasurementProof> {
  const exchange = memoryExchange(variant, sectionKey);
  const canonical = canonicalRows(sectionKey);
  const log: WitnessedPage[] = [];
  const result = await renderTextbookChunk({
    exchange,
    readAsset: noAssets,
    officialOrigin: SYNTHETIC_ORIGIN,
    // The memory section alone, as the publisher isolates an automatic lesson.
    sectionIndices: [1],
    firstPhysicalPageIndex: 2,
    variant: renderVariant,
    mode: "draft",
    browser: witnessBrowser(browser, log),
  });
  const trusted = log[0];
  const [privateDocument, ...later] = trusted.contents;
  const evaluator = trusted.evaluations.find((call) =>
    call.source.includes("tb-memory-row-measured"),
  );
  const measured = (evaluator?.value ?? {}) as {
    rowHeightsMm?: Record<string, number>;
  };

  // The first document again, on a fresh script-free page: natural heights, student and probe apart.
  const natural = await openBundled(browser, privateDocument);
  let firstRows: CapturedRow[];
  try {
    firstRows = await captureRows(natural.page);
  } finally {
    await natural.page.close();
  }
  const naturalStudentMm: Record<string, number> = {};
  const naturalCanonicalMm: Record<string, number> = {};
  for (const row of firstRows) {
    const target = row.probe ? naturalCanonicalMm : naturalStudentMm;
    target[row.rowKey] = Math.max(target[row.rowKey] ?? 0, row.heightMm);
  }
  const probeRows = firstRows.filter((row) => row.probe);

  const artifact = await openArtifact(browser, result.html);
  let studentRows: CapturedRow[];
  try {
    studentRows = await captureRows(artifact.page);
  } finally {
    await artifact.page.close();
  }
  const rowHeightsMm = measured.rowHeightsMm ?? {};
  const heightFailures: string[] = [];
  for (const source of canonical) {
    const common = rowHeightsMm[source.rowKey];
    const wanted = tenth(
      Math.max(
        naturalStudentMm[source.rowKey] ?? 0,
        naturalCanonicalMm[source.rowKey] ?? 0,
      ),
    );
    if (common === undefined)
      heightFailures.push(`${source.rowKey}: 공통 높이가 없다`);
    else if (Math.abs(common - wanted) > 0.11)
      heightFailures.push(
        `${source.rowKey}: 제품 ${common}mm ≠ 따로 잰 최댓값 ${wanted}mm`,
      );
    if (naturalCanonicalMm[source.rowKey] === undefined)
      heightFailures.push(`${source.rowKey}: 비공개 측정 행이 없다`);
  }
  for (const row of studentRows) {
    const common = rowHeightsMm[row.rowKey];
    if (common === undefined || Math.abs(row.heightMm - common) > 0.11)
      heightFailures.push(
        `${row.rowKey}/${row.phase}: 지면 ${row.heightMm}mm ≠ 공통 ${common}mm`,
      );
  }
  const expectedRows = canonical.length * variant.phases.length;
  if (renderVariant === "student" && studentRows.length !== expectedRows)
    heightFailures.push(`지면 행 ${studentRows.length}개 ≠ ${expectedRows}개`);

  return {
    variant: variant.name,
    sectionKey,
    phases: variant.phases,
    rowCount: canonical.length,
    measurementDocuments: trusted.contents.length,
    probeBlocks: (privateDocument.match(/data-recall-probe-id=/g) ?? []).length,
    probeRows: probeRows.length,
    probeRowsWithWholeSentence: probeRows.filter((row) => {
      const source = canonical.find((item) => item.rowKey === row.rowKey);
      return source && row.body === rowText(source.plain);
    }).length,
    probeHoldsProblemAnswer:
      privateDocument.includes(PROBLEM_ANSWER) ||
      privateDocument.includes(PROBLEM_SOLUTION),
    laterDocumentsWithProbe: later.filter((html) =>
      html.includes("data-recall-probe-id"),
    ).length,
    evaluatorSource: evaluator?.source ?? "",
    evaluatorHasTranspilerHelper: trusted.evaluations.some((call) =>
      /\b__name\b|\b__publicField\b|\b__async\b/.test(call.source),
    ),
    evaluatorErrors: trusted.evaluations.flatMap((call) =>
      call.error ? [call.error] : [],
    ),
    rowHeightsMm,
    naturalStudentMm,
    naturalCanonicalMm,
    rowsWhereCanonicalIsTaller: canonical
      .filter(
        (row) =>
          tenth(naturalCanonicalMm[row.rowKey] ?? 0) >
          tenth(naturalStudentMm[row.rowKey] ?? 0),
      )
      .map((row) => row.rowKey),
    studentRows,
    heightFailures,
    privacyFailures:
      renderVariant === "student"
        ? [
            ...verifyStudentPrivacy(canonical, variant.phases, {
              rows: studentRows,
              text: result.html.replace(/data:[^"')]+/g, ""),
              label: "학생 HTML",
            }),
            ...later.flatMap((html, index) =>
              verifyStudentPrivacy(canonical, variant.phases, {
                rows: [],
                text: html,
                label: `측정 뒤 문서 ${index + 2}`,
              }),
            ),
          ]
        : [],
    modelFailures:
      renderVariant === "student"
        ? verifyStudentModel(exchange, canonical, variant.phases)
        : [],
    pdfTextFailures: [],
    blocked: artifact.blocked,
    result,
    privateDocument,
  };
}

/** A measurement document refers to the bundle origin; serve those bytes and refuse the rest. */
async function openBundled(
  browser: Browser,
  html: string,
): Promise<{ page: Page }> {
  const bundle = await loadTextbookLocalBundle();
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  await page.emulateMediaType("print");
  page.on("request", (request) => {
    const resource = bundle.resources.get(request.url());
    if (resource)
      void request.respond({
        status: 200,
        contentType: resource.mimeType,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: Buffer.from(resource.bytes),
      });
    else if (request.url().startsWith("data:")) void request.continue();
    else void request.abort();
  });
  await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(
    "document.fonts.load('400 13px TextbookPretendard', '가나다').then(function () { return document.fonts.load('700 13px TextbookPretendard', '가나다'); }).then(function () { return document.fonts.ready; }).then(function () { return true; })",
  );
  return { page };
}

export interface ProbeScanRow {
  sectionKey: string;
  rows: number;
  /** Rows whose canonical sentence needs more height than anything the student sheet prints. */
  taller: Array<{ rowKey: string; studentMm: number; canonicalMm: number }>;
  /** The writer's rows of this section could not be made into a render model or a document. */
  error?: string;
}
/**
 * The first measurement document of each section, built with the renderer's own functions and
 * measured before any height is applied: where does the private probe decide the common height?
 */
export async function scanProbeSensitivity(
  browser: Browser,
  variant: MemoryVariant,
  sectionKeys: readonly string[],
): Promise<ProbeScanRow[]> {
  const bundle = await loadTextbookLocalBundle();
  const resources = {
    editorialAssetUrl: editorialResourceUrl,
    assetUrl: (): string => {
      throw new Error("The memory proof holds no stored asset");
    },
    qrDataUrl: (): string => {
      throw new Error("The memory proof holds no QR");
    },
  };
  const result: ProbeScanRow[] = [];
  for (const sectionKey of sectionKeys) {
    let html: string;
    try {
      const exchange = memoryExchange(variant, sectionKey);
      const whole = createTextbookRenderModel(exchange, "student");
      const model = { ...whole, sections: [whole.sections[1]] };
      html = textbookHtmlDocument(
        model.title,
        measurementHtml(model, resources) +
          recallMeasurementHtml(
            recallMeasurementModel(
              createTextbookRenderModel(exchange, "answers"),
              model,
            ),
            resources,
          ),
        bundle.fontCss,
        bundle.katexCss,
      );
    } catch (error) {
      result.push({ sectionKey, rows: 0, taller: [], error: firstLine(error) });
      continue;
    }
    const { page } = await openBundled(browser, html);
    try {
      const rows = await captureRows(page);
      const student: Record<string, number> = {};
      const canonical: Record<string, number> = {};
      for (const row of rows) {
        const target = row.probe ? canonical : student;
        target[row.rowKey] = Math.max(target[row.rowKey] ?? 0, row.heightMm);
      }
      result.push({
        sectionKey,
        rows: Object.keys(canonical).length,
        taller: Object.keys(canonical)
          .filter((key) => tenth(canonical[key]) > tenth(student[key] ?? 0))
          .map((rowKey) => ({
            rowKey,
            studentMm: student[rowKey] ?? 0,
            canonicalMm: canonical[rowKey],
          })),
      });
    } finally {
      await page.close();
    }
  }
  return result;
}

/**
 * The transpiler hazard this renderer must stay clear of. Under tsx (esbuild `keepNames`) the
 * inner named function is wrapped in `__name(...)`, which does not exist in the page.
 */
export function transpilerHazardProbe(): number {
  const inner = () => document.querySelectorAll("*").length;
  return inner();
}
export async function nameHazard(browser: Browser): Promise<{
  sourceHasHelper: boolean;
  error: string | null;
}> {
  const page = await browser.newPage();
  try {
    await page.setContent("<p>probe</p>");
    try {
      await page.evaluate(transpilerHazardProbe);
      return {
        sourceHasHelper: /\b__name\b/.test(String(transpilerHazardProbe)),
        error: null,
      };
    } catch (error) {
      return {
        sourceHasHelper: /\b__name\b/.test(String(transpilerHazardProbe)),
        error: String(error),
      };
    }
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Negative controls: each must be reported as a failure
// ---------------------------------------------------------------------------------------------

export interface ControlOutcome {
  name: string;
  /** True when the defect was caught, by the renderer or by the verifier. */
  caught: boolean;
  by: "renderer" | "verifier";
  detail: string;
}
const caseOf = (id: string): IntroCase => {
  const opening = unitOpenings().find((item) => item.id === id);
  if (!opening) throw new Error(`No opening ${id}`);
  return { caseId: id, opening };
};
type IntroNode = Extract<
  NonNullable<NonNullable<ManuscriptBlock["semantic"]>["node"]>,
  { kind: "unitIntro" }
>;
/** A book of one chapter whose stored node is edited after the writer produced it. */
function editedBook(
  introCase: IntroCase,
  edit: (node: IntroNode) => void,
): TextbookExchange {
  const exchange = structuredClone(introBook([introCase]));
  const node = introNode(exchange, 0) as IntroNode;
  edit(node);
  return exchange;
}
const thrown = async (run: () => Promise<unknown>): Promise<string | null> => {
  try {
    await run();
    return null;
  } catch (error) {
    return String(error instanceof Error ? error.message : error);
  }
};

export async function negativeControls(
  browser: Browser,
  options: { bypassArtGuard?: boolean } = {},
): Promise<ControlOutcome[]> {
  const outcomes: ControlOutcome[] = [];
  const renderIntro = (
    exchange: TextbookExchange,
    sectionIndices: number[],
    start: number,
    extra: { maxPages?: number } = {},
  ) =>
    renderIntroChunk(browser, exchange, sectionIndices, start, {
      ...extra,
      ...options,
    });
  const longest = caseOf("m1-03");
  const expected = expectedIntro(longest, 1);
  const verifier = (name: string, failures: IntroFailure[], rules: string[]) =>
    outcomes.push({
      name,
      by: "verifier",
      caught: rules.every((rule) => failures.some((f) => f.rule === rule)),
      detail: failures
        .slice(0, 4)
        .map((f) => `${f.rule}/${f.anchor}: ${f.detail}`)
        .join(" · "),
    });

  for (const start of [2, 3]) {
    const dropped = editedBook(longest, (node) => {
      node.goals.splice(6, 1);
    });
    const render = await renderIntro(dropped, [0], start);
    verifier(
      `dropped-goal@${start}`,
      verifyIntro(expected, render.pages, {
        firstPhysicalPageIndex: start,
        issues: render.result.issues,
        node: introNode(dropped, 0),
      }),
      ["count", "text-equal", "no-filler"],
    );
  }
  {
    const dropped = editedBook(longest, (node) => {
      node.path.pop();
    });
    const render = await renderIntro(dropped, [0], 2);
    verifier(
      "dropped-path@2",
      verifyIntro(expected, render.pages, {
        firstPhysicalPageIndex: 2,
        issues: render.result.issues,
      }),
      ["count", "no-filler"],
    );
  }
  {
    const filler = editedBook(longest, (node) => {
      node.goals.push("원고에 없는 문장을 채워 넣었다.");
    });
    const render = await renderIntro(filler, [0], 3);
    verifier(
      "filler-goal@3",
      verifyIntro(expected, render.pages, {
        firstPhysicalPageIndex: 3,
        issues: render.result.issues,
      }),
      ["count", "no-filler"],
    );
  }

  // Missing art: the delivered page with its illustration removed or left unloaded.
  for (const start of [2, 3]) {
    const { result: render } = await renderIntro(
      introBook([longest]),
      [0],
      start,
    );
    for (const [name, html] of [
      [
        "art-removed",
        render.html.replace(
          /<figure><img data-textbook-editorial-image[^>]*><\/figure>/,
          "",
        ),
      ],
      [
        "art-unloaded",
        render.html.replace(
          /(<img data-textbook-editorial-image src=")[^"]+"/,
          '$1data:image/png;base64,AAAA"',
        ),
      ],
    ] as const) {
      if (html === render.html) throw new Error(`${name}: nothing was changed`);
      const { page } = await openArtifact(browser, html);
      try {
        verifier(
          `${name}@${start}`,
          verifyIntro(expected, await captureIntroPages(page), {
            firstPhysicalPageIndex: start,
            issues: render.issues,
          }),
          [name === "art-removed" ? "retained-once" : "art-loaded"],
        );
      } finally {
        await page.close();
      }
    }
  }

  // Overheight the paginator measures: neither the right page nor the single page can hold it.
  const flood = (node: IntroNode) => {
    for (let index = 0; index < 60; index++) {
      node.goals.push(`넘치는 목표 ${index + 1}을 설명할 수 있다.`);
      node.path.push(`넘치는 소단원 ${index + 1}`);
    }
  };
  for (const start of [2, 3]) {
    const message = await thrown(() =>
      renderIntro(editedBook(longest, flood), [0], start),
    );
    outcomes.push({
      name: `overheight-lists@${start}`,
      by: "renderer",
      caught: Boolean(message?.includes("AUTO_INTRO_OVERFLOW")),
      detail: message ?? "거절하지 않고 조판했다",
    });
  }
  // Overheight the paginator cannot measure: the left page is a fixed 254mm box of absolute parts.
  for (const [name, edit] of [
    [
      "overheight-explanation",
      (node: IntroNode) => {
        node.explanation =
          "설명이 지면을 넘도록 길게 이어 쓴 문장입니다. ".repeat(40);
      },
    ],
    [
      "overheight-question",
      (node: IntroNode) => {
        node.question =
          "물음이 그림 자리까지 내려오도록 길게 이어 쓴 문장일까? ".repeat(12);
      },
    ],
  ] as const)
    for (const start of [2, 3]) {
      const book = editedBook(longest, edit);
      let render: IntroRender | undefined;
      const message = await thrown(async () => {
        render = await renderIntro(book, [0], start);
      });
      if (message !== null || !render) {
        outcomes.push({
          name: `${name}@${start}`,
          by: "renderer",
          caught: true,
          detail: message ?? "",
        });
        continue;
      }
      const node = introNode(book, 0) as IntroNode;
      const failures = verifyIntro(
        { ...expected, explanation: node.explanation, question: node.question },
        render.pages,
        { firstPhysicalPageIndex: start, issues: render.result.issues },
      );
      outcomes.push({
        name: `${name}@${start}`,
        by: "verifier",
        caught: failures.some(
          (f) => f.rule === "overheight" || f.rule === "overlap",
        ),
        detail:
          `제품은 거절하지 않고 ${render.pages.length}쪽을 냈다 · ` +
          failures
            .slice(0, 3)
            .map((f) => `${f.rule}/${f.anchor}: ${f.detail}`)
            .join(" · "),
      });
    }

  // The same on a chapter whose even start is the spread: a moderately longer text on the fixed left face.
  const spreadCase = caseOf("e3-1-1");
  for (const [name, edit] of [
    [
      "left-face-explanation-6x",
      (node: IntroNode) => {
        node.explanation = `${node.explanation} `.repeat(6).trim();
      },
    ],
    [
      "left-face-question-4x",
      (node: IntroNode) => {
        node.question = `${node.question} `.repeat(4).trim();
      },
    ],
  ] as const) {
    const book = editedBook(spreadCase, edit);
    let render: IntroRender | undefined;
    const message = await thrown(async () => {
      render = await renderIntro(book, [0], 2);
    });
    if (message !== null || !render) {
      outcomes.push({
        name: `${name}@2`,
        by: "renderer",
        caught: true,
        detail: message ?? "",
      });
      continue;
    }
    const node = introNode(book, 0) as IntroNode;
    const failures = verifyIntro(
      {
        ...expectedIntro(spreadCase, 1),
        explanation: node.explanation,
        question: node.question,
      },
      render.pages,
      { firstPhysicalPageIndex: 2, issues: render.result.issues },
    );
    outcomes.push({
      name: `${name}@2`,
      by: "verifier",
      caught: failures.some(
        (f) => f.rule === "overheight" || f.rule === "overlap",
      ),
      detail:
        `제품은 거절하지 않고 [${render.pages.map((page) => page.part)}] ${render.pages.length}쪽을 냈다 · ` +
        failures
          .slice(0, 3)
          .map((f) => `${f.rule}/${f.anchor}: ${f.detail}`)
          .join(" · "),
    });
  }

  // Source hash: the stored provenance no longer names the frozen parent.
  {
    const tampered = editedBook(longest, (node) => {
      node.provenance!.sourceHash = "0".repeat(64);
    });
    const render = await renderIntro(tampered, [0], 2);
    verifier(
      "source-hash-changed",
      verifyIntro(expected, render.pages, {
        firstPhysicalPageIndex: 2,
        issues: render.result.issues,
        node: introNode(tampered, 0),
      }),
      ["source-hash"],
    );
    const malformed = structuredClone(
      introNode(introBook([longest]), 0),
    ) as IntroNode;
    malformed.provenance!.sourceHash = "not-a-hash";
    outcomes.push({
      name: "source-hash-malformed",
      by: "renderer",
      caught: !textbookSemanticNodeSchema.safeParse(malformed).success,
      detail: "노드 계약이 64자리 16진 해시만 받는다",
    });
    const copy = structuredClone(unitOpenings()) as unknown as UnitOpening[];
    (copy[0].sections[0] as { goal: string }).goal += " ";
    outcomes.push({
      name: "parent-source-changed",
      by: "verifier",
      caught:
        sha256Hex(JSON.stringify(copy)) !== parentSourceDigest().memorySha256,
      detail: "목표 한 글자가 바뀌면 원천 요약값이 달라진다",
    });
  }

  // Bounds the renderer keeps.
  {
    const book = introBook(allIntroBooks()[0].cases);
    const pageLimit = await thrown(() =>
      renderIntro(book, [0], 2, { maxPages: 1 }),
    );
    outcomes.push({
      name: "page-limit",
      by: "renderer",
      caught: Boolean(pageLimit?.includes("PAGE_LIMIT")),
      detail: pageLimit ?? "거절하지 않았다",
    });
    const nine = introBook([
      ...allIntroBooks()[0].cases,
      ...allIntroBooks()[1].cases.map((item) => ({
        ...item,
        caseId: `${item.caseId}.second`,
      })),
    ]);
    const tooMany = await thrown(() =>
      renderIntro(nine, [0, 1, 2, 3, 4, 5, 6, 7, 8], 2),
    );
    outcomes.push({
      name: "nine-sections",
      by: "renderer",
      caught: Boolean(tooMany?.includes("1–8 contiguous")),
      detail: tooMany ?? "거절하지 않았다",
    });
    const chunk = (exchange: TextbookExchange) =>
      thrown(() =>
        renderTextbookChunk({
          exchange,
          readAsset: noAssets,
          officialOrigin: SYNTHETIC_ORIGIN,
          sectionIndices: [0],
          firstPhysicalPageIndex: 2,
          variant: "student",
          mode: "draft",
          browser,
        }),
      );
    const blocks = await chunk(textbookFixture(1, 601));
    outcomes.push({
      name: "six-hundred-blocks",
      by: "renderer",
      caught: Boolean(blocks?.includes("exceeds 600 blocks")),
      detail: blocks ?? "거절하지 않았다",
    });
    // 160 exercises of eighteen lines need more than the default 32 pages.
    const pages = await chunk(textbookFixture(1, 160));
    outcomes.push({
      name: "thirty-two-pages",
      by: "renderer",
      caught: Boolean(pages?.includes("PAGE_LIMIT")),
      detail: firstLine(pages ?? "거절하지 않았다"),
    });
    const manual = introBook([longest], () => ({
      before: [
        {
          sectionKey: "manual-even-left",
          title: "수동 구획",
          templateKey: "guide",
          startPolicy: "even-left",
          blocks: [
            { blockId: "manual-text", kind: "text", markdown: "수동 원고." },
          ],
        },
      ],
    }));
    const parity = await thrown(() => renderIntro(manual, [0], 3));
    outcomes.push({
      name: "manual-even-left@3",
      by: "renderer",
      caught: Boolean(parity?.includes("SECTION_PARITY")),
      detail: parity ?? "거절하지 않았다",
    });
  }

  // Privacy: the same judge on pages that do reveal the rows.
  {
    const studyOff = MEMORY_VARIANTS[1];
    const canonical = canonicalRows(MEMORY_SECTION_KEY);
    const answers = await proveMeasurement(browser, studyOff, "answers");
    const revealed = verifyStudentPrivacy(canonical, studyOff.phases, {
      rows: answers.studentRows,
      text: answers.result.html.replace(/data:[^"')]+/g, ""),
      label: "답지 HTML",
    });
    outcomes.push({
      name: "privacy-answers-artifact",
      by: "verifier",
      caught:
        revealed.some((f) => f.rule === "hidden-key") &&
        revealed.some((f) => f.rule === "whole-sentence"),
      detail: `${revealed.length}건: ${[...new Set(revealed.map((f) => f.rule))].join()}`,
    });
    const student = await proveMeasurement(browser, studyOff);
    const probe = await openBundled(browser, student.privateDocument);
    try {
      const leaked = verifyStudentPrivacy(canonical, studyOff.phases, {
        rows: await captureRows(probe.page),
        text: student.privateDocument,
        label: "비공개 측정 문서",
      });
      outcomes.push({
        name: "privacy-private-document",
        by: "verifier",
        caught:
          leaked.some((f) => f.rule === "private-probe") &&
          leaked.some((f) => f.rule === "whole-sentence"),
        detail: `${leaked.length}건: ${[...new Set(leaked.map((f) => f.rule))].join()}`,
      });
    } finally {
      await probe.page.close();
    }
    const general = await thrown(async () =>
      recallMeasurementHtml(
        createTextbookRenderModel(memoryExchange(studyOff), "answers"),
        { assetUrl: () => "", qrDataUrl: () => "data:image/png;base64,AA==" },
      ),
    );
    outcomes.push({
      name: "probe-with-general-problems",
      by: "renderer",
      caught: Boolean(general?.includes("recall rows only")),
      detail: general ?? "일반 문항이 든 모형을 측정 문서로 받았다",
    });
  }
  return outcomes;
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

export interface IntroRunRecord {
  caseId: string;
  bookId: string;
  grade: string;
  chapter: string;
  goals: number;
  start: number;
  /** null: the production renderer produced the chunk. Otherwise its first error line. */
  production: string | null;
  /** The pages below came from the art-guard bypass, not from production. */
  bypass: boolean;
  layout: string;
  pages: number;
  pdf: string;
  pdfSha256: string;
  singleHeightMm: number | null;
  rightBottomMm: number | null;
  failures: IntroFailure[];
  blocked: string[];
}

/** Partial ranges: a middle run of the longest chapter, its first section alone, and a two-of-seven. */
export function partialCases(): IntroCase[] {
  const longest = caseOf("m1-03").opening;
  const fractions = caseOf("e3-1-6").opening;
  return [
    {
      caseId: "m1-03.partial-3to7",
      opening: longest,
      selected: longest.sections.slice(2, 7).map((section) => section.title),
    },
    {
      caseId: "m1-03.partial-first",
      opening: longest,
      selected: [longest.sections[0].title],
    },
    {
      caseId: "e3-1-6.partial-2of7",
      opening: fractions,
      selected: [fractions.sections[1].title, fractions.sections[5].title],
    },
  ];
}

// ---------------------------------------------------------------------------------------------
// Source mutants: the application code changed in the transform step only, never on disk
// ---------------------------------------------------------------------------------------------

export interface SourceMutant {
  name: string;
  file: string;
  from: string;
  to: string;
}
const PAGINATE = "src/lib/textbook/layout/paginate.ts";
const INTRO_HTML = "src/lib/textbook/render/blocks/automaticIntro.ts";
const INTRO_WRITER = "src/lib/textbook/server/quickCreate/unitIntro.ts";
export const SOURCE_MUTANTS: readonly SourceMutant[] = [
  {
    name: "spread-on-odd-start",
    file: PAGINATE,
    from: 'next % 2 === 0 && fits(part("left")) && fits(part("right"));',
    to: 'next % 2 !== 0 && fits(part("left")) && fits(part("right"));',
  },
  {
    name: "overheight-accepted",
    file: PAGINATE,
    from: "size.heightMm <= 254 &&",
    to: "size.heightMm <= 354 &&",
  },
  {
    name: "empty-measurement-accepted",
    file: PAGINATE,
    from: "size.heightMm > 0 &&",
    to: "size.heightMm > -2 &&",
  },
  {
    name: "single-page-padded-to-254",
    file: PAGINATE,
    from: "heightMm: spread ? 254 : size.heightMm,",
    to: "heightMm: 254,",
  },
  {
    name: "introduction-top-moved",
    file: PAGINATE,
    from: "yMm: 16,",
    to: "yMm: 23,",
  },
  {
    name: "single-page-warning-dropped",
    file: PAGINATE,
    from: "if (!spread)\n        issues.push({",
    to: "if (false)\n        issues.push({",
  },
  {
    name: "manual-even-left-not-strict",
    file: PAGINATE,
    from: 'if (section.startPolicy === "even-left" && next % 2 !== 0)',
    to: "if (false)",
  },
  {
    name: "foreign-block-allowed",
    file: PAGINATE,
    from: "introParts.length !== 3 || section.blocks.length !== 3",
    to: "introParts.length !== 3",
  },
  {
    name: "introduction-page-limit-off",
    file: PAGINATE,
    from: "pages.length + chosen.length > (options.maxPages ?? 5000)",
    to: "false",
  },
  {
    name: "no-single-form",
    file: "src/lib/textbook/render/editorialProjection.ts",
    from: '["left", "right", "single"] as const',
    to: '["left", "right"] as const',
  },
  {
    name: "first-goal-not-printed",
    file: INTRO_HTML,
    from: "node.goals.map((goal) =>",
    to: "node.goals.slice(1).map((goal) =>",
  },
  {
    name: "last-path-step-not-printed",
    file: INTRO_HTML,
    from: "node.path.map((step) =>",
    to: "node.path.slice(0, -1).map((step) =>",
  },
  {
    name: "check-has-one-line",
    file: INTRO_HTML,
    from: "writingLinesHtml(2)",
    to: "writingLinesHtml(1)",
  },
  {
    name: "single-page-art-dropped",
    file: INTRO_HTML,
    from: "<figure>${art}</figure></header>",
    to: "</header>",
  },
  {
    name: "single-page-date-dropped",
    file: INTRO_HTML,
    from: "</div>${check}${date}</section>",
    to: "</div>${check}</section>",
  },
  {
    name: "left-face-key-dropped",
    file: INTRO_HTML,
    from: "${explanation}${key}</section>",
    to: "${explanation}</section>",
  },
  {
    name: "writer-drops-last-goal",
    file: INTRO_WRITER,
    from: "goals: [...opening.goals],",
    to: "goals: [...opening.goals].slice(0, -1),",
  },
  {
    name: "writer-drops-key-phrase",
    file: INTRO_WRITER,
    from: "keyPhrase: opening.keyPhrase,",
    to: "keyPhrase: undefined,",
  },
  {
    name: "writer-drops-section-hashes",
    file: INTRO_WRITER,
    from: "sourceHashes: [...sourceHashes],",
    to: "sourceHashes: [],",
  },
  {
    name: "writer-accepts-unknown-section",
    file: INTRO_WRITER,
    from: "!opening || opening.unmatched.length || !opening.sections.length",
    to: "!opening || !opening.sections.length",
  },
  {
    name: "probes-not-selected",
    file: "src/lib/textbook/render/recoveryMeasurement.ts",
    from: 'block.kind === "recall" && group !== undefined && wanted.has(group)',
    to: 'block.kind === "recall" && group !== undefined && !wanted.has(group)',
  },
  {
    name: "probe-accepts-general-blocks",
    file: "src/lib/textbook/render/html.ts",
    from: 'section.blocks.some((block) => block.kind !== "recall"),',
    to: "section.blocks.some(() => false),",
  },
  {
    name: "probe-keeps-measure-id",
    file: "src/lib/textbook/render/html.ts",
    from: '"data-recall-probe-id=",',
    to: '"data-measure-id=",',
  },
  {
    name: "student-node-keeps-row-text",
    file: "src/lib/textbook/render/model.ts",
    from: 'rows: rows.map((row) => ({ ...row, rawText: "" })),',
    to: "rows,",
  },
  {
    name: "student-rows-revealed",
    file: "src/lib/textbook/render/model.ts",
    from: 'b.phase,\n                            variant === "answers",',
    to: "b.phase,\n                            true,",
  },
  {
    name: "student-sentence-not-withheld",
    file: "src/lib/textbook/render/blocks/recall.ts",
    from: 'if (phase === "sentences" && !reveal)',
    to: "if (false)",
  },
];
const MUTANT_TESTS = [
  "src/__tests__/unit/textbookRecoveryIntro.test.ts",
  "src/__tests__/unit/textbookRecoveryMeasurement.integration.test.ts",
];

interface TaskLike {
  name: string;
  result?: { state?: string };
  tasks?: TaskLike[];
}
const failedNames = (tasks: readonly TaskLike[], prefix = ""): string[] =>
  tasks.flatMap((task) => {
    if (!task.tasks)
      return task.result?.state === "fail" ? [`${prefix}${task.name}`] : [];
    const inner = failedNames(task.tasks, `${prefix}${task.name} › `);
    // A file that fails while it is collected has no failed test to show: it still failed.
    return inner.length || task.result?.state !== "fail"
      ? inner
      : [`${prefix}${task.name} (collection or hook failed)`];
  });

/**
 * Runs the two new test files (browser parts skipped) against each mutant. The application file
 * is rewritten in memory by a transform plugin; an anchor that does not occur exactly once, or a
 * mutant no test loaded, is reported as invalid rather than as killed.
 */
async function runSourceMutants(outDir: string): Promise<void> {
  delete process.env.TEXTBOOK_PDF_TEST;
  const { startVitest } = await import("vitest/node");
  const results = [];
  for (const mutant of [null, ...SOURCE_MUTANTS]) {
    let applied = 0;
    let anchors = -1;
    const vitest = await startVitest(
      "test",
      MUTANT_TESTS,
      {
        config: "scripts/qa/textbook/vitest.config.mts",
        run: true,
        watch: false,
        reporters: [{}],
      },
      mutant
        ? {
            plugins: [
              {
                name: "intro-source-mutant",
                enforce: "pre",
                transform(code: string, id: string) {
                  if (
                    !id
                      .replaceAll("\\", "/")
                      .split("?")[0]
                      .endsWith(mutant.file)
                  )
                    return null;
                  const source = code.replaceAll("\r\n", "\n");
                  anchors = source.split(mutant.from).length - 1;
                  if (anchors !== 1) return null;
                  applied++;
                  return {
                    code: source.split(mutant.from).join(mutant.to),
                    map: null,
                  };
                },
              },
            ],
          }
        : {},
    );
    const failed = failedNames(
      vitest.state.getFiles() as unknown as TaskLike[],
    );
    await vitest.close();
    process.exitCode = 0;
    results.push({
      name: mutant?.name ?? "baseline (no mutant)",
      file: mutant?.file ?? "",
      anchors: mutant ? anchors : null,
      applied,
      failedTests: failed.length,
      killed: mutant ? applied > 0 && failed.length > 0 : null,
      firstFailures: failed.slice(0, 4),
    });
    console.info(
      `${mutant?.name ?? "baseline"}: 적용 ${applied} · 실패한 시험 ${failed.length}`,
    );
  }
  const baseline = results[0];
  const mutants = results.slice(1);
  const summary = {
    tests: MUTANT_TESTS,
    baselineFailedTests: baseline.failedTests,
    mutants: mutants.length,
    killed: mutants.filter((item) => item.killed).length,
    survived: mutants
      .filter((item) => item.applied > 0 && !item.killed)
      .map((item) => item.name),
    invalid: mutants
      .filter((item) => item.applied === 0)
      .map((item) => `${item.name} (anchors ${item.anchors})`),
    results,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "source-mutants.json"),
    JSON.stringify(summary, null, 1),
  );
  console.info(
    JSON.stringify({
      baselineFailedTests: summary.baselineFailedTests,
      mutants: summary.mutants,
      killed: summary.killed,
      survived: summary.survived,
      invalid: summary.invalid,
    }),
  );
  if (
    summary.baselineFailedTests ||
    summary.survived.length ||
    summary.invalid.length
  )
    process.exitCode = 1;
}

const RASTER = String.raw`
import json, os, sys
import pymupdf
from PIL import Image, ImageDraw, ImageFont

m = json.load(open(os.environ["INTRO_MANIFEST"], encoding="utf-8"))
out = m["out"]
os.makedirs(os.path.join(out, "png"), exist_ok=True)
os.makedirs(os.path.join(out, "contact"), exist_ok=True)
font = ImageFont.truetype(m["font"], 20)
squash = lambda s: "".join(s.split())
audit, thumbs = [], {}
for r in m["renders"]:
    doc = pymupdf.open(r["pdf"])
    text, images, sizes, pngs = "", [], [], []
    for i, page in enumerate(doc):
        name = f'{r["caseId"]}-start{r["start"]}-p{r["start"] + i}-{r["parts"][i] if i < len(r["parts"]) else "x"}.png'
        target = os.path.join(out, "png", name)
        page.get_pixmap(dpi=m["dpi"]).save(target)
        pngs.append(target)
        text += page.get_text()
        images.append(len(page.get_images(full=True)))
        sizes.append([round(page.rect.width * 25.4 / 72, 2), round(page.rect.height * 25.4 / 72, 2)])
    flat = squash(text)
    missing = [s for s in r["plain"] if squash(s) not in flat]
    audit.append({"caseId": r["caseId"], "start": r["start"], "pdfPages": len(doc), "pageMm": sizes,
                  "imagesPerPage": images, "missingText": missing,
                  "pagesWithoutArt": [r["start"] + i for i, part in enumerate(r["parts"]) if part != "right" and images[i] < 1],
                  "fonts": sorted({f[3] for p in doc for f in p.get_fonts()})})
    thumbs.setdefault(r["caseId"], {"caption": r["caption"], "pngs": []})["pngs"] += pngs
privacy = []
for item in m["privacy"]:
    flat = squash("".join(page.get_text() for page in pymupdf.open(item["pdf"])))
    privacy.append({"name": item["name"], "chars": len(flat), "checked": len(item["forbidden"]),
                    "found": [s for s in item["forbidden"] if squash(s) in flat]})
json.dump({"intro": audit, "privacy": privacy}, open(os.path.join(out, "pdf-audit.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

W, H, PAD, CAP = 440, 622, 8, 30
ids = list(thumbs)
sheets = []
for n in range(0, len(ids), 2):
    group = ids[n:n + 2]
    sheet = Image.new("RGB", (3 * W + 4 * PAD, len(group) * (H + CAP + PAD) + PAD), "white")
    draw = ImageDraw.Draw(sheet)
    for row, case in enumerate(group):
        top = PAD + row * (H + CAP + PAD)
        draw.text((PAD, top), thumbs[case]["caption"], fill="black", font=font)
        for col, png in enumerate(thumbs[case]["pngs"][:3]):
            image = Image.open(png).convert("RGB").resize((W, H), Image.LANCZOS)
            left = PAD + col * (W + PAD)
            sheet.paste(image, (left, top + CAP))
            draw.rectangle([left, top + CAP, left + W - 1, top + CAP + H - 1], outline="#888888")
    name = f'contact-{n // 2 + 1:02d}-{"_".join(group)}.png'
    sheet.save(os.path.join(out, "contact", name))
    sheets.append({"sheet": name, "cases": group})
json.dump(sheets, open(os.path.join(out, "contact", "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({"pngs": sum(len(t["pngs"]) for t in thumbs.values()), "sheets": len(sheets),
                  "pdfs": len(audit), "pdfPages": sum(a["pdfPages"] for a in audit),
                  "pdfsMissingText": sum(1 for a in audit if a["missingText"]),
                  "pdfPagesWithoutArt": sum(len(a["pagesWithoutArt"]) for a in audit),
                  "pdfPagesNotA4": sum(1 for a in audit for w, h in a["pageMm"] if abs(w - 210) > 0.3 or abs(h - 297) > 0.3),
                  "privacyPdfs": len(privacy), "privacyStringsChecked": sum(p["checked"] for p in privacy),
                  "privacyLeaks": sum(len(p["found"]) for p in privacy)}))
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outDir = args.find((arg) => !arg.startsWith("--"));
  if (!outDir)
    throw new Error(
      "Usage: intro-proof.ts <outDir> [--only ids] [--no-raster] [--self-test]",
    );
  const only = args
    .find((arg) => arg.startsWith("--only="))
    ?.slice(7)
    .split(",");
  const selfTest = args.includes("--self-test");
  if (args.includes("--mutants")) return runSourceMutants(outDir);
  mkdirSync(path.join(outDir, "pdf"), { recursive: true });
  mkdirSync(path.join(outDir, "anchors"), { recursive: true });
  const before = parentSourceDigest();
  const planSha256 = lfSha256(PLAN_FILE);
  const browser = await launchExportBrowser();
  const started = performance.now();
  try {
    const records: IntroRunRecord[] = [];
    const manifest: Array<Record<string, unknown>> = [];
    const books = [
      ...allIntroBooks(),
      ...partialCases().map((item) => ({ bookId: item.caseId, cases: [item] })),
    ];
    for (const book of books) {
      const wanted = book.cases.filter(
        (item) =>
          (!only || only.includes(item.caseId)) &&
          (!selfTest || item.caseId === "m1-03"),
      );
      if (!wanted.length) continue;
      const exchange = introBook(book.cases);
      for (const introCase of wanted) {
        const unitIndex = book.cases.indexOf(introCase);
        const expected = expectedIntro(introCase, unitIndex + 1);
        for (const start of [2, 3]) {
          let production: string | null = null;
          let render: IntroRender;
          try {
            render = await renderIntroChunk(
              browser,
              exchange,
              [unitIndex],
              start,
            );
          } catch (error) {
            production = firstLine(error);
            try {
              render = await renderIntroChunk(
                browser,
                exchange,
                [unitIndex],
                start,
                {
                  bypassArtGuard: true,
                },
              );
            } catch (inner) {
              const detail = firstLine(inner);
              records.push({
                caseId: introCase.caseId,
                bookId: book.bookId,
                grade: introCase.opening.grade,
                chapter: introCase.opening.chapter,
                goals: expected.goals.length,
                start,
                production,
                bypass: true,
                layout: "none",
                pages: 0,
                pdf: "",
                pdfSha256: "",
                singleHeightMm: null,
                rightBottomMm: null,
                failures: [
                  {
                    caseId: introCase.caseId,
                    rule: "production-render",
                    anchor: "renderTextbookChunk",
                    page: null,
                    detail: production,
                  },
                  {
                    caseId: introCase.caseId,
                    rule: "bypass-render",
                    anchor: "renderTextbookChunk",
                    page: null,
                    detail,
                  },
                ],
                blocked: [],
              });
              console.info(
                `${introCase.caseId} @${start}: 조판 실패 · ${detail}`,
              );
              continue;
            }
          }
          const failures = verifyIntro(expected, render.pages, {
            firstPhysicalPageIndex: start,
            issues: render.result.issues,
            node: introNode(exchange, unitIndex),
          });
          if (production)
            failures.unshift({
              caseId: introCase.caseId,
              rule: "production-render",
              anchor: "renderTextbookChunk",
              page: null,
              detail: production,
            });
          if (render.blocked.length)
            failures.push({
              caseId: introCase.caseId,
              rule: "offline",
              anchor: "artifact",
              page: null,
              detail: render.blocked.join(),
            });
          const pdf = path.join(
            outDir,
            "pdf",
            `${introCase.caseId}-start${start}.pdf`,
          );
          writeFileSync(pdf, render.result.pdf);
          writeFileSync(
            path.join(
              outDir,
              "anchors",
              `${introCase.caseId}-start${start}.json`,
            ),
            JSON.stringify(
              {
                expected,
                issues: render.result.issues,
                pages: render.pages,
                failures,
              },
              null,
              1,
            ),
          );
          const single = render.pages.find((page) => page.part === "single");
          const right = render.pages.find((page) => page.part === "right");
          records.push({
            caseId: introCase.caseId,
            bookId: book.bookId,
            grade: introCase.opening.grade,
            chapter: introCase.opening.chapter,
            goals: expected.goals.length,
            start,
            production,
            bypass: production !== null,
            layout: render.pages.map((page) => page.part).join("+"),
            pages: render.pages.length,
            pdf,
            pdfSha256: render.result.artifactHash,
            singleHeightMm: single?.introBoxMm
              ? Math.round(
                  (single.introBoxMm[3] - single.introBoxMm[1]) * 100,
                ) / 100
              : null,
            rightBottomMm: right
              ? Math.max(...right.anchors.map((anchor) => anchor.inkMm[3]))
              : null,
            failures,
            blocked: render.blocked,
          });
          if (render.pages.length)
            manifest.push({
              caseId: introCase.caseId,
              start,
              pdf,
              parts: render.pages.map((page) => page.part),
              caption: `${introCase.caseId} · ${introCase.opening.grade} ${introCase.opening.chapter} · 목표 ${expected.goals.length} · 맞쪽(2,3쪽) + 단면(3쪽)`,
              plain: [
                expected.title,
                expected.question,
                expected.explanation,
                expected.keyPhrase,
                ...expected.goals,
                ...expected.path.filter((step) => !step.includes("$")),
                ...expected.check,
                DATE_LABEL,
              ],
            });
          console.info(
            `${introCase.caseId} @${start}: ${render.pages.map((page) => page.part).join("+")} · 실패 ${failures.length}`,
          );
        }
      }
    }

    const measurement: Array<
      Omit<
        MeasurementProof,
        "result" | "privateDocument" | "evaluatorSource"
      > & {
        evaluatorSourceSha256: string;
        privateDocumentBytes: number;
        pdfSha256: string;
        pages: number;
      }
    > = [];
    const privacyPdfs: Array<{
      name: string;
      pdf: string;
      forbidden: string[];
    }> = [];
    const keep = (proof: MeasurementProof, name: string) => {
      const { result, privateDocument, evaluatorSource, ...report } = proof;
      const pdf = path.join(outDir, "pdf", `${name}-student.pdf`);
      writeFileSync(pdf, result.pdf);
      const rows = canonicalRows(proof.sectionKey);
      privacyPdfs.push({
        name,
        pdf,
        forbidden: [
          PROBLEM_ANSWER,
          PROBLEM_SOLUTION,
          ...(proof.phases.includes("study")
            ? []
            : rows.flatMap((row) => [
                ...row.windows,
                ...(proof.phases.includes("keywords") ? [] : row.fragments),
              ])),
        ],
      });
      measurement.push({
        ...report,
        evaluatorSourceSha256: sha256Hex(evaluatorSource),
        privateDocumentBytes: Buffer.byteLength(privateDocument),
        pdfSha256: result.artifactHash,
        pages: result.pages.length,
      });
    };
    if (!selfTest)
      for (const variant of [MEMORY_VARIANTS[1], MEMORY_VARIANTS[3]]) {
        const proof = await proveMeasurement(
          browser,
          variant,
          "student",
          SYNTHETIC_TALL_SECTION,
        );
        keep(proof, `memory-${variant.name}-synthetic-tall`);
        console.info(
          `memory ${variant.name} · 합성 행: 비공개 측정이 더 높은 행 ${proof.rowsWhereCanonicalIsTaller.length}/${proof.rowCount} · 높이 실패 ${proof.heightFailures.length} · 비공개 실패 ${proof.privacyFailures.length + proof.modelFailures.length}`,
        );
      }
    for (const variant of selfTest ? [MEMORY_VARIANTS[1]] : MEMORY_VARIANTS) {
      const proof = await proveMeasurement(browser, variant);
      keep(proof, `memory-${variant.name}`);
      console.info(
        `memory ${variant.name}: 비공개 측정 ${proof.probeBlocks}블록 ${proof.probeRows}행 · 높이 실패 ${proof.heightFailures.length} · 비공개 실패 ${proof.privacyFailures.length + proof.modelFailures.length}`,
      );
    }
    const sequence = [];
    if (!selfTest && !only) {
      const eight = allIntroBooks()
        .slice(0, 2)
        .flatMap((book) => book.cases)
        .slice(0, 8);
      for (const start of [2, 3]) {
        const proof = await proveSequence(browser, eight, start);
        sequence.push(proof);
        console.info(
          `sequence of 8 @${start}: ${proof.pages}쪽 [${proof.layouts.join(" ")}] · 실패 ${proof.failures.length}`,
        );
      }
    }
    let probeScan: unknown = "skipped";
    if (!selfTest && !only) {
      const keys = unitOpenings().flatMap((opening) =>
        opening.sections.map((section) => section.key),
      );
      const scans = [];
      for (const variant of [MEMORY_VARIANTS[1], MEMORY_VARIANTS[2]]) {
        const rows = await scanProbeSensitivity(browser, variant, keys);
        const sensitive = rows.filter((row) => row.taller.length);
        const decided = sensitive.reduce(
          (sum, row) => sum + row.taller.length,
          0,
        );
        const unmodelled = rows.filter((row) => row.error);
        scans.push({
          variant: variant.name,
          sections: rows.length,
          rows: rows.reduce((sum, row) => sum + row.rows, 0),
          sectionsWhereProbeDecides: sensitive.length,
          rowsWhereProbeDecides: decided,
          sectionsThatCannotBeModelled: unmodelled.length,
          unmodelled: unmodelled.map((row) => ({
            sectionKey: row.sectionKey,
            error: row.error,
          })),
          sensitive,
        });
        if (unmodelled.length)
          console.info(
            `probe scan ${variant.name}: 렌더 모형을 만들 수 없는 소단원 ${unmodelled.length}개`,
          );
        console.info(
          `probe scan ${variant.name}: ${rows.length}소단원 · 비공개 측정이 높이를 정하는 행 ${decided}개 (${sensitive.length}소단원)`,
        );
        const top = [...sensitive].sort(
          (a, b) => b.taller.length - a.taller.length,
        )[0];
        if (top) {
          const proof = await proveMeasurement(
            browser,
            variant,
            "student",
            top.sectionKey,
          );
          keep(proof, `memory-${variant.name}-probe-decides`);
          console.info(
            `memory ${variant.name} · ${top.sectionKey}: 비공개 측정이 더 높은 행 ${proof.rowsWhereCanonicalIsTaller.length} · 높이 실패 ${proof.heightFailures.length} · 비공개 실패 ${proof.privacyFailures.length + proof.modelFailures.length}`,
          );
        }
      }
      probeScan = scans;
      writeFileSync(
        path.join(outDir, "probe-scan.json"),
        JSON.stringify(scans, null, 1),
      );
    }
    const hazard = await nameHazard(browser);
    const bypassed = records.some((record) => record.bypass);
    const controls = selfTest
      ? []
      : await negativeControls(browser, { bypassArtGuard: bypassed });
    for (const control of controls)
      console.info(
        `control ${control.name}: ${control.caught ? "잡힘" : "놓침"} (${control.by})`,
      );

    let raster: unknown = "skipped";
    if (!args.includes("--no-raster") && !selfTest) {
      const manifestPath = path.join(outDir, "raster-manifest.json");
      writeFileSync(
        manifestPath,
        JSON.stringify({
          out: outDir,
          dpi: 110,
          font: path.join(
            process.cwd(),
            "public/textbook/editorial/fonts/NotoSansKR-700.ttf",
          ),
          renders: manifest,
          privacy: privacyPdfs,
        }),
      );
      raster = JSON.parse(
        execFileSync("python", ["-"], {
          input: RASTER,
          env: {
            ...process.env,
            PYTHONIOENCODING: "utf-8",
            INTRO_MANIFEST: manifestPath,
          },
          maxBuffer: 64 * 1024 * 1024,
        }).toString("utf8"),
      );
    }
    const after = parentSourceDigest();
    const failed = records.filter((record) => record.failures.length);
    const summary = {
      generatedBy: "scripts/qa/textbook/recovery/intro-proof.ts",
      runtime: process.execArgv.join(" "),
      selfTest,
      planSha256,
      planUnchanged: planSha256 === PLAN_SHA256,
      parentSource: {
        before,
        after,
        unchanged: JSON.stringify(before) === JSON.stringify(after),
      },
      counts: {
        cases: new Set(records.map((record) => record.caseId)).size,
        wholeChapterCases: new Set(
          records
            .filter((r) => !r.caseId.includes(".partial"))
            .map((r) => r.caseId),
        ).size,
        renders: records.length,
        spreads: records.filter((record) => record.layout === "left+right")
          .length,
        singles: records.filter((record) => record.layout === "single").length,
        pages: records.reduce((sum, record) => sum + record.pages, 0),
        goalsChecked: records.reduce((sum, record) => sum + record.goals, 0),
        failedRenders: failed.length,
        failedAnchors: failed.reduce(
          (sum, record) => sum + record.failures.length,
          0,
        ),
        productionRendered: records.filter(
          (record) => record.production === null,
        ).length,
        productionRejected: records.filter(
          (record) => record.production !== null,
        ).length,
        failedBeyondProductionGuard: records.filter((record) =>
          record.failures.some(
            (failure) => failure.rule !== "production-render",
          ),
        ).length,
      },
      productionErrors: Object.fromEntries(
        [
          ...new Set(
            records.flatMap((r) =>
              r.production
                ? [r.production.replace(/[0-9a-f-]{36}/, "<blockId>")]
                : [],
            ),
          ),
        ].map((message) => [
          message,
          records.filter(
            (r) =>
              r.production?.replace(/[0-9a-f-]{36}/, "<blockId>") === message,
          ).length,
        ]),
      ),
      controlsUsedBypass: bypassed,
      failures: failed.flatMap((record) =>
        record.failures.map((failure) => ({ start: record.start, ...failure })),
      ),
      tallest: [...records]
        .filter((record) => record.singleHeightMm !== null)
        .sort((a, b) => b.singleHeightMm! - a.singleHeightMm!)
        .slice(0, 5)
        .map((record) => ({
          caseId: record.caseId,
          singleHeightMm: record.singleHeightMm,
        })),
      measurement: measurement.map(({ studentRows, ...item }) => ({
        ...item,
        studentRowCount: studentRows.length,
      })),
      sequence,
      probeScan:
        typeof probeScan === "string"
          ? probeScan
          : (probeScan as Array<Record<string, unknown>>).map((item) =>
              Object.fromEntries(
                Object.entries(item).filter(([key]) => key !== "sensitive"),
              ),
            ),
      nameHazard: hazard,
      controls,
      raster,
      elapsedMs: Math.round(performance.now() - started),
    };
    writeFileSync(
      path.join(outDir, selfTest ? "self-test.json" : "intro-summary.json"),
      JSON.stringify(summary, null, 1),
    );
    writeFileSync(
      path.join(
        outDir,
        selfTest ? "self-test-records.json" : "intro-records.json",
      ),
      JSON.stringify(records, null, 1),
    );
    console.info(JSON.stringify({ ...summary.counts, nameHazard: hazard }));
    const measurementBad = measurement.some(
      (item) =>
        item.heightFailures.length ||
        item.privacyFailures.length ||
        item.modelFailures.length ||
        item.evaluatorErrors.length ||
        item.evaluatorHasTranspilerHelper ||
        item.probeHoldsProblemAnswer ||
        item.laterDocumentsWithProbe ||
        !item.probeRows,
    );
    if (
      failed.length ||
      measurementBad ||
      !summary.parentSource.unchanged ||
      !summary.planUnchanged ||
      controls.some((control) => !control.caught) ||
      sequence.some((proof) => proof.production || proof.failures.length) ||
      (typeof raster === "object" &&
        raster !== null &&
        [
          "pdfsMissingText",
          "pdfPagesWithoutArt",
          "pdfPagesNotA4",
          "privacyLeaks",
        ].some((key) => (raster as Record<string, number>)[key] > 0))
    )
      process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

if (/intro-proof\.ts$/.test(process.argv[1] ?? ""))
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
