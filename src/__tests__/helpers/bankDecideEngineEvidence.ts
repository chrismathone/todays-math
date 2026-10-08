/** Bank-decide: freeze pre-edit output without accessing a database.
 * Run once with `npx tsx src/__tests__/helpers/bankDecideEngineEvidence.ts snapshot`.
 * Tests consume the frozen hashes; this helper never replaces an existing baseline.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createRng } from "../../lib/elementary/rng";
import { generateHighProblem } from "../../lib/high/generate";
import { H1_FACTOR } from "../../lib/high/h1Factor";
import { generateMiddleProblem } from "../../lib/middle/generate";
import { M3_TRIG } from "../../lib/middle/m3Trig";
import { parseProblemContentLabeled } from "../../lib/problem/parseProblemContent";

export const FACTOR_KEY = "공통수학1|인수분해|04";
export const TRIG_KEY = "3-2|삼각비|18";
export const fixturePath = (name: string) =>
  join(process.cwd(), "src/__tests__/unit/__fixtures__", name);
export const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function readEvidence<T>(name: string): T {
  return JSON.parse(
    gunzipSync(readFileSync(fixturePath(name))).toString(),
  ) as T;
}

/**
 * `recordedDistractors` — 지문에 넣을 오답을 문항에서 뽑는 자리(기본은 낸 그대로).
 * 기준선 뒤에 «허용한 변경»이 생기면 대조 시험이 그 변경만 되돌린 값을 넣어, 그 밖은 그대로임을 잰다
 * (2026-10-08 `공통수학1|인수분해|04` — `bankDecideEngineParity.test.ts`).
 */
export function captureEngineEvidence(
  recordedDistractors: (
    key: string,
    problem: { facts: Record<string, number>; distractors?: readonly string[] },
  ) => readonly string[] | null = (_key, problem) =>
    problem.distractors ?? null,
) {
  return [
    { entries: H1_FACTOR, generate: generateHighProblem },
    { entries: M3_TRIG, generate: generateMiddleProblem },
  ].flatMap(({ entries, generate }) =>
    entries.map((entry) => {
      let salt = 0;
      for (const c of entry.key)
        salt = (Math.imul(salt, 31) + c.charCodeAt(0)) | 0;
      const fields: Record<string, unknown[]> = {
        content: [],
        answer: [],
        solution: [],
        stableSolution: [],
        metadata: [],
        distractors: [],
        random: [],
      };
      const editableSolutions: [number, string][] = [];
      for (let seed = 0; seed < 300; seed++) {
        const rng = createRng(seed + (salt >>> 0));
        let draws = 0;
        entry.handler(() => {
          draws++;
          return rng();
        });
        const p = generate(entry.key, seed);
        const { content, answer, solution, ...rest } = p;
        const metadata: Record<string, unknown> = { ...rest };
        const distractors = recordedDistractors(entry.key, p);
        delete metadata.distractors;
        const f = p.facts;
        const editable =
          entry.key === FACTOR_KEY &&
          f.mode === 1 &&
          f.h === f.c * f.g &&
          f.b !== f.a * f.c;
        fields.content.push(content);
        fields.answer.push(answer);
        fields.solution.push(solution);
        if (editable) editableSolutions.push([seed, digest(solution)]);
        else fields.stableSolution.push([seed, solution]);
        fields.metadata.push(metadata);
        fields.distractors.push(distractors);
        fields.random.push([draws, rng()]);
      }
      return {
        key: entry.key,
        count: fields.content.length,
        hashes: Object.fromEntries(
          Object.entries(fields).map(([key, values]) => [key, digest(values)]),
        ),
        editableSolutions,
      };
    }),
  );
}

export type EngineEvidence = ReturnType<typeof captureEngineEvidence>;
export type DraftEvidence = {
  exams: string[];
  rows: { id: string; content: string; hash: string }[];
};

function captureDraftEvidence(): DraftEvidence {
  const root = join(process.cwd(), "scripts/import/exam-paper/exams");
  const exams: string[] = [];
  const rows: DraftEvidence["rows"] = [];
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    if (!readdirSync(join(root, dir.name)).includes("drafts.json")) continue;
    exams.push(dir.name);
    const drafts = JSON.parse(
      readFileSync(join(root, dir.name, "drafts.json"), "utf8"),
    ) as { externalId: string; content: string }[];
    for (const row of drafts)
      rows.push({
        id: row.externalId,
        content: row.content,
        hash: digest(parseProblemContentLabeled(row.content)),
      });
  }
  return {
    exams: exams.sort(),
    rows: rows.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

if (process.argv[2] === "snapshot") {
  const engine = captureEngineEvidence();
  const drafts = captureDraftEvidence();
  for (const [name, data] of [
    ["bankDecideEngine.before.json.gz", engine],
    ["bankDecideParser.before.json.gz", drafts],
  ] as const) {
    writeFileSync(fixturePath(name), gzipSync(JSON.stringify(data)), {
      flag: "wx",
    });
    console.log(JSON.stringify({ name, hash: digest(data) }));
  }
  console.log(
    JSON.stringify({
      templates: engine.length,
      seeds: 300,
      exams: drafts.exams.length,
      rows: drafts.rows.length,
    }),
  );
  const daegu = drafts.rows.find(
    (row) => row.id === "2025-daegudong-3-2-mid-6",
  )!;
  console.log(
    JSON.stringify({
      id: daegu.id,
      raw: daegu.content,
      parsed: parseProblemContentLabeled(daegu.content),
    }),
  );
  console.log(
    JSON.stringify({ factorSeed86: generateHighProblem(FACTOR_KEY, 86) }),
  );
}
