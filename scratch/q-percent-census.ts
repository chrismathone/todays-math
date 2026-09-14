// 공유 DB 전체에서 «수식 안 맨 %» 가 든 행 — 지면에서 % 가 사라지는 행. 읽기만 한다.
import { db } from "@/lib/db";
const B = String.fromCharCode(92);
function bare(t: string | null): number {
  if (!t) return 0;
  const segs = t.split("$");
  let n = 0;
  for (let i = 1; i < segs.length; i += 2) {
    const s = segs[i];
    n += (s.match(/%/g) ?? []).length - (s.split(B + "%").length - 1);
  }
  return n;
}
async function main() {
  const total = await db.problem.count();
  const cand = await db.problem.count({
    where: {
      OR: [{ content: { contains: "%" } }, { solution: { contains: "%" } }],
    },
  });
  console.log(
    `전체 ${total}행 · contains("%") ${cand}행` +
      (cand > total * 0.5 ? "  ⚠ 와일드카드로 읽혔다 — JS 로 다시 센다" : ""),
  );
  const rows = await db.problem.findMany({
    where: {
      OR: [{ content: { contains: "%" } }, { solution: { contains: "%" } }],
    },
    select: {
      id: true,
      source: true,
      examId: true,
      content: true,
      solution: true,
      unit: { select: { grade: true, section: true } },
    },
    take: 20000,
  });
  const hit = rows.filter((r) => bare(r.content) + bare(r.solution) > 0);
  const by = new Map<string, number>();
  for (const r of hit) {
    const k = `${r.source}${r.examId ? "(기출)" : ""} · ${r.unit?.grade ?? "?"} ${r.unit?.section ?? "?"}`;
    by.set(k, (by.get(k) ?? 0) + 1);
  }
  console.log(`수식 안 맨 % 가 든 행: ${hit.length}`);
  for (const [k, v] of [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12))
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  const ex = hit.find((r) => !r.examId);
  if (ex) console.log("비기출 예:", JSON.stringify(ex.content.slice(0, 120)));
  await db.$disconnect();
}
main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
