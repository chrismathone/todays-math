/**
 * 개념 백지 은행 — 교재 원문 누출 검사(D-150). 은행 글(뜻 · 예 · ○× · 적용 · 그림 줄)을 공백 빼고 N자(기본 12 — 보충 카드의 «12글자 창 0» 기준) 창으로
 * 잘라, 저장소 밖 교재 용어 JSON(큐브수학 개념 3-1~6-2 · 개념원리 중학 1-1~3-2)의 원문 문장 창과 겹치면 누출로 센다.
 * 허용: 창이 용어 이름 · 차례(장 · 소단원 이름) 안에 통째로 들어 있으면 세지 않는다(이름은 옮겨도 되고 문장은 안 된다).
 *
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/check-leak.ts [--part e56] [--n 12] [--fixture]
 * 교재 JSON 폴더: C:\Creative\testautocreator-data\I-개념용어 (없으면 «못 셈»으로 끝난다 — 0 이 아니다)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BANK_PARTS } from "../../../src/lib/concept-blank/bank";
import { FIXTURE_BANK } from "../../../src/lib/concept-blank/fixture";

const SRC = "C:/Creative/testautocreator-data/I-개념용어";
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const N = Number(arg("n") ?? 12);
const onlyPart = arg("part");

if (!existsSync(SRC)) {
  console.error(
    `교재 JSON 폴더가 없다: ${SRC} — 누출을 셀 수 없다(0 이 아니라 «못 셈»).`,
  );
  process.exit(2);
}

const squash = (s: string) => s.replace(/\s+/g, "").replace(/\$[^$]*\$/g, "");
const grams = new Set<string>();
const allowed: string[] = [];
for (const f of readdirSync(SRC).filter((x) =>
  /^(cube|gaenyeom)-\d-\d\.json$/.test(x),
)) {
  const j = JSON.parse(readFileSync(join(SRC, f), "utf8"));
  for (const t of j.terms ?? []) {
    const s = squash(String(t.sentence ?? ""));
    for (let i = 0; i + N <= s.length; i++) grams.add(s.slice(i, i + N));
    allowed.push(
      squash(String(t.term ?? "")),
      squash(String(t.section ?? "")),
      squash(String(t.chapter ?? "")),
    );
    for (const a of t.aliases ?? []) allowed.push(squash(String(a)));
  }
  for (const c of j.toc ?? []) {
    allowed.push(squash(String(c.chapter ?? "")));
    for (const s of c.sections ?? []) allowed.push(squash(String(s)));
  }
}
if (grams.size === 0) {
  console.error("교재 문장 창이 0 — 폴더 모양이 바뀌었다(«못 셈»).");
  process.exit(2);
}

type Hit = { part: string; id: string; field: string; gram: string };
const hits: Hit[] = [];
const scan = (part: string, id: string, field: string, text: string) => {
  const s = squash(text.replace(/[{}]/g, ""));
  for (let i = 0; i + N <= s.length; i++) {
    const g = s.slice(i, i + N);
    if (grams.has(g) && !allowed.some((a) => a.includes(g))) {
      hits.push({ part, id, field, gram: g });
      return;
    }
  }
};

let scanned = 0;
const parts = process.argv.includes("--fixture")
  ? { ...BANK_PARTS, fixture: FIXTURE_BANK }
  : BANK_PARTS;
for (const [part, bank] of Object.entries(parts)) {
  if (onlyPart && part !== onlyPart) continue;
  for (const c of bank.concepts) {
    scan(part, c.id, "definition", c.definition);
    if (c.example)
      scan(part, c.id, "example", `${c.example.prompt} ${c.example.answer}`);
    scanned++;
  }
  for (const o of bank.ox) {
    scan(part, o.id, "statement", o.statement);
    scan(part, o.id, "why", o.why);
    scanned++;
  }
  for (const a of bank.apply) {
    scan(part, a.id, "prompt", a.prompt);
    scanned++;
  }
  for (const f of bank.figures) {
    for (const l of f.lines) scan(part, f.id, `line:${l.label}`, l.answer);
    scanned++;
  }
}

console.log(
  `교재 창 ${grams.size}개 · 은행 항목 ${scanned}개 검사 · 창 길이 ${N}`,
);
for (const h of hits)
  console.log(`누출 ${h.part} ${h.id} (${h.field}) «${h.gram}»`);
console.log(hits.length ? `누출 ${hits.length}건` : "누출 0건");
process.exit(hits.length ? 1 : 0);
