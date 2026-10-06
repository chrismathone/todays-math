/**
 * 읽기 결과를 기준 글(ref/<사진>.txt)과 견주어 센다.
 *   node score.mjs <결과 폴더> [--detail arm/run] [파일 이름 필터]
 *
 * 기준 글 안의 ⟦ … ⟧ 는 «있어도 없어도 되는 글»이다(쪽 번호 · 손으로 매겨 복사한 번호처럼 판정이 갈리는 것) — 빠져도 세지 않는다.
 * 덩이 종류: 더함(기준에 없는 글 — 손글씨 누출 · 지어냄) · 빠짐 · 바뀜 · 옮김(같은 글이 다른 자리에).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { hunks, load, tokens } from "./lib.mjs";
import {
  classify,
  dropIgnored,
  ignoreOf,
  norm,
  refTokens,
} from "./scorelib.mjs";

const args = process.argv.slice(2);
const outDir = args.shift();
let detail = null;
let only = "";
while (args.length) {
  const arg = args.shift();
  if (arg === "--detail") detail = args.shift();
  else only = arg;
}

const refDir = path.join(outDir, "ref");
const stemsAll = readdirSync(refDir)
  .filter((name) => name.endsWith(".txt") && !name.includes(".alt"))
  .map((name) => name.slice(0, -4))
  .filter(
    (stem) =>
      !only ||
      (only.endsWith("$")
        ? stem.endsWith(only.slice(0, -1))
        : stem.includes(only)),
  )
  .sort();
const arms = readdirSync(outDir).filter(
  (name) => name !== "ref" && existsSync(path.join(outDir, name, "run1")),
);
const KINDS = ["더함", "빠짐", "바뀜", "옮김"];
const table = [];
for (const arm of arms)
  for (const run of ["1", "2"]) {
    if (!existsSync(path.join(outDir, arm, `run${run}`))) continue;
    const sum = {
      arm,
      run,
      pages: 0,
      clean: 0,
      더함: 0,
      빠짐: 0,
      바뀜: 0,
      옮김: 0,
      tokens: 0,
      ms: [],
    };
    for (const stem of stemsAll) {
      const text = load(outDir, arm, run, stem);
      if (text === null) continue;
      const ignore = ignoreOf(refDir, stem);
      const a = tokens(norm(text)).filter((token) => !ignore?.test(token));
      // 읽는 차례가 둘 다 옳은 쪽(짝짓기 표의 줄 차례 · 단 차례)은 기준 글을 둘 두고 가까운 쪽으로 잰다
      const list = readdirSync(refDir)
        .filter(
          (name) => name === `${stem}.txt` || name.startsWith(`${stem}.alt`),
        )
        .map((name) => {
          const ref = dropIgnored(
            refTokens(readFileSync(path.join(refDir, name), "utf8")),
            ignore,
          );
          return classify(hunks(a, ref.out), ref.optional);
        })
        .sort((x, y) => x.length - y.length)[0];
      sum.pages++;
      const real = list.filter((h) => h.kind !== "옮김(짝)");
      if (!real.length) sum.clean++;
      for (const hunk of real) {
        sum[hunk.kind]++;
        sum.tokens += Math.max(hunk.a.length, hunk.b.length);
      }
      const meta = path.join(outDir, arm, `run${run}`, `${stem}.json`);
      if (existsSync(meta))
        sum.ms.push(JSON.parse(readFileSync(meta, "utf8")).ms);
      if (detail === `${arm}/${run}`) {
        console.log(`## ${stem} — ${real.length}곳`);
        for (const hunk of real) {
          const before = a.slice(Math.max(0, hunk.at - 4), hunk.at).join(" ");
          const after = a
            .slice(hunk.at + hunk.a.length, hunk.at + hunk.a.length + 4)
            .join(" ");
          console.log(
            `  [${hunk.kind}] … ${before} «${hunk.a.join(" ") || "∅"}» ↔ 기준 «${hunk.b.join(" ") || "∅"}» ${after} …`,
          );
        }
      }
    }
    table.push(sum);
  }
if (!detail) {
  console.log(
    "팔 · 회차 | 쪽 | 흠 없는 쪽 | 더함 | 빠짐 | 바뀜 | 옮김 | 어긋난 낱말 | 걸린 시간 중앙값(초)",
  );
  for (const row of table) {
    const ms = [...row.ms].sort((x, y) => x - y);
    const median = ms.length
      ? (ms[Math.floor(ms.length / 2)] / 1000).toFixed(0)
      : "-";
    console.log(
      `${row.arm} · ${row.run} | ${row.pages} | ${row.clean} | ${KINDS.map((k) => row[k]).join(" | ")} | ${row.tokens} | ${median}`,
    );
  }
}
