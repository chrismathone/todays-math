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
import { textbookExchangeSchema, type TextbookExchange, type ManuscriptBlock } from "../../../../src/contracts/textbookExchange.contract";
import { canonicalHash, contentHash } from "../../../../src/lib/textbook/hash.server";
import { TEXTBOOK_CHARACTERS } from "../../../../src/lib/textbook/characters";
import { validateTextbookIntegrity } from "../../../../src/lib/textbook/integrity.server";
import { assertSafeSvg } from "../../../../src/lib/textbook/assets";
import type { TextbookSemantic, TextbookActivity, TextbookSourceFragment } from "../../../../src/contracts/textbookSemantic.contract";

const RAW_SHA = "520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb";
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
type Row = { rowKey: string; label: string; rawText: string; textFormat: "v15-tex" };
type Source = { unit: string; page: number; kind: string; path: string; scriptIndex?: number; blockIndex?: number; questionId?: string };
type SemanticNode = NonNullable<TextbookSemantic["node"]>;
type Semantic = TextbookSemantic & { source: Source };
type QaBlock = ManuscriptBlock & { semantic?: Semantic };
type RawQuestion = { id: string; prompt: string; answer: string; solution: string; kind: string; lines?: number; level?: string; unit: string; page: number; skill?: string; diagram?: { shape: string; top: string; side?: string; inside?: string } };
type RawConcept = { id: string; title: string; rows: { label: string; text: string }[] };
type RawPage = { page: number; kind: string; unit: string; title: string; subtitle?: string; stage?: string; mode?: "learn" | "cloze" | "sentence"; qs?: string[]; example?: string; family?: string; types?: string[]; groups?: { title: string; tip: string; ids: string[] }[]; script_index?: number; script_total?: number; script?: { title: string; subtitle: string; blocks: ({ kind: "turn"; who: string; text: string; expression: "neutral" | "question" | "thinking" | "aha" } | { kind: "board"; title: string; tex: string; note: string })[] }; lesson?: { title: string; rule: string; why: string; example: string; work: string[]; caution: string; concept_id: string } };
type Raw = { title: string; pages: RawPage[]; questions: Record<string, RawQuestion>; concepts: RawConcept[]; units: { id: string; title: string; goals: string[]; concepts: RawConcept[]; chapter?: unknown }[]; types: { id: string; name: string; tip: string; worked: string; practice: string[] }[]; families: Record<string, { name: string; tip: string }> };

export const toMarkdown = (raw: string) => raw.replace(/\[\[([\s\S]*?)\]\]/g, (_, tex: string) => `$${tex}$`);
export const texBodies = (raw: string) => Array.from(raw.matchAll(/\[\[([\s\S]*?)\]\]/g), m => m[1]);
export const markdownTexBodies = (markdown: string) => Array.from(markdown.matchAll(/\$([^$]*?)\$/g), m => m[1]);

const activityByKind: Record<string, TextbookActivity> = {
  cover: "cover", guide: "learningGuide", toc: "tableOfContents", studyplan: "learningPlan", unitBridge: "preparation",
  unitSpreadLeft: "unitIntro", unitSpreadRight: "unitIntro", opening: "dialogue", concept1: "concepts", concept2: "concepts", concept3: "concepts", lesson: "concepts",
  scriptcheck: "dialogueCheck", recall: "conceptBlankTest", drill: "basicCheck", basic: "basicCheck", paired: "workedExamples", types: "practice",
  clinic: "errorCheck", errors: "errorCheck", oral: "explainActivity", oralguide: "explainActivity", mindmap: "conceptMap", unitmap: "conceptMap",
  reasoning: "reasoning", conceptindex: "conceptIndex", typeindex: "typeIndex", typepage: "workedExamples",
};
const exerciseStages: Record<string, [TextbookActivity, TextbookExchange["items"][number]["learningStage"]]> = {
  "선수 개념 확인": ["preparation", "preparation"], "유형 연습": ["practice", "type-practice"], "오류 점검": ["errorCheck", "error-check"],
  "짧은 복습": ["review", "cumulative-review"], "다시 확인": ["review", "cumulative-review"], "학습 점검": ["assessment", "unit-assessment"],
  "개념 이해": ["concepts", "concept-check"], "개념 정리": ["conceptStudy", "concept-check"], "확인문제": ["basicCheck", "concept-check"],
  "실전문제": ["assessment", "application"], "누적 복습": ["review", "cumulative-review"], "단원 평가": ["assessment", "unit-assessment"],
  "단원 마무리": ["assessment", "unit-assessment"], "유형 적용": ["practice", "type-practice"], "수와 식 종합": ["assessment", "application"],
};
function activity(p: RawPage): TextbookActivity {
  if (p.kind === "exercise") { assert(exerciseStages[p.stage!], `Unmapped exercise stage: ${p.stage}`); return exerciseStages[p.stage!][0]; }
  if (p.kind === "fullmaster") return ({ learn: "conceptStudy", cloze: "clozeRecall", sentence: "sentenceRecall" } as const)[p.mode!];
  if (p.kind === "practice") return p.stage === "설명과 적용" ? "written" : "assessment";
  assert(activityByKind[p.kind], `Unmapped kind: ${p.kind}`);
  return activityByKind[p.kind];
}

// An extraction of authored source functions, never a print or render proof.
// No source template or content from this extraction is committed to Git.
type Tree = { tag?: string; attributes?: Record<string, string>; rawText?: string; children?: Tree[] };
type SafeFragment = TextbookSourceFragment;
const safeTags = new Set(["div", "section", "span", "p", "h2", "h3", "h4", "strong", "em", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "br"]);
function safeFragments(tree: Tree, omitted: string[]): SafeFragment[] {
  if (tree.rawText !== undefined) return [{ tag: "span", rawText: tree.rawText }];
  if (tree.tag === "qa-question" || tree.tag === "qa-video" || tree.tag === "img") return [];
  if (tree.tag === "svg") { omitted.push("svg"); return []; }
  const tag = tree.tag === "b" ? "strong" : ["i", "small", "qa-math"].includes(tree.tag ?? "") ? "span" : tree.tag === "article" ? "section" : tree.tag;
  const children = (tree.children ?? []).flatMap(t => safeFragments(t, omitted));
  if (!tag || !safeTags.has(tag)) return children;
  const attrs = tree.attributes ?? {};
  const attributes = { ...(attrs.class ? { className: attrs.class } : {}),
    ...(attrs.colspan ? { colSpan: Number(attrs.colspan) } : {}), ...(attrs.rowspan ? { rowSpan: Number(attrs.rowspan) } : {}) };
  return [{ tag: tag as SafeFragment["tag"], ...(Object.keys(attributes).length ? { attributes } : {}), children }];
}
async function authoredSourceTrees(sourceDir: string, raw: Raw, pages: RawPage[]) {
  const context = vm.createContext({ window: { MANUSCRIPT: raw }, structuredClone,
    document: { querySelectorAll: () => [], querySelector: () => ({}) } });
  const files: Record<string, string> = {};
  for (const name of ["full.js", "chapters.js", "app.js"]) {
    let code = await readFile(path.join(sourceDir, name), "utf8");
    files[name] = sha(code);
    if (name === "app.js") {
      const at = code.indexOf("\ndocument.querySelectorAll('[data-book]').forEach");
      assert(at > 0, "Authored source boundary changed");
      code = code.slice(0, at);
    }
    vm.runInContext(code, context, { timeout: 2000, filename: name });
  }
  vm.runInContext(`
    math = tex => '<qa-math data-tex="' + esc(tex) + '">' + esc('[['+tex+']]') + '</qa-math>';
    fullQuestion = (id, options={}) => '<qa-question data-id="'+esc(id)+'" data-worked="'+Boolean(options.worked)+'"></qa-question>';
    question = (id, options={}) => fullQuestion(id, {worked: options.work===false});
    video = id => '<qa-video data-id="'+esc(id)+'"></qa-video>';
    portrait = () => '';
  `, context, { timeout: 1000 });
  // parse5 only parses data; it does not execute source HTML or load assets.
  const tree = (node: unknown): Tree => {
    const n = node as { nodeName: string; tagName?: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: unknown[] };
    return n.nodeName === "#text" ? { rawText: n.value ?? "" } : {
      tag: n.tagName ?? "fragment", attributes: Object.fromEntries((n.attrs ?? []).map(a => [a.name, a.value])),
      children: (n.childNodes ?? []).map(tree),
    };
  };
  const fragments: Record<number, { tree: Tree; htmlSha256: string }> = {};
  for (const p of pages) {
    if (p.kind === "opening" || p.kind === "fullmaster") continue;
    context.qaPage = p;
    const html = vm.runInContext("body(qaPage)", context, { timeout: 2000 }) as string;
    fragments[p.page] = { tree: tree(parseFragment(html)), htmlSha256: sha(html) };
  }
  return { files, fragments };
}

function rawText(tree: Tree): string {
  return tree.rawText ?? (tree.children ?? []).map(rawText).join(tree.tag === "br" ? "\n" : " ");
}

/** Resolve trusted source SVG class paint into the existing inert asset subset. */
async function sourceSvgAsset(tree: Tree, sourceDir: string): Promise<string> {
  const css = (await Promise.all(["styles.css", "editorial.css", "full.css"].map(f => readFile(path.join(sourceDir, f), "utf8")))).join("\n");
  const paint = new Set(["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "font-size", "font-weight"]);
  const rules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g), m => ({ selector: m[1].trim(), body: m[2] }));
  const attrsAllowed = new Set(["viewBox", "x", "y", "cx", "cy", "r", "d", "transform", "text-anchor", "role", "aria-label"]);
  const escapeText = (v: string) => v.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const escapeAttr = (v: string) => { assert(!/[&\"<>]/.test(v), "SVG attribute outside safe subset"); return v; };
  const serialize = (t: Tree, ancestors: string[]): string => {
    if (t.rawText !== undefined) return escapeText(t.rawText);
    assert(["svg", "g", "path", "circle", "text"].includes(t.tag!), `Unexpected trusted SVG tag ${t.tag}`);
    const classes = (t.attributes?.class ?? "").split(/\s+/);
    const attributes = Object.fromEntries(Object.entries(t.attributes ?? {}).filter(([k]) => attrsAllowed.has(k)));
    if (t.tag === "svg") { attributes.xmlns = "http://www.w3.org/2000/svg"; attributes["font-family"] = "Noto Sans KR"; }
    for (const rule of rules) for (const selector of rule.selector.split(",")) {
      const match = /^\.([\w-]+)(?:\s+(path|circle))?$/.exec(selector.trim());
      if (!match || !(match[2] ? t.tag === match[2] && ancestors.includes(match[1]) : classes.includes(match[1]))) continue;
      for (const declaration of rule.body.split(";")) {
        const at = declaration.indexOf(":"); if (at < 0) continue;
        const key = declaration.slice(0, at).trim(), value = declaration.slice(at+1).trim();
        if (paint.has(key)) attributes[key] = value;
      }
    }
    return `<${t.tag}${Object.entries(attributes).map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join("")}>${(t.children ?? []).map(child => serialize(child, [...ancestors, ...classes])).join("")}</${t.tag}>`;
  };
  const svg = serialize(tree, []); assertSafeSvg(svg); return svg;
}

export async function convertReference(sourceDir: string, outDir: string) {
  const rawBytes = await readFile(path.join(sourceDir, "manuscript.json"));
  assert.equal(sha(rawBytes), RAW_SHA, "Only the approved original manuscript is accepted");
  const raw: Raw = JSON.parse(rawBytes.toString("utf8"));
  const manifest = JSON.parse(await readFile(new URL("./reference-manifest.json", import.meta.url), "utf8")) as { selectedPhysicalPages: number[] };
  const pages = raw.pages.filter(p => manifest.selectedPhysicalPages.includes(p.page));
  assert.deepEqual(raw.pages.filter(p => p.unit === "U01").map(p => p.page), Array.from({ length: 36 }, (_, i) => i + 8));
  const authored = await authoredSourceTrees(sourceDir, raw, pages);
  const out = path.resolve(outDir);
  // Refuse private fixtures inside ANY worktree of this repository, not just cwd.
  const repoFamily = path.resolve(process.cwd(), "..");
  assert(!out.toLowerCase().startsWith(repoFamily.toLowerCase() + path.sep), "Private fixture output must be outside Git worktrees");
  await mkdir(path.join(out, "assets"), { recursive: true });
  const exchange: TextbookExchange = {
    schemaVersion: "injaewon.textbook.exchange.v1", exportedAt: "2026-10-05T00:00:00Z", canonicalizationVersion: "injaewon.textbook.c14n.v1",
    config: { bookId: "v15-reference", schoolLevel: "middle", grade: 2, semester: 1, volume: 1, volumeCount: 1, displayCode: "2-1-1", title: raw.title,
      curriculumVersion: "v15-original", mode: "integrated", pageBudget: { target: 259, tolerance: 259, strict: false },
      print: { paper: "A4", innerMarginMm: 18, outerMarginMm: 14, sectionStart: "even-left", coverMode: "included", firstPhysicalPageIndex: 1 }, videoPolicy: "optional" },
    edition: { editionId: "v15-reference-edition", label: "G0a QA", status: "draft", revision: 1, publishedAt: null, manifestHash: null },
    units: [], items: [], snapshots: [], assets: [], qrTargets: [], videoBindings: [], pageMap: [], rendererVersion: "qa-reference-converter.v1", templateVersion: "qa-reference-converter.v1",
  };
  const assetFiles: Record<string, string> = {};
  async function addAsset(id: string, bytes: Uint8Array, mimeType: "image/png" | "image/svg+xml") {
    const file = `assets/${id}.${mimeType === "image/png" ? "png" : "svg"}`;
    exchange.assets.push({ assetId: id, packagePath: file, mimeType, sha256: sha(bytes), widthPx: null, heightPx: null });
    await writeFile(path.join(out, file), bytes); assetFiles[id] = file;
    return exchange.assets.at(-1)!;
  }
  for (const who of ["teacher-f1", "student-f1", "student-m1"]) {
    const character = TEXTBOOK_CHARACTERS.find(c => c.id === who)!;
    await addAsset(who, await readFile(path.join(process.cwd(), "public", character.src)), "image/png");
  }
  const provenance: { blockId: string; semantic: Semantic; raw?: unknown }[] = [];
  const preservation: { path: string; rawSha256: string; texSha256: string; texCount: number }[] = [];
  const publicExamples: string[] = [];
  const routedSourceStructures: { page: number; structure: string; route: string }[] = [];
  const questionOrdinals = new Map(Object.keys(raw.questions).map((id, i) => [id, i+1]));
  const usedQuestions = new Set<string>();
  const references = JSON.parse(await readFile(path.join(process.cwd(), "src/lib/textbook/scripts/reference-v15.json"), "utf8")) as { pages: { unit: string; page: number; sectionKey: string }[] };
  const sectionKeys = Array.from(new Set(references.pages.filter(p => p.unit === "U01").map(p => p.sectionKey)));
  assert.equal(sectionKeys.length, 2);
  function remember(value: string, sourcePath: string) {
    const markdown = toMarkdown(value);
    assert.deepEqual(markdownTexBodies(markdown), texBodies(value), `TeX bytes changed at ${sourcePath}`);
    preservation.push({ path: sourcePath, rawSha256: sha(value), texSha256: sha(JSON.stringify(texBodies(value))), texCount: texBodies(value).length });
    return markdown;
  }
  for (const p of pages) {
    let unit = exchange.units.find(u => u.unitKey === p.unit);
    const rawUnit = raw.units.find(u => u.id === p.unit);
    if (!unit) {
      unit = { unitKey: p.unit, title: rawUnit?.title ?? p.unit, sourceUnitIds: [], prerequisites: [], goals: rawUnit?.goals ?? [], conceptLectureRefs: [], sections: [] };
      exchange.units.push(unit);
    }
    const sectionKey = `reference-p${String(p.page).padStart(3, "0")}`;
    const blocks: QaBlock[] = [];
    const source: Source = { unit: p.unit, page: p.page, kind: p.kind, path: `pages[${p.page-1}]` };
    const semantic = (node?: SemanticNode, suffix = ""): Semantic => ({ activity: activity(p), source: { ...source, path: source.path + suffix }, title: p.title,
      ...(p.subtitle ? { subtitle: p.subtitle } : {}), ...(node ? { node } : {}) });
    const put = (block: QaBlock, rawValue?: unknown) => { blocks.push(block); provenance.push({ blockId: block.blockId, semantic: block.semantic!, ...(rawValue === undefined ? {} : { raw: rawValue }) }); };
    const text = (key: string, value: string, node?: SemanticNode) => put({ kind: "text", blockId: `v15.p${p.page}.${key}`, markdown: remember(value, `${source.path}.${key}`), semantic: semantic(node) });
    async function problem(id: string, worked = false, group?: SemanticNode) {
      assert(!usedQuestions.has(id), `Duplicate original question use: ${id}`); usedQuestions.add(id);
      const q = raw.questions[id]; assert(q, `Missing question: ${id}`);
      const figures: TextbookExchange["snapshots"][number]["payload"]["figures"] = [];
      if (q.diagram) {
        const d = q.diagram;
        const escape = (s: string) => s.replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
        const shape = d.shape === "triangle" ? "M22 82L192 82L100 12Z M100 12V82 M100 72H110V82" : "M25 24H185V80H25Z";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 100"><path d="${shape}" fill="none" stroke="#475b56" stroke-width="1.5"/><text x="100" y="14">${escape(d.top)}</text><text x="194" y="58">${escape(d.side ?? "")}</text><text x="92" y="60">${escape(d.inside ?? "")}</text></svg>`;
        const asset = await addAsset(`v15-${id}-diagram`, Buffer.from(svg), "image/svg+xml");
        figures.push({ assetId: asset.assetId, sha256: asset.sha256, choiceIndex: null, sourceWidthMm: 65, altText: null });
      }
      const payload = { format: "markdown-latex" as const, content: remember(q.prompt, `questions.${id}.prompt`), answer: remember(q.answer, `questions.${id}.answer`),
        solution: remember(q.solution, `questions.${id}.solution`), questionType: q.kind, figures };
      const snapshotId = `v15.${id}.snapshot`;
      exchange.snapshots.push({ snapshotId, source: { system: "studio-authored", localId: id }, sourceUpdatedAt: null,
        capturedAt: "2026-10-05T00:00:00Z", unitId: null, familyKey: p.family ?? null, difficulty: q.level ?? null, problemType: q.skill ?? null,
        payload, contentHash: contentHash(payload) });
      const stage = worked ? "worked-example" : p.kind === "exercise" ? exerciseStages[p.stage!][1]
        : activity(p) === "written" || p.kind === "reasoning" ? "written" : activity(p) === "errorCheck" ? "error-check"
        : activity(p) === "review" ? "cumulative-review" : activity(p) === "assessment" ? "unit-assessment"
        : activity(p) === "preparation" ? "preparation" : ["paired", "types", "typepage"].includes(p.kind) ? "type-practice" : "concept-check";
      const lines = worked ? 0 : Math.max(1, q.lines ?? 2);
      exchange.items.push({ itemId: id, editionId: exchange.edition.editionId, snapshotId, linkStatus: "unlinked", sourceTestId: null, sourceTestProblemId: null,
        unitKey: p.unit, sectionKey, learningStage: stage, displayNumber: String(questionOrdinals.get(id)).padStart(4, "0"), orderIndex: exchange.items.length,
        layout: { columnSpan: q.kind === "reason" ? 2 : 1, minWorkLines: lines, preferredWorkLines: lines, maxWorkLines: Math.max(lines, 12), keepTogether: true }, qrTargetId: null });
      if (worked) publicExamples.push(id);
      const sem = semantic(group); sem.source.questionId = id; sem.source.path = `questions.${id}`;
      put({ kind: "problem", blockId: `v15.${id}.problem`, itemId: id, semantic: sem }, q);
    }
    if (p.script) {
      p.script.blocks.forEach((b, i) => {
        const sem = semantic(); sem.source.scriptIndex = p.script_index!; sem.source.blockIndex = i;
        sem.source.path += `.script.blocks[${i}]`; sem.continuation = (p.script_index ?? 1) > 1;
        if (b.kind === "board") {
          sem.node = { kind: "board", title: b.title, tex: b.tex, note: b.note };
          put({ blockId: `v15.p${p.page}.b${i}`, kind: "text", markdown: remember(`[[${b.tex}]]`, sem.source.path), semantic: sem }, b);
        } else {
          const portraitId = b.who === "선생님" ? "teacher-f1" : b.who === "민서" ? "student-f1" : "student-m1";
          // Use the existing atlas opt-in namespace so four-expression assets
          // are cropped to the selected expression instead of printed whole.
          const speakerId = `tb-portrait-${portraitId}`;
          assert(["선생님", "민서", "지호"].includes(b.who), `Unknown speaker: ${b.who}`);
          put({ blockId: `v15.p${p.page}.b${i}`, kind: "dialogue", turns: [{ speakerId, side: portraitId === "student-m1" ? "right" : "left",
            expression: b.expression, portraitAssetId: portraitId, mirrorPortrait: portraitId === "student-m1", markdown: remember(b.text, sem.source.path),
            presentation: { kind: "speech", lessonKey: p.unit, lessonTitle: p.script!.title } }], semantic: sem } as QaBlock, b);
        }
      });
    } else if (p.kind === "fullmaster") {
      const phase = { learn: "study", cloze: "keywords", sentence: "sentences" }[p.mode!] as "study" | "keywords" | "sentences";
      for (const c of rawUnit!.concepts) {
        const rows: Row[] = c.rows.map((r, i) => ({ rowKey: `${p.unit}.${c.id}.r${i+1}`, label: r.label, rawText: r.text, textFormat: "v15-tex" }));
        // Compatibility-only markdown adapts the old non-nesting blank grammar.
        // Semantic rawText/rowKey remain identical across all three phases.
        const markdown = rows.map(r => {
          const converted = toMarkdown(r.rawText);
          const plain = converted.replace(/\{\{([\s\S]*?)\}\}/g, "$1");
          return `${r.label}: ${phase === "study" ? plain : phase === "keywords" ? converted.replace(/\{\{([\s\S]*?)\}\}/g, "[[$1]]") : "{{"+plain+"}}"}`;
        }).join("\n\n");
        for (const r of rows) remember(r.rawText, `${p.unit}.${c.id}.${r.rowKey}`);
        put({ blockId: `v15.p${p.page}.${c.id}`, kind: "concept-recall", phase, markdown, showRepetitionChecks: phase === "study",
          semantic: semantic({ kind: "concept", conceptId: c.id, title: c.title, rows }) }, c);
      }
    } else if (["paired", "types", "typepage"].includes(p.kind)) {
      const groups = p.kind === "paired" ? p.groups! : p.kind === "types" ? p.types!.map(id => {
        const t = raw.types.find(t => t.id === id)!; return { title: t.name, tip: t.tip, ids: [t.worked, ...t.practice] };
      }) : [{ title: p.title, tip: raw.families[p.family!]?.tip ?? p.subtitle ?? "", ids: [p.example!, ...(p.qs ?? [])] }];
      for (const [i, g] of groups.entries()) {
        const node: SemanticNode = { kind: "exampleGroup", groupId: `${p.unit}.p${p.page}.g${i+1}`, title: g.title, strategy: g.tip,
          exampleItemId: g.ids[0], confirmItemIds: g.ids.slice(1) };
        text(`group${i+1}`, g.tip, node);
        for (const [j, id] of g.ids.entries()) await problem(id, j === 0, node);
      }
    } else {
      // Source-only extraction preserves diagram/table hierarchy as bounded AST.
      // SVG paths remain private source evidence until typed diagram integration.
      const fragment = authored.fragments[p.page]?.tree;
      if (fragment) {
        const omitted: string[] = [];
        const fragments = safeFragments(fragment, omitted);
        for (const structure of omitted) routedSourceStructures.push({ page: p.page, structure, route: "verified-image-asset" });
        const compatibleText = fragments.map(f => rawText(f as Tree)).join("\n").trim();
        text("authored", compatibleText, { kind: "fragments", fragments });
        const imageSources = new Map<string, string>();
        const collect = (t: Tree) => {
          if (t.tag === "img" && t.attributes?.src) imageSources.set(t.attributes.src, t.attributes.alt ?? "");
          (t.children ?? []).forEach(collect);
        };
        collect(fragment);
        let imageIndex = 0;
        for (const [relative, alt] of imageSources) {
          const filename = path.resolve(sourceDir, relative);
          assert(filename.startsWith(path.resolve(sourceDir) + path.sep), "Unsafe source asset path");
          const id = `v15.p${p.page}.image${++imageIndex}`;
          await addAsset(id, await readFile(filename), "image/png");
          put({ kind: "image", blockId: id, assetId: id, caption: alt || null, semantic: semantic() });
        }
        const vectorTrees: Tree[] = [];
        const vectors = (t: Tree) => { if (t.tag === "svg") vectorTrees.push(t); else (t.children ?? []).forEach(vectors); };
        vectors(fragment);
        for (const [i, vector] of vectorTrees.entries()) {
          const id = `v15.p${p.page}.svg${i+1}`;
          const svg = await sourceSvgAsset(vector, sourceDir);
          await addAsset(id, Buffer.from(svg), "image/svg+xml");
          put({ kind: "image", blockId: id, assetId: id, caption: null, semantic: semantic() });
        }
      }
      if (!blocks.length) text("page", "", { kind: "referencePage", referenceKind: p.kind, sourcePage: p.page });
      for (const id of p.qs ?? []) await problem(id);
    }
    unit.sections.push({ sectionKey, title: p.title, templateKey: `reference-${p.kind}`, startPolicy: "continue", blocks });
  }
  // Compatibility validation is always available while the root integrates
  // optional fields. The lossless semantic fixture is NOT silently stripped.
  const base = structuredClone(exchange);
  for (const u of base.units) for (const s of u.sections) for (const b of s.blocks as QaBlock[]) {
    delete b.semantic;
    if (b.kind === "dialogue") for (const t of b.turns) delete (t as typeof t & { presentation?: unknown }).presentation;
  }
  textbookExchangeSchema.parse(base);
  const baseIssues = await validateTextbookIntegrity(base, { mode: "draft", readAsset: async id => new Uint8Array(await readFile(path.join(out, assetFiles[id]))) });
  assert.equal(baseIssues.filter(i => i.severity === "error").length, 0, JSON.stringify(baseIssues));
  const semanticResult = textbookExchangeSchema.safeParse(exchange);
  const counts = { selectedPages: pages.length, sections: exchange.units.reduce((n, u) => n+u.sections.length, 0),
    blocks: provenance.length, questions: exchange.items.length, snapshots: exchange.snapshots.length,
    speech: provenance.filter(x => (x.raw as { kind?: string })?.kind === "turn").length,
    boards: provenance.filter(x => x.semantic.node?.kind === "board").length,
    publicExamples: publicExamples.length, fullmasterRows: provenance.filter(x => x.semantic.node?.kind === "concept").reduce((n, x) => n+(x.semantic.node as { rows: Row[] }).rows.length, 0),
    texBodies: preservation.reduce((n, x) => n+x.texCount, 0) };
  const files = { "exchange-base.json": base, "exchange-semantic.json": exchange,
    "source-map.json": { version: 1, manuscriptSha256: RAW_SHA, sectionKeys, pages: pages.map(p => ({ page: p.page, unit: p.unit, kind: p.kind, sectionKey: `reference-p${String(p.page).padStart(3, "0")}` })),
      provenance, authored, rawPages: pages, sourceUnits: raw.units, routedSourceStructures,
      preservation, publicExampleItemIds: publicExamples, assetFiles },
    "converter-evidence.json": { counts, manuscriptSha256: RAW_SHA, exchangeHash: canonicalHash(exchange), baseHash: canonicalHash(base), baseIntegrityErrors: 0,
      semanticSchemaAccepted: semanticResult.success, semanticSchemaIssues: semanticResult.success ? [] : semanticResult.error.issues.map(i => ({ path: i.path, code: i.code })),
      sectionKeys, originalStudentVisualEquality: "pending production renderer integration and comparison", answerFunctionalChecks: "payload preservation passed; output projection pending",
      routedSourceStructures,
      limits: ["Authored layout AST preserves source hierarchy; it is not proof of rendered diagram/column equality.", "Diagrams preserve raw geometry metadata; SVG labels require matching KaTeX renderer support.",
        "Original types pages contain public examples in app.js; do not infer all types questions are unsolved."] } };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
  console.info(JSON.stringify({ counts, semanticSchemaAccepted: semanticResult.success, output: out, exchangeHash: canonicalHash(exchange) }));
  return { exchange, base, counts, provenance, publicExamples };
}

if (process.argv[1]?.endsWith("convert-reference.ts")) {
  const [source, output] = process.argv.slice(2);
  assert(source && output, "SOURCE_DIR and external OUT_DIR required");
  convertReference(path.resolve(source), output).catch(error => { console.error(error); process.exitCode = 1; });
}
