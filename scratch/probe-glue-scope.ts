/**
 * **맞붙은 인라인 수식(`$A$$B$`)이 은행에 몇 건인가** — 원장님 2026-09-14
 * 「후보정 필요한 해설이 일부 보이네」.
 *
 * 규모를 모르면 「지금 고칠 일인지, 따로 세울 일인지」를 정할 수 없다. API 는 한 번에
 * 12건이라 99,128행을 못 센다 — DB 를 직접 **읽는다**.
 *
 * 🔴 **읽기 전용이다.** 공유 DB 쓰기는 원장님 확인 전까지 금지(D-31) — 이 스크립트에
 *    `create`/`update`/`delete` 는 한 줄도 없다.
 *
 * ⚠️ `$$` 가 있다고 다 결함이 아니다. **진짜 디스플레이 수식**도 `$$` 를 쓴다. 그래서
 *    세는 것과 판정하는 것을 가른다 — `tokenizeMath` 가 `display` 조각을 0개로 내면
 *    그 `$$` 는 디스플레이가 아니라 **맞붙어서 생긴 것**이다.
 *
 * 돌리는 법:  npx tsx scratch/probe-glue-scope.ts
 */
import { db } from "@/lib/db";
import { tokenizeMath } from "@/lib/math/segments";

/** `$$` 가 진짜 디스플레이인가, 맞붙어 생긴 것인가. */
function accidental(text: string): boolean {
  if (!text.includes("$$")) return false;
  return tokenizeMath(text).every((seg) => seg.type !== "display");
}

async function main() {
  const [total, solutionHits, contentHits] = await Promise.all([
    db.problem.count(),
    db.problem.count({ where: { solution: { contains: "$$" } } }),
    db.problem.count({ where: { content: { contains: "$$" } } }),
  ]);
  console.log(`전체 ${total.toLocaleString("ko-KR")}행`);
  console.log(
    `  풀이에 $$ 있음: ${solutionHits.toLocaleString("ko-KR")} · ` +
      `본문에 $$ 있음: ${contentHits.toLocaleString("ko-KR")}`,
  );

  // 표본으로 «진짜 디스플레이»와 «맞붙은 것»을 가른다. 한 무리에 쏠리지 않게
  // 코드 접두사 종수도 함께 찍는다(오늘 두 번 그 함정에 빠졌다).
  const sample = await db.problem.findMany({
    where: {
      OR: [{ solution: { contains: "$$" } }, { content: { contains: "$$" } }],
    },
    select: { problemCode: true, content: true, solution: true },
    take: 400,
  });
  const prefixes = new Set(
    sample.map((row) => String(row.problemCode).split("-")[0]),
  );
  let bad = 0;
  let real = 0;
  const examples: string[] = [];
  for (const row of sample) {
    const texts = [row.content ?? "", row.solution ?? ""];
    const isBad = texts.some(accidental);
    if (isBad) {
      bad += 1;
      if (examples.length < 5) examples.push(String(row.problemCode));
    } else if (texts.some((t) => t.includes("$$"))) {
      real += 1;
    }
  }
  console.log(
    `\n표본 ${sample.length}행 · 코드 접두사 ${prefixes.size}종\n` +
      `  맞붙어 생긴 $$ (결함): ${bad}행\n` +
      `  진짜 디스플레이 수식: ${real}행`,
  );
  if (examples.length) console.log(`  보기: ${examples.join(", ")}`);
  if (sample.length > 0) {
    const ratio = bad / sample.length;
    console.log(
      `\n표본 비율 ${(ratio * 100).toFixed(1)}% → 전체 추정 ` +
        `${Math.round(ratio * (solutionHits + contentHits)).toLocaleString("ko-KR")}행 안팎` +
        ` (⚠️ 표본이 한 무리에 쏠렸으면 이 추정은 못 믿는다 — 접두사 종수를 보라)`,
    );
  }
  await db.$disconnect();
}

main();
