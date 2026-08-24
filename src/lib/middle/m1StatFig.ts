/**
 * 중1 물결 3A-유형 **그림 붙이기** — RPM 1-2 「도수분포표와 상대도수」 중
 * 읽을 그림이 있어야 성립하는 유형 열셋.
 *
 * `m1Stat.ts` 가 먼저 낸 다섯(02·03·11·15·16)은 글로만 성립하는 것이고, 여기 열셋은
 * 세션 3A-엔진 이 `table` 열 폭 · `histogram` · `freqPolygon` 을 main 에 넣은 뒤에야
 * 낼 수 있었다(병합 `32101149`). 규약은 09-figure-engine-guide §4-24.
 *
 * ## 물결 2D 계약 — **그림과 발문이 같은 수를 말한다**
 * `facts` 에 계급(`lo`·`w`·`n`)과 도수(`f0..f{n-1}`)를 **낱개로** 남긴다.
 * 시험이 그것으로 `figureSpec.classes`·`values` 를 **다시 만들어 대조**하고, 나아가
 * **실제 엔진에 태워 그려 본다.** 그림 따로 발문 따로면 「그럴듯한 오답 그림」이 된다.
 *
 * ## 왜 계급 수·경계값에 상한이 있나 (실측 2026-08-23)
 * 지면 폭이 240 에 박혀 있어 가로 눈금이 겹치면 **엔진이 던진다**. 실측 봉투는
 *
 * | 그림 | 계급 수 상한 |
 * |---|---|
 * | `histogram` 도수 | 6 |
 * | `histogram` 상대도수(+`hidden`) | 5 |
 * | `freqPolygon` 도수·상대도수 | 5 |
 *
 * ⚠️ **처음 잰 봉투는 틀렸다.** 「계급 수」와 「경계값 자릿수」만 흔들어 재고
 * **가로축 이름표 폭**을 `(분)` 으로 고정해 두었더니 6계급이 된다고 나왔는데,
 * 실제로는 `(시간)` 에서 던진다. 시험이 **정말로 그려 보고서야** 잡혔다
 * (`08` seed 31337). 세로 눈금이 두 자리가 돼도 가로 폭이 준다 —
 * **봉투를 잴 때는 그림이 실제로 쓰는 이름표를 다 넣고 재라.**
 *
 * 그래서 소재마다 「경계값이 두 자리를 넘지 않는 계급 수」(`maxN`)를 두고, 생성기가
 * 그 안에서만 뽑는다. 3열 표는 `10이상~20미만` 라벨이 폭을 넘겨 던지므로 `10~20` 으로
 * 줄이고 **그 규약을 발문이 말한다**(줄기와 잎의 「$1|2$ 는 $12$」와 같은 방식).
 *
 * ## 보류 하나 — 09 「일부가 보이지 않는 도수분포다각형」
 * `hidden`(찢긴 자국)은 **`histogram` 에만 있다** — `freqPolygon` 에 주면 「허용되지
 * 않은 키」로 던진다. 막대를 안 그리는 것으로는 「안 보인다」와 「도수 0」을 못 가르므로
 * 찢긴 물결이 유일한 표시다(09 §4-24). 그 표시가 꺾은선에 생기기 전까지는 못 낸다 —
 * 지어내지 않는다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, dec, def, numFinal, obj, subj } from "./m1Stat";
import type { Body } from "./m1Stat";
import type { MidProblem, TypeEntry } from "./types";

const MINOR = "도수분포표와 상대도수";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 실측) */
const SEC = {
  줄기와잎: "줄기와 잎 그림",
  히스토그램: "히스토그램",
  다각형: "도수분포다각형",
  상대도수: "상대도수",
} as const;

/**
 * 그림용 소재. `lo`·`w` 는 그 소재가 실제로 쓰는 계급이고, `maxN` 은
 * **경계값이 두 자리를 안 넘는** 계급 수 상한이다(위 봉투 표 참조).
 */
type GTopic = {
  subject: string;
  lo: number;
  w: number;
  /**
   * **표 머리글**. 소재 이름을 그대로 쓰면 「한 달 동안의 봉사 활동 시간(시간)」이
   * 238단위가 되어 표가 지면 폭(224)을 넘고 엔진이 던진다 — 실측 2026-08-23.
   */
  head: string;
  /** 그림 가로축 이름표 */
  axis: string;
  /** 발문에서 값을 적는 법 */
  tex: (v: number) => string;
  maxN: number;
};

const GTOPICS: readonly GTopic[] = [
  {
    subject: "통학 시간",
    head: "시간(분)",
    lo: 0,
    w: 10,
    axis: "(분)",
    tex: (v) => `$${v}$분`,
    maxN: 9,
  },
  {
    subject: "던지기 기록",
    head: "기록(m)",
    lo: 10,
    w: 5,
    axis: "(m)",
    tex: (v) => `$${v}\\,\\mathrm{m}$`,
    maxN: 17,
  },
  {
    subject: "한 달 동안의 봉사 활동 시간",
    head: "봉사(시간)",
    lo: 0,
    w: 4,
    axis: "(시간)",
    tex: (v) => `$${v}$시간`,
    maxN: 24,
  },
  {
    subject: "몸무게",
    head: "몸무게(kg)",
    lo: 30,
    w: 10,
    axis: "(kg)",
    tex: (v) => `$${v}\\,\\mathrm{kg}$`,
    maxN: 6,
  },
  {
    subject: "윗몸일으키기 횟수",
    head: "횟수(회)",
    lo: 0,
    w: 10,
    axis: "(회)",
    tex: (v) => `$${v}$회`,
    maxN: 9,
  },
  {
    subject: "일 년 동안 읽은 책의 수",
    head: "책 수(권)",
    lo: 0,
    w: 5,
    axis: "(권)",
    tex: (v) => `$${v}$권`,
    maxN: 19,
  },
  {
    subject: "하루 인터넷 이용 시간",
    head: "시간(분)",
    lo: 0,
    w: 15,
    axis: "(분)",
    tex: (v) => `$${v}$분`,
    maxN: 6,
  },
  {
    subject: "수학 성적",
    head: "성적(점)",
    lo: 40,
    w: 10,
    axis: "(점)",
    tex: (v) => `$${v}$점`,
    maxN: 5,
  },
];

/** 계급 수가 소재의 상한 안인가 — 넘으면 엔진이 던진다. */
function topicFor(rng: Rng, n: number): GTopic | null {
  const t = pick(rng, GTOPICS);
  return n <= t.maxN ? t : null;
}

/** 계급의 양 끝 값 — `classes[i] = lo + i*w`. */
function classesOf(lo: number, w: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => lo + i * w);
}

/** 도수 — 최댓값이 **하나뿐**이어야 「도수가 가장 큰 계급」이 정해진다. */
function freqs(rng: Rng, n: number, lo: number, hi: number): number[] | null {
  const v = Array.from({ length: n }, () => intBetween(rng, lo, hi));
  const max = Math.max(...v);
  const min = Math.min(...v);
  if (v.filter((x) => x === max).length !== 1) return null;
  if (max === min) return null;
  return v;
}

/**
 * 상대도수(백분율 정수) — $5\%$ 단위로 합이 $100$. 그래서 소수는 두 자리로 떨어지고,
 * 총합이 $20\cdot40\cdot100\cdot200$ 중 무엇이든 **도수가 정수**가 된다.
 */
function relPercents(rng: Rng, n: number): number[] | null {
  const p: number[] = [];
  let rest = 100;
  for (let i = 0; i < n - 1; i += 1) {
    const room = rest - 5 * (n - 1 - i);
    if (room < 5) return null;
    p.push(5 * intBetween(rng, 1, Math.floor(room / 5)));
    rest -= p[i]!;
  }
  if (rest < 5) return null;
  p.push(rest);
  const max = Math.max(...p);
  if (p.filter((x) => x === max).length !== 1) return null;
  // 한 계급이 75퍼센트를 먹으면 지면에서 나머지 계급이 안 읽힌다 — 실렌더로 봤다.
  if (max > 50) return null;
  return p;
}

/** 상대도수 문항의 도수 총합 — 위 $5\%$ 단위와 맞물려 도수가 늘 정수다. */
const REL_TOTALS: readonly number[] = [20, 40, 100, 200];

/** 계급·도수를 `facts` 에 **낱개로** 남긴다 — 시험이 이것으로 그림을 되만든다. */
function packDist(
  lo: number,
  w: number,
  values: readonly number[],
  out: Record<string, number>,
): void {
  out.lo = lo;
  out.w = w;
  out.n = values.length;
  values.forEach((v, i) => {
    out[`f${i}`] = v;
  });
}

/** 값 배열을 `facts` 에 남긴다(줄기와 잎의 변량 등). */
function packValues(
  prefix: string,
  values: readonly number[],
  out: Record<string, number>,
): void {
  values.forEach((v, i) => {
    out[`${prefix}${i}`] = v;
  });
}

type StatExtra = {
  total?: number;
  hidden?: number[];
  yLabel?: string;
  label?: string;
  series2?: { values: number[]; label: string };
  bars?: boolean;
};

function statSpec(
  kind: "histogram" | "freqPolygon",
  t: GTopic,
  values: readonly number[],
  extra: StatExtra = {},
): MidProblem["figureSpec"] {
  return {
    version: "elem-1",
    kind,
    classes: classesOf(t.lo, t.w, values.length),
    values: [...values],
    yLabel: extra.yLabel ?? "(명)",
    xLabel: t.axis,
    ...extra,
  };
}

/** 계급 라벨 — 3열 표는 폭이 모자라 `10~20` 으로 줄이고 발문이 규약을 말한다. */
function bandShort(lo: number, w: number, i: number): string {
  return `${lo + i * w}~${lo + (i + 1) * w}`;
}
/** 2열 표는 폭이 남아 교과서 표기를 그대로 쓴다. */
function bandLong(lo: number, w: number, i: number): string {
  return i === 0
    ? `${lo}이상~${lo + w}미만`
    : `${lo + i * w} ~ ${lo + (i + 1) * w}`;
}

const BAND_RULE = (t: GTopic, lo: number, w: number) =>
  `(계급 $${lo}\\sim${lo + w}$${numFinal(lo + w) ? "은" : "는"} ${t.tex(lo)} 이상 ${t.tex(lo + w)} 미만)`;

function tableSpec(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  align?: readonly string[],
): MidProblem["figureSpec"] {
  return {
    version: "elem-1",
    kind: "table",
    headers: [...headers],
    rows: rows.map((r) => [...r]),
    ...(align ? { align: [...align] } : {}),
  };
}

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);

export const M1_STAT_FIG: TypeEntry[] = [
  // ── 01 줄기와 잎 그림 ────────────────────────────────
  def(MINOR, "01", "줄기와 잎 그림의 이해", SEC.줄기와잎, "기본", (rng) =>
    attempt(120, (): Body | null => {
      const t = pick(
        rng,
        GTOPICS.filter((x) => x.subject !== "수학 성적"),
      );
      const stem0 = intBetween(rng, 1, 3);
      const stems = intBetween(rng, 3, 4);
      const leaves: number[][] = [];
      for (let i = 0; i < stems; i += 1) {
        const k = intBetween(rng, 2, 6);
        const row = Array.from({ length: k }, () => intBetween(rng, 0, 9)).sort(
          (a, b) => a - b,
        );
        leaves.push(row);
      }
      const values: number[] = [];
      leaves.forEach((row, i) => {
        row.forEach((d) => values.push((stem0 + i) * 10 + d));
      });
      values.sort((a, b) => a - b);
      const m = values.length;
      if (m < 12 || m > 18) return null;

      const spec = tableSpec(
        ["줄기", "잎"],
        leaves.map((row, i) => [String(stem0 + i), row.join(" ")]),
        // 잎은 **왼쪽 정렬** — 줄기 옆에서 자릿수가 나란해야 읽힌다(09 §4-24).
        ["center", "left"],
      );
      const head = `다음은 어느 반 학생들의 ${obj(t.subject)} 조사하여 나타낸 줄기와 잎 그림이다. (줄기 $${stem0}$, 잎 $${leaves[0]![0]!}$${numFinal(leaves[0]![0]!) ? "은" : "는"} ${t.tex(stem0 * 10 + leaves[0]![0]!)})`;
      const facts: Record<string, number> = { m, stem0, stems };
      packValues("v", values, facts);

      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        return {
          content: `${head} 조사한 학생은 모두 몇 명인지 구하시오.`,
          answer: `$${m}$명`,
          solution: `자료의 개수는 잎의 개수와 같다.\n줄기마다 잎이 ${leaves.map((r) => `$${r.length}$`).join(", ")}개이므로 모두 $${m}$명이다.`,
          facts: { ...facts, branch, ans: m },
          figureSpec: spec,
        };
      }
      if (branch === 1) {
        const k = intBetween(rng, 2, 5);
        const v = values[m - k]!;
        if (values.filter((x) => x === v).length !== 1) return null;
        return {
          content: `${head} ${subj(t.subject)} 큰 쪽에서 $${k}$번째인 학생의 ${obj(t.subject)} 구하시오.`,
          answer: t.tex(v),
          solution: `큰 값부터 세면 ${values
            .slice(m - k)
            .reverse()
            .map((x) => `$${x}$`)
            .join(", ")}이다.\n따라서 $${k}$번째 값은 $${v}$이다.`,
          facts: { ...facts, branch, k, ans: v },
          figureSpec: spec,
        };
      }
      const cut = (stem0 + intBetween(rng, 1, stems - 1)) * 10;
      const cnt = values.filter((x) => x >= cut).length;
      if (cnt < 2 || cnt >= m) return null;
      return {
        content: `${head} ${subj(t.subject)} ${t.tex(cut)} 이상인 학생은 몇 명인지 구하시오.`,
        answer: `$${cnt}$명`,
        solution: `줄기가 $${cut / 10}$ 이상인 잎을 모두 세면 $${cnt}$개이다.\n따라서 $${cnt}$명이다.`,
        facts: { ...facts, branch, cut, ans: cnt },
        figureSpec: spec,
      };
    }),
  ),

  // ── 04·05·06 히스토그램 ─────────────────────────────
  def(MINOR, "04", "히스토그램의 이해", SEC.히스토그램, "기본", (rng) =>
    attempt(120, (): Body | null => {
      const n = intBetween(rng, 5, 6);
      const t = topicFor(rng, n);
      if (!t) return null;
      const values = freqs(rng, n, 2, 12);
      if (!values) return null;
      const total = sum(values);
      const spec = statSpec("histogram", t, values, { total });
      const head = `다음은 어느 반 학생 $${total}$명의 ${obj(t.subject)} 조사하여 나타낸 히스토그램이다.`;
      const facts: Record<string, number> = { total };
      packDist(t.lo, t.w, values, facts);

      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        return {
          content: `${head} 이 히스토그램에서 계급의 크기를 구하시오.`,
          answer: t.tex(t.w),
          solution: `직사각형의 가로의 길이가 계급의 크기이다.\n가로축의 눈금이 ${t.tex(t.lo)}, ${t.tex(t.lo + t.w)}, ${t.tex(t.lo + 2 * t.w)}, $\\cdots$ 이므로 계급의 크기는 $${t.w}$이다.`,
          facts: { ...facts, branch, ans: t.w },
          figureSpec: spec,
        };
      }
      if (branch === 1) {
        const j = intBetween(rng, 1, n - 1);
        const cnt = sum(values.slice(j));
        if (cnt < 2 || cnt >= total) return null;
        return {
          content: `${head} ${subj(t.subject)} ${t.tex(t.lo + j * t.w)} 이상인 학생은 몇 명인지 구하시오.`,
          answer: `$${cnt}$명`,
          solution: `해당하는 계급의 도수를 모두 더하면 ${values
            .slice(j)
            .map((v) => `$${v}$`)
            .join("+")}$=${cnt}$이다.`,
          facts: { ...facts, branch, j, ans: cnt },
          figureSpec: spec,
        };
      }
      const maxV = Math.max(...values);
      const i = values.indexOf(maxV);
      return {
        content: `${head} 도수가 가장 큰 계급의 도수를 구하시오.`,
        answer: `$${maxV}$명`,
        solution: `직사각형이 가장 높은 계급은 ${t.tex(t.lo + i * t.w)} 이상 ${t.tex(t.lo + (i + 1) * t.w)} 미만이다.\n그 계급의 도수는 $${maxV}$이다.`,
        facts: { ...facts, branch, ans: maxV },
        figureSpec: spec,
      };
    }),
  ),

  def(
    MINOR,
    "05",
    "히스토그램에서 직사각형의 넓이",
    SEC.히스토그램,
    "응용",
    (rng) =>
      attempt(120, (): Body | null => {
        const n = intBetween(rng, 5, 6);
        const t = topicFor(rng, n);
        if (!t) return null;
        const values = freqs(rng, n, 2, 12);
        if (!values) return null;
        const total = sum(values);
        const spec = statSpec("histogram", t, values, { total });
        const head = `다음은 어느 반 학생 $${total}$명의 ${obj(t.subject)} 조사하여 나타낸 히스토그램이다.`;
        const facts: Record<string, number> = { total };
        packDist(t.lo, t.w, values, facts);
        const maxV = Math.max(...values);
        const minV = Math.min(...values);

        const branch = pick(rng, [0, 1, 2] as const);
        if (branch === 0) {
          const area = t.w * total;
          return {
            content: `${head} 이 히스토그램의 직사각형의 넓이의 합을 구하시오.`,
            answer: `$${area}$`,
            solution: `(직사각형의 넓이의 합)$=$(계급의 크기)$\\times$(도수의 총합)이다.\n따라서 $${t.w}\\times${total}=${area}$이다.`,
            facts: { ...facts, branch, ans: area },
            figureSpec: spec,
          };
        }
        if (branch === 1) {
          const area = t.w * maxV;
          return {
            content: `${head} 도수가 가장 큰 계급의 직사각형의 넓이를 구하시오.`,
            answer: `$${area}$`,
            solution: `(직사각형의 넓이)$=$(계급의 크기)$\\times$(그 계급의 도수)이다.\n도수가 가장 큰 계급의 도수가 $${maxV}$이므로 $${t.w}\\times${maxV}=${area}$이다.`,
            facts: { ...facts, branch, ans: area },
            figureSpec: spec,
          };
        }
        if (maxV % minV !== 0 || maxV / minV < 2) return null;
        const ratio = maxV / minV;
        return {
          content: `${head} 도수가 가장 큰 계급의 직사각형의 넓이는 도수가 가장 작은 계급의 직사각형의 넓이의 몇 배인지 구하시오.`,
          answer: `$${ratio}$배`,
          solution: `직사각형의 가로의 길이가 모두 같으므로 넓이의 비는 도수의 비와 같다.\n따라서 $${maxV}\\div${minV}=${ratio}$(배)이다.`,
          facts: { ...facts, branch, ans: ratio },
          figureSpec: spec,
        };
      }),
  ),

  def(
    MINOR,
    "06",
    "일부가 보이지 않는 히스토그램",
    SEC.히스토그램,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const n = intBetween(rng, 5, 6);
        const t = topicFor(rng, n);
        if (!t) return null;
        const values = freqs(rng, n, 2, 12);
        if (!values) return null;
        const total = sum(values);
        const h = intBetween(rng, 1, n - 2);
        const spec = statSpec("histogram", t, values, { total, hidden: [h] });
        const facts: Record<string, number> = { total, h };
        packDist(t.lo, t.w, values, facts);
        const seen = total - values[h]!;
        const band = `${t.tex(t.lo + h * t.w)} 이상 ${t.tex(t.lo + (h + 1) * t.w)} 미만`;

        const branch = pick(rng, [0, 1] as const);
        if (branch === 0) {
          return {
            content: `다음은 어느 반 학생 $${total}$명의 ${obj(t.subject)} 조사하여 나타낸 히스토그램인데 일부가 찢어져 보이지 않는다. ${band}인 학생은 몇 명인지 구하시오.`,
            answer: `$${values[h]}$명`,
            solution: `보이는 계급의 도수의 합은 $${seen}$이다.\n(보이지 않는 계급의 도수)$=$(도수의 총합)$-$(보이는 도수의 합)$=${total}-${seen}=${values[h]}$이다.`,
            facts: { ...facts, branch, ans: values[h]! },
            figureSpec: spec,
          };
        }
        // 총합을 안 알려 준다 — 「$x$ 이상이 전체의 $p\%$」로 총합을 먼저 구한다.
        const j = intBetween(rng, h + 1, n - 1);
        const cnt = sum(values.slice(j));
        if ((100 * cnt) % total !== 0) return null;
        const p = (100 * cnt) / total;
        if (p < 5 || p > 60) return null;
        return {
          content: `다음은 어느 반 학생들의 ${obj(t.subject)} 조사하여 나타낸 히스토그램인데 일부가 찢어져 보이지 않는다. ${subj(t.subject)} ${t.tex(t.lo + j * t.w)} 이상인 학생이 전체의 $${p}\\%$일 때, ${band}인 학생은 몇 명인지 구하시오.`,
          answer: `$${values[h]}$명`,
          // ⚠️ 여기서 $\dfrac{100}{35}$ 같은 **맨 정수 가분수**를 쓰면 제품 전처리가
          //    대분수로 고쳐 써 지면의 수가 달라진다(m1Stat 머리말) — 등식으로 푼다.
          solution: `${t.tex(t.lo + j * t.w)} 이상인 학생은 $${cnt}$명이고 이것이 전체의 $${p}\\%$이다.\n전체 학생 수를 $x$ 라 하면 $\\dfrac{${cnt}}{x}\\times100=${p}$이고, 양변에 $x$ 를 곱하여 정리하면 $x=${total}$이다.\n보이는 계급의 도수의 합이 $${seen}$이므로 구하는 도수는 $${total}-${seen}=${values[h]}$이다.`,
          facts: { ...facts, branch, j, p, cnt, ans: values[h]! },
          figureSpec: spec,
        };
      }),
  ),

  // ── 07·08·10 도수분포다각형 ─────────────────────────
  def(MINOR, "07", "도수분포다각형의 이해", SEC.다각형, "기본", (rng) =>
    attempt(120, (): Body | null => {
      // 다각형은 양끝에 계급이 하나씩 더 붙어 가로 눈금이 촘촘하다 — 5개까지.
      const n = intBetween(rng, 4, 5);
      const t = topicFor(rng, n);
      if (!t) return null;
      const values = freqs(rng, n, 2, 12);
      if (!values) return null;
      const total = sum(values);
      const spec = statSpec("freqPolygon", t, values, { total });
      const head = `다음은 어느 반 학생들의 ${obj(t.subject)} 조사하여 나타낸 도수분포다각형이다.`;
      const facts: Record<string, number> = { total };
      packDist(t.lo, t.w, values, facts);

      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        return {
          content: `${head} 계급의 개수를 구하시오.`,
          answer: `$${n}$개`,
          solution: `양 끝에 도수가 $0$ 인 계급을 하나씩 더해 그린 것이므로 그 둘은 세지 않는다.\n따라서 계급의 개수는 $${n}$개이다.`,
          facts: { ...facts, branch, ans: n },
          figureSpec: spec,
        };
      }
      if (branch === 1) {
        return {
          content: `${head} 조사한 학생은 모두 몇 명인지 구하시오.`,
          answer: `$${total}$명`,
          solution: `각 계급의 도수를 모두 더하면 ${values
            .map((v) => `$${v}$`)
            .join("+")}$=${total}$이다.`,
          facts: { ...facts, branch, ans: total },
          figureSpec: spec,
        };
      }
      const j = intBetween(rng, 1, n - 1);
      const cnt = sum(values.slice(j));
      if (cnt < 2 || cnt >= total) return null;
      return {
        content: `${head} ${subj(t.subject)} ${t.tex(t.lo + j * t.w)} 이상인 학생은 몇 명인지 구하시오.`,
        answer: `$${cnt}$명`,
        solution: `해당하는 계급의 도수를 모두 더하면 ${values
          .slice(j)
          .map((v) => `$${v}$`)
          .join("+")}$=${cnt}$이다.`,
        facts: { ...facts, branch, j, ans: cnt },
        figureSpec: spec,
      };
    }),
  ),

  def(MINOR, "08", "도수분포다각형의 넓이", SEC.다각형, "응용", (rng) =>
    attempt(120, (): Body | null => {
      const n = intBetween(rng, 4, 5);
      const t = topicFor(rng, n);
      if (!t) return null;
      const values = freqs(rng, n, 2, 12);
      if (!values) return null;
      const total = sum(values);
      const area = t.w * total;
      const spec = statSpec("freqPolygon", t, values, { total, bars: true });
      const facts: Record<string, number> = { total, area };
      packDist(t.lo, t.w, values, facts);

      const branch = pick(rng, [0, 1] as const);
      if (branch === 0) {
        return {
          content: `다음은 어느 반 학생 $${total}$명의 ${obj(t.subject)} 조사하여 나타낸 도수분포다각형이다. 이 도수분포다각형과 가로축으로 둘러싸인 부분의 넓이를 구하시오.`,
          answer: `$${area}$`,
          solution: `도수분포다각형과 가로축으로 둘러싸인 부분의 넓이는 히스토그램의 직사각형의 넓이의 합과 같다.\n따라서 (계급의 크기)$\\times$(도수의 총합)$=${t.w}\\times${total}=${area}$이다.`,
          facts: { ...facts, branch, ans: area },
          figureSpec: spec,
        };
      }
      return {
        content: `다음은 어느 반 학생들의 ${obj(t.subject)} 조사하여 나타낸 도수분포다각형이다. 이 도수분포다각형과 가로축으로 둘러싸인 부분의 넓이가 $${area}$일 때, 조사한 학생은 모두 몇 명인지 구하시오.`,
        answer: `$${total}$명`,
        solution: `(넓이)$=$(계급의 크기)$\\times$(도수의 총합)이다.\n계급의 크기가 $${t.w}$이므로 도수의 총합은 $${area}\\div${t.w}=${total}$이다.`,
        facts: { ...facts, branch, ans: total },
        figureSpec: spec,
      };
    }),
  ),

  def(MINOR, "10", "두 도수분포다각형의 비교", SEC.다각형, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const n = intBetween(rng, 4, 5);
      const t = topicFor(rng, n);
      if (!t) return null;
      const a = freqs(rng, n, 2, 12);
      const b = freqs(rng, n, 2, 12);
      if (!a || !b) return null;
      const ta = sum(a);
      const tb = sum(b);
      const spec = statSpec("freqPolygon", t, a, {
        label: "A반",
        series2: { values: [...b], label: "B반" },
      });
      const head = `다음은 A반과 B반 학생들의 ${obj(t.subject)} 조사하여 나타낸 도수분포다각형이다.`;
      const facts: Record<string, number> = { total: ta, totalB: tb };
      packDist(t.lo, t.w, a, facts);
      packValues("g", b, facts);

      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        const i = intBetween(rng, 0, n - 1);
        const gap = a[i]! - b[i]!;
        if (gap <= 0) return null;
        return {
          content: `${head} ${t.tex(t.lo + i * t.w)} 이상 ${t.tex(t.lo + (i + 1) * t.w)} 미만인 계급에서 A반 학생 수는 B반 학생 수보다 몇 명 더 많은지 구하시오.`,
          answer: `$${gap}$명`,
          solution: `그 계급의 도수는 A반이 $${a[i]}$, B반이 $${b[i]}$이다.\n따라서 $${a[i]}-${b[i]}=${gap}$(명) 더 많다.`,
          facts: { ...facts, branch, i, ans: gap },
          figureSpec: spec,
        };
      }
      if (branch === 1) {
        return {
          content: `${head} A반 학생은 모두 몇 명인지 구하시오.`,
          answer: `$${ta}$명`,
          solution: `A반의 각 계급의 도수를 모두 더하면 ${a
            .map((v) => `$${v}$`)
            .join("+")}$=${ta}$이다.`,
          facts: { ...facts, branch, ans: ta },
          figureSpec: spec,
        };
      }
      const j = intBetween(rng, 1, n - 1);
      const ca = sum(a.slice(j));
      const cb = sum(b.slice(j));
      if (ca <= cb) return null;
      return {
        content: `${head} ${subj(t.subject)} ${t.tex(t.lo + j * t.w)} 이상인 학생 수는 A반이 B반보다 몇 명 더 많은지 구하시오.`,
        answer: `$${ca - cb}$명`,
        solution: `${t.tex(t.lo + j * t.w)} 이상인 학생은 A반이 $${ca}$명, B반이 $${cb}$명이다.\n따라서 $${ca}-${cb}=${ca - cb}$(명) 더 많다.`,
        facts: { ...facts, branch, j, ans: ca - cb },
        figureSpec: spec,
      };
    }),
  ),

  // ── 12·13·14·17·18·19 상대도수 ──────────────────────
  def(MINOR, "12", "상대도수 구하기", SEC.상대도수, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const branch = pick(rng, [0, 1] as const);
      const n = intBetween(rng, 4, 5);
      const t = topicFor(rng, n);
      if (!t) return null;
      const p = relPercents(rng, n);
      if (!p) return null;
      const total = pick(rng, REL_TOTALS);
      const values = p.map((x) => (total * x) / 100);
      if (values.some((v) => !Number.isInteger(v) || v < 1)) return null;
      const facts: Record<string, number> = { total };
      packDist(t.lo, t.w, values, facts);
      packValues("p", p, facts);

      if (branch === 0) {
        const i = intBetween(rng, 0, n - 1);
        const rows: string[][] = values.map((v, k) => [
          bandLong(t.lo, t.w, k),
          String(v),
        ]);
        rows.push(["합계", String(total)]);
        const spec = tableSpec([t.head, "도수(명)"], rows);
        return {
          content: `다음은 어느 중학교 학생 $${total}$명의 ${obj(t.subject)} 조사하여 나타낸 도수분포표이다. ${t.tex(t.lo + i * t.w)} 이상 ${t.tex(t.lo + (i + 1) * t.w)} 미만인 계급의 상대도수를 구하시오.`,
          answer: `$${dec(p[i]!)}$`,
          solution: `(계급의 상대도수)$=\\dfrac{(\\text{계급의 도수})}{(\\text{도수의 총합})}$이다.\n따라서 $\\dfrac{${values[i]}}{${total}}=${dec(p[i]!)}$이다.`,
          facts: { ...facts, branch, i, ans: p[i]! / 100 },
          figureSpec: spec,
        };
      }
      const maxV = Math.max(...values);
      const i = values.indexOf(maxV);
      const spec = statSpec("freqPolygon", t, values, { total });
      return {
        content: `다음은 어느 중학교 학생 $${total}$명의 ${obj(t.subject)} 조사하여 나타낸 도수분포다각형이다. 도수가 가장 큰 계급의 상대도수를 구하시오.`,
        answer: `$${dec(p[i]!)}$`,
        solution: `도수가 가장 큰 계급의 도수는 $${maxV}$이다.\n따라서 상대도수는 $\\dfrac{${maxV}}{${total}}=${dec(p[i]!)}$이다.`,
        facts: { ...facts, branch, i, ans: p[i]! / 100 },
        figureSpec: spec,
      };
    }),
  ),

  def(MINOR, "13", "상대도수의 분포표의 이해", SEC.상대도수, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const n = intBetween(rng, 4, 5);
      const t = topicFor(rng, n);
      if (!t) return null;
      const p = relPercents(rng, n);
      if (!p) return null;
      const total = pick(rng, REL_TOTALS);
      const values = p.map((x) => (total * x) / 100);
      if (values.some((v) => !Number.isInteger(v) || v < 1)) return null;
      const facts: Record<string, number> = { total };
      packDist(t.lo, t.w, values, facts);
      packValues("p", p, facts);

      const branch = pick(rng, [0, 1, 2] as const);
      const i = intBetween(rng, 0, n - 1);
      const rows: string[][] = values.map((v, k) => [
        bandShort(t.lo, t.w, k),
        branch === 0 && k === i ? "A" : String(v),
        branch === 1 && k === i ? "A" : dec(p[k]!),
      ]);
      rows.push(["합계", branch === 2 ? "A" : String(total), "1"]);
      const spec = tableSpec([t.head, "도수(명)", "상대도수"], rows);
      const head = `다음은 어느 중학교 학생들의 ${obj(t.subject)} 조사하여 나타낸 상대도수의 분포표이다. ${BAND_RULE(t, t.lo, t.w)}`;

      if (branch === 0) {
        return {
          content: `${head} $A$ 의 값을 구하시오.`,
          answer: `$${values[i]}$`,
          solution: `(계급의 도수)$=$(도수의 총합)$\\times$(계급의 상대도수)이다.\n따라서 $A=${total}\\times${dec(p[i]!)}=${values[i]}$이다.`,
          facts: { ...facts, branch, i, ans: values[i]! },
          figureSpec: spec,
        };
      }
      if (branch === 1) {
        return {
          content: `${head} $A$ 의 값을 구하시오.`,
          answer: `$${dec(p[i]!)}$`,
          solution: `(계급의 상대도수)$=\\dfrac{(\\text{계급의 도수})}{(\\text{도수의 총합})}$이다.\n따라서 $A=\\dfrac{${values[i]}}{${total}}=${dec(p[i]!)}$이다.`,
          facts: { ...facts, branch, i, ans: p[i]! / 100 },
          figureSpec: spec,
        };
      }
      return {
        content: `${head} $A$ 의 값을 구하시오.`,
        answer: `$${total}$`,
        solution: `상대도수의 총합은 항상 $1$ 이고, 어느 계급이든 (도수의 총합)$=\\dfrac{(\\text{계급의 도수})}{(\\text{계급의 상대도수})}$이다.\n첫 계급으로 셈하면 $A=\\dfrac{${values[0]}}{${dec(p[0]!)}}=${total}$이다.`,
        facts: { ...facts, branch, ans: total },
        figureSpec: spec,
      };
    }),
  ),

  def(
    MINOR,
    "14",
    "일부가 보이지 않는 상대도수의 분포표",
    SEC.상대도수,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const t = pick(rng, GTOPICS);
        const total = pick(rng, REL_TOTALS);
        const p1 = pick(rng, [5, 10, 15, 20] as const);
        const p2 = pick(rng, [10, 20, 25, 30, 35, 40] as const);
        if (p1 === p2) return null;
        const d1 = (total * p1) / 100;
        const d2 = (total * p2) / 100;
        if (!Number.isInteger(d1) || !Number.isInteger(d2)) return null;
        if (d1 < 1 || d2 < 1) return null;
        const i = intBetween(rng, 0, Math.min(2, t.maxN - 2));
        const rows = [
          [bandShort(t.lo, t.w, i), String(d1), dec(p1)],
          [bandShort(t.lo, t.w, i + 1), "", dec(p2)],
        ];
        const spec = tableSpec([t.head, "도수(명)", "상대도수"], rows);
        return {
          content: `다음은 어느 중학교 학생들의 ${obj(t.subject)} 조사하여 나타낸 상대도수의 분포표인데 일부가 찢어져 보이지 않는다. ${BAND_RULE(t, t.lo + i * t.w, t.w)} ${t.tex(t.lo + (i + 1) * t.w)} 이상 ${t.tex(t.lo + (i + 2) * t.w)} 미만인 계급의 도수를 구하시오.`,
          answer: `$${d2}$명`,
          solution: `(도수의 총합)$=\\dfrac{(\\text{계급의 도수})}{(\\text{계급의 상대도수})}=\\dfrac{${d1}}{${dec(p1)}}=${total}$이다.\n따라서 구하는 도수는 $${total}\\times${dec(p2)}=${d2}$이다.`,
          facts: { total, p1, p2, d1, d2, i, lo: t.lo, w: t.w, ans: d2 },
          figureSpec: spec,
        };
      }),
  ),

  def(
    MINOR,
    "17",
    "상대도수의 분포를 나타낸 그래프",
    SEC.상대도수,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const n = 4;
        const t = topicFor(rng, n);
        if (!t) return null;
        const p = relPercents(rng, n);
        if (!p) return null;
        const total = pick(rng, REL_TOTALS);
        const counts = p.map((x) => (total * x) / 100);
        if (counts.some((v) => !Number.isInteger(v) || v < 1)) return null;
        const rel = p.map((x) => x / 100);
        const spec = statSpec("freqPolygon", t, rel, {
          total: 1,
          yLabel: "(상대도수)",
        });
        const head = `다음은 어느 중학교 학생 $${total}$명의 ${obj(t.subject)} 조사하여 상대도수의 분포를 나타낸 그래프이다.`;
        const facts: Record<string, number> = { total };
        packDist(t.lo, t.w, p, facts);

        const branch = pick(rng, [0, 1] as const);
        const i = intBetween(rng, 0, n - 1);
        if (branch === 0) {
          return {
            content: `${head} ${t.tex(t.lo + i * t.w)} 이상 ${t.tex(t.lo + (i + 1) * t.w)} 미만인 학생은 몇 명인지 구하시오.`,
            answer: `$${counts[i]}$명`,
            solution: `(계급의 도수)$=$(도수의 총합)$\\times$(계급의 상대도수)이다.\n그 계급의 상대도수가 $${dec(p[i]!)}$이므로 $${total}\\times${dec(p[i]!)}=${counts[i]}$(명)이다.`,
            facts: { ...facts, branch, i, ans: counts[i]! },
            figureSpec: spec,
          };
        }
        const j = intBetween(rng, 1, n - 1);
        const pct = sum(p.slice(j));
        if (pct < 10 || pct > 70) return null;
        return {
          content: `${head} ${subj(t.subject)} ${t.tex(t.lo + j * t.w)} 이상인 학생은 전체의 몇 $\\%$인지 구하시오.`,
          answer: `$${pct}\\%$`,
          solution: `해당하는 계급의 상대도수를 더하면 ${p
            .slice(j)
            .map((x) => `$${dec(x)}$`)
            .join(
              "+",
            )}$=${dec(pct)}$이다.\n따라서 전체의 $${dec(pct)}\\times100=${pct}\\,(\\%)$이다.`,
          facts: { ...facts, branch, j, ans: pct },
          figureSpec: spec,
        };
      }),
  ),

  def(
    MINOR,
    "18",
    "일부가 보이지 않는 상대도수의 분포를 나타낸 그래프",
    SEC.상대도수,
    "심화",
    (rng) =>
      attempt(200, (): Body | null => {
        const n = 5;
        const t = topicFor(rng, n);
        if (!t) return null;
        const p = relPercents(rng, n);
        if (!p) return null;
        const total = pick(rng, REL_TOTALS);
        const counts = p.map((x) => (total * x) / 100);
        if (counts.some((v) => !Number.isInteger(v) || v < 1)) return null;
        const h = intBetween(rng, 1, n - 2);
        const rel = p.map((x) => x / 100);
        const spec = statSpec("histogram", t, rel, {
          total: 1,
          hidden: [h],
          yLabel: "(상대도수)",
        });
        const seen = sum(p) - p[h]!;
        const band = `${t.tex(t.lo + h * t.w)} 이상 ${t.tex(t.lo + (h + 1) * t.w)} 미만`;
        const facts: Record<string, number> = { total, h };
        packDist(t.lo, t.w, p, facts);

        const branch = pick(rng, [0, 1] as const);
        if (branch === 0) {
          return {
            content: `다음은 어느 중학교 학생들의 ${obj(t.subject)} 조사하여 상대도수의 분포를 나타낸 그래프인데 일부가 찢어져 보이지 않는다. ${band}인 계급의 상대도수를 구하시오.`,
            answer: `$${dec(p[h]!)}$`,
            solution: `상대도수의 총합은 항상 $1$ 이다.\n보이는 계급의 상대도수의 합이 $${dec(seen)}$이므로 구하는 상대도수는 $1-${dec(seen)}=${dec(p[h]!)}$이다.`,
            facts: { ...facts, branch, ans: p[h]! / 100 },
            figureSpec: spec,
          };
        }
        return {
          content: `다음은 어느 중학교 학생 $${total}$명의 ${obj(t.subject)} 조사하여 상대도수의 분포를 나타낸 그래프인데 일부가 찢어져 보이지 않는다. ${band}인 학생은 몇 명인지 구하시오.`,
          answer: `$${counts[h]}$명`,
          solution: `상대도수의 총합은 항상 $1$ 이므로 보이지 않는 계급의 상대도수는 $1-${dec(seen)}=${dec(p[h]!)}$이다.\n따라서 학생 수는 $${total}\\times${dec(p[h]!)}=${counts[h]}$(명)이다.`,
          facts: { ...facts, branch, ans: counts[h]! },
          figureSpec: spec,
        };
      }),
  ),

  def(
    MINOR,
    "19",
    "도수의 총합이 다른 두 집단의 비교",
    SEC.상대도수,
    "심화",
    (rng) =>
      attempt(300, (): Body | null => {
        const n = 4;
        const t = topicFor(rng, n);
        if (!t) return null;
        const pa = relPercents(rng, n);
        const pb = relPercents(rng, n);
        if (!pa || !pb) return null;
        const na = pick(rng, REL_TOTALS);
        const nb = pick(rng, REL_TOTALS);
        if (na === nb) return null;
        const ca = pa.map((x) => (na * x) / 100);
        const cb = pb.map((x) => (nb * x) / 100);
        if (ca.some((v) => !Number.isInteger(v) || v < 1)) return null;
        if (cb.some((v) => !Number.isInteger(v) || v < 1)) return null;
        const spec = statSpec(
          "freqPolygon",
          t,
          pa.map((x) => x / 100),
          {
            label: "A반",
            series2: { values: pb.map((x) => x / 100), label: "B반" },
            yLabel: "(상대도수)",
          },
        );
        const head = `다음은 A반 학생 $${na}$명과 B반 학생 $${nb}$명의 ${obj(t.subject)} 조사하여 상대도수의 분포를 나타낸 그래프이다.`;
        const facts: Record<string, number> = { total: na, totalB: nb };
        packDist(t.lo, t.w, pa, facts);
        packValues("g", pb, facts);

        const i = intBetween(rng, 0, n - 1);
        const band = `${t.tex(t.lo + i * t.w)} 이상 ${t.tex(t.lo + (i + 1) * t.w)} 미만`;
        const branch = pick(rng, [0, 1] as const);
        if (branch === 0) {
          return {
            content: `${head} ${band}인 A반 학생은 몇 명인지 구하시오.`,
            answer: `$${ca[i]}$명`,
            solution: `(계급의 도수)$=$(도수의 총합)$\\times$(계급의 상대도수)이다.\nA반의 그 계급의 상대도수가 $${dec(pa[i]!)}$이므로 $${na}\\times${dec(pa[i]!)}=${ca[i]}$(명)이다.`,
            facts: { ...facts, branch, i, ans: ca[i]! },
            figureSpec: spec,
          };
        }
        const gap = ca[i]! - cb[i]!;
        if (gap <= 0) return null;
        return {
          content: `${head} ${band}인 학생 수는 A반이 B반보다 몇 명 더 많은지 구하시오.`,
          answer: `$${gap}$명`,
          solution: `A반은 $${na}\\times${dec(pa[i]!)}=${ca[i]}$(명), B반은 $${nb}\\times${dec(pb[i]!)}=${cb[i]}$(명)이다.\n따라서 $${ca[i]}-${cb[i]}=${gap}$(명) 더 많다.`,
          facts: { ...facts, branch, i, ans: gap },
          figureSpec: spec,
        };
      }),
  ),
];
