/**
 * 중3 **확대 갈래**(`심화중`·`심화상`) — `src/lib/middle/m3Top.ts` (D-116).
 *
 * ## 🔴 검산이 어디서 오나 — 생성기 규칙을 한 줄도 옮겨 적지 않는다
 *
 * 이 시험의 핵심은 **전수 검산**이다. 발문에 적힌 수만 읽어서
 *
 *   · 통계 갈래: $x$ 를 $1$ 부터 훑어 「평균 $=$ 중앙값」인 값을 **전부** 모은다.
 *   · 이차함수 갈래: $k$ 를 훑어 「그 점을 지나고 꼭짓점이 그 사분면」인 값을 모은다.
 *
 * 그 집합이 **정답과 글자까지 같아야** 한다. 생성기가 쓴 식(`5b-S`·근의 역산)을
 * 시험이 다시 적으면 동어반복이 되어, 그 식이 틀린 날 둘이 사이좋게 틀린다
 * (2026-08-18 「지표의 «참»이 제품 상수에서 나오면 성적이 오른다」).
 *
 * 전수 검산은 **정답이 맞는가**와 **빠뜨린 답이 없는가**를 **동시에** 본다 —
 * 「모두 구하시오」류에서 뒤엣것이 빠지면 값 검산이 구조적으로 못 보는 부류가 생긴다.
 *
 * ## 이 시험이 지키는 것
 *
 * ```
 * ㉠ 갈래 선언 — 확대 갈래로 나온다 (resolveMiddleTier 가 안 내린다)
 * ㉡ 전수 검산 — 정답 집합이 «조건을 만족하는 값 전부»와 같다
 * ㉢ 굳힘이 산다 — kept ⊊ candidates (㉡ 함정: 지워도 답이 그대로면 장식)
 * ㉣ 굳힘이 «선택»을 한다 — 극단만 집으면 우연 수준 (㉠ 함정)
 * ㉤ 해설이 걸음을 안 건너뛴다 (D-116 ⑸, 원장님이 건 완료 조건)
 * ㉥ 해설이 말하는 자리 조건이 실제 판정과 어긋나지 않는다
 * ㉦ 지면 냄새 — 값은 맞는데 글자가 나쁜 부류
 * ```
 */
import { describe, expect, it } from "vitest";

import { createRng } from "../../lib/elementary/rng";
import type { Rng } from "../../lib/elementary/types";
import { generateMiddleProblem } from "../../lib/middle/generate";
import {
  M3_TOP,
  meanOf,
  medianOf,
  planMedianMean,
  planVertexQuadrant,
  quadrantOf,
  type Sift,
} from "../../lib/middle/m3Top";
import { isThin } from "../../../scripts/qa/probe-mid-solution-depth";
import { edgeScore, siftScore } from "../../../scripts/qa/probe-m3-top";

const MEDIAN_KEY = "3-2|산포도|11T";
const VERTEX_KEY = "3-1|이차함수의 그래프 ⑵|22T";
const SEEDS = [20260901, 7, 4242, 31337, 5150131, 777003, 424242, 99, 13579];

/** `$12$` 들에서 수만 — 시험은 **지면 글자**를 읽는다. `facts` 를 안 믿는다. */
function numsIn(text: string): number[] {
  return [...text.matchAll(/\$(-?\d+)\$/g)].map((m) => Number(m[1]));
}

describe("[중3 확대 갈래] ㉠ 갈래를 스스로 선언한다", () => {
  it("등록한 두 유형이 `심화중`·`심화상` 으로 나온다 — 밑단 규칙이 안 내린다", () => {
    const got = new Map<string, Set<string>>();
    for (const e of M3_TOP) {
      const tiers = new Set<string>();
      for (const s of SEEDS) {
        for (const v of [0, 1, 2]) {
          tiers.add(generateMiddleProblem(e.key, s, v).difficulty);
        }
      }
      got.set(e.key, tiers);
    }
    expect([...got.get(MEDIAN_KEY)!]).toEqual(["심화상"]);
    expect([...got.get(VERTEX_KEY)!]).toEqual(["심화중"]);
  });

  it("확대 갈래가 실제로 **둘 다** 선다 — 하나만 세우고 «세웠다»고 하지 않는다", () => {
    const tiers = new Set(
      M3_TOP.map((e) => generateMiddleProblem(e.key, 20260901).difficulty),
    );
    expect(tiers).toEqual(new Set(["심화중", "심화상"]));
  });
});

describe("[중3 확대 갈래] ㉡ 전수 검산 — 생성기 식을 옮겨 적지 않는다", () => {
  it("산포도 11T — 「평균=중앙값」인 자연수 $x$ 를 전부 훑은 것이 정답과 같다", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      for (const v of [0, 1, 2]) {
        const p = generateMiddleProblem(MEDIAN_KEY, seed, v);
        // 발문 둘째 줄이 자료다 — `$6$, $11$, $22$, $25$, $x$`
        const dataLine = p.content.split("\n")[1]!;
        const base = numsIn(dataLine);
        expect(base, `자료 네 값을 못 읽었다: ${dataLine}`).toHaveLength(4);

        // 🔴 여기가 이 시험의 값어치다 — 조건을 만족하는 $x$ 를 **직접 다 찾는다**.
        //    상한은 넉넉히: 평균이 중앙값이 되려면 $x$ 는 자료 합보다 클 수 없다.
        const limit = base.reduce((a, b) => a + b, 0) * 5 + 50;
        const truth: number[] = [];
        for (let x = 1; x <= limit; x += 1) {
          const data = [...base, x];
          if (medianOf(data) === meanOf(data)) truth.push(x);
        }
        expect(
          numsIn(p.answer),
          `s${seed}v${v} 정답이 «조건을 만족하는 값 전부»와 다르다\n${p.content}\n정답: ${p.answer}`,
        ).toEqual(truth);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("이차함수 22T — 「그 점을 지나고 꼭짓점이 그 사분면」인 $k$ 를 전부 훑은 것이 정답과 같다", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      for (const v of [0, 1, 2]) {
        const p = generateMiddleProblem(VERTEX_KEY, seed, v);
        const t = Number(/2k\^2-(\d+)\$/.exec(p.content)![1]);
        const pt = /그래프가 점 \$\((-?\d+),\\ (-?\d+)\)\$/.exec(p.content)!;
        const px = Number(pt[1]);
        const py = Number(pt[2]);
        const want = Number(/꼭짓점이 제\$(\d)\$사분면/.exec(p.content)![1]);

        // $y=x^2-2kx+2k^2-t$ 에 그 점을 넣고, 꼭짓점 $(k, k^2-t)$ 의 사분면을 본다.
        // **정수만** 훑는다 — 발문이 「상수 $k$」라 했으므로 유리수 근이 있으면
        // 이 검산이 그것을 놓친다. 그래서 아래에서 유리수 근이 없음을 따로 잠근다.
        const truth: number[] = [];
        for (let k = -200; k <= 200; k += 1) {
          if (px * px - 2 * k * px + 2 * k * k - t !== py) continue;
          if (quadrantOf(k, k * k - t) === want) truth.push(k);
        }
        // 정답은 `$k=-1$` 꼴이라 `numsIn` 이 못 읽는다 — 열쇠를 지면 꼴에 맞춘다.
        const gotK = [...p.answer.matchAll(/\$k=(-?\d+)\$/g)].map((m) =>
          Number(m[1]),
        );
        expect(
          gotK,
          `s${seed}v${v} 정답이 조건을 만족하는 $k$ 전부와 다르다\n${p.content}\n정답: ${p.answer}`,
        ).toEqual(truth);

        // 근이 둘 다 정수인가 — 판별식이 완전제곱이어야 위 정수 훑기가 «전수»다.
        const disc = px * px - 2 * (px * px - t - py);
        const r = Math.round(Math.sqrt(disc));
        expect(disc, `판별식 ${disc} 가 완전제곱이 아니다`).toBe(r * r);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe("[중3 확대 갈래] ㉢㉣ 굳힘이 장식이 아니다", () => {
  // 두 `plan…` 의 반환 타입은 다르지만 `sift` 는 같은 모양이라 이 좁은 타입으로 받는다.
  const sifts = (plan: (r: Rng) => { sift: Sift }): Sift[] =>
    Array.from(
      { length: 240 },
      (_, i) => plan(createRng(20260901 + i * 7919)).sift,
    );

  it("㉢ 굳힘을 지우면 답이 바뀐다 — `kept` 가 `candidates` 의 진부분집합", () => {
    for (const [name, plan] of [
      ["산포도 11T", planMedianMean],
      ["이차함수 22T", planVertexQuadrant],
    ] as const) {
      const s = siftScore(sifts(plan));
      expect(s.identity, `${name}: 굳힘이 아무도 안 거른 씨앗이 있다`).toBe(0);
      expect(s.broken, `${name}: 굳힘이 후보 밖 값을 냈다`).toBe(0);
      expect(s.n).toBe(240);
    }
  });

  it("㉣ 굳힘을 **안 읽고** 극단만 집으면 우연 수준을 못 넘는다", () => {
    // 초6 에서 이것으로 병합이 두 번 막혔다(tier-fill-g6-w3-adversarial §7.1 R1).
    // 문턱은 「우연 수준 + 10%p」 — 씨앗 240 의 흔들림을 견디는 폭이다.
    for (const [name, plan] of [
      ["산포도 11T", planMedianMean],
      ["이차함수 22T", planVertexQuadrant],
    ] as const) {
      const e = edgeScore(sifts(plan));
      expect(
        Math.max(e.maxHit, e.minHit),
        `${name}: 극단 집기 max=${e.maxHit} min=${e.minHit} · 우연 ${e.chance}`,
      ).toBeLessThanOrEqual(e.chance + 0.1);
    }
  });

  it("산포도 11T — 결과 세 갈래가 **다 나온다** (가운데 후보가 도달 가능하다)", () => {
    // 🔴 첫 판은 가운데 자리가 «살면 셋 다 사는» 자리라 **한 번도 안 살았다**.
    //    그러면 후보가 셋인 척하는 둘짜리 설계다. 그 자리가 다시 죽으면 빨개진다.
    const shapes = new Set<string>();
    for (let i = 0; i < 240; i += 1) {
      const p = planMedianMean(createRng(20260901 + i * 7919));
      shapes.add(p.rows.map((r) => (r.ok ? "1" : "0")).join(""));
    }
    expect(shapes).toEqual(new Set(["100", "001", "011"]));
  });

  it("굳힘의 **두 겹이 각각** 일한다 — 자리 조건과 자연수 조건", () => {
    let bySlot = 0;
    let byNatural = 0;
    for (let i = 0; i < 240; i += 1) {
      const p = planMedianMean(createRng(20260901 + i * 7919));
      if (p.rows.some((r) => r.natural && !r.ok)) bySlot += 1;
      if (p.rows.some((r) => !r.natural)) byNatural += 1;
    }
    expect(bySlot, "자리 조건이 혼자 죽인 후보가 있는 씨앗").toBeGreaterThan(0);
    expect(byNatural, "자연수 조건이 죽인 후보가 있는 씨앗").toBeGreaterThan(0);
  });
});

describe("[중3 확대 갈래] ㉤ 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸)", () => {
  it("전 씨앗에서 «생략 표지 뒤에 중간 결과 없음»이 0건이다", () => {
    const thin: string[] = [];
    for (const e of M3_TOP) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = generateMiddleProblem(e.key, seed, v);
          if (isThin(p.content, p.solution)) {
            thin.push(`${e.key} s${seed}v${v}`);
          }
        }
      }
    }
    expect(thin).toEqual([]);
  });

  it("해설이 **후보를 하나도 빠뜨리지 않고** 다룬다 — 심화상의 길이 곧 그것이다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(MEDIAN_KEY, seed);
      const plan = planMedianMean(createRng(seed + keySalt(MEDIAN_KEY)));
      // 세 자리를 다 세운다 — ㉠㉡㉢ 표지가 다 있고, 각 후보 값이 해설에 적힌다.
      for (const mark of ["㉠", "㉡", "㉢"]) {
        expect(p.solution, `s${seed}: ${mark} 가 해설에 없다`).toContain(mark);
      }
      for (const r of plan.rows) {
        // 「즉 $x=…$이다」 — 후보를 실제로 **세운** 자리. 값만 찾으면 다른 수의
        // 부분 문자열에 걸려 «있다»가 거짓이 된다.
        expect(
          p.solution,
          `s${seed}: 후보 ${r.x} 를 해설이 세우지 않는다`,
        ).toContain(`즉 $x=${r.x}$이다`);
      }
    }
  });
});

/** `generate.ts` 의 소금 — 해설이 어느 설계에서 나왔는지 맞춰 보려면 같은 rng 가 필요하다. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

describe("[중3 확대 갈래] ㉥ 해설이 말하는 조건이 실제와 어긋나지 않는다", () => {
  it("자리 조건의 «맞는다/맞지 않는다»가 실제 정렬 결과와 같다", () => {
    for (let i = 0; i < 240; i += 1) {
      const plan = planMedianMean(createRng(20260901 + i * 7919));
      for (const r of plan.rows) {
        if (!r.natural) continue;
        expect(
          r.needHolds,
          `후보 ${r.x}: 해설은 «${r.needText}» 라 하는데 실제 판정이 다르다`,
        ).toBe(r.median === r.mean);
      }
    }
  });

  it("이차함수 22T — 해설이 적은 꼭짓점의 사분면이 실제와 같다", () => {
    for (let i = 0; i < 240; i += 1) {
      const plan = planVertexQuadrant(createRng(20260901 + i * 7919));
      for (const r of plan.rows) {
        expect(r.quadrant).toBe(quadrantOf(r.k, r.vy));
        expect(
          r.quadrant,
          "꼭짓점이 축 위면 «사분면 위»가 거짓말이다",
        ).not.toBe(0);
      }
      expect(plan.sift.kept).toHaveLength(1);
    }
  });
});

describe("[중3 확대 갈래] ㉦ 지면 냄새 — 값은 맞는데 글자가 나쁜 부류", () => {
  const BAD: [RegExp, string][] = [
    [/\+-|-\+/, "부호가 붙어 나온다 (`+-`)"],
    [/--/, "부호가 겹쳐 나온다 (`--`)"],
    [/\\dfrac\{\}|\\frac\{\}/, "빈 분자 (2026-08-21)"],
    [/[^\\a-zA-Z]1[a-z]\b/, "계수 1이 남았다 (`1x`)"],
    [/\^1\b/, "지수 1이 남았다"],
    [/[가-힣]를 지난다/, "목적격 조사가 «를» 로 굳었다"],
    [/시간를|수을/, "명사 뒤 조사가 틀렸다"],
    [/\$\$/, "빈 수식"],
    [/[0-9]\s*번\s*그림|다음 그림/, "그림이 없는데 그림을 가리킨다"],
  ];

  it("눈금 — 이 검사가 «아니오» 를 낼 수 있다", () => {
    expect(BAD.some(([re]) => re.test("$2+-3$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("운동한 시간를 조사하여"))).toBe(true);
    expect(BAD.some(([re]) => re.test("$\\dfrac{}{2}$"))).toBe(true);
    // 음성 대조 — 멀쩡한 지면을 잡으면 늘 우는 가드가 된다(2026-08-20).
    expect(
      BAD.some(([re]) => re.test("$x\\le 11$이면 중앙값은 $11$이다.")),
    ).toBe(false);
    expect(
      BAD.some(([re]) => re.test("이차함수 $y=x^2-2kx+2k^2-39$의 그래프")),
    ).toBe(false);
  });

  it("전 씨앗의 발문·정답·해설에 냄새가 없다", () => {
    const hits: string[] = [];
    for (const e of M3_TOP) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = generateMiddleProblem(e.key, seed, v);
          for (const [field, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            for (const [re, why] of BAD) {
              if (re.test(text))
                hits.push(`${e.key} s${seed}v${v} ${field}: ${why}`);
            }
          }
        }
      }
    }
    expect([...new Set(hits)].slice(0, 10)).toEqual([]);
  });

  it("그림이 없다 — 이 두 갈래는 그림 없이 완결된다", () => {
    for (const e of M3_TOP) {
      for (const seed of SEEDS) {
        expect(generateMiddleProblem(e.key, seed).figureSpec).toBeNull();
      }
    }
  });
});

describe("[중3 확대 갈래] 등록 메타", () => {
  it("확장 번호는 «숫자+영문 한 글자» 라 RPM 색인과 영영 안 겹친다", () => {
    for (const e of M3_TOP) {
      expect(e.rpmType, `${e.key}`).toMatch(/^\d+[A-Z]$/);
      expect(e.key.split("|")).toHaveLength(3);
      expect(e.grade).toBe("중3");
    }
  });

  it("씨앗을 넓게 훑어도 던지지 않는다", () => {
    // 판정기는 씨앗 몇 개만 본다. 「200씨앗에 한 번 터지는」 자리를 여기서 막는다
    // (2026-08-27 에 실제로 났다 — midTypesC 머리말).
    for (const e of M3_TOP) {
      for (let s = 0; s < 120; s += 1) {
        expect(() => generateMiddleProblem(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("같은 씨앗이면 같은 결과 — AI 가 아니다", () => {
    for (const e of M3_TOP) {
      const a = generateMiddleProblem(e.key, 424242, 1);
      const b = generateMiddleProblem(e.key, 424242, 1);
      expect(a.content).toBe(b.content);
      expect(a.answer).toBe(b.answer);
      expect(a.solution).toBe(b.solution);
    }
  });
});
