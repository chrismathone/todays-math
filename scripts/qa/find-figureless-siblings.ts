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
 * **자가 맞다는 증거**: 중3 12벌 적재 로그가 「실패 24」를 찍었고, 이 자가 중3 에서
 * **정확히 24행**을 찾았다(2026-09-02). 그리고 중1 은 그 회차 로그가 「실패 0」인데
 * 22행이 나온다 — 그건 **예전 적재분**이다. 즉 이 자는 이번 회차만이 아니라
 * **지금 DB 에 남아 있는 것 전부**를 본다.
 *
 * 쓸 곳: ⑴ 그 행만 `directUseAllowed=false` 로 잠그거나 ⑵ 도형 엔진의 배치 결함을
 * 고친 뒤 `scripts/qa/refresh-engine-figures.ts` 로 되그린다.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
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
    "형제는 그림을 받았는데 이 행만 못 받았다 (= 렌더 실패로 보이는 행)",
  );
  for (const x of r) {
    console.log(`  ${x.grade}: ${Number(x.n)}행 · 문항류 ${Number(x.fams)}개`);
    t += Number(x.n);
  }
  console.log(`  합계 ${t}행`);
  await p.$disconnect();
})().catch(async (e) => {
  console.error(String(e).slice(0, 300));
  await p.$disconnect();
});
