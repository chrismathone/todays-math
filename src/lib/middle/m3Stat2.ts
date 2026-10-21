/**
 * 중3 «산포도»(01~07) + «상자그림과 산점도»(01~10) — RPM 3-2, 물결 6E 소유 모듈.
 *
 * 이 파일은 `boxPlot`·`scatterPlot` 을 **처음 쓰는 자리**다(엔진도 이 물결이 새로
 * 짰다, `scripts/figure/elem_advanced.py`). 09-figure-engine-guide.md §2.1 표를
 * 같이 보라.
 *
 * 우리 Unit.section 은 RPM 중단원 둘을 **DB 는 셋으로 쪼갠다**
 * (`prisma/seed-data/units.ts` 7단원):
 *  · «산포도»(편차·분산·표준편차 01~07) 전량 → 「대푯값과 산포도」
 *  · «상자그림과 산점도» 01~05(사분위수·상자그림) → 「상자그림」
 *  · «상자그림과 산점도» 06~10(산점도·상관관계) → 「산점도와 상관관계」
 * RPM 제목이 05(상자그림을 이용한 비교)에서 06(산점도의 이해)으로 넘어가며
 * 소재 자체가 상자그림→산점도로 바뀐다 — 그 경계가 DB 분리 경계와 같다.
 *
 * ## 생성 규칙 — 정답을 먼저 정하고 발문을 역산한다 (m2Pytha.ts 와 동일 계약)
 *
 * `facts` 에 발문의 원 수치를 낱개로 남긴다(배열은 못 담는다 — `MidProblem.facts`
 * 는 `Record<string, number>`). 여러 개인 값(편차·산점도 점)은 `d0..d{n-1}`·
 * `x0..x{n-1}`/`y0..y{n-1}` 처럼 인덱스를 붙여 편다(`m1StatFig.ts` 의 `packValues`
 * 와 같은 무늬).
 *
 * ## 상관관계(08) — 상관은 그림이 세지 않는다, 시험이 점을 세어 확인한다
 *
 * 09 §2.1 의 「점을 훑어 세는 판정 함수를 시험에 넣어라」 — 이 파일은 점의 **순위
 * 배열**을 정확히 고정해서 낸다(모두 증가=양의 상관 · 모두 감소=음의 상관 ·
 * 절반쯤 뒤섞인 고정 순열=무상관). `middleM3Stat2.test.ts` 가 부합쌍(concordant
 * pair) 비율로 다시 센다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { euroRo } from "./m2Josa";
import { simplifySqrt, sqrtTerm } from "./m3Root";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK = "3-2";
const MINOR_DISP = "산포도";
const MINOR_BOX = "상자그림과 산점도";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 7단원, 실측 2026-08-24) */
const SEC = {
  산포도: "대푯값과 산포도",
  상자: "상자그림",
  산점도: "산점도와 상관관계",
} as const;

function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

/** 0 이 아닌 정수를 [-hi, -lo] ∪ [lo, hi] 에서 뽑는다. */
function nonZero(rng: Rng, lo: number, hi: number): number {
  const v = intBetween(rng, lo, hi);
  return pick(rng, [1, -1] as const) * v;
}

/** 합이 0 인 서로 다른 편차 n개 — 「편차의 합은 항상 0」을 생성기가 직접 지킨다. */
function devsSumZero(rng: Rng, n: number, maxAbs: number): number[] {
  return attempt(300, () => {
    const head = Array.from({ length: n - 1 }, () => nonZero(rng, 1, maxAbs));
    const last = -head.reduce((s, v) => s + v, 0);
    if (last === 0 || Math.abs(last) > maxAbs) return null;
    const all = [...head, last];
    if (new Set(all).size !== all.length) return null;
    return all;
  });
}

/** [lo,hi] 안의 서로 다른 정수 n개를 뽑아 오름차순으로. */
function distinctSorted(rng: Rng, n: number, lo: number, hi: number): number[] {
  const avail: number[] = [];
  for (let v = lo; v <= hi; v += 1) avail.push(v);
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const idx = intBetween(rng, 0, avail.length - 1);
    out.push(avail[idx]!);
    avail.splice(idx, 1);
  }
  return out.sort((a, b) => a - b);
}

/** n=7 사분위수 — 중앙값의 중앙값(홀수 n, 절반씩 중앙값 제외). */
function quartiles7(sorted: readonly number[]): {
  min: number;
  q1: number;
  med: number;
  q3: number;
  max: number;
} {
  if (sorted.length !== 7) throw new Error("quartiles7 은 7개 값만 받습니다");
  return {
    min: sorted[0]!,
    q1: sorted[1]!,
    med: sorted[3]!,
    q3: sorted[5]!,
    max: sorted[6]!,
  };
}

/** 숫자를 한자 수사로 읽었을 때 받침이 있는가(0~9) — `src/lib/elementary/rules.ts`
 * 의 `JOSA_BATCHIM` 표와 같은 값이다(이 파일은 그 정본을 import 하지 않고 이
 * 저장소의 다른 조사 처리와 같은 무늬로 로컬에 둔다).
 */
const NUM_BATCHIM = [
  true,
  true,
  false,
  true,
  false,
  false,
  true,
  true,
  true,
  false,
] as const;
function eulReul(n: number): "을" | "를" {
  return NUM_BATCHIM[Math.abs(n) % 10] ? "을" : "를";
}

/**
 * **편차의 제곱을 지면에 쓰는 꼴** — 음수만 괄호로 싼다.
 *
 * ⚠️ 양수까지 괄호로 싸면 `(3)^2` 가 되어 지면이 흉하다. 값은 맞으므로 **값 검산은
 *    이 부류를 구조적으로 못 잡는다**(CLAUDE.md 2026-08-24 「값이 맞으면 시험이 다
 *    초록이다」). 그래서 규칙을 한 곳에 두고 쓰는 쪽이 모두 이것을 부른다.
 */
function sqTex(d: number): string {
  return d < 0 ? `(${d})^2` : `${d}^2`;
}

/**
 * **편차를 지면에 쓰는 꼴** — 0 에는 부호를 안 붙인다.
 *
 * ⚠️ `d >= 0 ? "+" : ""` 로 쓰면 편차가 0 인 변량에서 **`+0`** 이 지면에 나간다.
 *    값은 맞으므로 값 검산도 KaTeX 도 이 부류를 구조적으로 못 잡는다
 *    (CLAUDE.md 2026-08-24 「값이 맞으면 시험이 다 초록이다」). 편차가 0 일 수
 *    있는 자리는 **자료에서 평균을 빼는** 갈래(08·10)다 — `devsSumZero` 로 만든
 *    편차는 0 을 안 내므로 01~03 은 이 함수가 없어도 같은 글을 낸다.
 */
function devTex(d: number): string {
  return d > 0 ? `+${d}` : String(d);
}

/** 한글 단어의 마지막 음절에 받침이 있는가. */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

function packValues(
  prefix: string,
  values: readonly number[],
  out: Record<string, number>,
): void {
  values.forEach((v, i) => {
    out[`${prefix}${i}`] = v;
  });
}

/** 모눈 자료의 실제 읽기 검수 전까지 원자료 목록을 함께 유지한다.
 * 세트 중복은 별도의 학생 입력 비교가 맡는다(studentInputIdentity.ts).
 */
function pointsList(pts: readonly (readonly [number, number])[]): string {
  return pts.map(([x, y]) => `$(${x}, ${y})$`).join(", ");
}

/** 산점도만 5점 교점으로 제한한다. 상자그림·산포도의 기존 정수 풀은 바꾸지 않는다. */
function scatterSorted(rng: Rng, n: number, lo: number, hi: number): number[] {
  if (lo % 5 || hi % 5 || (hi - lo) / 5 + 1 < n) {
    throw new Error("산점도 5점 자료의 범위와 개수를 확인하십시오");
  }
  return distinctSorted(rng, n, lo / 5, hi / 5).map((v) => v * 5);
}

function scatterValue(rng: Rng, lo: number, hi: number): number {
  if (lo % 5 || hi % 5) throw new Error("산점도 자료의 양 끝은 5의 배수여야 합니다");
  return intBetween(rng, lo / 5, hi / 5) * 5;
}

function scatterAxis(min: 20 | 30) {
  return { axisMin: min, axisMax: 100, axisStep: 10 };
}

/** 값 범위를 담는 「예쁜」 축 — 걸음은 `1·2·5·10·20·25·50·100` 사다리에서 고른다.
 * `boxPlot`·`scatterPlot` 은 축을 **부르는 쪽이 정한다**(09 §2.1) — 여기서 고른다.
 */
const AXIS_LADDER = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500] as const;
function niceAxis(
  lo: number,
  hi: number,
): { axisMin: number; axisMax: number; axisStep: number } {
  const span = Math.max(hi - lo, 1);
  const raw = span / 4;
  const step =
    AXIS_LADDER.find((s) => s >= raw) ?? AXIS_LADDER[AXIS_LADDER.length - 1]!;
  const axisMin = Math.floor(lo / step) * step;
  let axisMax = Math.ceil(hi / step) * step;
  if (axisMax === axisMin) axisMax += step;
  return { axisMin, axisMax, axisStep: step };
}

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

const NAMES5 = ["A", "B", "C", "D", "E"] as const;

/**
 * 실생활 두 변량의 상관관계 (유형 13) — **셋은 서로 배타여야 한다.** 한 짝이 두
 * 갈래에 걸치면 답이 둘이 되고, 그때 지면은 「고르시오」라고 하면서 고를 수 없다.
 *
 * ⚠️ 「걸리는 시간」류는 **거리를 고정해야** 음의 상관관계다. 거리가 자유로우면
 *    속력이 빨라도 시간이 길 수 있다 — 그래서 「같은 거리를 갈 때」를 붙였다.
 *    「물건의 값과 판매량」도 같은 물건이어야 뜻이 선다.
 */
const CORRELATION_KINDS = ["양", "음", "없"] as const;
const CORRELATION_EXAMPLES: Record<
  (typeof CORRELATION_KINDS)[number],
  readonly string[]
> = {
  양: [
    "키와 몸무게",
    "공부한 시간과 시험 점수",
    "여름철 기온과 아이스크림 판매량",
    "도시의 인구수와 자동차 등록 대수",
    "산의 높이와 정상까지 오르는 데 걸리는 시간",
  ],
  음: [
    "겨울철 기온과 난방비",
    "산의 높이와 그 지점의 기온",
    "같은 거리를 갈 때 자동차의 속력과 걸리는 시간",
    "같은 물건의 값과 팔린 개수",
    "통학 거리와 등교 후 남는 시간",
  ],
  없: [
    "발의 길이와 시력",
    "이름의 글자 수와 몸무게",
    "학생의 키와 수학 점수",
    "태어난 달과 통학 거리",
    "손가락의 길이와 하루에 마시는 물의 양",
  ],
};

export const M3_STAT2: TypeEntry[] = [
  // ══════════════ 산포도 (01~07) — SEC.산포도 「대푯값과 산포도」 ══════════════
  def(MINOR_DISP, "01", "편차", SEC.산포도, "기본", (rng) => {
    const mean = intBetween(rng, 60, 90);
    const devs = devsSumZero(rng, 5, 15);
    const values = devs.map((d) => mean + d);
    const idx = intBetween(rng, 0, 4);
    const facts: Record<string, number> = { mean, idx };
    packValues("v", values, facts);
    packValues("d", devs, facts);
    return {
      content: `다음은 학생 $5$명 ${NAMES5.join(", ")}의 수학 점수이다.\n${NAMES5.map((n, i) => `${n}: $${values[i]}$점`).join(", ")}\n이 자료의 평균이 $${mean}$점일 때, 학생 ${NAMES5[idx]}의 점수의 편차를 구하시오.`,
      answer: `$${devs[idx]}$점`,
      solution: `편차는 (변량)$-$(평균)이므로 학생 ${NAMES5[idx]}의 편차는 $${values[idx]}-${mean}=${devs[idx]}$(점)이다.`,
      facts,
      figureSpec: null,
    };
  }),

  def(
    MINOR_DISP,
    "02",
    "편차를 이용하여 변량 구하기",
    SEC.산포도,
    "응용",
    (rng) => {
      const knowns = devsSumZero(rng, 5, 15).slice(0, 4);
      const x = -knowns.reduce((s, v) => s + v, 0);
      const facts: Record<string, number> = { x };
      packValues("d", knowns, facts);
      return {
        content: `학생 $5$명의 수학 점수의 편차가 각각 $${knowns.map((d) => (d >= 0 ? `+${d}` : `${d}`)).join("$점, $")}$점, $x$점이다. 편차의 합은 항상 $0$임을 이용하여 $x$의 값을 구하시오.`,
        answer: `$x=${x}$`,
        solution: `편차의 합은 항상 $0$이므로 $${knowns.map((d, i) => (i === 0 ? `${d}` : d >= 0 ? `+${d}` : `${d}`)).join("")}+x=0$이다.\n따라서 $x=${x}$이다.`,
        facts,
        figureSpec: null,
      };
    },
  ),

  def(MINOR_DISP, "03", "분산과 표준편차", SEC.산포도, "응용", (rng) =>
    attempt(200, () => {
      const devs = devsSumZero(rng, 5, 9);
      const sumSq = devs.reduce((s, d) => s + d * d, 0);
      if (sumSq % 5 !== 0) return null;
      const variance = sumSq / 5;
      if (variance < 1) return null;
      const { out, inner } = simplifySqrt(variance);
      const sdTex = sqrtTerm(out, inner);
      const facts: Record<string, number> = { variance, out, inner };
      packValues("d", devs, facts);
      return {
        content: `학생 $5$명의 수학 점수의 편차가 각각 ${devs.map((d) => `$${d >= 0 ? "+" : ""}${d}$점`).join(", ")}이다. 이 자료의 표준편차를 구하시오.`,
        answer: `$${sdTex}\\,\\mathrm{점}$`,
        solution: `분산은 편차의 제곱의 평균이므로 $\\dfrac{${devs.map((d) => sqTex(d)).join("+")}}{5}=\\dfrac{${sumSq}}{5}=${variance}$이다.\n표준편차는 분산의 양의 제곱근이므로 $${sdTex === `\\sqrt{${variance}}` ? sdTex : `\\sqrt{${variance}}=${sdTex}`}$(점)이다.`,
        facts,
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_DISP,
    "04",
    "평균과 분산을 이용하여 식의 값 구하기",
    SEC.산포도,
    "응용",
    (rng) => {
      const variance = intBetween(rng, 2, 20);
      const a = intBetween(rng, 2, 4);
      const b = nonZero(rng, 1, 5);
      const newVar = a * a * variance;
      return {
        content: `어떤 자료의 분산이 $${variance}$일 때, 이 자료의 각 변량을 $${a}$배 하고 ${b >= 0 ? `$${b}$${eulReul(b)} 더한` : `$${-b}$${eulReul(-b)} 뺀`} 새로운 자료의 분산을 구하시오.`,
        answer: `$${newVar}$`,
        solution: `변량을 $${a}$배 하면 분산은 $${a}^2=${a * a}$배가 되고, 상수를 더하거나 빼는 것은 분산에 영향을 주지 않는다.\n따라서 새로운 자료의 분산은 $${a}^2\\times${variance}=${newVar}$이다.`,
        facts: { variance, a, b, newVar },
        figureSpec: null,
      };
    },
  ),

  def(MINOR_DISP, "05", "자료의 이해", SEC.산포도, "기본", (rng) =>
    attempt(200, () => {
      const values = distinctSorted(rng, 5, 40, 90);
      const sum = values.reduce((s, v) => s + v, 0);
      if (sum % 5 !== 0) return null;
      const mean = sum / 5;
      const facts: Record<string, number> = { mean, sum };
      packValues("v", values, facts);
      return {
        content: `다음은 학생 $5$명의 몸무게를 조사하여 나타낸 것이다. ${values.map((v) => `$${v}\\,\\mathrm{kg}$`).join(", ")}\n이 자료의 평균을 구하시오.`,
        answer: `$${mean}\\,\\mathrm{kg}$`,
        solution: `평균은 변량의 총합을 변량의 개수로 나눈 값이므로 $\\dfrac{${values.join("+")}}{5}=\\dfrac{${sum}}{5}=${mean}\\,\\mathrm{kg}$이다.`,
        facts,
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_DISP,
    "06",
    "두 집단 전체의 평균 분산 표준편차",
    SEC.산포도,
    "응용",
    (rng) =>
      // 🔴 「전체 평균이 정수」 거름이 **치우침**을 만들었다 — $n_1=n_2$ 면 $m_1-m_2$ 가 짝수이기만
      //    하면 되고, $m_1=m_2$ 면 늘 나누어떨어진다. 그래서 통과한 판의 49.2% 가 두 반 학생 수가
      //    같고 15.9% 가 두 평균이 같았다(씨앗 1,000 중 62.7% 가 「$8$명 … $8$명」·「$63$점 … $63$점」,
      //    전체 평균이 곧 주어진 평균 15.1% — 2026-09-27 전수). 학생 수가 같으면 가중평균이 그냥
      //    두 평균의 평균이 되고, 평균이 같으면 답이 발문에 있다 — 둘 다 다르게 뽑는다.
      //    한 번 시도의 통과율이 20.4% → 7.8% 라 시도 200 → 400(던질 확률 $9\times10^{-15}$).
      attempt(400, () => {
        const n1 = intBetween(rng, 4, 8);
        const n2 = intBetween(rng, 4, 8);
        const m1 = intBetween(rng, 60, 90);
        const m2 = intBetween(rng, 60, 90);
        if (n1 === n2 || m1 === m2) return null;
        const total = n1 * m1 + n2 * m2;
        if (total % (n1 + n2) !== 0) return null;
        const combined = total / (n1 + n2);
        return {
          content: `A반 학생 $${n1}$명의 수학 점수의 평균이 $${m1}$점이고, B반 학생 $${n2}$명의 수학 점수의 평균이 $${m2}$점이다. 두 반 전체 학생의 수학 점수의 평균을 구하시오.`,
          answer: `$${combined}$점`,
          solution: `두 반 전체의 평균은 (전체 변량의 총합)$\\div$(전체 학생 수)이다.\n전체 변량의 총합은 $${n1}\\times${m1}+${n2}\\times${m2}=${total}$이고, 전체 학생 수는 $${n1}+${n2}=${n1 + n2}$이다.\n따라서 전체 평균은 $\\dfrac{${total}}{${n1 + n2}}=${combined}$점이다.`,
          facts: { n1, n2, m1, m2, combined },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_DISP,
    "07",
    "변화된 변량의 평균 분산 표준편차",
    SEC.산포도,
    "응용",
    (rng) => {
      const sd = intBetween(rng, 2, 10);
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const c = nonZero(rng, 1, 8);
        return {
          content: `어떤 자료의 표준편차가 $${sd}$일 때, 각 변량에 ${c >= 0 ? `$${c}$${eulReul(c)} 더한` : `$${-c}$${eulReul(-c)} 뺀`} 새로운 자료의 표준편차를 구하시오.`,
          answer: `$${sd}$`,
          solution: `모든 변량에 같은 수를 더하거나 빼도 변량 사이의 흩어진 정도는 변하지 않으므로 분산과 표준편차는 변하지 않는다.\n따라서 새로운 자료의 표준편차는 $${sd}$${euroRo(sd)} 처음과 같다.`,
          facts: { sd, mode, c, k: 0, newSd: sd },
          figureSpec: null,
        };
      }
      const k = intBetween(rng, 2, 4);
      const newSd = k * sd;
      return {
        content: `어떤 자료의 표준편차가 $${sd}$일 때, 각 변량을 $${k}$배 한 새로운 자료의 표준편차를 구하시오.`,
        answer: `$${newSd}$`,
        solution: `변량을 $k$배 하면 표준편차도 $k$배가 되므로 새로운 자료의 표준편차는 $${k}\\times${sd}=${newSd}$이다.`,
        facts: { sd, mode, c: 0, k, newSd },
        figureSpec: null,
      };
    },
  ),

  /**
   * **08 — 자료에서 분산을 직접 구한다** (2026-08-29 추가, RPM 에 없는 우리 유형).
   *
   * ## 왜 넣었나
   *
   * 일일테스트는 **현재 진도 소단원 하나**만 범위로 삼고(`resolveRange.ts`),
   * 「한 시험지에 같은 문항류는 1개만」이라 **문항류 수가 곧 한 시험지의 상한**이다.
   * 원장님 반은 8문항 설정인데 이 소단원은 유형이 7개뿐이라 **7/8 밖에 못 채웠다**
   * (제품 `selectProblems` 로 실측).
   *
   * ## 왜 «이것»인가 — 빈 자리를 세어서 골랐다
   *
   * 기존 일곱은 시작과 끝이 이렇다:
   *   01 자료+평균 → 편차 · 02 편차 → 빠진 편차 · **03 편차 → 표준편차**
   *   04 분산 → 변환된 분산 · **05 자료 → 평균** · 06 두 집단 → 평균
   *   07 표준편차 → 변환된 표준편차
   *
   * **「자료 → 분산」이 없다.** 03 은 편차가 이미 주어진 데서 시작하고 05 는 평균에서
   * 멈춘다. 자료에서 평균·편차를 거쳐 분산까지 가는 **그 소단원의 중심 경로**가
   * 비어 있었다. 시작도 끝도 기존 것과 다르다.
   *
   * ⚠️ **중앙값·최빈값은 여기 넣지 않는다** — 그건 **중1** 대푯값이고 이미 있다
   *    (`m1Book2.ts` 대푯값 02·03). 학년을 어기는 중복이 된다.
   * ⚠️ 숫자만 바꾸거나 발문 어투만 바꾼 것은 **새 유형이 아니다**(그건 같은 유형의
   *    아류다). 2026-08-29 에 초등에서 그런 잡음 73자리를 걷어냈다.
   */
  def(MINOR_DISP, "08", "자료에서 분산 구하기", SEC.산포도, "응용", (rng) =>
    attempt(300, () => {
      const values = distinctSorted(rng, 5, 40, 95);
      const sum = values.reduce((s, v) => s + v, 0);
      if (sum % 5 !== 0) return null;
      const mean = sum / 5;
      const devs = values.map((v) => v - mean);
      const sumSq = devs.reduce((s, d) => s + d * d, 0);
      if (sumSq % 5 !== 0) return null;
      const variance = sumSq / 5;
      // 분산이 너무 작으면 편차가 거의 0 이라 「흩어진 정도」가 안 보인다.
      if (variance < 4) return null;
      const facts: Record<string, number> = { mean, sum, sumSq, variance };
      packValues("v", values, facts);
      packValues("d", devs, facts);
      return {
        content:
          `다음은 학생 $5$명의 수학 점수를 조사하여 나타낸 것이다. ` +
          `${values.map((v) => `$${v}$점`).join(", ")}\n이 자료의 분산을 구하시오.`,
        answer: `$${variance}$`,
        solution:
          `평균은 $\\dfrac{${values.join("+")}}{5}=\\dfrac{${sum}}{5}=${mean}$(점)이다.\n` +
          `각 변량의 편차는 ${devs.map((d) => `$${devTex(d)}$`).join(", ")}이다.\n` +
          `분산은 편차의 제곱의 평균이므로 ` +
          `$\\dfrac{${devs.map((d) => sqTex(d)).join("+")}}{5}=\\dfrac{${sumSq}}{5}=${variance}$이다.`,
        facts,
        figureSpec: null,
      };
    }),
  ),

  /* ── 09·10 도 RPM 색인 밖이다 (2026-08-29 오후). ────────────────────────
   *
   * 08 을 더해 여덟이 됐지만 **10문항** 일일테스트는 여전히 못 채운다(유형 수가
   * 곧 한 시험지의 상한). 갈래도 세어 봤다(제품 `resolveMiddleTier` 실측):
   * 연산 0 · 기본 2 · 응용 6 · 심화 0 — **양 끝이 둘 다 비어 있었다.**
   * 그래서 09 를 연산, 10 을 심화로 지었다.
   */

  /**
   * **09 — 분산과 표준편차의 관계** (연산).
   *
   * 기존 여덟은 전부 «자료» 나 «편차 목록» 에서 시작한다. 여기는 **한 수에서
   * 한 수로** 간다 — 분산의 정의(편차의 제곱의 평균)와 표준편차의 정의(분산의
   * 양의 제곱근)를 한 번 쓰면 끝나는 밑단이다.
   *
   * ⚠️ 03(편차 → 표준편차)과 다르다. 03 은 편차 다섯을 제곱해 더하는 데서
   *    시작하고 답이 $\sqrt{}$ 로 남는다. 여기는 근호가 **떨어지는** 값만 쓴다.
   */
  def(MINOR_DISP, "09", "분산과 표준편차의 관계", SEC.산포도, "연산", (rng) => {
    const mode = pick(rng, [0, 1, 2] as const);
    if (mode === 0) {
      const n = pick(rng, [5, 6, 8, 10] as const);
      const variance = intBetween(rng, 2, 30);
      const sumSq = n * variance;
      return {
        content: `어떤 자료의 변량 $${n}$개의 편차의 제곱의 합이 $${sumSq}$일 때, 이 자료의 분산을 구하시오.`,
        answer: `$${variance}$`,
        solution: `분산은 편차의 제곱의 평균이므로 (편차의 제곱의 합)을 (변량의 개수)로 나눈 값이다.\n따라서 분산은 $\\dfrac{${sumSq}}{${n}}=${variance}$이다.`,
        facts: { n, sumSq, variance, sd: 0, mode, x: variance },
        figureSpec: null,
      };
    }
    const sd = intBetween(rng, 2, 12);
    const variance = sd * sd;
    if (mode === 1) {
      return {
        content: `어떤 자료의 분산이 $${variance}$일 때, 이 자료의 표준편차를 구하시오.`,
        answer: `$${sd}$`,
        solution: `표준편차는 분산의 양의 제곱근이다.\n따라서 표준편차는 $\\sqrt{${variance}}=${sd}$이다.`,
        facts: { n: 0, sumSq: 0, variance, sd, mode, x: sd },
        figureSpec: null,
      };
    }
    return {
      content: `어떤 자료의 표준편차가 $${sd}$일 때, 이 자료의 분산을 구하시오.`,
      answer: `$${variance}$`,
      solution: `분산은 표준편차의 제곱이다.\n따라서 분산은 $${sd}^2=${variance}$이다.`,
      facts: { n: 0, sumSq: 0, variance, sd, mode, x: variance },
      figureSpec: null,
    };
  }),

  /**
   * **10 — 미지수가 있는 자료의 분산** (심화).
   *
   * 02(편차 → 빠진 편차)와 08(자료 → 분산)을 **이어 붙인** 자리다. 02 는 미지수를
   * 찾고 멈추고, 08 은 자료가 다 주어진 데서 시작한다. 「평균과 차 두 조건으로
   * 미지의 두 변량을 먼저 찾고, 그러고 나서 분산까지」가 비어 있었다.
   *
   * ⚠️ $(분산)=\overline{x^{2}}-\overline{x}^{2}$ 은 **고1** 이다. 여기서는 쓰지
   *    않고 편차를 하나씩 적어 제곱의 평균으로 간다(중3 교과서의 길).
   */
  def(
    MINOR_DISP,
    "10",
    "미지수가 있는 자료의 분산",
    SEC.산포도,
    "심화하",
    (rng) =>
      attempt(400, () => {
        const mean = intBetween(rng, 6, 20);
        const known = distinctSorted(rng, 3, Math.max(1, mean - 8), mean + 8);
        const total = 5 * mean - known.reduce((s, v) => s + v, 0);
        const d = intBetween(rng, 2, 10);
        if ((total - d) % 2 !== 0) return null;
        const a = (total - d) / 2;
        const b = (total + d) / 2;
        if (a <= 0) return null;
        const values = [known[0]!, known[1]!, a, b, known[2]!];
        if (new Set(values).size !== 5) return null;
        const devs = values.map((v) => v - mean);
        const sumSq = devs.reduce((s, x) => s + x * x, 0);
        if (sumSq % 5 !== 0) return null;
        const variance = sumSq / 5;
        if (variance < 4) return null;
        const facts: Record<string, number> = {
          mean,
          a,
          b,
          d,
          total,
          sumSq,
          variance,
          x: variance,
        };
        packValues("v", values, facts);
        packValues("k", known, facts);
        return {
          content:
            `$5$개의 변량 $${known[0]}$, $${known[1]}$, $a$, $b$, $${known[2]}$의 평균이 $${mean}$이고 ` +
            `두 변량 $a$, $b$의 차가 $${d}$일 때, 이 자료의 분산을 구하시오. (단, $a<b$)`,
          answer: `$${variance}$`,
          solution:
            `평균이 $${mean}$이므로 $${known[0]}+${known[1]}+a+b+${known[2]}=${mean}\\times5=${5 * mean}$에서 $a+b=${total}$이다.\n` +
            `$b-a=${d}$이므로 두 식을 연립하여 풀면 $a=${a}$, $b=${b}$이다.\n` +
            `각 변량의 편차는 ${devs.map((v) => `$${devTex(v)}$`).join(", ")}이다.\n` +
            `분산은 편차의 제곱의 평균이므로 ` +
            `$\\dfrac{${devs.map((v) => sqTex(v)).join("+")}}{5}=\\dfrac{${sumSq}}{5}=${variance}$이다.`,
          facts,
          figureSpec: null,
        };
      }),
  ),

  // ══ 상자그림과 산점도 01~05 (상자그림) — SEC.상자 「상자그림」 ══
  def(MINOR_BOX, "01", "사분위수", SEC.상자, "응용", (rng) => {
    const sorted = distinctSorted(rng, 7, 5, 60);
    const { min, q1, med, q3, max } = quartiles7(sorted);
    const which = pick(rng, ["q1", "med", "q3"] as const);
    const name = {
      q1: "제$1$사분위수",
      med: "중앙값(제$2$사분위수)",
      q3: "제$3$사분위수",
    }[which];
    const ans = { q1, med, q3 }[which];
    const facts: Record<string, number> = { min, q1, med, q3, max };
    packValues("v", sorted, facts);
    return {
      content: `다음은 어느 자료를 작은 값부터 크기순으로 나열한 것이다. ${sorted.map((v) => `$${v}$`).join(", ")}\n이 자료의 ${name}를 구하시오.`,
      answer: `$${ans}$`,
      solution: `자료를 크기순으로 나열하면 최솟값은 $${min}$, 중앙값은 $${med}$이다.\n중앙값보다 작은 자료 $${sorted.slice(0, 3).join(", ")}$의 중앙값이 제$1$사분위수 $${q1}$이고, 중앙값보다 큰 자료 $${sorted.slice(4).join(", ")}$의 중앙값이 제$3$사분위수 $${q3}$이다.\n따라서 ${name}는 $${ans}$이다.`,
      facts,
      figureSpec: null,
    };
  }),

  def(
    MINOR_BOX,
    "02",
    "사분위수가 주어질 때 변량 구하기",
    SEC.상자,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const sorted = distinctSorted(rng, 7, 5, 60);
        const { q1 } = quartiles7(sorted);
        const facts: Record<string, number> = { x: q1 };
        packValues("v", sorted, facts);
        return {
          content: `다음은 어느 자료를 작은 값부터 크기순으로 나열한 것이다. $${sorted[0]}$, $x$, $${sorted[2]}$, $${sorted[3]}$, $${sorted[4]}$, $${sorted[5]}$, $${sorted[6]}$\n이 자료의 제$1$사분위수가 $${q1}$일 때, $x$의 값을 구하시오. (단, $${sorted[0]}<x<${sorted[2]}$)`,
          answer: `$x=${q1}$`,
          solution: `자료가 이미 크기순으로 나열되어 있으므로 제$1$사분위수는 중앙값보다 작은 자료 $${sorted[0]}$, $x$, $${sorted[2]}$의 중앙값, 즉 $x$이다.\n따라서 $x=${q1}$이다.`,
          facts,
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_BOX, "03", "상자그림으로 나타내기", SEC.상자, "응용", (rng) =>
    attempt(200, () => {
      const sorted = distinctSorted(rng, 7, 10, 70);
      const { min, q1, med, q3, max } = quartiles7(sorted);
      const which = pick(rng, ["q1", "med", "q3"] as const);
      const name = { q1: "제$1$사분위수", med: "중앙값", q3: "제$3$사분위수" }[
        which
      ];
      const ans = { q1, med, q3 }[which];
      const axis = niceAxis(min, max);
      const facts: Record<string, number> = {
        min,
        q1,
        med,
        q3,
        max,
        ans,
        ...axis,
      };
      packValues("v", sorted, facts);
      return {
        content: `다음은 어느 자료를 작은 값부터 크기순으로 나열한 것이다. ${sorted.map((v) => `$${v}$`).join(", ")}\n이 자료를 상자그림으로 나타낼 때, ${name}${hasBatchim(name) ? "을" : "를"} 구하시오.`,
        answer: `$${ans}$`,
        solution: `자료를 크기순으로 나열하여 다섯 수 요약(최솟값 $${min}$, 제$1$사분위수 $${q1}$, 중앙값 $${med}$, 제$3$사분위수 $${q3}$, 최댓값 $${max}$)을 구하면 상자그림을 그릴 수 있다.\n따라서 ${name}${hasBatchim(name) ? "은" : "는"} $${ans}$이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "boxPlot",
          values: [min, q1, med, q3, max],
          axisMin: axis.axisMin,
          axisMax: axis.axisMax,
          axisStep: axis.axisStep,
        },
      };
    }),
  ),

  def(MINOR_BOX, "04", "상자그림의 이해", SEC.상자, "응용", (rng) =>
    attempt(200, () => {
      const sorted = distinctSorted(rng, 7, 10, 70);
      const { min, q1, med, q3, max } = quartiles7(sorted);
      const iqr = q3 - q1;
      const axis = niceAxis(min, max);
      return {
        content: `다음 상자그림은 최솟값이 $${min}$, 최댓값이 $${max}$인 어느 자료를 나타낸 것이다. 이 자료의 사분위수범위를 구하시오.`,
        answer: `$${iqr}$`,
        solution: `사분위수범위는 (제$3$사분위수)$-$(제$1$사분위수)이므로 $${q3}-${q1}=${iqr}$이다.`,
        facts: { min, q1, med, q3, max, iqr, ...axis },
        figureSpec: {
          version: "elem-1",
          kind: "boxPlot",
          values: [min, q1, med, q3, max],
          axisMin: axis.axisMin,
          axisMax: axis.axisMax,
          axisStep: axis.axisStep,
        },
      };
    }),
  ),

  def(
    MINOR_BOX,
    "05",
    "상자그림을 이용한 두 자료의 비교",
    SEC.상자,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const sortedA = distinctSorted(rng, 7, 10, 70);
        const sortedB = distinctSorted(rng, 7, 10, 70);
        const A = quartiles7(sortedA);
        const B = quartiles7(sortedB);
        if (A.med === B.med) return null;
        const diff = Math.abs(A.med - B.med);
        const axis = niceAxis(Math.min(A.min, B.min), Math.max(A.max, B.max));
        const facts: Record<string, number> = {
          aMin: A.min,
          aQ1: A.q1,
          aMed: A.med,
          aQ3: A.q3,
          aMax: A.max,
          bMin: B.min,
          bQ1: B.q1,
          bMed: B.med,
          bQ3: B.q3,
          bMax: B.max,
          diff,
          ...axis,
        };
        return {
          content: `다음 상자그림은 A반(최솟값 $${A.min}$, 최댓값 $${A.max}$)과 B반(최솟값 $${B.min}$, 최댓값 $${B.max}$) 학생들의 수학 점수를 각각 나타낸 것이다. 두 반의 중앙값의 차를 구하시오.`,
          answer: `$${diff}$점`,
          solution: `A반의 중앙값은 $${A.med}$점, B반의 중앙값은 $${B.med}$점이다.\n따라서 두 중앙값의 차는 $|${A.med}-${B.med}|=${diff}$점이다.`,
          facts,
          figureSpec: {
            version: "elem-1",
            kind: "boxPlot",
            values: [A.min, A.q1, A.med, A.q3, A.max],
            label: "A반",
            series2: {
              values: [B.min, B.q1, B.med, B.q3, B.max],
              label: "B반",
            },
            axisMin: axis.axisMin,
            axisMax: axis.axisMax,
            axisStep: axis.axisStep,
            xLabel: "(점)",
          },
        };
      }),
  ),

  // ══ 상자그림과 산점도 06~10 (산점도) — SEC.산점도 「산점도와 상관관계」 ══
  def(MINOR_BOX, "06", "산점도의 이해 ⑴", SEC.산점도, "기본", (rng) =>
    attempt(200, () => {
      const xs = scatterSorted(rng, 7, 40, 95);
      const ys = xs.map(() => scatterValue(rng, 40, 95));
      const threshold = pick(rng, [50, 60, 70, 80] as const);
      const count = xs.filter((x) => x >= threshold).length;
      if (count === 0 || count === xs.length) return null;
      const facts: Record<string, number> = { threshold, count, n: xs.length };
      packValues("x", xs, facts);
      packValues("y", ys, facts);
      const axis = scatterAxis(30);
      return {
        content: `다음은 학생 $${xs.length}$명의 수학 점수($x$)와 과학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}\n수학 점수가 $${threshold}$점 이상인 학생은 모두 몇 명인지 구하시오.`,
        answer: `$${count}$명`,
        solution: `산점도에서 $x$값이 $${threshold}$ 이상인 점의 개수를 세면 $${count}$개이다.\n따라서 수학 점수가 $${threshold}$점 이상인 학생은 $${count}$명이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "scatterPlot",
          gridStep: 5,
          points: xs.map((x, i) => [x, ys[i]!]),
          xMin: axis.axisMin,
          xMax: axis.axisMax,
          xStep: axis.axisStep,
          yMin: axis.axisMin,
          yMax: axis.axisMax,
          yStep: axis.axisStep,
          xLabel: "수학(점)",
          yLabel: "과학(점)",
        },
      };
    }),
  ),

  def(MINOR_BOX, "07", "산점도의 이해 ⑵", SEC.산점도, "응용", (rng) =>
    attempt(200, () => {
      const xs = scatterSorted(rng, 7, 40, 95);
      const ys = xs.map(() =>
        attempt(50, () => {
          const v = scatterValue(rng, 40, 95);
          return v;
        }),
      );
      // x==y 인 짝을 피한다 — 「높다」 판정이 애매해진다.
      for (let i = 0; i < xs.length; i += 1) {
        if (ys[i] === xs[i]) return null;
      }
      const count = xs.filter((x, i) => x > ys[i]!).length;
      if (count === 0 || count === xs.length) return null;
      const facts: Record<string, number> = { count, n: xs.length };
      packValues("x", xs, facts);
      packValues("y", ys, facts);
      const axis = scatterAxis(30);
      return {
        content: `다음은 학생 $${xs.length}$명의 국어 점수($x$)와 영어 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}\n국어 점수가 영어 점수보다 높은 학생은 모두 몇 명인지 구하시오.`,
        answer: `$${count}$명`,
        solution: `산점도에서 대각선 $y=x$보다 아래쪽(즉 $x>y$)에 있는 점의 개수를 세면 $${count}$개이다.\n따라서 국어 점수가 영어 점수보다 높은 학생은 $${count}$명이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "scatterPlot",
          gridStep: 5,
          points: xs.map((x, i) => [x, ys[i]!]),
          xMin: axis.axisMin,
          xMax: axis.axisMax,
          xStep: axis.axisStep,
          yMin: axis.axisMin,
          yMax: axis.axisMax,
          yStep: axis.axisStep,
          xLabel: "국어(점)",
          yLabel: "영어(점)",
        },
      };
    }),
  ),

  def(MINOR_BOX, "08", "산점도와 상관관계", SEC.산점도, "응용", (rng) => {
    const xs = [30, 40, 50, 60, 70, 80];
    const kind = pick(rng, ["pos", "neg", "none"] as const);
    // 순위 순열 — 부합쌍(concordant pair) 비율로 상관을 확정한다(모듈 주석 참고).
    const RANK: Record<string, number[]> = {
      pos: [0, 1, 2, 3, 4, 5],
      neg: [5, 4, 3, 2, 1, 0],
      none: [2, 4, 0, 5, 1, 3],
    };
    const ysSorted = scatterSorted(rng, 6, 30, 90);
    const ys = RANK[kind]!.map((r) => ysSorted[r]!);
    const answerText = {
      pos: "양의 상관관계",
      neg: "음의 상관관계",
      none: "상관관계가 없다",
    }[kind];
    const facts: Record<string, number> = {
      kindCode: kind === "pos" ? 1 : kind === "neg" ? -1 : 0,
    };
    packValues("x", xs, facts);
    packValues("y", ys, facts);
    const axis = scatterAxis(20);
    return {
      content: `다음은 학생 $6$명의 수학 점수($x$)와 과학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}\n이 산점도가 나타내는 상관관계로 알맞은 것을 구하시오.`,
      answer: answerText,
      solution:
        kind === "pos"
          ? "산점도에서 $x$값이 커짐에 따라 $y$값도 대체로 커지는 경향이 있으므로 양의 상관관계이다."
          : kind === "neg"
            ? "산점도에서 $x$값이 커짐에 따라 $y$값은 대체로 작아지는 경향이 있으므로 음의 상관관계이다."
            : "산점도에서 $x$값이 커짐에 따라 $y$값이 커지는지 작아지는지 뚜렷한 경향이 보이지 않으므로 상관관계가 없다.",
      facts,
      figureSpec: {
        version: "elem-1",
        kind: "scatterPlot",
        gridStep: 5,
        points: xs.map((x, i) => [x, ys[i]!]),
        xMin: axis.axisMin,
        xMax: axis.axisMax,
        xStep: axis.axisStep,
        yMin: axis.axisMin,
        yMax: axis.axisMax,
        yStep: axis.axisStep,
        xLabel: "수학(점)",
        yLabel: "과학(점)",
      },
    };
  }),

  /**
   * ⚠️ 2026-08-24 발문을 바꿨다 — 원장님 지시 「상위학년 개념은 배제, 하위는 허용」.
   *
   * 옛 발문은 「가장 낮은 학생과 가장 높은 학생을 **좌표평면 위의 두 점**이라 할 때
   * 두 점 사이의 거리」였다. 그것은 **공통수학2 「도형의 방정식 — 두 점 사이의 거리」**
   * 다(`prisma/seed-data/units.ts:3328`). D-100 ⑶ 이 중등에서 좌표기하를 불허하므로
   * 이 유형 하나가 그 규칙을 어기고 있었다(873 전량을 좌표 표지로 훑어 확인 —
   * 8건이 걸렸지만 나머지 7은 **수직선 위의 거리**라 해당하지 않았다).
   *
   * 새 발문은 「두 점수의 **합**이 $k$점 이상인 학생 수」다. 형제 유형과 안 겹친다:
   *   06 한 축 기준 세기 · 07 대각선 기준 세기(x>y) · 08 상관관계 · 10 평균
   * 두 축을 **함께** 보게 하므로 hard 자리도 그대로다.
   */
  def(MINOR_BOX, "09", "산점도의 분석", SEC.산점도, "심화하", (rng) =>
    attempt(200, () => {
      const n = 8;
      const pts: [number, number][] = [];
      const seen = new Set<string>();
      for (let i = 0; i < n; i += 1) {
        const x = scatterValue(rng, 30, 95);
        const y = scatterValue(rng, 30, 95);
        if (seen.has(`${x},${y}`)) return null; // 같은 점이 겹치면 산점도가 거짓말을 한다
        seen.add(`${x},${y}`);
        pts.push([x, y]);
      }
      const sums = pts.map(([x, y]) => x + y);
      const desc = [...sums].sort((a, b) => b - a);
      // 걸리는 인원이 2~5명이 되게 문턱을 고른다 — 0명이나 8명 전원이면 물음이 죽는다.
      const want = intBetween(rng, 2, 5);
      const k = desc[want - 1]!;
      if (desc[want] === k) return null; // 문턱에 동점이 걸치면 답이 흐려진다
      const hit = pts.filter(([x, y]) => x + y >= k);
      if (hit.length !== want) return null;

      const facts: Record<string, number> = { n, k, count: hit.length };
      packValues(
        "px",
        pts.map((p) => p[0]),
        facts,
      );
      packValues(
        "py",
        pts.map((p) => p[1]),
        facts,
      );
      const axis = scatterAxis(20);
      return {
        content: `다음은 학생 $${pts.length}$명의 국어 점수($x$)와 수학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(pts)}\n국어 점수와 수학 점수의 합이 $${k}$점 이상인 학생은 모두 몇 명인지 구하시오.`,
        answer: `$${hit.length}$명`,
        solution: `두 점수의 합이 $${k}$점 이상인 학생의 점은 ${hit
          .map(([x, y]) => `$(${x},\\,${y})$`)
          .join(", ")}이고, 각각의 합은 ${hit
          .map(([x, y]) => `$${x + y}$`)
          .join(", ")}이다.\n따라서 구하는 학생은 $${hit.length}$명이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "scatterPlot",
          gridStep: 5,
          points: pts,
          xMin: axis.axisMin,
          xMax: axis.axisMax,
          xStep: axis.axisStep,
          yMin: axis.axisMin,
          yMax: axis.axisMax,
          yStep: axis.axisStep,
          xLabel: "국어(점)",
          yLabel: "수학(점)",
        },
      };
    }),
  ),

  def(MINOR_BOX, "10", "산점도에서 평균 구하기", SEC.산점도, "응용", (rng) =>
    attempt(200, () => {
      const xs = scatterSorted(rng, 5, 40, 90);
      const sum = xs.reduce((s, v) => s + v, 0);
      if (sum % 5 !== 0) return null;
      const mean = sum / 5;
      const ys = xs.map(() => scatterValue(rng, 40, 90));
      const facts: Record<string, number> = { mean, sum, n: xs.length };
      packValues("x", xs, facts);
      packValues("y", ys, facts);
      const axis = scatterAxis(30);
      return {
        content: `다음은 학생 $${xs.length}$명의 수학 점수($x$)와 영어 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}\n이 학생들의 수학 점수의 평균을 구하시오.`,
        answer: `$${mean}$점`,
        solution: `산점도에서 각 점의 $x$값을 모두 더하면 $${xs.join("+")}=${sum}$이고, 학생 수는 $${xs.length}$명이다.\n따라서 수학 점수의 평균은 $\\dfrac{${sum}}{${xs.length}}=${mean}$점이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "scatterPlot",
          gridStep: 5,
          points: xs.map((x, i) => [x, ys[i]!]),
          xMin: axis.axisMin,
          xMax: axis.axisMax,
          xStep: axis.axisStep,
          yMin: axis.axisMin,
          yMax: axis.axisMax,
          yStep: axis.axisStep,
          xLabel: "수학(점)",
          yLabel: "영어(점)",
        },
      };
    }),
  ),

  /* ── 아래 11~13 은 RPM 색인 밖이다 (2026-08-29). ─────────────────────────
   *
   * 일일테스트는 **현재 진도 소단원 하나**만 범위로 삼고(`resolveRange.ts`)
   * 「한 시험지에 같은 문항류는 1개만」(원장님 확정 2026-08-26)이라 **유형 수가
   * 곧 한 시험지의 상한**이다. RPM 이 이 소단원에 준 것은 06~10 다섯뿐이라
   * 8문항 일일테스트를 구조적으로 못 채웠다(제품 선정기 실측 5/8, 2026-08-29).
   *
   * 빈 자리는 **끝**(무엇을 묻고 끝나는가)과 **난이도**로 찾았다:
   *   06 개수(기본) · 07 개수(응용) · 08 상관관계(응용) · 09 개수(심화) · 10 평균(응용)
   *   → 연산 0 · 기본 1 · 응용 3 · 심화 1. 8문항 기본 배분은 **1·3·3·1** 이다
   *   (`DEFAULT_DIFFICULTY_RATIO`). 그래서 모자란 것이 정확히 **연산 1 · 기본 2** 다.
   * 끝도 겹치지 않게 골랐다 — 네 번째 「개수」 유형을 넣는 것은 채우기지 유형이 아니다.
   *   11 좌표 읽기(연산) · 12 백분율(기본) · 13 실생활 상관관계(기본, 그림 없음)
   *
   * ⚠️ 엔진의 `scatterPlot` 은 점 **이름표를 안 받는다** — 허용 키는 `points`·축·
   *    `xLabel`·`yLabel`·`title` 뿐이다(`scripts/figure/elem_advanced.py:4856`).
   *    그래서 「A~E 중 누구인가」류(표준 유형이다)는 지면에서 읽을 수 없어 뺐다.
   */
  def(MINOR_BOX, "11", "산점도에서 좌표 읽기", SEC.산점도, "연산", (rng) =>
    attempt(200, () => {
      const n = 7;
      const xs = scatterSorted(rng, n, 40, 95);
      const ys = scatterSorted(rng, n, 40, 95);
      // `distinctSorted` 를 그대로 쓰면 x·y 가 **함께** 오름차순이라 답이 늘 맨
      // 오른쪽 점이 된다 — 그러면 그림을 안 보고도 맞힌다. 그래서 y 만 섞는다.
      for (let i = ys.length - 1; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = ys[i]!;
        ys[i] = ys[j]!;
        ys[j] = t;
      }
      const top = ys.indexOf(Math.max(...ys));
      if (top === n - 1 || top === 0) return null; // 양 끝이면 찍어서 맞는다
      const facts: Record<string, number> = {
        n,
        topY: ys[top]!,
        ans: xs[top]!,
      };
      packValues("x", xs, facts);
      packValues("y", ys, facts);
      const axis = scatterAxis(30);
      return {
        content: `다음은 학생 $${n}$명의 수학 점수($x$)와 과학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}\n과학 점수가 가장 높은 학생의 수학 점수를 구하시오.`,
        answer: `$${xs[top]}$점`,
        solution: `산점도에서 $y$좌표가 가장 큰 점은 $(${xs[top]},\\,${ys[top]})$이다.\n따라서 과학 점수가 가장 높은 학생의 수학 점수는 $${xs[top]}$점이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "scatterPlot",
          gridStep: 5,
          points: xs.map((x, i) => [x, ys[i]!]),
          xMin: axis.axisMin,
          xMax: axis.axisMax,
          xStep: axis.axisStep,
          yMin: axis.axisMin,
          yMax: axis.axisMax,
          yStep: axis.axisStep,
          xLabel: "수학(점)",
          yLabel: "과학(점)",
        },
      };
    }),
  ),

  def(MINOR_BOX, "12", "산점도에서 비율 구하기", SEC.산점도, "기본", (rng) =>
    attempt(300, () => {
      // 학생 수가 곧 분모다 — $10$명이면 백분율이 늘 정수로 떨어진다.
      const n = 10;
      const t = pick(rng, [60, 70, 80] as const);
      const pts: [number, number][] = [];
      const seen = new Set<string>();
      for (let i = 0; i < n; i += 1) {
        const x = scatterValue(rng, 40, 95);
        const y = scatterValue(rng, 40, 95);
        if (seen.has(`${x},${y}`)) return null; // 점이 겹치면 산점도가 거짓말을 한다
        // 문턱에 딱 걸친 점은 「이상」을 그림에서 가르기 어렵다.
        if (x === t || y === t) return null;
        seen.add(`${x},${y}`);
        pts.push([x, y]);
      }
      const hit = pts.filter(([x, y]) => x >= t && y >= t);
      if (hit.length < 2 || hit.length > n - 3) return null;
      const pct = (hit.length * 100) / n;
      const facts: Record<string, number> = {
        n,
        threshold: t,
        count: hit.length,
        ans: pct,
      };
      packValues(
        "px",
        pts.map((p) => p[0]),
        facts,
      );
      packValues(
        "py",
        pts.map((p) => p[1]),
        facts,
      );
      const axis = scatterAxis(30);
      return {
        content: `다음은 학생 $${n}$명의 수학 점수($x$)와 과학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(pts)}\n수학 점수와 과학 점수가 모두 $${t}$점 이상인 학생은 전체의 몇 $\\%$인지 구하시오.`,
        answer: `$${pct}\\%$`,
        solution: `두 점수가 모두 $${t}$점 이상인 점은 ${hit
          .map(([x, y]) => `$(${x},\\,${y})$`)
          .join(
            ", ",
          )}${euroRo(hit[hit.length - 1]![1])} $${hit.length}$개이다.\n따라서 전체의 $\\dfrac{${hit.length}}{${n}}\\times100=${pct}\\,(\\%)$이다.`,
        facts,
        figureSpec: {
          version: "elem-1",
          kind: "scatterPlot",
          gridStep: 5,
          points: pts,
          xMin: axis.axisMin,
          xMax: axis.axisMax,
          xStep: axis.axisStep,
          yMin: axis.axisMin,
          yMax: axis.axisMax,
          yStep: axis.axisStep,
          xLabel: "수학(점)",
          yLabel: "과학(점)",
        },
      };
    }),
  ),

  def(MINOR_BOX, "13", "상관관계의 이해", SEC.산점도, "기본", (rng) => {
    const ask = pick(rng, CORRELATION_KINDS);
    const others = CORRELATION_KINDS.filter((k) => k !== ask);
    const items = [
      pick(rng, CORRELATION_EXAMPLES[ask]),
      pick(rng, CORRELATION_EXAMPLES[others[0]!]),
      pick(rng, CORRELATION_EXAMPLES[others[1]!]),
    ];
    const answer = items[0]!;
    // 답이 늘 첫째 자리면 읽지 않고 찍는다 — 자리를 섞는다.
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = intBetween(rng, 0, i);
      const t = items[i]!;
      items[i] = items[j]!;
      items[j] = t;
    }
    const question =
      ask === "없"
        ? "다음 셋 중에서 두 변량 사이에 상관관계가 없는 것을 고르시오."
        : `다음 셋 중에서 두 변량 사이에 ${ask}의 상관관계가 있는 것을 고르시오.`;
    const why =
      ask === "양"
        ? "한 변량이 커질 때 다른 변량도 대체로 커지면 두 변량 사이에는 양의 상관관계가 있다."
        : ask === "음"
          ? "한 변량이 커질 때 다른 변량은 대체로 작아지면 두 변량 사이에는 음의 상관관계가 있다."
          : "한 변량이 커질 때 다른 변량이 커지는지 작아지는지 뚜렷한 경향이 없으면 두 변량 사이에는 상관관계가 없다.";
    return {
      content: `${question}\n${items.join(" / ")}`,
      answer,
      solution: `${why}\n따라서 구하는 것은 ${answer}이다.`,
      facts: {
        kindCode: ask === "양" ? 1 : ask === "음" ? -1 : 0,
        ansIndex: items.indexOf(answer),
      },
      // 이 유형은 **그림이 없다** — 발문도 그림을 가리키지 않는다
      // (`middleFigureReference.test.ts` 가 그 짝을 지킨다).
      figureSpec: null,
    };
  }),

  /* ── 14·15 (2026-08-29 오후). ───────────────────────────────────────────
   *
   * 11~13 으로 여덟이 됐지만 **10문항** 일일테스트는 아직 못 채운다. 갈래는
   * 이미 넷이 다 차 있으므로(연산 1 · 기본 3 · 응용 3 · 심화 1) 여기서는
   * **10문항 기본 배분 1·4·4·1** 에 맞춰 기본 1 · 응용 1 을 더한다.
   *
   * 끝(무엇을 묻고 끝나는가)이 겹치지 않게 골랐다. 지금 여덟의 끝은
   *   06·07·09 개수 · 08·13 상관관계 · 10 평균 · 11 좌표 · 12 백분율
   * 이라 **네 번째 「개수」 유형을 넣는 것은 채우기지 유형이 아니다.**
   *   14 두 변량의 **차** · 15 **조건을 만족하는 무리의 평균**
   */

  def(
    MINOR_BOX,
    "14",
    "산점도에서 두 변량의 차 구하기",
    SEC.산점도,
    "기본",
    (rng) =>
      attempt(400, () => {
        const n = 7;
        const xs = scatterSorted(rng, n, 40, 95);
        const ys: number[] = [];
        const seen = new Set<string>();
        for (const x of xs) {
          const y = scatterValue(rng, 40, 95);
          if (seen.has(`${x},${y}`)) return null; // 점이 겹치면 산점도가 거짓말을 한다
          seen.add(`${x},${y}`);
          ys.push(y);
        }
        const gaps = xs.map((x, i) => Math.abs(x - ys[i]!));
        const sorted = [...gaps].sort((a, b) => b - a);
        // 최대가 유일하고 2등과 뚜렷이 갈려야 그림에서 읽을 수 있다.
        if (sorted[0]! < 8 || sorted[0]! - sorted[1]! < 3) return null;
        const top = gaps.indexOf(sorted[0]!);
        const facts: Record<string, number> = {
          n,
          diff: sorted[0]!,
          top,
          x: sorted[0]!,
        };
        packValues("x", xs, facts);
        packValues("y", ys, facts);
        const axis = scatterAxis(30);
        return {
          content: `다음은 학생 $${n}$명의 수학 점수($x$)와 과학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}\n두 과목의 점수의 차가 가장 큰 학생의 두 점수의 차를 구하시오.`,
          answer: `$${sorted[0]}$점`,
          solution: `각 점에서 두 좌표의 차를 구하면 ${gaps.map((g) => `$${g}$`).join(", ")}이다.\n그중 가장 큰 것은 점 $(${xs[top]},\\,${ys[top]})$의 $|${xs[top]}-${ys[top]}|=${sorted[0]}$이다.\n따라서 구하는 차는 $${sorted[0]}$점이다.`,
          facts,
          figureSpec: {
            version: "elem-1",
            kind: "scatterPlot",
            gridStep: 5,
            points: xs.map((x, i) => [x, ys[i]!]),
            xMin: axis.axisMin,
            xMax: axis.axisMax,
            xStep: axis.axisStep,
            yMin: axis.axisMin,
            yMax: axis.axisMax,
            yStep: axis.axisStep,
            xLabel: "수학(점)",
            yLabel: "과학(점)",
          },
        };
      }),
  ),

  def(
    MINOR_BOX,
    "15",
    "산점도에서 조건을 만족하는 학생들의 평균 구하기",
    SEC.산점도,
    "응용",
    (rng) =>
      attempt(400, () => {
        const n = 8;
        const t = pick(rng, [60, 70, 80] as const);
        const pts: [number, number][] = [];
        const seen = new Set<string>();
        for (let i = 0; i < n; i += 1) {
          const x = scatterValue(rng, 40, 95);
          const y = scatterValue(rng, 40, 95);
          if (seen.has(`${x},${y}`)) return null;
          // 문턱에 딱 걸친 점은 「이상」을 그림에서 가르기 어렵다.
          if (x === t) return null;
          seen.add(`${x},${y}`);
          pts.push([x, y]);
        }
        const hit = pts.filter(([x]) => x >= t);
        // 무리가 너무 작거나 전원이면 「그 학생들의 평균」이 전체 평균과 같아진다.
        if (hit.length < 3 || hit.length > n - 2) return null;
        const sum = hit.reduce((s, [, y]) => s + y, 0);
        if (sum % hit.length !== 0) return null;
        const mean = sum / hit.length;
        const facts: Record<string, number> = {
          n,
          threshold: t,
          count: hit.length,
          sum,
          mean,
          x: mean,
        };
        packValues(
          "px",
          pts.map((p) => p[0]),
          facts,
        );
        packValues(
          "py",
          pts.map((p) => p[1]),
          facts,
        );
        const axis = scatterAxis(30);
        return {
          content: `다음은 학생 $${n}$명의 수학 점수($x$)와 과학 점수($y$)를 조사하여 나타낸 산점도이다. $(x, y)$: ${pointsList(pts)}\n수학 점수가 $${t}$점 이상인 학생들의 과학 점수의 평균을 구하시오.`,
          answer: `$${mean}$점`,
          solution: `수학 점수가 $${t}$점 이상인 학생의 점은 ${hit
            .map(([x, y]) => `$(${x},\\,${y})$`)
            .join(
              ", ",
            )}${euroRo(hit[hit.length - 1]![1])} $${hit.length}$명이다.\n그 학생들의 과학 점수의 합은 $${hit
            .map(([, y]) => y)
            .join(
              "+",
            )}=${sum}$이다.\n따라서 평균은 $\\dfrac{${sum}}{${hit.length}}=${mean}$점이다.`,
          facts,
          figureSpec: {
            version: "elem-1",
            kind: "scatterPlot",
            gridStep: 5,
            points: pts,
            xMin: axis.axisMin,
            xMax: axis.axisMax,
            xStep: axis.axisStep,
            yMin: axis.axisMin,
            yMax: axis.axisMax,
            yStep: axis.axisStep,
            xLabel: "수학(점)",
            yLabel: "과학(점)",
          },
        };
      }),
  ),
];

// 브리프 계약 5: 유형 키의 중단원 이름은 RPM 색인 그대로 — 여기 상수로 고정해
// 테스트가 실측 리터럴로 잠근다.
export const M3_STAT2_MINORS = [MINOR_DISP, MINOR_BOX] as const;
