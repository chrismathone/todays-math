import { registeredTypes } from "../src/lib/middle/generate";

type E = {
  key: string;
  grade: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
};

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

const all = registeredTypes() as unknown as E[];

// ⑴ 우리가 채울 소단원 — 지금 무엇이 있나
for (const sec of WANT) {
  const rows = all.filter((e) => e.unitSection === sec);
  console.log(`=== ${sec} (${rows.length}) ===`);
  for (const r of rows) console.log(`   ${r.key}`);
}

// ⑵ 그 소단원이 쓰는 (book|minor) 에 **이미 쓰인 번호 전량** — 키가 겹치면 안 된다
console.log("");
console.log("== (book|minor) 별로 이미 쓰인 번호 ==");
const minors = new Set(
  all
    .filter((e) => WANT.has(e.unitSection))
    .map((e) => `${e.rpmBook}|${e.rpmMinor}`),
);
for (const m of minors) {
  const used = all
    .filter((e) => `${e.rpmBook}|${e.rpmMinor}` === m)
    .map((e) => e.rpmType)
    .sort();
  console.log(`${m}  (${used.length})  ${used.join(" ")}`);
}
