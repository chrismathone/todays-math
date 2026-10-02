/**
 * 처분 원장 진행표 — 줄(queue)마다 고침 · 둠 · 뺌 · 남음.
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/review/progress.ts [--part e3] [--sections]
 *   `--sections` 는 그 학년의 소단원마다 남은 줄 수를 찍는다(다음에 할 소단원을 고른다).
 */
import { CONCEPT_BLANK_BANK } from "../../../../src/lib/concept-blank/bank";
import {
  indexBank,
  ledgerFaults,
  readLedger,
  REVIEW_GRADES,
  rowStatus,
  type RowStatus,
} from "./ledger";

const args = process.argv.slice(2);
const at = args.indexOf("--part");
const only = at >= 0 ? args[at + 1] : undefined;
const index = indexBank(CONCEPT_BLANK_BANK);

for (const name of [...REVIEW_GRADES, "figures"]) {
  if (only && only !== name) continue;
  const ledger = readLedger(name);
  if (!ledger) continue;
  const table = new Map<string, Record<RowStatus, number>>();
  const bump = (queue: string, status: RowStatus) => {
    const row = table.get(queue) ?? { 고침: 0, 둠: 0, 뺌: 0, 남음: 0 };
    row[status] += 1;
    table.set(queue, row);
  };
  const bySection = new Map<string, number>();
  for (const row of ledger.rows) {
    const status = rowStatus(row, index);
    bump("(문항)", status);
    for (const queue of row.queues) bump(queue, status);
    if (status === "남음") {
      const section = index.get(row.id)!.item.section;
      bySection.set(section, (bySection.get(section) ?? 0) + 1);
    }
  }
  console.log(
    `\n${name} — ${ledger.rows.length}줄${ledger.complete ? " · 끝" : ""}`,
  );
  for (const [queue, n] of [...table].sort())
    console.log(
      `  ${queue.padEnd(34)} 고침 ${String(n.고침).padStart(4)} · 둠 ${String(n.둠).padStart(4)} · 뺌 ${String(n.뺌).padStart(3)} · 남음 ${String(n.남음).padStart(4)}`,
    );
  if (args.includes("--sections"))
    for (const [section, n] of bySection)
      console.log(`  남음 ${String(n).padStart(3)}  ${section}`);
  const faults = ledgerFaults(ledger, index);
  if (faults.length)
    console.log(
      `  🔴 원장의 흠 ${faults.length} — ${faults.slice(0, 5).join(" / ")}`,
    );
}
