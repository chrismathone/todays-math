/**
 * 처분 원장을 세운다(리드가 한 번) — 검토 시점 은행(커밋 13e9c330a 의 떨군 JSON)과 외부 검토 묶음에서 줄을 뽑는다.
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/review/seed.ts <bank-13e9c330a.json>
 *   떨군 JSON 은 그 커밋에서 `CONCEPT_BLANK_BANK` 를 id → 칸으로 적은 것(리드의 `dump-bank.ts` — 저장소 밖).
 * 🔴 이미 있는 원장 파일은 덮지 않는다(트랙이 적은 `kept` 가 사라진다) — 다시 세우려면 파일을 지우고 돌린다.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { BANK_PARTS } from "../../../../src/lib/concept-blank/bank";
import type { ConceptBlankBank } from "../../../../src/contracts/conceptBlank.contract";
import {
  type BankItem,
  hasNumberKeyword,
  itemText,
  keywordsInsideTerm,
  LEDGER_DIR,
  type Ledger,
  type LedgerRow,
  ledgerPath,
  REVIEW_GRADES,
  shaOf,
  writeLedger,
} from "./ledger";
import { readPacket } from "./packet";

const baselinePath = process.argv[2];
if (!baselinePath) throw new Error("검토 시점 은행 JSON 의 자리를 준다");
type Dumped = Record<string, Record<string, unknown> & { kind: string }>;
const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Dumped;
const packet = readPacket();
if (!packet)
  throw new Error("외부 검토 묶음이 없다 — packet.ts 의 자리를 본다");

/** 떨군 JSON 한 줄 → 은행 문항 꼴(지문을 내는 칸만 있으면 된다). */
function baselineEntry(id: string): BankItem | null {
  const x = baseline[id];
  if (!x) return null;
  const item = { ...x, id } as never;
  if (x.kind === "개념") {
    const c = { ...x, id, example: x.example ?? undefined } as never;
    return { type: "concepts", item: c };
  }
  if (x.kind === "○×") return { type: "ox", item };
  if (x.kind === "적용") return { type: "apply", item };
  return { type: "figures", item: { ...x, id, viewBox: "" } as never };
}

/** 초3 처음 은행의 예는 그 소단원 적용 문항을 옮긴 것이다 — 전부 다시 쓴다(합의 안건 10). */
const e3Base: ConceptBlankBank = BANK_PARTS.e3!;
const e3Rewrite = new Set(
  e3Base.concepts.filter((c) => c.example).map((c) => c.id),
);

/** 인쇄 검토가 따로 짚은 그림 — 시간 띠의 길이비가 거꾸로 · 좌우를 바꾼 답도 맞는 포함 관계 그림. */
const PRINT_REVIEW = ["e3-1-5-5-f1", "m2-05-08-f3"];

mkdirSync(LEDGER_DIR, { recursive: true });
const LEVEL_NOTE = "난이도 다시 매기기는 이번 범위 밖(합의 안건 6) — 기록만";

const figures: LedgerRow[] = [];
for (const grade of REVIEW_GRADES) {
  const rows: LedgerRow[] = [];
  for (const [id, x] of Object.entries(baseline)) {
    if (!id.startsWith(`${grade}-`)) continue;
    const entry = baselineEntry(id)!;
    const queues: string[] = [];
    const issues = packet.get(id) ?? [];
    const levelOnly =
      issues.length > 0 &&
      issues.every((i) => /난도가 전부 상/.test(i.teacher_comment));
    for (const bucket of new Set(issues.map((i) => i.triage_bucket)))
      queues.push(levelOnly ? "packet:level" : `packet:${bucket}`);
    if (x.kind === "개념") {
      const definition = String(x.definition);
      if (hasNumberKeyword(definition)) queues.push("num");
      if (keywordsInsideTerm(String(x.term), definition)) queues.push("copy");
      if (x.example) queues.push(e3Rewrite.has(id) ? "rewrite" : "example");
    }
    if (x.kind === "그림") {
      // 흑백 프린터에서 «금색»은 회색이다 — 색 말고 단서가 없는 그림만 고친다(합의 안건 8).
      if (/금색/.test(String(x.prompt) + JSON.stringify(x.lines)))
        queues.push("gold");
      if (PRINT_REVIEW.includes(id)) queues.push("print");
    }
    if (!queues.length) continue;
    // 그림은 리드 몫이다(트랙이 그림 SVG 를 눈으로 못 본다) — 따로 둔 원장으로.
    // 지문은 지금 은행의 글로 낸다(떨군 JSON 에는 viewBox 가 없다).
    if (x.kind === "그림") {
      const now = [...Object.values(BANK_PARTS)]
        .flatMap((b) => b.figures)
        .find((f) => f.id === id)!;
      figures.push({
        id,
        queues,
        sha: shaOf(itemText({ type: "figures", item: now })),
      });
      continue;
    }
    rows.push({
      id,
      queues,
      sha: shaOf(itemText(entry)),
      ...(levelOnly ? { kept: LEVEL_NOTE } : {}),
    });
  }
  const ledger: Ledger = { name: grade, complete: false, rows };
  if (existsSync(ledgerPath(grade)))
    console.log(`${grade}: 이미 있다 — 그대로 둔다`);
  else {
    writeLedger(ledger);
    console.log(`${grade}: ${rows.length}줄`);
  }
}
if (existsSync(ledgerPath("figures")))
  console.log("figures: 이미 있다 — 그대로 둔다");
else {
  writeLedger({ name: "figures", complete: false, rows: figures });
  console.log(`figures: ${figures.length}줄`);
}
