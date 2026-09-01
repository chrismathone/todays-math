/**
 * 초3 물결 4 — `1-3 나눗셈` 의 **심화중** (D-113 · D-115, 2026-09-01).
 *
 * ## 무엇을 잠그나
 *
 *   ⑴ **심화중** — 되짚기(곱셈구구)가 「몇 개씩 몇 묶음」 짝을 **둘 이상** 만들고,
 *      **나누는 수와 몫의 크기 관계**가 정확히 하나만 남긴다(반증 ①·②).
 *      성질을 지우면 답이 여럿이 된다(반증 ⑤) — 그것도 여기서 센다.
 *   ⑵ **소단원 약속** — 나머지가 없고 나누는 수·몫이 모두 한 자리 수(곱셈구구 안).
 *   ⑶ **반증 ⑥** — 지면에 찍힌 두 수를 `+ − × ÷` 로 **한 번** 엮어 답이 나오면 안 된다.
 *      🔴 공용 자(`forwardReachable`)는 허용 꼴이 전부 `a×b…` 라 **나눗셈이 없어**
 *      이 대단원에서 아무것도 못 잰다(`probe-elem-tier-backsolve` 가 1-3-1~4 를
 *      「④ 를 못 재는 소단원」으로 찍는다). 그래서 여기 **÷ 를 아는 자**를 따로 두고,
 *      **양성·음성 대조군을 둘 다** 건다 — 0 이 «깨끗»인지 «못 셈»인지 갈려야 한다.
 *   ⑷ **1-3-3 심화하와 갈린다** — 심화하는 둘째 나누는 수를 **발문이 준다**(지면의 수 셋),
 *      심화중은 **안 준다**(둘). 사다리 한 칸이 그 한 낱말로 갈린다.
 *   ⑸ **비운 자리를 잠근다** — 1-3-1·1-3-2·1-3-4 의 심화중, 1-3 전체의 심화상.
 *      되살리려면 보고서 `tier-fill-g3-w4.md` §4 의 «세어서 나온 수»를 다시 대야 한다.
 *   ⑹ **다양성** — 이 대단원의 재료가 얇다(전체 수가 될 수 있는 것은 다섯뿐).
 *      더 얇아지면 빨개진다.
 *
 * ## 어떻게 판정하나 — **생성기를 되부르지 않는다**
 *
 * 아래는 전부 **발문의 수만 읽어 사슬을 처음부터 다시 세운다.** 생성기의 풀을
 * import 하면 「목록이 목록과 같다」가 되어 아무것도 안 지킨다. 반증 ⑥ 의 자도
 * 여기 다시 적는다 — 생성기 쪽 규칙과 갈리면 빨개져야 한다.
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다(D-07).
 * 2. ÷ 를 아는 자는 **한 걸음만** 본다. 두 걸음으로 닿는 자리는 구조적으로 0이다 —
 *    넓히면 정당한 응용까지 물어 늘 우는 가드가 된다(2026-08-20).
 * 3. 이 자는 **산술 우연**을 못 가린다. 1-3-3 심화하의 답이 «지면 두 수의 차»와
 *    우연히 같은 씨앗이 있다(`2,9,3 → 6 = 9-3`). 그래서 **음성 대조군을 실물이 아니라
 *    리터럴로** 박았다 — 실물로 음성을 잡으려다 우연에 걸리면 눈금이 거짓이 된다.
 */
import { describe, expect, it } from "vitest";

import { pageNumbers } from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 24 }, (_, i) => 20260901 + i * 7919);

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

/**
 * 반증 ⑥ (1-3 판) — 지면의 수 둘을 `+ − × ÷` 로 **한 번** 엮어 답에 닿나.
 * 생성기 쪽 `div13OneStep` 과 **같은 규칙을 여기 다시 적는다** — 갈리면 빨개진다.
 */
function divOneStep(nums: readonly number[], answer: number): boolean {
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      if (a + b === answer) return true;
      if (a - b === answer) return true;
      if (a * b !== a && a * b !== b && a * b === answer) return true;
      if (b !== 0 && a % b === 0 && a / b !== a && a / b === answer)
        return true;
    }
  return false;
}

/** 곱이 $a$ 인 «몇 개씩 몇 묶음» 짝 — 두 수가 모두 $2\sim9$(소단원 약속). */
function guguPairs(a: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 2; k <= 9; k += 1) {
    if (a % k !== 0) continue;
    const q = a / k;
    if (q >= 2 && q <= 9) out.push([k, q]);
  }
  return out;
}

describe("초3 물결 4 — 1-3-3 의 심화중 (D-113 · D-115)", () => {
  /* ── 눈금 — 이 파일의 자가 «예»와 «아니오»를 둘 다 낼 수 있나 ─────────────── */

  it("🔴 눈금 — ÷ 를 아는 반증 ⑥ 자가 네 연산에서 «닿는다»를 낸다", () => {
    expect(divOneStep([6, 4], 24), "곱").toBe(true);
    expect(divOneStep([6, 4], 10), "합").toBe(true);
    expect(divOneStep([6, 4], 2), "차").toBe(true);
    expect(divOneStep([36, 6], 6), "몫").toBe(true);
    // 음성 대조군 — 무엇이든 닿는 자였다면 아래도 참이 된다.
    expect(divOneStep([6, 4], 9), "음성").toBe(false);
    expect(divOneStep([8, 3], 7), "음성").toBe(false);
    // 「아무 일도 안 하는 연산」은 한 걸음이 아니다.
    expect(divOneStep([7, 1], 7), "×1 은 적용이 아니다").toBe(false);
  });

  it("🔴 눈금 — 그 자가 **실제 지면**에서 «닿는다»를 낸다 (양성 대조군)", () => {
    // 1-3-3 의 연산·기본은 정의상 순방향이다 — 나눗셈 한 번이면 답이다.
    // 이 눈금이 없으면 심화중의 «0» 이 «깨끗»인지 «못 셈»인지 아무도 못 가른다.
    const u = unitOf("1-3-3");
    for (const tier of ["연산", "기본"] as const) {
      let hit = 0;
      let n = 0;
      for (const seed of SEEDS.slice(0, 12)) {
        const p = generateElementaryProblem(u, seed, tier);
        const m = p.answer.match(/^\$(\d+)\$$/);
        if (!m) continue;
        n += 1;
        if (
          divOneStep(
            pageNumbers(p.content).map((r) => r.n),
            Number(m[1]),
          )
        ) {
          hit += 1;
        }
      }
      expect(n, `1-3-3 ${tier} 의 답을 하나도 못 읽었다`).toBeGreaterThan(0);
      expect(
        hit,
        `1-3-3 ${tier} 이 «한 걸음»에 안 닿는다 — 자가 눈멀었다`,
      ).toBe(n);
    }
  });

  /* ── 본 검사 ─────────────────────────────────────────────────────────── */

  it("1-3-3 심화중 — 곱셈구구가 짝을 여럿 만들고 크기 관계가 하나만 남긴다", () => {
    const u = unitOf("1-3-3");
    const shapes = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화중");
      const at = `1-3-3 심화중 씨앗 ${seed}`;
      const ans = intAnswer(p.answer);

      // ⑴ 지면에 찍히는 수는 **처음 한 묶음의 수와 처음 묶음 수 둘뿐**이다.
      //    셋이 되면 둘째 나누는 수를 준 것이고, 그건 심화하다.
      const page = pageNumbers(p.content).map((r) => r.n);
      expect(page.length, `${at}: 지면의 수가 둘이 아니다\n${p.content}`).toBe(
        2,
      );
      const [b0, q0] = page as [number, number];

      // ⑵ 발문이 내건 크기 관계와 묻는 것.
      const more = /수보다 많았습니다/.test(p.content);
      const less = /수보다 적었습니다/.test(p.content);
      expect(
        more !== less,
        `${at}: 크기 관계 조건을 못 읽었다\n${p.content}`,
      ).toBe(true);
      const askGroups = /몇 (?:묶음|봉지|상자)인지 쓰시오/.test(p.content);
      const askEach = /한 (?:묶음|봉지|상자)에 넣은 수는 몇 개인지 쓰시오/.test(
        p.content,
      );
      expect(
        askGroups !== askEach,
        `${at}: 무엇을 묻는지 못 읽었다\n${p.content}`,
      ).toBe(true);

      // ⑶ 되짚기 — 전체 수와 그 짝을 **여기서 다시 센다.**
      const a = b0 * q0;
      expect(a, `${at}: 전체 수가 곱셈구구 밖이다`).toBeLessThanOrEqual(81);
      const cand = guguPairs(a).filter(([k]) => k !== b0);
      expect(
        cand.length,
        `${at}: 다시 묶을 짝이 하나뿐이면 마디가 굳는다 — 그건 심화하다 (반증 ①)`,
      ).toBeGreaterThan(1);

      // ⑷ 성질이 **정확히 하나**를 남기고, 그 하나가 답이다 (반증 ②).
      const hits = cand.filter(([k, q]) => (more ? q > k : q < k));
      expect(hits.length, `${at}: 성질이 남기는 짝이 하나가 아니다`).toBe(1);
      const [k, q] = hits[0]!;
      expect(ans, `${at}: 답이 성질이 남긴 짝과 다르다`).toBe(
        askGroups ? q : k,
      );

      // ⑸ 🔴 반증 ⑤ — **성질을 지우면 답이 여럿**이 된다.
      const without = new Set(cand.map(([kk, qq]) => (askGroups ? qq : kk)));
      expect(
        without.size,
        `${at}: 성질을 지워도 답이 하나다 — 그 조건은 장식이다 (반증 ⑤)`,
      ).toBeGreaterThan(1);

      // ⑹ 소단원 약속 — 나머지 없음 · 나누는 수와 몫이 모두 한 자리 수.
      expect(a % k, `${at}: 나머지가 생긴다`).toBe(0);
      for (const v of [b0, q0, k, q])
        expect(v, `${at}: 곱셈구구 밖의 수 ${v}`).toBeGreaterThanOrEqual(2);
      for (const v of [b0, q0, k, q])
        expect(v, `${at}: 곱셈구구 밖의 수 ${v}`).toBeLessThanOrEqual(9);
      expect(k, `${at}: 처음과 같은 수씩 묶었다`).not.toBe(b0);

      // ⑺ 반증 ⑥ — 지면 두 수의 한 걸음으로 답이 안 나온다.
      expect(page.includes(ans), `${at}: 답이 지면에 이미 찍혀 있다`).toBe(
        false,
      );
      expect(
        divOneStep(page, ans),
        `${at}: 지면 두 수의 한 걸음(+ − × ÷)으로 답이 나온다 — 반증 ⑥`,
      ).toBe(false);

      // ⑻ 해설 — 후보 목록을 **늘어놓되 계산하지 않는다**(D-115 ⑾ 로 «중»이다).
      //    ㉠ 후보가 하나도 빠지지 않는다 ㉡ 목록에는 등호가 없다
      //    ㉢ 등식은 되짚기와 마무리 둘뿐이라 열거 판정기의 문턱(같은 연산 셋)에 안 닿는다
      const sol = p.solution ?? "";
      for (const [kk, qq] of cand)
        expect(
          sol.includes(`${kk}\\times${qq}`),
          `${at}: 해설이 후보 ${kk}×${qq} 를 빠뜨렸다\n${sol}`,
        ).toBe(true);
      const times = [...sol.matchAll(/\$[^$]*\\times[^$]*=[^$]*\$/g)].length;
      expect(times, `${at}: 해설의 곱셈 등식이 셋이면 열거 판정기가 운다`).toBe(
        1,
      );
      const divs = [...sol.matchAll(/\$[^$]*\\div[^$]*=[^$]*\$/g)];
      expect(divs.length, `${at}: 해설의 나눗셈 등식이 하나가 아니다`).toBe(1);
      // ㉣ 마지막 나눗셈의 몫이 **답**이다 — 해설이 답과 다른 수로 끝나면 안 된다.
      const lastNum = divs[0]![0].match(/=(\d+)\$$/);
      expect(lastNum, `${at}: 마지막 나눗셈을 못 읽었다\n${sol}`).toBeTruthy();
      expect(Number(lastNum![1]), `${at}: 해설이 답과 다른 수로 끝난다`).toBe(
        ans,
      );

      shapes.add(`${a}|${ans}`);
    }

    // ⑼ 다양성 — 이 대단원의 재료는 얇다(전체 수가 될 수 있는 것은 $12,16,18,24,36$
    //    다섯뿐, 전수). 씨앗 24개에서 서로 다른 (전체 수, 답) 이 더 줄면 빨개진다.
    expect(
      shapes.size,
      `1-3-3 심화중의 «수 틀»이 너무 얇다: ${[...shapes].join(" ")}`,
    ).toBeGreaterThanOrEqual(6);
  });

  it("1-3-3 심화하와 갈린다 — 심화하는 둘째 나누는 수를 발문이 준다", () => {
    const u = unitOf("1-3-3");
    for (const seed of SEEDS.slice(0, 12)) {
      const deep = generateElementaryProblem(u, seed, "심화하");
      const mid = generateElementaryProblem(u, seed, "심화중");
      expect(
        pageNumbers(deep.content).length,
        `심화하 씨앗 ${seed}: 지면의 수가 셋이 아니다 — 둘째 나누는 수를 안 준다면 심화중과 같아진다\n${deep.content}`,
      ).toBe(3);
      expect(
        mid.content,
        `씨앗 ${seed}: 심화하와 심화중의 발문이 같다`,
      ).not.toBe(deep.content);
    }
  });

  it("🔴 비운 자리 — 1-3-1·1-3-2·1-3-4 에는 심화중이 없다", () => {
    // 재료가 하나뿐이라(곱이 $a$ 인 곱셈구구가 여럿) 네 소단원에 같은 것을 넣으면
    // 옷만 갈아입힌 같은 문항이 넷 선다(D-66⑸). 보고서 §4 를 보라.
    for (const code of ["1-3-1", "1-3-2", "1-3-4"]) {
      expect(
        supportedTiers(unitOf(code)),
        `${code}: 심화중이 생겼다 — 겹침 근거를 다시 대라`,
      ).not.toContain("심화중");
    }
  });

  it("🔴 비운 자리 — 1-3 네 소단원 전부 심화상이 없다", () => {
    // 크기 관계가 후보를 **하나도 못 자르는** 자리는 전수 12짝이고, 거기에
    // 「묶음 수가 한 묶음의 수의 $m$ 배」를 걸어 하나가 남는 자리는 **4자리 ·
    // 서로 다른 (전체 수, 답) 2가지**($a=12$·$a=18$)뿐이다 — 파일럿이 2-1-1 을,
    // 물결 2 가 2-2-1·2-2-2 를 비운 것과 같은 자리다.
    for (const code of ["1-3-1", "1-3-2", "1-3-3", "1-3-4"]) {
      expect(
        supportedTiers(unitOf(code)),
        `${code}: 심화상이 생겼다 — 다양성 수를 다시 세라`,
      ).not.toContain("심화상");
    }
  });
});
