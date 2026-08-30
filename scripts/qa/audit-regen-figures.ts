/**
 * 「그림을 다시 그려 넣은 뒤, **DB 가 정말 그 값인가**」를 되짚어 감사한다.
 *
 *     npx tsx scripts/qa/audit-regen-figures.ts [원장.json]
 *
 * 🔴 **계획이 아니라 DB 를 봐야 한다.** 2026-08-21 에 해설 HWP 감사기를 원장의
 *    before/after 만 보고 짜서, 되돌린 뒤에도 계속 「14행 나쁨」을 찍었다 — 지표가
 *    「다 고쳤나」를 영영 못 알려 준다. 여기서는 **지금 DB 값**을 물어본다.
 *
 * 🔴 그리고 **가드가 0을 낼 수 있는지부터** 본다. 「일부러 걸리는 행」을 하나 만들어
 *    검출기에 대 보고, 못 잡으면 판정을 **거부**한다 — 0이 「깨끗」인지 「못 셈」인지
 *    갈라야 한다(2026-08-21 · 2026-08-27 에 같은 자리를 두 번 물렸다).
 */
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { isDirectScript } from "../import/isDirectScript";
// 🔴 원장을 **읽는 규칙은 한 곳**에 둔다 — 여기서 다시 구현하면 `.gz` 로 바꾼 날
//    한쪽만 따라가고, 그러면 감사가 옛 파일을 보며 「깨끗하다」고 한다.
import { ledgerPaths, readLedger } from "./regen-engine-figures";

const prisma = new PrismaClient();
const REPO = path.resolve(__dirname, "..", "..");
const DEFAULT_LEDGER = path.join(
  REPO,
  "docs",
  "planning",
  "tracks",
  "reports",
  "regen-engine-figures.json",
);

type LedgerRow = {
  id: string;
  problemCode: string | null;
  externalId: string;
  before: string | null;
  after: string;
};

/** 지면에 나가면 안 되는 자국 — **날 글자**로 남은 옛 결함들. */
export function figureSmells(svg: string): string[] {
  const hits: string[] = [];
  // ⑴ 프라임 붙은 점 이름이 이탤릭 (2026-08-29 원장님 지적)
  if (/font-style="italic"[^>]*>\s*[A-Z]\s*</.test(svg))
    hits.push("대문자가 이탤릭");
  // ⑵ 길이 글자가 **치수선 없이** 떠 있다 — 치수는 점선으로 그려진다
  const hasLen = /data-label="[^"]*\d[^"]*(?:cm|mm|m)"/.test(svg);
  if (hasLen && !/stroke-dasharray/.test(svg))
    hits.push("길이 글자가 치수선 없이 떠 있다");
  return hits;
}

async function main() {
  const file = process.argv[2] ?? DEFAULT_LEDGER;
  const led = readLedger(file) as { label: string; rows: LedgerRow[] };
  if (led.rows.length === 0) {
    console.error(
      `원장이 비었거나 없다: ${ledgerPaths(file).gz} (또는 .json)
` + "  → 감사할 것이 없다. 적용을 먼저 돌렸는지 보라.",
    );
    process.exit(1);
  }
  console.log(`원장 「${led.label}」 · ${led.rows.length}행`);

  // ── 눈금 — 검출기가 «아니오»를 낼 수 있는가 ───────────────────────────
  //
  // 🔴 **양성 대조군을 지어낸 문자열로 박으면 안 된다.** 그러면 「검출기가 도는가」만
  //    보고 「살아 있는 엔진의 옛 산출물을 잡는가」는 구조적으로 못 본다
  //    (CLAUDE.md 2026-08-23 「양성 대조를 «문자열 픽스처»로 박았다」).
  //    여기서는 **원장의 `before`** 를 쓴다 — 그건 진짜로 옛 엔진이 낸 SVG 다.
  //    before 에서 하나도 안 걸리면 이 감사는 아무것도 증명하지 못한다.
  const beforeHits = led.rows.filter(
    (r) => r.before && figureSmells(r.before).length > 0,
  ).length;
  if (beforeHits === 0) {
    console.error(
      "🔴 **옛 그림(원장의 before)에서 한 건도 안 걸린다** — 판정을 거부한다.\n" +
        "   검출기가 이 결함들을 셀 수 있는 축을 안 가졌다는 뜻이고, 그러면 아래 " +
        "「0건」이 «깨끗»인지 «못 셈»인지 안 갈린다.",
    );
    process.exit(2);
  }
  console.log(
    `눈금 OK — **옛 그림에서 ${beforeHits}건**을 잡는다 (양성 대조)\n`,
  );

  let landed = 0;
  let drifted = 0;
  let missing = 0;
  let replaced = 0;
  const lost: string[] = [];
  const smelly: string[] = [];
  for (const row of led.rows) {
    const now = await prisma.problem.findUnique({
      where: { id: row.id },
      select: { figureSvg: true },
    });
    if (!now) {
      missing += 1;
      // 🔴 「사라졌다」를 그냥 세면 다음 사람이 **잃은 줄 안다.** 원장은 회차를 누적하고
      //    그 사이 **전량 재적재**가 있으면 옛 id 는 없어진다 — 그런데 같은 유형이
      //    새 씨앗으로 다시 들어와 있다(실측 2026-08-30: 85행이 다 그랬고, 문항 코드도
      //    같았다). 「갈린 것」과 「정말 잃은 것」을 갈라서 찍는다.
      const family = /^(engine-\w+:[^|]+(?:\|[^|]+)*?)\|s\d+/.exec(
        row.externalId,
      );
      const alive = family
        ? await prisma.problem.count({
            where: { externalId: { startsWith: `${family[1]}|s` } },
          })
        : 0;
      if (alive > 0) replaced += 1;
      else lost.push(`${row.problemCode} ${row.externalId}`);
      continue;
    }
    if (now.figureSvg === row.after) landed += 1;
    else drifted += 1;
    const hits = figureSmells(now.figureSvg ?? "");
    if (hits.length > 0) smelly.push(`${row.problemCode}: ${hits.join(" · ")}`);
  }

  console.log(`  DB 값이 원장의 after 와 **같다** ${landed}`);
  console.log(
    `  다르다 ${drifted}   ← 다른 트랙이 그 뒤 고쳤거나, 적용이 덜 됐다`,
  );
  console.log(
    `  행이 사라졌다 ${missing} — 그중 **같은 유형이 새 씨앗으로 살아 있다** ${replaced} · ` +
      `정말 잃은 것 ${lost.length}`,
  );
  for (const s of lost.slice(0, 10)) console.log(`     🔴 ${s}`);
  console.log(`\n  옛 결함 자국이 남은 행 ${smelly.length}`);
  for (const s of smelly.slice(0, 20)) console.log(`     ${s}`);
  if (smelly.length > 20) console.log(`     … 그 밖 ${smelly.length - 20}`);
}

if (isDirectScript(import.meta.url)) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
