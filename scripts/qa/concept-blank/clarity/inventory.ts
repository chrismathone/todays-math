/** Export every live C-form concept for an offline student-wording audit.
 * Signals route attention; none is a defect verdict or an exclusion rule.
 * Usage: node --import tsx scripts/qa/concept-blank/clarity/inventory.ts <out>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  splitBlankSentence,
  visibleLength,
} from "@/contracts/conceptBlank.contract";
import { BANK_PARTS } from "@/lib/concept-blank/bank";

const out = resolve(process.argv[2] ?? "tmp/concept-cloze-all-20261006");
const grades = ["e3", "e4", "e5", "e6", "m1", "m2", "m3"];
const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const records = Object.entries(BANK_PARTS).flatMap(([part, bank]) =>
  bank.concepts.map((item) => {
    const pieces = splitBlankSentence(item.definition);
    const expected = pieces.filter((p) => p.kind === "key").map((p) => p.text);
    const student = pieces
      .map((p) => (p.kind === "key" ? "□" : p.text))
      .join("");
    const signals = [];
    if (expected.some((s) => visibleLength(s) >= 12))
      signals.push("long-answer");
    if (
      expected.some((s) =>
        /보다|일 때|인 경우|아닌|이 아니|이상|이하|미만|초과/.test(s),
      )
    )
      signals.push("condition-or-comparison");
    if (
      expected.some((s) =>
        /방법|때문|하여|해서|하므로|한 뒤|바꾸어|더하여|나누어|몇 개|통하/.test(
          s,
        ),
      )
    )
      signals.push("phrase-or-procedure");
    if (
      expected.some((s) =>
        /^.{0,3}(같다|다르다|있다|없다|이다|한다|된다|않는다)$/.test(s),
      )
    )
      signals.push("broad-predicate");
    return {
      id: item.id,
      part,
      grade: part.replace(/plus$/, ""),
      section: item.section,
      term: item.term,
      level: item.level,
      kind: item.kind,
      definition: item.definition,
      student,
      expected,
      signals,
      sourceHash: sha(item),
    };
  }),
);
assert.equal(new Set(records.map((r) => r.id)).size, records.length);
assert.ok(records.every((r) => r.expected.length > 0));
mkdirSync(out, { recursive: true });
const packetDirectory = resolve(out, "packets");
mkdirSync(packetDirectory, { recursive: true });
const write = (name: string, value: unknown) =>
  writeFileSync(
    resolve(out, name),
    JSON.stringify(value, null, 2) + "\n",
    "utf8",
  );
const groups = grades.map((grade) => {
  const rows = records.filter((r) => r.grade === grade);
  write(`${grade}.json`, rows);
  const packets = [];
  for (let index = 0; index < rows.length; index += 90) {
    const slice = rows.slice(index, index + 90);
    const file = `packets/${grade}-${String(index / 90 + 1).padStart(2, "0")}.md`;
    writeFileSync(
      resolve(out, file),
      slice
        .map(
          (r) =>
            `### ${r.id}\n단원: ${r.section}\n학생: ${r.student}\n기대 답: ${JSON.stringify(r.expected)}\n완성 문장: ${r.definition}\n`,
        )
        .join("\n"),
      "utf8",
    );
    packets.push({ file, ids: slice.map((r) => r.id) });
  }
  return {
    grade,
    count: rows.length,
    blanks: rows.reduce((n, r) => n + r.expected.length, 0),
    sections: new Set(rows.map((r) => r.section)).size,
    signalled: rows.filter((r) => r.signals.length > 0).length,
    longAnswers: rows.filter((r) => r.signals.includes("long-answer")).length,
    packets,
  };
});
write("inventory.json", {
  schemaVersion: 1,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  contentHash: sha(records),
  scope:
    "All live concept definitions used by C form, base and plus banks, grades 초3~중3. No 초1~2 or high-school bank exists here. Other question forms and official curriculum standards are outside this wording audit.",
  caution:
    "Signals are deterministic review candidates, never defect verdicts. Semantic findings require an identified student-visible ambiguity and evidence. Term and expected answer are not printed as C-question hints.",
  total: records.length,
  blanks: groups.reduce((n, g) => n + g.blanks, 0),
  groups,
});
console.log(
  JSON.stringify(
    groups.map(({ packets, ...group }) => ({
      ...group,
      packets: packets.length,
    })),
    null,
    2,
  ),
);
