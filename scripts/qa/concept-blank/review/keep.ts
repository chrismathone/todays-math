/**
 * 처분 원장에 «둠»을 적는다 — 글을 고친 줄은 적을 것이 없다(진행표가 글에서 읽는다).
 * 실행(저장소 뿌리):
 *   npx tsx scripts/qa/concept-blank/review/keep.ts --part e3 --id e3-1-1-1-xc22 --id e3-1-1-1-xo3 --note "교과서 관행 — 문항의 수 안에서 반례가 없다"
 *   npx tsx scripts/qa/concept-blank/review/keep.ts --part e3 --section "초3::1-1 덧셈과 뺄셈::1-1-1 …" --screen
 *     그 소단원에서 «훑는 줄»(num · copy · example)뿐인 남은 줄을 «봤다»로 닫는다 — 작업표를 뽑아 **다 읽은 뒤에만**.
 * 🔴 외부 검토가 의견을 단 문항(`packet:*`)은 `--screen` 으로 안 닫힌다 — 문항마다 까닭을 적는다.
 */
import { CONCEPT_BLANK_BANK } from "../../../../src/lib/concept-blank/bank";
import {
  indexBank,
  isScreenOnly,
  readLedger,
  rowStatus,
  writeLedger,
} from "./ledger";

const args = process.argv.slice(2);
const all = (name: string) =>
  args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]!] : []));
const part = all("--part")[0];
const ids = new Set(all("--id"));
const section = all("--section")[0];
const note = all("--note")[0] ?? "";
if (!part) throw new Error("--part <학년> 을 준다");
const ledger = readLedger(part);
if (!ledger) throw new Error(`원장이 없다: ${part}`);
const index = indexBank(CONCEPT_BLANK_BANK);

let kept = 0;
const refused: string[] = [];
for (const row of ledger.rows) {
  const entry = index.get(row.id);
  if (rowStatus(row, index) !== "남음") {
    if (ids.has(row.id))
      refused.push(`${row.id}: 이미 ${rowStatus(row, index)}`);
    continue;
  }
  if (ids.has(row.id)) {
    if (row.queues.includes("rewrite"))
      refused.push(`${row.id}: 다시 써야 하는 줄이다`);
    else if (!isScreenOnly(row) && note.trim().length < 4)
      refused.push(`${row.id}: 외부 검토 문항은 --note 로 까닭을 적는다`);
    else {
      row.kept = note.trim();
      kept += 1;
    }
  } else if (
    section &&
    args.includes("--screen") &&
    entry?.item.section === section &&
    isScreenOnly(row)
  ) {
    row.kept = note.trim();
    kept += 1;
  }
}
for (const id of ids)
  if (!ledger.rows.some((r) => r.id === id))
    refused.push(`${id}: 원장에 없는 문항`);
if (kept) writeLedger(ledger);
console.log(
  `«둠» ${kept}줄${refused.length ? ` · 못 닫은 것 ${refused.length} — ${refused.join(" / ")}` : ""}`,
);
