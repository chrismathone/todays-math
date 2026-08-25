/**
 * **「그림 없이 배치가 정해지지 않는 문항」 전수 쓸기** — 원장님 지적 2026-08-25.
 *
 *   npx tsx scripts/qa/probe-figure-dependent.ts            # 집계
 *   npx tsx scripts/qa/probe-figure-dependent.ts --list     # 사람이 볼 목록 전량
 *   npx tsx scripts/qa/probe-figure-dependent.ts --selftest # 눈금만 (DB 없이 돈다)
 *   npx tsx scripts/qa/probe-figure-dependent.ts --tokens   # 어느 조각이 실제로 무는가
 *   npx tsx scripts/qa/probe-figure-dependent.ts --json     # 스냅숏을 reports/ 에 기록
 *
 * ── 무엇을 세는가 ───────────────────────────────────────────────────────────
 * 원장님 원문: *「그림이 필요한 문제인데 그림을 안그려서 머릿속으로 상상하기 어려운
 * 문제. 어떤 문제인지 예측은 되는데, 섣불리 풀 수 없을듯」* — 실물 `J30303-A08-002`.
 *
 * 기존 판정기(`missingFigureRule.ts`)는 **본문이 지면의 그림을 «가리키는가»**를 본다.
 * 그 문항은 지시어가 하나도 없어서 `classifyFigure()` 가 **`미분류`** 를 낸다 —
 * 구조적으로 못 보는 부류다. 그래서 열쇠를 **「정해지는가」**로 바꿨다
 * (`src/lib/figure/arrangementRule.ts`, 규칙은 그 파일 하나뿐이다).
 *
 * ── 축이 셋인 이유 ──────────────────────────────────────────────────────────
 * ㉠ **얽힘**  — 부분이 얽히는데 배치를 고정하는 말이 없다 (`classifyArrangement`).
 * ㉡ **형제 단원** — 같은 단원의 형제 갈래는 그림을 받는데 이 갈래만 못 받았다.
 *      참을 그 행이 아니라 **이웃**에서 가져온다.
 * ㉢ **형제 행**  — 같은 갈래 안에서 어떤 행은 배치를 적고 어떤 행은 안 적는다.
 *
 * ⚠️ **㉡ 하나로 줄이지 마라.** 원장님이 짚으신 갈래의 단원(`중3|3. 이차방정식|
 *    이차방정식의 활용`)은 **16행 전부 그림이 없다** — 「형제가 그림을 받는다」가
 *    성립할 수 없어 그 축은 영영 0이다. 실측으로 확인했다.
 * ⚠️ **㉢ 이 원장님 갈래의 옆 갈래를 잡았다.** `J30303-A06-002` 는 「폭이 일정한
 *    **십자 모양의** 길」이라 적는데 형제 `-001` 은 그냥 「폭이 $4$m인 길」이다.
 *    해설은 가로·세로 **양쪽**에서 길을 뺀다 — 십자를 전제한다. 한 축만 있었으면
 *    이 행은 안 나왔다.
 *
 * ── 이 도구는 **아무것도 잠그지 않는다** ────────────────────────────────────
 * 산출은 「사람이 볼 목록」이다. 실측 오탐이 많다(40갈래 중 38이 멀쩡했다).
 * 반증하려고 넓힌 모집단을 처리 대상으로 그대로 물려받지 말 것 —
 * 「43이 433」이 된 전례가 있다(CLAUDE.md 2026-08-18).
 *
 * 이미 사람이 본 것은 `reviewedArrangement.ts` 에 적는다. 그래야 「아직 아무도
 * 안 본 것」이 갈려 나오고, 경고가 늘 켜져 있어 아무도 안 보는 일이 안 생긴다.
 *
 * 곁: `probe-elem-figure-demand.ts` 는 **엔진 쪽**에서 「어느 소단원이 어떤 그림을
 *     부르는가」를 센다. 이 도구는 **DB 쪽**에서 「나간 문항이 그림 없이 풀리는가」를
 *     센다. 분모가 다르므로 두 숫자를 견주지 말 것.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import {
  classifyArrangement,
  ENTANGLED,
  PINNED,
  sharedVertexShapes,
  type ArrangementVerdict,
} from "../../src/lib/figure/arrangementRule";
import { classifyFigure } from "../../src/lib/figure/missingFigureRule";
import { REVIEWED_ARRANGEMENT } from "./reviewedArrangement";

/* ────────────────────────────────────────────────────────────────────────────
 * 눈금 — **양성·음성 대조군을 둘 다** 둔다.
 *
 * 양성만 대면 재현율만 재고 지어냄은 구조적으로 0이 된다(CLAUDE.md 2026-08-20).
 * 그리고 양성은 **문자열로 박는다** — 엔진이 이 발문을 고치는 순간 살아 있는 DB 를
 * 보는 눈금은 조용히 사라지고, 그러면 재현율을 영영 못 잰다(2026-08-23).
 * ──────────────────────────────────────────────────────────────────────────── */

/** 배치가 **안 정해지는** 발문. 전량 눈으로 확인했다. */
export const POSITIVE_FIXTURES: { why: string; content: string }[] = [
  {
    why: "J30303-A08-002 (원장님 지적) — 점 E·F 가 어디 붙는지 발문이 안 적는다. 해설은 E∈AB 를 전제한다",
    content:
      "두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고 $\\square AEFD$는 정사각형이다. $\\overline{AB}=8$일 때, $\\overline{AD}$의 길이를 구하시오.",
  },
  {
    why: "J30303-A08-001 — 같은 갈래의 다른 수치판",
    content:
      "두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고 $\\square AEFD$는 정사각형이다. $\\overline{AD}=4$일 때, $\\overline{AB}$의 길이를 구하시오.",
  },
  {
    why: "J30303-A06-001 — 길이 몇 개인지·어느 방향인지 안 적는다. 해설은 가로·세로 양쪽에서 뺀다(십자)",
    content:
      "가로의 길이가 세로의 길이보다 $5\\,\\mathrm{m}$ 더 긴 직사각형 모양의 땅에 폭이 $4\\,\\mathrm{m}$인 길을 내었더니 길을 제외한 땅의 넓이가 $204\\,\\mathrm{m^2}$가 되었다. 이 땅의 가로의 길이를 구하시오.",
  },
];

/** 배치가 **정해지는** 발문. 전량 눈으로 확인했다 — 얽힘은 있는데 고정하는 말이 있다. */
export const NEGATIVE_FIXTURES: { why: string; content: string }[] = [
  {
    why: "J30201-A09-001 — 「가로 방향과 세로 방향으로 하나씩」이 배치를 적는다",
    content:
      "가로의 길이가 $6x$, 세로의 길이가 $4x$ 인 직사각형 모양의 땅에 폭이 일정하게 $1$ 인 길을 가로 방향과 세로 방향으로 하나씩 만들었다. 길을 제외한 땅의 넓이를 구하시오.",
  },
  {
    why: "J30303-A06-002 — 「십자 모양의」가 배치를 적는다. 위 양성 3번과 **같은 갈래**다",
    content:
      "한 변의 길이가 $23\\,\\mathrm{m}$인 정사각형 모양의 땅에 폭이 일정한 십자 모양의 길을 내었더니 길을 제외한 땅의 넓이가 $361\\,\\mathrm{m^2}$가 되었다. 길의 폭을 구하시오.",
  },
  {
    why: "J30303-A07-001 — 「네 귀퉁이에서 … 각각」이 배치를 적는다",
    content:
      "한 변의 길이가 $x\\,\\mathrm{cm}$인 정사각형 모양의 종이의 네 귀퉁이에서 한 변의 길이가 $4\\,\\mathrm{cm}$인 정사각형을 각각 잘라 내고 남은 부분으로 뚜껑이 없는 직육면체 모양의 상자를 만들었더니 부피가 $1156\\,\\mathrm{cm^3}$가 되었다. 처음 정사각형의 한 변의 길이를 구하시오.",
  },
  {
    // ⚠️ 이 행의 판정은 `배치확정` 이 **아니라** `얽힘없음` 이다 — 「이 순서대로」가
    //    이기기 전에 얽힘 축이 아예 안 문다(`\angle APB` 는 라벨이 하나뿐이다).
    //    음성 대조로서는 그대로 값이 있지만, 「이 조각이 무는 것을 봤다」로 읽지 말 것.
    //    무엇이 실제로 무는지는 `--tokens` 가 센다.
    why: "J30603-A09-001 — 얽힘 축이 안 문다(라벨 하나). 「이 순서대로」도 있다",
    content:
      "원 위에 네 점 $A$, $B$, $C$, $D$가 이 순서대로 있고, 두 현 $AC$와 $BD$는 원 안의 점 $P$에서 만난다. 호 $AB$의 길이는 원주의 $\\dfrac{1}{9}$, 호 $CD$의 길이는 원주의 $\\dfrac{1}{5}$일 때, $\\angle APB$의 크기를 구하시오.",
  },
  {
    why: "E61101-A04-001 — 「(단, …)」 단서절이 배치를 적는다",
    content:
      "어떤 원 안에 꼭 맞게 그린 정육각형의 둘레가 $30\\,\\mathrm{cm}$ 입니다. 같은 원 밖에 꼭 맞게 그린 정사각형의 둘레는 몇 cm인가? (단, 정육각형의 여섯 꼭짓점은 모두 원 위에 있습니다. 또, 정사각형의 네 변은 모두 원에 닿습니다.)",
  },
  {
    why: "얽힘이 아예 없는 순수 계산 — 이 축이 말이 없어야 한다",
    content: "다음 식을 인수분해하시오. $9x^2-12xy+4y^2$",
  },
  {
    why: "얽힘이 아예 없는 순수 계산 — 초등 연산",
    content: "계산하시오. $\\frac{5}{6}\\times\\frac{9}{10}$",
  },
];

/** 눈금을 돌린다. **하나라도 어긋나면 이 도구는 보고하지 않는다.** */
export function runSelfTest(): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;
  for (const f of POSITIVE_FIXTURES) {
    const v = classifyArrangement(f.content);
    const good = v === "배치미정";
    if (!good) ok = false;
    lines.push(`  ${good ? "🟢" : "🔴"} 양성 → ${v.padEnd(6)} · ${f.why}`);
  }
  for (const f of NEGATIVE_FIXTURES) {
    const v = classifyArrangement(f.content);
    const good = v !== "배치미정";
    if (!good) ok = false;
    lines.push(`  ${good ? "🟢" : "🔴"} 음성 → ${v.padEnd(6)} · ${f.why}`);
  }
  return { ok, lines };
}

/**
 * **변이 하네스가 「뜻이 바뀌었나」를 재는 지문.** DB 없이 돈다.
 *
 * ⚠️ 지문이 눈금 열 줄뿐이면 **너무 좁다.** 실제로 `sharedVertexShapes` 를 망가뜨리는
 *    변이 셋이 「판정 그대로」로 거부됐다 — 양성 픽스처가 `닮은` 으로도 걸려서
 *    라벨 축이 죽어도 판정이 안 바뀌기 때문이다(조각끼리 서로 가린다).
 *    그래서 지문에 ⑴ 눈금 ⑵ **커밋된 스냅숏 357행의 판정** ⑶ 라벨 축의 산출을
 *    같이 넣는다. 좁은 지문은 「가드가 아니다」를 **거짓으로** 만든다.
 */
export function behaviourSignature(): string {
  const probes = [
    "두 직사각형 $ABCD$와 $BCFE$는 정사각형이다",
    "$\\square AEFD$는 정사각형이고 $\\square ABCD$이다",
    "직각삼각형 $ABC$에서 $\\overline{AB}=20$",
    "사각형 $ABCD$와 오각형 $PQRST$가 있다",
  ];
  const parts = [
    runSelfTest().lines.join("\n"),
    probes.map((p) => p + " → " + JSON.stringify(sharedVertexShapes(p))).join("\n"),
  ];
  try {
    const snap = JSON.parse(
      readFileSync("scripts/qa/reports/figure-dependent-snapshot.json", "utf8"),
    ) as { 목록: { code: string; content: string }[] };
    parts.push(
      snap.목록.map((r) => r.code + ":" + classifyArrangement(r.content)).join("\n"),
    );
  } catch {
    parts.push("(스냅숏 없음)");
  }
  return parts.join("\n--\n");
}

/* ──────────────────────────────────────────────────────────────────────────── */

type Row = {
  code: string;
  fam: string;
  unit: string;
  hasFig: boolean;
  content: string;
};

async function main() {
  const args = process.argv.slice(2);
  const selftestOnly = args.includes("--selftest");
  if (args.includes("--signature")) {
    console.log(behaviourSignature());
    return;
  }
  const list = args.includes("--list");
  const json = args.includes("--json");

  const cal = runSelfTest();
  console.log(
    "── 눈금 (양성 " +
      POSITIVE_FIXTURES.length +
      " · 음성 " +
      NEGATIVE_FIXTURES.length +
      ") ──",
  );
  for (const l of cal.lines) console.log(l);
  if (!cal.ok) {
    console.error(
      "\n🔴 눈금이 어긋났다 — **보고하지 않는다.** 규칙이 「아니오」를 낼 수 있는지부터 고쳐라.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("🟢 눈금 통과\n");
  if (selftestOnly) return;

  const prisma = new PrismaClient();
  let raw;
  try {
    raw = await prisma.problem.findMany({
      // 분모는 **격리 안 된 공용 풀 전량**이다. 대상·대조군을 미리 가르지 않는다 —
      // 가르면 그 경계가 곧 사각지대가 된다.
      where: { directUseAllowed: true },
      select: {
        problemCode: true,
        familyKey: true,
        content: true,
        figureSvg: true,
        figureUrls: true,
        unit: { select: { grade: true, chapter: true, section: true } },
      },
      orderBy: { problemCode: "asc" },
    });
  } catch (e) {
    console.error(
      "🟡 울타리 — DB 에 못 닿았다. `.env` 의 `DATABASE_URL` 이 필요하다(10-handoff §1.3).\n" +
        "   눈금(`--selftest`)은 DB 없이 돈다.\n   " +
        String(e).slice(0, 200),
    );
    process.exitCode = 2;
    return;
  } finally {
    await prisma.$disconnect();
  }

  const rows: Row[] = raw.map((r) => ({
    code: r.problemCode,
    fam: r.familyKey ?? "(없음)",
    unit: `${r.unit.grade}|${r.unit.chapter}|${r.unit.section}`,
    hasFig: Boolean(r.figureSvg) || r.figureUrls.length > 0,
    content: r.content,
  }));
  const noFig = rows.filter((r) => !r.hasFig);
  const withFig = rows.filter((r) => r.hasFig);

  console.log("── 분모 ──");
  console.log(`  격리 안 된 문항        ${rows.length}`);
  console.log(`   · 그림 있음           ${withFig.length}`);
  console.log(`   · 그림 없음           ${noFig.length}   ← 이 도구의 대상`);

  const tally = (arr: Row[]) => {
    const t: Record<string, number> = {};
    for (const r of arr) {
      const v = classifyArrangement(r.content);
      t[v] = (t[v] ?? 0) + 1;
    }
    return t;
  };
  console.log("\n── 축 ㉠ 얽힘 판정 ──");
  console.log("  그림 없음  " + JSON.stringify(tally(noFig)));
  console.log(
    "  그림 있음  " +
      JSON.stringify(tally(withFig)) +
      "   ← 반대쪽 모집단(대조)",
  );

  // 기존 판정기가 이 부류를 못 본다는 것을 **같은 실행에서** 보인다.
  const oldOnPositives = POSITIVE_FIXTURES.map((f) =>
    classifyFigure(f.content),
  );
  console.log(
    "\n  참고 — 기존 `classifyFigure()` 를 양성 대조군에 대면: " +
      oldOnPositives.join(", ") +
      "  (그래서 새 축이 필요하다)",
  );

  const flagged = noFig.filter(
    (r) => classifyArrangement(r.content) === "배치미정",
  );

  // 축 ㉡ — 같은 단원의 형제 갈래는 그림을 받는가.
  const unitFig = new Map<string, { fig: Set<string>; nofig: Set<string> }>();
  for (const r of rows) {
    if (!unitFig.has(r.unit))
      unitFig.set(r.unit, { fig: new Set(), nofig: new Set() });
    unitFig.get(r.unit)![r.hasFig ? "fig" : "nofig"].add(r.fam);
  }
  const siblingUnit = noFig.filter((r) => {
    const u = unitFig.get(r.unit)!;
    return u.fig.size > 0 && !u.fig.has(r.fam);
  });

  // 축 ㉢ — 같은 갈래 안에서 배치를 적는 행과 안 적는 행이 갈리는가.
  // 견주는 것은 **그림 있는 형제까지 전부**(그래야 「형제는 적는다」가 보인다),
  // 목록에 담는 것은 **그림 없는 행만**이다 — 그림이 붙어 있으면 배치는 지면이 정한다.
  const byFam = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byFam.has(r.fam)) byFam.set(r.fam, []);
    byFam.get(r.fam)!.push(r);
  }
  const siblingRow: Row[] = [];
  for (const v of byFam.values()) {
    const verd = v.map((r) => [r, classifyArrangement(r.content)] as const);
    if (
      verd.some(([, x]) => x === "배치확정") &&
      verd.some(([, x]) => x === "배치미정")
    ) {
      for (const [r, x] of verd)
        if (x === "배치미정" && !r.hasFig) siblingRow.push(r);
    }
  }

  const famsOf = (arr: Row[]) => new Set(arr.map((r) => r.fam)).size;
  console.log("\n── 사람이 볼 목록 ──");
  console.log(
    `  ㉠ 배치미정          ${flagged.length}행 / ${famsOf(flagged)}갈래`,
  );
  console.log(
    `  ㉡ 형제 단원은 그림  ${siblingUnit.length}행 / ${famsOf(siblingUnit)}갈래`,
  );
  console.log(
    `  ㉢ 형제 행은 적는다  ${siblingRow.length}행 / ${famsOf(siblingRow)}갈래`,
  );

  const seen = new Set<string>();
  const review = [...flagged, ...siblingUnit, ...siblingRow].filter((r) =>
    seen.has(r.code) ? false : (seen.add(r.code), true),
  );
  const unreviewed = review.filter((r) => !REVIEWED_ARRANGEMENT[r.fam]);
  console.log(
    `  합집합               ${review.length}행 / ${famsOf(review)}갈래`,
  );
  console.log(
    `  그중 **아직 아무도 안 본 갈래** ${famsOf(unreviewed)}  (사람이 본 것은 reviewedArrangement.ts)`,
  );
  if (famsOf(unreviewed) > 0) {
    console.log(
      "\n  ⚠️ 안 본 갈래가 있다 — `--list` 로 보고 판정을 그 파일에 적어라.",
    );
    for (const f of new Set(unreviewed.map((r) => r.fam))) {
      const r = unreviewed.find((x) => x.fam === f)!;
      console.log("     · " + f + "  " + r.code);
      console.log("       " + r.content.replace(/\s+/g, " ").slice(0, 140));
    }
  }

  const bad = review.filter((r) =>
    REVIEWED_ARRANGEMENT[r.fam]?.startsWith("결함"),
  );
  console.log(`\n── 사람이 «결함» 이라 판정한 것 ${bad.length}행 ──`);
  for (const r of bad) {
    console.log("  🔴 " + r.code + "  " + r.fam);
    console.log("     " + REVIEWED_ARRANGEMENT[r.fam]);
  }

  if (list) {
    console.log("\n── 목록 전량 ──");
    for (const r of review) {
      console.log(
        "[" +
          r.code +
          "] " +
          r.fam +
          "  " +
          (REVIEWED_ARRANGEMENT[r.fam] ? "(본 것)" : "(안 본 것)"),
      );
      console.log("   " + r.content.replace(/\s+/g, " ").slice(0, 200));
    }
  }

  if (args.includes("--tokens")) {
    // **어느 조각이 실제로 무는가.** 규칙을 넓힐 때 「넓혔다」와 「넓어졌다」는 다른
    // 말이다 — 한 번도 안 걸리는 조각은 있으나 마나이고, 그것을 세지 않으면
    // 「이만큼 덮는다」가 근거 없는 말이 된다(CLAUDE.md 2026-08-18 「LOOP 가 있나」).
    //
    // ⚠️ 조각 하나씩 **빼 보는** 방식으로는 못 잰다 — 두 조각이 같은 행을 물면
    //    서로 가려 **둘 다 «죽음»** 으로 찍힌다. 그래서 「매치」와 「유일 원인」을
    //    따로 센다: 매치 0 이면 정말 죽은 것이고, 유일 원인 0 이면 살아 있으나
    //    혼자서는 아무것도 못 가른 것이다.
    for (const [name, re] of [
      ["ENTANGLED", ENTANGLED],
      ["PINNED", PINNED],
    ] as const) {
      const parts = re.source.split("|");
      const res = parts.map((p) => new RegExp(p));
      console.log("\n=== " + name + " 조각 (전 풀 " + rows.length + "행) ===");
      console.log("     매치  유일원인  조각");
      for (let i = 0; i < parts.length; i++) {
        let hit = 0;
        let only = 0;
        for (const r of rows) {
          const c = r.content.replace(/\s+/g, " ");
          if (!res[i].test(c)) continue;
          hit++;
          if (!res.some((x, j) => j !== i && x.test(c))) only++;
        }
        console.log(
          "  " +
            (hit === 0 ? "💀" : only === 0 ? "🟡" : "🟢") +
            String(hit).padStart(5) +
            String(only).padStart(9) +
            "  " +
            parts[i],
        );
      }
    }
    console.log(
      "\n💀 매치 0 = 이 풀에서 한 번도 안 걸린다 · 🟡 걸리지만 늘 다른 조각과 함께",
    );
  }

  if (json) {
    mkdirSync("scripts/qa/reports", { recursive: true });
    const path = "scripts/qa/reports/figure-dependent-snapshot.json";
    writeFileSync(
      path,
      JSON.stringify(
        {
          // ⚠️ 이 스냅숏은 **시험의 분모**다. 공유 DB 는 다른 세션이 바꾸므로,
          //    수치를 다시 박기 전에 「무엇이 왜 달라졌나」를 먼저 세라.
          기준일: "2026-08-25",
          분모: rows.length,
          그림있음: withFig.length,
          그림없음: noFig.length,
          그림없음_판정: tally(noFig),
          그림있음_판정: tally(withFig),
          배치미정_행: flagged.length,
          배치미정_갈래: famsOf(flagged),
          형제단원_행: siblingUnit.length,
          형제행_행: siblingRow.length,
          목록: review.map((r) => ({
            code: r.code,
            fam: r.fam,
            unit: r.unit,
            verdict: classifyArrangement(r.content) as ArrangementVerdict,
            content: r.content,
          })),
        },
        null,
        1,
      ),
      "utf8",
    );
    console.log("\n→ " + path);
  }
}

/**
 * ⚠️ **직접 실행할 때만 돈다.** 시험(`arrangementRule.test.ts`)이 이 파일에서 눈금
 * 픽스처를 **정본으로** 가져다 쓴다 — 픽스처를 두 벌 두면 한쪽만 고쳐도 아무도 모른다.
 * 그런데 import 만으로 `main()` 이 돌면 시험이 공유 DB 에 붙는다. 그래서 막는다.
 */
const invokedDirectly = /probe-figure-dependent\.[tj]s$/.test(
  process.argv[1] ?? "",
);
if (invokedDirectly) void main();
