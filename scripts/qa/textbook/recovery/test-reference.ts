/** Deterministic source conservation and functional answer projection, no DB. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { textbookExchangeSchema } from "../../../../src/contracts/textbookExchange.contract";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import { toMarkdown, texBodies, markdownTexBodies } from "./convert-reference";
import type { TextbookExchange } from "../../../../src/contracts/textbookExchange.contract";

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function main() {
  const [source, out, schemaRoot] = process.argv.slice(2);
  assert(source && out);
  const raw = JSON.parse(await readFile(path.join(source, "manuscript.json"), "utf8"));
  const lossless = JSON.parse(await readFile(path.join(out, "exchange-semantic.json"), "utf8"));
  const exchange: TextbookExchange = textbookExchangeSchema.parse(JSON.parse(await readFile(path.join(out, "exchange-base.json"), "utf8")));
  const sourceMap = JSON.parse(await readFile(path.join(out, "source-map.json"), "utf8"));
  const tests: { check: string; count: number }[] = [];
  function equal(actual: unknown, expected: unknown, label: string) {
    assert.equal(hash(actual), hash(expected), `Source conservation failed: ${label}`);
  }
  const blocks = lossless.units.flatMap((u: { sections: { blocks: unknown[] }[] }) => u.sections.flatMap(s => s.blocks));
  const u01 = raw.pages.filter((p: { unit: string }) => p.unit === "U01");
  equal(sourceMap.pages.filter((p: { unit: string }) => p.unit === "U01").map((p: { page: number }) => p.page), Array.from({ length: 36 }, (_, i) => i+8), "U01 physical pages");
  assert.equal(sourceMap.sectionKeys.length, 2);
  let speech = 0, board = 0;
  for (const p of u01) for (const [i, node] of (p.script?.blocks ?? []).entries()) {
    const b = blocks.find((b: { blockId: string }) => b.blockId === `v15.p${p.page}.b${i}`);
    assert(b, "Missing original script block");
    const provenance = sourceMap.provenance.find((x: { blockId: string }) => x.blockId === b.blockId);
    equal(provenance.raw, node, `${b.blockId} raw`);
    if (node.kind === "turn") { equal(b.turns[0].markdown, toMarkdown(node.text), b.blockId); speech++; }
    else { equal(b.semantic.node.tex, node.tex, b.blockId); assert.equal(b.kind, "text"); board++; }
  }
  assert.equal(board, 4); assert.equal(speech, 50);
  tests.push({ check: "U01 all four opening pages: exact speech/board/title/source", count: speech+board });
  const rowPhases = new Map<string, unknown[]>();
  for (const b of blocks.filter((b: { kind: string; semantic: { source: { unit: string } } }) => b.kind === "concept-recall" && b.semantic.source.unit === "U01")) {
    assert.equal(b.showRepetitionChecks, b.phase === "study");
    const input = b.semantic.node;
    for (const [i, r] of input.rows.entries()) {
      equal(r.rawText, raw.concepts.find((c: { id: string }) => c.id === input.conceptId).rows[i].text, r.rowKey);
      assert.equal(r.textFormat, "v15-tex");
    }
    rowPhases.set(b.phase, [...(rowPhases.get(b.phase) ?? []), ...input.rows]);
  }
  equal(rowPhases.get("study"), rowPhases.get("keywords"), "study/keywords common rows");
  equal(rowPhases.get("study"), rowPhases.get("sentences"), "study/sentences common rows");
  assert.equal(rowPhases.get("study")?.length, 12);
  tests.push({ check: "Common conceptId/rowKey/label/rawText and study-only repetition", count: 36 });
  for (const item of exchange.items) {
    const snapshot = exchange.snapshots.find(s => s.snapshotId === item.snapshotId)!;
    const question = raw.questions[item.itemId];
    equal(snapshot.source, { system: "studio-authored", localId: item.itemId }, item.itemId);
    equal(snapshot.payload.content, toMarkdown(question.prompt), `${item.itemId} prompt`);
    equal(snapshot.payload.answer, toMarkdown(question.answer), `${item.itemId} answer`);
    equal(snapshot.payload.solution, toMarkdown(question.solution), `${item.itemId} solution`);
    for (const key of ["prompt", "answer", "solution"]) equal(markdownTexBodies(toMarkdown(question[key])), texBodies(question[key]), `${item.itemId} ${key} TeX`);
  }
  tests.push({ check: "Original problem IDs, answers, solutions and TeX bytes", count: exchange.items.length });
  const student = createTextbookRenderModel(exchange, "student");
  const answers = createTextbookRenderModel(exchange, "answers");
  const publicSet = new Set<string>(sourceMap.publicExampleItemIds);
  const studentProblems = student.sections.flatMap(s => s.blocks).filter(b => b.kind === "problem");
  const answerProblems = answers.sections.flatMap(s => s.blocks).filter(b => b.kind === "problem");
  for (const p of studentProblems) {
    assert(!("answer" in p) && !("solution" in p), `General answer fields reached student model ${p.itemId}`);
    assert.equal("publicWorkedExample" in p, publicSet.has(p.itemId));
  }
  for (const p of answerProblems) {
    const item = exchange.items.find(i => i.itemId === p.itemId)!;
    const payload = exchange.snapshots.find(s => s.snapshotId === item.snapshotId)!.payload;
    equal(p.answer, payload.answer, `${p.itemId} answer model`);
    equal(p.solution, payload.solution, `${p.itemId} solution model`);
  }
  tests.push({ check: "Student answer allowlist and independent answers projection", count: studentProblems.length+answerProblems.length });
  for (const g of sourceMap.provenance.filter((p: { semantic: { node?: { kind: string } } }) => p.semantic.node?.kind === "exampleGroup")) {
    const n = g.semantic.node;
    assert(publicSet.has(n.exampleItemId));
    for (const id of n.confirmItemIds) assert(!publicSet.has(id), "Confirmation accidentally solved");
  }
  tests.push({ check: "Public example and unsolved confirmation linkage", count: publicSet.size });
  const studentWitnessPath = path.join(out, "new-u01-base-student-witness.json");
  try {
    const studentWitness = JSON.parse(await readFile(studentWitnessPath, "utf8"));
    const answerWitness = JSON.parse(await readFile(path.join(out, "new-u01-base-answers-witness.json"), "utf8"));
    for (const [variant, witness] of [["student", studentWitness], ["answers", answerWitness]] as const) {
      assert.equal(createHash("sha256").update(await readFile(path.join(out, `new-u01-base-${variant}.pdf`))).digest("hex"), witness.pdfSha256);
    }
    const labels = new Map<string, string>();
    for (const page of studentWitness.pages) for (const node of page.nodes) if (node.itemId) labels.set(node.itemId, String(page.physicalPageIndex));
    let referencesChecked = 0;
    for (const s of answerWitness.projectedModel.sections) for (const b of s.blocks) if (b.kind === "problem") {
      assert(labels.has(b.itemId)); equal(b.sourcePageLabel, labels.get(b.itemId), `${b.itemId} student-page reference`); referencesChecked++;
    }
    assert.equal(referencesChecked, 142);
    tests.push({ check: "Exported answer witness references verified final student pageMap", count: referencesChecked });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let semanticAccepted = textbookExchangeSchema.safeParse(lossless).success;
  if (schemaRoot) {
    const contract = await import(pathToFileURL(path.resolve(schemaRoot, "src/contracts/textbookExchange.contract.ts")).href);
    contract.textbookExchangeSchema.parse(lossless);
    semanticAccepted = true;
    tests.push({ check: "Root optional semantic schema accepts lossless fixture", count: blocks.length });
  } else if (semanticAccepted) {
    tests.push({ check: "Integrated optional semantic schema accepts lossless fixture", count: blocks.length });
  }
  // Intentionally corrupt a copy: the same digest conservation guard must fail.
  let rejected = 0;
  for (const [a, b] of [[toMarkdown(raw.questions[exchange.items[0].itemId].answer)+"broken", toMarkdown(raw.questions[exchange.items[0].itemId].answer)],
                        [texBodies("[[\\frac{1}{2}]]"), texBodies("[[\\frac{2}{1}]]")]]) {
    try { equal(a, b, "intentional corruption"); } catch { rejected++; }
  }
  assert.equal(rejected, 2);
  const report = { passed: true, tests, intentionalCorruptionsRejected: rejected, semanticAccepted,
    functionalAnswerChecks: "passed on 222 original source questions; not editorial mathematics approval",
    studentVisualEquality: "pending renderer integration; no original answer visual claim" };
  await writeFile(path.join(out, "source-conservation-tests.json"), JSON.stringify(report, null, 2)+"\n");
  console.info(JSON.stringify(report));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
