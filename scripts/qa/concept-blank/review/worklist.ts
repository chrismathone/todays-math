/**
 * 처분 원장 작업표 — 줄마다 «학생에게 무엇이 보이나»를 형식별로 찍고, 외부 검토의 의견 · 제안을 곁들인다.
 * 실행(저장소 뿌리):
 *   npx tsx scripts/qa/concept-blank/review/worklist.ts --part e3 --section "초3::1-1 덧셈과 뺄셈::1-1-1 …"   # 그 소단원의 남은 줄
 *   npx tsx scripts/qa/concept-blank/review/worklist.ts --part e3 --id e3-1-1-1-xc22                          # 문항 하나(처분과 상관없이)
 *   … --all       # 남은 줄만이 아니라 그 소단원의 원장 줄 전부(고친 뒤 다시 읽을 때)
 *
 * 🔴 형식마다 찍히는 칸이 다르다 — 고친 뒤 이 표를 다시 뽑아 형식 셋을 **각각** 읽는다:
 *   B 용어 → 뜻: 용어만.  C 문장 빈칸: 뜻 문장만(핵심어 자리는 빈칸 — 용어는 안 찍힌다).  D 개념 지도: 용어 + 예 물음만.
 *   A 완전 백지: 소단원 이름만(용어도 안 찍힌다).
 */
import {
  splitBlankSentence,
  visibleLength,
} from "../../../../src/contracts/conceptBlank.contract";
import {
  BANK_PARTS,
  CONCEPT_BLANK_BANK,
} from "../../../../src/lib/concept-blank/bank";
import { indexBank, readLedger, rowStatus } from "./ledger";
import { readPacket } from "./packet";

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
const ledger = readLedger(part);
if (!ledger) throw new Error(`원장이 없다: ${part}`);
const index = indexBank(CONCEPT_BLANK_BANK);
const packet = readPacket();
const fileOf = new Map<string, string>();
for (const [name, bank] of Object.entries(BANK_PARTS))
  for (const item of [
    ...bank.concepts,
    ...bank.ox,
    ...bank.apply,
    ...bank.figures,
  ])
    fileOf.set(
      item.id,
      `src/lib/concept-blank/bank/${name.replace("plus", "-plus")}.ts`,
    );

const blanked = (definition: string) =>
  splitBlankSentence(definition)
    .map((p) => (p.kind === "key" ? "□" : p.text))
    .join("");
const keys = (definition: string) =>
  splitBlankSentence(definition)
    .filter((p) => p.kind === "key")
    .map((p) => p.text)
    .join(" / ");
const short = (s: string | null | undefined, n = 260) =>
  !s ? "" : s.length > n ? `${s.slice(0, n)}…` : s;

let shown = 0;
for (const row of ledger.rows) {
  const entry = index.get(row.id);
  const status = rowStatus(row, index);
  if (id ? row.id !== id : !entry || entry.item.section !== section) continue;
  if (!id && !args.includes("--all") && status !== "남음") continue;
  shown += 1;
  console.log(
    `\n■ ${row.id}  [${row.queues.join(" · ")}]  ${status}${row.kept ? ` — ${row.kept}` : ""}`,
  );
  if (!entry) continue;
  console.log(`  파일  ${fileOf.get(row.id)}`);
  if (entry.type === "concepts") {
    const c = entry.item;
    console.log(
      `  ${c.level} · ${c.kind} · 용어 ${visibleLength(c.term)}/40자 · 뜻 ${visibleLength(c.definition)}/160자`,
    );
    console.log(`  B 학생  ${c.term}`);
    console.log(`  C 학생  ${blanked(c.definition)}`);
    console.log(`    굵은 답  ${keys(c.definition)}`);
    console.log(
      c.example
        ? `  D 학생  ${c.term}  ·  예: ${c.example.prompt}  →  ${c.example.answer}  (${visibleLength(c.example.prompt)}/80자)`
        : `  D 학생  ${c.term}  ·  예 칸 비어 있음(학생이 예를 든다)`,
    );
  } else if (entry.type === "ox") {
    const o = entry.item;
    console.log(`  ${o.level} · ○× ${visibleLength(o.statement)}/120자`);
    console.log(`  학생  ${o.statement}`);
    console.log(`  답  ${o.answer ? "○" : "×"} — ${o.why}`);
  } else if (entry.type === "apply") {
    const a = entry.item;
    console.log(`  ${a.level} · 적용 ${visibleLength(a.prompt)}/120자`);
    console.log(`  학생  ${a.prompt}`);
    console.log(`  답  ${a.answer}`);
  } else {
    const f = entry.item;
    console.log(`  ${f.level} · 그림  ${f.prompt}`);
    console.log(
      `  이름표 ${f.tags.map((t) => t.answer).join(" / ") || "없음"} · 줄 ${f.lines.map((l) => `${l.label}: ${l.answer}`).join(" / ")}`,
    );
  }
  for (const issue of packet?.get(row.id) ?? []) {
    console.log(
      `  검토 의견 (${issue.triage_bucket})  ${short(issue.teacher_comment)}`,
    );
    const p = issue.proposal;
    if (p.question || p.answer)
      console.log(`    제안  ${short(p.question)}  →  ${short(p.answer, 160)}`);
    if (p.explanation) console.log(`    해설  ${short(p.explanation, 160)}`);
    if (p.group_question_guidance)
      console.log(
        `    묶음 방향(이 문항의 글이 아니다)  ${short(p.group_question_guidance)}  →  ${short(p.group_answer_guidance, 160)}`,
      );
    const qa = issue.independent_qa;
    if (qa?.verdict)
      console.log(
        `    재검증(앞 제안보다 우선)  ${qa.verdict} — ${short(qa.independentReason, 200)}`,
      );
  }
}
console.log(
  `\n${shown}줄${packet ? "" : " · 외부 검토 묶음을 못 찾아 의견 칸이 비었다"}`,
);
