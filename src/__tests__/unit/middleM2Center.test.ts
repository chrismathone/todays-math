/**
 * 중2 「도형의 성질」 — RPM 2-2 «삼각형의 외심과 내심»(13) + «삼각형의 무게중심»(15)
 * = 28유형. 물결 6D. 독립 검산.
 *
 * `facts`(발문의 원 수치)로 유형마다 조건식을 **여기서 다시 세워** 만족하는지 본다.
 * 외심/내심 각도 유형은 원 위에 세 점을 좌표로 다시 배치해 벡터각(atan2)으로
 * 재계산하고, 무게중심 길이/넓이 유형은 곱셈꼴로 재배열한 항등식으로 검산한다 —
 * 생성기(m2Center.ts)는 나눗셈·역산 형태를 쓰므로 형태가 다르다(동어반복 금지).
 */
import { describe, expect, it } from "vitest";

import { isCatalogType } from "../helpers/rpmCatalog";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M2_TYPES } from "../../lib/middle/m2";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991];

const MINOR_CIRC = "삼각형의 외심과 내심";
const MINOR_CENTROID = "삼각형의 무게중심";

const CIRC = M2_TYPES.filter(
  (e) => e.rpmBook === "2-2" && e.rpmMinor === MINOR_CIRC && isCatalogType(e),
);
const CENTROID = M2_TYPES.filter(
  (e) =>
    e.rpmBook === "2-2" && e.rpmMinor === MINOR_CENTROID && isCatalogType(e),
);
// ⚠️ 몫을 **RPM 색인 유형**으로 좁힌다. 갈래들이 같은 모듈에 색인에 없는
//    «확장 유형»을 더하는데, 그것까지 쓸어 담으면 남의 유형이 이 파일의
//    검산표에 들이대진다(2026-08-27 실측 89건). 확장의 값 검산은 그것을 지은
//    갈래의 시험이 들고 있다.
const ALL = [...CIRC, ...CENTROID];

type P2 = readonly [number, number];

function dist(a: P2, b: P2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function near(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/** 벡터 vertex→p1, vertex→p2 사이의 각(0~180, atan2 기반) — 생성기의 각-체이스 공식과 무관한 좌표 재구성. */
function vecAngle(vertex: P2, p1: P2, p2: P2): number {
  const v1x = p1[0] - vertex[0];
  const v1y = p1[1] - vertex[1];
  const v2x = p2[0] - vertex[0];
  const v2y = p2[1] - vertex[1];
  const dot = v1x * v2x + v1y * v2y;
  const det = v1x * v2y - v1y * v2x;
  return (Math.atan2(Math.abs(det), dot) * 180) / Math.PI;
}

// ── 외심 좌표 재구성 (m2Center.ts 의 circumPts 와 독립적으로 다시 짠다) ──
const O_CX = 120;
const O_CY = 95;
const O_R = 70;

function polar(thetaDeg: number): P2 {
  const t = (thetaDeg * Math.PI) / 180;
  return [O_CX + O_R * Math.cos(t), O_CY - O_R * Math.sin(t)];
}

function circumPts(
  angA: number,
  angB: number,
  angC: number,
): { A: P2; B: P2; C: P2; O: P2 } {
  const thetaA = 90;
  const thetaB = thetaA + 2 * angC;
  const thetaC = thetaB + 2 * angA;
  return {
    A: polar(thetaA),
    B: polar(thetaB),
    C: polar(thetaC),
    O: [O_CX, O_CY],
  };
}

/** 무게중심 좌표 재구성 (11·15 유형의 좌표 기반 항등식에 쓴다). */
function triMedian(
  w: number,
  h: number,
): { A: P2; B: P2; C: P2; D: P2; G: P2 } {
  const A: P2 = [0, h];
  const B: P2 = [-w, 0];
  const C: P2 = [w, 0];
  const D: P2 = [0, 0];
  const G: P2 = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  return { A, B, C, D, G };
}

/**
 * 유형별 독립 검산 — 키는 `중단원|번호`. 각 식은 발문이 말하는 성질을 생성기와
 * **다른 형태**로 다시 세운 것이다(외심/내심은 좌표, 무게중심은 곱셈꼴 재배열).
 */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 외심 01 — 세 밑각의 합이 90 (좌표로 O,A,B,C 를 다시 세워 실제 각을 잰다)
  "삼각형의 외심과 내심|01": (f) => {
    const pts = circumPts(f.angA!, f.angB!, f.angC!);
    const realP = vecAngle(pts.A, pts.O, pts.B);
    const realQ = vecAngle(pts.B, pts.O, pts.C);
    const realX = vecAngle(pts.C, pts.O, pts.A);
    return (
      near(realP, f.p!, 1e-3) &&
      near(realQ, f.q!, 1e-3) &&
      near(realX, f.x!, 1e-3) &&
      near(f.p! + f.q! + f.x!, 90)
    );
  },
  // 외심 02 — 피타고라스로 빗변을 구해 절반이 x 와 같은지
  "삼각형의 외심과 내심|02": (f) =>
    near(Math.sqrt(f.p! * f.p! + f.q! * f.q!), f.c!) && near(f.c!, 2 * f.x!),
  // 외심 03 — 좌표로 O 를 세워 ∠OBC 를 직접 재고, |90-A| 공식과 대조
  "삼각형의 외심과 내심|03": (f) => {
    const pts = circumPts(f.angA!, f.angB!, f.angC!);
    const real = vecAngle(pts.B, pts.O, pts.C);
    return near(real, f.x!, 1e-3) && f.angA! > 90 && near(f.x!, f.angA! - 90);
  },
  // 외심 04 — 좌표로 ∠BOC(중심각) 를 재고, 2(p+q) 와 대조
  "삼각형의 외심과 내심|04": (f) => {
    const pts = circumPts(f.angA!, f.angB!, f.angC!);
    const real = vecAngle(pts.O, pts.B, pts.C);
    return near(real, f.x!, 1e-3) && near(f.x!, 2 * (f.p! + f.q!));
  },
  // 외심 05 — 좌표로 ∠BOC 를 재고, 180-B-C 를 두 배 한 값과 대조
  "삼각형의 외심과 내심|05": (f) => {
    const pts = circumPts(f.angA!, f.angB!, f.angC!);
    const real = vecAngle(pts.O, pts.B, pts.C);
    return near(real, f.x!, 1e-3) && near(f.x!, 2 * (180 - f.angB! - f.angC!));
  },
  // 내심 06 — 세 반각의 합이 90 (곱셈꼴: 2p+2q+2x=180)
  "삼각형의 외심과 내심|06": (f) =>
    near(2 * f.p! + 2 * f.q! + 2 * f.x!, 180) &&
    near(2 * f.p!, f.angA!) &&
    near(2 * f.q!, f.angB!),
  // 내심 07 — 2(x-90) = A
  "삼각형의 외심과 내심|07": (f) => near(2 * (f.x! - 90), f.angA!),
  // 내심 08 — m = 90 + A/2 를 곱셈꼴 2m=180+A 로
  "삼각형의 외심과 내심|08": (f) =>
    near(2 * f.m!, 180 + f.x!) && near(f.x!, f.angA!),
  // 내심 09 — 둘레 = AB+AC (곱셈 없이 그대로, 다만 b,c 를 뒤바꿔도 성립하는지)
  "삼각형의 외심과 내심|09": (f) => near(f.x!, f.b! + f.c!) && f.b! !== f.c!,
  // 내심 10 — 넓이를 두 가지 식(½pq 와 rs)으로 세워 같은지
  "삼각형의 외심과 내심|10": (f) => {
    const h = Math.sqrt(f.p! * f.p! + f.q! * f.q!);
    const s = (f.p! + f.q! + h) / 2;
    return near(h, f.h!) && near(0.5 * f.p! * f.q!, f.x! * s, 1e-6);
  },
  // 내심 11 — 접선 길이 두 벌(AF, AE)이 같고 CE+AE=CA
  "삼각형의 외심과 내심|11": (f) => {
    const h = Math.sqrt(f.p! * f.p! + f.q! * f.q!);
    const r = (f.p! + f.q! - h) / 2;
    return near(r, f.r!) && near(r + f.x!, f.q!);
  },
  // 내심 12 — (B-C)=2x, 즉 곱셈꼴
  "삼각형의 외심과 내심|12": (f) => near(f.b! - f.c!, 2 * f.x!) && f.b! > f.c!,
  // 외심 13 — R+r=(p+q)/2 를 곱셈꼴 2(R+r)=p+q 로, R,r 를 각각 재구성
  "삼각형의 외심과 내심|13": (f) => {
    const h = Math.sqrt(f.p! * f.p! + f.q! * f.q!);
    const R = h / 2;
    const r = (f.p! + f.q! - h) / 2;
    return near(h, f.h!) && near(2 * (R + r), f.p! + f.q!) && near(f.x!, R + r);
  },
  // 무게중심 01 — 2x = a (중점연결정리)
  "삼각형의 무게중심|01": (f) => near(2 * f.x!, f.a!),
  // 무게중심 02 — x = 2n
  "삼각형의 무게중심|02": (f) => near(f.x!, 2 * f.n!),
  // 무게중심 03 — 2x = h (중선이 이등분됨)
  "삼각형의 무게중심|03": (f) => near(2 * f.x!, f.h!),
  // 무게중심 04 — 4x = a (중점연결을 두 번)
  "삼각형의 무게중심|04": (f) => near(4 * f.x!, f.a!),
  // 무게중형 05 — 2x = a+b+c, 그리고 삼각부등식
  "삼각형의 무게중심|05": (f) =>
    near(2 * f.x!, f.a! + f.b! + f.c!) &&
    f.a! + f.b! > f.c! &&
    f.b! + f.c! > f.a! &&
    f.c! + f.a! > f.b!,
  // 무게중심 06 — x = p+q (바리뇽 평행사변형 둘레 = 대각선의 합)
  "삼각형의 무게중심|06": (f) => near(f.x!, f.p! + f.q!),
  // 무게중심 07 — 2x = p+q (사다리꼴 중점연결)
  "삼각형의 무게중심|07": (f) => near(2 * f.x!, f.p! + f.q!),
  // 무게중심 08 — 2x = S, S = w*h
  "삼각형의 무게중심|08": (f) =>
    near(2 * f.x!, f.S!) && near(f.S!, f.w! * f.h!),
  // 무게중심 09 — 3x = 2h
  "삼각형의 무게중심|09": (f) => near(3 * f.x!, 2 * f.h!),
  // 무게중심 10 — AG'/AG = m/(m+n) 을 좌표로 재구성해 대조
  "삼각형의 무게중심|10": (f) => {
    const { A, B, C } = triMedian(f.w!, f.h!);
    const P: P2 = [
      A[0] + (B[0] - A[0]) * (f.m! / (f.m! + f.n!)),
      A[1] + (B[1] - A[1]) * (f.m! / (f.m! + f.n!)),
    ];
    const Q: P2 = [
      A[0] + (C[0] - A[0]) * (f.m! / (f.m! + f.n!)),
      A[1] + (C[1] - A[1]) * (f.m! / (f.m! + f.n!)),
    ];
    const G: P2 = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    const Gp: P2 = [(A[0] + P[0] + Q[0]) / 3, (A[1] + P[1] + Q[1]) / 3];
    const AG = dist(A, G);
    const AGp = dist(A, Gp);
    return near(AG, f.g!, 1e-6) && near(AGp, f.x!, 1e-6);
  },
  // 무게중심 11 — 좌표로 GD,GE 를 직접 재고 (AG+BG)/2 와 대조
  "삼각형의 무게중심|11": (f) => {
    const { A, B, C, D, G } = triMedian(f.w!, f.h!);
    const E: P2 = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
    const AG = dist(A, G);
    const BG = dist(B, G);
    const GD = dist(G, D);
    const GE = dist(G, E);
    return (
      near(AG, f.p!, 1e-6) &&
      near(BG, f.q!, 1e-6) &&
      near(GD + GE, f.x!, 1e-6) &&
      near(2 * (GD + GE), f.p! + f.q!, 1e-6)
    );
  },
  // 무게중심 12 — 3x = 4w, a = 2w
  "삼각형의 무게중심|12": (f) =>
    near(3 * f.x!, 4 * f.w!) && near(f.a!, 2 * f.w!),
  // 무게중심 13 — 3x = S
  "삼각형의 무게중심|13": (f) => near(3 * f.x!, f.S!),
  // 무게중심 14 — 6x = S
  "삼각형의 무게중심|14": (f) => near(6 * f.x!, f.S!),
  // 무게중심 15 — 좌표로 평행사변형을 다시 세워 BP 를 직접 재고 3x=d 와 대조
  "삼각형의 무게중심|15": (f) => {
    const d = f.d!;
    const ex = f.ex!;
    const ey = f.ey!;
    const B: P2 = [0, 0];
    const D: P2 = [d, 0];
    const A: P2 = [d / 2 - ex, ey];
    const C: P2 = [d / 2 + ex, -ey];
    // 평행사변형 검산: AB 벡터 == DC 벡터
    const abOk =
      near(B[0] - A[0], C[0] - D[0], 1e-6) &&
      near(B[1] - A[1], C[1] - D[1], 1e-6);
    const M: P2 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const t = -C[1] / (M[1] - C[1]);
    const Px = C[0] + t * (M[0] - C[0]);
    return abOk && near(Px, f.x!, 1e-6) && near(3 * f.x!, d);
  },
};

/** 답 문자열의 첫 수가 facts 의 이 값과 같아야 한다. */
const ANSWER_KEY: Record<string, string> = {
  "삼각형의 외심과 내심|01": "x",
  "삼각형의 외심과 내심|02": "x",
  "삼각형의 외심과 내심|03": "x",
  "삼각형의 외심과 내심|04": "x",
  "삼각형의 외심과 내심|05": "x",
  "삼각형의 외심과 내심|06": "x",
  "삼각형의 외심과 내심|07": "x",
  "삼각형의 외심과 내심|08": "x",
  "삼각형의 외심과 내심|09": "x",
  "삼각형의 외심과 내심|10": "x",
  "삼각형의 외심과 내심|11": "x",
  "삼각형의 외심과 내심|12": "x",
  "삼각형의 외심과 내심|13": "x",
  "삼각형의 무게중심|01": "x",
  "삼각형의 무게중심|02": "x",
  "삼각형의 무게중심|03": "x",
  "삼각형의 무게중심|04": "x",
  "삼각형의 무게중심|05": "x",
  "삼각형의 무게중심|06": "x",
  "삼각형의 무게중심|07": "x",
  "삼각형의 무게중심|08": "x",
  "삼각형의 무게중심|09": "x",
  "삼각형의 무게중심|10": "x",
  "삼각형의 무게중심|11": "x",
  "삼각형의 무게중심|12": "x",
  "삼각형의 무게중심|13": "x",
  "삼각형의 무게중심|14": "x",
  "삼각형의 무게중심|15": "x",
};

/** 그림이 있어야 하는 유형 (23/28). 나머지 5(외심 10·11·12·13, 무게중심 06)는 그림 없이 완결된다. */
const FIGURE_KEYS = new Set([
  "삼각형의 외심과 내심|01",
  "삼각형의 외심과 내심|02",
  "삼각형의 외심과 내심|03",
  "삼각형의 외심과 내심|04",
  "삼각형의 외심과 내심|05",
  "삼각형의 외심과 내심|06",
  "삼각형의 외심과 내심|07",
  "삼각형의 외심과 내심|08",
  "삼각형의 외심과 내심|09",
  "삼각형의 외심과 내심|10",
  "삼각형의 외심과 내심|11",
  "삼각형의 외심과 내심|13",
  "삼각형의 무게중심|01",
  "삼각형의 무게중심|02",
  "삼각형의 무게중심|03",
  "삼각형의 무게중심|04",
  "삼각형의 무게중심|05",
  "삼각형의 무게중심|07",
  "삼각형의 무게중심|08",
  "삼각형의 무게중심|09",
  "삼각형의 무게중심|10",
  "삼각형의 무게중심|11",
  "삼각형의 무게중심|12",
  "삼각형의 무게중심|13",
  "삼각형의 무게중심|14",
  "삼각형의 무게중심|15",
]);

function vkey(e: { rpmMinor: string; rpmType: string }): string {
  return `${e.rpmMinor}|${e.rpmType}`;
}

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

/** 스펙의 labels 에서 «숫자 라벨»만 뽑는다 (`12 cm` → 12, `40°` → 40). */
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
  const angles = (spec.angles ?? {}) as Record<string, unknown>;
  for (const value of Object.values(angles)) {
    const label = (value as { label?: unknown })?.label;
    if (typeof label === "string") {
      const m = /^(\d+(?:\.\d+)?)°$/.exec(label.trim());
      if (m) out.push(Number(m[1]));
    }
  }
  return out;
}

describe("중2 «삼각형의 외심과 내심»·«삼각형의 무게중심» 28유형 (RPM 2-2)", () => {
  it("두 중단원의 계획된 번호가 전부 등록돼 있다", () => {
    const seq = (n: number): string[] =>
      Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0"));
    expect(ALL.length).toBe(28);
    expect(CIRC.map((e) => e.rpmType).sort()).toEqual(seq(13));
    expect(CENTROID.map((e) => e.rpmType).sort()).toEqual(seq(15));
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다 (prisma/seed-data/units.ts)", () => {
    const count = new Map<string, number>();
    for (const e of ALL) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    expect(count).toEqual(
      new Map([
        ["삼각형의 외심", 6],
        ["삼각형의 내심", 7],
        ["삼각형의 두 변의 중점을 연결한 선분", 7],
        ["삼각형의 무게중심", 8],
      ]),
    );
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(ALL.map((e) => [vkey(e), e.rpmTitle]));
    expect(byKey.get("삼각형의 외심과 내심|01")).toBe("삼각형의 외심");
    expect(byKey.get("삼각형의 외심과 내심|02")).toBe("직각삼각형의 외심");
    expect(byKey.get("삼각형의 외심과 내심|03")).toBe("둔각삼각형의 외심");
    expect(byKey.get("삼각형의 외심과 내심|04")).toBe(
      "삼각형의 외심이 주어질 때 각의 크기 구하기 ⑴",
    );
    expect(byKey.get("삼각형의 외심과 내심|06")).toBe("삼각형의 내심");
    expect(byKey.get("삼각형의 외심과 내심|10")).toBe(
      "삼각형의 넓이와 내접원의 반지름의 길이",
    );
    expect(byKey.get("삼각형의 외심과 내심|11")).toBe(
      "삼각형의 내접원과 접선의 길이",
    );
    expect(byKey.get("삼각형의 외심과 내심|12")).toBe("삼각형의 외심과 내심");
    expect(byKey.get("삼각형의 외심과 내심|13")).toBe(
      "직각삼각형의 외접원과 내접원",
    );
    expect(byKey.get("삼각형의 무게중심|01")).toBe(
      "삼각형의 두 변의 중점을 연결한 선분의 성질⑴",
    );
    expect(byKey.get("삼각형의 무게중심|06")).toBe(
      "사각형의 네 변의 중점을 연결하여 만든 사각형",
    );
    expect(byKey.get("삼각형의 무게중심|08")).toBe("삼각형의 중선의 성질");
    expect(byKey.get("삼각형의 무게중심|09")).toBe("삼각형의 무게중심의 성질");
    expect(byKey.get("삼각형의 무게중심|10")).toBe("두 삼각형의 무게중심 길이");
    expect(byKey.get("삼각형의 무게중심|14")).toBe("두 삼각형의 무게중심 넓이");
    expect(byKey.get("삼각형의 무게중심|15")).toBe(
      "평행사변형에서 삼각형의 무게중심의 응용",
    );
  });

  for (const e of ALL) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260824)).toEqual(
          generateMiddleProblem(e.key, 20260824),
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
        const key = ANSWER_KEY[vkey(e)]!;
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
          const want = FIGURE_KEYS.has(vkey(e));
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

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of ALL) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });
});
