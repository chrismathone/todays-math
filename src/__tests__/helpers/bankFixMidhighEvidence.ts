/** Bank-fix evidence: fingerprint real engine output before edits, then compare.
 * This is an explicit CLI helper, not a test or a database tool.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRng } from "../../lib/elementary/rng";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import { parseProblemContent } from "../../lib/problem/parseProblemContent";

const engines = [
  {
    name: "middle",
    entries: registeredTypes(),
    generate: generateMiddleProblem,
  },
];
type Row = { hash: string; facts: string; draws: number; error?: string };
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const path =
  process.argv[3] ?? join(tmpdir(), "bank-fix-midhigh-baseline.json");

function snapshot() {
  const rows: Record<string, Row> = {};
  for (const { name, entries, generate } of engines) {
    for (const entry of entries) {
      let salt = 0;
      for (const c of entry.key)
        salt = (Math.imul(salt, 31) + c.charCodeAt(0)) | 0;
      for (let seed = 0; seed < 50; seed++) {
        for (let variant = 0; variant < 3; variant++) {
          const id = `${name}|${entry.key}|${seed}|${variant}`;
          let draws = 0;
          const rng = createRng(seed + (salt >>> 0) + variant * 0x9e37);
          try {
            entry.handler(() => {
              draws++;
              return rng();
            });
            const p = generate(entry.key, seed, variant);
            rows[id] = {
              hash: digest([p.content, p.answer, p.solution].join("|")),
              facts: JSON.stringify(p.facts),
              draws,
            };
          } catch (error) {
            const message = String(error);
            rows[id] = {
              hash: digest(message),
              facts: "",
              draws,
              error: message,
            };
          }
        }
      }
    }
  }
  return rows;
}

if (process.argv[2] === "snapshot") {
  const rows = snapshot();
  writeFileSync(path, JSON.stringify(rows), { flag: "wx" });
  console.log(
    JSON.stringify({
      path,
      rows: Object.keys(rows).length,
      errors: Object.values(rows).filter((r) => r.error).length,
      digest: digest(JSON.stringify(rows)),
    }),
  );
} else if (process.argv[2] === "compare") {
  const before = Object.fromEntries(
    Object.entries(
      JSON.parse(readFileSync(path, "utf8")) as Record<string, Row>,
    ).filter(([id]) => id.startsWith("middle|")),
  );
  const after = snapshot();
  const changed: Record<
    string,
    { text: number; facts: number; draws: number; recovered: number }
  > = {};
  if (Object.keys(before).join() !== Object.keys(after).join())
    throw new Error("Registry changed");
  for (const [id, row] of Object.entries(after)) {
    const old = before[id]!;
    if (JSON.stringify(row) === JSON.stringify(old)) continue;
    const key = id.split("|").slice(0, -2).join("|");
    const counts = (changed[key] ??= {
      text: 0,
      facts: 0,
      draws: 0,
      recovered: 0,
    });
    counts.text += Number(row.hash !== old.hash);
    counts.facts += Number(row.facts !== old.facts);
    counts.draws += Number(row.draws !== old.draws);
    counts.recovered += Number(!!old.error && !row.error);
  }
  const allowed = new Set([
    "middle|1-2|기본 도형|08",
    "middle|1-2|기본 도형|09",
    "middle|1-2|원과 부채꼴|02",
    "middle|1-2|원과 부채꼴|05",
    "middle|1-2|원과 부채꼴|07",
    "middle|2-2|삼각형의 외심과 내심|70",
    "middle|2-2|삼각형의 외심과 내심|105X",
    "middle|2-2|평행선 사이의 선분의 길이의 비|09",
    "middle|2-1|유리수와 순환소수|17",
  ]);
  const unexpected = Object.keys(changed).filter((key) => !allowed.has(key));
  console.log(
    JSON.stringify(
      {
        rows: Object.keys(after).length,
        baselineDigest: digest(JSON.stringify(before)),
        changed,
        unexpected,
      },
      null,
      2,
    ),
  );
  if (unexpected.length) throw new Error("Unrelated template changed");
} else if (process.argv[2] === "rational-baseline") {
  const key = "2-1|유리수와 순환소수|17";
  const entry = registeredTypes().find((e) => e.key === key)!;
  let salt = 0;
  for (const c of key) salt = (Math.imul(salt, 31) + c.charCodeAt(0)) | 0;
  const hash = createHash("sha256");
  const drawsHash = createHash("sha256");
  const duplicates: string[] = [];
  const inputs: [number, number][] = [[20260905, 2]];
  for (let seed = 0; seed < 300; seed++)
    for (let variant = 0; variant < 3; variant++) inputs.push([seed, variant]);
  for (const [seed, variant] of inputs) {
    let draws = 0;
    const rng = createRng(seed + (salt >>> 0) + variant * 0x9e37);
    entry.handler(() => {
      draws++;
      return rng();
    });
    drawsHash.update(`${seed}|${variant}|${draws}\n`);
    const p = generateMiddleProblem(key, seed, variant);
    const choices = parseProblemContent(p.content).choices;
    if (new Set(choices).size !== 5) duplicates.push(`${seed}/${variant}`);
    else
      hash.update(
        `${seed}|${variant}|${p.content}|${p.answer}|${p.solution}\n`,
      );
  }
  console.log(
    JSON.stringify({
      inputs: inputs.length,
      duplicates,
      hash: hash.digest("hex"),
      drawsHash: drawsHash.digest("hex"),
    }),
  );
} else if (process.argv[2] === "retry-baseline") {
  for (const key of [
    "1-2|기본 도형|08",
    "2-2|평행선 사이의 선분의 길이의 비|09",
  ]) {
    const hash = createHash("sha256");
    const failed: string[] = [];
    for (let seed = 0; seed < 2000; seed++)
      for (let variant = 0; variant < 3; variant++) {
        try {
          const p = generateMiddleProblem(key, seed, variant);
          hash.update(
            `${seed}|${variant}|${p.content}|${p.answer}|${p.solution}\n`,
          );
        } catch {
          failed.push(`${seed}/${variant}`);
        }
      }
    console.log(
      JSON.stringify({
        key,
        success: 6000 - failed.length,
        failed,
        hash: hash.digest("hex"),
      }),
    );
  }
} else if (process.argv[2] === "repro") {
  for (const [key, seed, variant] of [
    ["1-2|원과 부채꼴|02", 0, 0],
    ["1-2|원과 부채꼴|05", 0, 0],
    ["1-2|원과 부채꼴|07", 0, 0],
    ["2-2|삼각형의 외심과 내심|70", 0, 0],
    ["2-2|삼각형의 외심과 내심|105X", 0, 0],
    ["1-2|기본 도형|09", 0, 0],
    ["1-2|기본 도형|08", 17, 1],
    ["1-2|기본 도형|08", 284, 0],
    ["2-2|평행선 사이의 선분의 길이의 비|09", 399, 0],
    ["2-1|유리수와 순환소수|17", 20260905, 2],
  ] as const) {
    try {
      const p = generateMiddleProblem(key, seed, variant);
      console.log(JSON.stringify({ key, seed, variant, ...p }));
    } catch (error) {
      console.log(JSON.stringify({ key, seed, variant, error: String(error) }));
    }
  }
} else {
  throw new Error("Use snapshot, compare, or repro");
}
