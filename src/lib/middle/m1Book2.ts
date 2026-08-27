/**
 * 중1 RPM 1-2 저조 단원 유형 — 세션 중1 소유 (`m1Extra.ts` 가 모아 등록).
 *
 * 대상 단원 (2026-08-23 공유 DB 실측, directUseAllowed=true 보유 건수):
 *   삼각형의 내각과 외각 (1) · 대푯값 (1) · 기둥의 겉넓이와 부피 (6)
 *   · 부채꼴의 호의 길이와 넓이 (10, 여력분) · 공간에서 평면의 위치 관계 (0)
 *
 * 위치 관계는 직육면체 $\mathrm{ABCD-EFGH}$ 관례(윗면 ABCD, 아랫면 EFGH,
 * A 아래 E)가 텍스트만으로 성립하는 유형만 냈다. 테스트는 좌표 기하로
 * (여기 문자 모델과 **다른 방법**으로) 개수·거리를 재계산한다.
 */
import { intBetween, pick } from "../elementary/rng";

import {
  attempt,
  defType,
  intNonzero,
  pickDistinct,
  shuffle,
} from "./m1Shared";
import type { TypeEntry } from "./types";

const BOOK = "1-2";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC2 = {
  삼각형: "삼각형의 내각과 외각",
  대푯값: "대푯값",
  기둥: "기둥의 겉넓이와 부피",
  부채꼴: "부채꼴의 호의 길이와 넓이",
  위치: "공간에서 평면의 위치 관계",
} as const;

/** 세 내각이 모두 정수가 되는 비 (합이 180 의 약수 관계) — 오름차순. */
const ANGLE_RATIOS: readonly (readonly [number, number, number])[] = [
  [1, 2, 3],
  [2, 3, 4],
  [1, 3, 5],
  [2, 3, 5],
  [3, 4, 5],
  [1, 2, 6],
  [2, 7, 9],
  [1, 5, 6],
  [3, 5, 10],
  [2, 4, 9],
];

// ── 직육면체 문자 모델 (테스트는 좌표 기하로 독립 재계산) ──
const CUBE_FACES = ["ABCD", "EFGH", "ABFE", "BFGC", "CGHD", "DHEA"] as const;
const CUBE_EDGES = [
  "AB",
  "BC",
  "CD",
  "DA",
  "EF",
  "FG",
  "GH",
  "HE",
  "AE",
  "BF",
  "CG",
  "DH",
] as const;
const CUBE_VERTS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function sharedCount(x: string, y: string): number {
  return [...x].filter((ch) => y.includes(ch)).length;
}

/** 모서리의 길이 축 — x(AB 방향)=0 · y(AD 방향)=1 · z(AE 방향)=2 */
function edgeAxis(e: string): number {
  if (["AB", "CD", "EF", "GH"].includes(e)) return 0;
  if (["BC", "DA", "FG", "HE"].includes(e)) return 1;
  return 2;
}

/**
 * 위치 06 의 관계 종류 — 직육면체에서 모서리↔면 관계는 공유 꼭짓점 수로
 * 갈린다 (2 포함 · 0 평행 · 1 수직). 면↔면은 0 평행 · 2(모서리 공유) 수직.
 */
const REL_KINDS: readonly {
  target: "face" | "edge";
  phrase: (name: string) => string;
  otherLabel: string;
  matchShared: number;
}[] = [
  {
    target: "face",
    phrase: (n) => `면 $\\mathrm{${n}}$에 포함된 모서리`,
    otherLabel: "모서리",
    matchShared: 2,
  },
  {
    target: "face",
    phrase: (n) => `면 $\\mathrm{${n}}$와 평행한 모서리`,
    otherLabel: "모서리",
    matchShared: 0,
  },
  {
    target: "face",
    phrase: (n) => `면 $\\mathrm{${n}}$와 수직인 모서리`,
    otherLabel: "모서리",
    matchShared: 1,
  },
  {
    target: "edge",
    phrase: (n) => `모서리 $\\mathrm{${n}}$를 포함하는 면`,
    otherLabel: "면",
    matchShared: 2,
  },
  {
    target: "edge",
    phrase: (n) => `모서리 $\\mathrm{${n}}$와 평행한 면`,
    otherLabel: "면",
    matchShared: 0,
  },
  {
    target: "edge",
    phrase: (n) => `모서리 $\\mathrm{${n}}$와 수직인 면`,
    otherLabel: "면",
    matchShared: 1,
  },
];

export const M1_BOOK2: TypeEntry[] = [
  // ── 다각형 → 삼각형의 내각과 외각 ─────────────────────
  defType(
    BOOK,
    "다각형",
    "07",
    "삼각형의 세 내각의 크기의 합",
    SEC2.삼각형,
    "기본",
    (rng) =>
      attempt(200, () => {
        const kind = pick(rng, [0, 1] as const);
        if (kind === 0) {
          const [r1, r2, r3] = pick(rng, ANGLE_RATIOS);
          const sum = r1 + r2 + r3;
          const ans = (180 * r3) / sum;
          const facts: Record<string, number> = { kind, r1, r2, r3, ans };
          return {
            content: `삼각형의 세 내각의 크기의 비가 $${r1}:${r2}:${r3}$일 때, 가장 큰 내각의 크기를 구하시오.`,
            answer: `$${ans}^\\circ$`,
            solution: `삼각형의 세 내각의 크기의 합은 $180^\\circ$이다.\n가장 큰 내각의 크기는 $180^\\circ\\times\\dfrac{${r3}}{${sum}}=${ans}^\\circ$이다.`,
            facts,
          };
        }
        const p = intBetween(rng, 5, 18) * 5;
        const q = intBetween(rng, 5, 18) * 5;
        const ans = 180 - p - q;
        if (ans < 20 || ans > 120) return null;
        const facts: Record<string, number> = { kind, p, q, ans };
        return {
          content: `삼각형의 두 내각의 크기가 각각 $${p}^\\circ$, $${q}^\\circ$일 때, 나머지 한 내각의 크기를 구하시오.`,
          answer: `$${ans}^\\circ$`,
          solution: `삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로 나머지 한 내각의 크기는 $180^\\circ-${p}^\\circ-${q}^\\circ=${ans}^\\circ$이다.`,
          facts,
        };
      }),
  ),

  defType(
    BOOK,
    "다각형",
    "08",
    "삼각형의 내각과 외각 사이의 관계",
    SEC2.삼각형,
    "기본",
    (rng) =>
      attempt(200, () => {
        const p = intBetween(rng, 4, 17) * 5;
        const q = intBetween(rng, 4, 17) * 5;
        const e = p + q;
        if (e > 150 || p === q) return null;
        return {
          content: `삼각형의 한 외각의 크기가 $${e}^\\circ$이고, 이 외각과 이웃하지 않는 두 내각 중 한 내각의 크기가 $${p}^\\circ$일 때, 나머지 한 내각의 크기를 구하시오.`,
          answer: `$${q}^\\circ$`,
          solution: `삼각형의 한 외각의 크기는 이웃하지 않는 두 내각의 크기의 합과 같다.\n따라서 구하는 내각의 크기는 $${e}^\\circ-${p}^\\circ=${q}^\\circ$이다.`,
          facts: { e, p, ans: q },
        };
      }),
  ),

  // ── 대푯값 ────────────────────────────────────────────
  defType(BOOK, "대푯값", "01", "평균", SEC2.대푯값, "기본", (rng) =>
    attempt(400, () => {
      const M = intBetween(rng, 65, 92);
      const head: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        head.push(intBetween(rng, M - 15, M + 15));
      }
      if (head.some((v) => v < 50 || v > 100)) return null;
      const last = 5 * M - head.reduce((s, v) => s + v, 0);
      if (last < 50 || last > 100) return null;
      const vals = shuffle(rng, [...head, last]);
      return {
        content: `다음은 학생 $5$명의 수학 성적을 조사한 것이다. 이 자료의 평균을 구하시오.\n(단위: 점)\n${vals
          .map((v) => `$${v}$`)
          .join(", ")}`,
        answer: `$${M}$점`,
        solution: `(평균)$=\\dfrac{${vals.join("+")}}{5}=\\dfrac{${5 * M}}{5}=${M}$(점)`,
        facts: {
          v1: vals[0]!,
          v2: vals[1]!,
          v3: vals[2]!,
          v4: vals[3]!,
          v5: vals[4]!,
          M,
        },
      };
    }),
  ),

  defType(BOOK, "대푯값", "02", "중앙값", SEC2.대푯값, "기본", (rng) =>
    attempt(400, () => {
      const n = pick(rng, [5, 6, 7] as const);
      const pool: number[] = [];
      for (let v = 3; v <= 40; v += 1) pool.push(v);
      const vals = pickDistinct(rng, pool, n);
      const sorted = [...vals].sort((x, y) => x - y);
      let med: number;
      let midText: string;
      if (n % 2 === 1) {
        med = sorted[(n - 1) / 2]!;
        midText = `자료의 개수가 $${n}$이므로 중앙값은 가운데 값인 $${med}$이다.`;
      } else {
        const s1 = sorted[n / 2 - 1]!;
        const s2 = sorted[n / 2]!;
        if ((s1 + s2) % 2 !== 0) return null;
        med = (s1 + s2) / 2;
        midText = `자료의 개수가 $${n}$이므로 중앙값은 가운데 두 값 $${s1}$, $${s2}$의 평균인 $${med}$이다.`;
      }
      const facts: Record<string, number> = { n, med };
      vals.forEach((v, i) => {
        facts[`v${i + 1}`] = v;
      });
      return {
        content: `다음 자료의 중앙값을 구하시오.\n${vals.map((v) => `$${v}$`).join(", ")}`,
        answer: `$${med}$`,
        solution: `자료를 작은 값부터 크기순으로 나열하면 ${sorted
          .map((v) => `$${v}$`)
          .join(", ")}이다.\n${midText}`,
        facts,
      };
    }),
  ),

  defType(BOOK, "대푯값", "03", "최빈값", SEC2.대푯값, "기본", (rng) =>
    attempt(400, () => {
      const modeCnt = pick(rng, [2, 3] as const);
      const others = 6 - modeCnt;
      const pool: number[] = [];
      for (let v = 4; v <= 25; v += 1) pool.push(v);
      const distinct = pickDistinct(rng, pool, others + 1);
      const m = distinct[0]!;
      const rest = distinct.slice(1);
      const vals = shuffle(rng, [...Array<number>(modeCnt).fill(m), ...rest]);
      const facts: Record<string, number> = { n: 6, mode: m };
      vals.forEach((v, i) => {
        facts[`v${i + 1}`] = v;
      });
      return {
        content: `다음 자료의 최빈값을 구하시오.\n${vals.map((v) => `$${v}$`).join(", ")}`,
        answer: `$${m}$`,
        solution: `가장 많이 나타나는 값은 $${m}$($${modeCnt}$번)이다.\n따라서 최빈값은 $${m}$이다.`,
        facts,
      };
    }),
  ),

  defType(
    BOOK,
    "대푯값",
    "04",
    "적절한 대푯값 찾기",
    SEC2.대푯값,
    "응용",
    (rng) => {
      const pool: number[] = [];
      for (let v = 230; v <= 280; v += 5) pool.push(v);
      const distinct = pickDistinct(rng, pool, 5);
      const m = distinct[0]!;
      const rest = distinct.slice(1);
      const vals = shuffle(rng, [m, m, m, ...rest]);
      const facts: Record<string, number> = { n: 7, mode: m };
      vals.forEach((v, i) => {
        facts[`v${i + 1}`] = v;
      });
      return {
        content: `다음은 어느 신발 가게에서 하루 동안 판매된 신발 $7$켤레의 크기를 조사한 것이다. 가장 많이 준비해야 할 신발의 크기를 정하려고 할 때, 대푯값으로 가장 적절한 것을 쓰고 그 값을 구하시오.\n(단위: $\\mathrm{mm}$)\n${vals
          .map((v) => `$${v}$`)
          .join(", ")}`,
        answer: `최빈값, $${m}\\,\\mathrm{mm}$`,
        solution: `가장 많이 판매된 크기가 중요하므로 대푯값으로 최빈값이 적절하다.\n가장 많이 나타나는 값은 $${m}\\,\\mathrm{mm}$($3$켤레)이다.\n따라서 최빈값은 $${m}\\,\\mathrm{mm}$이다.`,
        facts,
      };
    },
  ),

  defType(
    BOOK,
    "대푯값",
    "05",
    "대푯값이 주어졌을 때 변량 구하기",
    SEC2.대푯값,
    "응용",
    (rng) =>
      attempt(400, () => {
        const M = intBetween(rng, 10, 30);
        const ks: number[] = [];
        for (let i = 0; i < 4; i += 1) {
          ks.push(intBetween(rng, Math.max(1, M - 8), M + 8));
        }
        const x = 5 * M - ks.reduce((s, v) => s + v, 0);
        if (x < 1 || x > 60) return null;
        const [k1, k2, k3, k4] = ks as [number, number, number, number];
        return {
          content: `다음 자료의 평균이 $${M}$일 때, $x$의 값을 구하시오.\n$${k1}$, $${k2}$, $x$, $${k3}$, $${k4}$`,
          answer: `$${x}$`,
          solution: `평균이 $${M}$이므로 $\\dfrac{${k1}+${k2}+x+${k3}+${k4}}{5}=${M}$이다.\n$${k1 + k2 + k3 + k4}+x=${5 * M}$에서 $x=${x}$이다.`,
          facts: { k1, k2, k3, k4, M, x },
        };
      }),
  ),

  defType(
    BOOK,
    "대푯값",
    "06",
    "새로운 변량을 추가했을 때 대푯값 구하기",
    SEC2.대푯값,
    "응용",
    (rng) =>
      attempt(400, () => {
        const n = intBetween(rng, 4, 9);
        const m = intBetween(rng, 60, 90);
        const M = m + intNonzero(rng, -5, 5);
        const v = (n + 1) * M - n * m;
        if (v < 1 || v > 100 || v === m) return null;
        return {
          content: `학생 $${n}$명의 수학 성적의 평균이 $${m}$점이다. 성적이 $${v}$점인 학생이 한 명 더 들어올 때, 전체 학생 $${n + 1}$명의 성적의 평균을 구하시오.`,
          answer: `$${M}$점`,
          solution: `전체 성적의 합은 $${n}\\times${m}+${v}=${n * m + v}$(점)이다.\n따라서 평균은 $\\dfrac{${n * m + v}}{${n + 1}}=${M}$(점)이다.`,
          facts: { n, m, v, M },
        };
      }),
  ),

  /*
   * 07A~10A — 대푯값을 $10$유형으로 채운다 (갈래 A, 2026-08-27).
   * 01~03 기본 · 04~06 응용이라 **밑단(`연산`)과 꼭대기(`심화`)가 비어 있었다**
   * (D-106). 07A 를 연산, 10A 를 심화로 세워 사다리 네 칸을 모두 채운다.
   */
  defType(BOOK, "대푯값", "07A", "자료의 평균", SEC2.대푯값, "연산", (rng) =>
    attempt(400, () => {
      const vals: number[] = [];
      for (let i = 0; i < 4; i += 1) vals.push(intBetween(rng, 2, 30));
      const sum = vals.reduce((s, v) => s + v, 0);
      if (sum % 4 !== 0) return null;
      const M = sum / 4;
      const facts: Record<string, number> = { n: 4, M };
      vals.forEach((v, i) => {
        facts[`v${i + 1}`] = v;
      });
      return {
        content: `다음 자료의 평균을 구하시오.\n${vals.map((v) => `$${v}$`).join(", ")}`,
        answer: `$${M}$`,
        solution: `(평균)$=\\dfrac{${vals.join("+")}}{4}=\\dfrac{${sum}}{4}=${M}$`,
        facts,
      };
    }),
  ),

  defType(
    BOOK,
    "대푯값",
    "08A",
    "최빈값이 두 개인 자료",
    SEC2.대푯값,
    "기본",
    (rng) => {
      const pool: number[] = [];
      for (let v = 3; v <= 28; v += 1) pool.push(v);
      // 두 값은 두 번씩, 나머지 둘은 한 번씩 — 최빈값이 정확히 둘이 되게 짠다.
      const chosen = pickDistinct(rng, pool, 4);
      const [m1, m2, s1, s2] = chosen as [number, number, number, number];
      const vals = shuffle(rng, [m1, m1, m2, m2, s1, s2]);
      const lo = Math.min(m1, m2);
      const hi = Math.max(m1, m2);
      const facts: Record<string, number> = { n: 6, lo, hi };
      vals.forEach((v, i) => {
        facts[`v${i + 1}`] = v;
      });
      return {
        content: `다음 자료의 최빈값을 모두 구하시오.\n${vals.map((v) => `$${v}$`).join(", ")}`,
        answer: `$${lo}$, $${hi}$`,
        solution: `$${lo}$과 $${hi}$가 각각 $2$번씩 나타나고 나머지 값은 $1$번씩 나타난다.\n따라서 최빈값은 $${lo}$, $${hi}$의 두 개이다.`,
        facts,
      };
    },
  ),

  defType(
    BOOK,
    "대푯값",
    "09A",
    "두 집단을 합한 평균",
    SEC2.대푯값,
    "응용",
    (rng) =>
      attempt(400, () => {
        const boys = intBetween(rng, 8, 20);
        const girls = intBetween(rng, 8, 20);
        const boyAvg = intBetween(rng, 60, 95);
        const girlAvg = intBetween(rng, 60, 95);
        if (boyAvg === girlAvg) return null;
        const total = boys * boyAvg + girls * girlAvg;
        if (total % (boys + girls) !== 0) return null;
        return {
          content: `어느 반의 남학생 $${boys}$명의 수학 성적의 평균은 $${boyAvg}$점이고, 여학생 $${girls}$명의 수학 성적의 평균은 $${girlAvg}$점이다. 이 반 전체 학생의 수학 성적의 평균을 구하시오.`,
          answer: `$${total / (boys + girls)}$점`,
          solution: `남학생의 성적의 총합은 $${boys}\\times${boyAvg}=${boys * boyAvg}$(점), 여학생의 성적의 총합은 $${girls}\\times${girlAvg}=${girls * girlAvg}$(점)이다.\n따라서 전체 평균은 $\\dfrac{${total}}{${boys + girls}}=${total / (boys + girls)}$(점)이다.`,
          facts: {
            boys,
            girls,
            boyAvg,
            girlAvg,
            M: total / (boys + girls),
          },
        };
      }),
  ),

  defType(
    BOOK,
    "대푯값",
    "10A",
    "중앙값과 최빈값을 함께 구하기",
    SEC2.대푯값,
    "심화",
    (rng) => {
      const pool: number[] = [];
      for (let v = 2; v <= 26; v += 1) pool.push(v);
      // 자료 $7$개 — 홀수라 중앙값이 자료의 한 값이다. 최빈값은 $3$번 나오는 하나뿐.
      const chosen = pickDistinct(rng, pool, 5);
      const [mode, a, b, c, d] = chosen as [
        number,
        number,
        number,
        number,
        number,
      ];
      const vals = shuffle(rng, [mode, mode, mode, a, b, c, d]);
      const sorted = [...vals].sort((x, y) => x - y);
      const median = sorted[3]!;
      const sum = median + mode;
      const facts: Record<string, number> = { n: 7, median, mode, sum };
      vals.forEach((v, i) => {
        facts[`v${i + 1}`] = v;
      });
      return {
        content: `다음 자료의 중앙값을 $a$, 최빈값을 $b$라 할 때, $a+b$의 값을 구하시오.\n${vals
          .map((v) => `$${v}$`)
          .join(", ")}`,
        answer: `$${sum}$`,
        solution: `자료를 작은 값부터 크기순으로 나열하면 ${sorted
          .map((v) => `$${v}$`)
          .join(
            ", ",
          )}이다.\n자료의 개수가 $7$이므로 중앙값은 가운데 값인 $a=${median}$이고, $3$번 나타나는 $b=${mode}$가 최빈값이다.\n따라서 $a+b=${median}+${mode}=${sum}$이다.`,
        facts,
      };
    },
  ),

  // ── 입체도형의 겉넓이와 부피 → 기둥의 겉넓이와 부피 ────
  defType(
    BOOK,
    "입체도형의 겉넓이와 부피",
    "01",
    "각기둥의 겉넓이",
    SEC2.기둥,
    "기본",
    (rng) => {
      const a = intBetween(rng, 2, 10);
      const b = intBetween(rng, 2, 10);
      const c = intBetween(rng, 2, 10);
      const S = 2 * (a * b + b * c + c * a);
      return {
        content: `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${c}\\,\\mathrm{cm}$인 직육면체의 겉넓이를 구하시오.`,
        answer: `$${S}\\,\\mathrm{cm}^2$`,
        solution: `(겉넓이)$=2\\times(${a}\\times${b}+${b}\\times${c}+${c}\\times${a})=2\\times${a * b + b * c + c * a}=${S}$\n따라서 겉넓이는 $${S}\\,\\mathrm{cm}^2$이다.`,
        facts: { a, b, c, S },
      };
    },
  ),

  defType(
    BOOK,
    "입체도형의 겉넓이와 부피",
    "02",
    "원기둥의 겉넓이",
    SEC2.기둥,
    "응용",
    (rng) => {
      const r = intBetween(rng, 2, 7);
      const h = intBetween(rng, 3, 12);
      const K = 2 * r * (r + h);
      return {
        content: `밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원기둥의 겉넓이를 구하시오.`,
        answer: `$${K}\\pi\\,\\mathrm{cm}^2$`,
        solution: `밑넓이는 $\\pi\\times${r}^{2}=${r * r}\\pi$, 옆넓이는 $2\\pi\\times${r}\\times${h}=${2 * r * h}\\pi$이다.\n(겉넓이)$=2\\times${r * r}\\pi+${2 * r * h}\\pi=${K}\\pi$이므로 $${K}\\pi\\,\\mathrm{cm}^2$이다.`,
        facts: { r, h, K },
      };
    },
  ),

  defType(
    BOOK,
    "입체도형의 겉넓이와 부피",
    "03",
    "각기둥의 부피",
    SEC2.기둥,
    "기본",
    (rng) =>
      attempt(200, () => {
        const a = intBetween(rng, 3, 10);
        const b = intBetween(rng, 3, 10);
        if ((a * b) % 2 !== 0) return null;
        const h = intBetween(rng, 4, 12);
        const base = (a * b) / 2;
        const V = base * h;
        return {
          content: `밑면이 밑변의 길이 $${a}\\,\\mathrm{cm}$, 높이 $${b}\\,\\mathrm{cm}$인 삼각형이고, 기둥의 높이가 $${h}\\,\\mathrm{cm}$인 삼각기둥의 부피를 구하시오.`,
          answer: `$${V}\\,\\mathrm{cm}^3$`,
          solution: `밑넓이는 $\\dfrac{1}{2}\\times${a}\\times${b}=${base}$이다.\n(부피)$=$(밑넓이)$\\times$(높이)$=${base}\\times${h}=${V}$이므로 $${V}\\,\\mathrm{cm}^3$이다.`,
          facts: { a, b, h, V },
        };
      }),
  ),

  defType(
    BOOK,
    "입체도형의 겉넓이와 부피",
    "04",
    "원기둥의 부피",
    SEC2.기둥,
    "기본",
    (rng) => {
      const r = intBetween(rng, 2, 6);
      const h = intBetween(rng, 3, 12);
      const K = r * r * h;
      return {
        content: `밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원기둥의 부피를 구하시오.`,
        answer: `$${K}\\pi\\,\\mathrm{cm}^3$`,
        solution: `(부피)$=$(밑넓이)$\\times$(높이)$=\\pi\\times${r}^{2}\\times${h}=${K}\\pi$이므로 $${K}\\pi\\,\\mathrm{cm}^3$이다.`,
        facts: { r, h, K },
      };
    },
  ),

  // ── 원과 부채꼴 → 부채꼴의 호의 길이와 넓이 (여력분) ───
  defType(
    BOOK,
    "원과 부채꼴",
    "09",
    "원의 둘레의 길이와 넓이",
    SEC2.부채꼴,
    "응용",
    (rng) => {
      const r = intBetween(rng, 3, 12);
      const A = r * r;
      const C = 2 * r;
      return {
        content: `넓이가 $${A}\\pi\\,\\mathrm{cm}^2$인 원의 둘레의 길이를 구하시오.`,
        answer: `$${C}\\pi\\,\\mathrm{cm}$`,
        solution: `원의 반지름의 길이를 $r\\,\\mathrm{cm}$라 하면 $\\pi r^{2}=${A}\\pi$에서 $r=${r}$이다.\n따라서 둘레의 길이는 $2\\pi\\times${r}=${C}\\pi$이므로 $${C}\\pi\\,\\mathrm{cm}$이다.`,
        facts: { r, A, C },
      };
    },
  ),

  defType(
    BOOK,
    "원과 부채꼴",
    "10",
    "부채꼴의 호의 길이와 넓이",
    SEC2.부채꼴,
    "응용",
    (rng) =>
      attempt(400, () => {
        const r = intBetween(rng, 2, 12);
        const deg = pick(rng, [
          30, 45, 60, 90, 120, 135, 150, 210, 240, 270, 300,
        ] as const);
        if ((r * deg) % 180 !== 0 || (r * r * deg) % 360 !== 0) return null;
        const L = (r * deg) / 180;
        const S = (r * r * deg) / 360;
        return {
          content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$, 중심각의 크기가 $${deg}^\\circ$인 부채꼴의 호의 길이와 넓이를 차례대로 구하시오.`,
          answer: `호의 길이 $${L}\\pi\\,\\mathrm{cm}$, 넓이 $${S}\\pi\\,\\mathrm{cm}^2$`,
          solution: `호의 길이는 $2\\pi\\times${r}\\times\\dfrac{${deg}}{360}=${L}\\pi\\,(\\mathrm{cm})$이다.\n넓이는 $\\pi\\times${r}^{2}\\times\\dfrac{${deg}}{360}=${S}\\pi\\,(\\mathrm{cm}^2)$이다.`,
          facts: { r, deg, L, S },
        };
      }),
  ),

  // ── 위치 관계 → 공간에서 평면의 위치 관계 ─────────────
  defType(
    BOOK,
    "위치 관계",
    "06",
    "공간에서 직선과 평면의 위치 관계",
    SEC2.위치,
    "응용",
    (rng) => {
      const kind = intBetween(rng, 0, REL_KINDS.length - 1);
      const rel = REL_KINDS[kind]!;
      const targets = rel.target === "face" ? CUBE_FACES : CUBE_EDGES;
      const others = rel.target === "face" ? CUBE_EDGES : CUBE_FACES;
      const ti = intBetween(rng, 0, targets.length - 1);
      const name = targets[ti]!;
      const hit = others.filter(
        (o) => sharedCount(name, o) === rel.matchShared,
      );
      const count = hit.length;
      return {
        content: `직육면체 $\\mathrm{ABCD-EFGH}$에서 ${rel.phrase(name)}의 개수를 구하시오.`,
        answer: `$${count}$개`,
        solution: `조건을 만족하는 ${rel.otherLabel}: ${hit
          .map((o) => `$\\mathrm{${o}}$`)
          .join(", ")}\n따라서 $${count}$개이다.`,
        facts: { kind, ti, count },
      };
    },
  ),

  defType(
    BOOK,
    "위치 관계",
    "07",
    "점과 평면 사이의 거리",
    SEC2.위치,
    "응용",
    (rng) =>
      attempt(400, () => {
        const dims = pickDistinct(
          rng,
          [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const,
          3,
        );
        const [a, b, c] = dims as [number, number, number];
        const pi = intBetween(rng, 0, CUBE_VERTS.length - 1);
        const P = CUBE_VERTS[pi]!;
        const fi = intBetween(rng, 0, CUBE_FACES.length - 1);
        const F = CUBE_FACES[fi]!;
        if (F.includes(P)) return null;
        const perp = CUBE_EDGES.find(
          (e) =>
            e.includes(P) &&
            sharedCount(e, F) === 1 &&
            F.includes(e.replace(P, "")),
        );
        if (!perp) return null;
        const dist = [a, b, c][edgeAxis(perp)]!;
        return {
          content: `$\\mathrm{AB}=${a}\\,\\mathrm{cm}$, $\\mathrm{AD}=${b}\\,\\mathrm{cm}$, $\\mathrm{AE}=${c}\\,\\mathrm{cm}$인 직육면체 $\\mathrm{ABCD-EFGH}$에서 점 $\\mathrm{${P}}$와 면 $\\mathrm{${F}}$ 사이의 거리를 구하시오.`,
          answer: `$${dist}\\,\\mathrm{cm}$`,
          solution: `점 $\\mathrm{${P}}$와 면 $\\mathrm{${F}}$ 사이의 거리는 모서리 $\\mathrm{${perp}}$의 길이와 같다.\n따라서 $${dist}\\,\\mathrm{cm}$이다.`,
          facts: { a, b, c, pt: pi, face: fi, dist },
        };
      }),
  ),

  defType(
    BOOK,
    "위치 관계",
    "08",
    "공간에서 두 평면의 위치 관계",
    SEC2.위치,
    "기본",
    (rng) => {
      const kind = pick(rng, [0, 1] as const); // 0 평행 · 1 수직
      const fi = intBetween(rng, 0, CUBE_FACES.length - 1);
      const F = CUBE_FACES[fi]!;
      const want = kind === 0 ? 0 : 2;
      const hit = CUBE_FACES.filter(
        (o) => o !== F && sharedCount(F, o) === want,
      );
      const count = hit.length;
      return {
        content: `직육면체 $\\mathrm{ABCD-EFGH}$에서 면 $\\mathrm{${F}}$와 ${kind === 0 ? "평행한" : "수직인"} 면의 개수를 구하시오.`,
        answer: `$${count}$개`,
        solution: `면 $\\mathrm{${F}}$와 ${kind === 0 ? "평행한" : "수직인"} 면은 ${hit
          .map((o) => `면 $\\mathrm{${o}}$`)
          .join(", ")}이다.\n따라서 $${count}$개이다.`,
        facts: { kind, face: fi, count },
      };
    },
  ),
];
