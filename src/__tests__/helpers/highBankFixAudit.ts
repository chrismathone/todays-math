/**
 * bank-fix-high 전후 산출과 난수 호출 수를 대조한다.
 * 실제 생성기를 씨앗별로 불러 수정한 꼴 밖의 변경을 찾으며 DB에는 닿지 않는다.
 * 사용: npx tsx src/__tests__/helpers/highBankFixAudit.ts capture|compare
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRng } from "../../lib/elementary/rng";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";

type Row = {
  key: string;
  seed: number;
  hash: string;
  calls: number;
  facts: Record<string, number>;
};

const path = join(tmpdir(), "bank-fix-high-before.json");
const keys = [
  "공통수학1|여러 가지 방정식|14",
  "공통수학1|인수분해|04",
  "공통수학1|다항식의 연산|07",
  "공통수학1|이차방정식|02",
];
const rows: Row[] = [];
for (const entry of registeredHighTypes()) {
  let salt = 0;
  for (let i = 0; i < entry.key.length; i += 1)
    salt = (Math.imul(salt, 31) + entry.key.charCodeAt(i)) | 0;
  for (let seed = 0; seed < (keys.includes(entry.key) ? 300 : 50); seed += 1) {
    const p = generateHighProblem(entry.key, seed);
    const rng = createRng(seed + (salt >>> 0));
    let calls = 0;
    entry.handler(() => {
      calls += 1;
      return rng();
    });
    rows.push({
      key: entry.key,
      seed,
      hash: createHash("sha256")
        .update([p.content, p.answer, p.solution].join("|"))
        .digest("hex"),
      calls,
      facts: p.facts,
    });
  }
}

if (process.argv[2] === "capture") {
  writeFileSync(path, JSON.stringify(rows));
  console.log(
    JSON.stringify({
      path,
      types: registeredHighTypes().length,
      rows: rows.length,
    }),
  );
  for (const [index, seed] of [150, 113, 26, 1].entries()) {
    const p = generateHighProblem(keys[index]!, seed);
    console.log(JSON.stringify({ key: keys[index], seed, ...p }));
  }
  console.log(
    JSON.stringify(registeredHighTypes().map((e) => [e.key, e.rpmTitle])),
  );
} else if (process.argv[2] === "compare") {
  const before = JSON.parse(readFileSync(path, "utf8")) as Row[];
  if (before.length !== rows.length) throw new Error("산출 모집단이 달라졌다");
  const changed: Record<string, number> = {};
  const rngChanged: Record<string, number> = {};
  let protectedRows = 0;
  const failures: Row[] = [];
  for (const [i, old] of before.entries()) {
    const next = rows[i]!;
    const f = old.facts;
    const repairable =
      (old.key === keys[0] &&
        f.mode === 2 &&
        f.R! ** 2 === 4 * (f.P! * f.R! + f.Q!)) ||
      (old.key === keys[1] &&
        f.mode === 1 &&
        f.h === f.c! * f.g! &&
        f.b !== f.a! * f.c! &&
        f.c !== 1 &&
        f.exprId !== 2) ||
      (old.key === keys[2] &&
        (f.mode === 1 || (f.mode === 2 && f.v === 0)) &&
        f.s! ** 2 * f.e2! ** 2 -
          4 * f.e2! ** 3 -
          4 * f.s! ** 3 * f.e3! -
          27 * f.e3! ** 2 +
          18 * f.s! * f.e2! * f.e3! <
          0) ||
      (old.key === keys[3] && f.mode === 0);
    if (!repairable) protectedRows += 1;
    const label = `${old.key}:mode${f.mode}${f.v === undefined ? "" : `:v${f.v}`}`;
    if (old.hash !== next.hash) {
      changed[label] = (changed[label] ?? 0) + 1;
      if (!repairable) failures.push(old);
    }
    if (old.calls !== next.calls) {
      rngChanged[label] = (rngChanged[label] ?? 0) + 1;
      if (!repairable) failures.push(old);
    }
    if (old.key !== next.key || old.seed !== next.seed) failures.push(old);
  }
  const fingerprint = (items: Row[]) =>
    createHash("sha256")
      .update(items.map((r) => `${r.key}|${r.seed}|${r.hash}`).join("\n"))
      .digest("hex");
  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        protectedRows,
        seed0to49: rows.filter((r) => r.seed < 50).length,
        beforeFingerprint: fingerprint(before.filter((r) => r.seed < 50)),
        afterFingerprint: fingerprint(rows.filter((r) => r.seed < 50)),
        changed,
        rngChanged,
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
} else {
  throw new Error("capture 또는 compare를 지정하십시오");
}
