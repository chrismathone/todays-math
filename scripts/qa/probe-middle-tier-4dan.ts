/**
 * **심화가 4단 모양인가 — 중등** (원장님 지적 2026-08-25).
 *
 *   npx tsx scripts/qa/probe-middle-tier-4dan.ts             # 전량
 *   npx tsx scripts/qa/probe-middle-tier-4dan.ts --list      # 걸린 유형의 발문까지
 *   npx tsx scripts/qa/probe-middle-tier-4dan.ts --selftest  # 이 판정기가 눈이 멀었나
 *
 * 「끝났다」 = **미검토 0**.
 *
 * ## 🔴 초등과 **다른 축을 쓴다** — 그리고 그 까닭이 이 파일의 값어치다
 *
 * 초등은 소단원마다 네 갈래를 **우리가** 등록하므로 D-72 의 4단 표지를 물을 수 있다.
 * 중등은 RPM 유형 873개에 **사람이 교재를 보고 적어 둔** 난이도가 정본이고, 4단은
 * 「역산·조건 조합」이 아니라 대개 **계산 자체가 어려운 것**이다. 그래서 초등의 표지
 * 목록을 그대로 대면 안 된다.
 *
 * **재 보고 버린 축 둘** (2026-08-25, 다시 하지 말 것):
 *
 *  ⑴ **대조 census — 심화 발문 vs 기본·응용 발문의 말투.** 초등에서는 「잘못하여」가
 *     심화 177 / 응용·기본 **0** 처럼 갈렸는데, 중등은 가장 센 후보가
 *     「구하시오 (단 ◇」(심화 11 / 그 밖 2)뿐이고 그건 단서 조항이지 4단 표지가 아니다.
 *     **중등 심화는 발문이 응용과 같은 모양이다** — 어려운 것이 발문이 아니라 식이다.
 *
 *  ⑵ **같은 중단원에서 «식의 무게»(연산자·근호·괄호·거듭제곱 수) 견주기.**
 *     11유형이 걸렸는데 눈으로 보니 **거의 다 거짓**이었다 —
 *     `4x^2-12xy+9y^2-9`(심화, 무게 5)가 `(x+5)^2+3(x+5)-4`(응용, 무게 7)보다
 *     쉽다는 뜻이 되고, `(x+2)(x+3)(x+4)(x+5)` 는 무게가 같은데 치환이 필요하다.
 *     **연산자 수는 난이도가 아니다.**
 *
 * ## 그래서 무엇을 재나 — **「식이 어려워야만 성립하는 심화」를 사람 앞에 세운다**
 *
 * 발문이 「지시 한 문장뿐이고 그 지시가 «주어진 식을 바꿔 다시 써라»」인 심화는,
 * 4단인 근거가 **식 자체**밖에 없다. 그 근거는 지면에 안 적혀 있으므로 **사람이 봐야**
 * 한다. 이 판정기는 그 목록을 만들고, 판정은 원장(`tier4-review.json` 의 `중등`)에 남는다.
 *
 * 열쇠(`loneInstruction` + 계산 지시)는 **새로 짓지 않았다** — D-106 이 밑단(`연산`)을
 * 가려내려고 873유형 census 로 이미 고른 것을 그대로 쓴다(`src/lib/middle/tier.ts`).
 * 같은 규칙을 두 벌로 적으면 한쪽만 고쳐도 아무도 모른다.
 *
 * ## 이 가드가 지키는 것 — **앞으로**
 *
 * 오늘 걸리는 16유형은 전부 사람이 보고 판정했다. 값어치는 **새 유형**에 있다 —
 * 873유형 중 등록이 계속 늘고 있고, 새로 등록된 심화가 「지시 한 줄 + 쉬운 식」이면
 * 여기서 «미검토»로 빨개진다.
 */
import { readFileSync } from "node:fs";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { loneInstruction } from "../../src/lib/middle/tier";

import { TIER4_LEDGER_PATH, type Tier4Ledger } from "./tier4Rules";

/** 씨앗 셋 — 유형이 씨앗에 따라 던지는 일이 있어 하나로는 못 본다. */
const SEEDS = [20260825, 5150131, 777003];

/**
 * 「주어진 식을 바꿔 다시 써라」인 지시.
 *
 * ⚠️ **`tier.ts` 의 `OPERATION_INSTRUCTION` 과 같은 뜻이어야 한다.** 그쪽은 밑단을
 *    내리는 데 쓰고 이쪽은 사람 앞에 세우는 데 쓴다 — 목적이 달라 export 되어 있지
 *    않지만, 갈라지면 「연산으로 내려간 유형」과 「심화로 사람이 볼 유형」의 잣대가
 *    달라진다. 시험이 두 정규식의 **낱말 집합이 같은지** 잠근다.
 */
export const OPERATION_INSTRUCTION_WORDS = [
  "계산하시오",
  "전개하시오",
  "인수분해하시오",
  "간단히 하시오",
  "간단히 나타내시오",
  "푸시오",
  "유리화하시오",
  "나타내시오",
] as const;

/** 「식만 주고 바꿔 쓰라고만 하는가」 — 맞으면 그 지시문, 아니면 `null`. */
export function bareOperationInstruction(content: string): string | null {
  const only = loneInstruction(content);
  if (!only) return null;
  const tail = only.replace(/\.$/, "");
  return OPERATION_INSTRUCTION_WORDS.some((w) => tail.endsWith(w))
    ? only
    : null;
}

/* ─────────────────────────── 눈금 ─────────────────────────── */

const GAUGE: [why: string, content: string, wantBare: boolean][] = [
  // ── 양성: 사람이 봐야 하는 모양 (실물) ──
  [
    "3-1 인수분해 18 — 지시 한 줄 + 식",
    "다음 식을 인수분해하시오.\n\n$4x^2-12xy+9y^2-9$",
    true,
  ],
  [
    "3-1 근호 15 — 「분모를 유리화하시오」",
    "다음 수의 분모를 유리화하시오.\n\n$\\dfrac{\\sqrt{2}+\\sqrt{5}}{\\sqrt{15}}$",
    true,
  ],
  [
    "1-1 일차방정식 13 — 「푸시오」",
    "다음 일차방정식을 푸시오.\n\n$\\dfrac{-5x+4}{3}=-0.9x-0.2$",
    true,
  ],
  // ── 음성: 상황·조건이 있으면 사람 앞에 안 세운다 ──
  [
    "조건이 문장 안에 있으면 아니다 (수식이 문장 속)",
    "$x=5+\\sqrt{3}$ 일 때, $x^2-10x+1$ 의 값을 구하시오.",
    false,
  ],
  [
    "상황이 있으면 아니다",
    "어느 중학교의 작년 전체 학생은 $700$명이었다. 올해의 남학생 수를 구하시오.",
    false,
  ],
  [
    "지시가 둘이면 아니다 (조건 문장 + 지시)",
    "다음 식이 유리수가 되도록 하는 유리수 $a$ 의 값을 구하시오.\n\n$2\\sqrt{11}(3-\\sqrt{11})+a(\\sqrt{11}+5)$",
    false,
  ],
  [
    "판별·선택은 계산 지시가 아니다 (D-106 이 이미 갈라 둔 자리)",
    "다음 수 중에서 소수의 개수를 구하시오.",
    false,
  ],
  [
    "「모두 고르시오」도 계산 지시가 아니다",
    "다음 중 옳은 것을 모두 고르시오.",
    false,
  ],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, content, want] of GAUGE) {
    const got = bareOperationInstruction(content) !== null;
    if (got !== want) bad += 1;
    console.log(
      `  ${got === want ? "✅" : "❌"} ${why} — 기대 ${want ? "걸림" : "안 걸림"} / 실제 ${got ? "걸림" : "안 걸림"}`,
    );
  }
  const pos = GAUGE.filter((g) => g[2]).length;
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (양성 ${pos} · 음성 ${GAUGE.length - pos})`
      : `\n❌ 눈금 ${bad}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/* ─────────────────────────── 전량 ─────────────────────────── */

const list = process.argv.includes("--list");
const ledger = JSON.parse(
  readFileSync(TIER4_LEDGER_PATH, "utf-8"),
) as Tier4Ledger;

let 유형수 = 0;
let 심화수 = 0;
let 못만든것 = 0;
const 미검토: string[] = [];
const 고칠것: string[] = [];
let 검토됨 = 0;

for (const t of registeredTypes()) {
  유형수 += 1;
  let p: ReturnType<typeof generateMiddleProblem> | null = null;
  for (const s of SEEDS) {
    try {
      p = generateMiddleProblem(t.key, s);
      break;
    } catch {
      /* 다음 씨앗 */
    }
  }
  // ⚠️ **못 만든 유형을 조용히 빼지 않는다** — 분모가 줄면 「0」이 «깨끗»인지
  //    «못 셈»인지 안 갈린다.
  if (!p) {
    못만든것 += 1;
    continue;
  }
  if (p.difficulty !== "심화") continue;
  심화수 += 1;
  const only = bareOperationInstruction(p.content);
  if (!only) continue;
  const row = ledger.중등[t.key];
  const 자리 =
    `${t.key}  ${t.rpmTitle}` +
    (list ? `\n      ${p.content.replace(/\n+/g, " ⏎ ").slice(0, 130)}` : "");
  if (!row) 미검토.push(자리);
  else if (row.판정 === "고칠것") 고칠것.push(`${자리} — ${row.왜}`);
  else 검토됨 += 1;
}

console.log(
  `훑은 것 — 등록 유형 ${유형수} · 그중 심화 ${심화수} · 씨앗 셋으로도 못 만든 유형 ${못만든것}\n` +
    `(재는 것은 **심화인데 발문이 «지시 한 줄 + 식»뿐인가** 하나뿐이다 —\n` +
    ` 「그 식이 어려운가」는 지면에 없으므로 못 잰다. 그래서 사람 앞에 세운다)\n`,
);
console.log(
  `식만 주는 심화 ${검토됨 + 고칠것.length + 미검토.length}유형 —` +
    ` 사람이 4단이라 함 ${검토됨} · **고칠것 ${고칠것.length}** · 미검토 ${미검토.length}`,
);

if (고칠것.length > 0) {
  console.log(`\n⚠️ 고칠 잔고 ${고칠것.length}유형`);
  for (const f of 고칠것) console.log(`  · ${f}`);
}
if (미검토.length === 0) {
  console.log("\n✅ 미검토 0 — 식만 주는 심화는 전부 사람 판정이 원장에 있다");
} else {
  console.log(
    `\n❌ 미검토 ${미검토.length}유형 — **사람 판정이 없다.**` +
      `\n   \`--list\` 로 발문을 보고 판정을 ${TIER4_LEDGER_PATH} 의 «중등» 에 적어라.`,
  );
  for (const f of 미검토) console.log(`  · ${f}`);
}
if (못만든것 > 0) {
  console.log(
    `\n⚠️ 씨앗 셋으로도 못 만든 유형 ${못만든것} — 이 회차는 «전부 훑었다»가 아니다.`,
  );
}
process.exitCode = 미검토.length === 0 && 못만든것 === 0 ? 0 : 1;
