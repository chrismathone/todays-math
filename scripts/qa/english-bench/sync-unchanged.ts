/**
 * 오늘의 영어 모델 벤치 — 쪼기 루프에서 **초안이 그대로인 세트**의 채점을 앞 회차에서 옮겨 온다(다시 부르지 않는다).
 *   npx tsx scripts/qa/english-bench/sync-unchanged.ts --from <v2 폴더> --out <v2loop 폴더>
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import type { GenRecord } from "./generate";
import { flag } from "./util";

const from = flag("--from")!;
const out = flag("--out")!;
mkdirSync(path.join(out, "judge"), { recursive: true });
let copied = 0;
for (const name of readdirSync(path.join(out, "gen"))) {
  const before = path.join(from, "gen", name);
  if (!existsSync(before)) continue;
  const a = JSON.parse(readFileSync(before, "utf8")) as GenRecord;
  const b = JSON.parse(
    readFileSync(path.join(out, "gen", name), "utf8"),
  ) as GenRecord;
  if (JSON.stringify(a.draft) !== JSON.stringify(b.draft)) continue;
  const base = path.basename(name, ".json");
  for (const judged of readdirSync(path.join(from, "judge")).filter((f) =>
    f.startsWith(`${base}__`),
  )) {
    const target = path.join(out, "judge", judged);
    if (existsSync(target)) continue;
    copyFileSync(path.join(from, "judge", judged), target);
    copied += 1;
  }
}
console.log(`옮긴 채점 ${copied}`);
