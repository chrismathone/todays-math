/**
 * 중2 기하 27유형 (RPM 2-2 삼각형의 성질·여러 가지 사각형·도형의 닮음·평행선 비)
 * — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다 조건식을
 * **여기서 다시 세워** 만족하는지 본다. 검산식은 「발문이 말하는 성질」을 직접
 * 옮긴 것이고, 생성기가 쓴 식과 **다른 형태**여야 한다 (동어반복 금지).
 *
 * 그림은 존재·모양(version 2 · 유한한 수 · 라벨 수치가 facts 와 일치)까지 잠근다 —
 * 실제 렌더 검증은 엔진이 정본이다(09 §0.1).
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M2_TYPES } from "../../lib/middle/m2";
import { SIM01_PERMS } from "../../lib/middle/m2GeoSim";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

const MINORS = new Set([
  "삼각형의 성질",
  "여러 가지 사각형",
  "도형의 닮음",
  "평행선 사이의 선분의 길이의 비",
]);

const GEO = M2_TYPES.filter(
  (e) => e.rpmBook === "2-2" && MINORS.has(e.rpmMinor),
);

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** 삼각형 세 각의 합 — 검산이 발문의 성질을 «다시 세운다». */
function angleSum(...angles: number[]): boolean {
  return angles.reduce((s, v) => s + v, 0) === 180;
}

/**
 * 유형별 독립 검산 — 키는 `중단원|번호`.
 *
 * 각 식은 발문이 말하는 성질에서 직접 온다. 예: 이등변삼각형이면 「꼭지각 + 밑각
 * 두 개 = 180」을 세운다(생성기는 `x = (180-a)/2` 로 나눗셈을 썼다 — 형태가 다르다).
 */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 이등변: 꼭지각 + 밑각 둘 = 180. 비율 모드는 a:x = m:n 이 성립하고 세 각의 합.
  "삼각형의 성질|01": (f) =>
    f.mode === 0
      ? angleSum(f.a!, f.x!, f.x!) && f.a! > 0 && f.x! > 0
      : f.n! * (180 - 2 * f.x!) === f.m! * f.x! && f.x! > 0,
  // 꼭지각 이등분선: 밑변을 이등분(x=d) + 삼각형 ABD 의 세 각 (t, y, 90)
  "삼각형의 성질|02": (f) =>
    f.x! === f.d! && angleSum(f.t!, f.y!, 90) && f.sum! === f.x! + f.y!,
  // 이웃한 이등변: ∠A=2a 이고 외각 x = A + a 이므로 x = 3a. 검산은 외각 관계로.
  "삼각형의 성질|03": (f) =>
    f.mode === 0
      ? f.x! === 2 * f.a! + f.a! && f.a! > 0
      : f.e! === 2 * f.a! + f.a! && f.x! === 2 * f.a!,
  // 내각 이등분선 교점: ∠BDC = 180 - (B+C)/2, 그리고 A + B + C = 180.
  // 외각 이등분선 모드: ∠BDC = A/2.
  "삼각형의 성질|04": (f) =>
    f.mode === 0
      ? 2 * (180 - f.x!) + f.a! === 180
      : 2 * f.x! === f.a! && f.a! > 0 && f.x! > 0,
  // 이등변 조건: 둘레 = 2·AB + BC / 각 모드는 B=C 이고 세 각 합 180
  "삼각형의 성질|05": (f) =>
    f.mode === 0
      ? 2 * f.x! + f.k! === f.p!
      : angleSum(f.a!, f.b!, f.b!) && f.x! === f.m!,
  // 각의 이등분선: 두 거리가 같다 / 사각형 OCPD 의 네 각의 합 = 360
  "삼각형의 성질|09": (f) =>
    f.mode === 0
      ? f.x! === f.d!
      : f.w! + f.x! + 90 + 90 === 360 && f.w! > 0 && f.x! > 0,
  // 각의 이등분선 응용: 피타고라스(AB²+BC²=AC²) + BD·(AB+AC)=AB·BC (D 가 이등분선의 발)
  //  + 넓이 2s = AC·BD
  "삼각형의 성질|10": (f) =>
    f.ab! * f.ab! + f.bc! * f.bc! === f.ac! * f.ac! &&
    f.bd! * (f.ab! + f.ac!) === f.ab! * f.bc! &&
    2 * f.s! === f.ac! * f.bd!,
  // 합동 찾기: ∠DEF = ∠B 이므로 A + 2x = 180
  "삼각형의 성질|11": (f) => angleSum(f.a!, f.x!, f.x!) && f.x! > 0,
  // 평행선과 넓이: 사각형 = 두 삼각형의 합 / 직각 모드는 밑변 2w·높이 h 삼각형
  "여러 가지 사각형|13": (f) =>
    f.mode === 0
      ? f.x! === f.s1! + f.s2! && f.s1! > 0 && f.s2! > 0
      : 2 * f.x! === 2 * f.w! * f.h! && f.h! > 0 && f.w! > 0,
  // 높이가 같은 두 삼각형: S:x = (m+n):m  ⇔  x·(m+n) = S·m
  "여러 가지 사각형|14": (f) =>
    f.mode === 0
      ? f.x! * (f.m! + f.n!) === f.S! * f.m!
      : f.x! * (f.m! + f.n!) * (f.p! + f.q!) === f.S! * f.n! * f.q!,
  // 평행사변형: △DBC = S/2, 그 안에서 EC 몫  ⇔  2x(m+n) = S·n
  "여러 가지 사각형|15": (f) => 2 * f.x! * (f.m! + f.n!) === f.S! * f.n!,
  // 사다리꼴: △ABC = △DBC = △OBC + △DOC, 그리고 OBC:DOC = BO:OD
  "여러 가지 사각형|16": (f) =>
    f.mode === 0
      ? f.x! * f.m! === f.s! * (f.m! + f.n!) &&
        f.s! * f.n! === f.m! * (f.x! - f.s!)
      : f.t! === f.x! + f.u! && f.u! > 0 && f.x! > 0,
  // 닮은 도형: 대응 순서표가 실제로 그 자리를 가리키는지 (테스트가 표를 다시 읽는다)
  "도형의 닮음|01": (f) =>
    Number.isInteger(f.perm!) &&
    f.perm! >= 0 &&
    f.perm! < SIM01_PERMS.length &&
    f.si! >= 0 &&
    f.si! < 3 &&
    f.ai! >= 0 &&
    f.ai! < 3,
  // 평면 닮음: AB·EF = DE·BC (비례식을 곱셈꼴로 — 생성기는 나눗셈을 썼다)
  "도형의 닮음|02": (f) => f.ab! * f.ef! === f.x! * f.bc! && f.bc! !== f.ef!,
  // 입체 닮음: (b1+c1)·a2 = x·a1
  "도형의 닮음|03": (f) =>
    (f.b1! + f.c1!) * f.a2! === f.x! * f.a1! && f.a1! !== f.a2!,
  // 원뿔 닮음비: r1·n = R·m, 넓이 = R²
  "도형의 닮음|04": (f) =>
    f.r1! * f.n! === f.R! * f.m! && f.area! === f.R! * f.R! && f.m! < f.n!,
  // 넓이의 비 = 닮음비의 제곱: s·ad² = x·ab²
  "도형의 닮음|05": (f) =>
    f.s! * f.ad! * f.ad! === f.x! * f.ab! * f.ab! && f.ab! < f.ad!,
  // 겉넓이비 = k², 부피비 = k³: (s2/s1) = k², (x/v1) = k³ ⇒ (x/v1)² = (s2/s1)³
  "도형의 닮음|06": (f) =>
    f.x! * f.x! * f.s1! * f.s1! * f.s1! ===
    f.v1! * f.v1! * f.s2! * f.s2! * f.s2!,
  // 넓이 정비례: c1·d2² = x·d1²
  "도형의 닮음|07": (f) => f.c1! * f.d2! * f.d2! === f.x! * f.d1! * f.d1!,
  // 부피비 1:m³ — 더 붓는 양 x = v(m³-1)
  "도형의 닮음|08": (f) =>
    f.x! + f.v! === f.v! * f.m! * f.m! * f.m! && f.m! > 1,
  // 평행선 비: AD·EC = DB·AE / DE·AB = BC·AD
  "평행선 사이의 선분의 길이의 비|01": (f) =>
    f.mode === 0
      ? f.a! * f.x! === f.b! * f.e!
      : f.x! * f.c! === f.bc! * f.a! && f.a! < f.c!,
  // 나비꼴: DE·AB = BC·AE
  "평행선 사이의 선분의 길이의 비|02": (f) =>
    f.x! * f.ab! === f.bc! * f.ae! && f.ae! < f.ab!,
  // DF:FE = BG:GC 이고 DF+FE = DE ⇒ x·(g1+g2) = d·g2
  "평행선 사이의 선분의 길이의 비|03": (f) =>
    f.x! * (f.g1! + f.g2!) === f.d! * f.g2! && f.g1! !== f.g2!,
  // 겹사다리: AF:FD = AD:DB 이고 AD = AF+FD ⇒ f1·x = (f1+f2)·f2
  "평행선 사이의 선분의 길이의 비|04": (f) =>
    f.f1! * f.x! === (f.f1! + f.f2!) * f.f2!,
  // 평행 조건: AD·AC = AB·AE
  "평행선 사이의 선분의 길이의 비|05": (f) =>
    f.a! * f.f! === f.c! * f.x! && f.a! < f.c!,
  // 내각 이등분선: AB·CD = AC·BD / 넓이도 같은 비
  "평행선 사이의 선분의 길이의 비|06": (f) =>
    f.mode === 0
      ? f.ab! * f.x! === f.ac! * f.bd!
      : f.ab! * f.x! === f.ac! * f.s! && f.ab! !== f.ac!,
  // 외각 이등분선: AB·CD = AC·BD, BD = BC + CD
  "평행선 사이의 선분의 길이의 비|07": (f) =>
    f.ab! * f.x! === f.ac! * (f.b! + f.x!) && f.ab! > f.ac!,
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다. */
const ANSWER_KEY: Record<string, string> = {
  "삼각형의 성질|01": "x",
  "삼각형의 성질|02": "sum",
  "삼각형의 성질|03": "x",
  "삼각형의 성질|04": "x",
  "삼각형의 성질|05": "x",
  "삼각형의 성질|09": "x",
  "삼각형의 성질|10": "s",
  "삼각형의 성질|11": "x",
  "여러 가지 사각형|13": "x",
  "여러 가지 사각형|14": "x",
  "여러 가지 사각형|15": "x",
  "여러 가지 사각형|16": "x",
  "도형의 닮음|02": "x",
  "도형의 닮음|03": "x",
  "도형의 닮음|04": "area",
  "도형의 닮음|05": "x",
  "도형의 닮음|06": "x",
  "도형의 닮음|07": "x",
  "도형의 닮음|08": "x",
  "평행선 사이의 선분의 길이의 비|01": "x",
  "평행선 사이의 선분의 길이의 비|02": "x",
  "평행선 사이의 선분의 길이의 비|03": "x",
  "평행선 사이의 선분의 길이의 비|04": "x",
  "평행선 사이의 선분의 길이의 비|05": "x",
  "평행선 사이의 선분의 길이의 비|06": "x",
  "평행선 사이의 선분의 길이의 비|07": "x",
  // 닮음 01 은 답이 «대응변·대응각» 이라 수가 없다 — 아래에서 따로 검사한다.
};

/** 그림이 있어야 하는 유형. 나머지는 발문이 그림 없이 완결된다(모듈 주석). */
const FIGURE_KEYS = new Set([
  "삼각형의 성질|01",
  "삼각형의 성질|02",
  "삼각형의 성질|03",
  "삼각형의 성질|05",
  "삼각형의 성질|09",
  "삼각형의 성질|10",
  "삼각형의 성질|11",
  "여러 가지 사각형|13",
  "여러 가지 사각형|14",
  "여러 가지 사각형|15",
  "여러 가지 사각형|16",
  "도형의 닮음|02",
  "도형의 닮음|05",
  "평행선 사이의 선분의 길이의 비|01",
  "평행선 사이의 선분의 길이의 비|02",
  "평행선 사이의 선분의 길이의 비|03",
  "평행선 사이의 선분의 길이의 비|04",
  "평행선 사이의 선분의 길이의 비|05",
  "평행선 사이의 선분의 길이의 비|06",
  "평행선 사이의 선분의 길이의 비|07",
]);

/** 그림이 «있을 수도, 없을 수도» 있는 유형 — mode 가 가른다. */
const FIGURE_BY_MODE: Record<string, (f: Record<string, number>) => boolean> = {
  // 04 는 내각 이등분선 모드(0)만 그림. 외각 이등분선 모드(1)는 v2 로 못 그린다.
  "삼각형의 성질|04": (f) => f.mode === 0,
};

function vkey(e: { rpmMinor: string; rpmType: string }): string {
  return `${e.rpmMinor}|${e.rpmType}`;
}

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** 스펙 JSON 안의 모든 수가 유한한지 — NaN 이 조용히 새는 것을 막는다. */
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
  const labels = (spec.labels ?? {}) as Record<string, string>;
  const out: number[] = [];
  for (const text of Object.values(labels)) {
    const m = /^(\d+(?:\.\d+)?)(?:\s*(?:cm|°))?$/.exec(text.trim());
    if (m) out.push(Number(m[1]));
  }
  return out;
}

describe("중2 기하 27유형 (RPM 2-2)", () => {
  it("네 중단원의 계획된 번호가 전부 등록돼 있다", () => {
    const byMinor = new Map<string, string[]>();
    for (const e of GEO) {
      byMinor.set(e.rpmMinor, [...(byMinor.get(e.rpmMinor) ?? []), e.rpmType]);
    }
    expect(GEO.length).toBe(27);
    expect(byMinor.get("삼각형의 성질")!.sort()).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "09",
      "10",
      "11",
    ]);
    expect(byMinor.get("여러 가지 사각형")!.sort()).toEqual([
      "13",
      "14",
      "15",
      "16",
    ]);
    expect(byMinor.get("도형의 닮음")!.sort()).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
    ]);
    expect(byMinor.get("평행선 사이의 선분의 길이의 비")!.sort()).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
    ]);
  });

  it("2B 대기(마크 문법 필요) 유형은 등록하지 않았다", () => {
    // 직각 기호·같음 tick·평행 표시가 있어야 하는 유형 — 지어내지 않는다.
    const waiting = [
      "삼각형의 성질|06",
      "삼각형의 성질|07",
      "삼각형의 성질|08",
      "삼각형의 성질|12",
      "여러 가지 사각형|01",
      "여러 가지 사각형|09",
      "여러 가지 사각형|17",
      "도형의 닮음|09",
      "도형의 닮음|12",
      "도형의 닮음|15",
      "평행선 사이의 선분의 길이의 비|08",
      "평행선 사이의 선분의 길이의 비|09",
      "평행선 사이의 선분의 길이의 비|11",
    ];
    const registered = new Set(GEO.map(vkey));
    for (const k of waiting) {
      expect(registered.has(k), `${k} 는 2B 대기여야 한다`).toBe(false);
    }
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다 (공유 DB 2026-08-23)", () => {
    const count = new Map<string, number>();
    for (const e of GEO) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    expect(count).toEqual(
      new Map([
        ["이등변삼각형의 성질", 6],
        ["직각삼각형의 합동", 2],
        ["평행선과 삼각형의 넓이", 4],
        ["닮은 도형", 4],
        ["닮은 도형의 넓이의 비와 부피의 비", 4],
        ["삼각형에서 평행선 사이의 선분의 길이의 비", 5],
        ["삼각형의 각의 이등분선", 2],
      ]),
    );
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(GEO.map((e) => [vkey(e), e.rpmTitle]));
    // scripts/rpm/rpm-type-catalog.json 2-2 색인 그대로.
    expect(byKey.get("삼각형의 성질|01")).toBe("이등변삼각형의 성질 ⑴");
    expect(byKey.get("삼각형의 성질|03")).toBe(
      "이등변삼각형의 성질의 응용 이웃한 이등변삼각형",
    );
    expect(byKey.get("삼각형의 성질|11")).toBe(
      "합동인 삼각형을 찾아 각의 크기 구하기",
    );
    expect(byKey.get("여러 가지 사각형|16")).toBe(
      "사다리꼴에서 높이가 같은 두 삼각형의 넓이",
    );
    expect(byKey.get("도형의 닮음|08")).toBe(
      "닮은 두 입체도형의 겉넓이의 비와 부피의 비의 활용",
    );
    expect(byKey.get("평행선 사이의 선분의 길이의 비|01")).toBe(
      "삼각형에서 평행선 사이의 선분의 길이의 비⑴",
    );
    expect(byKey.get("평행선 사이의 선분의 길이의 비|07")).toBe(
      "삼각형의 외각의 이등분선의 성질",
    );
  });

  for (const e of GEO) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[vkey(e)];
        expect(verify, `검산식 누락: ${vkey(e)}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const key = ANSWER_KEY[vkey(e)];
        if (key === undefined) return; // 닮음 01 — 아래 전용 검사
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(firstNumber(p.answer), `${p.answer} vs facts.${key}`).toBe(
            p.facts[key],
          );
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

      it("그림: 있어야 하는 유형에만 있고, 스펙의 수는 전부 유한하다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const byMode = FIGURE_BY_MODE[vkey(e)];
          const want = byMode ? byMode(p.facts) : FIGURE_KEYS.has(vkey(e));
          if (want) {
            expect(p.figureSpec, `${vkey(e)} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe(2);
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
            expect(
              Object.keys(spec.segments as Record<string, unknown>).length,
              "선분이 없는 도형",
            ).toBeGreaterThan(0);
          } else {
            expect(
              p.figureSpec ?? null,
              `${vkey(e)} seed ${seed} 는 그림이 없어야 한다`,
            ).toBe(null);
          }
        }
      });

      it("그림의 숫자 라벨은 전부 facts 에 있는 값이다 (그림 따로 발문 따로 금지)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          if (!p.figureSpec) continue;
          const spec = p.figureSpec as Record<string, unknown>;
          const values = new Set(Object.values(p.facts));
          for (const n of numericLabels(spec)) {
            expect(
              values.has(n),
              `${vkey(e)} seed ${seed}: 그림 라벨 ${n} 이 facts 에 없다 (${JSON.stringify(p.facts)})`,
            ).toBe(true);
          }
        }
      });
    });
  }

  it("닮음 01 의 답은 색인표가 가리키는 대응변·대응각이다", () => {
    const e = GEO.find((x) => vkey(x) === "도형의 닮음|01")!;
    const lhs = ["A", "B", "C"] as const;
    const sidePairs = [
      [0, 1],
      [1, 2],
      [2, 0],
    ] as const;
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      const rhs = SIM01_PERMS[p.facts.perm!]!;
      const [i1, i2] = sidePairs[p.facts.si!]!;
      // 발문이 묻는 것 · 답이 말하는 것을 테스트가 다시 만든다.
      expect(p.content).toContain(`\\triangle ${rhs.join("")}`);
      expect(p.content).toContain(`\\overline{${lhs[i1]}${lhs[i2]}}`);
      expect(p.content).toContain(`\\angle ${lhs[p.facts.ai!]}`);
      expect(p.answer).toBe(
        `$\\overline{${rhs[i1]}${rhs[i2]}}$, $\\angle ${rhs[p.facts.ai!]}$`,
      );
    }
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of GEO) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("변형 공간이 모자라면 조용히 넘기지 않고 던진다", () => {
    // 닮음 01 은 유한 조합(6×3×3=54) — 그보다 큰 요구는 던져야 한다.
    const e = GEO.find((x) => vkey(x) === "도형의 닮음|01")!;
    expect(() => generateMiddleSet(e.key, 1, 200)).toThrow(/변형 공간/);
  });
});
