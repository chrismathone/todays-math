/**
 * **전수 throw 쓸기** — 생성기가 어떤 씨앗에서 던지는가.
 *
 *   npx tsx scripts/qa/probe-elem-throw.ts            # 전 학년, 씨앗 0~999
 *   npx tsx scripts/qa/probe-elem-throw.ts 초6        # 한 학년만
 *   npx tsx scripts/qa/probe-elem-throw.ts 초6 300    # 씨앗 수를 줄여 빠르게
 *
 * 왜 따로 있나 — 시험·판정기는 **씨앗을 열댓 개**만 쓴다(16·40개). 생성기가
 * 「200번 훑어도 조건을 못 맞추면 던진다」는 구성을 쓰면, 그 던지는 씨앗은 표본이
 * 그 자리를 안 밟는 한 **구조적으로 안 보인다.** 2026-08-23 elem-g4 가 실측했다 —
 * 씨앗 16개로는 멀쩡했는데 범위가 뒤집히는 씨앗이 있었다.
 *
 * 이 도구는 **값을 안 본다.** 「생성이 끝나는가」만 본다 — 그래서 싸고(≈1분),
 * 다른 판정기가 못 보는 축 하나를 통째로 덮는다. 값·표기·조건은 각자의 판정기 몫이다.
 *
 * 던지기 자체는 구성의 마지막 방어선으로 옳다(조용히 나쁜 값을 내느니 던진다).
 * 하지만 **출제 중에 실제로 던지면 그 문항은 안 나온다** — 그래서 이 도구는 게이트다:
 * throw 가 하나라도 있으면 실패(exit 1)한다. 던지는 조합이 남아 있다면 그것은
 * 「방어선이 지켰다」가 아니라 「구성이 그 씨앗을 못 만든다」는 뜻이다.
 */
import { type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
const countArg = Number(
  process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 1000,
);

type Unit = ReturnType<typeof elementaryUnits>[number];

/**
 * 표준(`undefined`) + **그 소단원이 실제로 내는 갈래**.
 *
 * 🔴 D-113(2026-08-30): 종전에는 `supportedTiers(unit).length > 0 ? [undefined, ...ELEM_TIERS]`
 *    였다. `ELEM_TIERS` 는 **축 전체**(여섯)라, 축을 넓히자 아직 안 채운 갈래를
 *    만들려다 판정기가 통째로 죽었다. `supportedTiers` 는 등록 안 된 소단원에서
 *    `[]` 를 주므로 아래 한 줄이 옛 두 갈래를 **정확히** 대신한다.
 */
function variantsOf(unit: Unit): (ElemTier | undefined)[] {
  return [undefined, ...supportedTiers(unit)];
}

const units = elementaryUnits().filter(
  (u) => !gradeArg || u.grade === gradeArg,
);

type Hit = { where: string; message: string; seeds: number[] };
const hits = new Map<string, Hit>();
let generated = 0;

for (const unit of units) {
  for (const tier of variantsOf(unit)) {
    const where = `${unit.grade} ${unit.section}${tier ? ` «${tier}»` : ""}`;
    for (let seed = 0; seed < countArg; seed += 1) {
      try {
        generateElementaryProblem(unit, seed, tier);
        generated += 1;
      } catch (err) {
        // 같은 자리에서 여러 씨앗이 던지므로 사유별로 묶고 씨앗은 앞 5개만 남긴다.
        const message = err instanceof Error ? err.message : String(err);
        const key = `${where}\0${message}`;
        const hit = hits.get(key);
        if (hit) hit.seeds.push(seed);
        else hits.set(key, { where, message, seeds: [seed] });
      }
    }
  }
}

const rows = [...hits.values()].sort((a, b) => b.seeds.length - a.seeds.length);
const thrown = rows.reduce((s, r) => s + r.seeds.length, 0);

console.log(
  `대상 소단원 ${units.length}${gradeArg ? ` (${gradeArg})` : ""} · ` +
    `씨앗 0~${countArg - 1} · 생성 ${generated}건\n`,
);
if (rows.length === 0) {
  console.log("✅ throw 0");
} else {
  console.log(`❌ throw ${thrown}건 · 자리 ${rows.length}가지`);
  for (const r of rows) {
    const rate = ((r.seeds.length / countArg) * 100).toFixed(1);
    console.log(
      `  · ${r.where}\n      ${r.message}\n      씨앗 ${r.seeds.length}/${countArg} (${rate}%) 예: ${r.seeds.slice(0, 5).join(", ")}`,
    );
  }
}
// 게이트다 — 출제 중 던지면 그 문항은 안 나온다. 하나라도 있으면 실패로 막는다.
process.exitCode = rows.length === 0 ? 0 : 1;
