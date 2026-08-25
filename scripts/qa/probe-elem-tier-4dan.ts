/**
 * **심화가 4단 모양인가 — 초등** (D-72, 원장님 지적 2026-08-25).
 *
 *   npx tsx scripts/qa/probe-elem-tier-4dan.ts             # 전 학년
 *   npx tsx scripts/qa/probe-elem-tier-4dan.ts 초5         # 한 학년만
 *   npx tsx scripts/qa/probe-elem-tier-4dan.ts --census    # 표지를 «고른 자리»
 *   npx tsx scripts/qa/probe-elem-tier-4dan.ts --list      # 사람이 볼 몫을 응용과 나란히
 *   npx tsx scripts/qa/probe-elem-tier-4dan.ts --selftest  # 이 판정기가 눈이 멀었나
 *
 * 「끝났다」 = **미검토 0**. 규칙과 「무엇을 못 재나」는 `tier4Rules.ts` 머리말에 있다.
 *
 * ## 이 판정기가 지키는 것 — **앞으로**
 *
 * 원장님이 「앞으로 엔진으로 출제하게 되는 문제들의 난이도도 지금과 같으면 아주 큰
 * 문제」라고 하셨다. 그래서 이 가드는 **오늘의 230갈래를 세는 것이 목적이 아니다** —
 * 새로 등록되는 심화 갈래가 **표지를 갖거나 사람 판정을 받거나** 둘 중 하나이게 만드는
 * 것이 목적이다. 둘 다 아니면 `미검토` 로 빨개진다.
 *
 * ## 왜 「고칠것」으로는 안 빨개지나
 *
 * 오늘 원장에 `고칠것` 이 **35갈래** 있다(초등 230갈래 중). 그것으로 관문을 빨갛게 두면 그 잔고가
 * 다 고쳐질 때까지 **다른 세션 전부**가 빨간 관문을 보게 되고, 그러면 훅을 우회한다 —
 * **늘 우는 가드는 꺼진다**(CLAUDE.md 2026-08-20). 그래서 잔고는 **시험이 «정확히»**
 * 잠근다(`src/__tests__/unit/tier4Ladder.test.ts`) — 늘어도 줄어도 빨개지므로
 * 조용히 늘지 못하고, 고치면 수를 내려 적어야 한다.
 *
 * ## 씨앗을 12개 쓰는 까닭
 *
 * 한 갈래가 씨앗마다 다른 문형을 낸다. 실측으로 초4 1-2-5 는 12개 중 **4개만**
 * 맨 나눗셈(`180÷3`)이고 나머지는 조건이 붙는다. 씨앗 하나만 보면 그 4개가
 * 구조적으로 안 보인다.
 */
import { readFileSync } from "node:fs";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { SweepTally, openFence } from "./elemProbeFence";
import {
  TIER4_LEDGER_PATH,
  type Tier4Ledger,
  elemKey,
  judgeDeep,
  marksOf,
} from "./tier4Rules";

const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

function loadLedger(): Tier4Ledger {
  return JSON.parse(readFileSync(TIER4_LEDGER_PATH, "utf-8")) as Tier4Ledger;
}

/* ─────────────────────────── 눈금 ───────────────────────────
 *
 * ⚠️ **양성·음성을 문자열로 박는다.** 살아 있는 엔진에서 뽑으면, 그 갈래를 고치는
 *    순간 양성이 **사라져** 재현율을 영영 못 잰다(2026-08-20 「결함 든 시트만 대서
 *    지어냄이 0으로 보였다」와 같은 자리). 아래는 **2026-08-25 에 엔진이 실제로 낸
 *    문자열**이다 — 엔진이 고쳐져도 눈금은 남는다.
 *
 * ⚠️ 음성은 「표지가 있어야 하는데 이 판정기가 못 보면 결함」인 것들이다. 그중 넷은
 *    **말로 건 역산·조건**이라 2026-08-23 판이 거짓으로 물었던 바로 그 문형이다.
 */
const GAUGE: [why: string, content: string, wantBare: boolean][] = [
  // ── 양성: 표지가 **없어야** 한다 (사람이 볼 몫) — 전부 실물 ──
  [
    // ⚠️ 「나타내었더니」는 되짚기처럼 **읽히지만** 표지 목록에 없다 — 목록은 census 가
    //    고른 것이고 이 꼴은 심화 12건에 못 미쳤다. 그래서 표지 0 이고, 사람이 보고
    //    「한 걸음이라 4단이 아니다」로 판정했다. 넓혀서 이걸 표지로 만들면 **거꾸로**다.
    "초6 1-4-5 심화 — 「19%를 기약분수로」 (한 걸음, 표지 0)",
    "어떤 비율을 백분율로 나타내었더니 $19\\%$ 였습니다. 이 비율을 기약분수로 나타내시오.",
    true,
  ],
  [
    "초4 1-2-5 심화 — 「세 각이 모두 같은 삼각형의 한 각」 (맨 나눗셈)",
    "세 각의 크기가 모두 같은 삼각형의 한 각의 크기는 몇 도인가?",
    true,
  ],
  [
    "초6 1-4-2 심화 — 「기준량 8, 비교하는 양이 4 큰 비」 (한 걸음)",
    "기준량이 $8$이고 비교하는 양이 기준량보다 $4$만큼 큰 비를 쓰시오.",
    true,
  ],
  [
    "초3 1-6-6 심화 — 「$2.4$ cm는 몇 mm」 (단위 환산 한 번)",
    "연필의 길이는 $2.4$ cm입니다. 이 길이는 몇 mm인지 쓰시오.",
    true,
  ],
  [
    "초5 1-2-3 심화 — 「세 수의 최대공약수」 (응용에 수를 하나 더한 것)",
    "세 수 $16$, $24$, $32$의 최대공약수를 구하시오.",
    true,
  ],
  [
    "초6 2-3-2 심화 — 「같은 모양 6개에 66개, 한 모양은?」 (한 걸음)",
    "똑같은 모양 $6$개를 만드는 데 쌓기나무를 모두 $66$개 사용했습니다. 한 모양에 사용한 쌓기나무는 몇 개인가?",
    true,
  ],
  // ── 음성: 표지가 **있어야** 한다. 걸리면 이 판정기의 결함이다 ──
  [
    "초5 2-2-4 심화 — 잘못 계산 (D-72 가 글자 그대로 드는 4단 문형)",
    "$1\\frac{5}{8}\\times2$를 계산해야 하는데, 잘못하여 자연수 부분만 곱해 $2$라고 답했습니다. 차를 구하시오.",
    false,
  ],
  [
    "초5 2-4-7 심화 — 말로 건 역산",
    "어떤 수에 $10$을 곱했더니 $37.3$이 되었습니다. 어떤 수에 $100$을 곱하면 얼마입니까?",
    false,
  ],
  [
    "초4 1-2-1 심화 — 범위 겹침 (2026-08-23 판이 거짓으로 물었다)",
    "네 각의 크기가 $106^\\circ$, $67^\\circ$, $50^\\circ$, $87^\\circ$입니다. $50^\\circ$보다 크고 $106^\\circ$보다 작은 각은 모두 몇 개인가?",
    false,
  ],
  [
    "초4 1-6-4 심화 — 「계산 결과가 …이 되는 계산식」 (역산)",
    "계산 결과가 $11111$이 되는 계산식을 쓰시오.",
    false,
  ],
  [
    "초4 2-3-4 심화 — 수 카드 최적 조합",
    "$4$장의 수 카드 $6$, $4$, $5$, $3$을 한 번씩 모두 사용하여 소수 한 자리 수 두 개를 만들려고 합니다. 두 수의 합이 가장 클 때의 합을 구하시오.",
    false,
  ],
  [
    "초3 1-6-4 심화 — 기호 역산 (□) · 덧셈 꼴",
    "계산하시오.\n\n$\\square+5=12$",
    false,
  ],
  [
    "초3 2-4-4 심화 — 후보 열거 (들어갈 수 있는)",
    "$\\frac{\\square}{9}$ 가 가분수이고 $\\frac{12}{9}$ 보다 작습니다. $\\square$ 에 들어갈 수 있는 수는 모두 몇 개입니까?",
    false,
  ],
  [
    "초5 2-3-4 심화 — 조건 겹침이 말로만 있으면 표지가 없다 (알려진 한계)",
    "둘레가 $24$ cm인 점대칭 육각형이 있습니다. 마주 보는 변은 서로 길이가 같고, 이웃한 세 변의 길이가 연속한 세 자연수일 때 가장 짧은 변은 몇 cm입니까?",
    true,
  ],
  // ── 경계 ──
  [
    "경계 — 「전체가 ~일 때」는 표지다 (D-72 축 표의 말)",
    "전체가 $40$ 명일 때, 남학생은 몇 명입니까?",
    false,
  ],
  [
    "경계 — 평범한 응용 발문에는 표지가 없다",
    "공책이 한 묶음에 $19$권씩 $85$묶음 있습니다. 공책은 모두 몇 권입니까?",
    true,
  ],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, content, wantBare] of GAUGE) {
    const got = marksOf(content).length === 0;
    if (got !== wantBare) bad += 1;
    console.log(
      `  ${got === wantBare ? "✅" : "❌"} ${why} — 기대 ${wantBare ? "표지0" : "표지있음"} / 실제 ${got ? "표지0" : "표지있음"}`,
    );
  }
  const pos = GAUGE.filter((g) => g[2]).length;
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (표지0 ${pos} · 표지있음 ${GAUGE.length - pos})`
      : `\n❌ 눈금 ${bad}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/* ─────────────────────────── 전량 ─────────────────────────── */

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
const census = process.argv.includes("--census");
const list = process.argv.includes("--list");

const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
const tally = new SweepTally();
const units = elementaryUnits().filter(
  (u) => supportedTiers(u).length > 0 && (!gradeArg || u.grade === gradeArg),
);

if (census) {
  /**
   * **대조 census** — 표지를 손으로 짓지 않기 위한 자리.
   *
   * 심화 발문과 **응용·기본** 발문을 맞대어, 심화에만 나오는 말투를 빈도순으로 낸다.
   * 「무엇이 4단 표지인가」를 머리로 정하면 목록에 없는 부류는 구조적으로 0이 된다.
   * 수식·수는 지운다 — 낱말이 아니라 **말투**를 보려는 것이다.
   */
  const words = (c: string): string[] =>
    c
      .replace(/\$[^$]*\$/g, " ◇ ")
      .replace(/\d+(\.\d+)?/g, "#")
      .replace(/[.,?!·\n]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const grams = (c: string): Set<string> => {
    const w = words(c);
    const out = new Set<string>();
    for (let n = 1; n <= 3; n += 1)
      for (let i = 0; i + n <= w.length; i += 1)
        out.add(w.slice(i, i + n).join(" "));
    return out;
  };
  const deepDf = new Map<string, number>();
  const otherDf = new Map<string, number>();
  let deepN = 0;
  let otherN = 0;
  for (const u of units) {
    tally.count(u.grade, u.section, "심화", SEEDS.length);
    for (const s of SEEDS) {
      const d = generateElementaryProblem(u, s, "심화");
      deepN += 1;
      for (const g of grams(d.content)) deepDf.set(g, (deepDf.get(g) ?? 0) + 1);
      for (const t of ["응용", "기본"] as const) {
        const p = generateElementaryProblem(u, s, t);
        otherN += 1;
        for (const g of grams(p.content))
          otherDf.set(g, (otherDf.get(g) ?? 0) + 1);
      }
    }
  }
  tally.assertNonEmpty();
  fence.close();
  const rows = [...deepDf]
    .filter(([, n]) => n >= 12)
    .map(([g, n]) => {
      const o = otherDf.get(g) ?? 0;
      return { g, n, o, ratio: n / deepN / ((o + 1) / otherN) };
    })
    .filter((r) => r.ratio >= 3)
    .sort((a, b) => b.n - a.n);
  console.log(
    `심화 ${deepN}건 · 응용+기본 ${otherN}건 · ${tally.line()} · ${fence.scopeLine()}`,
  );
  console.log(
    `후보 ${rows.length}종 — 심화 12건 이상 **그리고** 응용·기본 대비 3배 이상\n`,
  );
  for (const r of rows.slice(0, 120))
    console.log(
      `${String(r.n).padStart(4)}  응용기본 ${String(r.o).padStart(4)}  x${r.ratio.toFixed(1).padStart(5)}  ${r.g}`,
    );
  process.exit(0);
}

const ledger = loadLedger();
const 미검토: string[] = [];
const 고칠것: string[] = [];
const 검토됨: string[] = [];
let 표지있음 = 0;
/**
 * **낡은 행** — 원장에는 있는데 이제 아무 갈래도 안 가리키는 키.
 *
 * 갈래를 고쳐 표지가 붙으면 그 행은 할 일이 없어진다. 그런데 그냥 두면 **잔고 수가
 * 안 줄어** 「고쳤는데 표는 그대로」가 된다 — 이 저장소가 여러 번 겪은 「손 목록은
 * 조용히 낡는다」다. 그래서 낡은 행도 **빨강**으로 만든다: 고쳤으면 행을 지워야 하고,
 * 지우면 잔고 수가 줄어 시험이 갱신을 요구한다.
 *
 * ⚠️ 학년 인자로 좁혀 돌 때는 못 센다(다른 학년 행이 «안 쓰인 것»으로 보인다).
 */
const 쓰인키 = new Set<string>();

for (const unit of units) {
  tally.count(unit.grade, unit.section, "심화", SEEDS.length);
  const deep = SEEDS.map(
    (s) => generateElementaryProblem(unit, s, "심화").content,
  );
  const key = elemKey(unit.grade, unit.section);
  const v = judgeDeep(key, deep, ledger.초등);
  const bare = deep.filter((c) => marksOf(c).length === 0);
  const 자리 = `${unit.grade} ${unit.section}  (표지0 ${bare.length}/${SEEDS.length})`;
  if (v.판정 === "표지있음") {
    표지있음 += 1;
    continue;
  }
  const 보기 = list
    ? `\n      응용 ${generateElementaryProblem(unit, SEEDS[0]!, "응용").content.replace(/\n+/g, " ⏎ ").slice(0, 130)}` +
      `\n      심화 ${bare[0]!.replace(/\n+/g, " ⏎ ").slice(0, 130)}`
    : "";
  if (v.판정 === "미검토") 미검토.push(`${자리}${보기}`);
  else if (v.판정 === "고칠것") {
    쓰인키.add(key);
    고칠것.push(`${자리} — ${v.왜}${보기}`);
  } else {
    쓰인키.add(key);
    검토됨.push(`${자리} — ${v.왜}`);
  }
}

const 낡은행 = gradeArg
  ? []
  : Object.keys(ledger.초등).filter((k) => !쓰인키.has(k));

tally.assertNonEmpty();
fence.close();

console.log(
  `훑은 것 — ${tally.line()} · ${fence.scopeLine()}\n` +
    `(재는 것은 **심화 발문이 4단 표지를 가졌나** 하나뿐이다 —\n` +
    ` 「그래서 4단인가」는 못 잰다. 표지 0 은 «결함»이 아니라 «사람이 볼 몫»이다)\n`,
);
console.log(
  `심화 갈래 ${units.length} — 표지있음 ${표지있음} · 사람이 4단이라 함 ${검토됨.length}` +
    ` · **고칠것 ${고칠것.length}** · 미검토 ${미검토.length}`,
);

if (고칠것.length > 0) {
  console.log(
    `\n⚠️ 고칠 잔고 ${고칠것.length}갈래 — 원장에 사람이 「4단이 아니다」라고 적어 둔 것.` +
      `\n   (이것으로는 빨개지지 않는다. 수는 시험이 «정확히» 잠근다 —` +
      ` 조용히 늘지 못한다)`,
  );
  for (const f of 고칠것) console.log(`  · ${f}`);
}

if (미검토.length === 0) {
  console.log("\n✅ 미검토 0 — 표지 없는 갈래는 전부 사람 판정이 원장에 있다");
} else {
  console.log(
    `\n❌ 미검토 ${미검토.length}갈래 — **표지도 없고 사람 판정도 없다.**` +
      `\n   `.concat(
        `\`--list\` 로 응용과 나란히 보고, 판정을 ${TIER4_LEDGER_PATH} 에 적어라.`,
      ),
  );
  for (const f of 미검토) console.log(`  · ${f}`);
}

if (낡은행.length > 0) {
  console.log(
    `\n❌ 낡은 원장 행 ${낡은행.length} — 이제 표지가 붙어서 **아무 갈래도 안 가리킨다.**` +
      `\n   고쳤으면 행을 지워라. 안 지우면 잔고 수가 안 줄어 「고쳤는데 표는 그대로」가 된다.`,
  );
  for (const k of 낡은행)
    console.log(`  · ${k}  ${ledger.초등[k]?.이름 ?? ""}`);
} else if (!gradeArg) {
  console.log("✅ 낡은 원장 행 0");
}

console.log(
  "\n⚠️ 0 은 «깨끗»과 «못 셈»을 구분해 주지 않는다 — `--selftest` 로 이 판정기가" +
    "\n   걸릴 수 있는지부터 보고, 표지를 넓힐 때는 `--census` 를 먼저 볼 것.",
);
process.exitCode = 미검토.length === 0 && 낡은행.length === 0 ? 0 : 1;
