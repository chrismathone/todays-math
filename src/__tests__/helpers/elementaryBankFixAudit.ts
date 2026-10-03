/**
 * bank-fix-elem 재현과 전후 지문. DB 없이 제품의 전 문형·갈래를 직접 부른다.
 * npx tsx src/__tests__/helpers/elementaryBankFixAudit.ts snapshot <출력.json>
 * npx tsx src/__tests__/helpers/elementaryBankFixAudit.ts repro
 * 저장 파일은 검토용 임시 자료이며 제품 파일을 바꾸지 않는다.
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "../../lib/elementary/generate";
import type { ElemTier } from "../../lib/elementary/difficulty";
import type { ElemProblem } from "../../lib/elementary/types";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const unit = (grade: string, code: string) => {
  const found = elementaryUnits().find(
    (u) => u.grade === grade && u.section.startsWith(`${code} `),
  );
  if (!found) throw new Error(`${grade}|${code}: 소단원 없음`);
  return found;
};

if (process.argv[2] === "probe") {
  const revision = process.argv[3];
  if (!revision) throw new Error("고치기 전 커밋 필요");
  const beforeSource = execFileSync(
    "git",
    ["show", `${revision}:scripts/figure/elem_advanced.py`],
    { encoding: "utf8" },
  );
  // 옛 렌더러는 메모리에서만 불러온다. 다른 검사 도중 작업 파일을 바꾸지 않는다.
  const script = [
    "import sys,runpy",
    "sys.path.insert(0,'scripts/figure')",
    "from engine_path import engine_root",
    "sys.path.insert(0,engine_root())",
    "old=sys.stdin.buffer.read().decode('utf-8')",
    "if old:",
    " import elementary,elem_advanced",
    " exec(compile(old,'before/elem_advanced.py','exec'),elem_advanced.__dict__)",
    " elementary.KIND_FIELDS.update(elem_advanced.ADV_FIELDS)",
    " for kind in elem_advanced.ADV_FIELDS: elementary.OPTIONAL.pop(kind,None)",
    " elementary.OPTIONAL.update(elem_advanced.ADV_OPTIONAL)",
    " elementary._RENDER.update(elem_advanced.ADV_RENDER)",
    "runpy.run_path('scripts/qa/probe-elem-figure.py',run_name='__main__')",
  ].join("\n");
  const results = [beforeSource, ""].map((input) => {
    const r = spawnSync(process.env.PYTHON_BIN ?? "python", ["-c", script], {
      input,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (r.error || r.status !== 0)
      throw new Error(`${r.error ?? ""} ${r.stderr}`);
    return r.stdout;
  });
  const count = (results[0]!.match(/^### /gm) ?? []).length;
  if (count === 0 || results[0] !== results[1])
    throw new Error(`기존 ${count}개 그림 표본의 출력이 바뀜`);
  console.log(
    JSON.stringify({
      probe: "scripts/qa/probe-elem-figure.py",
      count,
      rejected: (results[0]!.match(/^ERROR /gm) ?? []).length,
      identical: true,
      sha256: hash(results[0]),
    }),
  );
} else if (process.argv[2] === "compare") {
  type Snapshot = { total: number; rows: Record<string, string[]> };
  const before = JSON.parse(readFileSync(process.argv[3]!, "utf8")) as Snapshot;
  const after = JSON.parse(readFileSync(process.argv[4]!, "utf8")) as Snapshot;
  const changed: Record<
    string,
    { text: number; answer: number; figure: number }
  > = {};
  const missing = Object.keys(before.rows).filter((k) => !(k in after.rows));
  const extra = Object.keys(after.rows).filter((k) => !(k in before.rows));
  for (const [key, b] of Object.entries(before.rows)) {
    const a = after.rows[key];
    if (!a || b.every((h, i) => h === a[i])) continue;
    const route = key.slice(0, key.lastIndexOf("|"));
    const counts = (changed[route] ??= { text: 0, answer: 0, figure: 0 });
    counts.text += Number(b[0] !== a[0]);
    counts.answer += Number(b[1] !== a[1]);
    counts.figure += Number(b[2] !== a[2]);
  }
  const summary = {
    before: before.total,
    after: after.total,
    missing,
    extra,
    changed,
  };
  if (process.argv[5])
    writeFileSync(process.argv[5], JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (
    missing.length ||
    extra.length ||
    Object.values(changed).some((v) => v.answer > 0)
  )
    process.exitCode = 1;
} else if (process.argv[2] === "snapshot") {
  const output = process.argv[3];
  if (!output) throw new Error("출력 경로 필요");
  const rows: Record<string, string[]> = {};
  let total = 0;
  for (const u of elementaryUnits()) {
    const key = `${u.grade}|${u.section.split(" ")[0]}`;
    const paths: [string, (seed: number) => ElemProblem][] = [
      ["표준", (s) => generateElementaryProblem(u, s)],
      ...supportedTiers(u).map((t): [string, (seed: number) => ElemProblem] => [
        t,
        (s) => generateElementaryProblem(u, s, t),
      ]),
      ...listedForms(u).map((f): [string, (seed: number) => ElemProblem] => [
        `f${f.id}`,
        (s) => generateElementaryForm(u, s, f.id),
      ]),
    ];
    for (const [route, generate] of paths) {
      for (let seed = 0; seed < 50; seed += 1) {
        const p = generate(seed);
        rows[`${key}|${route}|s${seed}`] = [
          hash([p.content, p.answer, p.solution]),
          hash(p.answer),
          hash(p.figureSpec),
        ];
        total += 1;
      }
    }
  }
  writeFileSync(output, JSON.stringify({ total, rows }));
  console.log(JSON.stringify({ output, total, sha256: hash(rows) }));
} else if (process.argv[2] === "figures") {
  const output = process.argv[3];
  if (!output) throw new Error("출력 폴더 필요");
  void (async () => {
    const ps = [
      generateElementaryProblem(unit("초6", "2-6-2"), 0, "연산"),
      generateElementaryForm(unit("초6", "1-6-1"), 0, "10"),
      generateElementaryForm(unit("초5", "2-5-2"), 0, "01"),
    ];
    for (let i = 0; i < ps.length; i += 1) {
      const result = await renderFigureSpec(ps[i]!.figureSpec);
      if (!result.ok) throw new Error(result.error);
      const name = path.join(output, `figure-${i + 1}`);
      writeFileSync(`${name}.svg`, result.svg);
      await sharp(Buffer.from(result.svg))
        .resize({ width: 600 })
        .png()
        .toFile(`${name}.png`);
      console.log(
        JSON.stringify({ path: `${name}.png`, content: ps[i]!.content }),
      );
    }
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else if (process.argv[2] === "repro") {
  const targets: [string, string, string, string | ElemTier][] = [
    ["EL-01", "초6", "2-6-2", "연산"],
    ["EL-02a", "초6", "1-6-1", "10"],
    ["EL-02b", "초5", "2-5-2", "01"],
    ["EL-03", "초4", "2-1-4", "11"],
    ["EL-04a", "초5", "1-2-6", "12"],
    ["EL-04b", "초5", "1-2-6", "04"],
    ["EL-05", "초5", "2-2-4", "11"],
    ["EL-06", "초5", "1-6-5", "12"],
    ["EL-07", "초6", "1-5-2", "11"],
    ["EL-08", "초6", "1-2-4", "12"],
    ["EL-09", "초3", "2-6-2", "11"],
    ["EL-A1", "초5", "2-6-1", "11"],
  ];
  for (const [id, grade, code, route] of targets) {
    const u = unit(grade, code);
    const p = /^\d+$/.test(route)
      ? generateElementaryForm(u, 0, route)
      : generateElementaryProblem(u, 0, route as ElemTier);
    console.log(JSON.stringify({ id, ...p }));
  }
}
