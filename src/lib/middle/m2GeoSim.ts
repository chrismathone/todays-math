/**
 * 중2 「도형의 닮음·닮음의 활용」 — RPM 2-2 «도형의 닮음»(01~15 **전량**) +
 * «평행선 사이의 선분의 길이의 비»(01~11 **전량**).
 *
 * 병렬 세션 소유 모듈 (2A-중2기하 → 2B-v2마크 로 인계, 2026-08-23).
 *
 * 계약·그림 원칙은 `m2GeoTri.ts` 머리 주석과 같다. 변 숫자는 자유 점+label
 * 우회(점 마커 없음 — 실렌더 확인 2026-08-23), 길이 비는 발문의 실제 값으로
 * 그린다. 입체(직육면체·원뿔 두 개 나란히)는 v2 에 없으므로 그림 없이
 * 성립하는 발문으로 냈다.
 *
 * ## 2B 대기 목록 — **전부 해소됨** (2026-08-23)
 *
 * v2 마크 문법(ticks·parallel·arcs·right)이 들어와 09~15·08~11 을 다 냈다.
 * 같은 각은 **호의 개수**로 구분하고(첫 쌍 1개·둘째 쌍 2개), 평행은 »,
 * 직각은 기호로 찍는다. 이로써 «도형의 닮음» 15유형과 «평행선 사이의 선분의
 * 길이의 비» 11유형이 빠짐없이 등록됐다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { withDims } from "./figureDims";
import type { MidProblem, TypeEntry } from "./types";

/**
 * 「`ad`·`db` 처럼 **두 점 이름**을 키로 쓰는 라벨 표」를 치수선 표로 바꾼다.
 *
 * 이 모듈의 그림 함수들은 길이 라벨을 `{ ad: "6 cm", db: "9 cm" }` 로 받고,
 * 그 키가 곧 **끝점 두 개**다. 그러니 가짜 점을 만들 필요가 없다 —
 * 키를 대문자로 올리면 그대로 `withDims` 의 열쇠가 된다.
 *
 * `anchors` 에 없는 키는 그 그림이 모르는 변이므로 건너뛴다(종전 동작 그대로).
 */
function dimsOf(
  labels: Record<string, string>,
  anchors: Record<string, unknown>,
): Record<string, string | undefined> {
  const dims: Record<string, string | undefined> = {};
  for (const [key, text] of Object.entries(labels)) {
    if (anchors[key] !== undefined) dims[key.toUpperCase()] = text;
  }
  return dims;
}

const GRADE = "중2";
const BOOK = "2-2";
const MINOR_SIM = "도형의 닮음";
const MINOR_PAR = "평행선 사이의 선분의 길이의 비";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  닮은도형: "닮은 도형",
  넓이부피비: "닮은 도형의 넓이의 비와 부피의 비",
  삼평행비: "삼각형에서 평행선 사이의 선분의 길이의 비",
  각이등분: "삼각형의 각의 이등분선",
  닮음조건: "삼각형의 닮음 조건",
  평행선비: "평행선 사이의 선분의 길이의 비",
} as const;

/** 최대공약수 — 비를 기약으로 적을 때 쓴다. */
function gcdInt(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

/**
 * 비로 곱하는 한 토막 `\times\dfrac{n}{d}` — 비가 $1:q$ 이면 분모가 $1$ 이라
 * `\times\dfrac{3}{1}` 이 된다. 그때는 분수를 안 쓰고 `\times3` 으로 적는다.
 */
function timesFrac(n: number, d: number): string {
  return d === 1 ? `\\times${n}` : `\\times\\dfrac{${n}}{${d}}`;
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];

/** 수학 좌표(y-위) → SVG 좌표(y-아래), 220×190 균일 배율 (m2GeoTri 와 동일 규약). */
function fitPts(pts: Record<string, XY>): Record<string, XY> {
  const xs = Object.values(pts).map((p) => p[0]);
  const ys = Object.values(pts).map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = 18;
  const s = Math.min(
    (220 - 2 * m) / Math.max(maxX - minX, 1e-9),
    (190 - 2 * m) / Math.max(maxY - minY, 1e-9),
  );
  const out: Record<string, XY> = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    out[k] = [r2(m + (x - minX) * s), r2(190 - m - (y - minY) * s)];
  }
  return out;
}

/** 선분 p1→p2 위 t 지점을 무게중심 반대쪽으로 push 만큼 민 라벨 앵커. */
function lerp(p1: XY, p2: XY, t: number): XY {
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

/**
 * 선분 위 t 지점에서 변에 **수직인** 방향(무게중심 반대쪽)으로 push 한 라벨 앵커.
 * 꼭짓점 근처 짧은 구간에서도 라벨이 변 옆에 붙는다.
 */
function sideAnchor(p1: XY, p2: XY, t: number, g: XY, push: number): XY {
  const mx = p1[0] + (p2[0] - p1[0]) * t;
  const my = p1[1] + (p2[1] - p1[1]) * t;
  let nx = -(p2[1] - p1[1]);
  let ny = p2[0] - p1[0];
  const n = Math.hypot(nx, ny) || 1;
  nx /= n;
  ny /= n;
  if (nx * (mx - g[0]) + ny * (my - g[1]) < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [mx + nx * push, my + ny * push];
}

type Fig = Record<string, unknown>;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

function areaVolumeRatioSupplement(
  rpmType: string,
  rpmTitle: string,
  mode: number,
): TypeEntry {
  return def(
    MINOR_SIM,
    rpmType,
    rpmTitle,
    SEC.넓이부피비,
    mode < 2 ? "기본" : "응용",
    (rng): Body => {
      // 🔴 **닮음비는 기약이어야 한다.** 예전에는 `p`·`q` 를 따로 뽑아 `4:16` 의
      //    닮음비를 「$2:4$」로, `4:8` 의 부피비를 「$64:512$」로 냈다 — 값은 맞지만
      //    비를 기약으로 안 쓴 것은 **지면이 틀린 것**이고, 값 검산으로는 안 잡힌다
      //    (2026-08-24 「값이 맞으면 시험이 다 초록이다」와 같은 자리).
      const [p, q] = (() => {
        for (let i = 0; i < 60; i += 1) {
          const a = intBetween(rng, 1, 4);
          const b = a + intBetween(rng, 1, 4);
          let x = a;
          let y = b;
          while (y !== 0) {
            const t = x % y;
            x = y;
            y = t;
          }
          if (x === 1) return [a, b] as const;
        }
        return [1, 2] as const;
      })();
      const k = intBetween(rng, 2, 6);
      /** 배율 — 분모가 $1$ 이면 분수를 안 쓴다 (`\dfrac{25}{1}` 금지). */
      const scale = (num: number, den: number): string =>
        den === 1 ? String(num) : `\\dfrac{${num}}{${den}}`;
      if (mode === 0) {
        return {
          content: `닮은 두 평면도형의 넓이의 비가 $${p * p}:${q * q}$일 때, 닮음비를 구하시오.`,
          answer: `$${p}:${q}$`,
          solution: `닮은 두 평면도형의 넓이의 비는 닮음비의 제곱이다. $${p * p}:${q * q}=${p}^2:${q}^2$이므로 닮음비는 $${p}:${q}$이다.`,
          facts: { mode, p, q, k, x: p },
        };
      }
      if (mode === 1) {
        const area = p * p * k;
        const x = q * q * k;
        return {
          content: `닮은 두 삼각형의 닮음비가 $${p}:${q}$이고 작은 삼각형의 넓이가 $${area}\\,\\mathrm{cm}^2$일 때, 큰 삼각형의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `넓이의 비는 $${p}^2:${q}^2=${p * p}:${q * q}$이다. 따라서 큰 삼각형의 넓이는 $${area}\\times${scale(q * q, p * p)}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, p, q, k, area, x },
        };
      }
      if (mode === 2) {
        return {
          content: `닮은 두 입체도형의 닮음비가 $${p}:${q}$일 때, 부피의 비를 구하시오.`,
          answer: `$${p * p * p}:${q * q * q}$`,
          solution: `닮은 두 입체도형의 부피의 비는 닮음비의 세제곱이므로 $${p}^3:${q}^3=${p * p * p}:${q * q * q}$이다.`,
          facts: { mode, p, q, k, x: p * p * p },
        };
      }
      if (mode === 3) {
        return {
          content: `닮은 두 입체도형의 부피의 비가 $${p * p * p}:${q * q * q}$일 때, 닮음비를 구하시오.`,
          answer: `$${p}:${q}$`,
          solution: `부피의 비는 닮음비의 세제곱이다. $${p * p * p}:${q * q * q}=${p}^3:${q}^3$이므로 닮음비는 $${p}:${q}$이다.`,
          facts: { mode, p, q, k, x: q },
        };
      }
      if (mode === 4) {
        const surface = p * p * k;
        const x = q * q * k;
        return {
          content: `닮은 두 입체도형의 닮음비가 $${p}:${q}$이고 작은 입체도형의 겉넓이가 $${surface}\\,\\mathrm{cm}^2$일 때, 큰 입체도형의 겉넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `겉넓이의 비는 닮음비의 제곱인 $${p * p}:${q * q}$이다. 따라서 큰 입체도형의 겉넓이는 $${surface}\\times${scale(q * q, p * p)}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, p, q, k, surface, x },
        };
      }
      const volume = p * p * p * k;
      const x = q * q * q * k;
      return {
        content: `닮은 두 입체도형의 닮음비가 $${p}:${q}$이고 작은 입체도형의 부피가 $${volume}\\,\\mathrm{cm}^3$일 때, 큰 입체도형의 부피를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^3$`,
        solution: `부피의 비는 $${p}^3:${q}^3=${p * p * p}:${q * q * q}$이다. 따라서 큰 입체도형의 부피는 $${volume}\\times${scale(q * q * q, p * p * p)}=${x}\\,(\\mathrm{cm}^3)$이다.`,
        facts: { mode, p, q, k, volume, x },
      };
    },
  );
}

const AREA_VOLUME_RATIO_SUPPLEMENTS = [
  areaVolumeRatioSupplement("30", "넓이의 비에서 닮음비 구하기", 0),
  areaVolumeRatioSupplement("31", "닮은 삼각형의 넓이 구하기", 1),
  areaVolumeRatioSupplement("32", "닮은 입체도형의 부피의 비", 2),
  areaVolumeRatioSupplement("33", "부피의 비에서 닮음비 구하기", 3),
  areaVolumeRatioSupplement("34", "닮은 입체도형의 겉넓이 구하기", 4),
  areaVolumeRatioSupplement("35", "닮은 입체도형의 부피 구하기", 5),
] as const;

/**
 * 닮음 기호 오른쪽 삼각형의 꼭짓점 순서 — △ABC ∽ △(p[0]p[1]p[2]).
 * 테스트가 같은 표로 대응변·대응각을 재계산한다.
 */
export const SIM01_PERMS = [
  ["D", "E", "F"],
  ["D", "F", "E"],
  ["E", "D", "F"],
  ["E", "F", "D"],
  ["F", "D", "E"],
  ["F", "E", "D"],
] as const;

/** 두 닮은 삼각형 나란히 (닮음비 p:q, q>p) — 비율대로 그린다. */
function figSim02(
  p: number,
  q: number,
  labels: { bc: string; ef: string; ab: string; de: string },
): Fig {
  const r = q / p;
  const B: XY = [0, 0];
  const C: XY = [64, 0];
  const A: XY = [22, 48];
  const ox = 64 + 34;
  const E: XY = [ox, 0];
  const F: XY = [ox + 64 * r, 0];
  const D: XY = [ox + 22 * r, 48 * r];
  const shape: Fig = {
    version: 2,
    points: fitPts({ A, B, C, D, E, F }),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      DE: ["D", "E"],
      EF: ["E", "F"],
      FD: ["F", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
  };
  return withDims(shape, {
    BC: labels.bc,
    EF: labels.ef,
    AB: labels.ab,
    DE: labels.de,
  }) as Fig;
}

/** △ABC ∽ △ADE 겹친 꼴 (BC ∥ DE) — AB:AD 비율대로. */
function figSim05(ab: number, ad: number): Fig {
  const A: XY = [0, 110];
  const D: XY = [-62, 0];
  const E: XY = [62, 0];
  const t = ab / ad;
  const B = lerp(A, D, t);
  const C = lerp(A, E, t);
  return {
    version: 2,
    points: fitPts({ A, B, C, D, E }),
    segments: {
      AD: ["A", "D"],
      AE: ["A", "E"],
      BC: ["B", "C"],
      DE: ["D", "E"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

/** 삼각형 + BC∥DE — 각 소구간 라벨. ratio = AD:AB (실제 비율로 그린다). */
function figPar01(
  ratio: number,
  labels: Partial<{
    ad: string;
    db: string;
    ae: string;
    ec: string;
    bc: string;
    de: string;
  }>,
): Fig {
  const A: XY = [4, 120];
  const B: XY = [-70, 0];
  const C: XY = [78, 0];
  const D = lerp(A, B, ratio);
  const E = lerp(A, C, ratio);
  const pts: Record<string, XY> = { A, B, C, D, E };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
  };
  // 🔴 길이는 **치수선**으로 단다 — 보이지 않는 점에 글자를 붙이지 않는다.
  //
  // 원장님 지시 2026-08-29: 「길이 치수선은 왜 자꾸 빠지나?」 그리고
  // 「발문에서 길이를 제시하지 않은 도형은 항상 그림에서 치수선과 라벨을 붙이고,
  //  제시한 도형 중 치수선이 들어갈 공간이 없는 좁은 도형은 억지로 넣지 마라.」
  //
  // 종전에는 `n1`~`n6` 이라는 **가짜 점**을 변 옆 16 만큼 떨어뜨려 만들고 거기에
  // `"6 cm"` 를 라벨로 붙였다. 그러면 지면에 **숫자만 떠 있고 무엇을 잰 것인지
  // 선이 말해 주지 않는다** — `figureDims.ts` 머리말이 「원장님이 2026-08-13 에
  // 물린 바로 그 모양」이라고 적어 둔 것이 이것이다. 규칙도 도구(`withDims`)도
  // 이미 있었는데 **막는 가드가 없어서** 이 모듈들에 계속 들어왔다.
  //
  // ⚠️ 엔진이 「충돌 없는 배치가 없다」고 던지는 자리가 있다(변 위에 다른 점이
  //    올라앉은 좁은 변). 그때는 **떠 있는 숫자로 되돌리지 않고 그냥 뺀다** —
  //    이 유형들은 발문이 그 길이를 이미 말하므로 지면에서 잃는 것이 없다
  //    (실측: 떠 있는 길이 글자가 있는 30유형 전량, 표본 12개씩 발문에 다 있었다).
  const dims: Record<string, string | undefined> = {
    AD: labels.ad,
    DB: labels.db,
    AE: labels.ae,
    EC: labels.ec,
    BC: labels.bc,
    DE: labels.de,
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      DE: ["D", "E"],
    },
    labels: out,
  };
  return withDims(shape, dims) as Fig;
}

/** 나비꼴 — BE·CD 의 교점 A, BC∥DE. ratio = AE:AB (실제 비율). */
function figPar02(
  ratio: number,
  labels: { ab: string; ae: string; bc: string; de: string },
): Fig {
  const A: XY = [0, 0];
  const B: XY = [-72, -66];
  const C: XY = [80, -66];
  const E: XY = [-B[0] * ratio, -B[1] * ratio];
  const D: XY = [-C[0] * ratio, -C[1] * ratio];
  const pts: Record<string, XY> = { A, B, C, D, E };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      BE: ["B", "E"],
      CD: ["C", "D"],
      BC: ["B", "C"],
      DE: ["D", "E"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
  // `n1`·`n2` 는 A 를 낀 **반쪽**(AB·AE)을 잰 것이다 — 선분 BE 전체가 아니다.
  return withDims(shape, {
    AB: labels.ab,
    AE: labels.ae,
    BC: labels.bc,
    DE: labels.de,
  }) as Fig;
}

/** BC∥DE + 중선꼴 AG, F=AG∩DE — BG:GC 비율대로. */
function figPar03(
  g1: number,
  g2: number,
  labels: { g1: string; g2: string; fe: string },
): Fig {
  const A: XY = [0, 115];
  const B: XY = [-80, 0];
  const C: XY = [85, 0];
  const G = lerp(B, C, g1 / (g1 + g2));
  const r = 0.56;
  const D = lerp(A, B, r);
  const E = lerp(A, C, r);
  const F = lerp(A, G, r);
  const shape: Fig = {
    version: 2,
    points: fitPts({ A, B, C, D, E, F, G }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      DE: ["D", "E"],
      AG: ["A", "G"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      F: "F",
      G: "G",
    },
  };
  return withDims(shape, {
    BG: labels.g1,
    GC: labels.g2,
    FE: labels.fe,
  }) as Fig;
}

/** BC∥DE, DC∥FE 겹사다리 — AF:FD 비율대로 (AB 는 그 비에서 유도된다). */
function figPar04(f1: number, f2: number): Fig {
  const A: XY = [6, 135];
  const B: XY = [-64, 0];
  const C: XY = [86, 0];
  const rD = f1 / (f1 + f2);
  const D = lerp(A, B, rD);
  const F = lerp(A, B, rD * rD);
  const E = lerp(A, C, rD);
  const shape: Fig = {
    version: 2,
    points: fitPts({ A, B, C, D, E, F }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      DE: ["D", "E"],
      DC: ["D", "C"],
      FE: ["F", "E"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
  };
  return withDims(shape, {
    AF: `${f1} cm`,
    FD: `${f2} cm`,
    DB: "x cm",
  }) as Fig;
}

/**
 * |AB|:|AC| = ab:ac 인 꼭짓점 — B(0,0)·C(w,0)에 대한 아폴로니오스 원 위에서
 * 고른다. 원하는 높이가 원보다 크면 원이 허용하는 높이(0.85R)로 낮춘다 —
 * 비율(=길이 관계)이 그림의 참이고 높이는 연출이다.
 */
function apexForRatio(ab: number, ac: number, w: number, hWanted: number): XY {
  const rho = ab / ac;
  if (Math.abs(rho - 1) < 1e-9) return [w / 2, hWanted];
  const m = (w * rho * rho) / (rho * rho - 1);
  const R = Math.abs((w * rho) / (rho * rho - 1));
  const h = Math.min(hWanted, 0.85 * R);
  const dx = Math.sqrt(R * R - h * h);
  const cands = [m - dx, m + dx];
  const x = cands.reduce((best, v) =>
    Math.abs(v - w / 2) < Math.abs(best - w / 2) ? v : best,
  );
  return [x, h];
}

/** 내각의 이등분선 — AB:AC 비율대로, D 는 BD:DC=AB:AC 자리(=이등분선의 발). */
function figPar06(
  ab: number,
  ac: number,
  labels: { ab: string; ac: string; bd?: string; dc?: string },
): Fig {
  const w = 150;
  const B: XY = [0, 0];
  const C: XY = [w, 0];
  const A = apexForRatio(ab, ac, w, 92);
  const D: XY = [(w * ab) / (ab + ac), 0];
  const pts: Record<string, XY> = {
    A,
    B,
    C,
    D,
  };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      AD: ["A", "D"],
    },
    labels: out,
  };
  return withDims(shape, {
    AB: labels.ab,
    AC: labels.ac,
    BD: labels.bd,
    DC: labels.dc,
  }) as Fig;
}

/** 외각의 이등분선 — D 는 BC 연장 위 실제 자리(BD:CD=AB:AC 가 저절로 성립). */
function figPar07(ab: number, ac: number, b: number, x: number): Fig {
  const B: XY = [0, 0];
  const C: XY = [b, 0];
  const D: XY = [b + x, 0];
  const A = apexForRatio(ab, ac, b, 0.85 * b);
  const shape: Fig = {
    version: 2,
    points: fitPts({ A, B, C, D }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BD: ["B", "D"],
      AD: ["A", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
  // `n3`·`n4` 는 BC 와 CD — BD 전체가 아니라 C 로 갈린 두 토막이다.
  return withDims(shape, {
    AB: `${ab} cm`,
    AC: `${ac} cm`,
    BC: `${b} cm`,
    CD: "x cm",
  }) as Fig;
}

const COPRIME_UP = [
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
  [3, 5],
  [2, 5],
  [4, 5],
] as const;

/**
 * (a, b) — 직각삼각형의 빗변 위 수선의 발 유형(13)용. 두 다리가
 * `a²+b²` 이 완전제곱이 되는 쌍이어야 `AB=a·c`·`AC=b·c` 가 정수다
 * (`c=√(a²+b²)`, `AH=ab`, `BH=a²`, `CH=b²`).
 */
const SIM13_LEGS = [
  [3, 4],
  [4, 3],
] as const;

/**
 * (BH, CH) — 곱이 완전제곱인 쌍. `AH=√(BH·CH)` 만 물을 때는 세 변이 정수일
 * 필요가 없어 훨씬 넓게 고를 수 있다(위 표는 세 자리 수를 만든다).
 */
const SIM13_FEET = [
  [4, 9],
  [9, 4],
  [2, 8],
  [8, 2],
  [3, 12],
  [12, 3],
  [8, 18],
  [18, 8],
  [9, 16],
  [16, 9],
  [5, 20],
  [20, 5],
  [6, 24],
  [24, 6],
  [4, 25],
  [25, 4],
] as const;

/**
 * (AE, AB', CD) — 접은 직사각형 유형(15). 종이라 `CD = AE + EB'` 이고
 * `EB' = EB = √(AE²+AB'²)` 이므로 **CD 를 마음대로 못 고른다** — 세 값이
 * 서로를 정한다. `B'D = AE·CD/AB'` 가 정수인 쌍만 남겼다.
 */
const SIM15_FOLDS = [
  [3, 4, 8],
  [4, 3, 9],
  [6, 8, 16],
  [8, 6, 18],
  [9, 12, 24],
  [12, 9, 27],
] as const;

/** (i, j) — 12 유형의 닮음비 AD:BE = DB:EC = j:i. 기약이어야 값이 작게 나온다. */
const SIM12_RATIOS = [
  [1, 1],
  [2, 3],
  [3, 2],
  [3, 4],
  [4, 3],
  [1, 2],
  [2, 1],
  [1, 3],
  [3, 1],
] as const;

/** (AD, BC) — 조화평균 `2pq/(p+q)` 가 정수인 쌍 (10 유형). */
const HARMONIC_PAIRS = [
  [6, 12],
  [12, 6],
  [10, 15],
  [15, 10],
  [12, 24],
  [21, 28],
  [20, 30],
  [12, 4],
  [24, 8],
  [30, 20],
] as const;

/** (AB, CD) — `ab/(a+b)` 가 정수인 쌍 (11 유형). */
const RECIPROCAL_PAIRS = [
  [6, 12],
  [12, 6],
  [10, 15],
  [15, 10],
  [12, 4],
  [20, 30],
  [30, 20],
  [9, 18],
  [18, 9],
  [8, 8],
] as const;

// ── 2B 마크 문법 도형 (ticks·parallel·arcs·right) ─────────────────────────
// 닮음 09~15·평행선 비 08~11 은 «같은 각»·«평행»·«직각»을 지면에 찍어야 성립한다.
// 같은 각 쌍은 호의 **개수**로 구분한다 — 첫 쌍 1개, 둘째 쌍 2개.

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** attempt — 조건을 만족할 때까지 다시 뽑는다. 소진되면 던진다. */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

/**
 * 닮음 조건용 두 삼각형 나란히 — 왼쪽 ABC, 오른쪽 DEF(닮음비 1:k).
 * 같은 각 쌍은 호 개수로 구분한다(첫 쌍 1개, 둘째 쌍 2개).
 */
function figSimPair09(
  k: number,
  mode: number,
  labels: Record<string, string>,
  /**
   * 라벨이 요구하는 $(\angle A, \angle B)$(도). 주면 그 각들이 **실제로** 그려진다.
   *
   * 🔴 종전에는 $A=[34,58]$ **고정**이라 어떤 $p,q$ 를 받아도 지면의 각은 늘
   *    $\angle A=77.3^\circ$·$\angle B=59.6^\circ$ 였다. 라벨만 $35^\circ$~$70^\circ$ 로
   *    바뀌었다 — 실측 최악 **41.3° 어긋남**(원장님 지적 2026-08-27 의 그 부류).
   *
   * 사인법칙으로 세운다: $B=(0,0)$·$C=(bw,0)$ 이고 $\angle B=q$ 이므로
   * $\overline{BA} = bw\cdot\sin(\angle C)/\sin(\angle A)$, $A = \overline{BA}\,(\cos q,\ \sin q)$.
   * 닮은 쪽은 그대로 $k$ 배 한다 — **닮음이 지면에서도 닮음이어야** 한다.
   */
  angs?: { p: number; q: number },
): Fig {
  const bw = 96;
  const bh = 58;
  const gap = 42;
  const DEG = Math.PI / 180;
  let ax = 34;
  let ay = bh;
  if (angs) {
    const angC = 180 - angs.p - angs.q;
    const ba = (bw * Math.sin(angC * DEG)) / Math.sin(angs.p * DEG);
    ax = r2(ba * Math.cos(angs.q * DEG));
    ay = r2(ba * Math.sin(angs.q * DEG));
  }
  const A: XY = [ax, ay];
  const B: XY = [0, 0];
  const C: XY = [bw, 0];
  const E: XY = [bw + gap, 0];
  const F: XY = [bw + gap + bw * k, 0];
  const D: XY = [bw + gap + ax * k, ay * k];
  const angles: Record<string, unknown> =
    mode === 0
      ? {
          angB: { vertex: "B", points: ["A", "C"] },
          angE: { vertex: "E", points: ["D", "F"] },
        }
      : {
          // ⚠️ 한 삼각형에 각 라벨을 둘 붙이면 **겹친다** — 두 삼각형이 220px 를
          //    나눠 쓰므로 라벨 거리(25px)가 삼각형보다 크다(실측 2026-08-23).
          //    RPM 지면처럼 삼각형마다 하나씩 적고, 나머지는 **호 개수**가 잇는다.
          angA: { vertex: "A", points: ["B", "C"], label: labels.angA },
          angD: { vertex: "D", points: ["E", "F"] },
          angB: { vertex: "B", points: ["A", "C"], arcs: 2 },
          angE: {
            vertex: "E",
            points: ["D", "F"],
            arcs: 2,
            label: labels.angB,
          },
        };
  const pts: Record<string, XY> = { A, B, C, D, E, F };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
  };
  const g1: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const g2: XY = [(D[0] + E[0] + F[0]) / 3, (D[1] + E[1] + F[1]) / 3];
  const anchors: Record<string, XY> = {
    ab: sideAnchor(A, B, 0.5, g1, 16),
    bc: sideAnchor(B, C, 0.5, g1, 15),
    de: sideAnchor(D, E, 0.5, g2, 16),
    ef: sideAnchor(E, F, 0.5, g2, 15),
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      DE: ["D", "E"],
      EF: ["E", "F"],
      FD: ["F", "D"],
    },
    angles,
    labels: out,
  };
  return withDims(shape, dimsOf(labels, anchors)) as Fig;
}

/**
 * △ABC 에서 D 는 AB 위, E 는 AC 위, 선분 DE — △ADE ∽ △ACB (SAS 닮음).
 * ∠A 는 공통이므로 호 하나로 찍는다.
 */
function figSasInner10(
  ad: number,
  ab: number,
  ae: number,
  ac: number,
  labels: Record<string, string>,
): Fig {
  const scale = 150 / Math.max(ab, ac);
  const A: XY = [0, 0];
  const B: XY = [-0.62 * ab * scale, -0.78 * ab * scale];
  const C: XY = [0.9 * ac * scale, -0.44 * ac * scale];
  const D = lerp(A, B, ad / ab);
  const E = lerp(A, C, ae / ac);
  const g: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const pts: Record<string, XY> = { A, B, C, D, E };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
  };
  const anchors: Record<string, XY> = {
    ad: sideAnchor(A, D, 0.5, g, 15),
    db: sideAnchor(D, B, 0.5, g, 15),
    ae: sideAnchor(A, E, 0.5, g, 15),
    ec: sideAnchor(E, C, 0.5, g, 15),
    de: sideAnchor(D, E, 0.5, g, -16),
  };
  // 길이는 **치수선**으로 — 가짜 점 `n_*` 에 글자를 붙이지 않는다(`figPar01` 머리말).
  const dims = dimsOf(labels, anchors);
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AD: ["A", "D"],
      DB: ["D", "B"],
      AE: ["A", "E"],
      EC: ["E", "C"],
      DE: ["D", "E"],
      BC: ["B", "C"],
    },
    // AB·AC 를 D·E 에서 끊었으므로 ∠A 는 «덮이는 광선»(AD·AE)으로 가리킨다.
    angles: { angA: { vertex: "A", points: ["D", "E"] } },
    labels: out,
  };
  return withDims(shape, dims) as Fig;
}

/**
 * △ABC 에서 D 는 AB 위, E 는 BC 위, 선분 DE — ∠BDE=∠C 이므로 △BDE ∽ △BCA.
 * 같은 각 두 자리(∠BDE·∠BCA)를 이중 호로 찍는다(∠B 는 공통이라 안 찍는다).
 */
function figAaInner11(
  bd: number,
  ba: number,
  be: number,
  bc: number,
  labels: Record<string, string>,
): Fig {
  const scale = 150 / Math.max(ba, bc);
  const B: XY = [0, 0];
  const C: XY = [bc * scale, 0];
  const A: XY = [0.3 * ba * scale, 0.95 * ba * scale];
  const D = lerp(B, A, bd / ba);
  const E = lerp(B, C, be / bc);
  const g: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const pts: Record<string, XY> = { A, B, C, D, E };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
  };
  const anchors: Record<string, XY> = {
    bd: sideAnchor(B, D, 0.5, g, 16),
    da: sideAnchor(D, A, 0.5, g, 16),
    be: sideAnchor(B, E, 0.5, g, 15),
    ec: sideAnchor(E, C, 0.5, g, 15),
  };
  const dims = dimsOf(labels, anchors);
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      BD: ["B", "D"],
      DA: ["D", "A"],
      BE: ["B", "E"],
      EC: ["E", "C"],
      DE: ["D", "E"],
      AC: ["A", "C"],
    },
    angles: {
      angD: { vertex: "D", points: ["B", "E"], arcs: 2 },
      angC: { vertex: "C", points: ["E", "A"], arcs: 2 },
    },
    labels: out,
  };
  return withDims(shape, dims) as Fig;
}

/**
 * ∠ABC=90° 이고 A·C 에서 B 를 지나는 직선에 내린 수선의 발 D·E.
 * △ADB ∽ △BEC (AA) — 직각 세 자리를 기호로 찍는다.
 */
function figRightFeet12(
  ad: number,
  bd: number,
  be: number,
  ce: number,
  labels: Record<string, string>,
): Fig {
  const k = 10;
  const D: XY = [0, 0];
  const B: XY = [bd * k, 0];
  const E: XY = [(bd + be) * k, 0];
  const A: XY = [0, ad * k];
  const C: XY = [(bd + be) * k, ce * k];
  const L1: XY = [-26, 0];
  const L2: XY = [(bd + be) * k + 26, 0];
  const pts: Record<string, XY> = { A, B, C, D, E, L1, L2 };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
  };
  const anchors: Record<string, XY> = {
    ad: [-20, (ad * k) / 2],
    be: [(bd + be / 2) * k, -17],
    ce: [(bd + be) * k + 22, (ce * k) / 2],
    bd: [(bd / 2) * k, -17],
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      l: ["L1", "L2"],
      AD: ["A", "D"],
      CE: ["C", "E"],
      AB: ["A", "B"],
      BC: ["B", "C"],
    },
    angles: {
      rD: { vertex: "D", points: ["A", "B"], right: true },
      rE: { vertex: "E", points: ["C", "B"], right: true },
      rB: { vertex: "B", points: ["A", "C"], right: true },
    },
    labels: out,
  };
  return withDims(shape, dimsOf(labels, anchors)) as Fig;
}

/** ∠A=90° 인 직각삼각형에서 빗변 BC 에 내린 수선의 발 H. */
function figAltitude13(
  bh: number,
  ch: number,
  ah: number,
  labels: Record<string, string>,
): Fig {
  const k = 6;
  const B: XY = [0, 0];
  const H: XY = [bh * k, 0];
  const C: XY = [(bh + ch) * k, 0];
  const A: XY = [bh * k, ah * k];
  const pts: Record<string, XY> = { A, B, C, H };
  const out: Record<string, string> = { A: "A", B: "B", C: "C", H: "H" };
  const anchors: Record<string, XY> = {
    bh: [(bh / 2) * k, -17],
    ch: [(bh + ch / 2) * k, -17],
    ah: [bh * k - 20, (ah * k) / 2],
    ab: [(bh * k) / 2 - 18, (ah * k) / 2 + 12],
    ac: [(2 * bh + ch) * k * 0.5 + 16, (ah * k) / 2 + 12],
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      BH: ["B", "H"],
      HC: ["H", "C"],
      AB: ["A", "B"],
      AC: ["A", "C"],
      AH: ["A", "H"],
    },
    angles: {
      rA: { vertex: "A", points: ["B", "C"], right: true },
      rH: { vertex: "H", points: ["A", "C"], right: true },
    },
    labels: out,
  };
  return withDims(shape, dimsOf(labels, anchors)) as Fig;
}

/** 그림자 닮음 — 나무와 막대(둘 다 지면에 수직) + 같은 시각의 햇빛. */
function figShadow14(
  poleH: number,
  poleS: number,
  treeS: number,
  labels: Record<string, string>,
): Fig {
  const treeH = (poleH * treeS) / poleS;
  const kx = 130 / (treeS + poleS);
  const ky = 120 / treeH;
  const B: XY = [0, 0];
  const T: XY = [0, treeH * ky];
  const S1: XY = [treeS * kx, 0];
  const P: XY = [treeS * kx + 30, 0];
  const Q: XY = [treeS * kx + 30, poleH * ky];
  const S2: XY = [treeS * kx + 30 + poleS * kx, 0];
  const pts: Record<string, XY> = { B, T, S1, P, Q, S2 };
  const out: Record<string, string> = {};
  const anchors: Record<string, XY> = {
    poleH: [treeS * kx + 24, (poleH * ky) / 2],
    poleS: [treeS * kx + 30 + (poleS * kx) / 2, -17],
    treeS: [(treeS * kx) / 2, -17],
    treeH: [-22, (treeH * ky) / 2],
  };
  // 여기 앵커 이름은 **두 점 이름이 아니다**(`poleH`…). 어느 선분을 잰 것인지는
  // 이 표만 안다 — `dimsOf` 의 「대문자로 바꾸면 짝」 규칙이 안 통한다.
  const PAIR: Record<string, string> = {
    poleH: "QP",
    poleS: "PS2",
    treeS: "BS1",
    treeH: "TB",
  };
  const dims: Record<string, string | undefined> = {};
  for (const [key, text] of Object.entries(labels)) {
    if (anchors[key] && PAIR[key]) dims[PAIR[key]!] = text;
  }
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      ground1: ["B", "S1"],
      tree: ["T", "B"],
      ray1: ["T", "S1"],
      ground2: ["P", "S2"],
      pole: ["Q", "P"],
      ray2: ["Q", "S2"],
    },
    angles: {
      rB: { vertex: "B", points: ["T", "S1"], right: true },
      rP: { vertex: "P", points: ["Q", "S2"], right: true },
    },
    labels: out,
  };
  return withDims(shape, dims) as Fig;
}

/**
 * 직사각형 종이 ABCD 를 EC 를 접는 선으로 하여 B 가 AD 위의 P(=B') 에 오도록 접었다.
 * △AEP ∽ △DPC (AA). 접은 자리라 EB=EP·CB=CP 를 tick 으로 찍는다.
 */
function figFoldRect15(
  ae: number,
  ap: number,
  cd: number,
  pd: number,
  labels: Record<string, string>,
): Fig {
  const k = 8;
  const side = cd * k;
  const long = (ap + pd) * k;
  const A: XY = [0, side];
  const B: XY = [0, 0];
  const C: XY = [long, 0];
  const D: XY = [long, side];
  const E: XY = [0, side - ae * k];
  const P: XY = [ap * k, side];
  const pts: Record<string, XY> = { A, B, C, D, E, P };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    P: "B'",
  };
  const anchors: Record<string, XY> = {
    ae: [-20, side - (ae * k) / 2],
    ap: [(ap * k) / 2, side + 16],
    cd: [long + 20, side / 2],
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AE: ["A", "E"],
      EB: { points: ["E", "B"], ticks: 1 },
      BC: { points: ["B", "C"], ticks: 2 },
      CD: ["C", "D"],
      AP: ["A", "P"],
      PD: ["P", "D"],
      EP: { points: ["E", "P"], ticks: 1 },
      PC: { points: ["P", "C"], ticks: 2 },
      EC: ["E", "C"],
    },
    angles: {
      rA: { vertex: "A", points: ["E", "P"], right: true },
      rD: { vertex: "D", points: ["P", "C"], right: true },
    },
    labels: out,
  };
  return withDims(shape, dimsOf(labels, anchors)) as Fig;
}

/** 세 평행선 l∥m∥n 과 두 절단선 — 평행 » 로 «평행»을 지면에 남긴다. */
function figThreeParallel08(
  a: number,
  b: number,
  labels: Record<string, string>,
): Fig {
  const k = 90 / (a + b);
  const h1 = a * k;
  const h2 = b * k;
  const W = 120;
  const leanL = 24;
  const leanR = -28;
  const P1: XY = [0, h1 + h2];
  const P2: XY = [(leanL * h2) / (h1 + h2), h2];
  const P3: XY = [leanL, 0];
  const Q1: XY = [W, h1 + h2];
  const Q2: XY = [W + (leanR * h2) / (h1 + h2), h2];
  const Q3: XY = [W + leanR, 0];
  const pad = 30;
  const minX = Math.min(0, leanL, W, W + leanR) - pad;
  const maxX = Math.max(0, leanL, W, W + leanR) + pad;
  const pts: Record<string, XY> = {
    P1,
    P2,
    P3,
    Q1,
    Q2,
    Q3,
    lA: [minX, h1 + h2],
    lB: [maxX, h1 + h2],
    mA: [minX, h2],
    mB: [maxX, h2],
    nA: [minX, 0],
    nB: [maxX, 0],
  };
  const out: Record<string, unknown> = {
    lB: { text: "l", italic: true },
    mB: { text: "m", italic: true },
    nB: { text: "n", italic: true },
    P1: "A",
    P2: "B",
    P3: "C",
    Q1: "D",
    Q2: "E",
    Q3: "F",
  };
  const anchors: Record<string, XY> = {
    a: [(P1[0] + P2[0]) / 2 - 22, (P1[1] + P2[1]) / 2],
    b: [(P2[0] + P3[0]) / 2 - 22, (P2[1] + P3[1]) / 2],
    c: [(Q1[0] + Q2[0]) / 2 + 22, (Q1[1] + Q2[1]) / 2],
    x: [(Q2[0] + Q3[0]) / 2 + 22, (Q2[1] + Q3[1]) / 2],
  };
  // 앵커 이름이 `a`·`b`·`c`·`x` 라 두 점 이름이 아니다 — 어느 토막인지는 이 표만 안다.
  const PAIR: Record<string, string> = {
    a: "P1P2",
    b: "P2P3",
    c: "Q1Q2",
    x: "Q2Q3",
  };
  const dims: Record<string, string | undefined> = {};
  for (const [key, text] of Object.entries(labels)) {
    if (anchors[key] && PAIR[key]) dims[PAIR[key]!] = text;
  }
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      lineL: { points: ["lA", "lB"], parallel: 1 },
      lineM: { points: ["mA", "mB"], parallel: 1 },
      lineN: { points: ["nA", "nB"], parallel: 1 },
      cutL: ["P1", "P3"],
      cutR: ["Q1", "Q3"],
    },
    labels: out,
  };
  return withDims(shape, dims) as Fig;
}

/**
 * 사다리꼴 ABCD (AD∥EF∥BC) — E 는 AB 위, F 는 DC 위.
 * `diag` 를 주면 두 대각선도 그린다(EF 가 교점을 지나는 유형).
 */
function figTrapMid09(
  ad: number,
  bc: number,
  t: number,
  opts: { diag?: boolean; labels?: Record<string, string> },
): Fig {
  const k = 150 / Math.max(ad, bc);
  const h = 108;
  const A: XY = [(bc - ad) * k * 0.5, h];
  const D: XY = [(bc + ad) * k * 0.5, h];
  const B: XY = [0, 0];
  const C: XY = [bc * k, 0];
  const E = lerp(A, B, t);
  const F = lerp(D, C, t);
  const pts: Record<string, XY> = { A, B, C, D, E, F };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
  };
  const segments: Record<string, unknown> = {
    AD: { points: ["A", "D"], parallel: 1 },
    // 대각선을 그리는 유형에서는 EF 의 중점이 곧 두 대각선의 교점이라
    // » 표시가 교차선에 묻혀 안 보인다 — 그때는 찍지 않는다(실렌더 확인).
    EF: opts.diag ? ["E", "F"] : { points: ["E", "F"], parallel: 1 },
    BC: { points: ["B", "C"], parallel: 1 },
    AE: ["A", "E"],
    EB: ["E", "B"],
    DF: ["D", "F"],
    FC: ["F", "C"],
  };
  if (opts.diag) {
    segments.AC = ["A", "C"];
    segments.BD = ["B", "D"];
    // AO:OC = AD:BC; compute the intersection before fitting/rounding.
    pts.O = lerp(A, C, ad / (ad + bc));
    out.O = "O";
  }
  const anchors: Record<string, XY> = {
    ad: [(A[0] + D[0]) / 2, h + 16],
    bc: [(B[0] + C[0]) / 2, -16],
    ef: [(E[0] + F[0]) / 2, (E[1] + F[1]) / 2 + 16],
    ae: [(A[0] + E[0]) / 2 - 20, (A[1] + E[1]) / 2],
    eb: [(E[0] + B[0]) / 2 - 20, (E[1] + B[1]) / 2],
  };
  const shape: Fig = { version: 2, points: fitPts(pts), segments, labels: out };
  return withDims(shape, dimsOf(opts.labels ?? {}, anchors)) as Fig;
}

/**
 * AB∥EF∥DC 인 «나비» 모양 — B·C 는 한 직선 위, AC 와 BD 의 교점이 E.
 * `perp` 면 AB·DC 가 BC 에 수직이고 직각 기호를 찍는다.
 */
function figButterfly11(
  ab: number,
  dc: number,
  bcLen: number,
  perp: boolean,
  labels: Record<string, string>,
): Fig {
  const k = 128 / Math.max(ab, dc, bcLen * 0.72);
  const B: XY = [0, 0];
  const C: XY = [bcLen * k, 0];
  const A: XY = [perp ? 0 : -14, ab * k];
  const D: XY = [perp ? bcLen * k : bcLen * k + 14, dc * k];
  const ef = (ab * dc) / (ab + dc);
  const fx = (bcLen * ab) / (ab + dc);
  const F: XY = [fx * k, 0];
  const E: XY = [fx * k, ef * k];
  const pts: Record<string, XY> = { A, B, C, D, E, F };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
  };
  const anchors: Record<string, XY> = {
    ab: [A[0] - 22, (ab * k) / 2],
    dc: [D[0] + 22, (dc * k) / 2],
    bc: [(bcLen * k) / 2, -18],
  };
  const angles: Record<string, unknown> = perp
    ? {
        // BC 를 F 에서 끊었으므로 직각기호는 BF·FC 를 광선으로 쓴다.
        rB: { vertex: "B", points: ["A", "F"], right: true },
        rC: { vertex: "C", points: ["D", "F"], right: true },
      }
    : {};
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      EF: { points: ["E", "F"], parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      BF: ["B", "F"],
      FC: ["F", "C"],
      AC: ["A", "C"],
      BD: ["B", "D"],
    },
    angles,
    labels: out,
  };
  return withDims(shape, dimsOf(labels, anchors)) as Fig;
}

export const M2_GEO_SIM: TypeEntry[] = [
  // ── 삼각형의 닮음 조건 (2B 마크 문법: 같은 각 호·직각 기호) ──────────
  def(
    MINOR_SIM,
    "09",
    "삼각형의 닮음 조건",
    SEC.닮음조건,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const k = intBetween(rng, 2, 4);
        const ab = intBetween(rng, 3, 9);
        const bc = attempt(40, () => {
          const v = intBetween(rng, 3, 9);
          return v !== ab ? v : null;
        });
        const de = k * ab;
        const x = k * bc;
        return {
          content: `두 삼각형 $ABC$와 $DEF$에서 $\\angle B=\\angle E$이고 $\\overline{AB}:\\overline{DE}=\\overline{BC}:\\overline{EF}$이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{DE}=${de}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{EF}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `두 쌍의 대응변의 길이의 비가 같고 그 끼인각의 크기가 같으므로 삼각형 $ABC$와 삼각형 $DEF$는 $\\mathrm{SAS}$ 닮음이다.\n닮음비는 $\\overline{AB}:\\overline{DE}=${ab}:${de}=1:${k}$이므로 $\\overline{EF}=${k}\\times${bc}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, k, ab, bc, de, x },
          figureSpec: figSimPair09(k, 0, {
            ab: `${ab} cm`,
            bc: `${bc} cm`,
            de: `${de} cm`,
          }),
        };
      }
      const p = intBetween(rng, 35, 70);
      const q = attempt(40, () => {
        const v = intBetween(rng, 35, 70);
        return 180 - p - v >= 20 ? v : null;
      });
      const x = 180 - p - q;
      return {
        content: `두 삼각형 $ABC$와 $DEF$에서 $\\angle A=\\angle D=${p}^\\circ$, $\\angle B=\\angle E=${q}^\\circ$이다. 이때 $\\angle F$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `두 쌍의 대응각의 크기가 각각 같으므로 삼각형 $ABC$와 삼각형 $DEF$는 $\\mathrm{AA}$ 닮음이다.\n삼각형 $DEF$의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle F=180^\\circ-${p}^\\circ-${q}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, p, q, x },
        figureSpec: figSimPair09(
          1.35,
          1,
          { angA: `${p}°`, angB: `${q}°` },
          { p, q },
        ),
      };
    },
  ),

  def(
    MINOR_SIM,
    "10",
    "삼각형의 닮음을 이용하여 변의 길이 구하기 닮음",
    SEC.닮음조건,
    "응용",
    (rng): Body => {
      const k = intBetween(rng, 2, 3);
      const p = intBetween(rng, 3, 8);
      const r = attempt(60, () => {
        const v = intBetween(rng, 3, 8);
        return k * v > p && k * p > v ? v : null;
      });
      const ab = k * r;
      const ac = k * p;
      const m = intBetween(rng, 4, 9);
      const x = k * m;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위, 점 $E$는 $\\overline{AC}$ 위의 점이다. $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{DB}=${ab - p}\\,\\mathrm{cm}$, $\\overline{AE}=${r}\\,\\mathrm{cm}$, $\\overline{EC}=${ac - r}\\,\\mathrm{cm}$, $\\overline{DE}=${m}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}=${p}+${ab - p}=${ab}\\,(\\mathrm{cm})$, $\\overline{AC}=${r}+${ac - r}=${ac}\\,(\\mathrm{cm})$이다.\n삼각형 $ADE$와 삼각형 $ACB$에서 $\\angle A$는 공통이고 $\\overline{AD}:\\overline{AC}=${p}:${ac}=1:${k}$, $\\overline{AE}:\\overline{AB}=${r}:${ab}=1:${k}$이므로 두 삼각형은 $\\mathrm{SAS}$ 닮음이다.\n따라서 $\\overline{BC}=${k}\\times\\overline{DE}=${k}\\times${m}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode: 0, k, p, r, ab, ac, m, x, db: ab - p, ec: ac - r },
        figureSpec: figSasInner10(p, ab, r, ac, {
          ad: `${p} cm`,
          db: `${ab - p} cm`,
          ae: `${r} cm`,
          ec: `${ac - r} cm`,
          de: `${m} cm`,
        }),
      };
    },
  ),

  def(
    MINOR_SIM,
    "11",
    "삼각형의 닮음을 이용하여 변의 길이 구하기 닮음",
    SEC.닮음조건,
    "응용",
    (rng): Body => {
      // 닮음비 1:k 로 **구성**한다 — BC=k·BD, BA=k·BE 면 BD·BA=BE·BC 가 항상 성립.
      // 「나누어떨어질 때까지 다시 뽑기」로 하면 던진다(실측: 씨앗 하나가 소진).
      const k = intBetween(rng, 2, 3);
      const d = intBetween(rng, 3, 9);
      const e = attempt(40, () => {
        const v = intBetween(rng, 3, 9);
        // d=e 면 BA=BC 라 DE∥AC 가 되어 «엇각 닮음»이 아닌 다른 유형이 된다.
        if (v === d) return null;
        // ⚠️ 점 $D$ 는 $\overline{AB}$ **위**, $E$ 는 $\overline{BC}$ **위**의 점이다. 그러니
        //    $\overline{DA}=ke-d$ 와 $\overline{EC}=kd-e$ 가 **둘 다 양수**여야 한다.
        //    안 그러면 발문에 「$\overline{DA}=-2\,\mathrm{cm}$」 같은 **음수 길이**가 나가고
        //    그림도 그렇게 그려진다(실측 2026-08-24: 씨앗 60개 중 4). 값이 «맞는» 결함이라
        //    지면을 봐야 드러난다 — `probe-middle-page-smells.ts` 가 `+-` 로 걸어 줬다.
        return k * v - d >= 1 && k * d - v >= 1 ? v : null;
      });
      const a = k * e - d;
      const bc = k * d;
      const x = bc - e;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위, 점 $E$는 $\\overline{BC}$ 위의 점이고 $\\angle BDE=\\angle C$이다. $\\overline{BD}=${d}\\,\\mathrm{cm}$, $\\overline{DA}=${a}\\,\\mathrm{cm}$, $\\overline{BE}=${e}\\,\\mathrm{cm}$일 때, $\\overline{EC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $BDE$와 삼각형 $BCA$에서 $\\angle B$는 공통이고 $\\angle BDE=\\angle BCA$이므로 두 삼각형은 $\\mathrm{AA}$ 닮음이다.\n$\\overline{BD}:\\overline{BC}=\\overline{BE}:\\overline{BA}$이므로 $${d}\\times(${d}+${a})=${e}\\times\\overline{BC}$에서 $\\overline{BC}=${bc}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{EC}=${bc}-${e}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode: 0, k, d, a, e, bc, x },
        figureSpec: figAaInner11(d, d + a, e, bc, {
          bd: `${d} cm`,
          da: `${a} cm`,
          be: `${e} cm`,
        }),
      };
    },
  ),

  def(
    MINOR_SIM,
    "12",
    "직각삼각형의 닮음",
    SEC.닮음조건,
    "응용",
    (rng): Body => {
      // 닮음비 j:i 로 **구성**한다 — AD=j·s·BE=i·s·EC=i·t·BD=j·t 면
      // AD:BE = DB:EC = j:i 가 항상 성립한다. 「나누어떨어질 때까지 다시
      // 뽑기」로 하면 던진다(실측: 비를 묶자마자 소진됐다).
      const [i, j] = pick(rng, SIM12_RATIOS);
      const [u, v, w, x] = attempt(80, () => {
        const a1 = intBetween(rng, 1, 4);
        const b1 = intBetween(rng, 1, 4);
        const ad = j * a1;
        const be = i * a1;
        const ec = i * b1;
        const bd = j * b1;
        const ok =
          ad >= 3 &&
          ad <= 16 &&
          be >= 2 &&
          be <= 16 &&
          ec >= 3 &&
          ec <= 16 &&
          bd >= 2 &&
          bd <= 16 &&
          // BD:BE 가 크게 벌어지면 B 가 한쪽 끝에 몰려 지면이 안 읽힌다(실렌더).
          bd <= 3 * be &&
          3 * bd >= be;
        return ok ? ([ad, be, ec, bd] as const) : null;
      });
      return {
        content: `그림과 같이 $\\angle ABC=90^\\circ$인 직각삼각형 $ABC$의 두 꼭짓점 $A$, $C$에서 꼭짓점 $B$를 지나는 직선에 내린 수선의 발을 각각 $D$, $E$라 하자. $\\overline{AD}=${u}\\,\\mathrm{cm}$, $\\overline{BE}=${v}\\,\\mathrm{cm}$, $\\overline{CE}=${w}\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ADB$와 삼각형 $BEC$에서 $\\angle ADB=\\angle BEC=90^\\circ$이고, $\\angle ABD=90^\\circ-\\angle CBE=\\angle BCE$이므로 두 삼각형은 $\\mathrm{AA}$ 닮음이다.\n$\\overline{AD}:\\overline{BE}=\\overline{DB}:\\overline{EC}$이므로 $${u}\\times${w}=${v}\\times\\overline{BD}$에서 $\\overline{BD}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { mode: 0, u, v, w, x },
        figureSpec: figRightFeet12(u, x, v, w, {
          ad: `${u} cm`,
          be: `${v} cm`,
          ce: `${w} cm`,
        }),
      };
    },
  ),

  def(
    MINOR_SIM,
    "13",
    "직각삼각형의 닮음의 응용",
    SEC.닮음조건,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const [bh, ch] = pick(rng, SIM13_FEET);
        const ah = Math.round(Math.sqrt(bh * ch));
        return {
          content: `그림과 같이 $\\angle A=90^\\circ$인 직각삼각형 $ABC$에서 꼭짓점 $A$에서 빗변 $BC$에 내린 수선의 발을 $H$라 하자. $\\overline{BH}=${bh}\\,\\mathrm{cm}$, $\\overline{CH}=${ch}\\,\\mathrm{cm}$일 때, $\\overline{AH}$의 길이를 구하시오.`,
          answer: `$${ah}\\,\\mathrm{cm}$`,
          solution: `삼각형 $ABH$와 삼각형 $CAH$는 $\\mathrm{AA}$ 닮음이므로 $\\overline{AH}^{\\,2}=\\overline{BH}\\times\\overline{CH}$이다.\n$\\overline{AH}^{\\,2}=${bh}\\times${ch}=${bh * ch}$이므로 $\\overline{AH}=${ah}\\,\\mathrm{cm}$이다.`,
          facts: { mode, ah, bh, ch, x: ah },
          figureSpec: figAltitude13(bh, ch, ah, {
            bh: `${bh} cm`,
            ch: `${ch} cm`,
          }),
        };
      }
      const [a, b] = pick(rng, SIM13_LEGS);
      const ah = a * b;
      const bh = a * a;
      const ch = b * b;
      const bcLen = a * a + b * b;
      const hyp = Math.round(Math.sqrt(bcLen));
      const ab = a * hyp;
      const ac = b * hyp;
      const x = ch + ac;
      return {
        content: `그림과 같이 $\\angle A=90^\\circ$인 직각삼각형 $ABC$에서 $\\overline{AH}\\perp\\overline{BC}$이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AH}=${ah}\\,\\mathrm{cm}$, $\\overline{BH}=${bh}\\,\\mathrm{cm}$일 때, $\\overline{CH}+\\overline{AC}$의 값을 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AH}^{\\,2}=\\overline{BH}\\times\\overline{CH}$이므로 $${ah}^{2}=${bh}\\times\\overline{CH}$에서 $\\overline{CH}=${ch}\\,\\mathrm{cm}$이다.\n$\\overline{BC}=${bh}+${ch}=${bcLen}\\,(\\mathrm{cm})$이고 $\\overline{AC}^{\\,2}=\\overline{CH}\\times\\overline{CB}=${ch}\\times${bcLen}=${ch * bcLen}$이므로 $\\overline{AC}=${ac}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{CH}+\\overline{AC}=${ch}+${ac}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, a, b, ah, bh, ch, ab, ac, x },
        figureSpec: figAltitude13(bh, ch, ah, {
          bh: `${bh} cm`,
          ah: `${ah} cm`,
          ab: `${ab} cm`,
        }),
      };
    },
  ),

  def(MINOR_SIM, "14", "닮음의 활용", SEC.닮음조건, "응용", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      // 나무 높이를 cm 로 재면 지면이 우스워진다 — 전부 m 로 쓰고,
      // 그림자 비를 정수배로 **구성**해 답이 항상 정수가 되게 한다.
      //
      // 막대의 높이와 그림자가 같으면($1:1$) 나무의 높이가 곧 나무의 그림자라 답이 발문에
      // 그대로 있고, 우연히 막대의 그림자와 같아도 마찬가지다(씨앗 1,000 중 8.6%,
      // 2026-09-27 — 중1 활용 07·56·57 처럼 답이 발문의 다른 길이와 겹치지 않게).
      // 통과율 84.4% — 100번이면 던질 확률 $0.156^{100}\approx10^{-81}$.
      const { poleH, poleS, treeS, x } = attempt(100, () => {
        const poleH = intBetween(rng, 1, 3);
        const poleS = intBetween(rng, 2, 6);
        const j = intBetween(rng, 4, 12);
        const treeS = poleS * j;
        const x = poleH * j;
        if (poleH === poleS || [poleH, poleS, treeS].includes(x)) return null;
        return { poleH, poleS, treeS, x };
      });
      return {
        content: `높이가 $${poleH}\\,\\mathrm{m}$인 막대를 지면에 수직으로 세웠더니 그림자의 길이가 $${poleS}\\,\\mathrm{m}$였다. 같은 시각에 어떤 나무의 그림자의 길이가 $${treeS}\\,\\mathrm{m}$일 때, 이 나무의 높이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{m}$`,
        solution: `같은 시각에 햇빛이 이루는 각의 크기가 같으므로 막대와 그림자가 이루는 삼각형과 나무와 그림자가 이루는 삼각형은 $\\mathrm{AA}$ 닮음이다.\n(막대의 높이)$:$(막대의 그림자)$=$(나무의 높이)$:$(나무의 그림자)이므로 $${poleH}:${poleS}=x:${treeS}$이다.\n$${poleS}x=${poleH}\\times${treeS}=${poleH * treeS}$이므로 $x=${x}$이다.`,
        facts: { mode, poleH, poleS, treeS, x },
        figureSpec: figShadow14(poleH, poleS, treeS, {
          poleH: `${poleH} m`,
          poleS: `${poleS} m`,
          treeS: `${treeS} m`,
        }),
      };
    }
    const n = pick(rng, [200, 500, 1000, 2000, 2500, 5000] as const);
    const l = intBetween(rng, 3, 15);
    const x = (l * n) / 100;
    return {
      content: `축척이 $\\dfrac{1}{${n}}$인 축도에서 두 지점 $A$, $B$ 사이의 거리가 $${l}\\,\\mathrm{cm}$이다. 두 지점 $A$, $B$ 사이의 실제 거리는 몇 $\\mathrm{m}$인지 구하시오.`,
      answer: `$${x}\\,\\mathrm{m}$`,
      solution: `(실제 거리)$=$(축도에서의 거리)$\\times${n}$이므로 $${l}\\times${n}=${l * n}\\,(\\mathrm{cm})$이다.\n$1\\,\\mathrm{m}=100\\,\\mathrm{cm}$이므로 실제 거리는 $${x}\\,\\mathrm{m}$이다.`,
      facts: { mode, n, l, x },
      figureSpec: null,
    };
  }),

  def(
    MINOR_SIM,
    "15",
    "접은 도형에서의 닮은 삼각형",
    SEC.닮음조건,
    "심화하",
    (rng): Body => {
      const [p, q, cd] = pick(rng, SIM15_FOLDS);
      const x = (p * cd) / q;
      return {
        content: `그림은 직사각형 모양의 종이 $ABCD$를 $\\overline{EC}$를 접는 선으로 하여 꼭짓점 $B$가 $\\overline{AD}$ 위의 점 $B'$에 오도록 접은 것이다. $\\overline{AE}=${p}\\,\\mathrm{cm}$, $\\overline{AB'}=${q}\\,\\mathrm{cm}$, $\\overline{CD}=${cd}\\,\\mathrm{cm}$일 때, $\\overline{B'D}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        // `B'` 은 「비 프라임」(받침 ㅁ)으로 읽는다 — 「$AEB'$과」(원장님 2026-09-27 「프라임으로 통일」).
        solution: `$\\angle A=\\angle D=90^\\circ$이고 $\\angle AEB'=90^\\circ-\\angle AB'E=\\angle DB'C$이므로 삼각형 $AEB'$과 삼각형 $DB'C$는 $\\mathrm{AA}$ 닮음이다.\n$\\overline{AE}:\\overline{DB'}=\\overline{AB'}:\\overline{DC}$이므로 $${p}\\times${cd}=${q}\\times\\overline{B'D}$이다.\n따라서 $\\overline{B'D}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { mode: 0, p, q, cd, x },
        figureSpec: figFoldRect15(p, q, cd, x, {
          ae: `${p} cm`,
          ap: `${q} cm`,
          cd: `${cd} cm`,
        }),
      };
    },
  ),

  // ── 평행선 사이의 선분의 길이의 비 (2B 마크 문법: 평행 ») ─────────────
  def(
    MINOR_PAR,
    "08",
    "평행선 사이의 선분의 길이의 비",
    SEC.평행선비,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 3, 12);
      const b = attempt(40, () => {
        const v = intBetween(rng, 3, 12);
        return v !== a ? v : null;
      });
      // a:b 를 기약분수로 줄인 뒤 그 배수로 c·x 를 만든다 — 나누어떨어짐이 보장된다.
      const g = gcd(a, b);
      const t = intBetween(rng, 2, 5);
      const c = (a / g) * t;
      const x = (b / g) * t;
      return {
        content: `그림과 같이 세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 각각 $A$, $B$, $C$와 $D$, $E$, $F$라 하자. $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\overline{DE}=${c}\\,\\mathrm{cm}$일 때, $\\overline{EF}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `세 평행선이 두 직선과 만나서 생긴 선분의 길이의 비는 같으므로 $\\overline{AB}:\\overline{BC}=\\overline{DE}:\\overline{EF}$이다.\n$${a}:${b}=${c}:\\overline{EF}$에서 $${a}\\times\\overline{EF}=${b}\\times${c}=${b * c}$이므로 $\\overline{EF}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { mode: 0, a, b, c, x },
        figureSpec: figThreeParallel08(a, b, {
          a: `${a} cm`,
          b: `${b} cm`,
          c: `${c} cm`,
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "09",
    "사다리꼴에서 평행선 사이의 선분의 길이의 비",
    SEC.평행선비,
    "응용",
    (rng): Body => {
      const m = intBetween(rng, 2, 9);
      const n = intBetween(rng, 2, 9);
      const p = intBetween(rng, 4, 14);
      let remaining = 120;
      const q = attempt(120, () => {
        remaining -= 1;
        const v = intBetween(rng, p + 2, p + 20);
        if ((n * p + m * v) % (m + n) === 0) return v;
        if (remaining > 0) return null;
        // 정수인 후보의 간격 (m+n)/gcd(m,n)은 최대 17이므로 19칸 안에
        // 반드시 있다. 마지막 표본으로 고르면 추가 난수 없이 소진만 구제한다.
        const candidates = Array.from(
          { length: 19 },
          (_, i) => p + 2 + i,
        ).filter((candidate) => (n * p + m * candidate) % (m + n) === 0);
        return candidates[(v - p - 2) % candidates.length]!;
      });
      const x = (n * p + m * q) / (m + n);
      return {
        content: `그림과 같은 사다리꼴 $ABCD$에서 $\\overline{AD}\\parallel\\overline{EF}\\parallel\\overline{BC}$이다. $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{BC}=${q}\\,\\mathrm{cm}$, $\\overline{AE}=${m}\\,\\mathrm{cm}$, $\\overline{EB}=${n}\\,\\mathrm{cm}$일 때, $\\overline{EF}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `점 $A$를 지나고 $\\overline{DC}$에 평행한 직선이 $\\overline{EF}$, $\\overline{BC}$와 만나는 점을 각각 $G$, $H$라 하면 $\\overline{GF}=\\overline{AD}=${p}\\,\\mathrm{cm}$이다.\n삼각형 $ABH$에서 $\\overline{EG}:\\overline{BH}=\\overline{AE}:\\overline{AB}=${m}:${m + n}$이고 $\\overline{BH}=${q}-${p}=${q - p}\\,(\\mathrm{cm})$이므로 $\\overline{EG}=${q - p}\\times\\dfrac{${m}}{${m + n}}=\\dfrac{${m * (q - p)}}{${m + n}}\\,(\\mathrm{cm})$이다.\n따라서 $\\overline{EF}=${p}+\\dfrac{${m * (q - p)}}{${m + n}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode: 0, m, n, p, q, x },
        figureSpec: figTrapMid09(p, q, m / (m + n), {
          labels: {
            ad: `${p} cm`,
            bc: `${q} cm`,
            ae: `${m} cm`,
            eb: `${n} cm`,
          },
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "10",
    "사다리꼴에서 평행선 사이의 선분의 길이의 비의 응용",
    SEC.평행선비,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const [p, q] = pick(rng, HARMONIC_PAIRS);
        const x = (2 * p * q) / (p + q);
        return {
          content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 점 $O$는 두 대각선의 교점이고 $\\overline{EF}$는 점 $O$를 지난다. $\\overline{EF}\\parallel\\overline{BC}$이고 $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{BC}=${q}\\,\\mathrm{cm}$일 때, $\\overline{EF}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `삼각형 $AOD$와 삼각형 $COB$는 $\\mathrm{AA}$ 닮음이므로 $\\overline{AO}:\\overline{CO}=\\overline{AD}:\\overline{CB}=${p}:${q}$이다.\n삼각형 $ABC$에서 $\\overline{EO}=${q}\\times\\dfrac{${p}}{${p + q}}=\\dfrac{${p * q}}{${p + q}}\\,(\\mathrm{cm})$이고, 같은 방법으로 $\\overline{OF}=\\dfrac{${p * q}}{${p + q}}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{EF}=2\\times\\dfrac{${p * q}}{${p + q}}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, p, q, x },
          figureSpec: figTrapMid09(p, q, p / (p + q), {
            diag: true,
            labels: { ad: `${p} cm`, bc: `${q} cm` },
          }),
        };
      }
      const [p, x] = pick(rng, HARMONIC_PAIRS);
      const ef = (2 * p * x) / (p + x);
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 점 $O$는 두 대각선의 교점이고 $\\overline{EF}$는 점 $O$를 지난다. $\\overline{EF}\\parallel\\overline{BC}$이고 $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{EF}=${ef}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{EF}$가 두 대각선의 교점을 지나므로 $\\dfrac{2}{\\overline{EF}}=\\dfrac{1}{\\overline{AD}}+\\dfrac{1}{\\overline{BC}}$이다.\n$\\dfrac{2}{${ef}}-\\dfrac{1}{${p}}=\\dfrac{1}{\\overline{BC}}$이므로 $\\overline{BC}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { mode, p, ef, x },
        figureSpec: figTrapMid09(p, x, p / (p + x), {
          diag: true,
          labels: { ad: `${p} cm`, ef: `${ef} cm` },
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "11",
    "평행선 사이의 선분의 길이의 비의 응용",
    SEC.평행선비,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const [a, b] = pick(rng, RECIPROCAL_PAIRS);
        const x = (a * b) / (a + b);
        return {
          content: `그림에서 $\\overline{AB}\\parallel\\overline{EF}\\parallel\\overline{DC}$이고 $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{CD}=${b}\\,\\mathrm{cm}$일 때, $\\overline{EF}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `삼각형 $ABE$와 삼각형 $CDE$는 $\\mathrm{AA}$ 닮음이므로 $\\overline{BE}:\\overline{DE}=${a}:${b}$이다.\n삼각형 $BCD$에서 $\\overline{EF}\\parallel\\overline{DC}$이므로 $\\overline{EF}:${b}=\\overline{BE}:\\overline{BD}=${a}:${a + b}$이다.\n따라서 $\\overline{EF}=\\dfrac{${a}\\times${b}}{${a + b}}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, a, b, x },
          figureSpec: figButterfly11(a, b, a + b, false, {
            ab: `${a} cm`,
            dc: `${b} cm`,
          }),
        };
      }
      const [a, b] = pick(rng, RECIPROCAL_PAIRS);
      const bcLen = attempt(80, () => {
        const v = 2 * intBetween(rng, 4, 14);
        return ((v * a * b) / (a + b)) % 2 === 0 ? v : null;
      });
      const ef = (a * b) / (a + b);
      const x = (bcLen * ef) / 2;
      return {
        content: `그림에서 $\\overline{AB}$와 $\\overline{CD}$가 모두 $\\overline{BC}$에 수직이고 $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{CD}=${b}\\,\\mathrm{cm}$, $\\overline{BC}=${bcLen}\\,\\mathrm{cm}$이다. $\\overline{AC}$와 $\\overline{BD}$의 교점을 $E$라 할 때, 삼각형 $EBC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `점 $E$에서 $\\overline{BC}$에 내린 수선의 발을 $F$라 하면 $\\overline{AB}\\parallel\\overline{EF}\\parallel\\overline{DC}$이므로 $\\overline{EF}=\\dfrac{${a}\\times${b}}{${a}+${b}}=${ef}\\,(\\mathrm{cm})$이다.\n삼각형 $EBC$는 밑변이 $\\overline{BC}$, 높이가 $\\overline{EF}$이므로 넓이는 $\\dfrac{1}{2}\\times${bcLen}\\times${ef}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, a, b, bcLen, x },
        figureSpec: figButterfly11(a, b, bcLen, true, {
          ab: `${a} cm`,
          dc: `${b} cm`,
          bc: `${bcLen} cm`,
        }),
      };
    },
  ),

  // ── 도형의 닮음 ───────────────────────────────────────────
  def(MINOR_SIM, "01", "닮은 도형", SEC.닮은도형, "기본", (rng): Body => {
    const perm = intBetween(rng, 0, 5);
    const si = intBetween(rng, 0, 2);
    const ai = intBetween(rng, 0, 2);
    const rhs = SIM01_PERMS[perm]!;
    const lhs = ["A", "B", "C"] as const;
    const sidePairs = [
      [0, 1],
      [1, 2],
      [2, 0],
    ] as const;
    const [i1, i2] = sidePairs[si]!;
    const askedSide = `${lhs[i1]}${lhs[i2]}`;
    const matchedSide = `${rhs[i1]}${rhs[i2]}`;
    const askedAngle = lhs[ai];
    const matchedAngle = rhs[ai];
    return {
      content: `$\\triangle ABC\\backsim\\triangle ${rhs.join("")}$일 때, $\\overline{${askedSide}}$의 대응변과 $\\angle ${askedAngle}$의 대응각을 차례대로 구하시오.`,
      answer: `$\\overline{${matchedSide}}$, $\\angle ${matchedAngle}$`,
      solution: `닮음 기호에 적힌 순서가 대응 순서다. 점 $${lhs[0]}$, $${lhs[1]}$, $${lhs[2]}$의 대응점은 각각 점 $${rhs[0]}$, $${rhs[1]}$, $${rhs[2]}$이다.\n따라서 $\\overline{${askedSide}}$의 대응변은 $\\overline{${matchedSide}}$이고, $\\angle ${askedAngle}$의 대응각은 $\\angle ${matchedAngle}$이다.`,
      facts: { perm, si, ai },
      figureSpec: null,
    };
  }),

  def(
    MINOR_SIM,
    "02",
    "평면도형에서 닮음의 성질",
    SEC.닮은도형,
    "기본",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const k1 = intBetween(rng, 2, 5);
      const k2 = intBetween(rng, 2, 5);
      const bc = p * k1;
      const ef = q * k1;
      const ab = p * k2;
      const x = q * k2;
      return {
        content: `그림에서 $\\triangle ABC\\backsim\\triangle DEF$이고 $\\overline{BC}=${bc}\\,\\mathrm{cm}$, $\\overline{EF}=${ef}\\,\\mathrm{cm}$이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BC}$의 대응변은 $\\overline{EF}$이므로 닮음비는 $${bc}:${ef}=${p}:${q}$이다.\n$\\overline{AB}:\\overline{DE}=${p}:${q}$이므로 $\\overline{DE}=${ab}${timesFrac(q, p)}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { bc, ef, ab, x },
        figureSpec: figSim02(p, q, {
          bc: `${bc} cm`,
          ef: `${ef} cm`,
          ab: `${ab} cm`,
          de: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_SIM,
    "03",
    "입체도형에서 닮음의 성질",
    SEC.닮은도형,
    "응용",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const k = intBetween(rng, 2, 4);
      const k2 = intBetween(rng, 2, 5);
      const k3 = intBetween(rng, 2, 5);
      const a1 = p * k;
      const a2 = q * k;
      const b1 = p * k2;
      const c1 = p * k3;
      const x = q * (k2 + k3);
      return {
        content: `서로 닮은 두 직육면체 $A$, $B$에서 직육면체 $A$의 가로의 길이는 $${a1}\\,\\mathrm{cm}$, 직육면체 $B$의 가로의 길이는 $${a2}\\,\\mathrm{cm}$이다. 직육면체 $A$의 세로의 길이가 $${b1}\\,\\mathrm{cm}$, 높이가 $${c1}\\,\\mathrm{cm}$일 때, 직육면체 $B$의 세로의 길이와 높이의 합을 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `닮음비는 $${a1}:${a2}=${p}:${q}$이다.\n직육면체 $B$의 세로의 길이는 $${b1}${timesFrac(q, p)}=${(b1 * q) / p}\\,(\\mathrm{cm})$, 높이는 $${c1}${timesFrac(q, p)}=${(c1 * q) / p}\\,(\\mathrm{cm})$이다.\n따라서 합은 $${(b1 * q) / p}+${(c1 * q) / p}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a1, a2, b1, c1, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "04",
    "원뿔 또는 원기둥의 닮음비",
    SEC.닮은도형,
    "응용",
    (rng): Body => {
      const [m, n] = pick(rng, [
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 4],
        [2, 5],
        [3, 5],
      ] as const);
      const k = intBetween(rng, 1, 4);
      const r1 = m * k;
      const R = n * k;
      const area = R * R;
      return {
        content: `원뿔을 밑면에 평행한 평면으로 잘랐더니, 단면인 원의 중심에서 꼭짓점까지의 거리가 원뿔의 높이의 $\\dfrac{${m}}{${n}}$이었다. 단면인 원의 반지름의 길이가 $${r1}\\,\\mathrm{cm}$일 때, 처음 원뿔의 밑면의 넓이를 구하시오.`,
        answer: `$${area}\\pi\\,\\mathrm{cm}^2$`,
        solution: `잘라 낸 작은 원뿔과 처음 원뿔은 닮은 도형이고 닮음비는 $${m}:${n}$이다.\n밑면의 반지름의 길이의 비도 $${m}:${n}$이므로 처음 원뿔의 밑면의 반지름의 길이는 $${r1}${timesFrac(n, m)}=${R}\\,(\\mathrm{cm})$이다.\n따라서 밑면의 넓이는 $\\pi\\times${R}^2=${area}\\pi\\,(\\mathrm{cm}^2)$이다.`,
        facts: { m, n, r1, R, area },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "05",
    "닮은 두 평면도형의 넓이의 비",
    SEC.넓이부피비,
    "기본",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const t = intBetween(rng, 2, 4);
      const k = intBetween(rng, 2, 5);
      const ab = p * t;
      const ad = q * t;
      const s = p * p * k;
      const x = q * q * k;
      return {
        content: `그림에서 $\\triangle ABC\\backsim\\triangle ADE$이고 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AD}=${ad}\\,\\mathrm{cm}$이다. $\\triangle ABC$의 넓이가 $${s}\\,\\mathrm{cm}^2$일 때, $\\triangle ADE$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `닮음비는 $\\overline{AB}:\\overline{AD}=${p}:${q}$이므로 넓이의 비는 $${p * p}:${q * q}$이다.\n$\\triangle ADE$의 넓이는 $${s}${timesFrac(q * q, p * p)}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { ab, ad, s, x },
        figureSpec: figSim05(ab, ad),
      };
    },
  ),

  def(
    MINOR_SIM,
    "06",
    "닮은 두 입체도형의 겉넓이의 비와 부피의 비",
    SEC.넓이부피비,
    "응용",
    (rng): Body => {
      const [p, q] = pick(rng, [
        [2, 3],
        [3, 4],
        [1, 2],
        [2, 5],
        [3, 5],
      ] as const);
      const k = intBetween(rng, 2, 6);
      const w = intBetween(rng, 1, 4);
      const s1 = p * p * k;
      const s2 = q * q * k;
      const v1 = p * p * p * w;
      const x = q * q * q * w;
      return {
        content: `서로 닮은 두 직육면체 $A$, $B$의 겉넓이가 각각 $${s1}\\,\\mathrm{cm}^2$, $${s2}\\,\\mathrm{cm}^2$이다. 직육면체 $A$의 부피가 $${v1}\\,\\mathrm{cm}^3$일 때, 직육면체 $B$의 부피를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^3$`,
        solution: `겉넓이의 비가 $${s1}:${s2}=${p * p}:${q * q}$이므로 닮음비는 $${p}:${q}$이다.\n부피의 비는 $${p * p * p}:${q * q * q}$이므로 직육면체 $B$의 부피는 $${v1}${timesFrac(q * q * q, p * p * p)}=${x}\\,(\\mathrm{cm}^3)$이다.`,
        facts: { s1, s2, v1, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "07",
    "닮은 두 평면도형의 넓이의 비의 활용",
    SEC.넓이부피비,
    "기본",
    (rng): Body => {
      const [p, q] = pick(rng, [
        [4, 5],
        [2, 3],
        [3, 4],
        [1, 2],
        [3, 5],
      ] as const);
      const u = pick(rng, [2, 4] as const);
      const d1 = p * u;
      const d2 = q * u;
      const w = 100 * intBetween(rng, 3, 8);
      const c1 = p * p * w;
      const x = q * q * w;
      const food = pick(rng, ["피자", "팬케이크", "와플"] as const);
      return {
        content: `어느 가게에서 지름의 길이가 $${d1}\\,\\mathrm{cm}$인 원 모양 ${food} 한 판의 가격은 $${c1}$원이다. ${food}의 가격이 ${food}의 넓이에 정비례할 때, 지름의 길이가 $${d2}\\,\\mathrm{cm}$인 ${food} 한 판의 가격을 구하시오. (단, ${food}의 두께는 생각하지 않는다.)`,
        answer: `$${x}$원`,
        solution: `두 ${food}는 닮은 도형이고 닮음비는 $${d1}:${d2}=${p}:${q}$이므로 넓이의 비는 $${p * p}:${q * q}$이다.\n가격이 넓이에 정비례하므로 구하는 가격은 $${c1}${timesFrac(q * q, p * p)}=${x}$(원)이다.`,
        facts: { d1, d2, c1, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "08",
    "닮은 두 입체도형의 겉넓이의 비와 부피의 비의 활용",
    SEC.넓이부피비,
    "심화하",
    (rng): Body => {
      const m = intBetween(rng, 2, 4);
      const v = intBetween(rng, 1, 5);
      const x = v * (m * m * m - 1);
      return {
        content: `원뿔 모양의 빈 물통에 물 $${v}\\,\\mathrm{L}$를 부었더니 물의 높이가 물통의 높이의 $\\dfrac{1}{${m}}$이 되었다. 이 물통에 물을 가득 채우려면 물을 몇 $\\mathrm{L}$ 더 부어야 하는지 구하시오. (단, 물통의 두께는 생각하지 않는다.)`,
        answer: `$${x}\\,\\mathrm{L}$`,
        solution: `물이 찬 부분과 물통 전체는 닮은 원뿔이고 닮음비는 $1:${m}$이므로 부피의 비는 $1:${m * m * m}$이다.\n물통 전체의 부피는 $${v}\\times${m * m * m}=${v * m * m * m}\\,(\\mathrm{L})$이다.\n따라서 더 부어야 하는 물의 양은 $${v * m * m * m}-${v}=${x}\\,(\\mathrm{L})$이다.`,
        facts: { v, m, x },
        figureSpec: null,
      };
    },
  ),

  // ── 평행선 사이의 선분의 길이의 비 ────────────────────────
  def(
    MINOR_PAR,
    "01",
    "삼각형에서 평행선 사이의 선분의 길이의 비⑴",
    SEC.삼평행비,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const [p, q] = pick(rng, COPRIME_UP);
      if (mode === 0) {
        const k = intBetween(rng, 1, 3);
        const t = intBetween(rng, 2, 5);
        const a = p * k;
        const b = q * k;
        const e = p * t;
        const x = q * t;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $E$는 각각 $\\overline{AB}$, $\\overline{AC}$ 위의 점이고 $\\overline{BC}\\parallel\\overline{DE}$이다. $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{DB}=${b}\\,\\mathrm{cm}$, $\\overline{AE}=${e}\\,\\mathrm{cm}$일 때, $\\overline{EC}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `$\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AD}:\\overline{DB}=\\overline{AE}:\\overline{EC}$이다.\n$${a}:${b}=${e}:\\overline{EC}$에서 $\\overline{EC}=${e}${timesFrac(b, a)}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, a, b, e, x },
          figureSpec: figPar01(a / (a + b), {
            ad: `${a} cm`,
            db: `${b} cm`,
            ae: `${e} cm`,
            ec: "x cm",
          }),
        };
      }
      const t = intBetween(rng, 1, 3);
      const s = intBetween(rng, 2, 5);
      const a = p * t;
      const c = (p + q) * t;
      const bc = (p + q) * s;
      const x = p * s;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $E$는 각각 $\\overline{AB}$, $\\overline{AC}$ 위의 점이고 $\\overline{BC}\\parallel\\overline{DE}$이다. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AD}:\\overline{AB}=\\overline{DE}:\\overline{BC}$이다.\n$\\overline{DE}=${bc}\\times\\dfrac{${a}}{${c}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, a, c, bc, x },
        figureSpec: figPar01(a / c, {
          ad: `${a} cm`,
          bc: `${bc} cm`,
          de: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "02",
    "삼각형에서 평행선 사이의 선분의 길이의 비⑵",
    SEC.삼평행비,
    "응용",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const t = intBetween(rng, 1, 3);
      const s = intBetween(rng, 2, 5);
      const ab = (p + q) * t;
      const ae = p * t;
      const bc = (p + q) * s;
      const x = p * s;
      return {
        content: `그림과 같이 두 선분 $BE$, $CD$의 교점을 $A$라 하자. $\\overline{BC}\\parallel\\overline{DE}$이고 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AE}=${ae}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AB}:\\overline{AE}=\\overline{BC}:\\overline{DE}$이다.\n$\\overline{DE}=${bc}\\times\\dfrac{${ae}}{${ab}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { ab, ae, bc, x },
        figureSpec: figPar02(ae / ab, {
          ab: `${ab} cm`,
          ae: `${ae} cm`,
          bc: `${bc} cm`,
          de: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "03",
    "삼각형에서 평행선 사이의 선분의 길이의 비의 응용 ⑴",
    SEC.삼평행비,
    "심화하",
    (rng): Body => {
      const [g1u, g2u] = pick(rng, COPRIME_UP);
      const m = intBetween(rng, 2, 4);
      const k = intBetween(rng, 1, 3);
      const g1 = g1u * m;
      const g2 = g2u * m;
      const dTotal = (g1u + g2u) * k;
      const x = g2u * k;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\overline{BC}\\parallel\\overline{DE}$이고, 점 $G$는 $\\overline{BC}$ 위의 점, 점 $F$는 $\\overline{AG}$와 $\\overline{DE}$의 교점이다. $\\overline{BG}=${g1}\\,\\mathrm{cm}$, $\\overline{GC}=${g2}\\,\\mathrm{cm}$, $\\overline{DE}=${dTotal}\\,\\mathrm{cm}$일 때, $\\overline{FE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DF}:\\overline{BG}=\\overline{AF}:\\overline{AG}=\\overline{FE}:\\overline{GC}$이므로 $\\overline{DF}:\\overline{FE}=\\overline{BG}:\\overline{GC}=${g1}:${g2}$이다.\n$\\overline{FE}=${dTotal}\\times\\dfrac{${g2}}{${g1 + g2}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { g1, g2, d: dTotal, x },
        figureSpec: figPar03(g1, g2, {
          g1: `${g1} cm`,
          g2: `${g2} cm`,
          fe: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "04",
    "삼각형에서 평행선 사이의 선분의 길이의 비의 응용⑵",
    SEC.삼평행비,
    "심화하",
    (rng): Body => {
      const [f1, f2] = pick(rng, [
        [9, 3],
        [8, 4],
        [4, 2],
        [16, 4],
        [12, 6],
        [25, 5],
        [18, 6],
        [16, 8],
        [9, 6],
      ] as const);
      const x = ((f1 + f2) * f2) / f1;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $F$는 $\\overline{AB}$ 위의 점, 점 $E$는 $\\overline{AC}$ 위의 점이고 $\\overline{BC}\\parallel\\overline{DE}$, $\\overline{DC}\\parallel\\overline{FE}$이다. $\\overline{AF}=${f1}\\,\\mathrm{cm}$, $\\overline{FD}=${f2}\\,\\mathrm{cm}$일 때, $\\overline{DB}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ADC$에서 $\\overline{DC}\\parallel\\overline{FE}$이므로 $\\overline{AE}:\\overline{EC}=\\overline{AF}:\\overline{FD}=${f1}:${f2}$이다.\n삼각형 $ABC$에서 $\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AD}:\\overline{DB}=\\overline{AE}:\\overline{EC}=${f1}:${f2}$이다.\n$\\overline{AD}=${f1 + f2}\\,\\mathrm{cm}$이므로 $\\overline{DB}=${f1 + f2}\\times\\dfrac{${f2}}{${f1}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { f1, f2, x },
        figureSpec: figPar04(f1, f2),
      };
    },
  ),

  def(
    MINOR_PAR,
    "05",
    "삼각형에서 평행한 선분 찾기",
    SEC.삼평행비,
    "응용",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const t = intBetween(rng, 1, 3);
      const s = intBetween(rng, 2, 5);
      const a = p * t;
      const c = (p + q) * t;
      const f = (p + q) * s;
      const x = p * s;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $E$는 각각 $\\overline{AB}$, $\\overline{AC}$ 위의 점이다. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{AC}=${f}\\,\\mathrm{cm}$일 때, $\\overline{BC}\\parallel\\overline{DE}$가 되도록 하는 $\\overline{AE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}:\\overline{AB}=\\overline{AE}:\\overline{AC}$이면 $\\overline{BC}\\parallel\\overline{DE}$이다.\n$${a}:${c}=\\overline{AE}:${f}$에서 $\\overline{AE}=${f}\\times\\dfrac{${a}}{${c}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a, c, f, x },
        figureSpec: figPar01(a / c, { ad: `${a} cm`, ae: "x cm" }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "06",
    "삼각형의 내각의 이등분선의 성질",
    SEC.각이등분,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const [pu, qu] = pick(rng, [
        [3, 2],
        [4, 3],
        [5, 4],
        [2, 1],
        [5, 3],
        [6, 5],
      ] as const);
      const u = intBetween(rng, 2, 4);
      const ab = pu * u;
      const ac = qu * u;
      if (mode === 0) {
        const k = intBetween(rng, 1, 3);
        const bd = pu * k;
        const x = qu * k;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위의 점이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BD}=${bd}\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `삼각형의 내각의 이등분선의 성질에서 $\\overline{AB}:\\overline{AC}=\\overline{BD}:\\overline{CD}$이다.\n$${ab}:${ac}=${bd}:\\overline{CD}$에서 $\\overline{CD}=${bd}\\times\\dfrac{${ac}}{${ab}}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, ab, ac, bd, x },
          figureSpec: figPar06(ab, ac, {
            ab: `${ab} cm`,
            ac: `${ac} cm`,
            bd: `${bd} cm`,
            dc: "x cm",
          }),
        };
      }
      const w = intBetween(rng, 2, 6);
      const s = pu * w;
      const x = qu * w;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위의 점이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$이고 삼각형 $ABD$의 넓이가 $${s}\\,\\mathrm{cm}^2$일 때, 삼각형 $ADC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{BD}:\\overline{CD}=\\overline{AB}:\\overline{AC}=${ab}:${ac}$이고, 두 삼각형 $ABD$, $ADC$는 높이가 같으므로 넓이의 비는 밑변의 길이의 비와 같다.\n삼각형 $ADC$의 넓이는 $${s}\\times\\dfrac{${ac}}{${ab}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, ab, ac, s, x },
        figureSpec: figPar06(ab, ac, { ab: `${ab} cm`, ac: `${ac} cm` }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "07",
    "삼각형의 외각의 이등분선의 성질",
    SEC.각이등분,
    "심화하",
    (rng): Body => {
      const r = intBetween(rng, 1, 4);
      const t = intBetween(rng, 1, 3);
      const b = intBetween(rng, t + 1, 8);
      const ab = (r + 1) * t;
      const ac = r * t;
      const x = r * b;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 외각의 이등분선이고 점 $D$는 $\\overline{BC}$의 연장선 위의 점이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형의 외각의 이등분선의 성질에서 $\\overline{AB}:\\overline{AC}=\\overline{BD}:\\overline{CD}$이다.\n$\\overline{CD}=x\\,\\mathrm{cm}$라 하면 $${ab}:${ac}=(${b}+x):x$이므로 $${ab}x=${ac === 1 ? `${b}+x` : `${ac}(${b}+x)`}$, 즉 $${ab - ac === 1 ? "" : ab - ac}x=${ac * b}$에서 $x=${x}$이다.\n따라서 $\\overline{CD}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { ab, ac, b, x },
        figureSpec: figPar07(ab, ac, b, x),
      };
    },
  ),
];

/**
 * 갈래 B 보강 유형 — **RPM 색인 밖의 번호**다. `M2_GEO_SIM` 에 넣지 않는다.
 *
 * 왜 따로 두나: `middleM2Geo.test.ts` 가 `M2_GEO_SIM` 을 「RPM 색인 그대로 55유형」
 * 으로 잠근다(중단원마다 번호가 `01..n` 연속인지까지 본다). 그 시험은 «지어낸
 * 제목·번호 금지» 가드라 **끄면 안 된다** — 그래서 보강은 그 명부 밖에 두고
 * `generate.ts` 가 `midSupB.ts` 를 통해 따로 합친다.
 *
 * 소단원 이름(`SEC.*`)은 그대로다 — 시험지는 소단원으로 뽑으므로 여기 있어도
 * 「그 소단원의 유형 10개」에 그대로 센다(`probe-middle-forms.ts` 로 확인).
 */
export const M2_GEO_SIM_SUP_B: TypeEntry[] = [
  ...AREA_VOLUME_RATIO_SUPPLEMENTS,

  // ── 보강: 삼각형의 닮음 조건 ────────────────────────────────────────
  //
  // pool 갈래가 기본1·응용5·심화1 이라 **기본 셋**이 모자란다. 그림은 안 붙인다 —
  // 세 문형 다 치수가 발문에 전부 있어 그림 없이 풀린다.
  def(
    MINOR_SIM,
    "50",
    "세 쌍의 대응변의 비로 닮음이 되는 변의 길이",
    SEC.닮음조건,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 3, 8);
      const b = a + intBetween(rng, 1, 4);
      const c = b + intBetween(rng, 1, 4);
      const k = intBetween(rng, 2, 4);
      return {
        content: `두 삼각형 $ABC$와 $DEF$에서 $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\overline{CA}=${c}\\,\\mathrm{cm}$이고 $\\overline{DE}=${k * a}\\,\\mathrm{cm}$, $\\overline{EF}=${k * b}\\,\\mathrm{cm}$이다. 두 삼각형이 $\\mathrm{SSS}$ 닮음이 되도록 하는 $\\overline{FD}$의 길이를 구하시오.`,
        answer: `$${k * c}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}:\\overline{DE}=${a}:${k * a}=1:${k}$이고 $\\overline{BC}:\\overline{EF}=${b}:${k * b}=1:${k}$이다.\n세 쌍의 대응변의 길이의 비가 같아야 하므로 $\\overline{CA}:\\overline{FD}=1:${k}$에서 $\\overline{FD}=${c}\\times${k}=${k * c}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, c, k, x: k * c },
      };
    },
  ),

  def(
    MINOR_SIM,
    "51",
    "끼인각이 같을 때 닮음이 되는 변의 길이",
    SEC.닮음조건,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 3, 8);
      const b = a + intBetween(rng, 1, 5);
      const k = intBetween(rng, 2, 4);
      const ang = 2 * intBetween(rng, 20, 40);
      return {
        content: `두 삼각형 $ABC$와 $DEF$에서 $\\angle B=\\angle E=${ang}^\\circ$이고 $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\overline{DE}=${k * a}\\,\\mathrm{cm}$이다. 두 삼각형이 $\\mathrm{SAS}$ 닮음이 되도록 하는 $\\overline{EF}$의 길이를 구하시오.`,
        answer: `$${k * b}\\,\\mathrm{cm}$`,
        solution: `끼인각의 크기가 같으므로 그 각을 낀 두 쌍의 대응변의 길이의 비가 같아야 한다.\n$\\overline{AB}:\\overline{DE}=${a}:${k * a}=1:${k}$이므로 $\\overline{EF}=${b}\\times${k}=${k * b}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, k, ang, x: k * b },
      };
    },
  ),

  def(
    MINOR_SIM,
    "52",
    "닮은 삼각형에서 가장 짧은 변의 길이",
    SEC.닮음조건,
    "기본",
    (rng): Body => {
      // 🔴 **삼각형이 되어야 한다** — $a+b>c$. 예전에는 그냥 키워서 $2,4,7$ 같은
      //    «있을 수 없는 삼각형»이 나왔다. 값 검산은 비만 보므로 통과한다.
      const a = intBetween(rng, 3, 6);
      const b = a + intBetween(rng, 1, 3);
      const c = b + intBetween(rng, 1, Math.max(1, a - 1));
      const k = intBetween(rng, 2, 5);
      return {
        content: `세 변의 길이가 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$, $${c}\\,\\mathrm{cm}$인 삼각형과 닮은 삼각형이 있다. 이 삼각형의 가장 긴 변의 길이가 $${k * c}\\,\\mathrm{cm}$일 때, 가장 짧은 변의 길이를 구하시오.`,
        answer: `$${k * a}\\,\\mathrm{cm}$`,
        solution: `가장 긴 변끼리 대응하므로 닮음비는 $${c}:${k * c}=1:${k}$이다.\n가장 짧은 변은 $${a}\\,\\mathrm{cm}$에 대응하므로 $${a}\\times${k}=${k * a}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, c, k, x: k * a },
      };
    },
  ),

  // ── 보강: 평행선 사이의 선분의 길이의 비 (50~55) ────────────────────
  //
  // pool 갈래가 기본1·응용3 이라 **기본 넷 · 응용 하나 · 심화 하나**가 모자란다.
  // 이미 있는 08 이 「$\overline{AB}$·$\overline{BC}$·$\overline{DE}$ 로 $\overline{EF}$」
  // 를 묻고 있으므로, 여기서는 **묻는 자리를 바꿔** 겹치지 않게 한다.
  // 그림은 안 붙인다 — 점의 순서를 발문이 말하므로 치수만으로 풀린다.
  def(
    MINOR_PAR,
    "50",
    "평행선 사이의 선분에서 다른 쪽 윗변 구하기",
    SEC.평행선비,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 2, 8);
      const b = intBetween(rng, 2, 8);
      const k = intBetween(rng, 2, 5);
      return {
        content: `세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 차례로 $A$, $B$, $C$와 $D$, $E$, $F$라 하자. $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\overline{EF}=${b * k}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${a * k}\\,\\mathrm{cm}$`,
        solution: `평행선 사이에 생기는 선분의 길이의 비는 같으므로 $\\overline{AB}:\\overline{BC}=\\overline{DE}:\\overline{EF}$이다.\n$${a}:${b}=\\overline{DE}:${b * k}$이므로 $\\overline{DE}=${a * k}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, k, x: a * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "51",
    "비와 전체 길이로 평행선 사이의 선분 구하기",
    SEC.평행선비,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 1, 5);
      const q = intBetween(rng, 1, 5);
      const k = intBetween(rng, 2, 6);
      const whole = (p + q) * k;
      return {
        content: `세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 차례로 $A$, $B$, $C$와 $D$, $E$, $F$라 하자. $\\overline{AB}:\\overline{BC}=${p}:${q}$이고 $\\overline{DF}=${whole}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${p * k}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DE}:\\overline{EF}=\\overline{AB}:\\overline{BC}=${p}:${q}$이고 $\\overline{DE}+\\overline{EF}=${whole}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{DE}=${whole}\\times\\dfrac{${p}}{${p + q}}=${p * k}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, k, whole, x: p * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "52",
    "평행선 사이의 선분에서 아래쪽 밑변 구하기",
    SEC.평행선비,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 2, 8);
      const b = intBetween(rng, 2, 8);
      const k = intBetween(rng, 2, 5);
      return {
        content: `세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 차례로 $A$, $B$, $C$와 $D$, $E$, $F$라 하자. $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{DE}=${a * k}\\,\\mathrm{cm}$, $\\overline{EF}=${b * k}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${b}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DE}:\\overline{EF}=${a * k}:${b * k}=${a}:${b}$이고 이 비는 $\\overline{AB}:\\overline{BC}$와 같다.\n$\\overline{AB}=${a}\\,\\mathrm{cm}$이므로 $\\overline{BC}=${b}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, k, x: b },
      };
    },
  ),

  def(
    MINOR_PAR,
    "53",
    "두 전체 길이와 한 부분으로 나머지 부분 구하기",
    SEC.평행선비,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 2, 6);
      const b = intBetween(rng, 2, 6);
      const k = intBetween(rng, 2, 5);
      return {
        content: `세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 차례로 $A$, $B$, $C$와 $D$, $E$, $F$라 하자. $\\overline{AC}=${a + b}\\,\\mathrm{cm}$, $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{DF}=${(a + b) * k}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${a * k}\\,\\mathrm{cm}$`,
        // 비는 기약으로 적는다 — `4:8` 은 값이 맞아도 지면이 흉하다.
        // 이미 기약이면 `4:7=4:7` 이 되므로 한 번만 적는다.
        solution: `$\\overline{AB}:\\overline{AC}=${a}:${a + b}${gcdInt(a, a + b) === 1 ? "" : `=${a / gcdInt(a, a + b)}:${(a + b) / gcdInt(a, a + b)}`}$이고 이 비는 $\\overline{DE}:\\overline{DF}$와 같다.\n따라서 $\\overline{DE}=${(a + b) * k}\\times\\dfrac{${a}}{${a + b}}=${a * k}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, k, x: a * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "54",
    "네 평행선 사이의 선분의 길이의 비",
    SEC.평행선비,
    "응용",
    (rng): Body => {
      const a = intBetween(rng, 2, 6);
      const b = intBetween(rng, 2, 6);
      const c = intBetween(rng, 2, 6);
      const k = intBetween(rng, 2, 4);
      return {
        content: `네 평행선이 두 직선과 만나는 점을 차례로 $A$, $B$, $C$, $D$와 $E$, $F$, $G$, $H$라 하자. $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\overline{CD}=${c}\\,\\mathrm{cm}$이고 $\\overline{EF}=${a * k}\\,\\mathrm{cm}$일 때, $\\overline{FG}+\\overline{GH}$의 길이를 구하시오.`,
        answer: `$${(b + c) * k}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}:\\overline{EF}=${a}:${a * k}=1:${k}$이므로 다른 대응하는 선분의 길이의 비도 $1:${k}$이다.\n$\\overline{FG}=${b * k}\\,\\mathrm{cm}$, $\\overline{GH}=${c * k}\\,\\mathrm{cm}$이므로 그 합은 $${(b + c) * k}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, c, k, x: (b + c) * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "55",
    "비와 전체 길이로 두 부분의 차 구하기",
    SEC.평행선비,
    "심화하",
    (rng): Body => {
      const q = intBetween(rng, 1, 4);
      const p = q + intBetween(rng, 1, 4);
      const k = intBetween(rng, 2, 6);
      const whole = (p + q) * k;
      return {
        content: `세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 차례로 $A$, $B$, $C$와 $D$, $E$, $F$라 하자. $\\overline{AB}:\\overline{BC}=${p}:${q}$이고 $\\overline{DF}=${whole}\\,\\mathrm{cm}$일 때, $\\overline{DE}-\\overline{EF}$의 길이를 구하시오.`,
        answer: `$${(p - q) * k}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DE}=${whole}\\times\\dfrac{${p}}{${p + q}}=${p * k}\\,(\\mathrm{cm})$, $\\overline{EF}=${whole}\\times\\dfrac{${q}}{${p + q}}=${q * k}\\,(\\mathrm{cm})$이다.\n따라서 $\\overline{DE}-\\overline{EF}=${p * k}-${q * k}=${(p - q) * k}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, k, whole, x: (p - q) * k },
      };
    },
  ),

  // ── 보강: 삼각형에서 평행선 사이의 선분의 길이의 비 (56~60) ──────────
  //
  // pool 갈래가 기본1·응용2·심화2 라 **기본 넷 · 응용 하나**가 모자란다.
  def(
    MINOR_PAR,
    "56",
    "삼각형에서 평행선으로 나뉜 변의 길이 구하기",
    SEC.삼평행비,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 2, 8);
      const b = intBetween(rng, 2, 8);
      const k = intBetween(rng, 2, 5);
      return {
        content: `삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위, 점 $E$는 $\\overline{AC}$ 위에 있고 $\\overline{DE}$와 $\\overline{BC}$는 평행하다. $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{DB}=${b}\\,\\mathrm{cm}$, $\\overline{AE}=${a * k}\\,\\mathrm{cm}$일 때, $\\overline{EC}$의 길이를 구하시오.`,
        answer: `$${b * k}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DE}$와 $\\overline{BC}$가 평행하므로 $\\overline{AD}:\\overline{DB}=\\overline{AE}:\\overline{EC}$이다.\n$${a}:${b}=${a * k}:\\overline{EC}$이므로 $\\overline{EC}=${b * k}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, k, x: b * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "57",
    "삼각형에서 평행선이 만드는 밑변의 길이",
    SEC.삼평행비,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 2, 6);
      const k = intBetween(rng, 2, 5);
      const de = intBetween(rng, 2, 9);
      return {
        content: `삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위, 점 $E$는 $\\overline{AC}$ 위에 있고 $\\overline{DE}$와 $\\overline{BC}$는 평행하다. $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{AB}=${a * k}\\,\\mathrm{cm}$, $\\overline{DE}=${de}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${de * k}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ADE$와 삼각형 $ABC$는 $\\mathrm{AA}$ 닮음이고 닮음비는 $\\overline{AD}:\\overline{AB}=${a}:${a * k}=1:${k}$이다.\n따라서 $\\overline{BC}=${de}\\times${k}=${de * k}\\,(\\mathrm{cm})$이다.`,
        facts: { a, k, de, x: de * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "58",
    "변의 비가 주어질 때 평행선이 만드는 선분",
    SEC.삼평행비,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 1, 5);
      const q = intBetween(rng, 1, 5);
      const k = intBetween(rng, 2, 6);
      const bc = (p + q) * k;
      return {
        content: `삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위, 점 $E$는 $\\overline{AC}$ 위에 있고 $\\overline{DE}$와 $\\overline{BC}$는 평행하다. $\\overline{AD}:\\overline{DB}=${p}:${q}$이고 $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${p * k}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}:\\overline{AB}=${p}:${p + q}$이고 삼각형 $ADE$와 삼각형 $ABC$의 닮음비가 그것과 같다.\n따라서 $\\overline{DE}=${bc}\\times\\dfrac{${p}}{${p + q}}=${p * k}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, k, bc, x: p * k },
      };
    },
  ),

  def(
    MINOR_PAR,
    "59",
    "두 변의 중점을 이은 선분의 길이",
    SEC.삼평행비,
    "기본",
    (rng): Body => {
      const half = intBetween(rng, 3, 12);
      return {
        content: `삼각형 $ABC$에서 두 변 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하자. $\\overline{BC}=${2 * half}\\,\\mathrm{cm}$일 때, $\\overline{MN}$의 길이를 구하시오.`,
        answer: `$${half}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AM}:\\overline{AB}=1:2$이므로 $\\overline{MN}$과 $\\overline{BC}$는 평행하고 삼각형 $AMN$과 삼각형 $ABC$의 닮음비는 $1:2$이다.\n따라서 $\\overline{MN}=${2 * half}\\times\\dfrac{1}{2}=${half}\\,(\\mathrm{cm})$이다.`,
        facts: { half, x: half },
      };
    },
  ),

  def(
    MINOR_PAR,
    "60",
    "평행선으로 나뉜 두 삼각형의 둘레의 비",
    SEC.삼평행비,
    "응용",
    (rng): Body => {
      const a = intBetween(rng, 2, 5);
      const k = intBetween(rng, 2, 4);
      // A triangle with one side a exists iff its perimeter exceeds 2a.
      const per = 2 * a + intBetween(rng, 1, 10);
      return {
        content: `삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위, 점 $E$는 $\\overline{AC}$ 위에 있고 $\\overline{DE}$와 $\\overline{BC}$는 평행하다. $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{AB}=${a * k}\\,\\mathrm{cm}$이고 삼각형 $ADE$의 둘레의 길이가 $${per}\\,\\mathrm{cm}$일 때, 삼각형 $ABC$의 둘레의 길이를 구하시오.`,
        answer: `$${per * k}\\,\\mathrm{cm}$`,
        solution: `두 삼각형의 닮음비는 $\\overline{AD}:\\overline{AB}=${a}:${a * k}=1:${k}$이다.\n둘레의 길이의 비는 닮음비와 같으므로 삼각형 $ABC$의 둘레는 $${per}\\times${k}=${per * k}\\,(\\mathrm{cm})$이다.`,
        facts: { a, k, per, x: per * k },
      };
    },
  ),

  // ── 보강: 삼각형의 각의 이등분선 ────────────────────────────────────
  def(
    MINOR_PAR,
    "12",
    "내각의 이등분선과 밑변의 전체 길이",
    SEC.각이등분,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 2, 6);
      const q = intBetween(rng, 1, p - 1);
      const k = intBetween(rng, 2, 6);
      const ab = p * intBetween(rng, 2, 4);
      const ac = q * (ab / p);
      const bc = (p + q) * k;
      const x = p * k;
      return {
        content: `삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위에 있다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BD}:\\overline{DC}=\\overline{AB}:\\overline{AC}=${p}:${q}$이다. $\\overline{BC}=${bc}\\,\\mathrm{cm}$이므로 $\\overline{BD}=${bc}\\times\\dfrac{${p}}{${p + q}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, k, ab, ac, bc, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "13",
    "내각의 이등분선과 삼각형의 둘레",
    SEC.각이등분,
    "응용",
    (rng): Body => {
      const p = intBetween(rng, 2, 5);
      const q = intBetween(rng, 1, p - 1);
      const sideScale = intBetween(rng, 2, 4);
      const baseScale = intBetween(rng, 2, 5);
      const ab = p * sideScale;
      const ac = q * sideScale;
      const bd = p * baseScale;
      const dc = q * baseScale;
      const x = ab + ac + bd + dc;
      return {
        content: `삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위에 있다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BD}=${bd}\\,\\mathrm{cm}$일 때, 삼각형 $ABC$의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BD}:\\overline{DC}=\\overline{AB}:\\overline{AC}=${p}:${q}$이므로 $\\overline{DC}=${dc}\\,\\mathrm{cm}$이다. 따라서 둘레의 길이는 $${ab}+${ac}+${bd}+${dc}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, ab, ac, bd, dc, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "14",
    "내각의 이등분선에서 한 변의 길이",
    SEC.각이등분,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 2, 6);
      const q = intBetween(rng, 1, p - 1);
      const sideScale = intBetween(rng, 2, 5);
      const baseScale = intBetween(rng, 2, 5);
      const ac = q * sideScale;
      const bd = p * baseScale;
      const dc = q * baseScale;
      const x = p * sideScale;
      return {
        content: `삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위에 있다. $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BD}=${bd}\\,\\mathrm{cm}$, $\\overline{DC}=${dc}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}:\\overline{AC}=\\overline{BD}:\\overline{DC}$이므로 $\\overline{AB}:${ac}=${bd}:${dc}$이다. 따라서 $\\overline{AB}=${ac}\\times\\dfrac{${bd}}{${dc}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, ac, bd, dc, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "15",
    "내각의 이등분선과 두 삼각형의 넓이",
    SEC.각이등분,
    "응용",
    (rng): Body => {
      const p = intBetween(rng, 2, 6);
      const q = intBetween(rng, 1, p - 1);
      const k = intBetween(rng, 2, 7);
      const left = p * k;
      const right = q * k;
      const x = left + right;
      return {
        content: `삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위에 있다. $\\overline{AB}:\\overline{AC}=${p}:${q}$이고 삼각형 $ABD$의 넓이가 $${left}\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `두 삼각형 $ABD$, $ACD$는 높이가 같고 밑변의 비가 $${p}:${q}$이므로 넓이의 비도 $${p}:${q}$이다. 삼각형 $ACD$의 넓이는 $${right}\\,\\mathrm{cm}^2$이므로 삼각형 $ABC$의 넓이는 $${left}+${right}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { p, q, k, left, right, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "16",
    "각의 이등분선의 성질의 역",
    SEC.각이등분,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 2, 6);
      const q = intBetween(rng, 1, p - 1);
      const s = intBetween(rng, 2, 5);
      const t = intBetween(rng, 2, 5);
      const ab = p * s;
      const ac = q * s;
      const bd = p * t;
      const dc = q * t;
      const x = intBetween(rng, 28, 72);
      return {
        content: `삼각형 $ABC$의 변 $BC$ 위의 점 $D$에 대하여 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BD}=${bd}\\,\\mathrm{cm}$, $\\overline{DC}=${dc}\\,\\mathrm{cm}$이다. $\\angle BAD=${x}^\\circ$일 때, $\\angle DAC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\overline{AB}:\\overline{AC}=${ab}:${ac}=${p}:${q}$이고 $\\overline{BD}:\\overline{DC}=${bd}:${dc}=${p}:${q}$이다. 각의 이등분선의 성질의 역에 의해 $\\overline{AD}$는 $\\angle A$의 이등분선이므로 $\\angle DAC=\\angle BAD=${x}^\\circ$이다.`,
        facts: { p, q, ab, ac, bd, dc, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "17",
    "외각의 이등분선에서 바깥 선분",
    SEC.각이등분,
    "응용",
    (rng): Body => {
      const q = intBetween(rng, 1, 4);
      const p = q + intBetween(rng, 1, 3);
      const unit = intBetween(rng, 2, 5);
      const ab = p * unit;
      const ac = q * unit;
      // |AB-AC| < BC < AB+AC, retaining an integral external segment.
      const maxBaseScale = Math.min(unit + 4, Math.floor(((p + q) * unit - 1) / (p - q)));
      const baseScale = intBetween(rng, unit + 1, maxBaseScale);
      const bc = (p - q) * baseScale;
      const x = (q * bc) / (p - q);
      return {
        content: `삼각형 $ABC$에서 $A$의 외각의 이등분선이 직선 $BC$와 점 $D$에서 만나고 점의 순서는 $B$, $C$, $D$이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        // ⚠️ 예전 해설은 `x` 를 **정의하지 않고** 썼다 — 「$(9+x):x=7:4$」만 있고
        //    그 $x$ 가 무엇인지 어디에도 없었다. 값 검산은 통과한다.
        solution: `외각의 이등분선의 성질에 의해 $\\overline{BD}:\\overline{CD}=\\overline{AB}:\\overline{AC}=${p}:${q}$이다. $\\overline{CD}=x\\,\\mathrm{cm}$라 하면 $\\overline{BD}=\\overline{BC}+\\overline{CD}$이므로 $(${bc}+x):x=${p}:${q}$이다. 이를 풀면 $x=${x}$이므로 $\\overline{CD}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { p, q, ab, ac, bc, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "18",
    "외각의 이등분선에서 밑변",
    SEC.각이등분,
    "심화하",
    (rng): Body => {
      const q = intBetween(rng, 1, 4);
      const p = q + intBetween(rng, 1, 3);
      const d = intBetween(rng, 2, 5) * q;
      const x = ((p - q) * d) / q;
      return {
        content: `삼각형 $ABC$에서 $A$의 외각의 이등분선이 $BC$의 연장선과 점 $D$에서 만나고 점의 순서는 $B$, $C$, $D$이다. $\\overline{AB}:\\overline{AC}=${p}:${q}$이고 $\\overline{CD}=${d}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        // ⚠️ 예전에는 `$q x=…$` 라고 적혀 있었다 — **생성기 변수 이름 `q` 가 지면에
        //    글자로 나갔다.** 값은 맞고 LaTeX 도 옳아서 값 검산도 렌더 검사도
        //    구조적으로 못 잡는다(2026-08-27). `x` 도 정의하지 않고 쓰고 있었다.
        solution: `$\\overline{BD}:\\overline{CD}=${p}:${q}$이고 $\\overline{BD}=\\overline{BC}+\\overline{CD}$이다. $\\overline{BC}=x\\,\\mathrm{cm}$라 하면 $(x+${d}):${d}=${p}:${q}$이므로 $${q === 1 ? "" : q}x=${(p - q) * d}$에서 $x=${x}$이다.`,
        facts: { p, q, d, x },
      };
    },
  ),

  def(
    MINOR_PAR,
    "19",
    "내각과 외각의 이등분선의 교점",
    SEC.각이등분,
    "심화하",
    // ⚠️ 예전 발문은 「서로 닮은 두 삼각형에서 … 둘째 삼각형의 외각의 이등분선이
    //    만드는 바깥 선분에서 짧은 변에 대응하는 부분의 길이」였다 — **제목(내각과
    //    외각의 이등분선의 교점)과 아무 상관이 없고**, 둘째 삼각형의 꼭짓점을 안
    //    정한 채 `$\overline{BC}$` 를 쓰고 있었다. 교과서 문형으로 다시 썼다:
    //    한 삼각형에서 $\angle A$ 의 **내각** 이등분선 $D$ 와 **외각** 이등분선 $E$
    //    를 잡고 $\overline{DE}$ 를 묻는다.
    (rng): Body => {
      const p = intBetween(rng, 3, 5);
      const q = intBetween(rng, 1, p - 1);
      // 삼각형이 되려면 $\overline{AB}+\overline{AC}>\overline{BC}$ 이고
      // $|\overline{AB}-\overline{AC}|<\overline{BC}$ 여야 한다. 아래 `u` 범위가
      // 그 둘을 동시에 만족시킨다 ($p-q<u<p+q$).
      const u = p - q + intBetween(rng, 1, Math.max(1, 2 * q - 1));
      const ab = p * u;
      const ac = q * u;
      const bc = (p + q) * (p - q);
      const dc = q * (p - q); // 내분점 D 에서 $\overline{DC}$
      const ce = q * (p + q); // 외분점 E 에서 $\overline{CE}$
      const x = dc + ce; // $=2pq$
      return {
        content: `삼각형 $ABC$에서 $\\angle A$의 이등분선이 $\\overline{BC}$와 만나는 점을 $D$, $\\angle A$의 외각의 이등분선이 $\\overline{BC}$의 연장선과 만나는 점을 $E$라 하자. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}:\\overline{AC}=${ab}:${ac}=${p}:${q}$이다.\n내각의 이등분선에서 $\\overline{BD}:\\overline{DC}=${p}:${q}$이므로 $\\overline{DC}=${bc}\\times\\dfrac{${q}}{${p + q}}=${dc}\\,(\\mathrm{cm})$이다.\n외각의 이등분선에서 $\\overline{BE}:\\overline{CE}=${p}:${q}$이고 $\\overline{BE}-\\overline{CE}=\\overline{BC}$이므로 $\\overline{CE}=${bc}${timesFrac(q, p - q)}=${ce}\\,(\\mathrm{cm})$이다.\n따라서 $\\overline{DE}=\\overline{DC}+\\overline{CE}=${dc}+${ce}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, ab, ac, bc, dc, ce, x },
      };
    },
  ),
];
