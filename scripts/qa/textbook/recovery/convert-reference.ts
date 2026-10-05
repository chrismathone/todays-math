/** QA-only raw v15 -> six-kind TextbookExchange + optional semantic metadata.
 * Source questions, answers, authored trees and exchange fixtures stay outside Git.
 * node --conditions=react-server --import tsx .../convert-reference.ts SOURCE_DIR OUT_DIR
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { parseFragment } from "parse5";
import {
  textbookExchangeSchema,
  type TextbookExchange,
  type ManuscriptBlock,
} from "../../../../src/contracts/textbookExchange.contract";
import {
  canonicalHash,
  contentHash,
} from "../../../../src/lib/textbook/hash.server";
import { validateTextbookIntegrity } from "../../../../src/lib/textbook/integrity.server";
import { assertSafeSvg } from "../../../../src/lib/textbook/assets";
import type {
  TextbookSemantic,
  TextbookActivity,
  TextbookSourceFragment,
} from "../../../../src/contracts/textbookSemantic.contract";

const RAW_SHA =
  "520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb";
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
type Row = {
  rowKey: string;
  label: string;
  rawText: string;
  textFormat: "v15-tex";
};
type Source = {
  unit: string;
  page: number;
  kind: string;
  sectionName?: string;
  tone?: "forest" | "tree";
  path: string;
  scriptIndex?: number;
  blockIndex?: number;
  questionId?: string;
};
type SemanticNode = NonNullable<TextbookSemantic["node"]>;
type Semantic = TextbookSemantic & {
  source: Source;
  sourceFooter?: TextbookSourceFragment[];
  sourceQuestionHeader?: TextbookSourceFragment[];
};
type QaBlock = ManuscriptBlock & { semantic?: Semantic };
type RawQuestion = {
  id: string;
  prompt: string;
  answer: string;
  solution: string;
  kind: string;
  lines?: number;
  level?: string;
  unit: string;
  page: number;
  skill?: string;
  diagram?: { shape: string; top: string; side?: string; inside?: string };
};
type RawConcept = {
  id: string;
  title: string;
  rows: { label: string; text: string }[];
};
type RawPage = {
  page: number;
  kind: string;
  unit: string;
  title: string;
  subtitle?: string;
  section_name?: string;
  tone?: "forest" | "tree";
  stage?: string;
  mode?: "learn" | "cloze" | "sentence";
  qs?: string[];
  example?: string;
  family?: string;
  types?: string[];
  groups?: { title: string; tip: string; ids: string[] }[];
  script_index?: number;
  script_total?: number;
  script?: {
    title: string;
    subtitle: string;
    blocks: (
      | {
          kind: "turn";
          who: string;
          text: string;
          expression: "neutral" | "question" | "thinking" | "aha";
        }
      | { kind: "board"; title: string; tex: string; note: string }
    )[];
  };
  lesson?: {
    title: string;
    rule: string;
    why: string;
    example: string;
    work: string[];
    caution: string;
    concept_id: string;
  };
};
type Raw = {
  title: string;
  pages: RawPage[];
  questions: Record<string, RawQuestion>;
  concepts: RawConcept[];
  units: {
    id: string;
    title: string;
    goals: string[];
    concepts: RawConcept[];
    chapter?: unknown;
  }[];
  types: {
    id: string;
    name: string;
    tip: string;
    worked: string;
    practice: string[];
  }[];
  families: Record<string, { name: string; tip: string }>;
};

export const toMarkdown = (raw: string) =>
  raw.replace(/\[\[([\s\S]*?)\]\]/g, (_, tex: string) => `$${tex}$`);
export const texBodies = (raw: string) =>
  Array.from(raw.matchAll(/\[\[([\s\S]*?)\]\]/g), (m) => m[1]);
export const markdownTexBodies = (markdown: string) =>
  Array.from(markdown.matchAll(/\$([^$]*?)\$/g), (m) => m[1]);

const activityByKind: Record<string, TextbookActivity> = {
  cover: "cover",
  guide: "learningGuide",
  toc: "tableOfContents",
  studyplan: "learningPlan",
  unitBridge: "preparation",
  unitSpreadLeft: "unitIntro",
  unitSpreadRight: "unitIntro",
  opening: "dialogue",
  concept1: "concepts",
  concept2: "concepts",
  concept3: "concepts",
  lesson: "concepts",
  scriptcheck: "dialogueCheck",
  recall: "conceptBlankTest",
  drill: "basicCheck",
  basic: "basicCheck",
  paired: "workedExamples",
  types: "practice",
  clinic: "errorCheck",
  errors: "errorCheck",
  oral: "explainActivity",
  oralguide: "explainActivity",
  mindmap: "conceptMap",
  unitmap: "conceptMap",
  reasoning: "reasoning",
  conceptindex: "conceptIndex",
  typeindex: "typeIndex",
  typepage: "workedExamples",
};
const exerciseStages: Record<
  string,
  [TextbookActivity, TextbookExchange["items"][number]["learningStage"]]
> = {
  "선수 개념 확인": ["preparation", "preparation"],
  "유형 연습": ["practice", "type-practice"],
  "오류 점검": ["errorCheck", "error-check"],
  "짧은 복습": ["review", "cumulative-review"],
  "다시 확인": ["review", "cumulative-review"],
  "학습 점검": ["assessment", "unit-assessment"],
  "개념 이해": ["concepts", "concept-check"],
  "개념 정리": ["conceptStudy", "concept-check"],
  확인문제: ["basicCheck", "concept-check"],
  실전문제: ["assessment", "application"],
  "누적 복습": ["review", "cumulative-review"],
  "단원 평가": ["assessment", "unit-assessment"],
  "단원 마무리": ["assessment", "unit-assessment"],
  "유형 적용": ["practice", "type-practice"],
  "수와 식 종합": ["assessment", "application"],
};
function activity(p: RawPage): TextbookActivity {
  if (p.kind === "exercise") {
    assert(exerciseStages[p.stage!], `Unmapped exercise stage: ${p.stage}`);
    return exerciseStages[p.stage!][0];
  }
  if (p.kind === "fullmaster")
    return (
      {
        learn: "conceptStudy",
        cloze: "clozeRecall",
        sentence: "sentenceRecall",
      } as const
    )[p.mode!];
  if (p.kind === "practice")
    return p.stage === "설명과 적용" ? "written" : "assessment";
  assert(activityByKind[p.kind], `Unmapped kind: ${p.kind}`);
  return activityByKind[p.kind];
}

// An extraction of authored source functions, never a print or render proof.
// No source template or content from this extraction is committed to Git.
export type Tree = {
  tag?: string;
  attributes?: Record<string, string>;
  rawText?: string;
  children?: Tree[];
};
type SafeFragment = TextbookSourceFragment;
export function nativeQuestionLayouts(tree: Tree) {
  const layouts = new Map<string, { columnSpan: 1 | 2; parentClass: string }>();
  const visit = (node: Tree, ancestors: Tree[]) => {
    if (node.tag === "qa-question") {
      const id = node.attributes?.["data-id"];
      assert(id, "Original question placeholder lacks ID");
      const parent = [...ancestors]
        .reverse()
        .find((ancestor) =>
          /\b(question-grid|drill-grid|reason-grid|paired-cols|twins)\b/.test(
            ancestor.attributes?.class ?? "",
          ),
        );
      const parentClass = parent?.attributes?.class ?? "standalone";
      layouts.set(id, {
        columnSpan: /\b(question-grid|drill-grid|paired-cols|twins)\b/.test(
          parentClass,
        )
          ? 1
          : 2,
        parentClass,
      });
    }
    for (const child of node.children ?? []) visit(child, [...ancestors, node]);
  };
  visit(tree, []);
  return layouts;
}

/** Preserve native before/questions/after order without changing the raw source tree. */
export function splitNativeQuestionSlot(tree: Tree) {
  const children = tree.children ?? [];
  const slots = children.flatMap((child, index) =>
    /\b(question-grid|drill-grid|reason-grid)\b/.test(
      child.attributes?.class ?? "",
    ) && nativeQuestionLayouts(child).size
      ? [index]
      : [],
  );
  if (!slots.length) return null;
  assert.equal(
    slots.length,
    1,
    "Multiple original question slots require an explicit adapter",
  );
  const index = slots[0];
  return {
    before: { ...tree, children: children.slice(0, index) },
    after: { ...tree, children: children.slice(index + 1) },
    questionIds: [...nativeQuestionLayouts(children[index]).keys()],
    parentClass: children[index].attributes?.class,
  };
}

/** Split nested question placeholders into reading order, copying every source wrapper. */
export function nativeQuestionFlow(
  tree: Tree,
): (
  { kind: "fragment"; tree: Tree } | { kind: "question"; questionId: string }
)[] {
  if (tree.tag === "qa-question") {
    assert(
      tree.attributes?.["data-id"],
      "Native question placeholder lacks identity",
    );
    return [{ kind: "question", questionId: tree.attributes["data-id"] }];
  }
  if (!nativeQuestionLayouts(tree).size) return [{ kind: "fragment", tree }];
  const output: ReturnType<typeof nativeQuestionFlow> = [];
  let children: Tree[] = [];
  const flush = () => {
    if (children.length)
      output.push({ kind: "fragment", tree: { ...tree, children } });
    children = [];
  };
  for (const child of tree.children ?? []) {
    for (const part of nativeQuestionFlow(child)) {
      if (part.kind === "fragment") children.push(part.tree);
      else {
        flush();
        output.push(part);
      }
    }
  }
  flush();
  return output;
}

/** Match original fullSheet's lastElementChild relocation without mutating its raw AST. */
export function detachNativeEndNote(tree: Tree) {
  const last = [...(tree.children ?? [])].reverse().find((child) => child.tag);
  if (
    !last?.attributes?.class
      ?.split(/\s+/)
      .some((name) =>
        ["script-continue", "study-footer", "checkbar"].includes(name),
      )
  )
    return { content: tree, footer: undefined };
  return {
    content: {
      ...tree,
      children: (tree.children ?? []).filter((child) => child !== last),
    },
    footer: last,
  };
}
const safeTags = new Set([
  "div",
  "section",
  "span",
  "p",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
]);
export function safeFragments(
  tree: Tree,
  omitted: string[],
  typedAssets: ReadonlyMap<Tree, { assetId: string; alt: string }> = new Map(),
): SafeFragment[] {
  if (tree.rawText !== undefined)
    return [{ tag: "span", rawText: tree.rawText }];
  if (tree.tag === "qa-question" || tree.tag === "qa-video") return [];
  if (tree.tag === "img" || tree.tag === "svg") {
    const asset = typedAssets.get(tree);
    if (!asset) {
      omitted.push(tree.tag);
      return [];
    }
    // The coordinator's typed-img contract permits only a frozen asset identity/alt/class.
    return [
      {
        tag: "img",
        attributes: {
          ...(tree.attributes?.class
            ? { className: tree.attributes.class }
            : {}),
          assetId: asset.assetId,
          alt: asset.alt,
        },
      },
    ];
  }
  const aliases: Record<string, SafeFragment["tag"]> = {
    h1: "h2",
    b: "strong",
    i: "em",
    small: "span",
    "qa-math": "span",
    article: "section",
  };
  const tag = aliases[tree.tag ?? ""] ?? tree.tag;
  const children = (tree.children ?? []).flatMap((t) =>
    safeFragments(t, omitted, typedAssets),
  );
  if (!tag || !safeTags.has(tag)) return children;
  const attrs = tree.attributes ?? {};
  const classes = [
    attrs.class,
    ...(tree.tag === "small" ? ["tb-source-small"] : []),
  ]
    .filter(Boolean)
    .join(" ");
  const attributes = {
    ...(classes ? { className: classes } : {}),
    ...(attrs.colspan ? { colSpan: Number(attrs.colspan) } : {}),
    ...(attrs.rowspan ? { rowSpan: Number(attrs.rowspan) } : {}),
  };
  return [
    {
      tag: tag as SafeFragment["tag"],
      ...(Object.keys(attributes).length ? { attributes } : {}),
      children,
    },
  ];
}
async function authoredSourceTrees(
  sourceDir: string,
  raw: Raw,
  pages: RawPage[],
) {
  const context = vm.createContext({
    window: { MANUSCRIPT: raw },
    structuredClone,
    document: { querySelectorAll: () => [], querySelector: () => ({}) },
  });
  const files: Record<string, string> = {};
  for (const name of ["full.js", "chapters.js", "app.js"]) {
    let code = await readFile(path.join(sourceDir, name), "utf8");
    files[name] = sha(code);
    if (name === "app.js") {
      const at = code.indexOf(
        "\ndocument.querySelectorAll('[data-book]').forEach",
      );
      assert(at > 0, "Authored source boundary changed");
      code = code.slice(0, at);
    }
    vm.runInContext(code, context, { timeout: 2000, filename: name });
  }
  vm.runInContext(
    `
    const qaOriginalFullQuestion = fullQuestion;
    globalThis.qaNativeHeads = [];
    const qaCaptureHead = (id, options) => {
      qaNativeHeads.push({id,html:qaOriginalFullQuestion(id,options)});
    };
    math = tex => '<qa-math data-tex="' + esc(tex) + '">' + esc('[['+tex+']]') + '</qa-math>';
    fullQuestion = (id, options={}) => {
      qaCaptureHead(id,options);
      return '<qa-question data-id="'+esc(id)+'" data-worked="'+Boolean(options.worked)+'"></qa-question>';
    };
    question = (id, options={}) => {
      // Original question delegates to fullQuestion with worked:!work and tag.
      qaCaptureHead(id,{worked:options.work===false,tag:options.tag??''});
      return '<qa-question data-id="'+esc(id)+'" data-worked="'+Boolean(options.work===false)+'"></qa-question>';
    };
    video = id => '<qa-video data-id="'+esc(id)+'"></qa-video>';
    portrait = () => '';
  `,
    context,
    { timeout: 1000 },
  );
  // parse5 only parses data; it does not execute source HTML or load assets.
  const tree = (node: unknown): Tree => {
    const n = node as {
      nodeName: string;
      tagName?: string;
      value?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
    };
    return n.nodeName === "#text"
      ? { rawText: n.value ?? "" }
      : {
          tag: n.tagName ?? "fragment",
          attributes: Object.fromEntries(
            (n.attrs ?? []).map((a) => [a.name, a.value]),
          ),
          children: (n.childNodes ?? []).map(tree),
        };
  };
  const fragments: Record<number, { tree: Tree; htmlSha256: string }> = {};
  const supplemental: Record<number, { tree: Tree; htmlSha256: string }> = {};
  const questionHeads: Record<
    string,
    { tree: Tree; htmlSha256: string; page: number }
  > = {};
  for (const p of pages) {
    context.qaPage = p;
    context.qaNativeHeads = [];
    const html = vm.runInContext("body(qaPage)", context, {
      timeout: 2000,
    }) as string;
    const destination = ["fullmaster", "opening"].includes(p.kind)
      ? supplemental
      : fragments;
    destination[p.page] = {
      tree: tree(parseFragment(html)),
      htmlSha256: sha(html),
    };
    for (const captured of context.qaNativeHeads as {
      id: string;
      html: string;
    }[]) {
      const original = tree(parseFragment(captured.html));
      const heads: Tree[] = [];
      const findHead = (node: Tree) => {
        if (node.attributes?.class?.split(/\s+/).includes("qhead"))
          heads.push(node);
        else for (const child of node.children ?? []) findHead(child);
      };
      findHead(original);
      assert.equal(heads.length, 1, `Native qhead missing for ${captured.id}`);
      assert(
        !questionHeads[captured.id],
        `Repeated native qhead ${captured.id}`,
      );
      questionHeads[captured.id] = {
        tree: heads[0],
        htmlSha256: sha(captured.html),
        page: p.page,
      };
    }
  }
  return { files, fragments, supplemental, questionHeads };
}

function rawText(tree: Tree): string {
  return (
    tree.rawText ??
    (tree.children ?? []).map(rawText).join(tree.tag === "br" ? "\n" : " ")
  );
}

/** Resolve trusted source SVG class paint into the existing inert asset subset. */
async function sourceSvgAsset(tree: Tree, sourceDir: string): Promise<string> {
  const css = (
    await Promise.all(
      ["styles.css", "editorial.css", "full.css"].map((f) =>
        readFile(path.join(sourceDir, f), "utf8"),
      ),
    )
  ).join("\n");
  const paint = new Set([
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "font-size",
    "font-weight",
  ]);
  const rules = Array.from(
    css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g),
    (m) => ({
      selector: m[1].trim(),
      body: m[2],
    }),
  );
  const attrsAllowed = new Set([
    "viewBox",
    "x",
    "y",
    "cx",
    "cy",
    "r",
    "d",
    "transform",
    "text-anchor",
    "role",
    "aria-label",
  ]);
  const escapeText = (v: string) =>
    v.replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
    );
  const escapeAttr = (v: string) => {
    assert(!/[&\"<>]/.test(v), "SVG attribute outside safe subset");
    return v;
  };
  const serialize = (t: Tree, ancestors: string[]): string => {
    if (t.rawText !== undefined) return escapeText(t.rawText);
    assert(
      ["svg", "g", "path", "circle", "text"].includes(t.tag!),
      `Unexpected trusted SVG tag ${t.tag}`,
    );
    const classes = (t.attributes?.class ?? "").split(/\s+/);
    const attributes = Object.fromEntries(
      Object.entries(t.attributes ?? {}).filter(([k]) => attrsAllowed.has(k)),
    );
    if (t.tag === "svg") {
      attributes.xmlns = "http://www.w3.org/2000/svg";
      attributes["font-family"] = "Noto Sans KR";
    }
    for (const rule of rules)
      for (const selector of rule.selector.split(",")) {
        const match = /^\.([\w-]+)(?:\s+(path|circle))?$/.exec(selector.trim());
        if (
          !match ||
          !(match[2]
            ? t.tag === match[2] && ancestors.includes(match[1])
            : classes.includes(match[1]))
        )
          continue;
        for (const declaration of rule.body.split(";")) {
          const at = declaration.indexOf(":");
          if (at < 0) continue;
          const key = declaration.slice(0, at).trim(),
            value = declaration.slice(at + 1).trim();
          if (paint.has(key)) attributes[key] = value;
        }
      }
    return `<${t.tag}${Object.entries(attributes)
      .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
      .join(
        "",
      )}>${(t.children ?? []).map((child) => serialize(child, [...ancestors, ...classes])).join("")}</${t.tag}>`;
  };
  const svg = serialize(tree, []);
  assertSafeSvg(svg);
  return svg;
}

export async function convertReference(sourceDir: string, outDir: string) {
  const rawBytes = await readFile(path.join(sourceDir, "manuscript.json"));
  assert.equal(
    sha(rawBytes),
    RAW_SHA,
    "Only the approved original manuscript is accepted",
  );
  const raw: Raw = JSON.parse(rawBytes.toString("utf8"));
  const manifest = JSON.parse(
    await readFile(
      new URL("./reference-manifest.json", import.meta.url),
      "utf8",
    ),
  ) as { selectedPhysicalPages: number[] };
  const pages = raw.pages.filter((p) =>
    manifest.selectedPhysicalPages.includes(p.page),
  );
  assert.deepEqual(
    raw.pages.filter((p) => p.unit === "U01").map((p) => p.page),
    Array.from({ length: 36 }, (_, i) => i + 8),
  );
  const authored = await authoredSourceTrees(sourceDir, raw, pages);
  const nativeLayouts = new Map<
    string,
    { columnSpan: 1 | 2; parentClass: string }
  >();
  for (const entry of Object.values(authored.fragments))
    for (const [id, layout] of nativeQuestionLayouts(entry.tree)) {
      assert(
        !nativeLayouts.has(id),
        `Repeated original question placeholder: ${id}`,
      );
      nativeLayouts.set(id, layout);
    }
  const out = path.resolve(outDir);
  // Refuse private fixtures inside ANY worktree of this repository, not just cwd.
  const repoFamily = path.resolve(process.cwd(), "..");
  assert(
    !out.toLowerCase().startsWith(repoFamily.toLowerCase() + path.sep),
    "Private fixture output must be outside Git worktrees",
  );
  await mkdir(path.join(out, "assets"), { recursive: true });
  const exchange: TextbookExchange = {
    schemaVersion: "injaewon.textbook.exchange.v1",
    exportedAt: "2026-10-05T00:00:00Z",
    canonicalizationVersion: "injaewon.textbook.c14n.v1",
    config: {
      bookId: "v15-reference",
      schoolLevel: "middle",
      grade: 2,
      semester: 1,
      volume: 1,
      volumeCount: 1,
      displayCode: "2-1-1",
      title: raw.title,
      curriculumVersion: "v15-original",
      mode: "integrated",
      pageBudget: { target: 259, tolerance: 259, strict: false },
      print: {
        paper: "A4",
        innerMarginMm: 18,
        outerMarginMm: 13,
        sectionStart: "even-left",
        coverMode: "included",
        firstPhysicalPageIndex: 1,
      },
      videoPolicy: "optional",
    },
    edition: {
      editionId: "v15-reference-edition",
      label: "G0a QA",
      status: "draft",
      revision: 1,
      publishedAt: null,
      manifestHash: null,
    },
    units: [],
    items: [],
    snapshots: [],
    assets: [],
    qrTargets: [],
    videoBindings: [],
    pageMap: [],
    rendererVersion: "qa-reference-converter.v1",
    templateVersion: "qa-reference-converter.v1",
  };
  const assetFiles: Record<string, string> = {};
  async function addAsset(
    id: string,
    bytes: Uint8Array,
    mimeType: "image/png" | "image/svg+xml",
  ) {
    const file = `assets/${id}.${mimeType === "image/png" ? "png" : "svg"}`;
    exchange.assets.push({
      assetId: id,
      packagePath: file,
      mimeType,
      sha256: sha(bytes),
      widthPx: null,
      heightPx: null,
    });
    await writeFile(path.join(out, file), bytes);
    assetFiles[id] = file;
    return exchange.assets.at(-1)!;
  }
  const originalPortraits = {
    "teacher-f1": "assets/portraits/teacher-expressions.png",
    "student-f1": "assets/portraits/minseo-expressions.png",
    "student-m1": "assets/portraits/jiho-expressions.png",
  };
  const portraitProvenance = [];
  for (const [who, filename] of Object.entries(originalPortraits)) {
    const bytes = await readFile(path.join(sourceDir, filename));
    await addAsset(who, bytes, "image/png");
    portraitProvenance.push({
      assetId: who,
      originalFilename: filename,
      sha256: sha(bytes),
      rendererNamespace:
        who === "teacher-f1" ? "tb-portrait-teacher-m1" : `tb-portrait-${who}`,
    });
  }
  const provenance: { blockId: string; semantic: Semantic; raw?: unknown }[] =
    [];
  const nativeFooterRelocations: {
    page: number;
    rawFooterTreeSha256: string;
    originalClass: string;
    carrierBlockId: string;
    route: "semantic.sourceFooter";
  }[] = [];
  const preservation: {
    path: string;
    rawSha256: string;
    texSha256: string;
    texCount: number;
  }[] = [];
  const publicExamples: string[] = [];
  const routedSourceStructures: {
    page: number;
    structure: string;
    route: string;
  }[] = [];
  const questionOrdinals = new Map(
    Object.keys(raw.questions).map((id, i) => [id, i + 1]),
  );
  const usedQuestions = new Set<string>();
  const references = JSON.parse(
    await readFile(
      path.join(process.cwd(), "src/lib/textbook/scripts/reference-v15.json"),
      "utf8",
    ),
  ) as { pages: { unit: string; page: number; sectionKey: string }[] };
  const sectionKeys = Array.from(
    new Set(
      references.pages.filter((p) => p.unit === "U01").map((p) => p.sectionKey),
    ),
  );
  assert.equal(sectionKeys.length, 2);
  function remember(value: string, sourcePath: string) {
    const markdown = toMarkdown(value);
    assert.deepEqual(
      markdownTexBodies(markdown),
      texBodies(value),
      `TeX bytes changed at ${sourcePath}`,
    );
    preservation.push({
      path: sourcePath,
      rawSha256: sha(value),
      texSha256: sha(JSON.stringify(texBodies(value))),
      texCount: texBodies(value).length,
    });
    return markdown;
  }
  for (const p of pages) {
    let unit = exchange.units.find((u) => u.unitKey === p.unit);
    const rawUnit = raw.units.find((u) => u.id === p.unit);
    if (!unit) {
      unit = {
        unitKey: p.unit,
        title: rawUnit?.title ?? p.unit,
        sourceUnitIds: [],
        prerequisites: [],
        goals: rawUnit?.goals ?? [],
        conceptLectureRefs: [],
        sections: [],
      };
      exchange.units.push(unit);
    }
    const sectionKey = `reference-p${String(p.page).padStart(3, "0")}`;
    const blocks: QaBlock[] = [];
    const authoredPage =
      authored.fragments[p.page]?.tree ?? authored.supplemental[p.page]?.tree;
    const nativeParts = authoredPage
      ? detachNativeEndNote(authoredPage)
      : undefined;
    const source: Source = {
      unit: p.unit,
      page: p.page,
      kind: p.kind,
      ...(p.section_name !== undefined ? { sectionName: p.section_name } : {}),
      tone: p.tone ?? "forest",
      path: `pages[${p.page - 1}]`,
    };
    const semantic = (node?: SemanticNode, suffix = ""): Semantic => ({
      activity: activity(p),
      source: { ...source, path: source.path + suffix },
      title: p.title,
      ...(p.subtitle ? { subtitle: p.subtitle } : {}),
      ...(node ? { node } : {}),
    });
    const put = (block: QaBlock, rawValue?: unknown) => {
      blocks.push(block);
      provenance.push({
        blockId: block.blockId,
        semantic: block.semantic!,
        ...(rawValue === undefined ? {} : { raw: rawValue }),
      });
    };
    const text = (key: string, value: string, node?: SemanticNode) =>
      put({
        kind: "text",
        blockId: `v15.p${p.page}.${key}`,
        markdown: remember(value, `${source.path}.${key}`),
        semantic: semantic(node),
      });
    async function problem(id: string, worked = false, group?: SemanticNode) {
      assert(!usedQuestions.has(id), `Duplicate original question use: ${id}`);
      usedQuestions.add(id);
      const q = raw.questions[id];
      assert(q, `Missing question: ${id}`);
      const figures: TextbookExchange["snapshots"][number]["payload"]["figures"] =
        [];
      if (q.diagram) {
        const d = q.diagram;
        const escape = (s: string) =>
          s.replace(
            /[&<>\"]/g,
            (c) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
          );
        const shape =
          d.shape === "triangle"
            ? "M22 82L192 82L100 12Z M100 12V82 M100 72H110V82"
            : "M25 24H185V80H25Z";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 100"><path d="${shape}" fill="none" stroke="#475b56" stroke-width="1.5"/><text x="100" y="14">${escape(d.top)}</text><text x="194" y="58">${escape(d.side ?? "")}</text><text x="92" y="60">${escape(d.inside ?? "")}</text></svg>`;
        const asset = await addAsset(
          `v15-${id}-diagram`,
          Buffer.from(svg),
          "image/svg+xml",
        );
        figures.push({
          assetId: asset.assetId,
          sha256: asset.sha256,
          choiceIndex: null,
          sourceWidthMm: 65,
          altText: null,
        });
      }
      const payload = {
        format: "markdown-latex" as const,
        content: remember(q.prompt, `questions.${id}.prompt`),
        answer: remember(q.answer, `questions.${id}.answer`),
        solution: remember(q.solution, `questions.${id}.solution`),
        questionType: q.kind,
        figures,
      };
      const snapshotId = `v15.${id}.snapshot`;
      exchange.snapshots.push({
        snapshotId,
        source: { system: "studio-authored", localId: id },
        sourceUpdatedAt: null,
        capturedAt: "2026-10-05T00:00:00Z",
        unitId: null,
        familyKey: p.family ?? null,
        difficulty: q.level ?? null,
        problemType: q.skill ?? null,
        payload,
        contentHash: contentHash(payload),
      });
      const stage = worked
        ? "worked-example"
        : p.kind === "exercise"
          ? exerciseStages[p.stage!][1]
          : activity(p) === "written" || p.kind === "reasoning"
            ? "written"
            : activity(p) === "errorCheck"
              ? "error-check"
              : activity(p) === "review"
                ? "cumulative-review"
                : activity(p) === "assessment"
                  ? "unit-assessment"
                  : activity(p) === "preparation"
                    ? "preparation"
                    : ["paired", "types", "typepage"].includes(p.kind)
                      ? "type-practice"
                      : "concept-check";
      const lines = worked ? 0 : Math.max(1, q.lines ?? 2);
      exchange.items.push({
        itemId: id,
        editionId: exchange.edition.editionId,
        snapshotId,
        linkStatus: "unlinked",
        sourceTestId: null,
        sourceTestProblemId: null,
        unitKey: p.unit,
        sectionKey,
        learningStage: stage,
        displayNumber: String(questionOrdinals.get(id)).padStart(4, "0"),
        orderIndex: exchange.items.length,
        layout: {
          columnSpan: (() => {
            const originalLayout = nativeLayouts.get(id);
            assert(originalLayout, `Missing native question parent for ${id}`);
            return originalLayout.columnSpan;
          })(),
          minWorkLines: lines,
          preferredWorkLines: lines,
          maxWorkLines: Math.max(lines, 12),
          keepTogether: true,
        },
        qrTargetId: null,
      });
      if (worked) publicExamples.push(id);
      const sem = semantic(group);
      sem.source.questionId = id;
      sem.source.path = `questions.${id}`;
      const nativeHead = authored.questionHeads[id];
      assert(nativeHead, `Missing original question header ${id}`);
      const omittedHeader: string[] = [];
      sem.sourceQuestionHeader = (nativeHead.tree.children ?? []).flatMap(
        (child) => safeFragments(child, omittedHeader),
      );
      assert.equal(omittedHeader.length, 0);
      put(
        {
          kind: "problem",
          blockId: `v15.${id}.problem`,
          itemId: id,
          semantic: sem,
        },
        q,
      );
    }
    if (p.script) {
      p.script.blocks.forEach((b, i) => {
        const sem = semantic();
        sem.source.scriptIndex = p.script_index!;
        sem.source.blockIndex = i;
        sem.source.path += `.script.blocks[${i}]`;
        sem.continuation = (p.script_index ?? 1) > 1;
        if (b.kind === "board") {
          sem.node = {
            kind: "board",
            title: b.title,
            tex: b.tex,
            note: b.note,
          };
          put(
            {
              blockId: `v15.p${p.page}.b${i}`,
              kind: "text",
              markdown: remember(`[[${b.tex}]]`, sem.source.path),
              semantic: sem,
            },
            b,
          );
        } else {
          const portraitId =
            b.who === "선생님"
              ? "teacher-f1"
              : b.who === "민서"
                ? "student-f1"
                : "student-m1";
          // Use the existing atlas opt-in namespace so four-expression assets
          // are cropped to the selected expression instead of printed whole.
          const speakerId =
            portraitId === "teacher-f1"
              ? "tb-portrait-teacher-m1"
              : `tb-portrait-${portraitId}`;
          assert(
            ["선생님", "민서", "지호"].includes(b.who),
            `Unknown speaker: ${b.who}`,
          );
          put(
            {
              blockId: `v15.p${p.page}.b${i}`,
              kind: "dialogue",
              turns: [
                {
                  speakerId,
                  side: portraitId === "teacher-f1" ? "left" : "right",
                  expression: b.expression,
                  portraitAssetId: portraitId,
                  mirrorPortrait: portraitId === "student-m1",
                  markdown: remember(b.text, sem.source.path),
                  presentation: {
                    kind: "speech",
                    lessonKey: p.unit,
                    lessonTitle: p.script!.title,
                  },
                },
              ],
              semantic: sem,
            } as QaBlock,
            b,
          );
        }
      });
    } else if (p.kind === "fullmaster") {
      assert(
        nativeParts?.footer?.attributes?.class
          ?.split(/\s+/)
          .includes("study-footer"),
      );
      const phase = {
        learn: "study",
        cloze: "keywords",
        sentence: "sentences",
      }[p.mode!] as "study" | "keywords" | "sentences";
      for (const c of rawUnit!.concepts) {
        const rows: Row[] = c.rows.map((r, i) => ({
          rowKey: `${p.unit}.${c.id}.r${i + 1}`,
          label: r.label,
          rawText: r.text,
          textFormat: "v15-tex",
        }));
        // Compatibility-only markdown adapts the old non-nesting blank grammar.
        // Semantic rawText/rowKey remain identical across all three phases.
        const markdown = rows
          .map((r) => {
            const converted = toMarkdown(r.rawText);
            const plain = converted.replace(/\{\{([\s\S]*?)\}\}/g, "$1");
            return `${r.label}: ${phase === "study" ? plain : phase === "keywords" ? converted.replace(/\{\{([\s\S]*?)\}\}/g, "[[$1]]") : "{{" + plain + "}}"}`;
          })
          .join("\n\n");
        for (const r of rows)
          remember(r.rawText, `${p.unit}.${c.id}.${r.rowKey}`);
        put(
          {
            blockId: `v15.p${p.page}.${c.id}`,
            kind: "concept-recall",
            phase,
            markdown,
            showRepetitionChecks: phase === "study",
            semantic: semantic({
              kind: "concept",
              conceptId: c.id,
              title: c.title,
              rows,
            }),
          },
          c,
        );
      }
    } else if (["paired", "types", "typepage"].includes(p.kind)) {
      const groups =
        p.kind === "paired"
          ? p.groups!
          : p.kind === "types"
            ? p.types!.map((id) => {
                const t = raw.types.find((t) => t.id === id)!;
                return {
                  title: t.name,
                  tip: t.tip,
                  ids: [t.worked, ...t.practice],
                };
              })
            : [
                {
                  title: p.title,
                  tip: raw.families[p.family!]?.tip ?? p.subtitle ?? "",
                  ids: [p.example!, ...(p.qs ?? [])],
                },
              ];
      for (const [i, g] of groups.entries()) {
        const node: SemanticNode = {
          kind: "exampleGroup",
          groupId: `${p.unit}.p${p.page}.g${i + 1}`,
          title: g.title,
          strategy: g.tip,
          exampleItemId: g.ids[0],
          confirmItemIds: g.ids.slice(1),
        };
        text(`group${i + 1}`, g.tip, node);
        for (const [j, id] of g.ids.entries()) await problem(id, j === 0, node);
      }
    } else {
      // Source-only extraction preserves diagram/table hierarchy as bounded AST.
      // SVG paths remain private source evidence until typed diagram integration.
      const fragment = nativeParts?.content;
      if (fragment) {
        const typedAssets = new Map<Tree, { assetId: string; alt: string }>();
        const imageBindings = new Map<
          string,
          { assetId: string; alt: string }
        >();
        let imageIndex = 0,
          vectorIndex = 0;
        const bindAssets = async (t: Tree): Promise<void> => {
          if (t.tag === "img") {
            const relative = t.attributes?.src;
            assert(relative, "Source image lacks URL");
            const existing = imageBindings.get(relative);
            if (existing) {
              typedAssets.set(t, { ...existing, alt: t.attributes?.alt ?? "" });
              return;
            }
            const filename = path.resolve(sourceDir, relative);
            assert(
              filename.startsWith(path.resolve(sourceDir) + path.sep),
              "Unsafe source asset path",
            );
            const id = `v15.p${p.page}.image${++imageIndex}`;
            await addAsset(id, await readFile(filename), "image/png");
            const binding = { assetId: id, alt: t.attributes?.alt ?? "" };
            imageBindings.set(relative, binding);
            typedAssets.set(t, binding);
          } else if (t.tag === "svg") {
            const id = `v15.p${p.page}.svg${++vectorIndex}`;
            await addAsset(
              id,
              Buffer.from(await sourceSvgAsset(t, sourceDir)),
              "image/svg+xml",
            );
            typedAssets.set(t, {
              assetId: id,
              alt: t.attributes?.["aria-label"] ?? "",
            });
          } else for (const child of t.children ?? []) await bindAssets(child);
        };
        await bindAssets(fragment);
        const omitted: string[] = [];
        if (p.kind === "oral") {
          const flow = nativeQuestionFlow(fragment);
          assert.deepEqual(
            flow.flatMap((part) =>
              part.kind === "question" ? [part.questionId] : [],
            ),
            p.qs ?? [],
            "Native oral question reading order changed",
          );
          let fragmentIndex = 0;
          for (const part of flow) {
            if (part.kind === "question") await problem(part.questionId);
            else {
              const nativeFragments = safeFragments(
                part.tree,
                omitted,
                typedAssets,
              );
              assert.equal(
                omitted.length,
                0,
                "Native oral asset lacks frozen binding",
              );
              if (nativeFragments.length) {
                const key = fragmentIndex++
                  ? `authored.flow${fragmentIndex - 1}`
                  : "authored";
                text(
                  key,
                  nativeFragments
                    .map((f) => rawText(f as Tree))
                    .join("\n")
                    .trim(),
                  {
                    kind: "fragments",
                    fragments: nativeFragments,
                  },
                );
              }
            }
          }
        } else {
          const slot = splitNativeQuestionSlot(fragment);
          if (slot)
            assert.deepEqual(
              slot.questionIds,
              p.qs ?? [],
              "Native question slot order changed",
            );
          const fragments = safeFragments(
            slot?.before ?? fragment,
            omitted,
            typedAssets,
          );
          assert.equal(
            omitted.length,
            0,
            "A source image/vector has no typed frozen asset",
          );
          for (const [tree, binding] of typedAssets)
            routedSourceStructures.push({
              page: p.page,
              structure: tree.tag!,
              route: `inline-verified-image-asset:${binding.assetId}`,
            });
          const compatibleText = fragments
            .map((f) => rawText(f as Tree))
            .join("\n")
            .trim();
          if (fragments.length)
            text("authored", compatibleText, { kind: "fragments", fragments });
          if (slot) {
            for (const id of slot.questionIds) await problem(id);
            const afterFragments = safeFragments(
              slot.after,
              omitted,
              typedAssets,
            );
            assert.equal(
              omitted.length,
              0,
              "Original after-question asset lacks binding",
            );
            if (afterFragments.length)
              text(
                fragments.length ? "authored.after-questions" : "authored",
                afterFragments
                  .map((f) => rawText(f as Tree))
                  .join("\n")
                  .trim(),
                { kind: "fragments", fragments: afterFragments },
              );
          }
        }
      }
      if (!blocks.length)
        text("page", "", {
          kind: "referencePage",
          referenceKind: p.kind,
          sourcePage: p.page,
        });
      for (const id of p.qs ?? [])
        if (!usedQuestions.has(id)) await problem(id);
    }
    if (nativeParts?.footer) {
      assert(
        blocks.length,
        "Native end note must have an existing source block carrier",
      );
      const omittedFooter: string[] = [];
      blocks[0].semantic!.sourceFooter = safeFragments(
        nativeParts.footer,
        omittedFooter,
      );
      assert.equal(omittedFooter.length, 0);
      nativeFooterRelocations.push({
        page: p.page,
        rawFooterTreeSha256: sha(JSON.stringify(nativeParts.footer)),
        originalClass: nativeParts.footer.attributes?.class ?? "",
        carrierBlockId: blocks[0].blockId,
        route: "semantic.sourceFooter",
      });
    }
    unit.sections.push({
      sectionKey,
      title: p.title,
      templateKey: `reference-${p.kind}`,
      startPolicy: "continue",
      blocks,
    });
  }
  // Compatibility validation is always available while the root integrates
  // optional fields. The lossless semantic fixture is NOT silently stripped.
  const base = structuredClone(exchange);
  for (const u of base.units)
    for (const s of u.sections)
      for (const b of s.blocks as QaBlock[]) {
        delete b.semantic;
        if (b.kind === "dialogue")
          for (const t of b.turns)
            delete (t as typeof t & { presentation?: unknown }).presentation;
      }
  textbookExchangeSchema.parse(base);
  const baseIssues = await validateTextbookIntegrity(base, {
    mode: "draft",
    readAsset: async (id) =>
      new Uint8Array(await readFile(path.join(out, assetFiles[id]))),
  });
  assert.equal(
    baseIssues.filter((i) => i.severity === "error").length,
    0,
    JSON.stringify(baseIssues),
  );
  const semanticResult = textbookExchangeSchema.safeParse(exchange);
  const counts = {
    selectedPages: pages.length,
    sections: exchange.units.reduce((n, u) => n + u.sections.length, 0),
    blocks: provenance.length,
    questions: exchange.items.length,
    snapshots: exchange.snapshots.length,
    speech: provenance.filter(
      (x) => (x.raw as { kind?: string })?.kind === "turn",
    ).length,
    boards: provenance.filter((x) => x.semantic.node?.kind === "board").length,
    publicExamples: publicExamples.length,
    fullmasterRows: provenance
      .filter((x) => x.semantic.node?.kind === "concept")
      .reduce(
        (n, x) => n + (x.semantic.node as { rows: Row[] }).rows.length,
        0,
      ),
    texBodies: preservation.reduce((n, x) => n + x.texCount, 0),
    nativeEndNotes: nativeFooterRelocations.length,
    nativeQuestionHeaders: Object.keys(authored.questionHeads).length,
  };
  const files = {
    "exchange-base.json": base,
    "exchange-semantic.json": exchange,
    "source-map.json": {
      version: 1,
      manuscriptSha256: RAW_SHA,
      sectionKeys,
      pages: pages.map((p) => ({
        page: p.page,
        unit: p.unit,
        kind: p.kind,
        sectionKey: `reference-p${String(p.page).padStart(3, "0")}`,
      })),
      provenance,
      authored: { files: authored.files, fragments: authored.fragments },
      authoredSupplement: authored.supplemental,
      questionHeaderSupplement: authored.questionHeads,
      nativeFooterRelocations,
      portraitProvenance,
      nativeQuestionLayouts: Object.fromEntries(nativeLayouts),
      rawPages: pages,
      sourceUnits: raw.units,
      routedSourceStructures,
      preservation,
      publicExampleItemIds: publicExamples,
      assetFiles,
    },
    "converter-evidence.json": {
      counts,
      manuscriptSha256: RAW_SHA,
      exchangeHash: canonicalHash(exchange),
      baseHash: canonicalHash(base),
      baseIntegrityErrors: 0,
      semanticSchemaAccepted: semanticResult.success,
      semanticSchemaIssues: semanticResult.success
        ? []
        : semanticResult.error.issues.map((i) => ({
            path: i.path,
            code: i.code,
          })),
      sectionKeys,
      originalStudentVisualEquality:
        "pending production renderer integration and comparison",
      answerFunctionalChecks:
        "payload preservation passed; output projection pending",
      routedSourceStructures,
      limits: [
        "Authored layout AST preserves source hierarchy; it is not proof of rendered diagram/column equality.",
        "Diagrams preserve raw geometry metadata; SVG labels require matching KaTeX renderer support.",
        "Original types pages contain public examples in app.js; do not infer all types questions are unsolved.",
      ],
    },
  };
  for (const [name, value] of Object.entries(files))
    await writeFile(
      path.join(out, name),
      JSON.stringify(value, null, 2) + "\n",
    );
  console.info(
    JSON.stringify({
      counts,
      semanticSchemaAccepted: semanticResult.success,
      output: out,
      exchangeHash: canonicalHash(exchange),
    }),
  );
  return { exchange, base, counts, provenance, publicExamples };
}

if (process.argv[1]?.endsWith("convert-reference.ts")) {
  const [source, output] = process.argv.slice(2);
  assert(source && output, "SOURCE_DIR and external OUT_DIR required");
  convertReference(path.resolve(source), output).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
