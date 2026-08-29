import { M1_BOOK1 } from "../src/lib/middle/m1Book1";
import { M1_BOOK2 } from "../src/lib/middle/m1Book2";
import { M1EXTRA_TYPES } from "../src/lib/middle/m1Extra";
import { M2_SYSTEM_APPLY } from "../src/lib/middle/m2SystemApply";
import { M3_TYPES } from "../src/lib/middle/m3";
import type { TypeEntry } from "../src/lib/middle/types";

const WANT = new Set([
  "회전체",
  "상대도수",
  "평행선",
  "공간에서 평면의 위치 관계",
  "다각형",
  "대푯값",
  "원과 부채꼴",
  "연립방정식의 활용(일, 속력)",
  "원과 현",
]);

const MODULES: [string, TypeEntry[]][] = [
  ["m1Book1", M1_BOOK1],
  ["m1Book2", M1_BOOK2],
  ["m1Extra(전체)", M1EXTRA_TYPES],
  ["m2SystemApply", M2_SYSTEM_APPLY],
  ["m3", M3_TYPES],
];

for (const [name, list] of MODULES) {
  const rows = list.filter((e) => WANT.has(e.unitSection));
  if (rows.length === 0) continue;
  console.log(`=== ${name} ===`);
  const bySection = new Map<string, TypeEntry[]>();
  for (const r of rows) {
    if (!bySection.has(r.unitSection)) bySection.set(r.unitSection, []);
    bySection.get(r.unitSection)!.push(r);
  }
  for (const [sec, list2] of bySection) {
    console.log(
      `  ${sec} (${list2.length})  ${list2.map((e) => e.rpmType).join(" ")}`,
    );
    console.log(`     minor=${list2[0]!.rpmMinor} book=${list2[0]!.rpmBook}`);
  }
}
