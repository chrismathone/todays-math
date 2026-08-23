/**
 * 초등 생성기 230문항에 가드를 댄다 — 원장님 육안 검수(2026-08-22) 결함을 규칙으로 접은 것.
 * 원장: `docs/planning/tracks/elem-engine-review-20260822.md`
 *
 *   npx tsx scripts/qa/probe-elem-rules.ts            # 전체
 *   npx tsx scripts/qa/probe-elem-rules.ts 초3        # 한 학년만
 *   npx tsx scripts/qa/probe-elem-rules.ts 초3 --list # 걸린 것 전량 나열
 *
 * 「끝났다」 = 이 스크립트가 **전 규칙 0** 을 찍는 것.
 */
import { ELEM_TIERS, type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
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
 * 이 소단원이 낼 수 있는 문항 갈래 — 표준(`undefined`) + 등록된 난이도 4단 (D-71·D-72).
 *
 * ⚠️ **갈래를 안 세면 그 축은 가드 밖이다.** 2026-08-23 에 실측했다 — 파일럿 갈래에
 * 「정답 +7 · KaTeX 미감쌈 · 해설에 맨 숫자 999」를 심었는데 판정기 넷이 **전부 초록**이었다.
 * 표준 문항만 뽑고 있었기 때문이다. 「없는 축은 변이시킬 수 없다」의 그 자리다.
 *
 * 갈래가 없는 소단원은 표준 하나뿐이라 예전과 완전히 같다.
 */
function variantsOf(unit: Unit): (ElemTier | undefined)[] {
  return supportedTiers(unit).length > 0
    ? [undefined, ...ELEM_TIERS]
    : [undefined];
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
export function figureIsFixed(specs: (unknown | null)[]): boolean {
  const json = specs.map((s) => JSON.stringify(s ?? null));
  return json.some((j) => j !== "null") && new Set(json).size === 1;
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
  const withoutTiers = elementaryUnits().find(
    (u) => supportedTiers(u).length === 0,
  );
  rows.push(
    [
      "갈래 등록 소단원은 5가지를 훑는다",
      variantsOf(withTiers!).length === 5,
      true,
    ],
    [
      "갈래 없는 소단원은 표준 1가지만",
      variantsOf(withoutTiers!).length === 1,
      true,
    ],
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
    // 경계 — «통과»가 아니라 «안 잼»이다. 이 줄이 없으면 다음 사람이 「□ 는 검사된다」고 읽는다.
    [
      "□ 는 소리를 모른다 — 판정 **밖**이다(통과가 아니라 안 잼, 경계)",
      josaFaults("$1\\frac{\\square}{9}$를 뺀").length === 0,
      true,
    ],
    [
      "단위가 소리를 바꾸는 자리도 판정 밖이다 — 「$3$ kg을」(경계)",
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

  // R9 — 씨앗을 바꿔도 문항이 통째로 같으면 단조롭다.
  // 원장님: 「항상 도형은 다양할수록 좋음. 너무 단조로우면 재미도 학습의욕도 떨어짐」
  const variants = new Set(items.map((i) => i.content));
  if (variants.size === 1)
    add("R9 고정문항", where, `씨앗 ${SEEDS.length}개 전부 동일`);

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
}

const byRule = new Map<string, Hit[]>();
for (const h of hits) {
  if (!byRule.has(h.rule)) byRule.set(h.rule, []);
  byRule.get(h.rule)!.push(h);
}

console.log(
  `대상 소단원 ${units.length}${gradeArg ? ` (${gradeArg})` : ""} · ` +
    `훑은 갈래 ${visited}개 (표준 + 등록된 난이도 4단)\n`,
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
