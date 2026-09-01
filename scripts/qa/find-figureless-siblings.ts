/**
 * **그림 렌더에 실패해 «그림 없이» 들어간 행을 찾는다.**
 *
 * 적재 로그는 「실패 N」만 찍고 **어느 행인지 안 남긴다**(§0-M.7). 그래서 바깥에서
 * 되찾는다 — 열쇠는 **형제**다. 같은 문항류(같은 단원 + 같은 family_key)의 다른 변형이
 * 그림을 받았는데 이 행만 못 받았다면, 그건 「그림이 필요 없는 문항」이 아니라
 * **그리다 실패한 행**이다.
 *
 * ⚠️ 이것은 **하한**이다 — 한 문항류의 변형이 **전부** 실패하면 형제가 없어 안 잡힌다.
 *
 * ## 🔴 형제 열쇠만으로는 **과대 계상**한다 (2026-09-02 정정)
 *
 * 처음엔 형제 열쇠 하나로 «214행»을 냈다. 그런데 엔진은 **같은 문항류 안에서도** 변형에
 * 따라 그림을 만들기도 하고 안 만들기도 한다 — 「받아올림이 없는 (세 자리 수)+(세 자리 수)」
 * 나 「확률」처럼 그림이 필요 없는 변형이 그렇다. 그런 행은 **결함이 아니다.**
 *
 * 실측으로 214행이 이렇게 갈렸다:
 *   · **110행** — `figureSpec` 이 **있는데** 그림이 없다 → **진짜 렌더 실패**
 *   · **104행** — `figureSpec` 이 **애초에 없다** → 그림이 필요 없는 변형
 *
 * 그래서 `--strict` 를 주면 `externalId` 로 스펙을 **되만들어** 둘을 가른다(느리지만 정확하다).
 * 안 주면 형제 열쇠만 보는 빠른 값(상한)이다 — **그 값을 결함 수로 인용하지 마라.**
 *
 * **자가 맞다는 증거**: 중3 12벌 적재 로그가 「실패 24」를 찍었고, 이 자가 중3 에서
 * **정확히 24행**을 찾았다(2026-09-02). 그리고 중1 은 그 회차 로그가 「실패 0」인데
 * 22행이 나온다 — 그건 **예전 적재분**이다. 즉 이 자는 이번 회차만이 아니라
 * **지금 DB 에 남아 있는 것 전부**를 본다.
 *
 * 쓸 곳: ⑴ 그 행만 `directUseAllowed=false` 로 잠그거나 ⑵ 도형 엔진의 배치 결함을
 * 고친 뒤 `scripts/qa/refresh-engine-figures.ts` 로 되그린다.
 */
import { writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { specFromExternalId } from "./fill-missing-figures";

const p = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
(async () => {
  await p.$executeRawUnsafe("SET TRANSACTION READ ONLY");
  const r = await p.$queryRawUnsafe<
    { grade: string; n: bigint; fams: bigint }[]
  >(`
    WITH fam AS (
      SELECT p."unit_id", p."family_key", u."grade",
             COUNT(*) FILTER (WHERE p."figure_svg" IS NOT NULL) AS withfig,
             COUNT(*) FILTER (WHERE p."figure_svg" IS NULL) AS nofig
        FROM "problem" p JOIN "unit" u ON u."id"=p."unit_id"
       WHERE p."external_id" LIKE 'engine-%' AND p."family_key" IS NOT NULL
       GROUP BY 1,2,3
    )
    SELECT grade, SUM(nofig) AS n, COUNT(*) AS fams
      FROM fam WHERE withfig > 0 AND nofig > 0
     GROUP BY 1 ORDER BY 1`);
  let t = 0;
  console.log(
    "형제는 그림을 받았는데 이 행만 못 받았다 (**상한** — 아래 주의)",
  );
  for (const x of r) {
    console.log(`  ${x.grade}: ${Number(x.n)}행 · 문항류 ${Number(x.fams)}개`);
    t += Number(x.n);
  }
  console.log(`  합계 ${t}행`);

  const strict = process.argv.includes("--strict");
  const emit = process.argv.includes("--emit");
  if (!strict && !emit) {
    console.log(
      "\n⚠️ 이 수는 **상한**이다 — 엔진이 그림을 안 만드는 변형도 같이 센다." +
        "\n   결함 수를 알려면 `--strict` 를 줘라(스펙을 되만들어 가른다).",
    );
    await p.$disconnect();
    return;
  }

  // ── `--strict` / `--emit` — 행을 뽑아 **스펙이 있는지**로 가른다 ──────────────
  const rows = await p.$queryRawUnsafe<
    {
      id: string;
      grade: string;
      section: string;
      problem_code: string;
      external_id: string;
      family_key: string;
      question_type: string;
      content: string;
    }[]
  >(`
    WITH fam AS (
      SELECT p."unit_id", p."family_key",
             COUNT(*) FILTER (WHERE p."figure_svg" IS NOT NULL) AS withfig,
             COUNT(*) FILTER (WHERE p."figure_svg" IS NULL) AS nofig
        FROM "problem" p
       WHERE p."external_id" LIKE 'engine-%' AND p."family_key" IS NOT NULL
       GROUP BY 1,2
    )
    SELECT p."id", u."grade", u."section", p."problem_code", p."external_id",
           p."family_key", p."question_type", p."content"
      FROM "problem" p
      JOIN "unit" u ON u."id" = p."unit_id"
      JOIN fam f ON f."unit_id" = p."unit_id" AND f."family_key" = p."family_key"
     WHERE p."figure_svg" IS NULL AND f.withfig > 0 AND f.nofig > 0
       AND p."external_id" LIKE 'engine-%'
     ORDER BY u."grade", p."problem_code"`);

  const real: typeof rows = [];
  const noSpec: typeof rows = [];
  for (const row of rows)
    (specFromExternalId(row.external_id) ? real : noSpec).push(row);

  console.log(
    `\n스펙으로 가른 결과 (대상 ${rows.length}행)` +
      `\n  🔴 스펙이 **있는데** 그림이 없다 (= 진짜 렌더 실패): **${real.length}행**` +
      `\n  ⚪ 스펙이 **애초에 없다** (= 그림이 필요 없는 변형): ${noSpec.length}행`,
  );
  const byGrade = new Map<string, number>();
  for (const row of real)
    byGrade.set(row.grade, (byGrade.get(row.grade) ?? 0) + 1);
  for (const [g, n] of [...byGrade].sort()) console.log(`     ${g}: ${n}행`);

  if (emit) {
    const out = arg("--emit-to") ?? ".tmp-lead/figless-real.json";
    writeFileSync(out, JSON.stringify(real, null, 1), "utf-8");
    console.log(
      `\n→ ${out} (${real.length}행) — fill-missing-figures.ts 의 --rows 로 쓴다`,
    );
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error(String(e).slice(0, 300));
  await p.$disconnect();
});
