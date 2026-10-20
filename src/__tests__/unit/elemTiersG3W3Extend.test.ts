/**
 * 초3 물결 3 — `1-4 곱셈` 의 **심화중** (D-113 · D-115, 2026-08-31).
 *
 * ## 🔴 이 파일은 한 번 **더 큰 것을 지키는 데 실패했다** — 그 자국을 남긴다
 *
 * 처음에는 `1-1-3`·`1-1-4` 의 「차의 방향」 심화중도 여기서 잠갔다. 그 검사는
 * **「후보가 정확히 하나 남는가」**를 물었고 전부 초록이었다. 그런데 적대 검토가
 * 전수로 재니 **답이 20,625/20,625 로 «지면 두 수의 차»**였다 — 반증 ⑥ 위반이다.
 * 이 파일의 물음이 「답이 **하나로 정해지나**」였고 ⑥ 이 묻는 것은 「답이 **나오나**」
 * 라서, 그 갈래는 **구조적으로 이 시험의 축 밖**에 있었다. 갈래는 거뒀다.
 *
 * 그래서 여기에 **축을 하나 더** 두었다 — `pmOneStepReachable`(「지면 두 수의
 * `+`·`−` 한 걸음」). 지금 초3 에는 그 축이 물 확대 갈래가 **하나도 없지만**,
 * 눈금(양성·음성 대조군)을 같이 두어 그 0 이 «깨끗»인지 «못 셈»인지 갈리게 했다.
 *
 * ## 무엇을 잠그나
 *
 *   ⑴ **심화중** — 되짚기 사슬에 **굳지 않는 마디가 하나** 있고(후보가 둘 이상),
 *      **그 소단원의 성질이 정확히 하나만** 남긴다. 성질을 빼면 여럿이 남는다
 *      (반증 ①·⑤). 성질은 «끝까지 계산하지 않고» 가른다(D-115 ⑾ → 중이지 상이 아니다).
 *   ⑵ **소단원 이름 약속** — 1-4-3 은 십의 자리에서만, 1-4-5 는 두 자리 모두 올림.
 *   ⑶ **반증 ⑥** — 지면에 찍힌 수를 순방향으로 엮어 답이 나오면 중·상이 아니다.
 *      제품 규칙(`forwardReach`)을 그대로 부르고, 입력은 **지면**에서 읽는다.
 *      곱셈 길은 `forwardReachable`, `+`·`−` 길은 `pmOneStepReachable` 이 본다.
 *   ⑷ **파일럿 `2-1-3` 과 같은 문항이 되지 않는다** — (몇십몇)×(몇)에서
 *      「곱이 세 자리」 ≡ 「십의 자리 올림」 은 **항등식**이라, 후보들의 십의 자리
 *      올림이 갈리면 2-1-3 의 「곱의 자릿수」로도 똑같이 갈린다. 여기서 그것을 잠근다.
 *   ⑸ **비운 자리를 잠근다** — 되살리려면 보고서의 «세어서 나온 근거»를 다시 대야 한다.
 *   ⑹ **해설이 후보를 다 곱해 보이지 않는다** — 두 자리 곱은 «정답 것 하나»뿐이다.
 *      이것이 둘 다를 지킨다: `mulCarryClass`(첫 `$ab\times c$` 하나만 읽는다)의
 *      거짓 빨강과, 열거 판정기의 문턱(같은 연산 셋).
 *   ⑺ 🔴 **해설의 «산문»** — 버릴 후보를 왜 버리는지 적은 문장의 **수**가 맞는가.
 *      값 검사·KaTeX·조사 판정기는 이 축을 통째로 못 본다(적대 검토 §3).
 *
 * ## 어떻게 판정하나 — **생성기를 되부르지 않는다**
 *
 * 아래 판정은 전부 **발문의 수만 읽어 사슬을 처음부터 다시 세운다.** 생성기의 풀을
 * import 하면 「목록이 목록과 같다」가 되어 아무것도 안 지킨다. 올림도 여기서 다시
 * 센다(제품 함수를 안 부른다) — 규칙이 갈리면 빨개져야 한다.
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다.
 * 2. `pmOneStepReachable` 은 **한 걸음만** 본다. 두 걸음 이상으로 닿는 자리는
 *    구조적으로 0이다 — 넓히면 정당한 응용까지 물어 늘 우는 가드가 된다.
 * 3. 읽을 수 없는 발문은 **통과가 아니라 빨강**이다. 발문 문법을 넓히면 아래 파서도
 *    같이 넓혀야 한다 — 그게 이 시험의 이빨이다.
 */
import { describe, expect, it } from "vitest";

import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  pmOneStepReachable,
  rat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 24 }, (_, i) => 20260831 + i * 7919);

type Carry = "none" | "ones" | "tens" | "both";

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function intAnswer(answer: string): number {
  expect(answer, `정답이 한 값이 아니다: ${answer}`).toMatch(/^\$\d+\$$/);
  return Number(answer.slice(1, -1));
}

/** $(\text{몇십몇})\times(\text{몇})$의 올림 종류 — 여기서 다시 센다. */
function carryOf(a: number, k: number): Carry {
  const t = Math.floor(a / 10);
  const o = a % 10;
  const ones = o * k >= 10;
  const tens = t * k + Math.floor((o * k) / 10) >= 10;
  return ones ? (tens ? "both" : "ones") : tens ? "tens" : "none";
}

/** 반증 ⑥ — 지면의 수만으로 답이 나오면 안 된다. 두 길을 다 본다. */
function forwardOk(content: string, ans: number, at: string): void {
  const page = pageNumbers(content);
  expect(page.length, `${at}: 지면에서 수를 하나도 못 읽었다`).toBeGreaterThan(
    1,
  );
  expect(
    answerPrintedOnPage(page, rat(ans)),
    `${at}: 답이 지면에 이미 찍혀 있다`,
  ).toBe(false);
  expect(
    forwardReachable(page, rat(ans)),
    `${at}: 곱셈 길로 답이 나온다 — 반증 ⑥`,
  ).toBe(false);
  expect(
    pmOneStepReachable(page, rat(ans)),
    `${at}: 지면 두 수의 한 걸음으로 답이 나온다 — 반증 ⑥`,
  ).toBe(false);
}

/* ── 1-4-3 · 1-4-5 — 「곱의 일의 자리」가 후보를 만들고 **올림의 종류**가 남긴다 ── */

const CARRY_WORDS: [RegExp, Carry][] = [
  [/일의 자리와 십의 자리에서 모두 올림이 있/, "both"],
  [/일의 자리에서만 올림이 있/, "ones"],
  [/십의 자리에서만 올림이 있/, "tens"],
  [/올림이 없/, "none"],
];

function readMul14(content: string): [number, number, Carry] {
  const am = content.match(/\$(\d{2})(?:\$|\\times)/);
  expect(am, `곱해지는 수를 못 읽었다\n${content}`).toBeTruthy();
  const rm = content.match(/일의 자리 숫자[가는] \$(\d)\$/);
  expect(rm, `곱의 일의 자리를 못 읽었다\n${content}`).toBeTruthy();
  const hit = CARRY_WORDS.find(([re]) => re.test(content));
  expect(hit, `올림 조건을 못 읽었다\n${content}`).toBeTruthy();
  return [Number(am![1]), Number(rm![1]), hit![1]];
}

/**
 * ⑺ 해설의 **산문**을 다시 센다 — 「곱하는 수가 $k$ 일 때는 …」 문장의 수가 맞나.
 *
 * 🔴 이 축에는 2026-08-31 까지 가드가 **하나도 없었다.** 적대 검토가
 *    `t*k + ⌊o*k/10⌋` → `t*k` 변이를 걸었더니 **8,000표본의 9.1%에서 결론이
 *    뒤집히는데도 시험이 전부 초록**이었다. 값 검산은 정답만 보고, KaTeX 는
 *    유효한 수식이라 안 울고, 조사 판정기는 낱말만 본다.
 */
function checkMul14Why(
  a: number,
  ans: number,
  want: Carry,
  cand: readonly number[],
  sol: string,
  at: string,
): void {
  const t = Math.floor(a / 10);
  const o = a % 10;
  const wantOnes = want === "ones" || want === "both";
  let seen = 0;
  for (const k of cand) {
    if (k === ans) continue;
    const onesCarry = o * k >= 10;
    // 어긋나는 **첫 자리**만 말한다 — 일의 자리가 이미 어긋나면 십의 자리는 안 본다.
    const re =
      onesCarry !== wantOnes
        ? new RegExp(
            `곱하는 수가 \\$${k}\\$일 때는 일의 자리끼리의 곱이 \\$(\\d+)\\$입니다\\. 그래서 일의 자리에서 올림이 (생깁니다|생기지 않습니다)`,
          )
        : new RegExp(
            `곱하는 수가 \\$${k}\\$일 때는 십의 자리끼리의 곱에 올림까지 더하면 \\$(\\d+)\\$입니다\\. 그래서 십의 자리에서 올림이 (생깁니다|생기지 않습니다)`,
          );
    const m = sol.match(re);
    expect(
      m,
      `${at}: 후보 ${k} 를 버리는 문장이 없거나 자리 이름이 틀리다\n${sol}`,
    ).toBeTruthy();
    const value = Number(m![1]);
    const said = m![2] === "생깁니다";
    if (onesCarry !== wantOnes) {
      expect(
        value,
        `${at}: 후보 ${k} 의 «일의 자리끼리의 곱» 값이 틀리다`,
      ).toBe(o * k);
      expect(said, `${at}: 후보 ${k} 의 일의 자리 올림 결론이 틀리다`).toBe(
        onesCarry,
      );
    } else {
      const tens = t * k + Math.floor((o * k) / 10);
      expect(
        value,
        `${at}: 후보 ${k} 의 «십의 자리끼리의 곱에 올림까지» 값이 틀리다`,
      ).toBe(tens);
      expect(said, `${at}: 후보 ${k} 의 십의 자리 올림 결론이 틀리다`).toBe(
        tens >= 10,
      );
    }
    seen += 1;
    // 🔴 **지금 풀에서는 «십의 자리» 가지가 구조적으로 안 돈다.** 겹침 가드가 후보들의
    //    십의 자리 올림을 같게 만들었으므로, 버릴 후보는 반드시 **일의 자리**에서 갈린다
    //    (실측 8,000표본 · 십의 자리 가지 0). 그 사실을 여기서 못 박는다 — 이 단정이
    //    빨개지면 그 가지가 **되살아난 것**이고, 그때는 위 `else` 쪽 검사가 처음으로
    //    일을 시작한다. 죽은 가지인 줄 모르고 「가드가 있다」고 읽으면 안 된다.
    expect(
      onesCarry !== wantOnes,
      `${at}: 후보 ${k} 가 «일의 자리»로 안 갈린다 — mul14Why 의 십의 자리 가지가 살아났다`,
    ).toBe(true);
  }
  expect(
    seen,
    `${at}: 버릴 후보가 하나도 없다 — 그러면 되짚기가 굳는다`,
  ).toBeGreaterThan(0);

  // ⑻ 🔴 **정답 문장**의 수도 다시 센다 — 여기는 2026-08-31 까지 아무 시험도 안 봤다.
  //    「곱하는 수가 $b$ 일 때는 일의 자리끼리의 곱이 $o×b=ob$, 십의 자리끼리의 곱에
  //     올림까지 더하면 $X$ 입니다. 그래서 {소단원 문구}.」
  //    버릴 후보 쪽만 보던 검사는 이 문장을 구조적으로 못 본다.
  const m = sol.match(
    /곱하는 수가 \$(\d+)\$일 때는 일의 자리끼리의 곱이 \$(\d+)\\times(\d+)=(\d+)\$, 십의 자리끼리의 곱에 올림까지 더하면 \$(\d+)\$입니다\. 그래서 ([^.]+)\./,
  );
  expect(m, `${at}: 정답 문장을 못 읽었다\n${sol}`).toBeTruthy();
  expect(Number(m![1]), `${at}: 정답 문장의 곱하는 수가 답이 아니다`).toBe(ans);
  expect(
    Number(m![2]),
    `${at}: 정답 문장의 일의 자리가 $a$의 것이 아니다`,
  ).toBe(o);
  expect(Number(m![3]), `${at}: 정답 문장의 곱하는 수가 답이 아니다`).toBe(ans);
  expect(
    Number(m![4]),
    `${at}: 정답 문장의 «일의 자리끼리의 곱» 값이 틀리다`,
  ).toBe(o * ans);
  expect(
    Number(m![5]),
    `${at}: 정답 문장의 «십의 자리끼리의 곱에 올림까지» 값이 틀리다`,
  ).toBe(t * ans + Math.floor((o * ans) / 10));
  expect(
    m![6],
    `${at}: 정답 문장이 맺는 올림 문구가 소단원 이름과 다르다`,
  ).toBe(CARRY_SENTENCE[want]);
}

/** 소단원 이름이 약속한 올림을 **말로** — 생성기의 문자열을 안 부르고 여기 다시 적는다. */
const CARRY_SENTENCE: Record<Carry, string> = {
  none: "올림이 없습니다",
  ones: "일의 자리에서만 올림이 있습니다",
  tens: "십의 자리에서만 올림이 있습니다",
  both: "일의 자리와 십의 자리에서 모두 올림이 있습니다",
};

function checkMul14(code: string, want: Carry): void {
  const u = unitOf(code);
  for (const seed of SEEDS) {
    const p = generateElementaryProblem(u, seed, "심화중");
    const at = `${code} 심화중 씨앗 ${seed}`;
    const ans = intAnswer(p.answer);
    const [a, r, said] = readMul14(p.content);

    // ⑴ 발문이 내건 올림 종류가 **소단원 이름**과 같다.
    expect(said, `${at}: 발문의 올림 조건이 소단원 이름과 다르다`).toBe(want);

    // ⑵ 마디가 안 굳는다 — 곱셈구구가 후보를 **둘 이상** 만든다(반증 ①·⑤).
    //    발문이 「한 자리 수」라 했으므로 후보는 $0$~$9$ 전부에서 센다.
    const o = a % 10;
    const cand: number[] = [];
    for (let k = 0; k <= 9; k += 1) if ((o * k) % 10 === r) cand.push(k);
    expect(
      cand.length,
      `${at}: 후보가 하나면 되짚기만으로 굳는다 — 그건 심화하다`,
    ).toBeGreaterThan(1);

    // ⑶ 성질이 **정확히 하나만** 남기고, 그 하나가 답이다.
    const keep = cand.filter((k) => carryOf(a, k) === want);
    expect(keep, `${at}: 성질이 남기는 후보`).toEqual([ans]);
    expect(carryOf(a, ans), `${at}: 답의 곱셈이 소단원 이름 밖이다`).toBe(want);
    expect(
      ans,
      `${at}: 곱하는 수가 $2$보다 작으면 곱셈이 아니다`,
    ).toBeGreaterThan(1);
    expect((a * ans) % 10, `${at}: 곱의 일의 자리가 발문과 다르다`).toBe(r);

    // ⑷ 🔴 파일럿 `2-1-3` 과 **같은 문항**이 아니다 — 후보들의 십의 자리 올림이
    //    갈리면 「곱이 두 자리냐 세 자리냐」로도 똑같이 갈린다(항등식).
    const tensOf = (k: number) =>
      carryOf(a, k) === "tens" || carryOf(a, k) === "both";
    expect(
      new Set(cand.map(tensOf)).size,
      `${at}: 후보들의 «곱의 자릿수»가 갈린다 — 파일럿 2-1-3 과 같은 문항이 된다`,
    ).toBe(1);

    // ⑸ 지면에 찍히는 수는 **$a$ 와 $r$ 둘뿐**이다. 울타리 문구가 낱 수를 하나 더
    //    찍으면(예전의 「$1$ 보다 큰」) 뜻 없는 한 걸음이 답에 닿는다.
    const page = pageNumbers(p.content);
    expect(
      page.map((v) => v.n).sort((x, y) => x - y),
      `${at}: 지면의 수가 $a$·$r$ 둘이 아니다\n${p.content}`,
    ).toEqual([r, a].sort((x, y) => x - y));

    // ⑹ 해설의 **두 자리 곱은 정답 것 하나뿐**이다.
    //    `mulCarryClass` 는 첫 `$ab\times c$` 하나만 읽으므로, 버릴 후보를 먼저
    //    곱해 보이면 조건 판정기가 거짓 빨강을 낸다(토대 17 §3 1-4 함정 (a)).
    //    같은 규칙이 열거 판정기의 문턱(같은 연산 셋)도 지킨다.
    const sol = p.solution ?? "";
    const wide = [...sol.matchAll(/\$(\d{2})\\times(\d)(?!\d)/g)];
    expect(wide.length, `${at}: 해설의 두 자리 곱은 하나여야 한다`).toBe(1);
    expect(
      Number(wide[0]![1]),
      `${at}: 해설의 두 자리 곱이 발문의 수가 아니다`,
    ).toBe(a);
    expect(
      Number(wide[0]![2]),
      `${at}: 해설의 두 자리 곱이 정답 것이 아니다`,
    ).toBe(ans);
    const times = [...sol.matchAll(/\$[^$]*\\times[^$]*=[^$]*\$/g)].length;
    expect(
      times,
      `${at}: 해설의 곱셈 등식이 셋이면 열거 판정기가 운다`,
    ).toBeLessThan(3);

    // ⑺ 해설 산문의 수가 맞다.
    checkMul14Why(a, ans, want, cand, sol, at);

    forwardOk(p.content, ans, at);
  }
}

describe("초3 물결 3 — 1-4 의 심화중 (D-113 · D-115)", () => {
  /* ── 눈금 — 이 파일의 자들이 «아니오»를 낼 수 있나 ────────────────────────
   *
   * 0 은 «깨끗»과 «못 셈»을 안 가른다. 아래 셋은 **일부러 틀린 입력**을 대어
   * 판정 함수가 실제로 갈라내는지 먼저 본다. 이게 없으면 위 검사들이 늘 초록인
   * 이유가 「문항이 옳아서」인지 「자가 눈이 멀어서」인지 알 수 없다.
   */
  it("눈금 — 올림을 세는 자가 «아니오»를 낸다", () => {
    expect(carryOf(14, 2)).toBe("none");
    expect(carryOf(14, 7)).toBe("ones");
    expect(carryOf(42, 3)).toBe("tens");
    expect(carryOf(24, 9)).toBe("both");
  });

  it("눈금 — 발문 파서가 못 읽는 글을 통과시키지 않는다", () => {
    expect(() => readMul14("$14$ 에 어떤 수를 곱하시오.")).toThrow();
    expect(() =>
      // 올림 조건이 없는 발문.
      readMul14("$14$ 의 곱의 일의 자리 숫자가 $8$ 입니다."),
    ).toThrow();
  });

  it("🔴 눈금 — 반증 ⑥ 의 두 자가 **둘 다** «닿는다»를 낼 수 있다", () => {
    // 곱셈 길.
    expect(forwardReachable([rat(12), rat(4)], rat(48))).toBe(true);
    // 🔴 `+`·`−` 길 — 이 자가 없던 동안 1-1 의 「⑥ 0건」은 «깨끗»이 아니라
    //    «못 셈»이었다. 곱셈 자는 같은 입력에서 «안 닿음»을 낸다.
    expect(pmOneStepReachable([rat(687), rat(269)], rat(956))).toBe(true);
    expect(pmOneStepReachable([rat(687), rat(269)], rat(418))).toBe(true);
    expect(forwardReachable([rat(687), rat(269)], rat(956))).toBe(false);
    // 음성 대조 — 무엇이든 닿는 자였다면 아래도 참이 된다.
    expect(pmOneStepReachable([rat(687), rat(269)], rat(500))).toBe(false);
    // 0 을 더하는 것은 «한 걸음»이 아니다 — 그건 답이 지면에 찍힌 것이다.
    expect(pmOneStepReachable([rat(7), rat(0)], rat(7))).toBe(false);
    expect(answerPrintedOnPage([rat(687), rat(269)], rat(269))).toBe(true);
  });

  it("🔴 눈금 — 그 «+·−» 자가 실제 지면에서 양성·음성을 **둘 다** 낸다", () => {
    // 양성 대조군: 1-1-4 의 연산·기본은 지면 두 수를 한 번 빼면 답이다.
    // 음성 대조군: 같은 소단원의 응용은 그렇지 않다.
    //   ⚠️ 이 눈금이 없으면, 확대 갈래를 다 비운 지금 이 축은 **늘 0** 이고
    //      그 0 이 «깨끗»인지 «못 셈»인지 아무도 못 가른다.
    const u = unitOf("1-1-4");
    const reach = (tier: "연산" | "기본" | "응용") => {
      let hit = 0;
      let n = 0;
      for (const seed of SEEDS.slice(0, 8)) {
        const p = generateElementaryProblem(u, seed, tier);
        const m = p.answer.match(/^\$(\d+)\$$/);
        if (!m) continue;
        n += 1;
        // 지면의 수 — «세로셈으로 계산하시오»는 두 수가 세로셈 그림에 있다(D-164 ⑥)
        const col = p.figureSpec?.kind === "columnOp" ? [rat(Number(p.figureSpec.top)), rat(Number(p.figureSpec.bottom))] : [];
        if (pmOneStepReachable([...pageNumbers(p.content), ...col], rat(Number(m[1])))) {
          hit += 1;
        }
      }
      return { hit, n };
    };
    const calc = reach("연산");
    expect(calc.n, "1-1-4 연산의 답을 하나도 못 읽었다").toBeGreaterThan(0);
    expect(calc.hit, "1-1-4 연산이 «한 걸음»에 안 닿는다 — 자가 눈멀었다").toBe(
      calc.n,
    );
    const basic = reach("기본");
    expect(basic.hit, "1-1-4 기본이 «한 걸음»에 안 닿는다").toBe(basic.n);
    const apply = reach("응용");
    expect(apply.n, "1-1-4 응용의 답을 하나도 못 읽었다").toBeGreaterThan(0);
    expect(
      apply.hit,
      "1-1-4 응용이 «한 걸음»에 닿는다 — 그러면 이 자는 아무것도 안 가른다",
    ).toBe(0);
  });

  it("1-4-3 심화중 — 십의 자리에서만 올림이 있는 곱만 남는다", () => {
    checkMul14("1-4-3", "tens");
  });

  it("1-4-5 심화중 — 두 자리에서 모두 올림이 있는 곱만 남는다", () => {
    checkMul14("1-4-5", "both");
  });

  it("형제 소단원의 발문이 서로 같아지지 않는다 (D-66⑸)", () => {
    // 두 소단원은 **같은 함수**를 쓴다 — 수의 약속만 소단원 이름이 정한다.
    // 같은 씨앗에서 발문이 겹치면 한 시험지에 같은 문항이 나간다.
    for (const seed of SEEDS.slice(0, 8)) {
      const stems = ["1-4-3", "1-4-5"].map(
        (c) => generateElementaryProblem(unitOf(c), seed, "심화중").content,
      );
      expect(new Set(stems).size, `씨앗 ${seed}: 1-4 형제 발문이 겹친다`).toBe(
        2,
      );
    }
  });

  it("발문 틀이 여덟 가지 이상 돈다", () => {
    for (const code of ["1-4-3", "1-4-5"]) {
      const u = unitOf(code);
      const frames = new Set<string>();
      for (let seed = 0; seed < 400; seed += 1) {
        // 수를 지우고 **틀**만 남긴다 — 수가 달라 발문이 갈리는 것은 틀이 아니다.
        frames.add(
          generateElementaryProblem(u, seed, "심화중").content.replace(
            /\d+/g,
            "N",
          ),
        );
      }
      expect(frames.size, `${code}: 발문 틀`).toBeGreaterThanOrEqual(8);
    }
  });

  /* ── 비운 자리 — 되살리려면 보고서의 «세어서 나온 근거»를 다시 대야 한다 ────── */

  it("🔴 물결 3 이 비운 자리에 확대 갈래가 없다", () => {
    // 1-1-1·1-1-2 — 「합」에는 방향이 없어 되짚기가 늘 하나로 굳는다(반증 ①).
    // 🔴 1-1-3·1-1-4 — 「차의 방향」은 답이 «지면 두 수의 차»라 반증 ⑥ 위반이다
    //    (전수 20,625/20,625 · 1-1-3 은 67.6%). 되살리려면 **지면이 두 수를
    //    다 찍지 않는** 모양이 필요하다.
    // 1-4-1 — (몇십)×(몇) 은 일의 자리 곱이 늘 $0$ 이라 「올림 종류」가
    //   「곱의 자릿수」로 무너지고, 그건 파일럿 2-1-3 심화중의 성질 그 자체다.
    // 🔴 1-4-2·1-4-4 — 겹침 가드를 걸고 나면 잔여 자리가 **3개**($a\in\{12,14\}$).
    // 1-5 전량 — 자리는 있으나(980 · 약 1,000만 · 35,880) 그 자리가 여는 축이
    //   「차의 방향」이고, 자리 넘김 항등식은 **진법과 무관**하다(전수 확인).
    const empty = [
      "1-1-1",
      "1-1-2",
      "1-1-3",
      "1-1-4",
      "1-4-1",
      "1-4-2",
      "1-4-4",
      "1-5-1",
      "1-5-2",
      "1-5-3",
      "1-5-4",
      "1-5-5",
      "1-5-6",
    ];
    for (const code of empty) {
      const tiers = supportedTiers(unitOf(code));
      expect(tiers, `${code}: 비운 자리에 확대 갈래가 생겼다`).not.toContain(
        "심화중",
      );
      expect(tiers, `${code}: 비운 자리에 확대 갈래가 생겼다`).not.toContain(
        "심화상",
      );
    }
    // 그리고 세운 둘은 실제로 등록돼 있다 — 위 목록만 두면 「다 비웠다」도 초록이다.
    for (const code of ["1-4-3", "1-4-5"]) {
      expect(supportedTiers(unitOf(code)), `${code}: 심화중이 없다`).toContain(
        "심화중",
      );
      // 심화상은 이 물결에서 **비웠다** — 근거는 g3.ts 의 갈래 표 주석에 있다.
      expect(
        supportedTiers(unitOf(code)),
        `${code}: 심화상은 안 세웠다`,
      ).not.toContain("심화상");
    }
  });
});
