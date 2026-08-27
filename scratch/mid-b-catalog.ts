/**
 * RPM 색인(정본) 대 등록표 — **아직 안 등록된 정본 유형이 몇인가**. (내 파일)
 *
 * 「유형이 모자라다」를 지어내기 전에 물어야 할 것: 정본에 있는데 **아직 안 만든**
 * 유형이 남아 있지 않나. `middleTypeCoverage.test.ts` 가 「등록 유형은 전부 정본에
 * 있어야 한다」를 잠그므로, 번호를 지어내는 길은 그 가드와 정면으로 부딪힌다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { registeredTypes } from "../src/lib/middle/generate";

type Cat = Record<
  string,
  { types: { minor: string; number: string; title: string }[] }
>;
const catalog = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../scripts/rpm/rpm-type-catalog.json"),
    "utf-8",
  ),
) as Cat;

type E = {
  key: string;
  grade: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
};
const reg = registeredTypes() as unknown as E[];
const regKeys = new Set(reg.map((e) => e.key));

/** 등록된 유형이 붙은 소단원을 「중단원 → 소단원」으로 되짚는다. */
const minorToSections = new Map<string, Map<string, string>>();
for (const e of reg) {
  const mk = `${e.rpmBook}|${e.rpmMinor}`;
  if (!minorToSections.has(mk)) minorToSections.set(mk, new Map());
  minorToSections.get(mk)!.set(e.rpmType, `${e.grade}|${e.unitSection}`);
}

const missingByMinor = new Map<string, string[]>();
for (const [book, v] of Object.entries(catalog)) {
  for (const t of v.types) {
    const key = `${book}|${t.minor}|${t.number}`;
    if (regKeys.has(key)) continue;
    const mk = `${book}|${t.minor}`;
    if (!missingByMinor.has(mk)) missingByMinor.set(mk, []);
    missingByMinor.get(mk)!.push(`${t.number} ${t.title}`);
  }
}

const want = process.argv.slice(2);
let total = 0;
for (const [mk, list] of [...missingByMinor].sort()) {
  total += list.length;
  const secs = [...new Set([...(minorToSections.get(mk)?.values() ?? [])])];
  if (
    want.length &&
    !want.some((w) => mk.includes(w) || secs.some((s) => s.includes(w)))
  )
    continue;
  console.log(
    `\n${mk}  — 미등록 ${list.length}  (붙은 소단원: ${secs.join(" · ") || "없음"})`,
  );
  for (const l of list) console.log(`   ${l}`);
}
console.log(`\n정본에 있는데 미등록 = ${total}유형`);
