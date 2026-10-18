/** Capture exact stored-row evidence; it does not repair, hold, or reclassify rows. */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

const input = resolve(".qa-artifacts/math-type-audit-20261018");
const out = resolve("docs/reports/math-type-audit-20261018");
type Row = {
  id: string;
  problemCode: string;
  familyKey: string;
  eligible: boolean;
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
};
const definitions = [
  {
    id: "Q-E01",
    familyKey: "elem:초4|2-6-3 대각선|10",
    handler: "poly263Name",
    reason:
      "All sides equal does not imply all angles equal. The prompt omits the second defining condition of a regular polygon.",
    expectedRows: 4,
  },
  {
    id: "Q-E02",
    familyKey: "elem:초4|2-4-4 사다리꼴|05",
    handler: "quad244Pick",
    reason:
      "The same generator explicitly includes rectangles in trapezoids; both the trapezoid and rectangle in these choices satisfy the requested class.",
    expectedRows: 3,
  },
  {
    id: "Q-E03",
    familyKey: "elem:초4|2-2-1 삼각형을 변의 길이에 따라 분류하기|09",
    handler: "tri221PickIso",
    reason:
      "The chooser includes equilateral and right-isosceles shapes, supplies no exclusion or side marks, and stores just one isosceles label. This contradicts the source's explicit policy to avoid the inclusive/exclusive ambiguity.",
    expectedRows: 3,
  },
  {
    id: "Q-E04",
    familyKey: "elem:초4|2-4-2 평행과 평행선|09",
    handler: "quad242PerpCount",
    reason:
      "The prompt says 4 or 5 perpendiculars while the stored SVG contains exactly 3; the generator clamps the figure with Math.min(k,3).",
    expectedRows: 4,
  },
];
const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main() {
  const rows: Row[] = [];
  for await (const line of createInterface({
    input: createReadStream(resolve(input, "snapshot.jsonl")),
    crlfDelay: Infinity,
  })) {
    const row = JSON.parse(line) as Row;
    if (
      row.eligible &&
      definitions.some((definition) => definition.familyKey === row.familyKey)
    )
      rows.push(row);
  }
  const source = readFileSync("src/lib/elementary/g4.ts", "utf8");
  const findings = definitions.map((definition) => {
    let own = rows.filter((row) => row.familyKey === definition.familyKey);
    if (definition.id === "Q-E04")
      own = own.filter((row) => /수선을 \$[45]\$개/.test(row.content));
    assert.equal(own.length, definition.expectedRows, definition.id);
    const sourceOffset = source.indexOf(`function ${definition.handler}(`);
    assert(sourceOffset >= 0);
    return {
      ...definition,
      source: "src/lib/elementary/g4.ts",
      line: source.slice(0, sourceOffset).split("\n").length,
      rows: own.map((row) => {
        let perpendicularCount: number | undefined;
        if (definition.id === "Q-E04") {
          perpendicularCount = [
            ...(row.figureSvg ?? "").matchAll(/<line\s+([^>]+)>/g),
          ].filter(([, attributes]) => {
            const attr = Object.fromEntries(
              [...attributes.matchAll(/([a-z][a-z0-9]*)="([^"]+)"/g)].map(
                (match) => [match[1], match[2]],
              ),
            );
            return attr.x1 === attr.x2 && attr.y1 !== attr.y2;
          }).length;
          assert.equal(perpendicularCount, 3);
        }
        return {
          id: row.id,
          problemCode: row.problemCode,
          sha256: sha([row.content, row.answer, row.solution, row.figureSvg]),
          ...(perpendicularCount === undefined ? {} : { perpendicularCount }),
        };
      }),
    };
  });
  // A convex equilateral, non-regular hexagon: opposite unit vectors close exactly.
  const directions = [0, 90, 150, 180, 270, 330];
  const vectors = directions.map((degrees) => [
    Math.cos((degrees * Math.PI) / 180),
    Math.sin((degrees * Math.PI) / 180),
  ]);
  const closure = vectors.reduce(
    (sum, vector) => [sum[0] + vector[0], sum[1] + vector[1]],
    [0, 0],
  );
  assert(closure.every((coordinate) => Math.abs(coordinate) < 1e-12));
  const angles = directions.map(
    (direction, i) => 180 - ((directions[(i + 1) % 6] - direction + 360) % 360),
  );
  assert.equal(new Set(angles).size, 3);
  assert(angles.every((angle) => angle > 0 && angle < 180));
  const report = {
    snapshotSha256: JSON.parse(
      readFileSync(resolve(input, "snapshot-meta.json"), "utf8"),
    ).sha256,
    findings,
    uniqueEligibleRows: new Set(
      findings.flatMap((finding) => finding.rows.map((row) => row.id)),
    ).size,
    counterexample: {
      type: "convex equilateral hexagon, not regular",
      edgeDirectionsDegrees: directions,
      edgeLengths: vectors.map((vector) => Math.hypot(...vector)),
      interiorAnglesDegrees: angles,
      closure,
    },
    scope:
      "Source inspection of all 53 elementary finite-domain candidates, exact saved payload evidence for the four cited families; not a proof that no other error exists. No DB/product changes.",
  };
  writeFileSync(
    resolve(out, "elementary-quality.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      findings: findings.length,
      eligibleRows: report.uniqueEligibleRows,
      counterexample: report.counterexample,
    }),
  );
}
main();
