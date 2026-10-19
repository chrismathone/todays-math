/**
 * 중3 「원의 성질」 16유형 — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * 조건식을 **여기서 다시 세워** 만족하는지 본다. 검산식은 「발문이 말하는
 * 조건」을 직접 옮긴 것이다(본보기 middleLinearApply.test.ts 와 같은 계약).
 *
 * 그림 유형은 figureSpec 의 존재·모양(version 2·원 c·유한한 수)까지 잠근다 —
 * 실제 렌더 검증은 CLI(엔진이 정본)가 한다.
 */
import { describe, expect, it } from "vitest";

import { extensionNumberReason, isCatalogType } from "../helpers/rpmCatalog";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** 유형별 독립 검산 — 키는 전체 유형 키(두 중단원에 같은 번호가 있다). */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 피타고라스: d² + h² == r², 현 == 2h
  "3-2|원과 직선|01": (f) =>
    f.d! * f.d! + f.h! * f.h! === f.r! * f.r! && f.ab! === 2 * f.h!,
  "3-2|원과 직선|02": (f) =>
    f.d! * f.d! + f.h! * f.h! === f.r! * f.r! && f.ab! === 2 * f.h!,
  // 활꼴: r² == h² + (r-c)², 현 == 2h, 0 < c < r
  "3-2|원과 직선|03": (f) =>
    f.r! * f.r! === f.h! * f.h! + (f.r! - f.c!) * (f.r! - f.c!) &&
    f.ab! === 2 * f.h! &&
    f.c! > 0 &&
    f.c! < f.r!,
  // 접힌 원: OM == r/2, (AB/2)² + OM² == r²  ⇔  3·coef² + 4·om² == 4r²
  "3-2|원과 직선|04": (f) =>
    2 * f.om! === f.r! &&
    3 * f.coef! * f.coef! + 4 * f.om! * f.om! === 4 * f.r! * f.r!,
  // 등거리 두 현: d² + h² == r², CD == 2h
  "3-2|원과 직선|05": (f) =>
    f.d! * f.d! + f.h! * f.h! === f.r! * f.r! && f.cd! === 2 * f.h!,
  // 이등변: ∠A + 2∠B == 180
  "3-2|원과 직선|06": (f) =>
    f.a! + 2 * f.b! === 180 && f.a! > 0 && f.b! > 0 &&
    f.x === (f.mode === 1 ? f.a : f.b),
  // 중심각 == 2×원주각, 답은 mode 가 가리키는 쪽
  "3-2|원주각|01": (f) =>
    f.c! === 2 * f.a! && f.x! === (f.mode === 0 ? f.a! : f.c!),
  // 짧은 호 위의 P: 2×∠APB + ∠AOB == 360
  "3-2|원주각|02": (f) => 2 * f.x! + f.c! === 360 && f.c! < 180,
  // 두 접선: ∠P + ∠AOB == 180, ∠ACB == ∠AOB/2
  "3-2|원주각|03": (f) => f.p! + f.aob! === 180 && 2 * f.x! === f.aob!,
  // 외각: ∠ABD + ∠BDC == ∠BPC
  "3-2|원주각|04": (f) => f.a! + f.x! === f.p! && f.a! > 0 && f.x! > 0,
  // 반원: ∠A + ∠B == 90
  "3-2|원주각|05": (f) => f.a! + f.x! === 90 && f.a! > 0 && f.x! > 0,
  // sin A == BC/2r 기약분수: num·2r == den·BC, 기약, sin < 1
  "3-2|원주각|06": (f) =>
    f.num! * 2 * f.r! === f.den! * f.bc! &&
    gcd(f.num!, f.den!) === 1 &&
    f.bc! < 2 * f.r!,
  // 원주각 ∝ 호: a·n == x·m
  "3-2|원주각|07": (f) =>
    f.a! * f.n! === f.x! * f.m! && f.m! !== f.n! && f.a! < 90 && f.x! < 90,
  // 호의 비 p:q:r 에서 묻는 각 == 180×(그 각의 호)/(p+q+r)
  "3-2|원주각|08": (f) => {
    const arc = [f.q!, f.r!, f.p!][f.target!];
    return arc !== undefined && f.x! * (f.p! + f.q! + f.r!) === 180 * arc;
  },
  // 원주의 1/m·1/n: x·m·n == 180(m+n)
  "3-2|원주각|09": (f) =>
    f.x! * f.m! * f.n! === 180 * (f.m! + f.n!) && f.m! !== f.n!,
  // 지름 + 외각: x == 90 + a
  "3-2|원주각|10": (f) => f.x! === 90 + f.a! && f.a! > 0 && f.a! < 90,
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다. */
const ANSWER_KEY: Record<string, string> = {
  "3-2|원과 직선|01": "ab",
  "3-2|원과 직선|02": "r",
  "3-2|원과 직선|03": "r",
  "3-2|원과 직선|04": "coef",
  "3-2|원과 직선|05": "cd",
  "3-2|원과 직선|06": "x",
  "3-2|원주각|01": "x",
  "3-2|원주각|02": "x",
  "3-2|원주각|03": "x",
  "3-2|원주각|04": "x",
  "3-2|원주각|05": "x",
  "3-2|원주각|06": "num",
  "3-2|원주각|07": "x",
  "3-2|원주각|08": "x",
  "3-2|원주각|09": "x",
  "3-2|원주각|10": "x",
};

/** 그림이 있어야 하는 유형 — 나머지는 발문이 그림 없이 완결된다(모듈 주석 참고). */
const FIGURE_KEYS = new Set([
  "3-2|원과 직선|01",
  "3-2|원과 직선|02",
  "3-2|원과 직선|03",
  "3-2|원과 직선|05",
  "3-2|원과 직선|06",
  "3-2|원주각|01",
  "3-2|원주각|02",
  "3-2|원주각|03",
  "3-2|원주각|04",
  "3-2|원주각|05",
  "3-2|원주각|06",
  "3-2|원주각|10",
]);

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** 스펙 JSON 안의 모든 수가 유한한지 — asin/acos 정의역 이탈이 NaN 으로 새는 것을 막는다. */
function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/**
 * 이 파일의 분모 — «원과 직선 01~06» + «원주각 01~10» 열여섯.
 *
 * ⚠️ 「책·학년으로 거르고 남의 단원 이름을 하나씩 뺀다」로 짜면 **3-2 에 유형이
 * 더 등록될 때마다 조용히 쓸려 들어온다.** 2026-08-23 물결 3E 가 「삼각비」
 * 32유형을 3-2 에 등록하자 이 파일의 분모가 16 → 48 이 되어 85건이 빨개졌다
 * (middle-engine-wave3-plan.md §9 가 예고한 그 자리). 그래서 «빼는» 쪽이 아니라
 * **이 파일이 지키는 중단원 둘을 이름으로 못 박는** 쪽으로 뒤집는다.
 */
const OWN_MINORS = new Set(["원과 직선", "원주각"]);
/**
 * 이 시험이 맡은 몫 — **RPM 색인 유형만.**
 *
 * 🔴 2026-08-27 부터 갈래 넷이 130소단원을 10유형으로 올리며 이 중단원에도 색인
 *    밖 확장 유형을 더한다(갈래 A 가 `17A`·`18A` 꼴). 색인으로 안 좁히면 손으로
 *    적은 검산표·답 키에 **남의 유형이 들이대져** 「검산식 누락」으로 빨개진다.
 *    확장 유형의 값 검산은 그 갈래의 전용 시험이 한다.
 */
const ownEntries = (): ReturnType<typeof registeredTypes> =>
  registeredTypes().filter(
    (e) =>
      e.rpmBook === "3-2" &&
      e.grade === "중3" &&
      OWN_MINORS.has(e.rpmMinor) &&
      e.unitSection !== "원의 접선" &&
      isCatalogType(e),
  );

/** 좁힌 만큼의 뒷받침 — 확장 유형이 조용히 사라지지 않는다. */
const extEntries = (): ReturnType<typeof registeredTypes> =>
  registeredTypes().filter(
    (e) =>
      e.rpmBook === "3-2" &&
      e.grade === "중3" &&
      OWN_MINORS.has(e.rpmMinor) &&
      e.unitSection !== "원의 접선" &&
      !isCatalogType(e),
  );

describe("중3 원의 성질 16유형", () => {
  // «원의 접선»(원과 직선 07~16, m3Tangent.ts)은 2차 물결 세션 소유 —
  // middleM3Tangent.test.ts 가 따로 검산한다.
  const entries = ownEntries();
  const lineEntries = entries.filter((e) => e.rpmMinor === "원과 직선");
  const angleEntries = entries.filter((e) => e.rpmMinor === "원주각");

  it("원과 직선 6유형(01~06) + 원주각 10유형(01~10)이 등록돼 있다", () => {
    expect(entries.length).toBe(16);
    expect(lineEntries.map((e) => e.rpmType).sort()).toEqual(
      Array.from({ length: 6 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(angleEntries.map((e) => e.rpmType).sort()).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다 (2026-08-23)", () => {
    // 「원과 현」·「원주각」 — prisma/seed-data/units.ts 484·486, 공유 DB 대조 완료.
    expect(new Set(lineEntries.map((e) => e.unitSection))).toEqual(
      new Set(["원과 현"]),
    );
    expect(new Set(angleEntries.map((e) => e.unitSection))).toEqual(
      new Set(["원주각"]),
    );
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(entries.map((e) => [e.key, e.rpmTitle]));
    // scripts/rpm/rpm-type-catalog.json 3-2 색인 그대로.
    expect(byKey.get("3-2|원과 직선|01")).toBe("현의 수직이등분선⑴");
    expect(byKey.get("3-2|원과 직선|04")).toBe(
      "현의 수직이등분선 원이 접힌 경우",
    );
    expect(byKey.get("3-2|원주각|01")).toBe("원주각과 중심각의 크기 ⑴");
    expect(byKey.get("3-2|원주각|10")).toBe("반원에 대한 원주각의 크기의 응용");
  });

  for (const e of ownEntries()) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const key = ANSWER_KEY[e.key];
        expect(key, `답 키 누락: ${e.key}`).toBeDefined();
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

      it("그림: 있어야 하는 유형에만 있고, 스펙의 수는 전부 유한하다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          if (FIGURE_KEYS.has(e.key)) {
            expect(p.figureSpec, `${e.key} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe(2);
            expect(
              (spec.circles as Record<string, unknown>).c,
              "원 c 누락",
            ).toBeDefined();
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
          } else {
            expect(p.figureSpec ?? null, `${e.key} 는 그림이 없어야 한다`).toBe(
              null,
            );
          }
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

describe("확장 유형 — 등록은 살아 있다", () => {
  it("색인 밖 유형의 번호가 RPM 번호와 영영 안 겹친다", () => {
    const ext = extEntries();
    expect(ext.length, "확장 유형이 통째로 사라졌다").toBeGreaterThan(0);
    const bad = ext
      .map((e) => {
        const why = extensionNumberReason(e);
        return why === null ? null : `${e.key}: ${why}`;
      })
      .filter((x): x is string => x !== null);
    expect(bad).toEqual([]);
  });
});
