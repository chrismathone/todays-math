/**
 * 중1 「일차방정식의 활용」 22유형 — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * **방정식을 여기서 다시 세워** 만족하는지 본다. 생성기가 역산을 틀리면
 * 여기서 빨개진다 — 검산식이 생성기와 **다른 식**이어야 의미가 있으므로,
 * 아래 식들은 「발문이 말하는 조건」을 직접 옮긴 것이다.
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

/** 유형별 독립 검산 — 발문의 조건식을 그대로 옮긴다. */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 어떤 수 x에 a 곱하고 b 더한 것 == cx + diff
  "01": (f) => f.a! * f.x! + f.b! === f.c! * f.x! + f.diff! && f.diff !== 0,
  // 연속 세 자연수 (m-1)+m+(m+1) == S
  "02": (f) => f.m! - 1 + f.m! + (f.m! + 1) === f.S! && f.m! - 1 >= 1,
  // 자릿수: 합 s, 바꾼 수 == 처음 수 + d, N 재구성
  "03": (f) =>
    f.a! + f.b! === f.s! &&
    10 * f.b! + f.a! === 10 * f.a! + f.b! + f.d! &&
    f.N! === 10 * f.a! + f.b! &&
    f.a! >= 1 &&
    f.b! <= 9,
  // 개수: p·x + q·(T-x) == C, 0<x<T
  "06": (f) =>
    f.p! * f.x! + f.q! * (f.T! - f.x!) === f.C! && f.x! > 0 && f.x! < f.T!,
  // 나이: f+k == m(s+k)
  "04": (f) => f.f! + f.k! === f.m! * (f.s! + f.k!),
  // 예금: a0+p·n == 2(b0+q·n), 해가 유일하려면 p≠2q
  "05": (f) =>
    f.a0! + f.p! * f.n! === 2 * (f.b0! + f.q! * f.n!) && f.p! !== 2 * f.q!,
  // 과부족: an+r == bn-s, 남는 것과 모자란 것 둘 다 양수
  "08": (f) =>
    f.a! * f.n! + f.r! === f.b! * f.n! - f.s! && f.r! >= 1 && f.s! >= 1,
  // 긴 의자: an+r == b(n-k), 남는 의자 k ≥ 1, 못 앉는 학생 r ≥ 1
  "20": (f) =>
    f.a! * f.n! + f.r! === f.b! * (f.n! - f.k!) && f.k! >= 1 && f.r! >= 1,
  // 증감: a%·x - b%·y == c (c≠0), x+y == T
  "09": (f) =>
    (f.a! * f.x!) / 100 - (f.b! * f.y!) / 100 === f.c! &&
    f.c !== 0 &&
    f.x! + f.y! === f.T!,
  // 원가: 이익 == x·m/100 - d == p > 0
  "18": (f) => (f.x! * f.m!) / 100 - f.d! === f.p! && f.p! > 0,
  // 등산: d/v1 + d/v2 == t
  "11": (f) => f.d! / f.v1! + f.d! / f.v2! === f.t!,
  // 왕복 시간차: d/v1 - d/v2 == k/60 (분모 없애서 정수로 비교)
  "12": (f) =>
    60 * f.d! * f.v2! - 60 * f.d! * f.v1! === f.k! * f.v1! * f.v2! * -1 ||
    60 * f.d! * (f.v2! - f.v1!) === f.k! * f.v1! * f.v2!,
  // 추격: u(t+x) == w·x
  "13": (f) => f.u! * (f.t! + f.x!) === f.w! * f.x!,
  // 둘레 반대 방향: (p+q)·t == C
  "14": (f) => (f.p! + f.q!) * f.t! === f.C!,
  // 기차: v·t1 == B1+L, v·t2 == B2+L, 다리·터널이 기차보다 길다
  "22": (f) =>
    f.v! * f.t1! === f.B1! + f.L! &&
    f.v! * f.t2! === f.B2! + f.L! &&
    f.B1! > f.L! &&
    f.B2! > f.L!,
  // 직사각형: 2{(h+d)+h} == P
  "07": (f) => 2 * (f.h! + f.d! + f.h!) === f.P!,
  // 농도-물: 소금 보존 A%·B == C%·(B+W)
  "15": (f) => f.A! * f.B! === f.C! * (f.B! + f.W!),
  // 농도-소금: A%·B/100 + s == C%·(B+s)/100 (100 곱해 정수 비교)
  "16": (f) => f.A! * f.B! + 100 * f.s! === f.C! * (f.B! + f.s!),
  // 두 소금물: a·x + b·(T-x) == c·T, 0<x<T
  "17": (f) =>
    f.a! * f.x! + f.b! * (f.T! - f.x!) === f.c! * f.T! &&
    f.x! > 0 &&
    f.x! < f.T!,
  // 일: x·(1/a + 1/b) == 1  ⇔  x(a+b) == ab
  "19": (f) => f.x! * (f.a! + f.b!) === f.a! * f.b!,
  // 전체의 양: x(1-1/a)(1-1/b) == N  ⇔  x(a-1)(b-1) == N·a·b
  "10": (f) => f.x! * (f.a! - 1) * (f.b! - 1) === f.N! * f.a! * f.b!,
  // 성냥개비: 3 + 2(n-1) == M
  "21": (f) => 3 + 2 * (f.n! - 1) === f.M!,
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다 — 답이 엉뚱한 수를 찍는 것을 막는다. */
const ANSWER_KEY: Record<string, string> = {
  "01": "x",
  "02": "", // m+1 — 아래에서 따로 본다
  "03": "N",
  "06": "x",
  "04": "k",
  "05": "n",
  "08": "n",
  "20": "n",
  "09": "x",
  "18": "x",
  "11": "d",
  "12": "d",
  "13": "x",
  "14": "t",
  "22": "L",
  "07": "h",
  "15": "W",
  "16": "s",
  "17": "x",
  "19": "x",
  "10": "x",
  "21": "n",
};

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

describe("중1 일차방정식의 활용 22유형", () => {
  const entries = registeredTypes().filter(
    (e) => e.rpmMinor === "일차방정식의 활용",
  );

  it("RPM 색인의 22유형이 전부 등록돼 있다", () => {
    expect(entries.length).toBe(22);
    const nums = entries.map((e) => e.rpmType).sort();
    expect(nums).toEqual(
      Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("우리 단원 6개(0건짜리 5개 + 증감)에 나눠 붙는다", () => {
    const sections = new Set(entries.map((e) => e.unitSection));
    expect(sections).toEqual(
      new Set([
        "일차방정식의 활용(수)",
        "일차방정식의 활용(나이, 과부족, 예금)",
        "일차방정식의 활용(증가와 감소, 원가와 정가)",
        "일차방정식의 활용(거리, 속력, 시간)",
        "일차방정식의 활용(도형, 농도, 일)",
        "일차방정식의 활용(비율, 시계, 규칙)",
      ]),
    );
  });

  // entries(이 파일 담당 22유형)만 돈다 — registeredTypes() 전체를 돌면
  // 병렬 세션이 등록한 다른 학년 유형에 이 파일의 VERIFY(번호 키)를 들이대게 된다.
  for (const e of entries) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.rpmType];
        expect(verify, `검산식 누락: ${e.rpmType}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const n = firstNumber(p.answer);
          if (e.rpmType === "02") {
            expect(n).toBe(p.facts.m! + 1);
          } else {
            const key = ANSWER_KEY[e.rpmType]!;
            expect(n, `답 ${p.answer} vs facts.${key}`).toBe(p.facts[key]);
          }
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

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });
});
