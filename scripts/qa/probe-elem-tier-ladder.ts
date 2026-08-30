/**
 * **심화가 4단인가** — 난이도 사다리가 실제로 오르는지 본다 (D-72).
 *
 *   npx tsx scripts/qa/probe-elem-tier-ladder.ts            # 전 학년
 *   npx tsx scripts/qa/probe-elem-tier-ladder.ts 초5        # 한 학년만
 *   npx tsx scripts/qa/probe-elem-tier-ladder.ts --census   # 심화 발문의 첫머리 분포
 *   npx tsx scripts/qa/probe-elem-tier-ladder.ts --selftest # 이 판정기가 눈이 멀었나
 *
 * 「끝났다」 = 위반 **0**.
 *
 * ⚠️ **이 파일은 두 판을 합친 것이다** (2026-08-23). 리드가 같은 일을 g5·g3 에게 잇달아
 *    배분해 두 판이 따로 만들어졌고, 미커밋 상태라 한쪽이 다른 쪽을 덮어썼다.
 *    합치면서 **각자 상대에게 없던 것**을 남겼다 — 어느 한쪽을 되살리는 것보다 낫다:
 *      · g3 → **울타리·분모**(`elemProbeFence`)와 **실물 눈금**. 아래 ㉢ 참조.
 *      · g5 → **`--census`** 로 고른 열쇠와 좁은 표지 목록. 아래 ㉠ 참조.
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────────────
 * 2026-08-23 검수에서 초5 2-2-4·2-4-7 의 네 갈래가 **사다리가 거꾸로**였다.
 * 2-4-7 은 연산 `5.56×1000` · 기본 `193×0.01` 로 **1단이 두 번** 서고, 응용이
 * `40.9×□=4.09`(역산 = D-72 **4단** 표지), 심화가 `9.18×100×0.1`(두 단계 = **3단**)
 * 이었다. 2-2-4 는 응용이 「잘못하여 자연수 부분만 곱해」 — D-72 가 4단 예시로
 * **글자 그대로** 드는 문형 — 이고 심화가 맨 「계산하시오」였다.
 *
 * **값도 조사도 판정기도 전부 초록이었다.** 그 축을 아무도 안 세고 있었기 때문이다.
 * diff 를 읽고 변이를 돌렸을 뿐, 「네 갈래를 나란히 렌더해 1→2→3→4 가 오르는가」를
 * 한 번도 안 물었다 — 「없는 축은 변이시킬 수 없다」의 그 자리다.
 * **사람이 잊으면 사라지는 점검은 점검이 아니다.**
 *
 * ── 무엇을 재고, 무엇을 **안** 재나 ──────────────────────────────────────────
 * ㉠ **잰다**: 심화가 맨 「계산하시오」인데 4단 표지가 하나도 없다. 4단의 **최저선**이다.
 *
 * ㉡ **안 잰다 — 사다리의 «높이»**. 「이 심화가 응용보다 어려운가」는 못 묻는다.
 *    그리고 「4단 표지가 **응용에** 있다」도 안 잰다: 리드 실측 6건 중 **4건이 거짓**
 *    이었다(심화가 **말로** 역산을 걸면 기호만 보는 열쇠에 안 잡힌다).
 *    **거짓 경보는 가드를 끈다**(CLAUDE.md 2026-08-20).
 *
 * ㉡-b **1↔2단 뒤집힘도 안 잰다 — 재 보고 접었다** (2026-08-24, elem-g3).
 *    초3 2-3-3 에서 기본이 1단보다 쉬운 자리가 실제로 났다(「반지름 $r$ 인 원을 그리려면
 *    몇 cm 벌리나」 — 답이 곧 $r$ 이라 한 단계도 없다). **눈으로만 나왔다.**
 *
 *    열쇠 셋을 전 학년 **10,944문항 / 228소단원**에 대 봤다:
 *      · 「해설 걸음 0」            2,317 (21.2%) — 갈래를 안 가린다
 *      · 「연산 걸음 > 기본 걸음」   26/228 — 눈으로 본 **4/4 가 정상**
 *      · 「답이 발문의 수 그대로」   142 → 좁혀도 68 — 좁힐 때마다 **새 정상 부류**가 나온다
 *
 *    ⚠️ 둘째는 **구조적으로 엉뚱한 것을 잰다.** D-72 가 2단을 「식을 **스스로 세움**」으로
 *    정의하므로 2단의 어려움은 **계산 걸음이 아니라 번역**이다 — 「기본의 걸음이 적다」는
 *    **정상의 정의**지 결함이 아니다. 표본이 아니라 **정의**로 닫힌다.
 *
 *    🔴 **난이도는 지면에 없다.** 값·조사·그림·렌더는 지면에 있는 것이라 잰다. 그런데
 *    「이 문항이 저 문항보다 쉬운가」는 **학생이 무엇을 해야 하는가**이고 그건 지면에
 *    없다 — 같은 「걸음 0」이 한쪽에서는 결함(답을 그대로 옮겨 적음)이고 다른 쪽에서는
 *    개념(「밀어도 크기는 변하지 않는다」)이다. **열쇠가 아니라 축이 없는 자리**라
 *    문턱을 옮겨도 안 갈린다.
 *
 *    그래서 판정기 대신 **연장**을 뒀다 — `scripts/qa/dump-elem-tiers.ts` 가 네 갈래를
 *    나란히 찍는다. 이 결함도 그걸로 나왔다. 사람이 보는 것이 지금으로선 유일한 그물이다.
 *
 * ㉣ **눈금은 «배선»을 못 지킨다.** `--selftest` 는 `isFlatDeep` 을 **직접** 부르므로,
 *    쓸기가 어느 갈래를 보는지(`"심화하"`)를 바꿔도 눈금은 초록이다. 실측(2026-08-23):
 *    `"심화하"` → `"응용"` 으로 바꾸니 **눈금 종료 0**(못 잡음), 전량 쓸기 종료 1(잡음).
 *    이번엔 쓸기가 잡았지만 그건 **오늘 자료 덕**이다 — 응용에는 맨 「계산하시오」가
 *    정상으로 있어서 갈래를 잘못 보면 걸린다. 그런 갈래가 없어지는 날 이 그물은
 *    조용히 사라진다. **배선을 지키는 것은 눈금이 아니라 사람이 읽는 것뿐이다.**
 *    (같은 구멍이 `probe-elem-rules` 에도 있다 — g3 이 변이로 확인, 판정기 공통 구조.)
 *
 * ㉢ **울타리** — 재는 동안 생성기가 바뀌면 수치를 내지 않고 멈춘다. 오르카 다중
 *    세션이 한 워크트리에서 `g3~g6.ts` 를 동시에 고치므로, 이게 없으면 「0」이
 *    «깨끗해서 0»인지 «반쯤 저장된 파일을 봐서 0»인지 **구분되지 않는다.**
 *    변이 하네스가 도는 중이면 이 판정기는 (옳게) 멈춘다.
 */
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { SweepTally, openFence } from "./elemProbeFence";

/** 씨앗 — 갈래가 씨앗으로 갈라지는 경우가 있어 하나로는 못 본다. */
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

/**
 * 「맨 계산 지시로 **시작**하는가」.
 *
 * **「시작」이 열쇠다.** 「**계산 결과가** $11111$ 이 되는 계산식을 쓰시오」는 훌륭한
 * 4단인데 `/계산/` 으로 재면 걸린다 — 리드의 첫 판이 그래서 거짓 경보를 냈다.
 *
 * ⚠️ 꼴은 **손으로 지어낸 것이 아니라** `--census` 로 실제 심화 발문의 첫머리
 *    **534종**을 훑어 고른 것이다. 손 목록은 세는 쪽과 고치는 쪽을 같이 눈멀게
 *    한다(CLAUDE.md 2026-08-18) — 넓힐 때도 `--census` 를 **먼저** 볼 것.
 *    「계산식의 배열에서 …」(실측 12건)가 안 걸리는 것도 그 자리에서 확인했다.
 */
const BARE_CALC = /^계산하(시오|여라|여|세요|기)|^계산해\s*보시오/;

/**
 * **4단 표지** — 역산이거나 조건을 겹친 것.
 *
 * ⚠️ **넓히면 덜 민감해진다.** 위반 조건이 「맨 계산 **그리고** 표지가 하나도 없음」
 *    이라, 표지를 늘리면 거짓 경보가 주는 게 아니라 **진짜 결함을 놓칠 자리가 는다.**
 *    그래서 여기는 «검증된 좁은 목록»으로 둔다 — 넓히는 쪽이 안전해 보이지만 반대다.
 *
 * g3 판이 들고 있던 넓은 후보(범위 조건 `보다 크고…보다` · 최적 조건 `가장 큰` ·
 * 개수 세기 · 말로 하는 되짚기 `몇 층|몇 배` · 조건 겹침 `이면서|동시에`)는 **여기 안
 * 넣었다.** 그것들은 ㉡(응용도 판정하는 축)에서 쓸 것이고, 손으로 지은 목록이라
 * 검증이 안 됐다. **축을 넓히려면 그때 「새로 걸리는 것이 다 진짜인가」를 눈으로 볼 것.**
 */
const TIER4_MARKS: [string, RegExp][] = [
  ["기호 역산 (□)", /\\square|□/],
  ["잘못 계산 (D-72 4단 예시)", /잘못/],
  ["어떤 수", /어떤 수/],
  ["전체 조건 (D-72 «전체가 ~일 때»)", /전체[가의]|처음|원래/],
  ["거꾸로·반대로", /거꾸로|반대로/],
];

export type Ladder = { marks: string[]; bare: boolean };

/** 발문 하나를 읽는다. **참은 지면에서** — 생성기 속을 안 본다. */
export function readLadder(content: string): Ladder {
  const head = content.trim();
  return {
    bare: BARE_CALC.test(head),
    marks: TIER4_MARKS.filter(([, re]) => re.test(content)).map(([n]) => n),
  };
}

/** 「심화인데 맨 계산이고 표지가 하나도 없다」 — 그때만 결함이다. */
export function isFlatDeep(content: string): boolean {
  const l = readLadder(content);
  return l.bare && l.marks.length === 0;
}

/* ─────────────────────────── 눈금 ───────────────────────────
 *
 * ⚠️ **양성 대조군을 살아 있는 엔진에서 뽑지 않는다.** 지금 걸리는 갈래는 곧 고쳐지고,
 *    그러면 양성이 **사라져** 재현율을 영영 못 잰다 — 다 초록이라 잘 도는 것처럼 보인다
 *    (2026-08-20 「결함 든 시트만 대서 지어냄이 0으로 보였다」와 같은 자리).
 *    그래서 **그때 엔진이 실제로 낸 문자열을 그대로 박아** 둔다. 엔진이 고쳐져도 눈금은 남는다.
 *
 * ⚠️ 음성 넷(초4 1-2-1·1-6-4·2-3-7 · 초6 1-6-2)은 **리드의 첫 정규식이 거짓으로 문**
 *    것들이다. 사다리는 제대로 오르는데 열쇠가 기호만 보고 **말로 된 역산·조건**을
 *    못 봐서 걸렸다. 여기 그대로 둔다 — 이 판정기가 그 넷에 걸리면 **이 판정기의 결함**이다.
 */
const GAUGE: [string, string, boolean][] = [
  // ── 양성 (걸려야) — 2026-08-23 그 두 갈래의 발문 실물 ──
  [
    "초5 2-2-4 심화 — 맨 계산 (실물)",
    "계산하시오.\n\n$2\\frac{3}{8}\\times2\\frac{8}{9}$",
    true,
  ],
  [
    "초5 2-4-7 심화 — 맨 계산 (실물)",
    "계산하시오.\n\n$9.18\\times100\\times0.1$",
    true,
  ],
  ["앞뒤 공백이 있어도", "  계산하시오.  $3\\times4$  ", true],
  ["다른 말투 — 계산해 보시오", "계산해 보시오.\n\n$3.5\\times2.4$", true],
  // ── 음성 (걸리면 이 판정기의 결함) — 리드 첫 판이 거짓으로 문 넷 ──
  [
    "초4 1-2-1 심화 — 범위 조건 (말로 하는 조건 조합)",
    "$60°$ 보다 크고 $118°$ 보다 작은 각은 몇 개입니까?",
    false,
  ],
  [
    "초4 1-6-4 심화 — 결과에서 식을 만든다 («계산»으로 시작하지만 역산)",
    "계산 결과가 $11111$ 이 되는 계산식을 쓰시오.",
    false,
  ],
  [
    "초4 2-3-7 심화 — 최적 조건",
    "두 수를 골라 차가 가장 작을 때의 값을 구하시오.",
    false,
  ],
  [
    "초6 1-6-2 심화 — 말로 하는 되짚기",
    "쌓은 부피가 $240\\,cm^3$ 일 때 몇 층으로 쌓았습니까?",
    false,
  ],
  // ── 경계 ──
  // □ 를 곱셈 꼴로만 대면 「□ 가 있다」가 아니라 「`\times` 가 있다」를 재고 있어도
  // 통과한다. 덧셈 꼴을 같이 둔다(g3 이 짚어 준 경계).
  [
    "경계 — 맨 계산으로 보여도 □ 가 있으면 4단 (덧셈 꼴)",
    "계산하시오.\n\n$\\square+5=12$",
    false,
  ],
  [
    "경계 — □ 가 있으면 4단 (곱셈 꼴)",
    "계산하시오.  $\\square\\times\\frac{2}{3}=\\frac{4}{9}$",
    false,
  ],
  [
    "경계 — 「계산 결과」는 「계산하시오」가 아니다",
    "계산 결과가 가장 큰 것을 고르시오.",
    false,
  ],
  [
    "경계 — 말로 건 역산 (초5 2-4-7 새 심화)",
    "어떤 수에 $10$을 곱했더니 $37.3$이 되었습니다. 어떤 수에 $100$을 곱하면 얼마입니까?",
    false,
  ],
  [
    "경계 — 잘못 계산 문형 (초5 2-2-4 새 심화)",
    "$1\\frac{5}{8}\\times2$를 계산해야 하는데, 잘못하여 자연수 부분만 곱해 $2$라고 답했습니다. 차를 구하시오.",
    false,
  ],
  ["경계 — 문장형 심화", "상자 $3$개의 무게는 몇 kg입니까?", false],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, content, want] of GAUGE) {
    const got = isFlatDeep(content);
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

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
const census = process.argv.includes("--census");

const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
const tally = new SweepTally();

const units = elementaryUnits().filter(
  (u) => supportedTiers(u).length > 0 && (!gradeArg || u.grade === gradeArg),
);

if (census) {
  // 발문 첫머리 분포 — **열쇠를 손으로 짓지 않기 위한** 자리다.
  const heads = new Map<string, number>();
  for (const u of units) {
    tally.count(u.grade, u.section, "심화하", SEEDS.length);
    for (const seed of SEEDS) {
      const c = generateElementaryProblem(u, seed, "심화하").content.trim();
      heads.set(
        c.slice(0, 10).replace(/\s+/g, " "),
        (heads.get(c.slice(0, 10).replace(/\s+/g, " ")) ?? 0) + 1,
      );
    }
  }
  tally.assertNonEmpty();
  fence.close();
  for (const [head, cnt] of [...heads].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(cnt).padStart(4)}  ${head}`);
  console.log(
    `\n심화 발문 첫머리 ${heads.size}종 — 훑은 것 ${tally.line()} · ${fence.scopeLine()}`,
  );
  process.exit(0);
}

const flat: string[] = [];
for (const unit of units) {
  // ⚠️ 세는 것은 **실제로 만들어 본 것**만이다. 안 만든 갈래까지 분모에 넣으면
  //    「훑었다」가 부풀고, 그 분모를 보고 다음 사람이 안심한다.
  tally.count(unit.grade, unit.section, "심화하", SEEDS.length);
  const hits = SEEDS.filter((s) =>
    isFlatDeep(generateElementaryProblem(unit, s, "심화하").content),
  );
  if (hits.length === 0) continue;
  const sample = generateElementaryProblem(unit, hits[0]!, "심화하");
  flat.push(
    `${unit.grade} ${unit.section}\n      씨앗 ${hits.length}/${SEEDS.length}` +
      `\n      ${sample.content.replace(/\n+/g, " ⏎ ").slice(0, 110)}`,
  );
}

tally.assertNonEmpty();
fence.close();

console.log(
  `훑은 것 — ${tally.line()} · ${fence.scopeLine()}\n` +
    `(재는 것은 **심화가 맨 계산인가** 하나뿐이다 — 「응용보다 어려운가」는 못 잰다.\n` +
    ` 갈래 축은 ${ELEM_TIERS.length}단(D-113)이지만 여기서 보는 것은 «심화하»뿐이다.\n` +
    ` 확대 갈래(심화중·심화상)가 차면 그 높이는 이 자가 아니라 사람이 본다)\n`,
);
if (flat.length === 0) {
  console.log("✅ 맨 계산인 심화 0");
} else {
  console.log(
    `❌ 맨 계산인 심화 ${flat.length}갈래 — **3·4단이 뒤집혔을 수 있다**`,
  );
  for (const f of flat) console.log(`  · ${f}`);
}
console.log(
  "\n⚠️ 0 은 «깨끗»과 «못 셈»을 구분해 주지 않는다 — `--selftest` 로 이 판정기가" +
    "\n   걸릴 수 있는지부터 확인하고, 열쇠를 넓힐 때는 `--census` 를 먼저 볼 것.",
);
process.exitCode = flat.length === 0 ? 0 : 1;
