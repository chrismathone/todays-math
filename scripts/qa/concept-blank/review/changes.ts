/**
 * 고친 문항의 «전 → 후»를 찍는다 — 리드의 표본 검수 · 독립 검산(다른 모델) · 완료 보고에 쓴다.
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/review/changes.ts <bank-13e9c330a.json> [--part e3] [--out 파일.md]
 *   떨군 JSON 은 검토 시점 은행(`seed.ts` 가 쓴 것과 같은 파일 — 저장소 밖 `D:\tmp\concept-blank-review\`).
 * 🔴 «고침»은 글이 달라졌다는 뜻일 뿐이다 — 이 목록을 읽고 다시 계산해야 옳은지 안다(1단계 110문항에서 다른 모델이 12건을 짚었다).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CONCEPT_BLANK_BANK } from "../../../../src/lib/concept-blank/bank";
import { indexBank } from "./ledger";

const args = process.argv.slice(2);
const baselinePath = args[0];
if (!baselinePath || baselinePath.startsWith("--"))
  throw new Error("검토 시점 은행 JSON 의 자리를 첫 인자로 준다");
const arg = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const part = arg("--part");
const out = arg("--out");

type Fields = Record<string, unknown>;
const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Record<
  string,
  Fields & { kind: string; level: string }
>;
const index = indexBank(CONCEPT_BLANK_BANK);

const show = (value: unknown): string =>
  value === null || value === undefined
    ? "(없음)"
    : typeof value === "object"
      ? "prompt" in (value as Fields)
        ? `${(value as Fields).prompt} → ${(value as Fields).answer}`
        : JSON.stringify(value)
      : String(value);

/** 지금 문항을 떨군 JSON 과 같은 칸 이름으로. */
function nowFields(id: string): Fields | null {
  const entry = index.get(id);
  if (!entry) return null;
  switch (entry.type) {
    case "concepts": {
      const c = entry.item;
      return {
        term: c.term,
        definition: c.definition,
        example: c.example ?? null,
        ...(c.givenCase ? { givenCase: true } : {}),
      };
    }
    case "ox":
      return {
        statement: entry.item.statement,
        answer: entry.item.answer,
        why: entry.item.why,
      };
    case "apply":
      return { prompt: entry.item.prompt, answer: entry.item.answer };
    case "figures":
      return {
        prompt: entry.item.prompt,
        svg: entry.item.svg,
        tags: entry.item.tags,
        lines: entry.item.lines,
      };
  }
}

const blocks: string[] = [];
let retired = 0;
for (const [id, before] of Object.entries(baseline)) {
  if (part && !id.startsWith(`${part}-`)) continue;
  const now = nowFields(id);
  if (!now) {
    retired += 1;
    blocks.push(`### ${id} [${before.kind} ${before.level}] — 뺌`);
    continue;
  }
  const lines: string[] = [];
  for (const key of new Set([...Object.keys(now), ...Object.keys(before)])) {
    if (key === "kind" || key === "level") continue;
    const a = before[key] ?? (key === "givenCase" ? false : null);
    const b = now[key] ?? (key === "givenCase" ? false : null);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (key === "givenCase")
      lines.push("- 사례 표지를 달았다(A 채점표에서 뺀다)");
    else if (key === "svg") lines.push("- 그림(SVG)을 고쳤다");
    else lines.push(`- ${key} 전: ${show(a)}`, `- ${key} 후: ${show(b)}`);
  }
  if (!lines.length) continue;
  const context =
    before.kind === "개념" && !lines.some((l) => l.startsWith("- term"))
      ? [`- (용어 «${before.term}»)`]
      : [];
  blocks.push(
    [`### ${id} [${before.kind} ${before.level}]`, ...context, ...lines].join(
      "\n",
    ),
  );
}
// 은행에 새로 생긴 문항(뺀 자리 대신 쓴 것)
for (const [id, entry] of index) {
  if (part && !id.startsWith(`${part}-`)) continue;
  if (id in baseline) continue;
  const now = nowFields(id)!;
  blocks.push(
    [
      `### ${id} [새 문항 · ${entry.item.level}]`,
      ...Object.entries(now).map(([k, v]) => `- ${k}: ${show(v)}`),
    ].join("\n"),
  );
}
const text = `${blocks.join("\n\n")}\n`;
if (out) writeFileSync(out, text);
else process.stdout.write(text);
console.error(
  `바뀐 문항 ${blocks.length}${retired ? ` · 뺀 것 ${retired}` : ""}${part ? ` (${part})` : ""}`,
);
