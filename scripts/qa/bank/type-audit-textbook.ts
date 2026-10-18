/** Offline textbook correspondence audit. Full packets are private, never report output. */
import { createHash } from "node:crypto";
import {
  createReadStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  generateTextbookVariantPair,
  type TextbookVariantSource,
} from "../../../src/lib/import/schoolTextbook/variants";
import { generateTextbookGeometryPair } from "../../../src/lib/import/schoolTextbook/variantsGeometry";
import { generateTextbookCalculusPair } from "../../../src/lib/import/schoolTextbook/variantsCalculus";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../../src/lib/high/generate";

type Row = Record<string, unknown> & {
  id: string;
  source: string;
  externalId: string;
};
async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw new Error("snapshot-directory private-output-directory required");
  const meta = JSON.parse(
    readFileSync(join(input, "snapshot-meta.json"), "utf8"),
  );
  if (!meta.readOnly || meta.isolation !== "RepeatableRead")
    throw new Error("read-only snapshot required");
  const originals: Row[] = [],
    children = new Map<string, Row>();
  const hash = createHash("sha256");
  const stream = createReadStream(join(input, "snapshot.jsonl"));
  stream.on("data", (bytes) => hash.update(bytes));
  let count = 0;
  for await (const line of createInterface({
    input: stream,
    crlfDelay: Infinity,
  })) {
    if (!line) continue;
    const row = JSON.parse(line) as Row;
    count++;
    if (row.source === "school_textbook") originals.push(row);
    else if (row.externalId?.startsWith("tb-retry-v1:"))
      children.set(row.externalId, row);
  }
  if (count !== meta.total || hash.digest("hex") !== meta.sha256)
    throw new Error("snapshot count/hash mismatch");
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const snake = (key: string) =>
    key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const source = (row: Row): TextbookVariantSource =>
    Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => key !== "eligible")
        .map(([key, value]) => [snake(key), value]),
    ) as TextbookVariantSource;
  const routes = [
    ["core", generateTextbookVariantPair],
    ["geometry", generateTextbookGeometryPair],
    ["calculus", generateTextbookCalculusPair],
  ] as const;
  const fields = [
    "content",
    "answer",
    "solution",
    "figureSvg",
    "figureUrls",
    "figureDims",
    "figureSourceMm",
    "choiceFigureIndex",
    "questionType",
  ];
  const packets = Object.fromEntries(
    routes.map(([name]) => [
      name,
      {
        sources: [] as unknown[],
        candidates: [] as unknown[],
        evidence: [] as unknown[],
      },
    ]),
  );
  const supported: Record<string, number> = {};
  const bindings: unknown[] = [],
    unmatched: unknown[] = [];
  for (const original of originals) {
    const raw = source(original);
    let matched = false;
    for (const [route, generate] of routes) {
      const result = generate(raw);
      if (result.status !== "matched") continue;
      matched = true;
      supported[route] = (supported[route] ?? 0) + 1;
      const actual = result.candidates.map((candidate) => {
        const stored = children.get(candidate.externalId);
        const differences = stored
          ? fields.filter(
              (field) =>
                JSON.stringify(stored[field]) !==
                JSON.stringify(
                  (candidate as unknown as Record<string, unknown>)[field],
                ),
            )
          : ["missing-row"];
        bindings.push({
          originalId: original.id,
          sourceEligible: original.eligible === true,
          externalId: candidate.externalId,
          childId: stored?.id ?? null,
          route,
          recipe: candidate.recipe,
          differences,
        });
        // Use current stored payload for the separate Python recomputation, even if correspondence differs.
        return stored
          ? {
              ...candidate,
              ...Object.fromEntries(
                fields.map((field) => [field, stored[field]]),
              ),
            }
          : candidate;
      });
      if (
        result.candidates.every((candidate) =>
          children.has(candidate.externalId),
        )
      ) {
        packets[route]!.sources.push(raw);
        packets[route]!.candidates.push(...actual);
        packets[route]!.evidence.push({ source: raw, candidates: actual });
      }
      break;
    }
    if (!matched)
      unmatched.push({
        originalId: original.id,
        readyPairExists: [1, 2].every((slot) =>
          children.has(`tb-retry-v1:${original.id}:${slot}`),
        ),
      });
  }
  for (const [route, packet] of Object.entries(packets))
    writeFileSync(
      join(output, `${route}-packet.json`),
      JSON.stringify({ snapshotSha256: meta.sha256, ...packet }) + "\n",
      { mode: 0o600 },
    );
  const summary = {
    snapshotSha256: meta.sha256,
    sourceDigestLimit:
      "Export omits some historical raw DB columns; this is a fresh content/answer/solution/figure correspondence check, not historical all-column sourceDigest equality.",
    precedence: routes.map(([name]) => name),
    supported,
    routes: Object.fromEntries(
      Object.entries(packets).map(([name, packet]) => [
        name,
        {
          originals: packet.sources.length,
          candidates: packet.candidates.length,
        },
      ]),
    ),
    bindings,
    unmatched,
  };
  writeFileSync(
    join(output, "regeneration.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { mode: 0o600 },
  );
  const highKeys = [
    "공통수학1|다항식의 연산|01",
    "공통수학1|복소수|09",
    "공통수학1|행렬|06",
    "공통수학1|경우의 수와 순열|01",
  ];
  writeFileSync(
    join(output, "high-reference-private.json"),
    JSON.stringify(
      {
        snapshotSha256: meta.sha256,
        kind: "fresh generated reference, not frozen database stock or textbook provenance",
        entries: registeredHighTypes().map(({ key, unitSection }) => ({
          key,
          unitSection,
        })),
        examples: highKeys.map((key) => ({
          key,
          seed: 20261018,
          variant: 0,
          ...generateHighProblem(key, 20261018, 0),
        })),
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      routes: summary.routes,
      bindings: bindings.length,
      unmatched: unmatched.length,
    }),
  );
}
void main();
