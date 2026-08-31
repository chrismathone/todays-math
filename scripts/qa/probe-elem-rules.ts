/**
 * 초등 생성기 230문항에 가드를 댄다 — 원장님 육안 검수(2026-08-22) 결함을 규칙으로 접은 것.
 * 원장: `docs/planning/tracks/elem-engine-review-20260822.md`
 *
 *   npx tsx scripts/qa/probe-elem-rules.ts            # 전체
 *   npx tsx scripts/qa/probe-elem-rules.ts 초3        # 한 학년만
 *   npx tsx scripts/qa/probe-elem-rules.ts 초3 --list # 걸린 것 전량 나열
 *
 * 「끝났다」 = 이 스크립트가 **전 규칙 0** 을 찍는 것.
 *
 * ## ⚠️ R9 가 보는 것과 **안 보는 것** (g5 가 낸 갈래)
 *
 * ```
 * R9     씨앗마다 문항이 갈리나   ← 발문 + 그림 스펙
 * R9-b   그림이 늘 같지 않나      ← 그림 스펙
 * 안 봄   그 스펙이 **옳은가**      ← 라벨이 비었나 · 값이 그림과 맞나 · 그릴 수 있나
 * ```
 *
 * **셋째 줄이 없으면 다음 사람이 「그림은 다 봤다」고 읽는다.**
 *
 * ## ⚠️ R9 의 그림 축과 R9-b 는 **둘 다 「회귀 방지」다** — 오늘 뭘 고친 게 아니다
 *
 * 「고쳤다」와 「앞으로 안 나게 했다」는 다른 말이고, 섞어 적으면 다음 사람이 **오늘
 * 무언가 고쳐진 줄 알고** 그 축을 다시 안 본다. 2026-08-23 실측을 그대로 적는다:
 *
 * ```
 * R9 그림 축   넓혀서 «살린» 갈래 0     ← 발문이 씨앗마다 고정인 갈래가 트리에 하나도 없다
 * R9-b        실측 위반 0             ← 그림 붙는 소단원 전량이 이미 갈린다
 * ```
 *
 * 둘 다 **그런 갈래가 생기는 날** 처음 일한다. 지금 초록인 것은 규칙이 세다는 뜻이
 * 아니라 **아직 그 자리가 없다**는 뜻이다.
 * R9 는 「씨앗마다 **갈리나**」를 본다. **「그 스펙이 옳나」는 안 본다.**
 * 2026-08-23 실측이 그 경계를 보여 준다 — 초5 2-3-1 이 도형을 여덟 개까지 그리는데
 * 공용 라벨은 다섯(가~마)뿐이라 **여섯째부터 이름이 `undefined`** 였다(28/40 씨앗).
 * 발문·정답·해설이 다 멀쩡해 값 검산도 R1 도 초록이었고, **지면에서 도형에 이름이
 * 안 붙는다**는 것만 틀렸다. 스펙은 씨앗마다 **갈리므로** 넓힌 R9 도 안 잡는다.
 * **「R9 를 넓혔으니 그림은 검사된다」고 읽지 말 것** — 그건 다른 축이다.
 */
import { answerSkewAmongFigures, answersLookAlike } from "./answerSkewRule";
import { CORE_DIFFICULTIES } from "../../src/contracts/difficulty";
import { type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { openFence } from "./elemProbeFence";
import {
  arabicPolygons,
  bareNumbers,
  josaFaults,
  runawayDecimals,
  tooAdvanced,
  unfilledPlaceholders,
} from "../../src/lib/elementary/rules";

/** 다양성을 재는 씨앗들. 하나로는 「늘 같은 도형」이 구조적으로 안 보인다. */
const SEEDS = [20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242];

type Unit = ReturnType<typeof elementaryUnits>[number];

/**
 * 표준(`undefined`) + **그 소단원이 실제로 내는 갈래**.
 *
 * 🔴 D-113(2026-08-30): 종전에는 `supportedTiers(unit).length > 0 ? [undefined, ...ELEM_TIERS]`
 *    였다. `ELEM_TIERS` 는 **축 전체**(여섯)라, 축을 넓히자 아직 안 채운 갈래를
 *    만들려다 판정기가 통째로 죽었다. `supportedTiers` 는 등록 안 된 소단원에서
 *    `[]` 를 주므로 아래 한 줄이 옛 두 갈래를 **정확히** 대신한다.
 */
function variantsOf(unit: Unit): (ElemTier | undefined)[] {
  return [undefined, ...supportedTiers(unit)];
}

const tierLabel = (tier: ElemTier | undefined) => (tier ? ` «${tier}»` : "");

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
const listAll = process.argv.includes("--list");

/**
 * R9-b — 씨앗이 달라도 **그림**이 늘 같으면 결함이다.
 *
 * 함수로 빼 둔 이유: 지금 실측 위반이 **0**이라(그림 붙는 소단원 85개 전량 갈림)
 * 전량 검사만으로는 **이 규칙이 걸릴 수 있는지조차 알 수 없다.**
 * 0은 「깨끗」과 「못 셈」을 구분해 주지 않으므로 아래 `--selftest` 로 직접 시험한다.
 */
/**
 * **R9-c — 그림이 붙은 문항끼리 정답이 갈리나.**
 *
 * 🔴 「가·나·다 중에서 사다리꼴의 기호를 쓰시오」류에서 **정답이 늘 «가»** 이면,
 * 학생이 **발문을 안 읽고 «가»라고 써도 맞는다.** 실측(2026-08-24, figures 발견):
 * 초4 2-2-1 · 2-4-4 · 2-4-6 에서 그림 붙은 문항 **180건 전부 정답 «가»**.
 *
 * ## 왜 기존 축이 셋 다 못 봤나
 *
 * ㉠ R9·R9-b 는 **발문과 그림**만 본다 — `answer` 는 수 검사에만 쓰였다.
 * ㉡ `figureIsFixed` 는 그림이 **일부 씨앗에만** 붙으면 `"null"` 이 섞여 집합 크기가
 *    2가 되어 통과한다. 붙을 때는 늘 같은 그림인데도.
 * ㉢ **셀 전체**로 세면 그림 없는 씨앗들이 답을 갈라 0건이 된다.
 *    **「그림이 붙은 문항 안에서」로 좁혀야** 드러난다.
 *
 * ⚠️ **`figureIsFixed` 를 «null 무시»로 고치지 않았다.** 그러면 눈금
 * 「한 씨앗만 그림이 없다 — 걸리면 안 됨」과 **정면으로 부딪힌다**(일부러 그렇게
 * 박아 둔 자리다). 그리고 이 축이 더 세다 — 2-2-1 은 스펙이 **6가지로 갈리는데도**
 * 답이 늘 «가»라 그쪽으로는 구조적으로 안 잡힌다.
 *
 * ⚠️ **그림이 하나뿐이면 판정하지 않는다** — 견줄 짝이 없으면 «고정»과 «못 셈»이
 * 안 갈린다.
 */
// ⚠️ 문턱과 셈은 **순수 모듈 한 곳**에 있다(`answerSkewRule.ts`). 여기 다시 적지 말 것 —
// 이 파일은 최상단에서 전량 쓸기를 돌고 `process.exitCode` 까지 쓰므로 **시험이
// import 할 수 없다.** 그래서 규칙만 내려 두고 여기서는 가져다 쓴다.
export {
  ANSWER_SKEW_MAX,
  SKEW_MIN_SAMPLES,
  answersLookAlike,
  answerSkewAmongFigures,
  topAnswerShare,
} from "./answerSkewRule";

export function figureIsFixed(specs: (unknown | null)[]): boolean {
  const json = specs.map((s) => JSON.stringify(s ?? null));
  return json.some((j) => j !== "null") && new Set(json).size === 1;
}

/**
 * R9 — 씨앗이 달라도 **학생이 보는 지면**이 통째로 같으면 결함이다.
 *
 * ⚠️ **발문 «글자»만 보면 «수가 그림에만 있는» 갈래를 못 본다.** 초5 2-3-2·2-3-3·2-3-4
 * 는 세 변·격자 칸이 `markedShape` 안에 있어 발문이 늘 같은 한 문장인데 **지면은 씨앗마다
 * 다르다.** g5 가 말투 묶음을 넣어 통과시키고 **「가드를 만족시킨 것이지 결함을 고친 것이
 * 아니다」**라고 스스로 적어 드러났다(2026-08-23).
 *
 * ⚠️ **그림을 그리지 않는다 — 스펙을 견준다.** 씨앗마다 SVG 를 뽑으면 ⑴ 판정기가 몇 분이
 * 되어 **아무도 안 돌리고** ⑵ 그림 엔진에 매여 **엔진이 죽으면 이 판정기도 죽는다**
 * (그러면 「깨끗」과 「판정 못 함」이 안 갈린다). **스펙이 다르면 지면이 다르다.**
 *
 * ⚠️ **그림이 없는 갈래는 옛 잣대 그대로다 — 분기를 두지 않아도 그렇게 된다.** 스펙이
 * 전부 `null` 이면 합친 열쇠의 뒷자리가 상수라 발문만 견주는 것과 같아진다. 분기를 안
 * 두는 쪽이 **틀릴 자리가 하나 적다.** (분기를 두면 「발문을 한 문장으로 고정해 놓고
 * 그림만 흔들어 통과」하는 길이 열리는데, 그건 그림이 **있는** 갈래에만 허락된 것이다.)
 */
export function pageIsFixed(
  items: readonly { content: string; figureSpec?: unknown }[],
): boolean {
  const keys = items.map(
    (i) => `${i.content}\0${JSON.stringify(i.figureSpec ?? null)}`,
  );
  return keys.length > 0 && new Set(keys).size === 1;
}

if (process.argv.includes("--selftest")) {
  const rows: [string, boolean, boolean][] = [
    [
      "그림이 늘 같다 — 걸려야",
      figureIsFixed([{ kind: "a" }, { kind: "a" }, { kind: "a" }]),
      true,
    ],
    [
      "그림이 갈린다 — 통과해야",
      figureIsFixed([{ kind: "a" }, { kind: "b" }, { kind: "a" }]),
      false,
    ],
    ["그림이 아예 없다 — 통과해야", figureIsFixed([null, null, null]), false],
    // ── R9-c 눈금 (2026-08-24) — 「가」만 쓰면 맞는 문항을 막는다 ──────
    [
      "R9-c: 그림 붙은 문항의 답이 늘 같다 — 걸려야",
      !!answerSkewAmongFigures([
        { answer: "가", figureSpec: { kind: "a" } },
        { answer: "가", figureSpec: { kind: "a" } },
        { answer: "가", figureSpec: { kind: "a" } },
        { answer: "가", figureSpec: { kind: "a" } },
      ]),
      true,
    ],
    [
      "R9-c: 그림이 갈려도 **답이 늘 같으면** 걸려야 (2-2-1 이 그 모양)",
      !!answerSkewAmongFigures([
        { answer: "가", figureSpec: { kind: "a", n: 1 } },
        { answer: "가", figureSpec: { kind: "a", n: 2 } },
        { answer: "가", figureSpec: { kind: "a", n: 3 } },
        { answer: "가", figureSpec: { kind: "a", n: 4 } },
      ]),
      true,
    ],
    [
      "R9-c: 답이 갈리면 통과해야",
      !!answerSkewAmongFigures([
        { answer: "가", figureSpec: { kind: "a" } },
        { answer: "나", figureSpec: { kind: "a" } },
        { answer: "가", figureSpec: { kind: "a" } },
        { answer: "나", figureSpec: { kind: "a" } },
      ]),
      false,
    ],
    [
      "R9-c: 그림 붙은 것이 넷 미만이면 **판정하지 않는다**(못 셈과 쏠림을 안 가른다)",
      !!answerSkewAmongFigures([
        { answer: "가", figureSpec: { kind: "a" } },
        { answer: "가" },
      ]),
      false,
    ],
    [
      "한 씨앗만 그림이 없다 — 걸리면 안 됨",
      figureIsFixed([{ kind: "a" }, null, { kind: "a" }]),
      false,
    ],
    [
      "같은 kind 인데 값이 다르다 — 통과해야",
      figureIsFixed([{ k: 1 }, { k: 2 }]),
      false,
    ],
    // ── R9 지면 눈금 (2026-08-23) — 두 경우를 **둘 다** 못 박는다 ──────
    [
      "R9: 발문이 같아도 **그림이 갈리면** 통과해야 (수가 그림에만 있는 갈래)",
      pageIsFixed([
        {
          content: "세 변의 길이를 보고 넓이를 구하시오.",
          figureSpec: { k: 1 },
        },
        {
          content: "세 변의 길이를 보고 넓이를 구하시오.",
          figureSpec: { k: 2 },
        },
      ]),
      false,
    ],
    [
      "R9: 발문도 그림도 같으면 걸려야",
      pageIsFixed([
        { content: "같은 발문", figureSpec: { k: 1 } },
        { content: "같은 발문", figureSpec: { k: 1 } },
      ]),
      true,
    ],
    [
      "R9: **그림이 아예 없으면 옛 잣대다** — 발문이 같으면 걸려야(그림 뒤에 못 숨는다)",
      pageIsFixed([{ content: "같은 발문" }, { content: "같은 발문" }]),
      true,
    ],
    [
      "R9: 발문이 갈리면 통과해야",
      pageIsFixed([{ content: "발문 하나" }, { content: "발문 둘" }]),
      false,
    ],
  ];
  /*
   * 갈래 순회 눈금 (D-72).
   *
   * 2026-08-23 실측: 갈래를 안 세면 「정답 +7 · KaTeX 미감쌈 · 해설에 맨 숫자 999」를
   * 심어도 판정기 넷이 **전부 초록**이었다. 그래서 여기서 두 가지를 따로 잠근다 —
   *   ㉠ **순회에 갈래가 들었나** (`variantsOf` 가 5가지를 내나)
   *   ㉡ **든 것을 실제로 잡나** (R1 이 미감쌈·맨 숫자를 잡나)
   * ㉠ 만 있으면 「돌기는 도는데 아무것도 안 보는」 순회를 못 걸러낸다.
   *
   * 이 판정기가 맡는 결함은 **R1·R2·R3·R4·R9** 다. 정답의 «값»이 틀린 것은
   * `probe-elem-arithmetic` 몫이고 여기서는 구조적으로 안 잡힌다 — 그 경계도 아래에서 못 박는다.
   */
  const withTiers = elementaryUnits().find((u) => supportedTiers(u).length > 0);
  // D-113 — 「축 전체와 같은가」가 아니라 **핵심 넷을 다 갖는가**를 묻는다.
  // 축이 여섯이 되며 앞의 물음은 «덜 찼다»와 «축이 넓어졌다»를 구분 못 하게 됐다.
  const allUnitsHaveTiers = elementaryUnits().every((u) =>
    CORE_DIFFICULTIES.every((t) =>
      (supportedTiers(u) as readonly string[]).includes(t),
    ),
  );
  rows.push(
    [
      "갈래 등록 소단원은 5가지를 훑는다",
      variantsOf(withTiers!).length === 5,
      true,
    ],
    ["230개 전 소단원이 표준 + 4단을 훑는다", allUnitsHaveTiers, true],
    // 양성 — 갈래 문항에 심었던 그 결함을 R1 이 잡아야 한다
    ["정답을 KaTeX 로 안 감쌌다 — 걸려야", bareNumbers("117").length > 0, true],
    [
      "해설에 맨 숫자가 남았다 — 걸려야",
      bareNumbers("답은 999. $11\\times10=110$입니다.").length > 0,
      true,
    ],
    // 음성 — 깨끗한 갈래 문항은 통과해야 한다(거짓 경보는 가드를 끈다)
    ["감싼 정답은 통과해야", bareNumbers("$110$").length === 0, true],
    [
      "깨끗한 해설은 통과해야",
      bareNumbers(
        "직사각형의 넓이는 가로와 세로의 곱입니다. $11\\times10=110$입니다.",
      ).length === 0,
      true,
    ],
    // 경계 — 값이 틀린 것은 이 판정기가 **못 잡는다**. arithmetic 몫이다.
    [
      "값만 틀린 정답은 여기서 안 걸린다(경계)",
      bareNumbers("$117$").length === 0,
      true,
    ],
    // ── R-조사 눈금 (elem-g4 가 보낸 8행 그대로 + 경계) ────────────────────
    // 양성·음성이 **둘 다** 있어야 한다 — 양성만 대면 「지어냄」이 구조적으로 0이 된다.
    [
      "분수는 분자를 마지막에 읽는다 — 「십분의 육」 뒤 «를» 은 걸려야",
      josaFaults("$\\frac{6}{10}$를 더하면").length === 1,
      true,
    ],
    [
      "같은 분수에 «을» 은 통과해야",
      josaFaults("$\\frac{6}{10}$을 더하면").length === 0,
      true,
    ],
    [
      "「오분의 이」 뒤 «가» 는 통과해야",
      josaFaults("$\\frac{2}{5}$가 되었다").length === 0,
      true,
    ],
    [
      "같은 분수에 «이» 는 걸려야",
      josaFaults("$\\frac{2}{5}$이 되었다").length === 1,
      true,
    ],
    [
      "「일」 뒤 «을» 은 통과해야",
      josaFaults("$1$을 받아올려").length === 0,
      true,
    ],
    [
      "한 칸 띄운 조사도 본다 — 「칠분의 일」 뒤 «와» 는 걸려야",
      josaFaults("$4\\frac{1}{7}$ 와 같이").length === 1,
      true,
    ],
    [
      "같은 자리에 «과» 는 통과해야",
      josaFaults("$4\\frac{1}{7}$과 같이").length === 0,
      true,
    ],
    [
      "낱말의 첫 글자를 조사로 읽으면 안 된다 — 「$3$ 은행나무」",
      josaFaults("$3$ 은행나무").length === 0,
      true,
    ],
    // 규칙 ㉢ 을 빼면 이 한 줄이 빨개진다 — g5 실측으로 거짓 양성 41자리를 만들던 부류다
    // (65 → 9). 범위·비교 단원이 통째로 우는 것을 막는 자리이므로 눈금에 못 박는다.
    [
      "「$49$ 이상인」의 «이» 는 조사가 아니다 — ㉢ 이 없으면 41자리가 거짓 양성",
      josaFaults("$49$ 이상인 수를 모두 쓰시오").length === 0,
      true,
    ],
    // ── 🔴 로/으로 눈금 (2026-08-31 적대 검토가 찾은 자리) ──────────────────
    // 이 조사만 **«받침이 있나»가 아니라 «ㄹ 받침인가»**로 갈린다(일·칠·팔은 「로」).
    // 예전 표는 boolean 하나라 그 규칙을 **표현할 수 없어** 목록에도 없었고,
    // 그래서 12,240행을 먹여도 0이었다 — 그 0 이 「깨끗」으로 읽혀 초6 3차분의
    // 해설 세 줄이 195문항에서 틀린 채 지나갔다. **양방향으로 눈금을 박는다.**
    [
      "「삼」 뒤는 «으로» — 「$3$로」는 걸려야",
      josaFaults("$3$로 나눈다").length === 1,
      true,
    ],
    [
      "같은 자리에 «으로» 는 통과해야",
      josaFaults("$3$으로 나눈다").length === 0,
      true,
    ],
    [
      "🔴 ㄹ 받침은 «로» — 「$8$으로」는 걸려야(받침은 있지만 팔이다)",
      josaFaults("$8$으로 나눈다").length === 1,
      true,
    ],
    [
      "같은 자리에 «로» 는 통과해야 — 이 줄이 boolean 표로는 못 서던 자리다",
      josaFaults("$8$로 나눈다").length === 0,
      true,
    ],
    [
      "「십」 뒤는 «으로» — 「$10$로」는 걸려야",
      josaFaults("$10$로 나눈다").length === 1,
      true,
    ],
    [
      "분수도 분자로 읽는다 — 「십분의 육」 뒤 «로» 는 걸려야",
      josaFaults("$\\frac{6}{10}$로 나눈다").length === 1,
      true,
    ],
    [
      "「구분의 이」 뒤 «로» 는 통과해야",
      josaFaults("$\\frac{2}{9}$로 나눈다").length === 0,
      true,
    ],
    // 경계 — «통과»가 아니라 «안 잼»이다. 이 줄이 없으면 다음 사람이 「□ 는 검사된다」고 읽는다.
    [
      "□ 는 소리를 모른다 — 판정 **밖**이다(통과가 아니라 안 잼, 경계)",
      josaFaults("$1\\frac{\\square}{9}$를 뺀").length === 0,
      true,
    ],
    // ⚠️ 이 «판정 밖»은 이제 `probe-elem-unit-josa` 가 맡는다(2026-08-23).
    //    「아무도 안 본다」로 읽지 말 것 — 그쪽이 지면에서 9,634자리를 잰다.
    [
      "단위가 소리를 바꾸는 자리는 여기서 판정 밖이다 — 「$3$ kg을」(경계)",
      josaFaults("$3$ kg을 담았다").length === 0,
      true,
    ],
  );

  let bad = 0;
  for (const [why, got, want] of rows) {
    if (got !== want) bad += 1;
    console.log(`  ${got === want ? "✅" : "❌"} ${why}`);
  }
  console.log(
    bad === 0
      ? // 개수·묶음을 손으로 적으면 눈금을 늘릴 때마다 거짓말이 된다 — 세어서 찍는다.
        `\n✅ 눈금 ${rows.length}건 (R9-b · 갈래 순회 · R조사)`
      : `\n❌ ${bad}건 어긋남 — **이 판정기를 믿지 마라**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

// 재는 동안 생성기가 쓰이면 이 수치는 못 쓴다. 2026-08-23 에 이 판정기가 **반쯤 고쳐진**
// g3.ts 를 읽고 **거짓 빨강**을 냈고, 그것이 남을 「이미 고친 것」을 다시 고치게 만들었다.
// 거짓 초록은 결함을 숨기고, 거짓 빨강은 **남의 시간을 태운다** — 둘 다 이 울타리가 막는다.
const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
const units = elementaryUnits().filter(
  (u) => !gradeArg || u.grade === gradeArg,
);

type Hit = { rule: string; where: string; detail: string };
const hits: Hit[] = [];
const add = (rule: string, where: string, detail: string) =>
  hits.push({ rule, where, detail });

/** 발문 중복은 **전체** 를 봐야 한다 — 학년을 걸러도 분모는 230 이다. */
const allByContent = new Map<string, string>();
for (const unit of elementaryUnits()) {
  for (const tier of variantsOf(unit)) {
    const p = generateElementaryProblem(unit, undefined, tier);
    const where = `${p.grade} ${p.section}${tierLabel(tier)}`;
    const prev = allByContent.get(p.content);
    if (prev) {
      if (!gradeArg || p.grade === gradeArg) {
        add("R5 발문중복", where, `= ${prev}`);
      }
    } else {
      allByContent.set(p.content, where);
    }
  }
}

/** 실제로 몇 «갈래»를 훑었나. 소단원 수보다 커야 갈래가 순회에 든 것이다. */
let visited = 0;

for (const unit of units) {
  for (const tier of variantsOf(unit)) {
    visited += 1;
    checkOne(unit, tier);
  }
}

function checkOne(unit: Unit, tier: ElemTier | undefined): void {
  const items = SEEDS.map((s) => generateElementaryProblem(unit, s, tier));
  const where = `${unit.grade} ${unit.section}${tierLabel(tier)}`;

  /*
   * R1~R4 를 **전 씨앗**에 댄다.
   *
   * ⚠️ 예전에는 기본 씨앗 **하나**만 봤다. 그러면 「어떤 씨앗에서만 나는 결함」이
   * 구조적으로 안 보인다 — 2026-08-23 에 실측했다: 갈래 문항의 직사각형 가지에
   * 결함을 심었는데 기본 씨앗은 정사각형 가지를 타서 **초록**이었다.
   * R9 용으로 이 8개를 이미 뽑고 있으므로 비용은 사실상 0이다.
   *
   * 같은 결함이 여덟 번 찍히지 않게 규칙마다 **한 번만** 적고 몇 씨앗에서 났는지 센다.
   */
  const once = (rule: string, hitsPerSeed: (string | null)[]) => {
    const bad = hitsPerSeed
      .map((d, i) => (d ? { d, seed: SEEDS[i]! } : null))
      .filter((x): x is { d: string; seed: number } => x !== null);
    if (bad.length === 0) return;
    const tail =
      bad.length === SEEDS.length
        ? "전 씨앗"
        : `씨앗 ${bad.length}/${SEEDS.length}`;
    add(rule, where, `${bad[0]!.d} (${tail}, 예: ${bad[0]!.seed})`);
  };

  once(
    "R1 KaTeX밖숫자",
    items.map((p) => {
      const bare = [
        ...bareNumbers(p.content).map((x) => `발문:${x}`),
        ...bareNumbers(p.answer).map((x) => `정답:${x}`),
        ...bareNumbers(p.solution).map((x) => `해설:${x}`),
      ];
      return bare.length ? bare.slice(0, 6).join(" ") : null;
    }),
  );
  once(
    "R2 샌소수",
    items.map(
      (p) =>
        runawayDecimals(`${p.content}\n${p.answer}\n${p.solution}`)[0] ?? null,
    ),
  );
  once(
    "R3 학년밖연산",
    items.map((p) => {
      const adv = tooAdvanced(p.orderIndex, p.solution);
      return adv.length ? adv.join(",") : null;
    }),
  );
  once(
    "R4 도형이름",
    items.map((p) => {
      const all = `${p.content}\n${p.answer}\n${p.solution}`;
      const poly = [...arabicPolygons(all), ...unfilledPlaceholders(all)];
      return poly.length ? poly.join(",") : null;
    }),
  );
  // R-조사 — 수식 뒤 조사가 읽는 소리와 맞는가(2026-08-23 elem-g4 이식).
  // ⚠️ `variantsOf` 가 **표준을 포함**하므로 여기 오는 items 에 표준이 들어 있다 —
  //    학년별 검사들이 갈래만 돌아 표준이 구조적으로 0이던 그 자리를 이 순회가 메운다.
  once(
    "R조사",
    items.map((p) => {
      const hits = [
        ...josaFaults(p.content).map((x) => `발문:${x}`),
        ...josaFaults(p.solution).map((x) => `해설:${x}`),
      ];
      return hits.length ? hits.slice(0, 4).join(" ") : null;
    }),
  );

  // R9 — 씨앗을 바꿔도 **지면**이 통째로 같으면 단조롭다(`pageIsFixed` 주석 참조).
  // 원장님: 「항상 도형은 다양할수록 좋음. 너무 단조로우면 재미도 학습의욕도 떨어짐」
  const variants = new Set(items.map((i) => i.content));
  // ⚠️ **이 한 줄(배선)은 눈금이 못 지킨다.** 아래 눈금은 `pageIsFixed` 를 **직접** 부르므로,
  //    여기를 옛 잣대(`variants.size === 1`)로 되돌려도 눈금은 초록이다 — 실제로 변이로
  //    확인했다(2026-08-23). 전량 쓸기도 못 가른다: 오늘 트리에 「발문 고정 + 그림 갈림」
  //    갈래가 **0**이라 두 잣대의 답이 같기 때문이다(그런 갈래가 생기면 그때 갈린다).
  //    이 파일의 R1~R4 도 같은 성질이다(눈금이 `bareNumbers` 등 **함수**를 본다) —
  //    R9 만의 구멍이 아니라 **이 판정기의 구조**다. 고치려면 규칙 적용을 한 함수로 빼고
  //    그 함수를 눈금이 불러야 한다. 지금은 그렇지 않다는 것을 여기 적어 둔다.
  if (pageIsFixed(items))
    add("R9 고정문항", where, `씨앗 ${SEEDS.length}개 전부 동일(발문·그림)`);

  // R9-b — **그림**도 갈려야 한다.
  //
  // ⚠️ 위 검사는 `content` **만** 본다. 그런데 원장님의 **첫 번째** 지적이
  // 「직각인 도형의 기호를 쓰라고했는데 … **문제마다 똑같은 도형 출제하지말고**」였다 —
  // 즉 **그림**이었다. 발문만 갈리고 그림이 늘 같으면 그 결함은 구조적으로 안 보인다.
  // elem-g4 가 「R9 는 figureSpec 을 안 본다」고 짚어 줘서 알았다(2026-08-22).
  //
  // 지금 실측 위반 0(그림 붙는 소단원 85개 전량 갈림)이라 **회귀 방지용**이다.
  // 일부러 한 가지 그림만 써야 하는 소단원이 생기면 여기에 걸린다 — 그때 근거를 남기면 된다.
  if (figureIsFixed(items.map((i) => i.figureSpec ?? null))) {
    add(
      "R9 고정그림",
      where,
      `발문 ${variants.size}가지인데 그림은 씨앗 ${SEEDS.length}개 전부 동일`,
    );
  }

  // R9-c — **그림이 붙은 문항끼리 정답이 갈려야 한다**(함수 머리말 참조).
  //    「가」만 쓰면 맞는 문항을 막는다.
  //
  // 🔴 **걸리면 넓게 다시 잰다 — 씨앗 8개로는 «쏠림»과 «고정»이 안 갈린다.**
  //    실측(2026-08-24): 초6 2-3-3 «기본» 은 답 분포가 $3$×361 · $2$×39 인데,
  //    8개를 뽑으면 전부 $3$ 일 확률이 **43%** 다. 그대로 두면 거짓 경보가 나고,
  //    거짓 경보는 가드를 끈다(2026-08-20). 그래서 의심스러운 셀만 **120씨앗**으로
  //    되재고, 그때도 하나뿐이면 **구조적으로 고정**이다.
  if (answersLookAlike(items)) {
    const wide: { answer: string; figureSpec?: unknown }[] = [];
    for (let seed = 0; seed < 120; seed += 1) {
      try {
        wide.push(generateElementaryProblem(unit, seed, tier));
      } catch {
        /* 던지는 씨앗은 `probe-elem-throw` 가 따로 본다 */
      }
    }
    // ⚠️ 넓혀서 그림이 2건 미만이면 **판정하지 않는다** — 못 셈과 고정이 안 갈린다.
    const skew = answerSkewAmongFigures(wide);
    if (skew) {
      add(
        "R9-c 정답고정",
        where,
        `씨앗 120 중 그림 붙은 ${skew.n}문항에서 «${skew.answer}» 가 ${Math.round(skew.share * 100)}% — 찍으면 맞는다`,
      );
    }
  }
}

const byRule = new Map<string, Hit[]>();
for (const h of hits) {
  if (!byRule.has(h.rule)) byRule.set(h.rule, []);
  byRule.get(h.rule)!.push(h);
}

// **찍기 전에** 닫는다 — 뒤에 닫으면 못 쓸 수치를 이미 내보낸 뒤다.
fence.close();

console.log(
  `대상 소단원 ${units.length}${gradeArg ? ` (${gradeArg})` : ""} · ` +
    `훑은 갈래 ${visited}개 (표준 + 등록된 난이도 4단) · ${fence.scopeLine()}\n`,
);
if (hits.length === 0) {
  console.log("✅ 전 규칙 0");
} else {
  for (const [rule, list] of [...byRule].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    console.log(`${rule.padEnd(16)} ${String(list.length).padStart(4)}`);
    for (const h of listAll ? list : list.slice(0, 4)) {
      console.log(`      · ${h.where} → ${h.detail}`);
    }
    if (!listAll && list.length > 4)
      console.log(`      … ${list.length - 4}건 더 (--list)`);
  }
  console.log(`\n합계 ${hits.length}건`);
}
process.exitCode = hits.length === 0 ? 0 : 1;
