/**
 * 🟢 판정기 — **엔진이 「말 대신 기호」를 내는가.**
 *
 *   npx tsx scripts/qa/probe-wordy-operators.ts --selftest   # 눈금만
 *   npx tsx scripts/qa/probe-wordy-operators.ts              # 전수 쓸기
 *   npx tsx scripts/qa/probe-wordy-operators.ts --seeds 40
 *
 * ## 왜 DB 가 아니라 엔진을 재나
 *
 * 2026-08-25 「수리의 단위는 산출물이 아니라 **틀**」이라고 적어 놓고 **재는 단위는
 * 행**이었던 적이 있다. 그러면 「틀을 다 봤다」가 「DB 가 뽑은 갈래만 봤다」와 같은
 * 뜻이 된다 — 안 뽑힌 갈래는 구조적으로 0 이다.
 *
 * 그래서 이 판정기는 **등록된 유형·소단원을 전부 직접 돌려** 지면을 만들고, 거기에
 * 「말 대신 기호」가 있는지 본다. DB 를 안 읽으므로 다른 세션의 적재와 무관하다.
 *
 * ## 「없는 축은 변이시킬 수 없다」
 *
 * 이 부류는 KaTeX 가 초록이고 값도 맞다. 기존 가드 어느 쪽도 셀 수 없었다 —
 * 원장님이 화면에서 짚어 주실 때까지 **아무도 몰랐다.** 이 파일이 그 축이다.
 *
 * ## ⚠️ 눈금의 양성 대조군은 **문자열 픽스처**다
 *
 * 살아 있는 엔진을 양성으로 쓰면, 그 갈래를 고치는 순간 양성이 **사라지고** 재현율을
 * 영영 못 잰다(전량 초록이라 잘 도는 것처럼 보인다 — 2026-08-23 에 같은 함정).
 * 그래서 원장님이 짚으신 **옛 지면 그대로**를 픽스처로 박아 둔다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

import { hasWordyOperator, wordyOperatorHits } from "./wordyOperator";

const BS = String.fromCharCode(92);
const tex = (s: string) => s.split("§").join(BS);

/** 지면에 실제로 나가는 세 칸을 한 덩어리로 본다. */
const page = (p: {
  content: string;
  answer: string;
  solution?: string | null;
}) => `${p.content}\n${p.answer}\n${p.solution ?? ""}`;

function calibrate(): boolean {
  const checks: [boolean, string][] = [
    // ── 양성: 원장님이 짚으신 **옛 지면 그대로** (m1Num 09, 고치기 전) ──
    [
      hasWordyOperator(
        tex("소인수 $2$에서 $§min(a,§,3)=2$이다. 즉 $a=2$이다."),
      ),
      "양성 — 원장님이 짚으신 옛 해설을 잡는다",
    ],
    [
      hasWordyOperator(tex("소인수 $3$에서 $§max(2,§,b)=1$이다.")),
      tex("양성 — 짝인 $§max$ 도 잡는다"),
    ],
    [
      hasWordyOperator(tex("분자의 최대공약수 $§gcd(28,35)=7$")),
      tex("양성 — $§gcd$"),
    ],
    [hasWordyOperator(tex("$§lcm (15,18)=90$")), tex("양성 — $§lcm$")],
    [
      hasWordyOperator(tex("가장 작은 수는 $§mathrm{lcm}(10,12)=60$")),
      tex("양성 — 라벨 꼴 $§mathrm{lcm}$"),
    ],
    [hasWordyOperator(tex("$§deg R<n$")), tex("양성 — $§deg$")],
    // ── 음성: 여기서 «대상»이 나오면 지면이 통째로 뒤집힌다 ──
    [
      !hasWordyOperator(
        tex("소인수 $2$에서 $a$와 $3$ 중 최솟값이 $2$이다. 즉 $a=2$이다."),
      ),
      "음성 — **이미 말로 쓴** 해설에는 안 걸린다",
    ],
    [
      !hasWordyOperator(tex("$28$과 $35$의 최대공약수는 $7$이다.")),
      "음성 — 「최대공약수」를 말로 쓴 글",
    ],
    [
      !hasWordyOperator(tex("$§sin A$, $§cos B$, $§tan C$")),
      "음성 — 교과서가 가르치는 삼각비",
    ],
    [
      !hasWordyOperator(tex("$§log_2 8=3$, $§lim_{n§to§infty}a_n$")),
      "음성 — 로그·극한",
    ],
    [
      !hasWordyOperator(tex("$§sum_{k=1}^{9}a_k=12$, $§int_0^1 x§,dx$")),
      "음성 — 시그마·적분",
    ],
    [
      !hasWordyOperator(tex("$30§degree$")),
      tex("음성 — $§degree$ 는 $§deg$ 가 아니다"),
    ],
    [
      !hasWordyOperator(tex("$§det(A)=0$, $§mathrm{tr}(A)=3$")),
      "음성 — 행렬식·대각합은 그 단원의 교과 표기다(일부러 뺐다)",
    ],
    [
      !hasWordyOperator(tex("$a§equiv1§ (§mathrm{mod}§ 4)$")),
      "음성 — 합동식도 일부러 뺐다",
    ],
    // ── 「무엇이 걸렸는지」를 말할 수 있어야 한다 ──
    [
      wordyOperatorHits(tex("$§min(a,3)$와 $§max(2,b)$"))
        .map((h) => h.op)
        .join(",") === "min,max",
      "걸린 이름을 순서대로 댈 수 있다",
    ],
  ];
  console.log(`눈금 ${checks.length}건 (양성 6 · 음성 8 · 지목 1)`);
  for (const [ok, what] of checks) console.log(`${ok ? "✅" : "❌"} ${what}`);
  const bad = checks.filter(([ok]) => !ok).length;
  if (bad) console.log(`🔴 눈금이 안 맞는다 — 판정을 믿을 수 없다 (${bad}건)`);
  return bad === 0;
}

interface Hit {
  where: string;
  n: number;
  names: string[];
  line: string;
}

function sweep(seeds: number) {
  const hits: Hit[] = [];
  let types = 0;
  let units = 0;
  let problems = 0;

  for (const t of registeredTypes()) {
    types += 1;
    let n = 0;
    const names = new Set<string>();
    let line = "";
    for (let seed = 1; seed <= seeds; seed += 1) {
      const text = page(generateMiddleProblem(t.key, seed));
      problems += 1;
      const found = wordyOperatorHits(text);
      if (found.length === 0) continue;
      n += 1;
      for (const f of found) names.add(f.name);
      if (!line)
        line =
          text
            .split("\n")
            .find((l) => hasWordyOperator(l))
            ?.slice(0, 150) ?? "";
    }
    if (n) hits.push({ where: `중등 ${t.key}`, n, names: [...names], line });
  }

  for (const unit of elementaryUnits()) {
    const tiers = supportedTiers(unit);
    if (tiers.length === 0) continue;
    units += 1;
    for (const tier of tiers) {
      let n = 0;
      const names = new Set<string>();
      let line = "";
      for (let seed = 1; seed <= seeds; seed += 1) {
        const text = page(generateElementaryProblem(unit, seed, tier));
        problems += 1;
        const found = wordyOperatorHits(text);
        if (found.length === 0) continue;
        n += 1;
        for (const f of found) names.add(f.name);
        if (!line)
          line =
            text
              .split("\n")
              .find((l) => hasWordyOperator(l))
              ?.slice(0, 150) ?? "";
      }
      if (n)
        hits.push({
          where: `초등 ${unit.grade} ${unit.section} «${tier}»`,
          n,
          names: [...names],
          line,
        });
    }
  }
  return { hits, types, units, problems };
}

function main() {
  if (!calibrate()) {
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--selftest")) return;

  const i = process.argv.indexOf("--seeds");
  const seeds = i >= 0 ? Number(process.argv[i + 1]) : 30;

  const { hits, types, units, problems } = sweep(seeds);

  // **분모를 반드시 찍는다** — 0 이 «깨끗»인지 «못 셈»인지 가른다.
  console.log(
    `\n훑은 것 — 중등 ${types}유형 · 초등 ${units}소단원 × 4갈래 · 씨앗 ${seeds}` +
      ` = 지면 ${problems.toLocaleString()}장`,
  );
  if (problems === 0) {
    console.log("🔴 한 장도 못 만들었다 — 이 초록은 «못 셈»이다");
    process.exitCode = 1;
    return;
  }

  console.log(`\n말 대신 기호 — ${hits.length}갈래`);
  for (const h of hits.sort((a, b) => b.n - a.n))
    console.log(
      `   · ${h.where} ${h.n}/${seeds} [${h.names.join(" ")}] :: ${h.line}`,
    );

  console.log(hits.length === 0 ? "\n✅ 깨끗하다" : `\n🔴 ${hits.length}갈래`);
  process.exitCode = hits.length === 0 ? 0 : 1;
}

main();
