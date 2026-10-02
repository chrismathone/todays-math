/**
 * «개념을 묻는다» 작업표 — 소단원 하나에서 줄에 선 문항과, 겹치지 않게 봐야 하는 그 소단원의 다른 문항을 찍는다.
 * 실행(저장소 뿌리):
 *   npx tsx scripts/qa/concept-blank/havruta/worklist.ts --part e3 --section "초3::1-4 곱셈::1-4-3 …"   # 남은 줄 + 그 소단원의 개념 전부
 *   … --all                                   # 남은 줄만이 아니라 원장 줄 전부(고친 뒤 다시 읽을 때)
 *   … --part e3 --id e3-1-4-3-xa1             # 문항 하나
 * 🔴 다시 쓰기 전에 «이 소단원에 이미 있는 개념»을 읽는다 — 같은 뜻을 말만 바꿔 또 쓰면 은행 시험(겹침)이 막거나, 막지 못해도 학생에게 같은 물음이 두 번 간다.
 */
import {
  splitBlankSentence,
  visibleLength,
} from "../../../../src/contracts/conceptBlank.contract";
import {
  BANK_PARTS,
  CONCEPT_BLANK_BANK,
} from "../../../../src/lib/concept-blank/bank";
import { indexBank } from "../review/ledger";
import { havrutaStatus, readHavruta } from "./ledger";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const part = arg("--part");
const section = arg("--section");
const id = arg("--id");
if (!part || (!section && !id))
  throw new Error(
    "--part <학년> 과 --section <소단원 열쇠> 또는 --id <문항> 을 준다",
  );
const ledger = readHavruta(part);
if (!ledger) throw new Error(`원장이 없다: ${part}`);
const index = indexBank(CONCEPT_BLANK_BANK);
const fileOf = new Map<string, string>();
for (const [name, bank] of Object.entries(BANK_PARTS))
  for (const item of [...bank.concepts, ...bank.ox, ...bank.apply])
    fileOf.set(
      item.id,
      `src/lib/concept-blank/bank/${name.replace("plus", "-plus")}.ts`,
    );
const keys = (definition: string) =>
  splitBlankSentence(definition)
    .filter((p) => p.kind === "key")
    .map((p) => p.text)
    .join(" / ");
const queued = new Set(ledger.rows.map((r) => r.id));

if (section) {
  // 이 소단원에 이미 있는 것 — 줄에 안 선 개념 · ○× · 적용. 새 글이 이것과 겹치면 안 된다.
  const bank = CONCEPT_BLANK_BANK;
  console.log(`\n── 이 소단원에 이미 있는 개념(줄에 안 선 것) ──`);
  for (const c of bank.concepts)
    if (c.section === section && !queued.has(c.id))
      console.log(
        `  ${c.id} [${c.level}·${c.kind}] ${c.term} | ${c.definition}`,
      );
  const count = (list: readonly { section: string; level: string }[]) =>
    ["하", "중", "상"]
      .map(
        (l) =>
          `${l} ${list.filter((x) => x.section === section && x.level === l).length}`,
      )
      .join(" · ");
  console.log(
    `── 지금 재고: 개념 ${count(bank.concepts)} / ○× ${count(bank.ox)} / 적용 ${count(bank.apply)} ──`,
  );
}

let shown = 0;
for (const row of ledger.rows) {
  const entry = index.get(row.id);
  const status = havrutaStatus(row, index);
  if (id ? row.id !== id : row.at.section !== section) continue;
  if (!id && !args.includes("--all") && status !== "남음") continue;
  shown += 1;
  const note =
    row.kept !== undefined
      ? ` — 둠: ${row.kept}`
      : row.gone
        ? ` — 뺌: ${row.gone}`
        : "";
  console.log(`\n■ ${row.id}  [${row.queue}]  ${status}${note}`);
  if (!entry) continue;
  console.log(`  파일  ${fileOf.get(row.id)}`);
  if (entry.type === "concepts") {
    const c = entry.item;
    console.log(
      `  ${c.level} · ${c.kind} · 용어 ${visibleLength(c.term)}/40자 · 뜻 ${visibleLength(c.definition)}/160자${c.givenCase ? " · 사례 표지" : ""}`,
    );
    console.log(`  용어  ${c.term}`);
    console.log(`  뜻    ${c.definition}`);
    console.log(`    굵은 답  ${keys(c.definition)}`);
    if (c.example)
      console.log(`  예    ${c.example.prompt}  →  ${c.example.answer}`);
  } else if (entry.type === "ox") {
    const o = entry.item;
    console.log(`  ${o.level} · ○× ${visibleLength(o.statement)}/120자`);
    console.log(`  문장  ${o.statement}`);
    console.log(`  답    ${o.answer ? "○" : "×"} — ${o.why}`);
  } else if (entry.type === "apply") {
    const a = entry.item;
    console.log(
      `  ${a.level} · 적용 ${visibleLength(a.prompt)}/120자 · 답 ${visibleLength(a.answer)}/80자`,
    );
    console.log(`  물음  ${a.prompt}`);
    console.log(`  답    ${a.answer}`);
  }
}
console.log(`\n${shown}줄`);
