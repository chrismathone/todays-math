/**
 * 중2 「일차부등식(응용)·일차부등식의 활용·연립일차방정식(응용)·연립일차방정식의 활용」
 * 36유형 — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * **발문이 말하는 조건**을 여기서 다시 세워 만족하는지 본다. 부등식 유형은
 * 경계 검사(답은 만족·답±1은 불만족)까지 본다 — 생성기가 역산을 틀리면 빨개진다.
 *
 * RPM 유형 번호·제목은 `scripts/rpm/rpm-type-catalog.json`(색인 정본)과 대조한다 —
 * 지어낸 제목이면 여기서 빨개진다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { M2_TYPES } from "../../lib/middle/m2";
import { eulReul, waGwa } from "../../lib/middle/m2Josa";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

/** 유형별 독립 검산 — 키는 `RPM중단원|번호`. 식은 발문의 조건을 직접 옮긴 것. */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // a<0 표본(a=-2)으로 부등호 방향을 실검사: 해 쪽 값은 만족, 반대쪽은 불만족
  "일차부등식|10": (f) => {
    const val = (x: number) => -2 * x + 2 * f.c!; // ax-ca (a=-2)
    return f.gt === 1
      ? val(f.c! - 1) > 0 && !(val(f.c! + 1) > 0)
      : val(f.c! + 1) < 0 && !(val(f.c! - 1) < 0);
  },
  // mx-a<=b 의 해 x<=(a+b)/m 이 x<=s 와 같다
  "일차부등식|11": (f) => f.a! + f.b! === f.m! * f.s! && f.m! >= 2,
  // 2x+b1<x+b2 → x<s, 3x-a<x+c → x<(a+c)/2, 두 해가 같다
  "일차부등식|12": (f) => f.b2! - f.b1! === f.s! && f.a! + f.c! === 2 * f.s!,
  // ax>b 의 해가 x<c ⇒ a<0 이고 b/a=c
  "일차부등식|13": (f) => f.a! * f.c! === f.b! && f.a! < 0,
  // x<=a+d 를 만족하는 자연수가 n개 ⇔ n<=a+d<n+1, 경계 a=lo 에서 등호
  "일차부등식|14": (f) => f.lo! + f.d! === f.n! && f.n! >= 1,

  // 2x-b>x+c: 답 m은 만족, m-1은 불만족
  "일차부등식의 활용|01": (f) =>
    2 * f.m! - f.b! > f.m! + f.c! && !(2 * (f.m! - 1) - f.b! > f.m! - 1 + f.c!),
  // 형 a0+p·x > 동생 b0+q·x: n0 만족, n0-1 불만족
  "일차부등식의 활용|02": (f) =>
    f.a0! + f.p! * f.n0! > f.b0! + f.q! * f.n0! &&
    f.a0! + f.p! * (f.n0! - 1) <= f.b0! + f.q! * (f.n0! - 1) &&
    f.b0! > f.a0!,
  // (a+b+c+x)/4>=m: x0 만족, x0-1 불만족
  "일차부등식의 활용|03": (f) =>
    f.a! + f.b! + f.c! + f.x0! >= 4 * f.m! &&
    f.a! + f.b! + f.c! + f.x0! - 1 < 4 * f.m!,
  // px+f<=T: n 만족, n+1 불만족
  "일차부등식의 활용|04": (f) =>
    f.p! * f.n! + f.f! <= f.T! && f.p! * (f.n! + 1) + f.f! > f.T!,
  // F+p(x-base)<=T: n 만족, n+1 불만족
  "일차부등식의 활용|05": (f) =>
    f.F! + f.p! * (f.n! - f.base!) <= f.T! &&
    f.F! + f.p! * (f.n! + 1 - f.base!) > f.T! &&
    f.n! > f.base!,
  // ax>bx+D: n 만족, n-1 불만족
  "일차부등식의 활용|06": (f) =>
    f.a! * f.n! > f.b! * f.n! + f.D! &&
    f.a! * (f.n! - 1) <= f.b! * (f.n! - 1) + f.D! &&
    f.a! > f.b!,
  // px>q·t: n 만족, n-1 불만족, n<t, q는 p의 (100-dc)%
  "일차부등식의 활용|07": (f) =>
    f.p! * f.n! > f.q! * f.t! &&
    f.p! * (f.n! - 1) <= f.q! * f.t! &&
    f.n! < f.t! &&
    f.q! * 100 === f.p! * (100 - f.dc!),
  // (1/2)bh>=S 의 경계: bh=2S
  "일차부등식의 활용|08": (f) => f.b! * f.h! === 2 * f.S!,
  // (m/100)x-D>=(k/100)x 의 경계: c0(m-k)=100D
  "일차부등식의 활용|09": (f) =>
    f.c0! * (f.m! - f.k!) === 100 * f.D! && f.m! > f.k!,
  // d/v1+d/v2<=T 의 경계
  "일차부등식의 활용|10": (f) =>
    f.d! * f.v2! + f.d! * f.v1! === f.T! * f.v1! * f.v2!,
  // 2d/v+s<=T 의 경계
  "일차부등식의 활용|11": (f) => 2 * f.d! + f.v! * f.s! === f.v! * f.T!,
  // 소금 보존: A·B = C·(B+W)
  "일차부등식의 활용|12": (f) =>
    f.A! * f.B! === f.C! * (f.B! + f.W!) && f.A! > f.C! && f.W! > 0,
  // a·x+b(T-x)<=cT 의 경계, b<c<a
  "일차부등식의 활용|13": (f) =>
    f.a! * f.x! + f.b! * (f.T! - f.x!) === f.c! * f.T! &&
    f.x! > 0 &&
    f.x! < f.T! &&
    f.a! > f.c! &&
    f.c! > f.b!,
  // p·x+q(T-x)>=100M 의 경계
  "일차부등식의 활용|14": (f) =>
    f.p! * f.x0! + f.q! * (f.T! - f.x0!) === 100 * f.M! &&
    f.x0! > 0 &&
    f.x0! < f.T! &&
    f.p! > f.q!,

  // 해 (x0,y0) 를 두 식에 대입, (a,b) 유일 조건 |x0|≠|y0|
  "연립일차방정식|12": (f) =>
    f.a! * f.x0! + f.b! * f.y0! === f.c1! &&
    f.b! * f.x0! + f.a! * f.y0! === f.c2! &&
    f.a! + f.b! === f.S! &&
    Math.abs(f.x0!) !== Math.abs(f.y0!),
  // 연립의 해가 세 방정식을 모두 만족
  "연립일차방정식|13": (f) =>
    f.x0! + f.y0! === f.s! &&
    f.p! * f.x0! - f.y0! === f.c2! &&
    f.q! * f.x0! - f.k! * f.y0! === f.c3! &&
    f.y0! !== 0,
  // 해가 두 식과 조건식을 모두 만족
  "연립일차방정식|14": (f) =>
    2 * f.x0! + f.y0! === f.k! + f.t1! &&
    f.x0! - 2 * f.y0! === f.k! + f.t2! &&
    f.x0! + f.y0! === f.m!,
  // 공통 해가 네 방정식을 모두 만족
  "연립일차방정식|15": (f) =>
    f.x0! + f.y0! === f.s1! &&
    3 * f.x0! - f.y0! === f.s2! &&
    f.a! * f.x0! + 2 * f.y0! === f.c1! &&
    f.x0! + f.b! * f.y0! === f.c2! &&
    f.a! + f.b! === f.S!,
  // 옳은 해는 두 식을 만족, 갑의 해는 둘째 식만·을의 해는 첫째 식만 만족
  "연립일차방정식|16": (f) =>
    f.x0! + f.a! * f.y0! === f.c1! &&
    f.b! * f.x0! - f.y0! === f.c2! &&
    f.b! * f.x1! - f.y1! === f.c2! &&
    f.x2! + f.a! * f.y2! === f.c1! &&
    f.a! * f.b! !== -1,
  // 무수히 많다 ⇔ 계수비·상수비가 모두 같다 (교차곱)
  "연립일차방정식|17": (f) =>
    f.A1! * f.a! === f.A2! * f.B1! && f.A1! * f.C2! === f.A2! * f.C1!,
  // 해가 없다 ⇔ 계수비는 같고 상수비는 다르다
  "연립일차방정식|18": (f) =>
    f.A1! * f.a! === f.A2! * f.B1! && f.A1! * f.C2! !== f.A2! * f.C1!,

  // 1/m+1/n=1/T ⇔ mn=T(m+n), a/m+b/n=1 ⇔ an+bm=mn, 유일 조건 a≠b
  "연립일차방정식의 활용|09": (f) =>
    f.m! * f.n! === f.T! * (f.m! + f.n!) &&
    f.a! * f.n! + f.b! * f.m! === f.m! * f.n! &&
    f.a! !== f.b! &&
    f.m! > 0 &&
    f.n! > 0,
  // x+y=T, a%x+b%y=N
  "연립일차방정식의 활용|10": (f) =>
    f.x! + f.y! === f.T! &&
    f.a! * f.x! + f.b! * f.y! === 100 * f.N! &&
    f.x! > 0 &&
    f.y! > 0 &&
    f.a! !== f.b!,
  // x+y=D, x/v1+y/v2=T (분모 없애 정수 비교)
  "연립일차방정식의 활용|11": (f) =>
    f.d1! + f.d2! === f.D! &&
    f.d1! * f.v2! + f.d2! * f.v1! === f.T! * f.v1! * f.v2! &&
    f.d1! > 0 &&
    f.d2! > 0 &&
    f.v1! !== f.v2!,
  // x+y=D, 시간 같음 x/p=y/q ⇔ xq=yp
  "연립일차방정식의 활용|12": (f) =>
    f.x! + f.y! === f.D! && f.x! * f.q! === f.y! * f.p! && f.x! > 0 && f.y! > 0,
  // 같은 방향 (p-q)a=C, 반대 방향 (p+q)b=C
  "연립일차방정식의 활용|13": (f) =>
    (f.p! - f.q!) * f.a! === f.C! &&
    (f.p! + f.q!) * f.b! === f.C! &&
    f.p! > f.q! &&
    f.q! > 0,
  // 거슬러 (b-w)t1=D, 내려 (b+w)t2=D
  "연립일차방정식의 활용|14": (f) =>
    (f.b! - f.w!) * f.t1! === f.D! &&
    (f.b! + f.w!) * f.t2! === f.D! &&
    f.b! > f.w! &&
    f.w! > 0,
  // x+y=T(전체), 소금 ax+by=cT
  "연립일차방정식의 활용|15": (f) =>
    f.a! * f.x! + f.b! * (f.T! - f.x!) === f.c! * f.T! &&
    f.x! > 0 &&
    f.x! < f.T! &&
    f.a! > f.c! &&
    f.c! > f.b!,
  // 두 배합 각각에서 소금의 양이 맞다
  "연립일차방정식의 활용|16": (f) =>
    f.a! * f.mA1! + f.b! * f.mB1! === f.c1! * (f.mA1! + f.mB1!) &&
    f.a! * f.mA2! + f.b! * f.mB2! === f.c2! * (f.mA2! + f.mB2!) &&
    f.a! !== f.b!,
  // 다리 v·t1=B1+L, 터널 v·t2=B2+L, 다리·터널이 기차보다 길다
  "연립일차방정식의 활용|17": (f) =>
    f.v! * f.t1! === f.B1! + f.L! &&
    f.v! * f.t2! === f.B2! + f.L! &&
    f.B1! > f.L! &&
    f.B2! > f.L!,
  // 구리 p1x+p2y=100C, 주석 r1x+r2y=100Z, 백분율 보완
  "연립일차방정식의 활용|18": (f) =>
    f.p1! * f.x! + f.p2! * f.y! === 100 * f.C! &&
    f.r1! * f.x! + f.r2! * f.y! === 100 * f.Z! &&
    f.p1! + f.r1! === 100 &&
    f.p2! + f.r2! === 100 &&
    f.p1! !== f.p2! &&
    f.x! > 0 &&
    f.y! > 0,
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다 — 답이 엉뚱한 수를 찍는 것을 막는다. */
const ANSWER_KEY: Record<string, string> = {
  "일차부등식|10": "c",
  "일차부등식|11": "a",
  "일차부등식|12": "a",
  "일차부등식|13": "a",
  "일차부등식|14": "lo",
  "일차부등식의 활용|01": "m",
  "일차부등식의 활용|02": "n0",
  "일차부등식의 활용|03": "x0",
  "일차부등식의 활용|04": "n",
  "일차부등식의 활용|05": "n",
  "일차부등식의 활용|06": "n",
  "일차부등식의 활용|07": "n",
  "일차부등식의 활용|08": "h",
  "일차부등식의 활용|09": "c0",
  "일차부등식의 활용|10": "d",
  "일차부등식의 활용|11": "d",
  "일차부등식의 활용|12": "W",
  "일차부등식의 활용|13": "x",
  "일차부등식의 활용|14": "x0",
  "연립일차방정식|12": "S",
  "연립일차방정식|13": "k",
  "연립일차방정식|14": "k",
  "연립일차방정식|15": "S",
  "연립일차방정식|16": "x0",
  "연립일차방정식|17": "a",
  "연립일차방정식|18": "a",
  "연립일차방정식의 활용|09": "n",
  "연립일차방정식의 활용|10": "x",
  "연립일차방정식의 활용|11": "d1",
  "연립일차방정식의 활용|12": "x",
  "연립일차방정식의 활용|13": "p",
  "연립일차방정식의 활용|14": "b",
  "연립일차방정식의 활용|15": "x",
  "연립일차방정식의 활용|16": "a",
  "연립일차방정식의 활용|17": "v",
  "연립일차방정식의 활용|18": "x",
};

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

type CatalogType = { minor: string; number: string; title: string };

describe("중2 부등식·연립방정식 활용 계열 36유형", () => {
  it("36유형이 등록돼 있고 유형 번호가 색인과 같다", () => {
    expect(M2_TYPES.length).toBe(36);
    const byMinor = new Map<string, string[]>();
    for (const e of M2_TYPES) {
      const arr = byMinor.get(e.rpmMinor) ?? [];
      arr.push(e.rpmType);
      byMinor.set(e.rpmMinor, arr);
    }
    expect(byMinor.get("일차부등식")?.sort()).toEqual([
      "10",
      "11",
      "12",
      "13",
      "14",
    ]);
    expect(byMinor.get("일차부등식의 활용")?.sort()).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(byMinor.get("연립일차방정식")?.sort()).toEqual([
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
    ]);
    expect(byMinor.get("연립일차방정식의 활용")?.sort()).toEqual([
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
    ]);
  });

  it("RPM 유형 번호·제목이 색인 정본과 일치한다 (지어낸 제목 금지)", () => {
    const raw = readFileSync(
      resolve(__dirname, "../../../scripts/rpm/rpm-type-catalog.json"),
      "utf-8",
    );
    const catalog = JSON.parse(raw) as Record<string, { types: CatalogType[] }>;
    const book = catalog["2-1"]!.types;
    for (const e of M2_TYPES) {
      const hit = book.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `색인에 없는 유형: ${e.key}`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("우리 단원 9개(0건 7개 + 해가 특수 + 개수·예금액)에 실측 이름으로 붙는다", () => {
    const count = new Map<string, number>();
    for (const e of M2_TYPES) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    // 공유 DB Unit.section 실측 리터럴 (2026-08-23)
    expect(count).toEqual(
      new Map([
        ["일차부등식의 응용", 5],
        ["일차부등식의 활용(수, 평균, 정가)", 3],
        ["일차부등식의 활용(개수, 예금액, 유리한 방법)", 5],
        ["일차부등식의 활용(속력, 도형, 기타)", 3],
        ["일차부등식의 활용(농도)", 3],
        ["연립방정식의 풀이의 응용", 5],
        ["해가 특수한 연립방정식", 2],
        ["연립방정식의 활용(일, 속력)", 6],
        ["연립방정식의 활용(농도, 비율, 합금)", 4],
      ]),
    );
  });

  for (const e of M2_TYPES) {
    const vkey = `${e.rpmMinor}|${e.rpmType}`;
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[vkey];
        expect(verify, `검산식 누락: ${vkey}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const key = ANSWER_KEY[vkey];
        expect(key, `답 키 누락: ${vkey}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const n = firstNumber(p.answer);
          expect(n, `답 ${p.answer} vs facts.${key}`).toBe(p.facts[key!]);
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });
    });
  }

  it("수 뒤 조사가 수 읽기의 받침을 따른다 (일→을, 이→를, 십→을)", () => {
    expect(eulReul(1)).toBe("을");
    expect(eulReul(2)).toBe("를");
    expect(eulReul(3)).toBe("을");
    expect(eulReul(4)).toBe("를");
    expect(eulReul(9)).toBe("를");
    expect(eulReul(10)).toBe("을"); // 십
    expect(eulReul(12)).toBe("를"); // 십이
    expect(eulReul(-3)).toBe("을"); // 마이너스 삼
    expect(waGwa(2)).toBe("와");
    expect(waGwa(21)).toBe("과"); // 이십일
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M2_TYPES) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });
});
