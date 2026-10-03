/**
 * «개념을 묻는다» 원장에 «둠» · «뺌»을 적는다 — 글을 고친 줄은 적을 것이 없다(진행표가 글에서 읽는다).
 * 실행(저장소 뿌리):
 *   npx tsx scripts/qa/concept-blank/havruta/keep.ts --part e4 --id e4-1-2-1-xa3 --note "수 자체가 개념 — 직각의 크기"
 *       값으로 답하는 적용(`calc`)을 둔다 — **수 자체가 개념**일 때뿐이다(직각 $90^\circ$ · 단위 환산). 계산으로 나오는 값은
 *       개념으로 정해지더라도 근거를 붙여 말로 쓴다(합의문 안건 3 — «값이 개념으로 정해진다»는 예외는 구멍이었다).
 *   npx tsx scripts/qa/concept-blank/havruta/keep.ts --part e6 --section "초6::2-5 …::2-5-1 …" --screen
 *       그 소단원의 수가 든 ○×(`num`) 가운데 남은 줄을 «봤다»로 닫는다 — 작업표를 뽑아 **다 읽은 뒤에만**
 *       (참 · 거짓을 가르는 것이 계산 결과인 문장은 먼저 다시 쓴다).
 *   npx tsx scripts/qa/concept-blank/havruta/keep.ts --part e3 --gone --id e3-1-4-3-xc26 --note "같은 상황 → 곱셈식 진술이 xc15 에 있다 · 쓸 개념이 더 없다"
 *       은행에서 뺀(`RETIRED`) 문항의 까닭을 적는다 — 먼저 은행 파일에서 그 자리를 `RETIRED` 로 바꾼다.
 *   npx tsx scripts/qa/concept-blank/havruta/keep.ts --part e3 --clear --id e3-1-4-3-xa29
 *       적어 둔 «둠» · «뺌»을 지운다(뺐던 문항을 되살렸을 때 — 은행에 있는 문항에 뺀 까닭이 남으면 원장의 흠이다).
 * 🔴 사례 카드(`case`)는 둘 수 없다 — 보편 진술로 다시 쓰거나 뺀다.
 */
import { CONCEPT_BLANK_BANK } from "../../../../src/lib/concept-blank/bank";
import { indexBank } from "../review/ledger";
import { havrutaStatus, readHavruta, writeHavruta } from "./ledger";

const args = process.argv.slice(2);
const all = (name: string) =>
  args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]!] : []));
const part = all("--part")[0];
const ids = new Set(all("--id"));
const section = all("--section")[0];
const note = (all("--note")[0] ?? "").trim();
const gone = args.includes("--gone");
if (!part) throw new Error("--part <학년> 을 준다");
const ledger = readHavruta(part);
if (!ledger) throw new Error(`원장이 없다: ${part}`);
const index = indexBank(CONCEPT_BLANK_BANK);

let done = 0;
const refused: string[] = [];
for (const row of ledger.rows) {
  const status = havrutaStatus(row, index);
  if (args.includes("--clear")) {
    // 적어 둔 «둠» · «뺌»을 지운다(뺐던 문항을 되살렸거나, 두기로 한 것을 다시 쓰기로 했을 때).
    if (ids.has(row.id) && (row.kept !== undefined || row.gone !== undefined)) {
      delete row.kept;
      delete row.gone;
      done += 1;
    }
    continue;
  }
  if (gone) {
    if (!ids.has(row.id)) continue;
    if (status !== "뺌")
      refused.push(`${row.id}: 아직 은행에 있다 — 먼저 RETIRED 로 바꾼다`);
    else if (note.length < 4)
      refused.push(`${row.id}: --note 로 뺀 까닭을 적는다`);
    else {
      row.gone = note;
      done += 1;
    }
    continue;
  }
  if (status !== "남음") {
    if (ids.has(row.id)) refused.push(`${row.id}: 이미 ${status}`);
    continue;
  }
  if (ids.has(row.id)) {
    if (row.queue === "case") refused.push(`${row.id}: 사례 카드는 둘 수 없다`);
    else if (row.queue === "calc" && note.length < 4)
      refused.push(
        `${row.id}: 값 답은 «수 자체가 개념»일 때만 둔다 — --note 로 그 까닭을 적는다`,
      );
    else {
      row.kept = note;
      done += 1;
    }
  } else if (
    section &&
    args.includes("--screen") &&
    row.at.section === section &&
    row.queue === "num"
  ) {
    row.kept = note;
    done += 1;
  }
}
for (const id of ids)
  if (!ledger.rows.some((r) => r.id === id))
    refused.push(`${id}: 원장에 없는 문항`);
if (done) writeHavruta(ledger);
console.log(
  `${args.includes("--clear") ? "지움" : gone ? "«뺌»" : "«둠»"} ${done}줄${refused.length ? ` · 못 닫은 것 ${refused.length} — ${refused.join(" / ")}` : ""}`,
);
