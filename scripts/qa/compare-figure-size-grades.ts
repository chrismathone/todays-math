/**
 * **인쇄 크기 등급이 바뀐 그림을 센다** — 전/후 두 코퍼스를 견준다.
 *
 *   npx tsx scripts/qa/compare-figure-size-grades.ts .tmp-orca/label-before .tmp-orca/label-after
 *
 * ## 왜 세나
 *
 * 지면에서 그림이 차지하는 폭은 **viewBox 폭 하나로** 갈린다
 * (`figureSvgFrame`: ≤160 → 140px · ≤320 → 240px · 그 위 → 364px). 그래서 **그림을
 * 키우거나 라벨을 옮겨 viewBox 가 넓어지면 인쇄 크기 등급이 조용히 뒤집힌다** —
 * 코드에는 아무 흔적이 없고, 종이에서만 드러난다(절대 규칙 6).
 *
 * 어제 라벨 잘림을 고칠 때도 같은 것을 쟀다(214장 · 등급 변화 0). 배치·축척을
 * 건드리는 작업마다 **이 수를 보고서에 적는다.**
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  figureSvgSize,
  figureSvgViewBoxWidth,
} from "../../src/lib/figure/figureSvgFrame";

const beforeDir = process.argv[2] ?? path.join(".tmp-orca", "label-before");
const afterDir = process.argv[3] ?? path.join(".tmp-orca", "label-after");

function svgs(dir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".svg"))
      map.set(name, readFileSync(path.join(dir, name), "utf8"));
  }
  return map;
}

const before = svgs(beforeDir);
const after = svgs(afterDir);
// ⚠️ **짝이 없는 것을 말없이 버리지 않는다.** 세어 찍어야 「전부 견줬다」로 안 읽힌다.
const onlyBefore = [...before.keys()].filter((k) => !after.has(k)).length;
const onlyAfter = [...after.keys()].filter((k) => !before.has(k)).length;

let same = 0;
let wider = 0;
let narrower = 0;
const flipped: string[] = [];
const deltas: number[] = [];
for (const [name, b] of before) {
  const a = after.get(name);
  if (!a) continue;
  const wb = figureSvgViewBoxWidth(b);
  const wa = figureSvgViewBoxWidth(a);
  if (wb === null || wa === null) continue;
  deltas.push(wa - wb);
  if (wa > wb + 1e-6) wider += 1;
  else if (wa < wb - 1e-6) narrower += 1;
  else same += 1;
  const gb = figureSvgSize(b);
  const ga = figureSvgSize(a);
  if (gb !== ga) {
    flipped.push(`${name}  ${gb}(${wb.toFixed(0)}) → ${ga}(${wa.toFixed(0)})`);
  }
}

console.log(
  `짝 ${same + wider + narrower}장 — 폭 같음 ${same} · 넓어짐 ${wider} · 좁아짐 ${narrower}` +
    (onlyBefore || onlyAfter
      ? ` · 짝 없음 전 ${onlyBefore} / 후 ${onlyAfter}`
      : ""),
);
// **얼마나** 넓어졌는지도 적는다. 등급이 안 바뀌어도 viewBox 가 커지면 같은 칸에
// 더 작게 그려진다 — 「등급 0장」만 적으면 그 손실이 보고서에서 사라진다.
deltas.sort((a, b) => a - b);
if (deltas.length > 0) {
  const q = (p: number) =>
    deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))]!;
  console.log(
    `폭 변화(단위) — 25% ${q(0.25).toFixed(1)} · 중앙 ${q(0.5).toFixed(1)} · ` +
      `75% ${q(0.75).toFixed(1)} · 95% ${q(0.95).toFixed(1)} · 최대 ${q(1).toFixed(1)}`,
  );
}
console.log(`**인쇄 크기 등급이 바뀐 그림 ${flipped.length}장**`);
for (const line of flipped) console.log(`   ${line}`);
