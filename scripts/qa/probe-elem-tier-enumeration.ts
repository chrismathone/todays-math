/**
 * **「해설이 후보를 늘어놓고 견주는가」를 잰다** — D-115 심화중/심화상을 가르는 축.
 *
 *     npx tsx scripts/qa/probe-elem-tier-enumeration.ts
 *     npx tsx scripts/qa/probe-elem-tier-enumeration.ts 초5
 *     npx tsx scripts/qa/probe-elem-tier-enumeration.ts --selftest
 *
 * ## 왜 이 축이 필요한가 — **잣대의 약한 자리를 적대 검토가 짚었다** (2026-08-31)
 *
 * D-115 는 이렇게 가른다.
 *
 * ```
 * 심화중   안 굳는 마디를 **그 소단원의 성질**이 굳힌다
 * 심화상   성질이 못 굳혀 **만들어 견주어야** 한다
 * ```
 *
 * 그런데 곱셈 계열에서 둘이 **서술 순서만으로 뒤집힌다**. 같은 문항을
 * 「성질이 걸러 냈다」로도 「다 곱해 견줬다」로도 쓸 수 있기 때문이다.
 * 적대 검토가 실물로 짚었다 — 초3 `2-1-4 «심화중»` 의 해설:
 *
 * ```
 * $58\times26=1508$, $58\times27=1566$, $58\times28=1624$, $58\times29=1682$ 이므로
 * 곱의 일의 자리 숫자가 $8$ 인 것은 … $26$ 뿐입니다.
 * ```
 *
 * **넷을 다 곱해 견줬다** — 그건 심화상의 길이다. 그런데 이 문항은 사실 중이다:
 * $58\times k$ 의 일의 자리는 $8k$ 의 일의 자리라 **한 자리만 보면** $k\in\{1,6\}$ 이
 * 나오고, 후보 $26\!\sim\!29$ 중 $26$ 만 남는다. 곧 **문항은 중인데 해설이 상의 길을
 * 밟았다.**
 *
 * ## 🔴 그래서 D-115 에 한 줄을 못 박는다 — **참은 해설이 밟는 길이다**
 *
 * ```
 * 굳히는 성질이 후보를 «끝까지 계산하지 않고» 걸러 내면        → 심화중
 * 후보를 실제로 다 계산해 견주어야 하나가 남으면              → 심화상
 * 그리고 판정의 참은 **해설**이다 — 학생이 읽고 원장님이 채점하시는 길이 그것이다.
 * ```
 *
 * 그러므로 **심화중인데 해설이 늘어놓으면 둘 중 하나다**:
 * 갈래가 틀렸거나(→ 상으로 옮긴다), 해설이 먼 길로 쓰였거나(→ 해설을 고친다).
 * 이 자는 **어느 쪽인지 못 정한다** — 사람 앞에 세우는 것이 이 자의 일이다.
 *
 * ## 재 보니 축이 실제로 갈린다 (전 학년 · 씨앗 4)
 *
 * ```
 * 갈래      n    해설이 «셋 이상»을 늘어놓는 비율
 * 연산     920      0.0%
 * 기본     920      0.4%
 * 응용     920      1.7%
 * 심화하   920      1.7%
 * 심화중    92     17.4%   ← 4소단원. **사람이 본다**
 * 심화상    84     81.0%   ← 17소단원. 이 갈래에서는 늘어놓는 것이 **정상**이다
 * ```
 *
 * ## ⚠️ 이 자가 **못 보는 것**
 *
 * · **「늘어놓지 않는 심화상」을 못 나무란다.** 81% 이지 100% 가 아니다 — 성질이 아니라
 *   구성으로 푸는데도 해설이 대표 하나만 보이는 자리가 있다. 그건 다른 축이다.
 * · **늘어놓은 것이 «후보»인지 «검산»인지 못 가른다.** 답을 구한 뒤 확인차 두세 개를
 *   더 곱해 보이는 해설도 같은 자국을 남긴다. 그래서 이 자는 **막지 않고 세운다.**
 * · **연산 종류를 섞어 늘어놓으면 못 센다** — 같은 연산끼리만 센다(가장 흔한 꼴이다).
 * · 🔴 **«등호 식으로 못 적는» 소단원에서는 구조적으로 0이다** (2026-08-31, 초4 물결 2가
 *   찾아 줬다). `2-3-3 심화상`은 후보 넷을 **실제로 늘어놓는데** 이 자가 못 센다 —
 *   소수점 이동은 그 소단원의 약속상 `2.7\times100` 으로 적을 수 없기 때문이다
 *   (그렇게 적으면 소수의 곱셈(초5)이 지면에 떠서 R3 가 문다. 표준 4단도 같은 까닭으로
 *   식이 없다). **그 갈래의 「0」은 «안 늘어놓는다»가 아니라 «이 자가 못 센다»다.**
 *   같은 부류: 단위 환산·도형 이름·나열 답처럼 계산을 등식으로 안 적는 자리.
 *
 * ## ⚠️ 그래서 이 자가 **세운 것**을 읽는 법
 *
 * 「심화중인데 늘어놓는다」가 떴다고 곧 결함이 아니다. 실제로 초4 물결 2의 셋
 * (`2-1-4`·`2-3-5`·`2-3-7`)은 **후보를 한 번도 안 늘어놓았다** — 한 사슬의 걸음이
 * 셋이었고, 그중 하나가 **검산**이었다. 위 «못 보는 것» 둘째가 그대로 나타난 자리다.
 * **사람이 해설을 읽고 판단하라.** 그리고 그 판단을 보고서에 남겨라.
 */
import { type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260821, 7, 1234, 99991];

/** 「셋 이상 늘어놓으면 견준 것」 — 둘은 대비일 수 있어 세지 않는다. */
export const ENUM_THRESHOLD = 3;

/**
 * 해설이 **같은 연산의 계산**을 몇 개나 늘어놓나.
 *
 * ⚠️ 역슬래시를 안 쓴다 — heredoc 이 `\times` 의 한 겹을 벗겨 **탭 문자**로 만든 적이
 *    있고, 그때 이 자는 「0건」을 냈다(눈으로 본 실물과 어긋나서야 드러났다).
 */
export function enumeratedSteps(solution: string): number {
  const byOp = new Map<string, number>();
  for (const m of solution.matchAll(/\$[^$]*=[^$]*\$/g)) {
    const c = m[0];
    const op = c.includes("times")
      ? "x"
      : c.includes("div")
        ? "d"
        : c.includes("+")
          ? "+"
          : c.includes("-")
            ? "-"
            : "";
    if (!op) continue;
    byOp.set(op, (byOp.get(op) ?? 0) + 1);
  }
  return Math.max(0, ...byOp.values());
}

type Row = { grade: string; code: string; tier: ElemTier; steps: number };

export function sweep(grade?: string): Row[] {
  const out: Row[] = [];
  for (const unit of elementaryUnits()) {
    if (grade && unit.grade !== grade) continue;
    const code = unit.section.split(" ")[0]!;
    for (const tier of supportedTiers(unit))
      for (const seed of SEEDS)
        out.push({
          grade: unit.grade,
          code,
          tier,
          steps: enumeratedSteps(
            generateElementaryProblem(unit, seed, tier).solution ?? "",
          ),
        });
  }
  return out;
}

/* ── 눈금 — 이 자가 «예»와 «아니오»를 둘 다 낼 수 있나 ───────────────────── */

function gauges(): { label: string; ok: () => boolean }[] {
  // 실물 — 초3 2-1-4 심화중 해설(적대 검토가 짚은 그 자리).
  const REAL_ENUM =
    "$58$ 에 곱해서 나오는 두 자리 수는 $26,\\ 27,\\ 28,\\ 29$ 입니다. " +
    "$58\\times26=1508$, $58\\times27=1566$, $58\\times28=1624$, $58\\times29=1682$ " +
    "이므로 일의 자리가 $8$ 인 것은 $58\\times26=1508$ 뿐입니다.";
  // 실물 — 성질로 한 번에 굳히는 해설(늘어놓지 않는다).
  const REAL_PROP =
    "$58$ 에 어떤 수를 곱한 값의 일의 자리 숫자는 $8\\times k$ 의 일의 자리와 같습니다. " +
    "그것이 $8$ 이 되는 $k$ 는 $1$ 과 $6$ 뿐이므로 두 자리 수의 일의 자리는 $6$ 입니다. " +
    "따라서 $58\\times26=1508$ 입니다.";
  return [
    {
      // ⚠️ **5 다, 4 가 아니다** — 마지막 `$58\times26=1508$ 뿐입니다` 가 답을 되짚는
      //    **검산**이라 같은 자국을 남긴다. 이 자가 「후보인가 검산인가」를 못 가른다는
      //    머리말의 고백이 여기서 **눈으로 확인된다.** 실물 그대로 못 박는다.
      label: "양성 — 후보 넷 + 검산 하나를 늘어놓은 실물을 5 로 센다",
      ok: () => enumeratedSteps(REAL_ENUM) === 5,
    },
    {
      label: "음성 — 성질로 굳히는 실물은 문턱 아래다 (곱이 하나뿐)",
      ok: () => enumeratedSteps(REAL_PROP) < ENUM_THRESHOLD,
    },
    {
      label: "음성 — 계산이 **둘**이면 «견줌»으로 안 센다 (대비일 수 있다)",
      ok: () =>
        enumeratedSteps("$3\\times4=12$ 이고 $3\\times5=15$ 입니다.") === 2,
    },
    {
      label: "연산 종류가 다르면 **따로** 센다 — 섞어서 부풀리지 않는다",
      ok: () =>
        enumeratedSteps(
          "$2\\times3=6$, $4\\times5=20$, $1+1=2$, $2+2=4$, $3+3=6$",
        ) === 3,
    },
    {
      label: "음성 — `=` 없는 수식은 계산이 아니다",
      ok: () =>
        enumeratedSteps(
          "$2\\times3$, $4\\times5$, $6\\times7$, $8\\times9$",
        ) === 0,
    },
    {
      // 🔴 역슬래시가 한 겹 벗겨지면 이 자가 통째로 0 을 낸다 — 그 자리를 못 박는다.
      label: "🔴 `times` 를 낱말로 찾는다 — 역슬래시 한 겹에 안 매인다",
      ok: () =>
        enumeratedSteps("$1\\times1=1$, $2\\times2=4$, $3\\times3=9$") === 3 &&
        enumeratedSteps("$1times1=1$, $2times2=4$, $3times3=9$") === 3,
    },
  ];
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    let bad = 0;
    for (const g of gauges()) {
      const ok = g.ok();
      if (!ok) bad += 1;
      console.log(`${ok ? "✅" : "❌"} ${g.label}`);
    }
    console.log(`\n눈금 ${gauges().length}건 — 실패 ${bad}건`);
    process.exit(bad === 0 ? 0 : 1);
  }

  const grade = process.argv.slice(2).find((a) => a.startsWith("초"));
  const rows = sweep(grade);
  if (rows.length === 0) {
    console.log("훑은 문항이 없다 — 범위를 확인하십시오.");
    process.exit(2);
  }

  const agg = new Map<string, { n: number; e: number }>();
  for (const r of rows) {
    const a = agg.get(r.tier) ?? { n: 0, e: 0 };
    a.n += 1;
    if (r.steps >= ENUM_THRESHOLD) a.e += 1;
    agg.set(r.tier, a);
  }

  console.log(
    `해설이 후보를 늘어놓는가 — ${grade ?? "전 학년"} · 문항 ${rows.length}건 (씨앗 ${SEEDS.length})\n`,
  );
  console.log("  갈래      n     늘어놓는 비율");
  for (const [tier, a] of agg)
    console.log(
      `  ${tier.padEnd(6)} ${String(a.n).padStart(5)}   ${((a.e / a.n) * 100).toFixed(1).padStart(6)}%  (${a.e})`,
    );

  const units = (tier: string) => [
    ...new Set(
      rows
        .filter((r) => r.tier === tier && r.steps >= ENUM_THRESHOLD)
        .map((r) => `${r.grade} ${r.code}`),
    ),
  ];

  const mid = units("심화중");
  console.log(
    `\n🔴 **심화중인데 해설이 늘어놓는** 소단원 ${mid.length}개 — 사람이 본다` +
      (mid.length ? `\n   ${mid.join(" · ")}` : "") +
      `\n   갈래가 틀렸거나(→ 상으로) 해설이 먼 길로 쓰였거나(→ 해설을 고친다).` +
      `\n   이 자는 어느 쪽인지 **못 정한다.**`,
  );
  const low = units("심화하");
  if (low.length)
    console.log(
      `\n⚠️ 심화하인데 늘어놓는 소단원 ${low.length}개 — ${low.join(" · ")}`,
    );

  console.log(
    `\n참고 — 심화상에서 늘어놓는 것은 **정상**이다(실측 81.0%).` +
      `\n   ⚠️ 이 자는 «늘어놓지 않는 심화상»을 못 나무란다. 머리말 §「못 보는 것」을 읽어라.`,
  );
  // 세어 찍되 **막지 않는다** — 「늘어놓은 것이 후보인가 검산인가」를 못 가르므로
  // 늘 빨간 관문이 되면 꺼진다(「거짓 경보는 가드를 끈다」, 2026-08-20).
  process.exitCode = 0;
}

if (isDirectScript(import.meta.url)) main();
