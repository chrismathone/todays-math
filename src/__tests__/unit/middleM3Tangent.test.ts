/**
 * 중3 「원의 접선」 10유형 (3-2 원과 직선 07~16) — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형×모드마다
 * 조건식을 **여기서 다시 세워** 만족하는지 본다. 검산식은 「발문이 말하는
 * 조건」을 직접 옮긴 것이다 (본보기 middleM3.test.ts 와 같은 계약).
 *
 * 이 세션의 목적은 유형당 **변형 폭**이므로, 모드(묻는 값 갈래)가 실제로
 * 여러 갈래 나오는지도 잠근다. 그림은 10유형 전부 있어야 하고(스펙 존재·
 * version 2·원 c·유한한 수), 실렌더 검증은 CLI(엔진이 정본)가 한다 —
 * 2026-08-23 실렌더 스캔 400/400 통과.
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31415];

type F = Record<string, number>;

/**
 * 유형×모드 독립 검산. 각 식은 발문의 조건(피타고라스·접선 길이 상등·
 * 외접 사각형의 대변 합)을 테스트 쪽에서 다시 세운 것이다.
 */
const VERIFY: Record<string, (f: F) => boolean> = {
  // 접선⊥반지름: pa²+r²=po². 모드 3 은 30° → po=2r.
  "3-2|원과 직선|07": (f) => {
    if (f.mode === 3) return f.po! === 2 * f.r! && f.x! === f.po!;
    return (
      f.pa! * f.pa! + f.r! * f.r! === f.po! * f.po! &&
      f.x! === [f.pa!, f.r!, f.po!][f.mode!]
    );
  },
  // 동심원: h²+rs²=rb², AB=2h. 모드 3 답은 πk 의 k=h².
  "3-2|원과 직선|08": (f) =>
    f.h! * f.h! + f.rs! * f.rs! === f.rb! * f.rb! &&
    f.ab! === 2 * f.h! &&
    f.x! === [f.ab!, f.rs!, f.rb!, f.h! * f.h!][f.mode!],
  // 두 접선: ∠APB+∠AOB=180 · PA=PB · 60°→정삼각형 · 120°→AB=r√3(계수 r).
  "3-2|원과 직선|09": (f) => {
    if (f.mode === 0) return f.p! + f.x! === 180;
    if (f.mode === 1) return f.p! + 2 * f.x! === 180;
    if (f.mode === 2) return f.x! === f.l!;
    if (f.mode === 3) return f.p! === 60 && f.x! === f.l!;
    return f.aob! === 120 && f.x! === f.r!;
  },
  // 둘레 = AD+AE = 2AD. 모드 3: OE⊥AE 피타고라스. 모드 4: 60°→2r√3(계수 2r).
  "3-2|원과 직선|10": (f) => {
    if (f.mode === 0) return 2 * f.x! === f.ab! + f.ac! + f.bc!;
    if (f.mode === 1) return f.x! === f.ab! + f.bc! - f.ad!;
    if (f.mode === 2) return f.x! === 2 * f.ad! - f.ab! - f.ac!;
    if (f.mode === 3) {
      return (
        f.r! * f.r! + f.ae! * f.ae! === f.oa! * f.oa! && f.x! === 2 * f.ae!
      );
    }
    return f.x! === 2 * f.r!;
  },
  // 반원: CD=AD+BC, AB=2√(AD·BC) ⇔ r²=a·b.
  "3-2|원과 직선|11": (f) => {
    if (f.r! * f.r! !== f.a! * f.b!) return false;
    if (f.mode === 0) return f.x! === 2 * f.r!;
    if (f.mode === 1) return f.x! === 2 * f.r! + 2 * (f.a! + f.b!);
    if (f.mode === 2) return f.x! === (f.a! + f.b!) * f.r!;
    if (f.mode === 3) return f.x! * f.a! === f.r! * f.r!;
    return 2 * f.x! === (f.a! + f.b!) * f.r!;
  },
  // 내접원 접선 길이: AD=AF, BD=BE, CE=CF.
  "3-2|원과 직선|12": (f) => {
    if (f.mode === 0) {
      const v = [
        f.ab! + f.ca! - f.bc!,
        f.ab! + f.bc! - f.ca!,
        f.bc! + f.ca! - f.ab!,
      ][f.target!];
      return v !== undefined && 2 * f.x! === v;
    }
    if (f.mode === 1) return f.x! === f.ab! + f.ca! - 2 * f.af!;
    if (f.mode === 2) return 2 * (f.x! + f.be! + f.cf!) === f.per!;
    return f.x! === 2 * (f.bc! - f.ab! + f.af!);
  },
  // 직각삼각형 내접원: r=(합−빗변)/2. 모드 1: (r+y)²+(r+z)²=(y+z)².
  "3-2|원과 직선|13": (f) => {
    if (f.mode === 1) {
      return (
        f.r! * f.r! + f.r! * (f.y! + f.z!) - f.y! * f.z! === 0 &&
        f.x! === f.r! * f.r!
      );
    }
    if (f.g1! * f.g1! + f.g2! * f.g2! !== f.hyp! * f.hyp!) return false;
    if (f.mode === 0) return 2 * f.x! === f.g1! + f.g2! - f.hyp!;
    if (f.mode === 2) {
      return 2 * f.r! === f.g1! + f.g2! - f.hyp! && 2 * f.x! === f.g1! * f.g2!;
    }
    return 2 * f.x! === f.g2! - f.g1! + f.hyp!;
  },
  // 외접 사각형: AB+CD=AD+BC.
  "3-2|원과 직선|14": (f) => {
    if (f.mode === 0) return f.x! === f.ab! + f.cd! - f.bc!;
    if (f.mode === 1) return f.p! + (f.x! + f.m!) === 2 * f.x! - f.n! + f.q!;
    if (f.mode === 2) return 2 * f.x! === f.a! + f.b!;
    if (f.mode === 3) return 2 * (f.ab! + f.x!) === f.per!;
    return f.x! * f.rn! === f.cd! * f.rm! && f.x! + f.cd! === f.ad! + f.bc!;
  },
  // ∠C=90 외접 사각형: CF=CG=r, 접선 길이 상등.
  //
  // ⚠️ 값이 맞는 것만으로는 모자란다 — **그런 사각형이 실제로 있어야** 한다.
  // 꼭짓점 네 중심각의 합이 360°이므로 `Σ arctan(t_i/r)=180°`이고 tC=r 이라
  // ψ_C=45°다. 그래서 ψ_A+ψ_B+ψ_D=135° 를 만족하는 tD>0 이 있어야 한다
  // (2026-08-23: r 을 세 변과 함께 주면 과잉결정이라 Σψ=188.3° 인 문항이 났다).
  "3-2|원과 직선|15": (f) => {
    if (f.mode === 2) {
      // r 을 안 주는 갈래 — 세 변에서 r 이 유일하게 정해지면 존재한다.
      if (f.x! !== f.ab! + f.cd! - f.bc!) return false;
      const g = (r: number): number =>
        Math.atan((f.ab! - f.bc! + r) / r) +
        Math.atan((f.bc! - r) / r) +
        Math.PI / 4 +
        Math.atan((f.cd! - r) / r) -
        Math.PI;
      const hi = Math.min(f.bc!, f.cd!) - 1e-9;
      return g(1e-9) > 0 && g(hi) < 0;
    }
    const psi = (t: number): number => Math.atan(t / f.r!);
    if (psi(f.tA!) + psi(f.tB!) >= (135 * Math.PI) / 180) return false;
    if (f.mode === 0) {
      return f.tB! === f.bc! - f.r! && f.x! === f.ab! - f.bc! + f.r!;
    }
    return f.tB! === f.cd! - f.r! && f.x! === f.ad! - f.cd! + f.r!;
  },
  // 직사각형+접선 DE: t²+w²=d², 사각형 ABED 외접 ⇒ w+d = 2L−t.
  "3-2|원과 직선|16": (f) => {
    if (f.mode === 3) {
      const s = 2 * f.r! + f.cd!;
      return (
        f.tD! * f.tC! === f.r! * f.r! &&
        f.cd! === f.tD! + f.tC! &&
        (f.sub === 0 ? f.x! === s * f.r! : f.x! === 2 * s)
      );
    }
    if (f.t! * f.t! + f.w! * f.w! !== f.d! * f.d!) return false;
    if (2 * f.L! !== f.w! + f.t! + f.d!) return false;
    if (f.mode === 0) return f.x! === f.L!;
    if (f.mode === 1) return 2 * f.x! === f.d! - f.t!;
    if (f.mode === 2) return f.x! === 2 * f.L!;
    return f.x! === f.L! - f.t!;
  },
};

/** RPM 색인의 실제 제목 (scripts/rpm/rpm-type-catalog.json 3-2 그대로). */
const TITLES: Record<string, string> = {
  "3-2|원과 직선|07": "원의 접선과 반지름",
  "3-2|원과 직선|08": "원의 접선과 반지름 중심이 같은 원이 주어진 경우",
  "3-2|원과 직선|09": "원의 접선의 성질",
  "3-2|원과 직선|10": "원의 접선의 성질의 응용",
  "3-2|원과 직선|11": "반원에서의 접선",
  "3-2|원과 직선|12": "삼각형의 내접원",
  "3-2|원과 직선|13": "직각삼각형의 내접원",
  "3-2|원과 직선|14": "원에 외접하는 사각형의 성질⑴",
  "3-2|원과 직선|15": "원에 외접하는 사각형의 성질⑵",
  "3-2|원과 직선|16": "원에 외접하는 사각형의 응용",
};

/** 유형별 모드 가짓수 — 변형 폭의 하한을 잠근다. */
const MODE_COUNT: Record<string, number> = {
  "3-2|원과 직선|07": 4,
  "3-2|원과 직선|08": 4,
  "3-2|원과 직선|09": 5,
  "3-2|원과 직선|10": 5,
  "3-2|원과 직선|11": 5,
  "3-2|원과 직선|12": 4,
  "3-2|원과 직선|13": 4,
  "3-2|원과 직선|14": 5,
  "3-2|원과 직선|15": 3,
  "3-2|원과 직선|16": 5,
};

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** 스펙 JSON 안의 모든 수가 유한한지 — 기하 계산이 NaN 으로 새는 것을 막는다. */
function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

describe("중3 원의 접선 10유형 (원과 직선 07~16)", () => {
  const entries = registeredTypes().filter(
    (e) => e.rpmBook === "3-2" && e.unitSection === "원의 접선",
  );

  it("원과 직선 07~16 10유형이 등록돼 있다", () => {
    expect(entries.length).toBe(10);
    expect(entries.map((e) => e.rpmType).sort()).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i + 7).padStart(2, "0")),
    );
    expect(new Set(entries.map((e) => e.rpmMinor))).toEqual(
      new Set(["원과 직선"]),
    );
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다 (2026-08-23)", () => {
    // 「원의 접선」 — prisma/seed-data/units.ts 6. 원의 성질(orderIndex 485).
    expect(new Set(entries.map((e) => e.unitSection))).toEqual(
      new Set(["원의 접선"]),
    );
  });

  it("RPM 색인의 실제 제목을 쓴다 (10유형 전량 리터럴 대조)", () => {
    for (const e of entries) {
      expect(e.rpmTitle, e.key).toBe(TITLES[e.key]);
    }
  });

  for (const e of registeredTypes().filter(
    (x) => x.rpmBook === "3-2" && x.unitSection === "원의 접선",
  )) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          for (let v = 0; v < 8; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              verify!(p.facts),
              `seed ${seed} v${v} 검산 실패: ${JSON.stringify(p.facts)}`,
            ).toBe(true);
          }
        }
      });

      it("답의 첫 수가 facts.x 와 일치한다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(firstNumber(p.answer), `답 ${p.answer} vs facts.x`).toBe(
            p.facts.x,
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

      it("그림이 항상 있고 스펙의 수는 전부 유한하다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(p.figureSpec, `${e.key} 그림 누락`).toBeTruthy();
          const spec = p.figureSpec as Record<string, unknown>;
          expect(spec.version).toBe(2);
          expect(
            (spec.circles as Record<string, unknown>).c,
            "원 c 누락",
          ).toBeDefined();
          expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
        }
      });

      it("변형 폭 — 30변형에서 모드 전 갈래가 나오고 발문이 12종 이상", () => {
        const modes = new Set<number>();
        const contents = new Set<string>();
        for (let v = 0; v < 30; v += 1) {
          const p = generateMiddleProblem(e.key, 20260823, v);
          modes.add(p.facts.mode!);
          contents.add(p.content);
        }
        expect(modes.size, `${e.key} 모드 갈래`).toBe(MODE_COUNT[e.key]);
        expect(contents.size, `${e.key} 발문 다양성`).toBeGreaterThanOrEqual(
          12,
        );
      });
    });
  }

  /**
   * 유형 15 는 「값은 맞는데 그런 사각형은 없는」 문항이 나기 쉽다(과잉결정).
   * 그 위반율은 **0.1% 수준**이라 위의 씨앗 6개·변형 8개로는 구조적으로 못 본다
   * — 실제로 존재 가드를 지우는 변이가 그 검사에서 **초록**이었다(2026-08-23).
   * 그래서 이 유형만 씨앗을 넓혀 전량 검산한다.
   */
  it("15: 넓은 씨앗(500×12)에서도 «그런 사각형이 있다»가 전부 참", () => {
    const key = "3-2|원과 직선|15";
    const verify = VERIFY[key]!;
    let checked = 0;
    for (let seed = 0; seed < 500; seed += 1) {
      for (let v = 0; v < 12; v += 1) {
        const p = generateMiddleProblem(key, seed * 977 + 13, v);
        checked += 1;
        expect(
          verify(p.facts),
          `seed ${seed} v${v} 존재성 실패: ${JSON.stringify(p.facts)}`,
        ).toBe(true);
      }
    }
    expect(checked).toBe(6000);
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });
});
