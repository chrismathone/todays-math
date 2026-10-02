/**
 * «개념을 묻는다» 처분 원장을 세운다(리드가 한 번) — 지금 은행에서 줄에 서는 문항을 뽑는다(`queueOf`).
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/havruta/seed.ts [--dump <은행 JSON 을 떨굴 자리>]
 *   `--dump` 는 줄을 세운 시점의 글을 id → 칸으로 저장소 **밖**에 떨군다(고친 문항의 전 → 후를 뽑을 때 쓴다 — `changes.ts`).
 * 🔴 이미 있는 원장 파일은 덮지 않는다(트랙이 적은 `kept` · `gone` 이 사라진다) — 다시 세우려면 파일을 지우고 돌린다.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { CONCEPT_BLANK_BANK } from "../../../../src/lib/concept-blank/bank";
import { indexBank, itemText, shaOf } from "../review/ledger";
import {
  gradeOfId,
  HAVRUTA_DIR,
  HAVRUTA_GRADES,
  havrutaPath,
  type HavrutaRow,
  queueOf,
  writeHavruta,
} from "./ledger";

const args = process.argv.slice(2);
const dumpAt = args.indexOf("--dump");
const index = indexBank(CONCEPT_BLANK_BANK);

mkdirSync(HAVRUTA_DIR, { recursive: true });
const rows = new Map<string, HavrutaRow[]>(HAVRUTA_GRADES.map((g) => [g, []]));
for (const [id, entry] of index) {
  const queue = queueOf(entry);
  if (!queue || entry.type === "figures") continue;
  rows.get(gradeOfId(id))?.push({
    id,
    queue,
    sha: shaOf(itemText(entry)),
    at: {
      section: entry.item.section,
      type: entry.type,
      level: entry.item.level,
    },
  });
}
for (const grade of HAVRUTA_GRADES) {
  const list = rows.get(grade)!;
  if (existsSync(havrutaPath(grade))) {
    console.log(`${grade}: 이미 있다 — 그대로 둔다`);
    continue;
  }
  writeHavruta({ name: grade, complete: false, rows: list });
  const n = (q: string) => list.filter((r) => r.queue === q).length;
  console.log(
    `${grade}: ${list.length}줄 — case ${n("case")} · calc ${n("calc")} · num ${n("num")}`,
  );
}

if (dumpAt >= 0 && args[dumpAt + 1]) {
  const dumped: Record<string, unknown> = {};
  for (const [id, entry] of index)
    if (entry.type !== "figures")
      dumped[id] = { type: entry.type, ...entry.item };
  writeFileSync(args[dumpAt + 1]!, JSON.stringify(dumped));
  console.log(
    `은행 ${Object.keys(dumped).length}문항을 떨궜다 → ${args[dumpAt + 1]}`,
  );
}
