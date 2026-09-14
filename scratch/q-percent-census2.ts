// 공유 DB 전체 — «수식 안 맨 %» (제품 렌더러가 지면에서 % 를 지우는 행). 읽기만 한다.
// 🔴 Prisma 의 contains("%") 는 % 를 와일드카드로 두어 전 행을 돌려준다 — 그래서 원시 SQL position() 으로 거른다.
//    take 로 자르지도 않는다(첫 판이 20000 행에서 잘려 «0» 을 냈다 — 못 셈이지 없음이 아니었다).
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
  const rows = await db.$queryRaw<
    {
      id: string;
      source: string;
      exam_id: string | null;
      content: string;
      solution: string | null;
    }[]
  >`
    SELECT id::text AS id, source::text AS source, exam_id, content, solution
    FROM problem
    WHERE position('%' in content) > 0 OR position('%' in coalesce(solution, '')) > 0`;
  const hit = rows.filter((r) => bare(r.content) + bare(r.solution) > 0);
  // 눈금: 알려진 결함 행(적재된 강동중 문17 보기③)이 반드시 걸려야 한다
  const known = hit.some(
    (r) => r.exam_id === "2025-gangdong-3-2-mid" && r.content.includes("20%"),
  );
  console.log(
    `% 글자가 든 행 ${rows.length} · 그중 수식 안 맨 % ${hit.length}행 · 눈금(강동중 문17 걸림) ${known ? "통과" : "🔴 실패"}`,
  );
  const by = new Map<string, number>();
  for (const r of hit) {
    const k = `${r.source}${r.exam_id ? " · 기출 " + r.exam_id : ""}`;
    by.set(k, (by.get(k) ?? 0) + 1);
  }
  for (const [k, v] of [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12))
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  const ex = hit.filter((r) => !r.exam_id).slice(0, 2);
  for (const r of ex) {
    const t = r.content;
    const i = t.indexOf("%");
    console.log(
      "  비기출 예:",
      JSON.stringify(t.slice(Math.max(0, i - 50), i + 15)),
    );
  }
  await db.$disconnect();
}
main().catch((e) => {
  console.error(String(e).slice(0, 400));
  process.exit(1);
});
