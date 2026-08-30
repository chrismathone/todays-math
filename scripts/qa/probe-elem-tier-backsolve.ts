/**
 * **되짚기 축의 반증문 ④·⑥ 을 기계로 잰다** (D-113 확정 잣대, 2026-08-30).
 *
 *     npx tsx scripts/qa/probe-elem-tier-backsolve.ts 초5
 *     npx tsx scripts/qa/probe-elem-tier-backsolve.ts 초5 2-4
 *     npx tsx scripts/qa/probe-elem-tier-backsolve.ts --selftest
 *
 * ## 무엇을 재나
 *
 * ⑥ **「발문이 준 수에 그 소단원 연산을 순방향으로만 적용해 답이 나오면 중·상이 아니다」**
 *    — **규칙은 `src/lib/elementary/forwardReach.ts` 한 곳**에 있고 생성기도 같은 것을
 *    쓴다. 다른 것은 **입력**이다 — 생성기는 지면에 나갈 수를 «예측»하고, 이 자는
 *    **찍힌 지면을 읽는다.** 둘이 갈리면 이 자가 옳다(실제로 14건이 그렇게 걸렸다).
 *
 * ④ **뒤집힘 필터** — 같은 소단원의 **연산·기본·응용**에 같은 자를 댄다. 그것들이
 *    순방향으로 **안 닿으면** 이미 되짚기를 요구한다는 뜻이고, 그러면 이 축은 그
 *    소단원에서 난이도를 **안 가른다**. 그 소단원은 **비워야 한다.**
 *
 * ## 🔴 이 자가 **못 보는 것** — 여기 안 적으면 「검사됐다」로 읽힌다
 *
 * · **「되짚기가 필요한가」를 못 잰다.** 재는 것은 «순방향으로도 되나» 하나뿐이다.
 *   닿으면 확실히 아니지만, **안 닿는다고 되짚기인 것은 아니다**(단위 환산·도형
 *   공식처럼 다른 이유로 안 닿는 문항이 있다). 그건 사람이 본다.
 * · **마디가 «굳는가»를 못 잰다.** 심화하와 심화중을 가르는 것이 그것인데, 이 자는
 *   둘을 구분하지 못한다. 사다리의 **바닥**만 지킨다.
 * · **해설을 안 본다.** 리드가 짚은 초3 2-1-4 처럼 «생성기는 전수, 해설은 한 줄»인
 *   부류는 지면의 수만 봐서는 안 걸린다.
 *
 * ## ⚠️ 심화중·심화상 쪽 0 은 **절반이 동어반복**이다
 *
 * `g5.ts` 의 생성기가 같은 성질(순방향 도달)을 **만들 때 이미 걸러 낸다.** 그래서
 * 여기서 0 이 나오는 것은 당연하다 — 그것을 «깨끗하다»로 읽으면 안 된다.
 * 그래도 값이 있는 까닭 둘:
 *   ㉠ 이 자는 **지면의 수 전부**를 본다 — 생성기는 자기가 고른 몇 개만 봤다.
 *      그래서 「조건 문구에 섞인 수까지 넣으면 닿는다」 같은 자리가 여기서 걸린다.
 *   ㉡ **④ 쪽은 동어반복이 아니다** — 연산·기본·응용은 생성기가 그 자로 거른 적이
 *      없다. 이 자의 값어치는 거기에 있다.
 */
import { type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import {
  forwardReachable,
  pageNumbers,
  readRat,
} from "../../src/lib/elementary/forwardReach";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242];

/* ── 쓸기 ────────────────────────────────────────────────────────────────── */

type Row = {
  grade: string;
  code: string;
  tier: ElemTier;
  seed: number;
  reachable: boolean;
};

export function sweep(grade?: string, chapter?: string): Row[] {
  const out: Row[] = [];
  for (const unit of elementaryUnits()) {
    if (grade && unit.grade !== grade) continue;
    const code = unit.section.split(" ")[0]!;
    if (chapter && !code.startsWith(chapter)) continue;
    for (const tier of supportedTiers(unit)) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim());
        if (!ans) continue; // 수 답이 아니면 이 자의 축이 아니다
        out.push({
          grade: unit.grade,
          code,
          tier,
          seed,
          reachable: forwardReachable(pageNumbers(p.content), ans),
        });
      }
    }
  }
  return out;
}

/* ── 눈금 — 이 자가 «아니오»를 낼 수 있나 ────────────────────────────────── */

const R = (s: string) => readRat(s)!;

function gauges(): { label: string; ok: () => boolean }[] {
  return [
    {
      label: "양성 — 「계산하시오 $0.9\\times5$」 답 $4.5$ 는 순방향이다",
      ok: () => forwardReachable(pageNumbers("$0.9\\times5$"), R("4.5")),
    },
    {
      label: "양성 — 두 걸음 문장제(곱한 뒤 뺀다)도 순방향이다",
      ok: () => forwardReachable(pageNumbers("$0.3$ $4$ $1.1$"), R("0.1")),
    },
    {
      // 실측으로 놓쳤던 꼴 ⑴ — 「전체의 $0.6$만큼 쓰고 남은 것」은 **같은 수를 다시** 쓴다.
      label: "양성 — 「$4$ 중 전체의 $0.6$만큼 쓰고 남은 것」 = $1.6$",
      ok: () => forwardReachable(pageNumbers("$4$ $0.6$"), R("1.6")),
    },
    {
      // 실측으로 놓쳤던 꼴 ⑵ — 두 곱의 합.
      label: "양성 — 「$2.3$ m 막대 $2$개와 $1.1$ m 막대 $3$개」 = $7.9$",
      ok: () => forwardReachable(pageNumbers("$2.3$ $2$ $1.1$ $3$"), R("7.9")),
    },
    {
      // 거짓 경보의 뿌리 — 「$1$보다 작은」의 `$1$` 로 곱셈을 흉내 내면 안 된다.
      label: "음성 — `$1$` 을 곱해 만든 뺄셈은 «순방향»이 아니다",
      ok: () => !forwardReachable(pageNumbers("$1$ $3.5$ $3$"), R("0.5")),
    },
    {
      label: "음성 — 되짚기 문항은 순방향으로 안 닿는다 (심화중 실물)",
      ok: () => !forwardReachable(pageNumbers("$6$ $0.48$"), R("4.8")),
    },
    {
      label: "음성 — 인수 되짚기도 안 닿는다 (심화상 실물)",
      ok: () => !forwardReachable(pageNumbers("$1.6$ $0.8$ $6$ $9$"), R("0.2")),
    },
    {
      label: "양성 — 답이 발문의 수 그대로면 닿는다",
      ok: () => forwardReachable(pageNumbers("$7$ $2$"), R("7")),
    },
    {
      label: "지면 읽기 — 식 안의 수도 전부 뽑는다",
      ok: () => pageNumbers("$0.9\\times5=4.5$").length === 3,
    },
    {
      label: "지면 읽기 — KaTeX 밖 숫자는 안 센다 (R1 을 믿는다)",
      ok: () => pageNumbers("보기 3개 중 $2$").length === 1,
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

  const args = process.argv.slice(2);
  const grade = args.find((a) => a.startsWith("초"));
  const chapter = args.find((a) => /^\d+-\d+/.test(a));
  const rows = sweep(grade, chapter);
  if (rows.length === 0) {
    console.log("훑은 문항이 없다 — 범위를 확인하십시오.");
    process.exit(2);
  }

  const byTier = new Map<string, { n: number; reach: number }>();
  for (const r of rows) {
    const t = byTier.get(r.tier) ?? { n: 0, reach: 0 };
    t.n += 1;
    if (r.reachable) t.reach += 1;
    byTier.set(r.tier, t);
  }

  console.log(
    `되짚기 축 반증 ④·⑥ — ${grade ?? "전 학년"}${chapter ? ` ${chapter}` : ""} · 문항 ${rows.length}건 (씨앗 ${SEEDS.length})\n`,
  );
  console.log("  갈래      n     순방향으로 닿는 비율");
  for (const [tier, t] of byTier) {
    console.log(
      `  ${tier.padEnd(6)} ${String(t.n).padStart(5)}     ${((t.reach / t.n) * 100).toFixed(1).padStart(6)}%`,
    );
  }

  // ⑥ — 중·상이 순방향으로 닿으면 그 문항은 그 갈래가 아니다.
  const six = rows.filter(
    (r) => (r.tier === "심화중" || r.tier === "심화상") && r.reachable,
  );
  // ④ — 연산·기본·응용이 **안 닿으면** 그 소단원에서는 이 축이 난이도를 안 가른다.
  const lower = new Set(["연산", "기본", "응용"]);
  const flat = new Map<string, number>();
  for (const r of rows) {
    if (!lower.has(r.tier) || r.reachable) continue;
    const key = `${r.grade} ${r.code}`;
    flat.set(key, (flat.get(key) ?? 0) + 1);
  }

  console.log(
    `\n⑥ 중·상인데 순방향으로 닿는 문항 ${six.length}건` +
      (six.length
        ? `\n   ${[...new Set(six.map((r) => `${r.grade} ${r.code} «${r.tier}»`))].slice(0, 12).join(" · ")}`
        : ""),
  );
  console.log(
    `④ 연산·기본·응용이 이미 순방향으로 **안 닿는** 소단원 ${flat.size}개` +
      (flat.size
        ? `\n   ${[...flat.entries()]
            .map(([k, v]) => `${k}(${v})`)
            .slice(0, 12)
            .join(" · ")}` +
          `\n   → 이 소단원들에서는 되짚기 축이 난이도를 안 가를 수 있다. **채우기 전에 사람이 본다.**`
        : ""),
  );
  console.log(
    "\n⚠️ 중·상 쪽 0 은 절반이 동어반복이다(생성기가 같은 성질을 이미 거른다).\n" +
      "   이 자의 값어치는 ④ 쪽에 있다 — 머리말의 «못 보는 것»을 먼저 읽어라.",
  );
  process.exitCode = six.length > 0 ? 1 : 0;
}

if (isDirectScript(import.meta.url)) main();
