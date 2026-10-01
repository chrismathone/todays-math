/**
 * 개념 백지 은행 — 표기 검사(D-150 · 원장님 2026-09-30 «카텍스 사용할 것»).
 * 자는 `src/lib/concept-blank/notation.ts` 한 곳이다(은행 시험 `conceptBlankBank.test.ts` 가 같은 자로 0건을 잠근다).
 * 이 스크립트는 학년 파일별로 걸린 칸을 보여 준다 — 은행을 고칠 때 쓴다.
 *
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/check-notation.ts [--part m3] [--show 40]
 * 끝 코드: 걸린 것이 있으면 1.
 */
import { BANK_PARTS } from "../../../src/lib/concept-blank/bank";
import { bankNotationFaults } from "../../../src/lib/concept-blank/notation";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const onlyPart = arg("part");
const show = Number(arg("show") ?? 25);

let scanned = 0;
const hits: {
  part: string;
  id: string;
  field: string;
  rule: string;
  what: string;
}[] = [];
for (const [part, bank] of Object.entries(BANK_PARTS)) {
  if (onlyPart && part !== onlyPart) continue;
  scanned +=
    bank.concepts.length +
    bank.ox.length +
    bank.apply.length +
    bank.figures.length;
  for (const f of bankNotationFaults(bank)) hits.push({ part, ...f });
}

const byPartRule = new Map<string, number>();
for (const h of hits) {
  const k = `${h.part} · ${h.rule}`;
  byPartRule.set(k, (byPartRule.get(k) ?? 0) + 1);
}
console.log(`은행 항목 ${scanned}개 검사`);
for (const [k, n] of [...byPartRule].sort()) console.log(`  ${k}: ${n}`);
for (const h of hits.slice(0, show))
  console.log(`표기 ${h.part} ${h.id} (${h.field}) [${h.rule}] «${h.what}»`);
if (hits.length > show) console.log(`… 그 밖 ${hits.length - show}건`);
console.log(hits.length ? `표기 ${hits.length}건` : "표기 0건");
process.exit(hits.length ? 1 : 0);
