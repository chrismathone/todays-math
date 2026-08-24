/**
 * 중2 「평행사변형」(RPM 2-2, 01~13, 전량 새 단원) — 독립 검산 + 실렌더.
 *
 * `m2Quad.ts` 의 생성기를 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * 조건식을 **여기서 다시 세워** 만족하는지 본다. 검산식은 「발문이 말하는 성질」을
 * 직접 옮긴 것이고, 생성기가 쓴 식과 같은 형태이더라도 **독립적으로 다시 계산**한다
 * (동어반복 금지).
 *
 * 그림은 존재·모양(version 2 · 유한한 수 · 실제 기하 관계)까지 잠근다 — 실제 렌더
 * 검증은 엔진이 정본이다(09 §0.1). 04·05(이등분선 점 E)·12(이등분선 점 P) 는
 * **좌표가 실제로 그 기하 관계를 만족하는지**까지 잰다(그림이 거짓말하면 걸린다).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M2_QUAD, PARA01_CLAIMS } from "../../lib/middle/m2Quad";
import type { MidProblem } from "../../lib/middle/types";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31337, 5150];

const QUAD = M2_QUAD;

type F = Record<string, number>;
type XY = [number, number];

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

function dist(a: XY, b: XY): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
function sub(a: XY, b: XY): XY {
  return [a[0] - b[0], a[1] - b[1]];
}
function cross(a: XY, b: XY): number {
  return a[0] * b[1] - a[1] * b[0];
}
function near(a: number, b: number, eps = 0.5): boolean {
  return Math.abs(a - b) < eps;
}

/**
 * «평행사변형의 뜻» 명제의 참·거짓 — **테스트가 손으로 다시 세운 표**.
 * 모듈의 `PARA01_CLAIMS` 와 갈리면 아래 「두 표가 같다」 검사가 빨개진다.
 */
const PARA01_TRUTH: readonly boolean[] = [
  true, // 두 쌍의 대변이 각각 평행 → 평행사변형
  true, // 대변의 길이 각각 같다
  true, // 대각의 크기 각각 같다
  false, // 대각선이 수직이등분한다 — 이등분만, 수직은 아니다
  true, // 이웃 내각 합 180
  true, // 한 쌍 평행+길이 같음 → 평행사변형 (조건 5)
  true, // 네 변 길이 같음(마름모) → 평행사변형
  false, // 대각선 길이 같음 — 등변사다리꼴 반례
  true, // 한 대각선이 넓이 이등분
  false, // 한 쌍 대변 길이만 같음 — 평행 없으면 평행사변형 아님(등변사다리꼴 반례)
  true, // 두 쌍 대각 크기 각각 같음 → 평행사변형 (조건 3)
  false, // 평행사변형이 항상 마름모는 아니다
];

const VERIFY: Record<string, (f: F) => boolean> = {
  "02": (f) =>
    f.mode === 0
      ? f.p! * f.x! + f.q! === f.x! + f.s! && f.ans === f.p! * f.x! + f.q!
      : f.peri === 2 * (f.m! * f.k! + f.n! * f.k!) && f.ans === f.m! * f.k!,
  "03": (f) =>
    f.mode === 0
      ? f.p! * f.x! + f.q! === f.x! + f.s! && f.ans === f.x! + f.s!
      : f.p! * f.x! + f.q! + (f.x! + f.s!) === 180 && f.ans === f.x! + f.s!,
  "04": (f) => f.n! > f.m! && f.ans === f.n! - f.m!,
  "05": (f) => {
    const angleA = 180 - f.b!;
    const bae = angleA / 2;
    const aeb = 180 - f.b! - bae;
    return near(bae, aeb, 1e-9) && f.ans === aeb && f.angleA === angleA;
  },
  "06": (f) => f.P === f.s! + f.T! && f.ans === 2 * f.T!,
  "07": (f) => f.p! * f.x! + f.q! === f.x! + f.s! && f.ans === f.x!,
  "08": (f) => f.p! * f.x! + f.q! === f.x! + f.s! && f.ans === f.x!,
  "09": (f) => {
    const ok = f.p! * f.x! + f.q! === f.x! + f.s!;
    const AO = f.p! * f.x! + f.q!;
    return ok && f.AO === AO && f.AC === 2 * AO && f.ans === 2 * AO;
  },
  "10": (f) => {
    if (f.branch === 0) return f.ans === f.S! / 2;
    if (f.branch === 1) return f.ans === 2 * f.U!;
    return f.ans === f.S! / 4;
  },
  "11": (f) =>
    f.branch === 0 ? f.ans === 2 * (f.u! + f.v!) : f.ans === f.S! / 2 - f.u!,
  "12": (f) => {
    if (f.mode === 0) {
      const AD = f.p! * f.x! + f.q!;
      const CD = 2 * AD;
      return f.x! + f.s! === CD && f.AD === AD && f.CD === CD && f.ans === CD;
    }
    return f.ans === 2 * f.r!;
  },
  "13": (f) => f.P === f.s! + f.T! && f.ans === 2 * f.T!,
};

/** `facts` 의 답 필드 이름 — 01 은 `x`, 나머지는 전부 `ans`. */
const ANSWER_KEY: Record<string, string> = {
  "01": "x",
  "02": "ans",
  "03": "ans",
  "04": "ans",
  "05": "ans",
  "06": "ans",
  "07": "ans",
  "08": "ans",
  "09": "ans",
  "10": "ans",
  "11": "ans",
  "12": "ans",
  "13": "ans",
};

/** 그림이 있어야 하는 유형 — 01(명제 나열)만 그림이 없다. */
const FIGURE_KEYS = new Set(
  Array.from({ length: 12 }, (_, i) => String(i + 2).padStart(2, "0")),
);

describe("중2 「평행사변형」 13유형 (RPM 2-2)", () => {
  it("13유형이 모두 등록돼 있다 (01~13)", () => {
    const nums = QUAD.map((e) => e.rpmType).sort();
    expect(nums).toEqual(
      Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("등록된 rpmMinor 는 「평행사변형」 하나뿐이고 책은 2-2 다", () => {
    for (const e of QUAD) {
      expect(e.rpmMinor).toBe("평행사변형");
      expect(e.rpmBook).toBe("2-2");
      expect(e.grade).toBe("중2");
    }
  });

  it("Unit.section 이 확정 값과 일치한다 (성질 9 · 조건 4)", () => {
    const bySection = new Map<string, number>();
    for (const e of QUAD) {
      bySection.set(e.unitSection, (bySection.get(e.unitSection) ?? 0) + 1);
    }
    expect(bySection).toEqual(
      new Map([
        ["평행사변형의 성질", 9],
        ["평행사변형이 되는 조건", 4],
      ]),
    );
    const condTypes = QUAD.filter(
      (e) => e.unitSection === "평행사변형이 되는 조건",
    )
      .map((e) => e.rpmType)
      .sort();
    expect(condTypes).toEqual(["07", "08", "09", "13"]);
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(QUAD.map((e) => [e.rpmType, e.rpmTitle]));
    expect(byKey.get("01")).toBe("평행사변형의 뜻");
    expect(byKey.get("04")).toBe("평행사변형의 성질의 응용 대변의 길이");
    expect(byKey.get("08")).toBe("평행사변형이 되는 조건 ⑵");
    expect(byKey.get("12")).toBe(
      "평행사변형의 성질의 응용 두 내각의 이등분선이 주어진 경우",
    );
    expect(byKey.get("13")).toBe("평행사변형이 되는 조건의 응용 ⑵");
  });

  it("키가 전역에서 겹치지 않는다 (registeredTypes 안에서)", () => {
    const keys = registeredTypes().map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("01 명제 표는 모듈과 테스트가 따로 들고 같은 값이어야 한다", () => {
    expect(PARA01_CLAIMS.length).toBe(PARA01_TRUTH.length);
    PARA01_CLAIMS.forEach(([text, ok], i) => {
      expect(ok, `명제 ${i}: ${text}`).toBe(PARA01_TRUTH[i]);
    });
  });

  for (const e of QUAD) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260824)).toEqual(
          generateMiddleProblem(e.key, 20260824),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        if (e.rpmType === "01") return; // 명제 표는 별도 검사
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
        const key = ANSWER_KEY[e.rpmType]!;
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            firstNumber(p.answer),
            `${p.answer} vs ${JSON.stringify(p.facts)}`,
          ).toBe(p.facts[key]);
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
          const want = FIGURE_KEYS.has(e.rpmType);
          if (want) {
            expect(p.figureSpec, `${e.rpmType} 그림 누락`).toBeTruthy();
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
              `${e.rpmType} seed ${seed} 는 그림이 없어야 한다`,
            ).toBe(null);
          }
        }
      });

      it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
        const set = generateMiddleSet(e.key, 20260824, 4);
        expect(new Set(set.map((p: MidProblem) => p.content)).size).toBe(4);
      });
    });
  }

  it("그림 좌표: 04·05 — 점 E 는 실제로 변 BC 위(선분 위)에 있다", () => {
    for (const t of ["04", "05"]) {
      const e = QUAD.find((x) => x.rpmType === t)!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const pts = (p.figureSpec as Record<string, unknown>).points as Record<
          string,
          XY
        >;
        const { B, C, E } = pts;
        expect(near(dist(B!, E!) + dist(E!, C!), dist(B!, C!))).toBe(true);
      }
    }
  });

  it("그림 좌표: 12 — 점 P 는 실제로 변 CD 의 중점이다", () => {
    const e = QUAD.find((x) => x.rpmType === "12")!;
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      const pts = (p.figureSpec as Record<string, unknown>).points as Record<
        string,
        XY
      >;
      const { D, C, P } = pts;
      expect(near(dist(D!, P!), dist(P!, C!))).toBe(true);
      expect(near(dist(D!, P!) + dist(P!, C!), dist(D!, C!))).toBe(true);
    }
  });

  it("그림 좌표: 02·03·06·09·10·13 — ABCD 는 실제 평행사변형이다 (AB∥DC, AD∥BC)", () => {
    for (const t of ["02", "03", "06", "09", "10", "13"]) {
      const e = QUAD.find((x) => x.rpmType === t)!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const pts = (p.figureSpec as Record<string, unknown>).points as Record<
          string,
          XY
        >;
        const { A, B, C, D } = pts;
        expect(near(cross(sub(A!, B!), sub(D!, C!)), 0, 0.6)).toBe(true);
        expect(near(cross(sub(A!, D!), sub(B!, C!)), 0, 0.6)).toBe(true);
      }
    }
  });

  it("그림 좌표: 11 — 점 P 는 실제로 사각형 ABCD 내부에 있다", () => {
    const e = QUAD.find((x) => x.rpmType === "11")!;
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      const pts = (p.figureSpec as Record<string, unknown>).points as Record<
        string,
        XY
      >;
      const { A, B, C, D, P } = pts;
      const cx = (A![0] + B![0] + C![0] + D![0]) / 4;
      const cy = (A![1] + B![1] + C![1] + D![1]) / 4;
      const edges: [XY, XY][] = [
        [A!, B!],
        [B!, C!],
        [C!, D!],
        [D!, A!],
      ];
      for (const [p1, p2] of edges) {
        const edgeVec = sub(p2, p1);
        const sideP = cross(edgeVec, sub(P!, p1));
        const sideC = cross(edgeVec, sub([cx, cy] as XY, p1));
        expect(sideP * sideC).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("변형 공간이 극단으로 좁아도 4문항 정도는 던지지 않고 낸다 (회귀 방지)", () => {
    // 01(명제 조합)이 가장 좁은 편이다 — 그래도 4개는 나와야 한다.
    const e = QUAD.find((x) => x.rpmType === "01")!;
    expect(() => generateMiddleSet(e.key, 1, 4)).not.toThrow();
  });
});

describe.skipIf(!hasEngine)(
  "중2 「평행사변형」 — 그림이 실제로 그려진다",
  () => {
    // 「스펙이 그럴듯하다」와 「엔진이 그린다」는 다른 질문이다 — 실제로 태운다.
    for (const e of QUAD) {
      if (!FIGURE_KEYS.has(e.rpmType)) continue;
      it(`${e.rpmType} ${e.rpmTitle}`, async () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const r = await renderFigureSpec(p.figureSpec!);
          expect(
            r.ok,
            `${e.key} seed ${seed}: ${r.ok ? "" : r.error} ${JSON.stringify(p.figureSpec)}`,
          ).toBe(true);
        }
      });
    }
  },
);
