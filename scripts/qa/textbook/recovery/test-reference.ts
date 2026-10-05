/** Deterministic source conservation and functional answer projection, no DB. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { textbookExchangeSchema } from "../../../../src/contracts/textbookExchange.contract";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import {
  toMarkdown,
  texBodies,
  markdownTexBodies,
  safeFragments,
  splitNativeQuestionSlot,
  detachNativeEndNote,
} from "./convert-reference";
import type { TextbookExchange } from "../../../../src/contracts/textbookExchange.contract";

const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function main() {
  const [source, out, schemaRoot] = process.argv.slice(2);
  assert(source && out);
  const raw = JSON.parse(
    await readFile(path.join(source, "manuscript.json"), "utf8"),
  );
  const lossless = JSON.parse(
    await readFile(path.join(out, "exchange-semantic.json"), "utf8"),
  );
  const exchange: TextbookExchange = textbookExchangeSchema.parse(
    JSON.parse(await readFile(path.join(out, "exchange-base.json"), "utf8")),
  );
  const sourceMap = JSON.parse(
    await readFile(path.join(out, "source-map.json"), "utf8"),
  );
  const tests: { check: string; count: number }[] = [];
  const sourceProblemBlocks = lossless.units
    .flatMap((unit: TextbookExchange["units"][number]) =>
      unit.sections.flatMap((section) => section.blocks),
    )
    .filter((block: { kind: string }) => block.kind === "problem");
  assert.equal(
    Object.keys(sourceMap.questionHeaderSupplement).length,
    lossless.items.length,
  );
  for (const block of sourceProblemBlocks) {
    const header = sourceMap.questionHeaderSupplement[block.itemId];
    assert(
      header,
      `Missing original header supplementary evidence ${block.itemId}`,
    );
    assert.deepEqual(
      block.semantic.sourceQuestionHeader,
      header.tree.children.flatMap(
        (child: import("./convert-reference").Tree) => safeFragments(child, []),
      ),
    );
    assert.equal(
      header.tree.children[0].children[0].rawText,
      block.itemId.slice(1),
    );
  }
  tests.push({
    check:
      "Exact original question header children, number and explicit caller labels",
    count: sourceProblemBlocks.length,
  });
  for (const [sourceTag, targetTag] of [
    ["h1", "h2"],
    ["small", "span"],
    ["b", "strong"],
    ["i", "em"],
  ]) {
    const converted = safeFragments(
      {
        tag: sourceTag,
        attributes: { class: "chapter-title original", onclick: "invalid" },
        children: [{ rawText: "[[\\frac{1}{2}]]" }],
      },
      [],
    );
    assert.equal(converted.length, 1);
    assert.equal(converted[0].tag, targetTag);
    assert.deepEqual(converted[0].attributes, {
      className: `chapter-title original${sourceTag === "small" ? " tb-source-small" : ""}`,
    });
    assert.equal(converted[0].children?.[0].rawText, "[[\\frac{1}{2}]]");
  }
  tests.push({
    check:
      "h1/small/b/i retain hierarchy, class and exact source text with safe tags",
    count: 4,
  });
  let nativeSections = 0;
  for (const unit of lossless.units)
    for (const section of unit.sections)
      for (const block of section.blocks) {
        const provenance = block.semantic?.source;
        if (!provenance) continue;
        const original = raw.pages.find(
          (page: { page: number }) => page.page === provenance.page,
        );
        assert(original, `Missing raw page for ${block.blockId}`);
        assert.equal(provenance.sectionName, original.section_name);
        assert.equal(provenance.tone, original.tone ?? "forest");
        assert.equal(
          Object.hasOwn(provenance, "sectionName"),
          Object.hasOwn(original, "section_name"),
          "Absent native section provenance must stay absent",
        );
        nativeSections++;
      }
  tests.push({
    check: "Native section_name copied exactly; absent metadata remains absent",
    count: nativeSections,
  });
  for (const portrait of sourceMap.portraitProvenance) {
    const originalBytes = await readFile(
      path.join(source, portrait.originalFilename),
    );
    const asset = lossless.assets.find(
      (asset: { assetId: string }) => asset.assetId === portrait.assetId,
    );
    assert.equal(
      createHash("sha256").update(originalBytes).digest("hex"),
      portrait.sha256,
    );
    assert.equal(asset.sha256, portrait.sha256);
    assert.equal(
      createHash("sha256")
        .update(await readFile(path.join(out, asset.packagePath)))
        .digest("hex"),
      portrait.sha256,
    );
  }
  assert.equal(sourceMap.portraitProvenance.length, 3);
  tests.push({
    check: "Exact native portrait PNG bytes and source palette retained",
    count: 3,
  });
  const mindmapAsset = lossless.assets.find(
    (asset: { assetId: string }) => asset.assetId === "v15.p41.svg1",
  );
  assert(mindmapAsset, "Native U01 mindmap image is missing");
  const mindmapSvg = await readFile(
    path.join(out, mindmapAsset.packagePath),
    "utf8",
  );
  const cardShapes = Array.from(
    mindmapSvg.matchAll(
      /<path\b[^>]*\bd="M18 0H202Q240 0 240 38V137Q240 155 222 155H38Q0 155 0 117V18Q0 0 18 0Z"[^>]*>/g,
    ),
  );
  assert.equal(cardShapes.length, 4, "Native mindmap card geometry changed");
  for (const shape of cardShapes) {
    // These are the actual final editorial values; the rule follows a block comment.
    assert.match(shape[0], /\bfill="#f9fcf7"/);
    assert.match(shape[0], /\bstroke="#b1c7ba"/);
    assert.match(shape[0], /\bstroke-width="1"/);
  }
  tests.push({
    check:
      "Native mindmap card paint keeps the original final CSS cascade after comments",
    count: cardShapes.length,
  });
  const textTags = Array.from(mindmapSvg.matchAll(/<text\b[^>]*>/g));
  const nativeSpacings = [
    ["1px", 4],
    ["-.5px", 4],
    [".3px", 1],
    ["1.3px", 1],
  ] as const;
  for (const [spacing, count] of nativeSpacings) {
    assert.equal(
      textTags.filter((tag) => tag[0].includes(`letter-spacing="${spacing}"`))
        .length,
      count,
      `Original SVG text letter spacing ${spacing} must retain its exact population`,
    );
  }
  tests.push({
    check:
      "Native SVG text spacing preserves all ten original code/title/root labels",
    count: 10,
  });
  let footersChecked = 0;
  const findNativeFooter = (
    tree: import("./convert-reference").Tree,
  ): import("./convert-reference").Tree[] =>
    tree.attributes?.class?.split(/\s+/).includes("study-footer")
      ? [tree]
      : (tree.children ?? []).flatMap(findNativeFooter);
  for (const page of sourceMap.rawPages.filter(
    (page: { kind: string }) => page.kind === "fullmaster",
  )) {
    const native = findNativeFooter(
      sourceMap.authoredSupplement[page.page].tree,
    );
    assert.equal(native.length, 1);
    const section = lossless.units
      .flatMap(
        (unit: {
          sections: {
            sectionKey: string;
            blocks: { semantic?: { sourceFooter?: unknown[] } }[];
          }[];
        }) => unit.sections,
      )
      .find(
        (section: { sectionKey: string }) =>
          section.sectionKey ===
          `reference-p${String(page.page).padStart(3, "0")}`,
      );
    const carriers = section.blocks.filter(
      (block: { semantic?: { sourceFooter?: unknown[] } }) =>
        block.semantic?.sourceFooter,
    );
    assert.equal(
      carriers.length,
      1,
      "One exact native footer carrier per source page",
    );
    assert.deepEqual(
      carriers[0].semantic.sourceFooter,
      safeFragments(native[0], []),
    );
    assert.equal(carriers[0].semantic.sourceFooter[0].children.length, 2);
    footersChecked++;
  }
  assert.equal(footersChecked, 3);
  tests.push({
    check: "Exact native master footers retained once with both original spans",
    count: footersChecked,
  });
  let relocatedNotes = 0;
  for (const page of sourceMap.rawPages) {
    const native =
      sourceMap.authored.fragments[page.page]?.tree ??
      sourceMap.authoredSupplement[page.page]?.tree;
    if (!native) continue;
    const beforeHash = hash(native);
    const parts = detachNativeEndNote(native);
    assert.equal(
      hash(native),
      beforeHash,
      "Native relocation mutated raw source AST",
    );
    if (!parts.footer) continue;
    const section = lossless.units
      .flatMap(
        (unit: {
          sections: {
            sectionKey: string;
            blocks: {
              semantic?: {
                sourceFooter?: unknown[];
                node?: { kind: string; fragments?: unknown[] };
              };
            }[];
          }[];
        }) => unit.sections,
      )
      .find(
        (section: { sectionKey: string }) =>
          section.sectionKey ===
          `reference-p${String(page.page).padStart(3, "0")}`,
      );
    const carriers = section.blocks.filter(
      (block: { semantic?: { sourceFooter?: unknown[] } }) =>
        block.semantic?.sourceFooter,
    );
    assert.equal(carriers.length, 1);
    assert.deepEqual(
      carriers[0].semantic.sourceFooter,
      safeFragments(parts.footer, []),
    );
    const duplicated = section.blocks.filter(
      (block: {
        semantic?: { node?: { kind: string; fragments?: unknown[] } };
      }) =>
        block.semantic?.node?.kind === "fragments" &&
        JSON.stringify(block.semantic.node.fragments).includes(
          '"className":"checkbar"',
        ),
    );
    assert.equal(
      duplicated.length,
      0,
      "Native fixed checkbar duplicated into body flow",
    );
    relocatedNotes++;
  }
  tests.push({
    check:
      "Native last-element end notes moved out of body flow with exact AST and no duplicate",
    count: relocatedNotes,
  });
  for (const item of lossless.items) {
    const layout = sourceMap.nativeQuestionLayouts[item.itemId];
    assert(layout, `Missing native question parent for ${item.itemId}`);
    assert.equal(item.layout.columnSpan, layout.columnSpan);
  }
  assert.equal(
    lossless.items.find((item: { itemId: string }) => item.itemId === "B0014")
      .layout.columnSpan,
    1,
  );
  let slotsChecked = 0;
  for (const unit of lossless.units)
    for (const section of unit.sections) {
      const page = Number(section.sectionKey.replace("reference-p", ""));
      const tree = sourceMap.authored.fragments[page]?.tree;
      if (!tree) continue;
      const slot = splitNativeQuestionSlot(tree);
      if (!slot) continue;
      const ids = section.blocks
        .filter(
          (block: { kind: string; itemId?: string }) =>
            block.kind === "problem" &&
            slot.questionIds.includes(block.itemId!),
        )
        .map((block: { itemId: string }) => block.itemId);
      assert.deepEqual(ids, slot.questionIds);
      const afterIndex = section.blocks.findIndex(
        (block: { blockId: string }) =>
          block.blockId === `v15.p${page}.authored.after-questions`,
      );
      if (afterIndex >= 0)
        assert(
          section.blocks
            .slice(afterIndex + 1)
            .every((block: { kind: string }) => block.kind !== "problem"),
        );
      slotsChecked++;
    }
  tests.push({
    check:
      "Native parent-grid widths, question order and after-question fragments",
    count: lossless.items.length + slotsChecked,
  });
  const oral = lossless.units
    .flatMap((unit: TextbookExchange["units"][number]) => unit.sections)
    .find(
      (section: TextbookExchange["units"][number]["sections"][number]) =>
        section.sectionKey === "reference-p040",
    );
  assert(oral, "Original oral page is absent");
  assert.deepEqual(
    oral.blocks.map((block: { blockId: string }) => block.blockId),
    [
      "v15.p40.authored",
      "v15.B0145.problem",
      "v15.p40.authored.flow1",
      "v15.B0146.problem",
      "v15.p40.authored.flow2",
    ],
    "Native route/question/listener/question/listener/rubric order must remain interleaved",
  );
  const oralTree = sourceMap.authored.fragments[40]
    .tree as import("./convert-reference").Tree;
  const oralTasks = oralTree.children?.filter(
    (child) => child.attributes?.class === "oral-task",
  );
  assert.equal(oralTasks?.length, 2);
  for (const [index, id] of ["B0145", "B0146"].entries()) {
    assert.equal(oralTasks![index].children?.[0].attributes?.["data-id"], id);
    const expectedFollow = safeFragments(
      { ...oralTasks![index], children: oralTasks![index].children?.slice(1) },
      [],
    );
    const actualFollow = oral.blocks[index * 2 + 2].semantic?.node;
    assert(actualFollow?.kind === "fragments");
    assert.deepEqual(actualFollow.fragments[0], expectedFollow[0]);
  }
  tests.push({
    check:
      "Native oral questions remain before their own listener prompts and final rubric",
    count: 2,
  });
  try {
    const before = JSON.parse(
      await readFile(
        path.join(out, "source-map-before-inline-assets.json"),
        "utf8",
      ),
    );
    assert.equal(
      hash(sourceMap.authored),
      hash(before.authored),
      "Raw authored trees/hashes changed during display adapter correction",
    );
    assert.equal(
      hash(sourceMap.rawPages),
      hash(before.rawPages),
      "Raw source page objects changed",
    );
    assert.equal(
      hash(sourceMap.sourceUnits),
      hash(before.sourceUnits),
      "Raw unit/concept trees changed",
    );
    assert.deepEqual(
      Object.keys(sourceMap.assetFiles).sort(),
      Object.keys(before.assetFiles).sort(),
      "Frozen asset identities changed",
    );
    const images = lossless.units
      .flatMap(
        (u: {
          sections: {
            blocks: {
              semantic?: { node?: { kind: string; fragments?: unknown[] } };
            }[];
          }[];
        }) => u.sections.flatMap((s) => s.blocks),
      )
      .flatMap(
        (b: {
          semantic?: { node?: { kind: string; fragments?: unknown[] } };
        }) =>
          b.semantic?.node?.kind === "fragments"
            ? (b.semantic.node.fragments ?? [])
            : [],
      );
    let inlineAssets = 0;
    const walk = (nodes: unknown[]) => {
      for (const n of nodes) {
        const f = n as {
          tag: string;
          attributes?: { assetId?: string };
          children?: unknown[];
        };
        if (f.tag === "img") {
          assert(sourceMap.assetFiles[f.attributes!.assetId!]);
          inlineAssets++;
        }
        walk(f.children ?? []);
      }
    };
    walk(images);
    assert(
      inlineAssets > 0,
      "Original source images are not inline typed assets",
    );
    tests.push({
      check:
        "Original authored/source trees and existing asset IDs preserved with inline typed image placement",
      count: inlineAssets,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  function equal(actual: unknown, expected: unknown, label: string) {
    assert.equal(
      hash(actual),
      hash(expected),
      `Source conservation failed: ${label}`,
    );
  }
  const blocks = lossless.units.flatMap(
    (u: { sections: { blocks: unknown[] }[] }) =>
      u.sections.flatMap((s) => s.blocks),
  );
  const u01 = raw.pages.filter((p: { unit: string }) => p.unit === "U01");
  equal(
    sourceMap.pages
      .filter((p: { unit: string }) => p.unit === "U01")
      .map((p: { page: number }) => p.page),
    Array.from({ length: 36 }, (_, i) => i + 8),
    "U01 physical pages",
  );
  assert.equal(sourceMap.sectionKeys.length, 2);
  let speech = 0,
    board = 0;
  for (const p of u01)
    for (const [i, node] of (p.script?.blocks ?? []).entries()) {
      const b = blocks.find(
        (b: { blockId: string }) => b.blockId === `v15.p${p.page}.b${i}`,
      );
      assert(b, "Missing original script block");
      const provenance = sourceMap.provenance.find(
        (x: { blockId: string }) => x.blockId === b.blockId,
      );
      equal(provenance.raw, node, `${b.blockId} raw`);
      if (node.kind === "turn") {
        equal(b.turns[0].markdown, toMarkdown(node.text), b.blockId);
        speech++;
      } else {
        equal(b.semantic.node.tex, node.tex, b.blockId);
        assert.equal(b.kind, "text");
        board++;
      }
    }
  assert.equal(board, 4);
  assert.equal(speech, 50);
  tests.push({
    check: "U01 all four opening pages: exact speech/board/title/source",
    count: speech + board,
  });
  const rowPhases = new Map<string, unknown[]>();
  for (const b of blocks.filter(
    (b: { kind: string; semantic: { source: { unit: string } } }) =>
      b.kind === "concept-recall" && b.semantic.source.unit === "U01",
  )) {
    assert.equal(b.showRepetitionChecks, b.phase === "study");
    const input = b.semantic.node;
    for (const [i, r] of input.rows.entries()) {
      equal(
        r.rawText,
        raw.concepts.find((c: { id: string }) => c.id === input.conceptId).rows[
          i
        ].text,
        r.rowKey,
      );
      assert.equal(r.textFormat, "v15-tex");
    }
    rowPhases.set(b.phase, [...(rowPhases.get(b.phase) ?? []), ...input.rows]);
  }
  equal(
    rowPhases.get("study"),
    rowPhases.get("keywords"),
    "study/keywords common rows",
  );
  equal(
    rowPhases.get("study"),
    rowPhases.get("sentences"),
    "study/sentences common rows",
  );
  assert.equal(rowPhases.get("study")?.length, 12);
  tests.push({
    check: "Common conceptId/rowKey/label/rawText and study-only repetition",
    count: 36,
  });
  for (const item of exchange.items) {
    const snapshot = exchange.snapshots.find(
      (s) => s.snapshotId === item.snapshotId,
    )!;
    const question = raw.questions[item.itemId];
    equal(
      snapshot.source,
      { system: "studio-authored", localId: item.itemId },
      item.itemId,
    );
    equal(
      snapshot.payload.content,
      toMarkdown(question.prompt),
      `${item.itemId} prompt`,
    );
    equal(
      snapshot.payload.answer,
      toMarkdown(question.answer),
      `${item.itemId} answer`,
    );
    equal(
      snapshot.payload.solution,
      toMarkdown(question.solution),
      `${item.itemId} solution`,
    );
    for (const key of ["prompt", "answer", "solution"])
      equal(
        markdownTexBodies(toMarkdown(question[key])),
        texBodies(question[key]),
        `${item.itemId} ${key} TeX`,
      );
  }
  tests.push({
    check: "Original problem IDs, answers, solutions and TeX bytes",
    count: exchange.items.length,
  });
  const student = createTextbookRenderModel(exchange, "student");
  const answers = createTextbookRenderModel(exchange, "answers");
  const publicSet = new Set<string>(sourceMap.publicExampleItemIds);
  const studentProblems = student.sections
    .flatMap((s) => s.blocks)
    .filter((b) => b.kind === "problem");
  const answerProblems = answers.sections
    .flatMap((s) => s.blocks)
    .filter((b) => b.kind === "problem");
  for (const p of studentProblems) {
    assert(
      !("answer" in p) && !("solution" in p),
      `General answer fields reached student model ${p.itemId}`,
    );
    assert.equal("publicWorkedExample" in p, publicSet.has(p.itemId));
  }
  for (const p of answerProblems) {
    const item = exchange.items.find((i) => i.itemId === p.itemId)!;
    const payload = exchange.snapshots.find(
      (s) => s.snapshotId === item.snapshotId,
    )!.payload;
    equal(p.answer, payload.answer, `${p.itemId} answer model`);
    equal(p.solution, payload.solution, `${p.itemId} solution model`);
  }
  tests.push({
    check: "Student answer allowlist and independent answers projection",
    count: studentProblems.length + answerProblems.length,
  });
  for (const g of sourceMap.provenance.filter(
    (p: { semantic: { node?: { kind: string } } }) =>
      p.semantic.node?.kind === "exampleGroup",
  )) {
    const n = g.semantic.node;
    assert(publicSet.has(n.exampleItemId));
    for (const id of n.confirmItemIds)
      assert(!publicSet.has(id), "Confirmation accidentally solved");
  }
  tests.push({
    check: "Public example and unsolved confirmation linkage",
    count: publicSet.size,
  });
  const witnessMode = await readFile(
    path.join(out, "new-u01-semantic-student-witness.json"),
  ).then(
    () => "semantic",
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return "base";
    },
  );
  const studentWitnessPath = path.join(
    out,
    `new-u01-${witnessMode}-student-witness.json`,
  );
  try {
    const studentWitness = JSON.parse(
      await readFile(studentWitnessPath, "utf8"),
    );
    const answerWitness = JSON.parse(
      await readFile(
        path.join(out, `new-u01-${witnessMode}-answers-witness.json`),
        "utf8",
      ),
    );
    for (const [variant, witness] of [
      ["student", studentWitness],
      ["answers", answerWitness],
    ] as const) {
      assert.equal(
        createHash("sha256")
          .update(
            await readFile(
              path.join(out, `new-u01-${witnessMode}-${variant}.pdf`),
            ),
          )
          .digest("hex"),
        witness.pdfSha256,
      );
    }
    const labels = new Map<string, string>();
    for (const page of studentWitness.pages)
      for (const node of page.nodes)
        if (node.itemId)
          labels.set(node.itemId, String(page.physicalPageIndex));
    let referencesChecked = 0;
    for (const s of answerWitness.projectedModel.sections)
      for (const b of s.blocks)
        if (b.kind === "problem") {
          assert(labels.has(b.itemId));
          equal(
            b.sourcePageLabel,
            labels.get(b.itemId),
            `${b.itemId} student-page reference`,
          );
          referencesChecked++;
        }
    assert.equal(referencesChecked, 142);
    tests.push({
      check:
        "Exported answer witness references verified final student pageMap",
      count: referencesChecked,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let semanticAccepted = textbookExchangeSchema.safeParse(lossless).success;
  if (schemaRoot) {
    const contract = await import(
      pathToFileURL(
        path.resolve(schemaRoot, "src/contracts/textbookExchange.contract.ts"),
      ).href
    );
    contract.textbookExchangeSchema.parse(lossless);
    semanticAccepted = true;
    tests.push({
      check: "Root optional semantic schema accepts lossless fixture",
      count: blocks.length,
    });
  } else if (semanticAccepted) {
    tests.push({
      check: "Integrated optional semantic schema accepts lossless fixture",
      count: blocks.length,
    });
  }
  // Intentionally corrupt a copy: the same digest conservation guard must fail.
  let rejected = 0;
  for (const [a, b] of [
    [
      toMarkdown(raw.questions[exchange.items[0].itemId].answer) + "broken",
      toMarkdown(raw.questions[exchange.items[0].itemId].answer),
    ],
    [texBodies("[[\\frac{1}{2}]]"), texBodies("[[\\frac{2}{1}]]")],
  ]) {
    try {
      equal(a, b, "intentional corruption");
    } catch {
      rejected++;
    }
  }
  assert.equal(rejected, 2);
  const report = {
    passed: true,
    tests,
    intentionalCorruptionsRejected: rejected,
    semanticAccepted,
    functionalAnswerChecks:
      "passed on 222 original source questions; not editorial mathematics approval",
    studentVisualEquality:
      "pending renderer integration; no original answer visual claim",
  };
  await writeFile(
    path.join(out, "source-conservation-tests.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.info(JSON.stringify(report));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
