/**
 * 갈래 D — 중등 소단원을 10유형으로 채우는 몫.
 *
 * ## 여기 있는 것 / 여기 없는 것
 *
 * | 무엇 | 어디 |
 * |---|---|
 * | 소단원이 **10유형**인가 | 여기 (`DONE_SECTIONS`) |
 * | 끝낸 소단원의 **지면 글자**(조사·냄새) | 여기 |
 * | 유형 하나의 **값 검산** | 아래 참조 — 모듈마다 다르다 |
 * | 번호가 RPM 색인과 맞나 | `middleTypeCoverage.test.ts` 가 **전량**으로 |
 *
 * ## 검산이 어디 사는가 — **모듈 시험이 좁혀졌는지** 보고 정한다
 *
 * main 이 2026-08-27 에 규약을 세웠다: 모듈 시험이 `isCatalogType` 으로 좁혀졌으면
 * 그 시험은 **색인 유형만** 보므로, 우리가 «지은» 확장 유형의 검산은 **여기**가
 * 든다(`EXT_VERIFY`). 안 좁혀진 모듈은 예전대로 그 모듈 시험이 든다.
 *
 *   · `m2GeoQuad` → `middleM2Geo` 가 **좁혀졌다** → 18~ 은 **여기**
 *   · `m1Book1`→`middleM1Extra` · `m1Num`→`middleM1Num`
 *     · `m1LinearApply`→`middleLinearApply` → 아직 안 좁혀졌다 → 거기
 *
 * 새 유형을 지으면 **둘 중 한 곳에만** 검산을 적는다. 두 곳에 적으면 표가 두 벌이
 * 되고, 한쪽만 고쳐도 아무도 모른다.
 *
 * ⚠️ 한 소단원이 **두 모듈에 걸칠 수 있다.** 「평행선과 삼각형의 넓이」가 그렇다 —
 *    13~16 은 `m2GeoTri`(내 파일이 아니다), 18~23 은 `m2GeoQuad`. 그래서
 *    `entries` 는 모듈 하나가 아니라 **그 소단원을 담은 모듈 전부**를 이어 붙인다.
 *    한쪽만 세면 「10유형」이 영영 6으로 보인다.
 */

import { describe, expect, it } from "vitest";

import {
  generateMiddleProblem,
  generateMiddleSet,
} from "@/lib/middle/generate";
import { M1_BOOK1 } from "@/lib/middle/m1Book1";
import { M1_LINEAR_APPLY } from "@/lib/middle/m1LinearApply";
import { M1_NUM } from "@/lib/middle/m1Num";
import { M2_GEO_QUAD } from "@/lib/middle/m2GeoQuad";
import { M2_GEO_TRI } from "@/lib/middle/m2GeoTri";

import { josaMismatches, pageSmells } from "../helpers/midPage";
import { isCatalogType } from "../helpers/rpmCatalog";

/** 이 갈래에서 **10유형을 채운** 소단원 — 끝낼 때마다 한 줄씩 는다. */
const DONE_SECTIONS = [
  { entries: M1_LINEAR_APPLY, section: "일차방정식의 활용(비율, 시계, 규칙)" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(증가와 감소, 원가와 정가)",
  },
  { entries: M1_BOOK1, section: "일차식의 뜻Ⅰ" },
  { entries: M1_NUM, section: "공약수와 최대공약수" },
  { entries: M1_BOOK1, section: "소수와 거듭제곱" },
  { entries: M1_NUM, section: "수의 대소관계" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(나이, 과부족, 예금)",
  },
  { entries: M1_LINEAR_APPLY, section: "일차방정식의 활용(수)" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(거리, 속력, 시간)",
  },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(도형, 농도, 일)",
  },
  { entries: M1_NUM, section: "공배수와 최소공배수" },
  { entries: M1_NUM, section: "소인수분해" },
  { entries: M1_NUM, section: "최대공약수와 최소공배수의 활용" },
  {
    entries: [...M2_GEO_TRI, ...M2_GEO_QUAD],
    section: "평행선과 삼각형의 넓이",
  },
  { entries: M2_GEO_QUAD, section: "직사각형, 마름모, 정사각형" },
] as const;

describe("중등 유형 갈래 D", () => {
  it.each(DONE_SECTIONS)(
    "$section 소단원은 서로 다른 유형 10개를 갖는다",
    ({ entries, section }) => {
      const selected = entries.filter((entry) => entry.unitSection === section);
      expect(selected).toHaveLength(10);
      expect(new Set(selected.map((entry) => entry.key)).size).toBe(10);
    },
  );

  // ── 지면 글자 — 값 검산이 구조적으로 못 보는 자리 ──────────────
  //
  // 눈금을 먼저 둔다: **이 자가 «아니오»를 낼 수 있는가.** 없으면 「0건」이
  // 「깨끗」인지 「못 셈」인지 안 갈린다(2026-08-21).

  it("판정기 눈금 — 조사·냄새 자가 아니오를 낼 수 있다", () => {
    // 양성
    expect(josaMismatches("$15$과 $3$")).toEqual(["$…15$과 → 와"]);
    expect(josaMismatches("$36$가 된다")).toEqual(["$…36$가 → 이"]);
    expect(pageSmells("$1x+2$")).toContain("계수 1 을 적었다");
    expect(pageSmells("$11^{1}$")).toContain("지수 1 을 적었다");
    // 음성 — 옳은 지면을 잡으면 거짓 경보고, 거짓 경보는 가드를 끈다
    expect(josaMismatches("$15$와 $3$을")).toEqual([]);
    expect(josaMismatches("$5x-3x^2$을")).toEqual([]); // 「제곱」으로 읽는다
    expect(josaMismatches("$5$이다")).toEqual([]); // 서술격 「이다」
    expect(pageSmells("$x+2$")).toEqual([]);
    expect(pageSmells("$2^{3}\\times11$")).toEqual([]);
  });

  it.each(DONE_SECTIONS)(
    "$section 소단원의 지면에 조사·냄새 결함이 없다",
    ({ entries, section }) => {
      for (const entry of entries.filter((e) => e.unitSection === section)) {
        for (let variant = 0; variant < 20; variant += 1) {
          const p = generateMiddleProblem(entry.key, 20260827, variant);
          for (const part of [p.content, p.answer, p.solution]) {
            expect(josaMismatches(part), `${entry.key} ${part}`).toEqual([]);
            expect(pageSmells(part), `${entry.key} ${part}`).toEqual([]);
          }
        }
      }
    },
  );
});

/* ────────────────── 확장 유형의 값 검산 (m2GeoQuad 18~) ──────────────────
 *
 * main 이 2026-08-27 에 세운 규약이다 — 모듈 시험(`middleM2Geo`)은
 * `isCatalogType` 으로 **색인 유형만** 보고, 우리가 «지은» 확장 유형의 검산은
 * 그 갈래의 시험이 든다. 그래야 남의 모듈 시험이 우리 유형을 자기 검산표에
 * 들이대지 않는다.
 *
 * 검산은 **도형을 실제로 세워 잰다.** 넓이·길이·각은 조건식이 곧 생성식이라
 * 공식을 옮겨 적으면 동어반복이 된다. 교점은 «중점»으로 가정하지 않고 두
 * 직선을 직접 만나게 해서 구한다.
 */

type P2 = readonly [number, number];

const dist = (a: P2, b: P2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** 벡터 b→a 와 b→c 의 내적. */
const dot = (a: P2, b: P2, c: P2): number =>
  (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);

const near = (a: number, b: number, eps = 1e-9): boolean =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

/** 삼각형의 넓이 — 신발끈. */
function triArea(a: P2, b: P2, c: P2): number {
  return (
    Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
  );
}

/** 각 `∠abc` 의 크기(도) — 세 점에서 직접 잰다. */
function angleDeg(a: P2, b: P2, c: P2): number {
  const u = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const v = Math.hypot(c[0] - b[0], c[1] - b[1]);
  return (
    (Math.acos(Math.min(1, Math.max(-1, dot(a, b, c) / (u * v)))) * 180) /
    Math.PI
  );
}

/** 선분 `ab` 의 내분점 (`t`=0 이면 a, 1 이면 b). */
function lerpP(a: P2, b: P2, t: number): P2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** 두 직선 `ab` · `cd` 의 교점 — «어디서 만나는가»를 **가정하지 않고** 푼다. */
function lineInter(a: P2, b: P2, c: P2, d: P2): P2 {
  const r: P2 = [b[0] - a[0], b[1] - a[1]];
  const s: P2 = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

const EXT_VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // ── 등변사다리꼴 28 (2026-08-29) ────────────────────────────────
  // 「되는 조건」이므로 **조건식이 실제로 성립하는지**를 잰다 — 생성기가 쓴
  // 대수를 옮겨 적지 않고, 두 각(또는 두 대각선)의 식을 각각 값으로 만들어
  // 같아지는지 본다. 근(`root`)과 답(`x`)이 다른 모드가 있어 둘 다 확인한다.
  "2-2|여러 가지 사각형|28": (f) => {
    if (f.mode === 0) {
      const angB = f.p! * f.x! - f.q!;
      const angC = f.x! + f.s!;
      // 각이 같아야 등변이고, 사다리꼴의 아랫변 각이므로 0 < θ < 180 이다.
      return angB === angC && angB > 0 && angB < 180 && f.theta === angB;
    }
    const ac = f.p! * f.root! + f.q!;
    const bd = f.root! + f.s!;
    // 두 대각선이 같아야 등변이고, **그때의 AC 가 답**이다.
    return ac === bd && ac > 0 && f.x === ac;
  },
  // ── 평행선과 삼각형의 넓이 18~23 ────────────────────────────────
  // 여기서부터는 «식을 다시 세운다»가 아니라 **도형을 실제로 세워 넓이를 잰다.**
  // 넓이 유형은 조건식이 곧 생성식이라 옮겨 적으면 동어반복이 된다.

  // 18 — 점 A 가 직선 l 위 **어디에 있든** 넓이가 같다는 것이 이 유형의 성질이다.
  "2-2|여러 가지 사각형|18": (f) => {
    const B: P2 = [0, 0];
    const C: P2 = [f.a!, 0];
    const anywhere = [-4, 0, 1.7, f.a! + 9].every((ax) =>
      near(triArea([ax, f.h!], B, C), f.area!),
    );
    return anywhere && (f.mode === 0 ? f.x === f.area : f.x === f.h);
  },

  // 19 — 중선이 넓이를 이등분한다. 모드 1 은 그 절반을 한 번 더 이등분.
  //      ⚠️ `half` 은 **해설에만** 나오는 중간값이다. 답만 재면 해설이 틀려도
  //      아무도 못 본다(변이가 실제로 초록을 냈다) — 그래서 여기서 같이 잰다.
  "2-2|여러 가지 사각형|19": (f) => {
    const A: P2 = [3.3, f.S! / 5];
    const B: P2 = [0, 0];
    const C: P2 = [10, 0];
    const D = lerpP(B, C, 0.5);
    if (!near(triArea(A, B, C), f.S!)) return false;
    if (f.mode === 0) return near(triArea(A, B, D), f.x!);
    return (
      near(triArea(A, B, D), f.half!) &&
      near(triArea(A, B, lerpP(A, D, 0.5)), f.x!)
    );
  },

  // 20 — 내부의 점 P 를 «삼각형 PAB 가 a 가 되는 자리»에 놓고 삼각형 PCD 를 잰다.
  "2-2|여러 가지 사각형|20": (f) => {
    const A: P2 = [2.5, f.S! / 12];
    const B: P2 = [0, 0];
    const C: P2 = [12, 0];
    const D: P2 = [A[0] + 12, A[1]];
    const P: P2 = [((2 * f.a!) / f.S!) * 12 + 0.45 * A[0], 0.45 * A[1]];
    return (
      near(triArea(A, B, C) + triArea(A, C, D), f.S!) &&
      // 해설이 찍는 «평행사변형의 절반»도 도형에서 잰다 (19 와 같은 이유).
      near(triArea(P, A, B) + triArea(P, C, D), f.half!) &&
      near(triArea(P, A, B), f.a!) &&
      near(triArea(P, C, D), f.x!)
    );
  },

  // 21 — 답 x 를 «BD 의 길이»로 되돌려 놓고 삼각형 ABD 가 t 인지 잰다.
  "2-2|여러 가지 사각형|21": (f) => {
    const A: P2 = [1.3, (2 * f.S!) / f.a!];
    const B: P2 = [0, 0];
    return (
      f.x! < f.a! &&
      near(triArea(A, B, [f.a!, 0]), f.S!) &&
      near(triArea(A, B, [f.x!, 0]), f.t!)
    );
  },

  // 22 — 평행사변형을 세우고 E·F 를 발문의 비로 잡아 삼각형 EBF 를 잰다.
  //      `half`(ABC) 과 `mid`(ABF) 는 **해설에만** 나오는 두 단계다. 답 하나만
  //      재던 판에서는 `mid` 를 1 만큼 어긋내도 시험이 초록이었다 — 그 상태로
  //      나가면 지면의 계산이 «$42\times\dfrac{3}{7}=19$» 가 된다.
  "2-2|여러 가지 사각형|22": (f) => {
    const A: P2 = [3, f.S! / 14];
    const B: P2 = [0, 0];
    const C: P2 = [14, 0];
    const D: P2 = [A[0] + 14, A[1]];
    const E = lerpP(A, B, f.p! / (f.p! + f.q!));
    const F = lerpP(B, C, f.m! / (f.m! + f.n!));
    return (
      near(triArea(A, B, C) + triArea(A, C, D), f.S!) &&
      near(triArea(A, B, C), f.half!) &&
      near(triArea(A, B, F), f.mid!) &&
      near(triArea(E, B, F), f.x!)
    );
  },

  // 23 — 사다리꼴을 세우고 **두 대각선의 교점을 직접 풀어** 네 조각의 비를 잰다.
  //      배율 u 는 삼각형 AOD 를 p 에 맞추는 값이고, 나머지 셋이 q·r·r 이어야 한다.
  "2-2|여러 가지 사각형|23": (f) => {
    const H = 3.7;
    const A: P2 = [1.1, H];
    const B: P2 = [0, 0];
    const C: P2 = [2 * f.t!, 0];
    const D: P2 = [A[0] + 2 * f.s!, H];
    const O = lineInter(A, C, B, D);
    const u = f.p! / triArea(A, O, D);
    return (
      near(triArea(O, B, C) * u, f.q!, 1e-8) &&
      near(triArea(A, B, O) * u, f.r!, 1e-8) &&
      near(triArea(D, O, C) * u, f.r!, 1e-8) &&
      f.x === f.p! + f.q! + 2 * f.r!
    );
  },

  // ── 직사각형, 마름모, 정사각형 24~27 ────────────────────────────
  // 여기도 도형을 세워 잰다. 교점 `O` 는 «중점»으로 놓지 않고 두 대각선을
  // **직접 만나게** 해서 구한다 — 「대각선이 서로 다른 것을 이등분한다」가 바로
  // 이 유형들이 쓰는 성질이라, 그것을 가정하면 검산이 동어반복이 된다.
  "2-2|여러 가지 사각형|24": (f) => {
    const diag = f.mode === 0 ? f.c! : f.x!;
    const left = f.mode === 0 ? Math.sqrt(diag * diag - f.b! * f.b!) : f.a!;
    const bottom = f.mode === 0 ? f.b! : Math.sqrt(diag * diag - f.a! * f.a!);
    const A: P2 = [0, left];
    const B: P2 = [0, 0];
    const C: P2 = [bottom, 0];
    const D: P2 = [bottom, left];
    const O = lineInter(A, C, B, D);
    return f.mode === 0
      ? near(f.half!, diag / 2, 1e-8) &&
          near(dist(O, B) + dist(O, C) + dist(B, C), f.x!, 1e-8)
      : near(dist(O, A) + dist(O, B) + dist(A, B), f.p!, 1e-8);
  },

  // 25 — 두 대각선으로 마름모를 세우고 넓이를 신발끈으로 잰다(공식을 안 옮긴다).
  "2-2|여러 가지 사각형|25": (f) => {
    const A: P2 = [0, f.m! / 2];
    const B: P2 = [-f.n! / 2, 0];
    const C: P2 = [0, -f.m! / 2];
    const D: P2 = [f.n! / 2, 0];
    return (
      near(dist(A, C), f.m!, 1e-9) &&
      near(dist(B, D), f.n!, 1e-9) &&
      near(triArea(A, B, C) + triArea(A, C, D), f.S!, 1e-9) &&
      f.x! === (f.mode === 0 ? f.S! : f.n!)
    );
  },

  // 26 — 정사각형을 넓이에서 되돌려 세우고 네 조각·반쪽을 잰다.
  "2-2|여러 가지 사각형|26": (f) => {
    const s = Math.sqrt(f.S!);
    const A: P2 = [0, s];
    const B: P2 = [0, 0];
    const C: P2 = [s, 0];
    const D: P2 = [s, s];
    const O = lineInter(A, C, B, D);
    return (
      near(triArea(O, A, B), f.t!, 1e-8) &&
      near(triArea(A, B, D), 2 * f.t!, 1e-8) &&
      f.x! === (f.mode === 0 ? f.t! : 2 * f.t!)
    );
  },

  // 27 — 대각선 위의 점 $P$ 를 세워 **각을 직접 잰다.** 합동 논증을 옮기지 않는다.
  "2-2|여러 가지 사각형|27": (f) => {
    const ta = Math.tan((f.a! * Math.PI) / 180);
    const t = ta / (1 + ta);
    const A: P2 = [0, 1];
    const B: P2 = [0, 0];
    const C: P2 = [1, 0];
    const D: P2 = [1, 1];
    const P: P2 = [t, t];
    if (!near(angleDeg(P, A, B), f.a!, 1e-6)) return false;
    if (!near(angleDeg(A, P, B), f.apb!, 1e-6)) return false;
    return f.mode === 0
      ? near(angleDeg(A, P, C), f.x!, 1e-6)
      : near(angleDeg(P, A, D), f.x!, 1e-6);
  },
};

/** 이 갈래가 `m2GeoQuad` 에 **지은** 유형 — 색인 밖 번호가 곧 그 표시다. */
const GEO_QUAD_EXT = M2_GEO_QUAD.filter((e) => !isCatalogType(e));

const EXT_SEEDS = [20260827, 1, 7777, 424242, 99991];

describe("갈래 D 가 m2GeoQuad 에 지은 확장 유형", () => {
  it("확장 유형은 하나도 빠짐없이 검산식을 갖는다", () => {
    const missing = GEO_QUAD_EXT.filter((e) => !EXT_VERIFY[e.key]).map(
      (e) => e.key,
    );
    expect(missing, "검산식 없는 확장 유형").toEqual([]);
    expect(GEO_QUAD_EXT.length).toBeGreaterThan(0);
  });

  for (const e of GEO_QUAD_EXT) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("씨앗별 독립 검산 — 도형을 세워 재면 발문의 수치가 맞는다", () => {
        const verify = EXT_VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of EXT_SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 첫 수가 facts.x 와 같다", () => {
        for (const seed of EXT_SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const m = p.answer.match(/-?\d+(?:\.\d+)?/);
          expect(m, `답에 수가 없다: ${p.answer}`).not.toBeNull();
          expect(
            Number(m![0]),
            `${p.answer} vs ${JSON.stringify(p.facts)}`,
          ).toBe(p.facts.x);
        }
      });

      it("그림이 있고, 스펙의 수는 전부 유한하며, 숫자 라벨은 facts 에 있다", () => {
        for (const seed of EXT_SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const spec = p.figureSpec as Record<string, unknown> | null;
          expect(spec, `${e.key} seed ${seed}: 그림이 없다`).not.toBeNull();
          expect(spec!.version).toBe(2);
          expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
          const values = new Set(Object.values(p.facts));
          for (const n of numericLabels(spec!)) {
            expect(
              values.has(n),
              `${e.key} seed ${seed}: 그림 라벨 ${n} 이 facts 에 없다`,
            ).toBe(true);
          }
        }
      });

      it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
        const set = generateMiddleSet(e.key, 20260827, 4);
        expect(new Set(set.map((p) => p.content)).size, e.key).toBe(4);
      });
    });
  }

  it("🔴 **28 의 그림이 답을 말하지 않는다** — 다리에 tick 이 없다", () => {
    // 「등변사다리꼴이 **되는** 조건」을 묻는데 그림이 두 다리에 같음 표시를
    // 달면, 학생은 식을 안 풀고 그림만 보고 답한다. 좌표도 등변이 아니게
    // 두어야 한다 — tick 만 빼고 대칭으로 그리면 모양이 답을 말한다.
    const KEY = "2-2|여러 가지 사각형|28";
    for (const seed of EXT_SEEDS) {
      for (let v = 0; v < 8; v += 1) {
        const spec = generateMiddleProblem(KEY, seed, v).figureSpec as {
          segments: Record<string, unknown>;
          points: Record<string, P2>;
        };
        for (const [name, seg] of Object.entries(spec.segments)) {
          expect(
            seg && typeof seg === "object" && "ticks" in seg,
            `${name} 에 tick 이 있으면 그림이 등변을 말해 버린다`,
          ).toBe(false);
        }
        const { A, B, C, D } = spec.points;
        // 두 다리가 좌표에서도 달라야 한다 — 같으면 모양이 답이다.
        expect(
          Math.abs(dist(A!, B!) - dist(D!, C!)),
          `seed ${seed} v${v}: 다리가 같게 그려졌다`,
        ).toBeGreaterThan(1);
      }
    }
  });

  it("그림이 발문과 같은 말을 한다 — 비·각을 지면 좌표에서 되잰다", () => {
    // 09 §4-20. «대충 그린» 그림은 에러를 안 내고 지면에서만 거짓말한다.
    const pointsOf = (key: string, seed: number): Record<string, P2> =>
      (
        generateMiddleProblem(key, seed).figureSpec as {
          points: Record<string, P2>;
        }
      ).points;
    for (const seed of EXT_SEEDS) {
      // 23 — 두 대각선의 교점 $O$ 가 실제로 두 대각선 위에 있는가
      const k23 = "2-2|여러 가지 사각형|23";
      const p23 = pointsOf(k23, seed);
      const span = Math.max(dist(p23.A!, p23.C!), dist(p23.B!, p23.D!));
      expect(
        triArea(p23.A!, p23.O!, p23.C!) / span,
        `23 seed ${seed}: O 가 대각선 AC 밖이다`,
      ).toBeLessThan(0.05);
      expect(
        triArea(p23.B!, p23.O!, p23.D!) / span,
        `23 seed ${seed}: O 가 대각선 BD 밖이다`,
      ).toBeLessThan(0.05);

      // 24 — 대각선:변 의 비
      const k24 = "2-2|여러 가지 사각형|24";
      const f24 = generateMiddleProblem(k24, seed).facts;
      const p24 = pointsOf(k24, seed);
      const want24 = f24.mode === 0 ? f24.c! / f24.b! : f24.x! / f24.a!;
      const got24 =
        f24.mode === 0
          ? dist(p24.A!, p24.C!) / dist(p24.B!, p24.C!)
          : dist(p24.A!, p24.C!) / dist(p24.A!, p24.B!);
      expect(
        Math.abs(got24 - want24),
        `24 seed ${seed}: 그림의 비 ${got24} ≠ 발문의 ${want24}`,
      ).toBeLessThan(0.02);

      // 25 — 두 대각선의 비
      const k25 = "2-2|여러 가지 사각형|25";
      const f25 = generateMiddleProblem(k25, seed).facts;
      const p25 = pointsOf(k25, seed);
      expect(
        Math.abs(dist(p25.A!, p25.C!) / dist(p25.B!, p25.D!) - f25.m! / f25.n!),
        `25 seed ${seed}: 두 대각선의 비가 발문과 다르다`,
      ).toBeLessThan(0.02);

      // 27 — 지면의 $\angle PAB$
      const k27 = "2-2|여러 가지 사각형|27";
      const f27 = generateMiddleProblem(k27, seed).facts;
      const p27 = pointsOf(k27, seed);
      expect(
        Math.abs(angleDeg(p27.P!, p27.A!, p27.B!) - f27.a!),
        `27 seed ${seed}: 그림의 각이 발문과 다르다`,
      ).toBeLessThan(0.5);
    }
  });
});

/** 스펙 JSON 안의 모든 수가 유한한가 — NaN 이 조용히 새는 것을 막는다. */
function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/** 스펙의 labels 에서 «숫자 라벨»만 뽑는다 (`12 cm` → 12). */
function numericLabels(spec: Record<string, unknown>): number[] {
  const labels = (spec.labels ?? {}) as Record<string, unknown>;
  const out: number[] = [];
  for (const value of Object.values(labels)) {
    const text =
      typeof value === "string"
        ? value
        : typeof (value as { text?: unknown })?.text === "string"
          ? (value as { text: string }).text
          : null;
    if (text === null) continue;
    const m = /^(\d+(?:\.\d+)?)(?:\s*(?:cm|m|°))?$/.exec(text.trim());
    if (m) out.push(Number(m[1]));
  }
  return out;
}
