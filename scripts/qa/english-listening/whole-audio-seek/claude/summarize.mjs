#!/usr/bin/env node
/**
 * Prints the exact counts of a finished ledger as Markdown.
 *
 *   node summarize.mjs --marks <marks.json>
 *
 * Read only. Every number is counted from the rows; nothing is estimated.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { marks: { type: "string" } } });
if (!values.marks) throw new Error("--marks is required");
const bytes = readFileSync(values.marks);
const marks = JSON.parse(bytes.toString("utf8"));
const rows = marks.records;

const tally = (items, key) => {
  const out = new Map();
  for (const item of items) {
    const name = key(item);
    out.set(name, (out.get(name) ?? 0) + 1);
  }
  return [...out].sort(
    (a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0]),
  );
};
const table = (head, lines) =>
  [
    "| " + head.join(" | ") + " |",
    "| " + head.map((_, i) => (i ? "---:" : "---")).join(" | ") + " |",
    ...lines.map((line) => "| " + line.join(" | ") + " |"),
  ].join("\n");

const statuses = ["candidate", "existing_verified", "held"];
const count = (list, status) => list.filter((r) => r.status === status).length;
const group = (row) =>
  row.sourceRecordId.replace(/^(ebs-middle|ebsi-high)-(\d).*$/, "$1-$2");
const groups = [...new Set(rows.map(group))].sort();

console.log(`marks: ${values.marks}`);
console.log(`sha256: ${createHash("sha256").update(bytes).digest("hex")}`);
console.log(
  `tools: ${marks.toolGit?.commit} (uncommitted tool files: ${marks.toolGit?.uncommittedToolFiles})\n`,
);
console.log(
  table(
    ["level", "sources", "questions", ...statuses],
    [
      ...groups.map((name) => {
        const list = rows.filter((r) => group(r) === name);
        return [
          name,
          new Set(list.map((r) => r.sourceRecordId)).size,
          list.length,
          ...statuses.map((s) => count(list, s)),
        ];
      }),
      [
        "**total**",
        new Set(rows.map((r) => r.sourceRecordId)).size,
        rows.length,
        ...statuses.map((s) => count(rows, s)),
      ],
    ],
  ),
);

console.log("\nBy spoken form\n");
console.log(
  table(
    ["kind", "questions", ...statuses],
    tally(rows, (r) => r.kind).map(([kind, n]) => [
      kind,
      n,
      ...statuses.map((s) =>
        count(
          rows.filter((r) => r.kind === kind),
          s,
        ),
      ),
    ]),
  ),
);

const held = rows.filter((r) => r.status === "held");
console.log("\nHeld reasons (a row may carry several)\n");
console.log(
  table(
    ["reason", "rows"],
    tally(
      held.flatMap((r) => r.reasons),
      (reason) => reason,
    ),
  ),
);
console.log("\nHeld: what the nearest listening found\n");
console.log(
  table(
    ["probe finding", "rows"],
    tally(
      held.flatMap((r) => [
        ...new Set(r.heldDiagnostics.numberHeard.flatMap((n) => n.reasons)),
      ]),
      (reason) => reason,
    ),
  ),
);

const candidates = rows.filter((r) => r.status === "candidate");
console.log("\nCandidate identity evidence\n");
console.log(
  table(
    ["evidence", "rows"],
    tally(
      candidates.flatMap((r) => r.identityEvidence),
      (name) => name,
    ),
  ),
);
console.log("\nCandidate notes\n");
console.log(
  table(
    ["note", "rows"],
    tally(
      candidates.flatMap((r) => r.notes),
      (name) => name,
    ),
  ),
);

const existing = rows.filter((r) => r.status === "existing_verified");
console.log("\nExisting verified starts\n");
console.log(
  table(
    ["source", "rows", "independent probe heard the number first"],
    tally(existing, (r) => r.sourceRecordId).map(([source, n]) => [
      source,
      n,
      existing.filter(
        (r) =>
          r.sourceRecordId === source &&
          r.identityEvidence.includes(
            "independent_probe_heard_ordinal_at_existing_start",
          ),
      ).length,
    ]),
  ),
);

console.log("\nSources with held rows\n");
console.log(
  table(
    ["source", "held", "numbers"],
    tally(held, (r) => r.sourceRecordId).map(([source, n]) => [
      source,
      n,
      held
        .filter((r) => r.sourceRecordId === source)
        .map((r) => r.sourceNumber)
        .join(", "),
    ]),
  ),
);
