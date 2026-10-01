/**
 * 칸을 건넌 같은 글 검사(은행 3차 — 트랙 cb-ten-e5 가 찾았다) — 한 소단원 안에서 ○× 문장이 어느 뜻 문장과
 * 글자 그대로 같으면(핵심어 괄호 · 빈칸 · 끝 마침표는 빼고 잰다) «용어 → 뜻» 지면에서 ○× 줄이 뜻의 답을 그대로 보여 준다.
 * 은행 시험이 0 을 잠근다. 이 스크립트는 고칠 자리를 찍는다.
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/check-cross.ts [--part e6plus]
 *   `--part` 를 주면 그 파일의 문항이 한쪽에 든 짝만 찍는다(짝의 다른 쪽은 은행 전체에서 찾는다).
 */
import { BANK_PARTS } from "../../../src/lib/concept-blank/bank";

const args = process.argv.slice(2);
const at = args.indexOf("--part");
const only = at >= 0 ? args[at + 1] : undefined;

/** 비교 꼴 — 핵심어 괄호 · 빈칸 · 끝 마침표를 뺀다. */
const crossKey = (text: string) =>
  text.replace(/[{}\s]/g, "").replace(/[.。]$/, "");

const definitions = new Map<string, { id: string; part: string }>();
for (const [part, bank] of Object.entries(BANK_PARTS))
  for (const c of bank.concepts)
    definitions.set(`${c.section}|${crossKey(c.definition)}`, {
      id: c.id,
      part,
    });

let hits = 0;
for (const [part, bank] of Object.entries(BANK_PARTS))
  for (const o of bank.ox) {
    const d = definitions.get(`${o.section}|${crossKey(o.statement)}`);
    if (!d || (only && part !== only && d.part !== only)) continue;
    hits += 1;
    console.log(
      `같은 글 뜻 ${d.id}(${d.part}) = ○× ${o.id}(${part}) · ${o.answer ? "참" : "거짓"} — «${o.statement}»`,
    );
  }
console.log(`\n칸을 건넌 같은 글 ${hits}건${only ? ` (${only})` : ""}`);
