/**
 * census — **네 갈래가 «실제로 어떤 발문 꼴»로 나타나는가** (D-72 축, 학년별).
 *
 *   npx tsx scripts/qa/census-elem-tier-frames.ts 초3           # 갈래별 발문 틀 분포
 *   npx tsx scripts/qa/census-elem-tier-frames.ts 초3 --tails   # 갈래별 «지시문 꼬리»
 *   npx tsx scripts/qa/census-elem-tier-frames.ts 초3 --unit=2-3-3  # 한 소단원 네 갈래
 *   npx tsx scripts/qa/census-elem-tier-frames.ts 초3 --top=40  # 몇 종까지 찍나 (기본 25)
 *   npx tsx scripts/qa/census-elem-tier-frames.ts 초3 --tails --show='$N$' --tier=심화
 *                                              # 그 꼴 뒤의 **실제 발문**을 펴 본다
 *
 * ⚠️ `--show` 는 **분포를 믿기 전에 꼴이 무엇을 뭉쳤는지 펴 보라고** 있다. 꼴은
 *    뭉치는 물건이라 「무엇이 한 칸에 들어갔나」를 안 보면 수를 잘못 읽는다 — 실제로
 *    초3 심화 꼬리 «$N$» 66건은 «맨 계산»이 아니라 **지시문 뒤에 수식 줄이 따로
 *    붙은 것**이었다(`--show` 로 확인). 그걸 안 펴고 적었으면 거짓을 보고할 뻔했다.
 *
 * ## 왜 있나
 *
 * 난이도 벤치마킹은 「우리 심화가 시중 기준의 어디쯤인가」를 묻는다. 그러려면 먼저
 * **「우리 4단은 무슨 꼴인가」**를 적을 수 있어야 하는데, 그 표를 **머리로 지으면
 * 목록에 없는 부류가 구조적으로 0이 된다**(CLAUDE.md 2026-08-18 「목록을 손으로 쓰면
 * 세는 쪽과 고치는 쪽이 같이 눈이 먼다」). 그래서 실제 발문을 훑어서 뽑는다.
 *
 * `probe-elem-tier-ladder.ts --census` 는 **심화 첫머리**만, `census-elem-stem-frames.ts`
 * 는 **틀의 개수**만 센다. 여기서 더한 축은 **갈래별로 꼴을 나란히 늘어놓는 것**이다 —
 * 「1단과 2단이 같은 꼴인가」는 넷을 같은 자에 대야 보인다.
 *
 * ## 이것은 판정기가 아니다 — **연장**이다
 *
 * 아무것도 판정하지 않는다. `exit 0` 이 「깨끗」을 뜻하지 않는다. 이름이 `probe-` 가
 * 아닌 것도 그래서다 — 관문 쓸기(`sweep-elem-probes.mjs`)는 `probe-elem-*` 만 훑으므로
 * 여기 걸리지 않는다. **수를 늘어놓을 뿐, 「이 꼴이면 몇 단」이라고 단정하지 않는다.**
 * 단정은 사람이 `dev/tier-bench` 에서 넷을 눈으로 보고 한다.
 *
 * ## 못 재는 것
 *
 * **꼴은 난이도가 아니다.** 같은 「구하시오」가 한 걸음일 수도 세 걸음일 수도 있다.
 * 이 census 가 답하는 것은 «무슨 말투로 묻는가» 하나뿐이고, 「그래서 4단인가」는
 * `probe-elem-tier-4dan.ts` 조차 못 잰다고 제 머리말에 적어 두었다.
 */
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { SweepTally, openFence } from "./elemProbeFence";

/** 씨앗 — 한 갈래가 씨앗마다 다른 문형을 낸다. 하나만 보면 그 갈래가 구조적으로 안 보인다. */
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

const args = process.argv.slice(2);
const grade = args.find((a) => a.startsWith("초"));
const unitArg = args
  .find((a) => a.startsWith("--unit="))
  ?.slice("--unit=".length);
const topArg = args.find((a) => a.startsWith("--top="))?.slice("--top=".length);
const showArg = args
  .find((a) => a.startsWith("--show="))
  ?.slice("--show=".length);
const tierArg = args
  .find((a) => a.startsWith("--tier="))
  ?.slice("--tier=".length);
const wantTails = args.includes("--tails");
const TOP = topArg ? Number(topArg) : 25;

if (!grade) {
  console.log(
    "학년을 주십시오 — 예: npx tsx scripts/qa/census-elem-tier-frames.ts 초3",
  );
  process.exit(2);
}

/**
 * **발문 틀** — 수와 수식을 지운 지문. `census-elem-stem-frames.ts` 와 같은 규칙이다
 * (거기서 옮겨 적었다면 한쪽만 고쳐도 아무도 모른다 — 규칙이 같은 곳을 보게 둔다).
 */
function frameOf(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "$N$")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * **지시문 꼬리** — 발문이 실제로 «무엇을 하라»고 하는가.
 *
 * 틀은 소재까지 담아서 종이 많다(초3 실측 수백 종). 꼬리는 말투만 남기므로 갈래끼리
 * 견주기 쉽다. 마지막 문장을 잡고 수·수식을 지운다.
 */
function tailOf(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  const parts = flat.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 0);
  const last = parts[parts.length - 1] ?? flat;
  return last
    .replace(/\$[^$]*\$/g, "$N$")
    .replace(/\d+/g, "N")
    .trim();
}

const units = elementaryUnits().filter(
  (u) =>
    u.grade === grade &&
    supportedTiers(u).length > 0 &&
    (!unitArg || u.section.startsWith(unitArg)),
);

if (units.length === 0) {
  console.log(`맞는 소단원이 없습니다: ${grade} ${unitArg ?? ""}`);
  process.exit(2);
}

const fence = openFence({ grades: [grade] });
const tally = new SweepTally();

// 한 소단원만 물으면 네 갈래를 그대로 찍는다 — 세지 않고 보여 준다.
if (unitArg) {
  for (const u of units) {
    console.log(`\n${"=".repeat(72)}\n${u.grade} ${u.section}`);
    for (const tier of ELEM_TIERS) {
      tally.count(u.grade, u.section, tier, 1);
      const p = generateElementaryProblem(u, SEEDS[0]!, tier);
      console.log(`\n  [${tier}]`);
      console.log(`    발문 ${p.content.replace(/\n+/g, " / ")}`);
      console.log(`    답   ${p.answer}`);
      console.log(`    꼬리 ${tailOf(p.content)}`);
    }
  }
  tally.assertNonEmpty();
  fence.close();
  console.log(
    `\n훑은 것 — ${tally.line()} · ${fence.scopeLine()}\n` +
      "⚠️ 이 연장은 판정하지 않는다. 넷을 눈으로 보라고 늘어놓은 것뿐이다.",
  );
  process.exit(0);
}

// `--show` — 한 꼴 뒤의 **실제 발문**을 편다. 꼴은 뭉치는 물건이라, 수를 읽기 전에
// 「무엇이 한 칸에 들어갔나」를 봐야 한다.
if (showArg !== undefined) {
  const tiers = tierArg ? [tierArg] : [...ELEM_TIERS];
  let hit = 0;
  for (const unit of units) {
    for (const tier of tiers) {
      tally.count(unit.grade, unit.section, tier, SEEDS.length);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(
          unit,
          seed,
          tier as (typeof ELEM_TIERS)[number],
        );
        const key = wantTails ? tailOf(p.content) : frameOf(p.content);
        if (key !== showArg) continue;
        hit += 1;
        if (hit <= 15) {
          console.log(`\n--- ${unit.section} [${tier}] 씨앗 ${seed}`);
          console.log(`    ${p.content.replace(/\n+/g, " / ")}`);
          console.log(`    답 ${p.answer}`);
        }
      }
    }
  }
  tally.assertNonEmpty();
  fence.close();
  console.log(
    `\n«${showArg}» 에 해당하는 문항 ${hit}건 (위에 ${Math.min(hit, 15)}건만 폈다)\n` +
      `훑은 것 — ${tally.line()} · ${fence.scopeLine()}`,
  );
  process.exit(0);
}

/** 갈래 → (꼴 → 몇 번) */
const perTier = new Map<string, Map<string, number>>();
/** 갈래 → (꼴 → 그 꼴을 낸 소단원들) — 「한 소단원이 혼자 만든 꼴인가」를 가른다. */
const perTierUnits = new Map<string, Map<string, Set<string>>>();

for (const tier of ELEM_TIERS) {
  perTier.set(tier, new Map());
  perTierUnits.set(tier, new Map());
}

for (const unit of units) {
  for (const tier of ELEM_TIERS) {
    tally.count(unit.grade, unit.section, tier, SEEDS.length);
    const bucket = perTier.get(tier)!;
    const owners = perTierUnits.get(tier)!;
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, tier);
      const key = wantTails ? tailOf(p.content) : frameOf(p.content);
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key)!.add(unit.section);
    }
  }
}

tally.assertNonEmpty();
fence.close();

console.log(
  `${grade} — 갈래별 ${wantTails ? "지시문 꼬리" : "발문 틀"} 분포\n` +
    `훑은 것 — ${tally.line()} · ${fence.scopeLine()}\n`,
);

for (const tier of ELEM_TIERS) {
  const bucket = perTier.get(tier)!;
  const owners = perTierUnits.get(tier)!;
  const sorted = [...bucket].sort((a, b) => b[1] - a[1]);
  console.log(`${"=".repeat(72)}\n[${tier}]  ${bucket.size}종`);
  for (const [key, cnt] of sorted.slice(0, TOP)) {
    const u = owners.get(key)!;
    console.log(
      `  ${String(cnt).padStart(4)}  (소단원 ${String(u.size).padStart(2)})  ${key.slice(0, 150)}`,
    );
  }
  if (sorted.length > TOP) console.log(`  … 그 밖 ${sorted.length - TOP}종`);
  console.log("");
}

console.log(
  "⚠️ **꼴은 난이도가 아니다.** 같은 「구하시오」가 한 걸음일 수도 세 걸음일 수도 있다.\n" +
    "   이 census 가 답하는 것은 «무슨 말투로 묻는가» 하나뿐이다 — 「그래서 몇 단인가」는\n" +
    "   사람이 /dev/tier-bench 에서 넷을 나란히 보고 판단한다.",
);
