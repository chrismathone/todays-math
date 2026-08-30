/**
 * **초5 의 D-72 축이 무슨 «발문 꼴»로 나타나나** — 손으로 짓지 않고 센다.
 *
 *   npx tsx scripts/qa/census-tier-frames-g5.ts            # 갈래(4단) 경로
 *   npx tsx scripts/qa/census-tier-frames-g5.ts --forms    # 문형 경로(적재본이 쓰는 것)
 *   npx tsx scripts/qa/census-tier-frames-g5.ts --marks    # 4단 표지가 어느 갈래에 앉나
 *   npx tsx scripts/qa/census-tier-frames-g5.ts --selftest # 이 계량기가 눈이 멀었나
 *
 * ⚠️ **이것은 판정기가 아니라 계량기다.** 아무것도 판정하지 않으므로 `exit 0` 이
 *    「깨끗」을 뜻하지 않는다. 이름이 `probe-` 가 아닌 것도 그래서다.
 *
 * ## 왜 있나
 *
 * 매쓰홀릭 벤치마킹은 「우리 심화가 시중 기준의 어디쯤인가」를 묻는다. 그 물음에
 * 답하려면 먼저 **우리 4단이 이 학년에서 실제로 어떤 문장으로 나타나는지**를 알아야
 * 한다. 그것을 머리로 적으면 목록에 없는 부류가 구조적으로 0이 된다
 * (CLAUDE.md 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 * 그래서 **엔진이 실제로 낸 발문**을 지문으로 접어 빈도순으로 늘어놓는다.
 *
 * ## 🔴 모집단이 둘이다 — 이것이 이 계량기의 핵심이다
 *
 * 초5 는 **두 경로**가 다 등록돼 있다:
 *   · **갈래**  `generateElementaryProblem(unit, seed, tier)` — 소단원당 4단 각 1개.
 *               `probe-elem-tier-ladder.ts` 가 재는 것이 이쪽이다.
 *   · **문형**  `generateElementaryForm(unit, seed, formId)` — 소단원당 10개, 각자
 *               `form.tier` 를 들고 있다. **적재기가 부르는 것은 이쪽이다**
 *               (`scripts/import/load-engine-problems.ts:183`).
 *
 * 즉 **지면에 나가는 난이도 분포는 문형이 정하고, 기존 사다리 판정기는 갈래를 잰다.**
 * 둘은 서로 다른 산출물이라 한쪽이 0이어도 다른 쪽은 아무것도 보장되지 않는다 —
 * CLAUDE.md 2026-08-27·08-30 의 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」와
 * 같은 자리다. 그래서 `--forms` 로 **양쪽을 다 센다.**
 *
 * ## 4단 표지는 «옮겨 적지» 않는다
 *
 * 표지 목록은 `tier4Rules.ts` 가 `--census` 로 골라 검증해 둔 **한 곳**이다. 여기서
 * 다시 적으면 두 벌이 되어 한쪽만 고쳐도 아무도 모른다. 그래서 `marksOf` 를 부른다.
 *
 * ⚠️ **`probe-elem-tier-ladder.ts` 에서 가져오면 안 된다.** 그 파일은 최상위에서
 *    쓸기를 돌리므로 import 하는 순간 **그 판정기가 실행된다** — 실제로 처음에 그렇게
 *    짰다가, 내 `--selftest` 가 한 줄도 안 돌고 **판정기의 눈금이 초록을 찍었다.**
 *    「✅ 눈금 14건」이 내 것처럼 보였다. 규칙 모듈(`tier4Rules.ts`)은 부작용이 없다.
 */
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import { marksOf } from "./tier4Rules";

const GRADE = "초5";
const SEEDS = 12;
const SEED0 = 20260830;
const STEP = 1009;

/**
 * 발문을 **지문**으로 접는다 — 수·수식·소재를 지우면 남는 것이 «꼴»이다.
 *
 * ⚠️ 그림 자국(`[그림]`)은 **남긴다.** 「그림 한 겹」이 D-72 의 2단을 가르는 축이라
 *    지우면 그 축이 통째로 안 보인다.
 */
export function frameOf(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "◇")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────────────── 눈금 ───────────────────────────
 *
 * 계량기도 판정자다. 「0종」이 «없다»인지 «못 셈»인지 갈리려면 이 자가 실제로
 * 무엇을 접고 무엇을 안 접는지 못 박아야 한다(CLAUDE.md 2026-08-20).
 */
const GAUGE: [string, string, string][] = [
  ["수를 지운다", "사과 3개와 배 12개", "사과 N개와 배 N개"],
  ["수식을 지운다", "$2\\times3$ 을 계산", "◇ 을 계산"],
  [
    "같은 꼴은 같은 지문으로 접힌다 (수만 다름)",
    "사과 7개와 배 5개",
    "사과 N개와 배 N개",
  ],
  [
    "그림 자국은 남긴다 (2단의 축)",
    "[그림] 을 보고 답하시오",
    "[그림] 을 보고 답하시오",
  ],
  ["공백을 접는다", "  가로   5 cm  ", "가로 N cm"],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, input, want] of GAUGE) {
    const got = frameOf(input);
    if (got !== want) bad += 1;
    console.log(`  ${got === want ? "✅" : "❌"} ${why} — 「${got}」`);
  }
  // 음성 대조 — 서로 **다른** 꼴이 같은 지문으로 접히면 이 자는 못 쓴다.
  const a = frameOf("사과 3개를 더하시오");
  const b = frameOf("사과 3개를 빼시오");
  const distinct = a !== b;
  if (!distinct) bad += 1;
  console.log(
    `  ${distinct ? "✅" : "❌"} 음성 대조 — 더하기와 빼기는 다른 꼴로 갈린다`,
  );
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length + 1}건 전부 맞다`
      : `\n❌ 눈금 ${bad}건 어긋남 — **이 계량기의 수치를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const units = elementaryUnits().filter((u) => u.grade === GRADE);
const wantForms = process.argv.includes("--forms");
const wantMarks = process.argv.includes("--marks");
const wantThin = process.argv.includes("--thin");
const wantSix = process.argv.includes("--sixgrade");

/* ══════════════════ 매쓰홀릭 6단 눈금에 대는 신호 세 가지 ══════════════════
 *
 * 리드가 매쓰홀릭 눈금을 확보했다(2026-08-30): **개념 → 기본 → 실력(하) →
 * 실력(중) → 심화(하) → 심화(중)** 6단. 우리는 4단이다.
 *
 * 리드 가설 ㉠~㉣ 을 초5 에서 **반증 가능한 형태**로 옮기면 이 셋이다. 셋 다
 * «어려움»을 직접 재지 않는다 — 그건 지면에 없다. 재는 것은 **발문의 모양**이고,
 * 모양은 사람 판단의 **입력**이지 결론이 아니다.
 *
 *   Ⓐ **심화가 «한 걸음 역산»인가** — `□ 안에 알맞은 …` 식 하나, 또는
 *      `어떤 수에 … 했더니 … 되었습니다`. 둘 다 연산 **한 번**을 거꾸로 푸는 것이다.
 *      매쓰홀릭이 「심화(중)」에 두는 복면산·경우의 수와는 층이 다르다. ㉠ 의 열쇠.
 *   Ⓑ **응용이 맨 「계산하시오」인가** — 기존 사다리 판정기는 **심화만** 본다
 *      (그 파일 머리말 ㉠). 응용은 구조적으로 그 그물 밖이다. ㉡ 의 열쇠.
 *   Ⓒ **연산에 4단 표지가 있는가** — 연산이 이미 역산이면 사다리 밑동이 부푼 것이고,
 *      그만큼 위쪽이 좁아진다. ㉢ 의 열쇠(저쪽 「개념」과 우리 「연산」의 어긋남).
 *
 * ⚠️ 셋 다 **모양**이다. 「한 걸음 역산」이 늘 쉬운 것도 아니고(수가 고약하면 어렵다),
 *    긴 문장이 늘 어려운 것도 아니다. 그래서 이 수치는 «판정»이 아니라 «어디를 눈으로
 *    볼지»를 고르는 자다. 보고서의 6단 배정은 **사람이 읽고** 적는다.
 */

/** Ⓐ-1 `□ 안에 알맞은 X를 구하시오.` **그리고 그 밖에 아무 말도 없다.** */
const ONE_STEP_BOX = /^□ 안에 알맞은 .{0,8}구하시오\.? ◇$/;
/** Ⓐ-2 `어떤 수에 ◇을 …더니 ◇이 되었습니다. 어떤 수를 구하시오.` */
const ONE_STEP_SOME =
  /^어떤 수(에서|에|를)? ?◇[^.]{0,30}되었습니다\.? 어떤 수를 구하시오\.?$/;
/** Ⓑ 맨 계산 지시로 **시작**하는가. `probe-elem-tier-ladder.ts` 의 열쇠와 같은 뜻. */
const BARE_CALC_HEAD = /^계산하(시오|여라|여|세요|기)|^계산해 ?보시오/;

export function isOneStepInverse(frame: string): boolean {
  return ONE_STEP_BOX.test(frame) || ONE_STEP_SOME.test(frame);
}

/**
 * Ⓓ **매쓰홀릭 「심화(중)」의 표지가 우리에게 있는가.**
 *
 * 리드 실측(2026-08-30)에서 저쪽 심화(중)의 성격을 셋으로 읽었다 — **복면산**(기호에
 * 숫자를 앉힌다) · **경우의 수**(「몇 가지」) · **수 카드 배열**(만들 수 있는 수 중
 * 몇째로 큰 것). 셋 다 「답이 하나 나오는 절차」가 아니라 **구조를 탐색**하는 물음이다.
 *
 * ⚠️ **저작권 — 저쪽 문항은 한 글자도 안 들어온다.** 아래 눈금의 양성 대조는 저쪽
 *    발문이 아니라 **같은 꼴로 내가 지은 문자열**이다. 여기서 재는 것은 «눈금»이지
 *    «문항»이 아니다.
 *
 * ⚠️ **이 표지는 새는 쪽으로 헐겁다.** 「두 번째로 작은 수」는 저쪽에서 수 카드 배열의
 *    표지지만 우리 「$24$의 약수 중 두 번째로 작은 수」는 그냥 나열이다. 그래서 걸린
 *    자리는 **반드시 눈으로 본다** — 헐거운 쪽으로 두는 까닭은, 좁게 잡으면 「0」이
 *    «없다»인지 «못 셈»인지 안 갈리기 때문이다.
 */
export const TOPHAT_MARKS: [string, RegExp][] = [
  ["경우의 수 (몇 가지)", /몇 가지/],
  ["수 카드 배열", /수 카드/],
  ["복면산 (기호 자리에 숫자)", /㉠㉡|㉠.{0,4}㉡.{0,4}㉢/],
  ["만들 수 있는 수", /만들 수 있는/],
  ["몇째로 큰·작은", /(두|세|네) 번째로 (큰|작은)/],
];

if (wantSix) {
  /* 눈금 — 양성·음성 **둘 다**. 양성만 대면 지어냄이 구조적으로 0이 된다.
   * 실물에서 그대로 가져온다(지어낸 문자열은 「검출기가 도는가」만 본다). */
  const SIX_GAUGE: [string, string, boolean][] = [
    // 양성 — 실제 초5 심화 발문(씨앗 20260830)
    ["초5 2-4-1 심화 (실물)", "□ 안에 알맞은 자연수를 구하시오. ◇", true],
    ["초5 2-4-5 심화 (실물)", "□ 안에 알맞은 소수를 구하시오. ◇", true],
    [
      "초5 1-5-1 심화 (실물)",
      "어떤 수에 ◇을 더했더니 ◇이 되었습니다. 어떤 수를 구하시오.",
      true,
    ],
    [
      "초5 1-5-4 심화 (실물)",
      "어떤 수에서 ◇를 뺐더니 ◇가 되었습니다. 어떤 수를 구하시오.",
      true,
    ],
    // 음성 — 이것들이 걸리면 이 자의 결함이다. 전부 실물이고, 전부 두 걸음 이상이다.
    [
      "초5 1-1-3 심화 — 괄호 빠뜨림 (두 값을 다 구해 차)",
      "◇를 계산해야 하는데, 잘못하여 괄호를 빠뜨리고 ◇로 계산했습니다. 바르게 계산한 값과 잘못 계산한 값의 차는 얼마입니까?",
      false,
    ],
    [
      "초5 2-3-4 심화 — 연속한 세 자연수 (조건 조합)",
      "둘레가 ◇ cm인 점대칭 육각형이 있습니다. 마주 보는 변은 서로 길이가 같고, 이웃한 세 변의 길이가 연속한 세 자연수일 때 가장 짧은 변은 몇 cm입니까?",
      false,
    ],
    [
      "초5 2-4-7 심화 — 역산 뒤 한 걸음 더",
      "어떤 수에 ◇을 곱했더니 ◇이 되었습니다. 어떤 수에 ◇을 곱하면 얼마입니까?",
      false,
    ],
    [
      "초5 2-1-4 심화 — 범위의 양 끝",
      "어떤 자연수를 올림하여 백의 자리까지 나타냈더니 ◇이 되었습니다. 어떤 수가 될 수 있는 가장 작은 수와 가장 큰 수를 차례로 쓰시오.",
      false,
    ],
    [
      "초5 1-4-4 심화 — 부등식 안의 □ 개수 세기",
      "□ 안에 들어갈 수 있는 자연수는 모두 몇 개입니까? ◇",
      false,
    ],
  ];
  let bad = 0;
  for (const [why, frame, want] of SIX_GAUGE) {
    const got = isOneStepInverse(frame);
    if (got !== want) bad += 1;
    console.log(
      `  ${got === want ? "✅" : "❌"} ${why} — 기대 ${want ? "한걸음" : "아님"} / 실제 ${got ? "한걸음" : "아님"}`,
    );
  }
  const pos = SIX_GAUGE.filter((g) => g[2]).length;
  console.log(
    bad === 0
      ? `\n✅ Ⓐ 눈금 ${SIX_GAUGE.length}건 맞다 (양성 ${pos} · 음성 ${SIX_GAUGE.length - pos})`
      : `\n❌ Ⓐ 눈금 ${bad}건 어긋남 — **아래 수치를 믿지 마라**`,
  );

  /* Ⓓ 눈금 — 「0」이 «없다»인지 «못 셈»인지 갈라야 한다. 양성은 **내가 지은** 문자열이다
   * (저쪽 발문을 넣지 않는다). 이게 없으면 아래 0 은 아무것도 증명하지 않는다. */
  const TOPHAT_GAUGE: [string, boolean][] = [
    ["합이 $859$가 되는 경우는 모두 몇 가지입니까?", true],
    ["수 카드 $4$장을 늘어놓아 만든 수 중 가장 큰 수를 구하시오.", true],
    ["㉠㉡㉢$+$㉢㉡㉠$=666$일 때 ㉠에 알맞은 수를 구하시오.", true],
    ["만들 수 있는 세 자리 수 중에서 두 번째로 큰 수를 쓰시오.", true],
    // 음성 — 이것들이 걸리면 이 표지는 못 쓴다.
    ["계산하시오. $3.5\\times2$", false],
    ["어떤 수에 $5$를 더했더니 $12$가 되었습니다. 어떤 수를 구하시오.", false],
    ["가로가 $4$ cm인 직사각형의 넓이는 몇 cm²입니까?", false],
  ];
  let badT = 0;
  for (const [text, want] of TOPHAT_GAUGE) {
    const got = TOPHAT_MARKS.some(([, re]) => re.test(text));
    if (got !== want) badT += 1;
  }
  console.log(
    badT === 0
      ? `✅ Ⓓ 눈금 ${TOPHAT_GAUGE.length}건 맞다 (양성 ${TOPHAT_GAUGE.filter((g) => g[1]).length} · 음성 ${TOPHAT_GAUGE.filter((g) => !g[1]).length}) — 「0」을 «없다»로 읽어도 된다\n`
      : `❌ Ⓓ 눈금 ${badT}건 어긋남 — **아래 0 을 «없다»로 읽지 마라**\n`,
  );
  if (bad > 0 || badT > 0) process.exit(1);

  let aHit = 0;
  let bHit = 0;
  let cHit = 0;
  const aList: string[] = [];
  const bList: string[] = [];
  const cList: string[] = [];

  // 🔴 경로를 **둘 다** 볼 수 있어야 한다. 지면에 나가는 것은 문형이므로,
  //    「갈래에서 얇다」와 「지면에서 얇다」는 다른 말이다. `--forms` 로 가른다.
  const pick = (
    unit: (typeof units)[number],
    tier: (typeof ELEM_TIERS)[number],
  ): string[] => {
    if (wantForms)
      return listedForms(unit)
        .filter((f) => f.tier === tier)
        .flatMap((f) =>
          Array.from(
            { length: SEEDS },
            (_, i) =>
              generateElementaryForm(unit, SEED0 + i * STEP, f.id).content,
          ),
        );
    return Array.from(
      { length: SEEDS },
      (_, i) => generateElementaryProblem(unit, SEED0 + i * STEP, tier).content,
    );
  };

  for (const unit of units) {
    if (supportedTiers(unit).length === 0) continue;
    // ⚠️ Ⓐ 는 「그 자리의 **모든** 산출이 한 걸음 역산인가」로 센다. 「하나라도」로
    //    세면 문형 넷 중 하나만 그래도 걸려 「지면이 얇다」가 과장된다.
    const deeps = pick(unit, "심화하");
    const seen = {
      a: deeps.length > 0 && deeps.every((c) => isOneStepInverse(frameOf(c))),
      b: pick(unit, "응용").some((c) => BARE_CALC_HEAD.test(c.trim())),
      c: pick(unit, "연산").some((c) => marksOf(c).length > 0),
    };
    if (seen.a) {
      aHit += 1;
      aList.push(unit.section);
    }
    if (seen.b) {
      bHit += 1;
      bList.push(unit.section);
    }
    if (seen.c) {
      cHit += 1;
      cList.push(unit.section);
    }
  }

  const n = units.filter((u) => supportedTiers(u).length > 0).length;
  /* Ⓓ — 저쪽 「심화(중)」 표지를 **갈래+문형 전량**에 댄다. 경로를 안 가른다:
   * 여기서 묻는 것은 「우리 초5 에 그런 부류가 **어디에든** 있는가」이기 때문이다. */
  const dHits = new Map<string, Set<string>>();
  for (const [name] of TOPHAT_MARKS) dHits.set(name, new Set());
  let dSeen = 0;
  for (const unit of units) {
    // `심화중`·`심화상` 은 채우는 중이라(D-113) 소단원마다 있을 수도 없을 수도 있다 —
    // 등록된 갈래만 만든다.
    const supported = new Set(supportedTiers(unit));
    if (supported.size === 0) continue;
    const texts = [
      ...ELEM_TIERS.filter((t) => supported.has(t)).flatMap((t) =>
        Array.from(
          { length: SEEDS },
          (_, i) =>
            generateElementaryProblem(unit, SEED0 + i * STEP, t).content,
        ),
      ),
      ...listedForms(unit).flatMap((f) =>
        Array.from(
          { length: SEEDS },
          (_, i) =>
            generateElementaryForm(unit, SEED0 + i * STEP, f.id).content,
        ),
      ),
    ];
    dSeen += texts.length;
    for (const [name, re] of TOPHAT_MARKS)
      if (texts.some((c) => re.test(c))) dHits.get(name)!.add(unit.section);
  }

  const show = (t: string, hit: number, list: string[]) => {
    console.log(`── ${t} — ${hit}/${n} 소단원 ──`);
    for (const s of list) console.log(`   · ${s}`);
    console.log("");
  };
  console.log(
    `${GRADE} — 매쓰홀릭 6단에 대기 위한 신호 (씨앗 ${SEEDS} · 경로: ${wantForms ? "문형" : "갈래"})\n`,
  );
  show("Ⓐ 심화가 «한 걸음 역산»뿐이다 (그 자리 전량)", aHit, aList);
  show("Ⓑ 응용이 맨 「계산하시오」인 씨앗이 있다", bHit, bList);
  show("Ⓒ 연산에 4단 표지가 있는 씨앗이 있다", cHit, cList);
  console.log(`── Ⓓ 매쓰홀릭 「심화(중)」 표지 — 갈래+문형 ${dSeen}건에 댐 ──`);
  for (const [name] of TOPHAT_MARKS) {
    const s = dHits.get(name)!;
    console.log(
      `   ${name.padEnd(22)} ${s.size}개 소단원${s.size ? " — " + [...s].join(" / ") : ""}`,
    );
  }
  console.log(
    `   ⚠️ 걸린 자리는 **눈으로 봐야 한다** — 이 표지는 새는 쪽으로 헐겁다.\n`,
  );

  /* Ⓔ **예/아니요로 답하는 문항이 어느 갈래에 몇이나 있나.**
   *
   * 열쇠를 **발문이 아니라 정답**에서 뽑는다 — 발문 말투는 새지만 「정답이 예/아니요」는
   * 새지 않는다. 이런 문항은 찍어서 **절반을 맞힌다**. 저쪽 6단에는 이 형식이 리드
   * 실측 표본에 없었다(선택형은 「누구입니까」·「기호를 쓰시오」였다).
   * 우리 «응용»에 이것이 있으면 그 자리는 저쪽 「기본」보다도 아래로 읽힌다.
   *
   * ⚠️ 형식이 곧 쉬움은 아니다 — 판단 자체가 어려울 수 있다. 그래서 이것도 «모양»이다. */
  const yesNo = new Map<string, number>();
  const yesNoUnits = new Map<string, Set<string>>();
  let yesNoSeen = 0;
  for (const tier of ELEM_TIERS) {
    yesNo.set(tier, 0);
    yesNoUnits.set(tier, new Set());
  }
  for (const unit of units) {
    for (const f of listedForms(unit)) {
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryForm(unit, SEED0 + i * STEP, f.id);
        yesNoSeen += 1;
        const a = p.answer.trim();
        if (a === "예" || a === "아니요") {
          yesNo.set(f.tier, (yesNo.get(f.tier) ?? 0) + 1);
          yesNoUnits.get(f.tier)!.add(unit.section);
        }
      }
    }
  }
  console.log(`── Ⓔ 정답이 «예/아니요» 인 문항 — 문형 ${yesNoSeen}건 중 ──`);
  for (const tier of ELEM_TIERS) {
    const c = yesNo.get(tier) ?? 0;
    console.log(
      `   ${tier.padEnd(4)} ${String(c).padStart(4)}건 · ${yesNoUnits.get(tier)!.size}개 소단원`,
    );
  }
  console.log("");
  console.log(
    `⚠️ 이 넷은 **모양**이지 어려움이 아니다. 6단 배정은 사람이 읽고 적는다 —\n` +
      `   이 수치는 «어디를 눈으로 볼지»를 고르는 자다.`,
  );
  process.exit(0);
}

/* ─────────────────── 「얇다」를 셀 수 있는 형태로 ───────────────────
 *
 * 리드 가설 ㉡ — 「우리 응용이 얇다. 3건 중 2건이 같은 문형이었다」(초3 표본).
 * 그 말을 **반증 가능한 형태**로 옮기면 이렇다:
 *
 *   소단원 하나에서 그 갈래를 **씨앗 12개**로 뽑았을 때 «서로 다른 발문 꼴»이 몇 개인가.
 *
 * 1이면 그 소단원의 그 갈래는 씨앗을 바꿔도 **늘 같은 물음**이다 — 수만 바뀐다.
 * 그것이 「얇다」의 측정 가능한 뜻이다. 표본 3건이 아니라 **전량**으로 센다.
 *
 * ⚠️ **이것은 «다양성»이지 «난이도»가 아니다.** 꼴이 하나여도 좋은 심화일 수 있다.
 *    그리고 지문이 같아도 소재가 다르면 학생에게는 다른 문항이다 — 이 자는 소재를
 *    안 지우므로(수·수식만 지운다) 소재가 다르면 다른 꼴로 센다. 즉 이 수는
 *    다양성의 **상한이 아니라 하한**이다.
 */
if (wantThin) {
  console.log(
    `${GRADE} — 갈래마다 «서로 다른 발문 꼴»이 몇 개인가 (씨앗 ${SEEDS} · 소단원별)\n`,
  );
  const perTier = new Map<string, number[]>();
  for (const tier of ELEM_TIERS) perTier.set(tier, []);
  const ones: string[] = [];

  for (const unit of units) {
    // `심화중`·`심화상` 은 채우는 중이라(D-113) 소단원마다 있을 수도 없을 수도 있다.
    const supported = new Set(supportedTiers(unit));
    const counts: string[] = [];
    for (const tier of ELEM_TIERS) {
      const seen = new Set<string>();
      if (wantForms) {
        for (const form of listedForms(unit).filter((f) => f.tier === tier))
          for (let i = 0; i < SEEDS; i += 1)
            seen.add(
              frameOf(
                generateElementaryForm(unit, SEED0 + i * STEP, form.id).content,
              ),
            );
      } else {
        if (!supported.has(tier)) {
          counts.push(`${tier}  —`);
          continue;
        }
        for (let i = 0; i < SEEDS; i += 1)
          seen.add(
            frameOf(
              generateElementaryProblem(unit, SEED0 + i * STEP, tier).content,
            ),
          );
      }
      perTier.get(tier)!.push(seen.size);
      counts.push(`${tier} ${String(seen.size).padStart(2)}`);
      if (seen.size === 1) ones.push(`${unit.section} — ${tier}`);
    }
    console.log(`  ${unit.section.padEnd(34)} ${counts.join(" · ")}`);
  }

  console.log(`\n── 갈래별 요약 (경로: ${wantForms ? "문형" : "갈래"}) ──`);
  for (const tier of ELEM_TIERS) {
    const xs = perTier.get(tier)!;
    if (xs.length === 0) continue;
    const sum = xs.reduce((a, b) => a + b, 0);
    const sorted = [...xs].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)]!;
    console.log(
      `  ${tier.padEnd(4)} 평균 ${(sum / xs.length).toFixed(2)} · 중앙 ${med}` +
        ` · 최저 ${sorted[0]} · 최고 ${sorted[sorted.length - 1]}` +
        ` · **꼴이 하나뿐** ${xs.filter((x) => x === 1).length}/${xs.length}`,
    );
  }
  console.log(
    `\n꼴이 하나뿐인 자리 ${ones.length}개` +
      (ones.length > 0 ? `:\n${ones.map((o) => `   · ${o}`).join("\n")}` : ""),
  );
  console.log(
    `\n⚠️ 이 수는 다양성의 **하한**이다(소재를 안 지운다). 그리고 다양성은 난이도가` +
      `\n   아니다 — 꼴이 하나여도 좋은 심화일 수 있다.`,
  );
  process.exit(0);
}

/* ─────────────────────── 표지가 어느 갈래에 앉나 ─────────────────────── */
if (wantMarks) {
  // D-72 는 4단을 «역산·조건 조합»으로 정의한다. 그 표지가 정말 심화에 몰려 있나?
  // **이것이 「높이」에 가장 가까운 측정이다** — 그래도 «어려움»이 아니라 «표지»다.
  const tally: Record<
    string,
    { n: number; marked: number; marks: Map<string, number> }
  > = {};
  for (const tier of ELEM_TIERS)
    tally[tier] = { n: 0, marked: 0, marks: new Map() };

  for (const unit of units) {
    // `심화중`·`심화상` 은 채우는 중이라(D-113) 소단원마다 있을 수도 없을 수도 있다.
    const supported = new Set(supportedTiers(unit));
    if (supported.size === 0) continue;
    for (const tier of ELEM_TIERS) {
      if (!supported.has(tier)) continue;
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryProblem(unit, SEED0 + i * STEP, tier);
        const found = marksOf(p.content);
        const t = tally[tier]!;
        t.n += 1;
        if (found.length > 0) t.marked += 1;
        for (const m of found) t.marks.set(m, (t.marks.get(m) ?? 0) + 1);
      }
    }
  }
  console.log(
    `${GRADE} — 4단 표지가 어느 갈래에 앉나 (갈래 경로 · 씨앗 ${SEEDS})\n`,
  );
  for (const tier of ELEM_TIERS) {
    const t = tally[tier]!;
    const pct = t.n === 0 ? 0 : (t.marked / t.n) * 100;
    console.log(
      `  ${tier.padEnd(4)} ${String(t.marked).padStart(4)}/${String(t.n).padEnd(5)}` +
        ` (${pct.toFixed(1)}%)  ${
          [...t.marks]
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ") || "—"
        }`,
    );
  }
  console.log(
    `\n⚠️ 이것은 «표지»지 «어려움»이 아니다. 표지 없이 말로 역산을 거는 심화는` +
      `\n   여기서 «표지 없음»으로 세어진다 — 낮은 %가 곧 결함이 아니다.`,
  );
  process.exit(0);
}

/* ─────────────────────────── 발문 꼴 census ─────────────────────────── */
type Bucket = { frames: Map<string, number>; n: number; units: Set<string> };
const byTier = new Map<string, Bucket>();
for (const tier of ELEM_TIERS)
  byTier.set(tier, { frames: new Map(), n: 0, units: new Set() });

let generated = 0;

for (const unit of units) {
  if (wantForms) {
    for (const form of listedForms(unit)) {
      const b = byTier.get(form.tier)!;
      b.units.add(unit.section);
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryForm(unit, SEED0 + i * STEP, form.id);
        const f = frameOf(p.content);
        b.frames.set(f, (b.frames.get(f) ?? 0) + 1);
        b.n += 1;
        generated += 1;
      }
    }
  } else {
    // `심화중`·`심화상` 은 채우는 중이라(D-113) 소단원마다 있을 수도 없을 수도 있다.
    const supported = new Set(supportedTiers(unit));
    if (supported.size === 0) continue;
    for (const tier of ELEM_TIERS) {
      if (!supported.has(tier)) continue;
      const b = byTier.get(tier)!;
      b.units.add(unit.section);
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryProblem(unit, SEED0 + i * STEP, tier);
        const f = frameOf(p.content);
        b.frames.set(f, (b.frames.get(f) ?? 0) + 1);
        b.n += 1;
        generated += 1;
      }
    }
  }
}

const path = wantForms
  ? "문형 (적재기가 부르는 것)"
  : "갈래 (사다리 판정기가 재는 것)";
console.log(`${GRADE} — D-72 축의 발문 꼴 census · 경로: ${path}\n`);

for (const tier of ELEM_TIERS) {
  const b = byTier.get(tier)!;
  console.log(
    `── ${tier} — 지문 ${b.frames.size}종 / 문항 ${b.n}건 / 소단원 ${b.units.size}개 ──`,
  );
  const top = [...b.frames].sort((a, b2) => b2[1] - a[1]).slice(0, 12);
  for (const [f, c] of top)
    console.log(`   ${String(c).padStart(4)}  ${f.slice(0, 96)}`);
  if (b.frames.size > top.length)
    console.log(`   … 그 밖 ${b.frames.size - top.length}종`);
  console.log("");
}

console.log(
  `훑은 것 — 소단원 ${units.length}개 · 문항 ${generated}건 · 씨앗 ${SEEDS}\n` +
    `⚠️ 이것은 계량기다. 「N종」은 이 지문 규칙이 접은 결과이지 «서로 다른 물음»의 수가` +
    `\n   아니다 — 지문이 같아도 소재가 다르면 학생에게는 다른 문항이다.`,
);
