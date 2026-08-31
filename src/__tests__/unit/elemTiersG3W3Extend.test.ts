/**
 * 초3 물결 3 — `1-1 덧셈과 뺄셈` · `1-4 곱셈` · `1-5 길이와 시간` 의 **심화중**
 * (D-113 · D-115, 2026-08-31).
 *
 * ## 무엇을 잠그나
 *
 *   ⑴ **심화중** — 되짚기 사슬에 **굳지 않는 마디가 하나** 있고(후보가 둘 이상),
 *      **그 소단원의 성질이 정확히 하나만** 남긴다. 성질을 빼면 여럿이 남는다
 *      (반증 ①·⑤). 성질은 «끝까지 계산하지 않고» 가른다(D-115 ⑾ → 중이지 상이 아니다).
 *   ⑵ **소단원 이름 약속** — 1-1-3 은 받아내림 $0$~$1$ 번, 1-1-4 는 $2$ 번,
 *      1-4-2~5 는 올림의 «종류»다. 🔴 **이 축에는 지금 조건 판정기가 없다**
 *      (`probe-elem-section-conditions` 에 1-1 의 받아내림 검사가 아예 없다 —
 *      토대 17 §3 1-1 함정 (b)). 그래서 **여기가 그 축의 유일한 가드**다.
 *   ⑶ **반증 ⑥** — 발문에 찍힌 수를 순방향으로 엮어 답이 나오면 중·상이 아니다.
 *      제품 규칙(`forwardReach`)을 그대로 부르고, 입력은 **지면**에서 읽는다.
 *   ⑷ **비운 자리를 잠근다** — 1-1-1·1-1-2·1-4-1·1-5-1~6 에 확대 갈래가 생기면
 *      빨개진다. 되살리려면 보고서 §3 의 «세어서 나온 근거»를 다시 대야 한다.
 *   ⑸ **해설이 후보를 다 곱해 보이지 않는다** — 두 자리 곱은 «정답 것 하나»뿐이다.
 *      이것이 둘 다를 지킨다: `mulCarryClass`(첫 `$ab\times c$` 하나만 읽는다)의
 *      거짓 빨강과, 열거 판정기의 문턱(같은 연산 셋).
 *
 * ## 어떻게 판정하나 — **생성기를 되부르지 않는다**
 *
 * 아래 판정은 전부 **발문의 수만 읽어 사슬을 처음부터 다시 세운다.** 생성기의 풀을
 * import 하면 「목록이 목록과 같다」가 되어 아무것도 안 지킨다. 받아내림·올림도
 * 여기서 다시 센다(제품 함수를 안 부른다) — 규칙이 갈리면 빨개져야 한다.
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다.
 * 2. `forwardReachable` 은 **곱셈 길만** 안다(`+`·`−` 만으로 가는 길이 없다).
 *    그래서 1-1 에서는 ⑶ 이 구조적으로 «안 닿음»을 낸다 — 그 0 은 «깨끗»이 아니다.
 *    아래 «자가 «예»를 낼 수 있나» 눈금이 그것을 드러낸다.
 * 3. 읽을 수 없는 발문은 **통과가 아니라 빨강**이다. 발문 문법을 넓히면 아래 파서도
 *    같이 넓혀야 한다 — 그게 이 시험의 이빨이다.
 */
import { describe, expect, it } from "vitest";

import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  rat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 24 }, (_, i) => 20260831 + i * 7919);

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

/** `a-b` 의 받아내림 횟수 — **제품 함수를 안 부르고** 여기서 다시 센다. */
function borrowsOf(a: number, b: number): number {
  const a1 = Math.floor(a / 10) % 10;
  const a0 = a % 10;
  const b1 = Math.floor(b / 10) % 10;
  const b0 = b % 10;
  const ones = a0 < b0;
  return (ones ? 1 : 0) + (a1 - (ones ? 1 : 0) < b1 ? 1 : 0);
}

/** $(\text{몇십몇})\times(\text{몇})$ 의 올림 종류 — 여기서 다시 센다. */
function carryOf(a: number, k: number): "none" | "ones" | "tens" | "both" {
  const t = Math.floor(a / 10);
  const o = a % 10;
  const ones = o * k >= 10;
  const tens = t * k + Math.floor((o * k) / 10) >= 10;
  return ones ? (tens ? "both" : "ones") : tens ? "tens" : "none";
}

/** 반증 ⑥ — 지면의 수만으로 답이 나오면 안 된다. */
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
    `${at}: 순방향으로 답이 나온다 — 반증 ⑥`,
  ).toBe(false);
}

/* ── 1-1-3 · 1-1-4 — 「차의 방향」이 안 굳고 **받아내림 횟수**가 하나를 남긴다 ── */

const BORROW_WORDS: [RegExp, number][] = [
  [/받아내림이 없었습니다/, 0],
  [/받아내림이 한 번 있었습니다/, 1],
  [/받아내림이 두 번 있었습니다/, 2],
];

/** 발문에서 `[아는 수, 차, 발문이 내건 받아내림 횟수]`. 못 읽으면 빨강이다. */
function readSub11(content: string): [number, number, number] {
  const dm = content.match(/차[는가]\s*\$(\d+)\$/);
  expect(dm, `차를 못 읽었다\n${content}`).toBeTruthy();
  const diff = Number(dm![1]);
  const nums = [...content.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
  const others = [...new Set(nums)].filter((v) => v !== diff);
  expect(
    others.length,
    `발문에 아는 수가 하나여야 한다 — 읽은 것: ${nums.join(",")}\n${content}`,
  ).toBe(1);
  const hit = BORROW_WORDS.find(([re]) => re.test(content));
  expect(hit, `받아내림 조건을 못 읽었다\n${content}`).toBeTruthy();
  return [others[0]!, diff, hit![1]];
}

function checkSub11(code: string, allow: readonly number[]): void {
  const u = unitOf(code);
  for (const seed of SEEDS) {
    const p = generateElementaryProblem(u, seed, "심화중");
    const at = `${code} 심화중 씨앗 ${seed}`;
    const ans = intAnswer(p.answer);
    const [known, diff, want] = readSub11(p.content);

    // ⑴ 마디가 안 굳는다 — 「차」는 방향을 안 말해 주므로 후보가 **둘**이다.
    const up = known + diff;
    const down = known - diff;
    expect(up, `${at}: 큰 쪽 후보가 세 자리가 아니다`).toBeLessThanOrEqual(999);
    expect(
      down,
      `${at}: 작은 쪽 후보가 세 자리가 아니다`,
    ).toBeGreaterThanOrEqual(100);

    // ⑵ 성질이 **정확히 하나만** 남긴다 — 그 하나가 답이다.
    const kUp = borrowsOf(up, known);
    const kDown = borrowsOf(known, down);
    const hits = [
      [up, kUp],
      [down, kDown],
    ].filter(([, k]) => k === want);
    expect(
      hits.length,
      `${at}: 받아내림 ${want}번인 후보가 하나여야 한다`,
    ).toBe(1);
    expect(hits[0]![0], `${at}: 답이 성질이 남긴 후보가 아니다`).toBe(ans);

    // ⑶ 반증 ⑤ — 조건을 지우면 후보가 둘이다(지워도 답이 같으면 그건 장식이다).
    expect(kUp, `${at}: 두 후보의 받아내림이 같으면 성질이 장식이다`).not.toBe(
      kDown,
    );

    // ⑷ 소단원 **이름 약속** — 이 축에는 조건 판정기가 없다. 여기가 유일한 가드다.
    expect(
      allow.includes(want),
      `${at}: 발문이 내건 받아내림 ${want}번이 소단원 이름 밖이다`,
    ).toBe(true);
    const realBorrows =
      ans > known ? borrowsOf(ans, known) : borrowsOf(known, ans);
    expect(realBorrows, `${at}: 답 쪽 뺄셈의 받아내림이 발문과 다르다`).toBe(
      want,
    );

    // ⑸ 해설이 후보를 **다 빼 보이지 않는다** — 자리 이름으로만 가른다(D-115 ⑾).
    const sol = p.solution ?? "";
    const subs = [...sol.matchAll(/\$\d+-\d+=\d+\$/g)].length;
    expect(
      subs,
      `${at}: 해설의 뺄셈 등식이 둘 이상이면 상의 길이다`,
    ).toBeLessThan(2);

    forwardOk(p.content, ans, at);
  }
}

/* ── 1-4-2~5 — 「곱의 일의 자리」가 후보를 만들고 **올림의 종류**가 남긴다 ── */

const CARRY_WORDS: [RegExp, "none" | "ones" | "tens" | "both"][] = [
  [/일의 자리와 십의 자리에서 모두 올림이 있/, "both"],
  [/일의 자리에서만 올림이 있/, "ones"],
  [/십의 자리에서만 올림이 있/, "tens"],
  [/올림이 없/, "none"],
];

function readMul14(
  content: string,
): [number, number, "none" | "ones" | "tens" | "both"] {
  const am = content.match(/\$(\d{2})(?:\$|\\times)/);
  expect(am, `곱해지는 수를 못 읽었다\n${content}`).toBeTruthy();
  const rm = content.match(/일의 자리 숫자[가는] \$(\d)\$/);
  expect(rm, `곱의 일의 자리를 못 읽었다\n${content}`).toBeTruthy();
  const hit = CARRY_WORDS.find(([re]) => re.test(content));
  expect(hit, `올림 조건을 못 읽었다\n${content}`).toBeTruthy();
  return [Number(am![1]), Number(rm![1]), hit![1]];
}

function checkMul14(
  code: string,
  want: "none" | "ones" | "tens" | "both",
): void {
  const u = unitOf(code);
  for (const seed of SEEDS) {
    const p = generateElementaryProblem(u, seed, "심화중");
    const at = `${code} 심화중 씨앗 ${seed}`;
    const ans = intAnswer(p.answer);
    const [a, r, said] = readMul14(p.content);

    // ⑴ 발문이 내건 올림 종류가 **소단원 이름**과 같다.
    expect(said, `${at}: 발문의 올림 조건이 소단원 이름과 다르다`).toBe(want);

    // ⑵ 마디가 안 굳는다 — 곱셈구구가 후보를 **둘 이상** 만든다(반증 ①·⑤).
    const o = a % 10;
    const cand: number[] = [];
    for (let k = 2; k <= 9; k += 1) if ((o * k) % 10 === r) cand.push(k);
    expect(
      cand.length,
      `${at}: 후보가 하나면 되짚기만으로 굳는다 — 그건 심화하다`,
    ).toBeGreaterThan(1);

    // ⑶ 성질이 **정확히 하나만** 남기고, 그 하나가 답이다.
    const keep = cand.filter((k) => carryOf(a, k) === want);
    expect(keep, `${at}: 성질이 남기는 후보`).toEqual([ans]);
    expect(carryOf(a, ans), `${at}: 답의 곱셈이 소단원 이름 밖이다`).toBe(want);
    expect(ans, `${at}: 곱하는 수는 $1$ 보다 크다`).toBeGreaterThan(1);
    expect((a * ans) % 10, `${at}: 곱의 일의 자리가 발문과 다르다`).toBe(r);

    // ⑷ 해설의 **두 자리 곱은 정답 것 하나뿐**이다.
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

    forwardOk(p.content, ans, at);
  }
}

describe("초3 물결 3 — 1-1·1-4 의 심화중 (D-113 · D-115)", () => {
  /* ── 눈금 — 이 파일의 자들이 «아니오»를 낼 수 있나 ────────────────────────
   *
   * 0 은 «깨끗»과 «못 셈»을 안 가른다. 아래 넷은 **일부러 틀린 입력**을 대어
   * 판정 함수가 실제로 갈라내는지 먼저 본다. 이게 없으면 위 검사들이 늘 초록인
   * 이유가 「문항이 옳아서」인지 「자가 눈이 멀어서」인지 알 수 없다.
   */
  it("눈금 — 받아내림·올림을 세는 자가 «아니오»를 낸다", () => {
    // 받아내림: 956-687 은 두 번, 687-418 은 한 번(실물 씨앗에서 나온 값이다).
    expect(borrowsOf(956, 687)).toBe(2);
    expect(borrowsOf(687, 418)).toBe(1);
    expect(borrowsOf(528, 353)).toBe(1);
    expect(borrowsOf(353, 178)).toBe(2);
    // 올림 종류 넷이 실제로 갈린다.
    expect(carryOf(14, 2)).toBe("none");
    expect(carryOf(14, 7)).toBe("ones");
    expect(carryOf(42, 3)).toBe("tens");
    expect(carryOf(24, 9)).toBe("both");
  });

  it("눈금 — 발문 파서가 못 읽는 글을 통과시키지 않는다", () => {
    expect(() => readSub11("어떤 세 자리 수를 구하시오.")).toThrow();
    expect(() =>
      // 받아내림 조건이 없는 발문 — 통과하면 반증 ⑤ 를 영영 못 잡는다.
      readSub11(
        "어떤 세 자리 수와 $687$ 의 차는 $269$ 입니다. 어떤 수를 쓰시오.",
      ),
    ).toThrow();
    expect(() => readMul14("$14$ 에 어떤 수를 곱하시오.")).toThrow();
    expect(() =>
      // 올림 조건이 없는 발문.
      readMul14("$14$ 의 곱의 일의 자리 숫자가 $8$ 입니다."),
    ).toThrow();
  });

  it("눈금 — 반증 ⑥ 의 자가 «닿는다»를 낼 수 있다 (곱셈 길)", () => {
    // 🔴 `forwardReachable` 은 곱셈 길만 안다. 1-1 에서 «안 닿음»이 나오는 것은
    //    문항이 옳아서가 아니라 그 자가 `+`·`−` 를 아예 안 세기 때문이다.
    //    여기서 **양성**을 하나 대어 그 사실을 드러낸다 — 그래야 위 0 이 읽힌다.
    expect(forwardReachable([rat(12), rat(4)], rat(48))).toBe(true);
    expect(forwardReachable([rat(687), rat(269)], rat(956))).toBe(false);
    expect(answerPrintedOnPage([rat(687), rat(269)], rat(269))).toBe(true);
  });

  it("1-1-3 심화중 — 받아내림이 없거나 한 번인 쪽이 답이다", () => {
    checkSub11("1-1-3", [0, 1]);
  });

  it("1-1-4 심화중 — 받아내림이 두 번인 쪽이 답이다", () => {
    checkSub11("1-1-4", [2]);
  });

  it("1-4-2 심화중 — 올림이 없는 곱만 남는다", () => {
    checkMul14("1-4-2", "none");
  });

  it("1-4-3 심화중 — 십의 자리에서만 올림이 있는 곱만 남는다", () => {
    checkMul14("1-4-3", "tens");
  });

  it("1-4-4 심화중 — 일의 자리에서만 올림이 있는 곱만 남는다", () => {
    checkMul14("1-4-4", "ones");
  });

  it("1-4-5 심화중 — 두 자리에서 모두 올림이 있는 곱만 남는다", () => {
    checkMul14("1-4-5", "both");
  });

  it("형제 소단원의 발문이 서로 같아지지 않는다 (D-66⑸)", () => {
    // 1-4 네 소단원은 **같은 함수**를 쓴다 — 수의 약속만 소단원 이름이 정한다.
    // 같은 씨앗에서 발문이 겹치면 한 시험지에 같은 문항이 나간다.
    for (const seed of SEEDS.slice(0, 8)) {
      const stems = ["1-4-2", "1-4-3", "1-4-4", "1-4-5"].map(
        (c) => generateElementaryProblem(unitOf(c), seed, "심화중").content,
      );
      expect(new Set(stems).size, `씨앗 ${seed}: 1-4 형제 발문이 겹친다`).toBe(
        4,
      );
    }
    for (const seed of SEEDS.slice(0, 8)) {
      const stems = ["1-1-3", "1-1-4"].map(
        (c) => generateElementaryProblem(unitOf(c), seed, "심화중").content,
      );
      expect(new Set(stems).size, `씨앗 ${seed}: 1-1 형제 발문이 겹친다`).toBe(
        2,
      );
    }
  });

  it("발문 틀이 여덟 가지 이상 돈다", () => {
    for (const code of ["1-1-3", "1-1-4", "1-4-2", "1-4-3", "1-4-4", "1-4-5"]) {
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

  /* ── 비운 자리 — 되살리려면 보고서 §3 의 근거를 다시 대야 한다 ────────────── */

  it("🔴 물결 3 이 비운 자리에 확대 갈래가 없다", () => {
    // 1-1-1·1-1-2 — 「합」에는 방향이 없어 되짚기가 늘 하나로 굳는다(반증 ①).
    //   실측: 어떤 수의 일의 자리를 보여주면 후보 1개(90,000/90,000),
    //   가리면 (십,일) 짝이 늘 10개(9,000/9,000) — 그건 복면산이다.
    // 1-4-1 — (몇십)×(몇) 은 일의 자리 곱이 늘 $0$ 이라 「올림 종류」가
    //   「곱의 자릿수」로 무너지고, 그건 파일럿 2-1-3 심화중의 성질 그 자체다.
    // 1-5 전량 — 1-5-1·2·4·5 는 사슬이 한 마디라 굳고(반증 ①), 1-5-3 은 어떤
    //   성질을 대도 «방향»과 같은 말이 되며, 1-5-6 은 1-1-3·1-1-4 와 같은 문항이다.
    const empty = [
      "1-1-1",
      "1-1-2",
      "1-4-1",
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
    // 그리고 세운 여섯은 실제로 등록돼 있다 — 위 목록만 두면 「다 비웠다」도 초록이다.
    for (const code of ["1-1-3", "1-1-4", "1-4-2", "1-4-3", "1-4-4", "1-4-5"]) {
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
