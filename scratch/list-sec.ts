import { registeredTypes } from "../src/lib/middle/generate";
const want = [
  "일차함수의 그래프와 절편",
  "일차함수의 식 구하기",
  "함수와 함숫값",
  "일차함수의 그래프와 기울기",
  "일차함수의 그래프의 성질",
  "일차함수의 그래프와 연립방정식의 해",
  "일차함수와 일차방정식",
  "일차부등식의 응용",
  "일차부등식의 활용(개수, 예금액, 유리한 방법)",
  "두 직선의 위치 관계",
  "점, 선, 면",
  "다면체",
  "작도",
  "합동",
  "이등변삼각형의 성질",
  "다각형의 내각과 외각",
  "유리수의 곱셈",
  "경우의 수",
  "여러 가지 경우의 수",
  "이차함수의 최댓값과 최솟값",
];
const byS = new Map<string, { key: string; title: string }[]>();
for (const t of registeredTypes()) {
  const a = byS.get(t.unitSection) ?? [];
  a.push({ key: t.key, title: t.rpmTitle });
  byS.set(t.unitSection, a);
}
for (const s of want) {
  const a = byS.get(s) ?? [];
  console.log(`\n== ${s}  (${a.length})`);
  for (const x of a) console.log(`   ${x.key}   ${x.title}`);
}
