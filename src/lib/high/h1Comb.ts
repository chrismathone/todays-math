/**
 * 공통수학1 「조합」 — RPM 공통수학1(2022) 색인 13유형. **물결 1 세션 `h1-count` 소유.**
 *
 * 브리프 `docs/planning/tracks/high-wave1-brief.md` · 본보기 `h1Identity.ts` 를 그대로 따르고, 셈과 기호
 * (`fact`·`nPr`·`nCr`·`pTex`·`cTex` …)는 같은 세션의 `h1Perm.ts` 에서 가져온다(공용 후보 — 리드가 올린다).
 *
 * ## 답을 세는 쪽과 검산하는 쪽이 다르다
 *
 * 생성기는 교과서 공식(조합의 수 · 여사건 · 특정한 것 먼저 뽑기 · 묶음을 똑같이 세면 k! 로 나누기)으로
 * 답을 낸다. 시험(`highComb.test.ts`)은 같은 `facts` 로 부분집합·나눔·대진표를 **실제로 늘어놓고 센다.**
 *
 * ## 정답이 식인 유형 — 02 조합의 수를 이용한 증명
 *
 * 빈칸 ㈎·㈏·㈐ 에 들어갈 **식**이 답이다(`(n-r)!` · `n-r` …). 오답 넷은 그 증명에서 틀리기 쉬운 자리
 * (계승의 하나 차이 · n 과 r 바꿈 · 계승 빠뜨림)에서 낸다. 빈칸은 수식 안에 `\text{㈎}` 로 둔다 —
 * 중등 `m1Stat` 이 `\dfrac{(\text{계급의 도수})}{…}` 로 이미 쓰는 꼴이다.
 *
 * ## 그림 없이 글로 다 적는 유형
 *
 * 07 직선·09 삼각형(격자·반원·평행선) · 10 평행사변형 · 13 대진표는 RPM 이 그림을 쓰지만, 점의 배치와
 * 대진 방식을 **글로 빠짐없이** 적으면 성립한다(좌표로 때우지 않는다 — 09 §4). 대진표는 「몇 팀 조로
 * 나누고 조 안에서 어떻게 겨루는지」를 문장으로 적는다 — 원장님 검수 대상(인수인계 보고서에 올린다).
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「3. 경우의 수」)
 *
 *   01~10 → 조합 · 11~13 → 조 나누기.
 *
 * 수치·소재는 새로 지었다. RPM 원본(`.rpm-src/22/`)은 유형의 구조만 보았다(저작권).
 */
import type { Rng } from "../elementary/types";

import {
  type CountBody,
  cTex,
  digitWord,
  fact,
  listTex,
  nCr,
  nPr,
  pTex,
  sum,
  sumTex,
  timesTex,
} from "./h1Perm";
import { eul, eun, ga, ira, ro } from "./josa";
import { gcd } from "./numbers";
import {
  $,
  attempt,
  distinctInts,
  numAnswer,
  pickDistractors,
  pickOne,
  randInt,
} from "./pick";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "조합";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 3. 경우의 수). */
const SEC = {
  조합: "조합",
  조나누기: "조 나누기",
} as const;

type Body = CountBody;

// ───────────────────────────── 지면 ─────────────────────────────

/** `5!=120` */
function factEq(n: number): string {
  return `${n}!=${fact(n)}`;
}

/**
 * `{}_{7}\mathrm{C}_{5}={}_{7}\mathrm{C}_{2}=21` — 뽑는 수가 절반을 넘으면 `n−r` 로 바꿔 쓴다(교과서 관행).
 */
function cEq(n: number, r: number): string {
  const v = nCr(n, r);
  if (r > n - r && n - r > 0) return `${cTex(n, r)}=${cTex(n, n - r)}=${v}`;
  return `${cTex(n, r)}=${v}`;
}

/** `n(n-1)(n-2)` — 문자 `v` 로 된 내림 곱. */
function fallTex(v: string, r: number): string {
  return [
    v,
    ...Array.from({ length: r - 1 }, (_, i) => `(${v}-${i + 1})`),
  ].join("");
}

/** `[6, 5, 4]` — 수로 된 내림 곱의 인수. */
function fallNums(n: number, r: number): number[] {
  return Array.from({ length: r }, (_, i) => n - i);
}

// ───────────────────────────── 01 ─────────────────────────────
// _nC_r 의 계산
// 꼴 0 (기본·대표): ₙPᵣ = K 로 n 을 정하고 조합·순열의 값
// 꼴 1 (기본): ₙCₐ = ₙC_b · ₙCᵣ = K 를 만족시키는 n
// 꼴 2 (응용): ₙC_{r+s} = ₙC_{pr−t} 를 만족시키는 r — 두 갈래 중 하나를 버린다
// 꼴 3 (응용): ₙP₄ = k·ₙP₂ · ₙP₃ = k·ₙC₂ 를 만족시키는 n

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const n = randInt(rng, 5, 9);
    const r0 = pickOne(rng, [2, 3]);
    const K = nPr(n, r0);
    const a = pickOne(rng, [2, 3]);
    const b = pickOne(rng, [1, 2]);
    const c = nCr(n, a);
    const p = nPr(n, b);
    const ans = c + p;
    return {
      content: `자연수 $n$에 대하여 $${pTex("n", r0)}=${K}$일 때, $${cTex("n", a)}+${pTex("n", b)}$의 값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${pTex("n", r0)}=${K}$에서 $${fallTex("n", r0)}=${timesTex(fallNums(n, r0))}$`,
        `$n$은 자연수이므로 $n=${n}$`,
        `따라서 $${cTex("n", a)}+${pTex("n", b)}=${cTex(n, a)}+${pTex(n, b)}=${c}+${p}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, n, r0, a, b },
    };
  }
  if (mode === 1) {
    const kind = randInt(rng, 0, 1);
    if (kind === 0) {
      const [a, b] = distinctInts(rng, 1, 8, 2).sort((x, y) => x - y) as [
        number,
        number,
      ];
      const n = a + b;
      const eq = `${cTex("n", a)}=${cTex("n", b)}`;
      return {
        content: `등식 $${eq}$${eul(eq)} 만족시키는 자연수 $n$의 값을 구하시오.`,
        answer: numAnswer(n),
        solution: [
          `$${cTex("n", a)}=${cTex("n", `n-${a}`)}$이고 $${a}\\ne ${b}$이므로 $${cTex("n", `n-${a}`)}=${cTex("n", b)}$에서 $n-${a}=${b}$`,
          `따라서 $n=${n}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, kind, a, b },
      };
    }
    const r = pickOne(rng, [2, 3]);
    const n = randInt(rng, r + 2, r === 2 ? 12 : 10);
    const K = nCr(n, r);
    const eq = `${cTex("n", r)}=${K}`;
    return {
      content: `등식 $${eq}$${eul(eq)} 만족시키는 자연수 $n$의 값을 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `$${cTex("n", r)}=\\dfrac{${fallTex("n", r)}}{${timesTex(fallNums(r, r))}}=${K}$에서 $${fallTex("n", r)}=${K * fact(r)}=${timesTex(fallNums(n, r))}$`,
        `$n$은 자연수이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, kind, r, K },
    };
  }
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const r0 = randInt(rng, 2, 5);
      const s = randInt(rng, 1, 3);
      const p = randInt(rng, 2, 3);
      const t = randInt(rng, 1, 3);
      const L = r0 + s;
      const R = p * r0 - t;
      if (R < 1 || L === R) return null;
      const n = L + R;
      if (n < 8 || n > 20) return null;
      const num = s + t;
      const den = p - 1;
      let caseA: string;
      if (num % den === 0) {
        const rA = num / den;
        const LA = rA + s;
        const RA = p * rA - t;
        if (LA <= n && RA >= 0 && RA <= n) return null; // 답이 둘이 된다
        caseA =
          LA > n
            ? `$r=${rA}$이지만 이때 $r+${s}=${LA}$${ga(String(LA))} $${n}$보다 크므로 성립하지 않는다.`
            : RA > n
              ? `$r=${rA}$이지만 이때 $${p}r-${t}=${RA}$${ga(String(RA))} $${n}$보다 크므로 성립하지 않는다.`
              : `$r=${rA}$이지만 이때 $${p}r-${t}=${RA}$${ga(String(RA))} 음수이므로 성립하지 않는다.`;
      } else {
        caseA = `$r=\\dfrac{${num}}{${den}}$이므로 $r$${eun("r")} 자연수가 아니다.`;
      }
      const left = cTex(n, `r+${s}`);
      const right = cTex(n, `${p}r-${t}`);
      const eq = `${left}=${right}`;
      return {
        content: `등식 $${eq}$${eul(eq)} 만족시키는 자연수 $r$의 값을 구하시오.`,
        answer: numAnswer(r0),
        solution: [
          `$${eq}$에서 $r+${s}=${p}r-${t}$ 또는 $(r+${s})+(${p}r-${t})=${n}$`,
          `$r+${s}=${p}r-${t}$에서 ${caseA}`,
          `$(r+${s})+(${p}r-${t})=${n}$에서 $${p + 1}r=${n - s + t}$이므로 $r=${r0}$`,
          `따라서 $r=${r0}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, n, s, p, t },
      };
    });
  const kind = randInt(rng, 0, 1);
  if (kind === 0) {
    const n = randInt(rng, 5, 9);
    const k = (n - 2) * (n - 3);
    const eq = `${pTex("n", 4)}=${k}\\times ${pTex("n", 2)}`;
    return {
      content: `등식 $${eq}$${eul(eq)} 만족시키는 자연수 $n$의 값을 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `$${eq}$에서 $n(n-1)(n-2)(n-3)=${k}n(n-1)$`,
        `$n\\ge 4$이므로 양변을 $n(n-1)$${ro("n(n-1)")} 나누면 $(n-2)(n-3)=${k}=${n - 2}\\times ${n - 3}$`,
        `따라서 $n=${n}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, kind, k },
    };
  }
  const n = randInt(rng, 4, 10);
  const k = 2 * (n - 2);
  const eq = `${pTex("n", 3)}=${k}\\times ${cTex("n", 2)}`;
  return {
    content: `등식 $${eq}$${eul(eq)} 만족시키는 자연수 $n$의 값을 구하시오.`,
    answer: numAnswer(n),
    solution: [
      `$${eq}$에서 $n(n-1)(n-2)=${k}\\times \\dfrac{n(n-1)}{2}$`,
      `$n\\ge 3$이므로 양변을 $n(n-1)$${ro("n(n-1)")} 나누면 $n-2=${k / 2}$`,
      `따라서 $n=${n}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, kind, k },
  };
}

// ───────────────────────────── 02 ─────────────────────────────
// _nC_r 를 이용한 증명 — 빈칸에 알맞은 식이 답(오답 넷)
// 꼴 0 (기본·대표): r·ₙCᵣ = n·ₙ₋₁Cᵣ₋₁ · ₙCₙ₋ᵣ = ₙCᵣ · ₙPᵣ = n·ₙ₋₁Pᵣ₋₁ · ₙCᵣ×r! = ₙPᵣ
// 꼴 1 (응용): ₙCᵣ = ₙ₋₁Cᵣ + ₙ₋₁Cᵣ₋₁ (파스칼) — 통분하는 자리

const BLANK_MARK = ["㈎", "㈏", "㈐"] as const;
const blank = (i: number): string => `\\text{${BLANK_MARK[i]!}}`;

type Proof = {
  id: number;
  cond: string;
  claim: string;
  lines: string[];
  answers: string[];
  why: string[];
};

const PROOFS: readonly Proof[] = [
  {
    id: 1,
    cond: "1\\le r\\le n",
    claim: `r\\times ${cTex("n", "r")}=n\\times ${cTex("n-1", "r-1")}`,
    lines: [
      `n\\times ${cTex("n-1", "r-1")}=n\\times \\dfrac{(n-1)!}{(r-1)!\\,${blank(0)}}`,
      `=\\dfrac{${blank(1)}}{(r-1)!\\,(n-r)!}`,
      `=r\\times \\dfrac{n!}{${blank(2)}\\,(n-r)!}`,
      `=r\\times ${cTex("n", "r")}`,
    ],
    answers: ["(n-r)!", "n!", "r!"],
    why: [
      `$${cTex("n-1", "r-1")}=\\dfrac{(n-1)!}{(r-1)!\\,\\{(n-1)-(r-1)\\}!}$이고 $(n-1)-(r-1)=n-r$이다.`,
      `$n\\times (n-1)!=n\\times (n-1)\\times \\cdots\\times 2\\times 1$이다.`,
      `분모와 분자에 각각 $r$${eul("r")} 곱하면 분모의 $r\\times (r-1)!$${eun("r\\times (r-1)")} 한 덩어리로 묶인다.`,
    ],
  },
  {
    id: 3,
    cond: "0\\le r\\le n",
    claim: `${cTex("n", "n-r")}=${cTex("n", "r")}`,
    lines: [
      `${cTex("n", "n-r")}=\\dfrac{n!}{(n-r)!\\,\\{n-(n-r)\\}!}=\\dfrac{n!}{(n-r)!\\,${blank(0)}}=${cTex("n", "r")}`,
    ],
    answers: ["r!"],
    why: [`$n-(n-r)=r$이다.`],
  },
  {
    id: 5,
    cond: "1\\le r\\le n",
    claim: `${pTex("n", "r")}=n\\times ${pTex("n-1", "r-1")}`,
    lines: [
      `n\\times ${pTex("n-1", "r-1")}=n\\times \\dfrac{(n-1)!}{\\{(n-1)-(r-1)\\}!}=n\\times \\dfrac{(n-1)!}{${blank(0)}}=\\dfrac{n!}{(n-r)!}=${pTex("n", "r")}`,
    ],
    answers: ["(n-r)!"],
    why: [`$(n-1)-(r-1)=n-r$이다.`],
  },
  {
    id: 6,
    cond: "0\\le r\\le n",
    claim: `${cTex("n", "r")}\\times r!=${pTex("n", "r")}`,
    lines: [
      `${cTex("n", "r")}\\times r!=\\dfrac{n!}{r!\\,(n-r)!}\\times r!=\\dfrac{n!}{${blank(0)}}=${pTex("n", "r")}`,
    ],
    answers: ["(n-r)!"],
    why: [`분자와 분모의 $r!$끼리 약분하면 분모에는 $(n-r)!$만 남는다.`],
  },
  {
    id: 2,
    cond: "1\\le r<n",
    claim: `${cTex("n", "r")}=${cTex("n-1", "r")}+${cTex("n-1", "r-1")}`,
    lines: [
      `${cTex("n-1", "r")}+${cTex("n-1", "r-1")}=\\dfrac{(n-1)!}{r!\\,(n-r-1)!}+\\dfrac{(n-1)!}{(r-1)!\\,(n-r)!}`,
      `=\\dfrac{${blank(0)}\\times (n-1)!}{r!\\,(n-r)!}+\\dfrac{${blank(1)}\\times (n-1)!}{r!\\,(n-r)!}`,
      `=\\dfrac{${blank(2)}\\times (n-1)!}{r!\\,(n-r)!}=\\dfrac{n!}{r!\\,(n-r)!}=${cTex("n", "r")}`,
    ],
    answers: ["n-r", "r", "n"],
    why: [
      `$(n-r)!=(n-r)\\times (n-r-1)!$이므로 첫째 분수의 분모와 분자에 각각 $n-r$${eul("n-r")} 곱하면 분모가 $r!\\,(n-r)!$ 꼴이 된다.`,
      `$r!=r\\times (r-1)!$이므로 둘째 분수의 분모와 분자에 각각 $r$${eul("r")} 곱하면 분모가 $r!\\,(n-r)!$ 꼴이 된다.`,
      `두 분수의 분자를 더하면 $(n-r)+r=n$이다.`,
    ],
  },
];

/** 빈칸의 식마다 틀리기 쉬운 자리 — 계승의 하나 차이 · n 과 r 바꿈 · 계승 빠뜨림. */
const PROOF_WRONG: Readonly<Record<string, readonly string[]>> = {
  "(n-r)!": ["r!", "(r-1)!", "(n-1)!", "n!", "(n-r-1)!", "(n-r+1)!"],
  "n!": ["(n-1)!", "r!", "(n-r)!", "(n+1)!", "n"],
  "r!": ["(r-1)!", "(r+1)!", "n!", "(n-r)!", "r"],
  "n-r": ["n-r+1", "n-r-1", "r", "n", "n+r"],
  r: ["r-1", "r+1", "n-r", "n", "n-1"],
  n: ["n-1", "n+1", "r", "n-r", "2n"],
};

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const pool = PROOFS.filter((p) => (mode === 1 ? p.id === 2 : p.id !== 2));
    const proof = pickOne(rng, pool);
    const b = randInt(rng, 0, proof.answers.length - 1);
    const ans = proof.answers[b]!;
    const distractors = pickDistractors(rng, ans, PROOF_WRONG[ans] ?? []);
    if (distractors === null) return null;
    const mark = BLANK_MARK[b]!;
    return {
      content: [
        `다음은 $${proof.cond}$일 때, 등식 $${proof.claim}$${ga(proof.claim)} 성립함을 증명하는 과정이다.`,
        ...proof.lines.map((l) => `$${l}$`),
        `위의 과정에서 ${mark}에 알맞은 것을 구하시오.`,
      ].join("\n"),
      answer: $(ans),
      solution: [
        proof.why[b]!,
        `따라서 ${mark}에 알맞은 것은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: mode === 0 ? "기본" : "응용",
      facts: { mode, id: proof.id, blank: b },
      distractors,
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 조합의 수
// 꼴 0 (기본·대표): 성별이 모두 같게 뽑기 — 두 조합의 합
// 꼴 1 (응용): 카드 두 장의 합·곱의 홀짝
// 꼴 2 (응용): 리그전 경기 수로 팀 수
// 꼴 3 (응용): 꽃다발 경우의 수로 꽃의 수
// 꼴 4 (응용): 0 끼리 이웃하지 않는 0·1 나열 — 1 사이사이와 맨 끝에서 고르기
// 꼴 5 (응용): 한 켤레만 짝이 맞게 양말 고르기

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 5);
  if (mode === 0) {
    const m = randInt(rng, 3, 7);
    const w = randInt(rng, 3, 7);
    const k = randInt(rng, 2, Math.min(3, m, w));
    const a = nCr(m, k);
    const b = nCr(w, k);
    const ans = a + b;
    return {
      content: `남자 $${m}$명, 여자 $${w}$명 중에서 $${k}$명을 뽑을 때, 뽑힌 $${k}$명의 성별이 모두 같은 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `남자 $${m}$명 중에서 $${k}$명을 뽑는 경우의 수는 $${cEq(m, k)}$`,
        `여자 $${w}$명 중에서 $${k}$명을 뽑는 경우의 수는 $${cEq(w, k)}$`,
        `따라서 구하는 경우의 수는 $${a}+${b}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, m, w, k },
    };
  }
  if (mode === 1) {
    const kind = randInt(rng, 0, 2);
    const N = randInt(rng, 6, 12);
    const o = Math.ceil(N / 2);
    const e = Math.floor(N / 2);
    const head = `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 $2$장의 카드를 동시에 뽑을 때,`;
    if (kind === 0) {
      const a = nCr(o, 2);
      const b = nCr(e, 2);
      return {
        content: `${head} 뽑힌 카드에 적힌 두 수의 합이 짝수인 경우의 수를 구하시오.`,
        answer: numAnswer(a + b),
        solution: [
          `두 수의 합이 짝수이려면 두 수가 모두 홀수이거나 모두 짝수이어야 한다.`,
          `홀수가 적힌 $${o}$장 중에서 $2$장을 뽑는 경우의 수는 $${cEq(o, 2)}$`,
          `짝수가 적힌 $${e}$장 중에서 $2$장을 뽑는 경우의 수는 $${cEq(e, 2)}$`,
          `따라서 구하는 경우의 수는 $${a}+${b}=${a + b}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, N },
      };
    }
    if (kind === 1) {
      return {
        content: `${head} 뽑힌 카드에 적힌 두 수의 합이 홀수인 경우의 수를 구하시오.`,
        answer: numAnswer(o * e),
        solution: [
          `두 수의 합이 홀수이려면 홀수가 적힌 카드와 짝수가 적힌 카드를 한 장씩 뽑아야 한다.`,
          `따라서 구하는 경우의 수는 $${cTex(o, 1)}\\times ${cTex(e, 1)}=${o}\\times ${e}=${o * e}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, N },
      };
    }
    const T = nCr(N, 2);
    const b = nCr(o, 2);
    return {
      content: `${head} 뽑힌 카드에 적힌 두 수의 곱이 짝수인 경우의 수를 구하시오.`,
      answer: numAnswer(T - b),
      solution: [
        `$${N}$장 중에서 $2$장을 뽑는 경우의 수는 $${cEq(N, 2)}$`,
        `두 수의 곱이 홀수인 경우는 홀수가 적힌 $${o}$장 중에서 $2$장을 뽑는 경우이므로 $${cEq(o, 2)}$`,
        `따라서 구하는 경우의 수는 $${T}-${b}=${T - b}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, kind, N },
    };
  }
  if (mode === 2) {
    const n = randInt(rng, 5, 10);
    const g = randInt(rng, 2, 4);
    const half = nCr(n, 2);
    const G = g * half;
    return {
      content: `어느 대회에 참가한 모든 팀이 다른 팀과 각각 $${g}$번씩 경기를 하였다. 이 대회에서 치른 경기가 모두 $${G}$번일 때, 이 대회에 참가한 팀의 수를 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `참가한 팀의 수를 $n$${ira("n")} 하면 두 팀을 고르는 경우마다 $${g}$번씩 경기를 하므로 $${g}\\times ${cTex("n", 2)}=${G}$, 즉 $${cTex("n", 2)}=${half}$`,
        `$\\dfrac{n(n-1)}{2\\times 1}=${half}$에서 $n(n-1)=${2 * half}=${n}\\times ${n - 1}$`,
        `$n$은 자연수이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, g, G },
    };
  }
  if (mode === 3) {
    const Y = randInt(rng, 4, 6);
    const r1 = randInt(rng, 2, 3);
    const r2 = randInt(rng, 1, 2);
    const n = randInt(rng, r1 + 2, 9);
    const cy = nCr(Y, r2);
    const cn = nCr(n, r1);
    const K = cn * cy;
    return {
      content: `서로 다른 빨간 꽃 $n$송이와 서로 다른 노란 꽃 $${Y}$송이 중에서 빨간 꽃 $${r1}$송이와 노란 꽃 $${r2}$송이를 택하여 꽃다발을 만드는 경우의 수가 $${K}$일 때, 자연수 $n$의 값을 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `빨간 꽃 $n$송이 중에서 $${r1}$송이를 택하는 경우의 수는 $${cTex("n", r1)}$`,
        `노란 꽃 $${Y}$송이 중에서 $${r2}$송이를 택하는 경우의 수는 $${cEq(Y, r2)}$`,
        `즉 $${cTex("n", r1)}\\times ${cy}=${K}$이므로 $${cTex("n", r1)}=${cn}$`,
        `$\\dfrac{${fallTex("n", r1)}}{${timesTex(fallNums(r1, r1))}}=${cn}$에서 $${fallTex("n", r1)}=${cn * fact(r1)}=${timesTex(fallNums(n, r1))}$`,
        `$n$은 자연수이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, Y, r1, r2, K },
    };
  }
  if (mode === 4)
    return attempt<Body>((): Body | null => {
      const z = randInt(rng, 2, 4);
      const b = randInt(rng, z + 1, 7);
      if (z + b > 10) return null;
      const ans = nCr(b, z);
      return {
        content: `$${z}$개의 숫자 $0$과 $${b}$개의 숫자 $1$을 모두 일렬로 나열하여 ${digitWord(z + b)} 자연수를 만들 때, $0$끼리는 어느 것도 이웃하지 않는 자연수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$1$을 먼저 일렬로 나열하면, 맨 앞자리에는 $0$이 올 수 없으므로 $1$의 사이사이와 맨 끝의 $${b}$개의 자리 중 $${z}$개를 택하여 $0$을 하나씩 놓으면 된다.`,
          `따라서 구하는 자연수의 개수는 $${cEq(b, z)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, z, b },
      };
    });
  const n = pickOne(rng, [4, 5, 7, 8]);
  const x = nCr(2 * (n - 1), 2);
  const y = x - (n - 1);
  const ans = n * y;
  return {
    content: `서로 다른 $${n}$켤레의 양말 $${2 * n}$짝 중에서 $4$짝을 택할 때, 한 켤레만 짝이 맞도록 택하는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `짝이 맞는 한 켤레를 택하는 경우의 수는 $${cTex(n, 1)}=${n}$`,
      `나머지 $${n - 1}$켤레의 양말 $${2 * (n - 1)}$짝 중에서 $2$짝을 택하는 경우의 수는 $${cEq(2 * (n - 1), 2)}$이고, 이 중에서 두 짝이 한 켤레가 되는 $${cTex(n - 1, 1)}=${n - 1}$가지를 빼면 $${x}-${n - 1}=${y}$`,
      `따라서 구하는 경우의 수는 $${n}\\times ${y}=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, n },
  };
}

// ───────────────────────────── 04 ─────────────────────────────
// ‘적어도’의 조건이 있는 조합의 수 — (전체) − (그렇지 않은 경우)
// 꼴 0 (기본·대표): 카드에서 짝수(홀수)를 적어도 한 장
// 꼴 1 (응용): 파란 공을 적어도 한 개
// 꼴 2 (응용): 남자와 여자를 각각 적어도 한 명씩
// 꼴 3 (응용): 적어도 한 명 포함되는 경우의 수로 남자 수 되묻기
// 꼴 4 (응용): 여학생이 적어도 두 명

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 4);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 1);
      const N = randInt(rng, 6, 10);
      const r = randInt(rng, 2, 3);
      const want = kind === 0 ? "짝수" : "홀수";
      const other = kind === 0 ? "홀수" : "짝수";
      const o = kind === 0 ? Math.ceil(N / 2) : Math.floor(N / 2);
      if (o < r) return null;
      const T = nCr(N, r);
      const b = nCr(o, r);
      return {
        content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 $${r}$장의 카드를 동시에 뽑을 때, ${want}가 적힌 카드를 적어도 한 장 뽑는 경우의 수를 구하시오.`,
        answer: numAnswer(T - b),
        solution: [
          `$${N}$장의 카드 중에서 $${r}$장을 뽑는 경우의 수는 $${cEq(N, r)}$`,
          `${other}가 적힌 $${o}$장의 카드 중에서 $${r}$장을 뽑는 경우의 수는 $${cEq(o, r)}$`,
          `따라서 구하는 경우의 수는 $${T}-${b}=${T - b}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, kind, N, r },
      };
    });
  if (mode === 1) {
    const Y = randInt(rng, 3, 6);
    const B = randInt(rng, 2, 4);
    const r = randInt(rng, 2, 3);
    const T = nCr(Y + B, r);
    const b = nCr(Y, r);
    return {
      content: `서로 다른 노란 공 $${Y}$개와 서로 다른 파란 공 $${B}$개가 들어 있는 상자에서 $${r}$개의 공을 동시에 꺼낼 때, 파란 공을 적어도 한 개 꺼내는 경우의 수를 구하시오.`,
      answer: numAnswer(T - b),
      solution: [
        `$${Y + B}$개의 공 중에서 $${r}$개를 꺼내는 경우의 수는 $${cEq(Y + B, r)}$`,
        `노란 공 $${Y}$개 중에서 $${r}$개를 꺼내는 경우의 수는 $${cEq(Y, r)}$`,
        `따라서 구하는 경우의 수는 $${T}-${b}=${T - b}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, Y, B, r },
    };
  }
  if (mode === 2) {
    const r = randInt(rng, 3, 4);
    const m = randInt(rng, r, 8);
    const w = randInt(rng, r, 7);
    const T = nCr(m + w, r);
    const a = nCr(m, r);
    const b = nCr(w, r);
    const ans = T - (a + b);
    return {
      content: `남자 $${m}$명, 여자 $${w}$명 중에서 $${r}$명을 뽑을 때, 남자와 여자를 각각 적어도 한 명씩 뽑는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${m + w}$명 중에서 $${r}$명을 뽑는 경우의 수는 $${cEq(m + w, r)}$`,
        `남자만 $${r}$명을 뽑는 경우의 수는 $${cEq(m, r)}$`,
        `여자만 $${r}$명을 뽑는 경우의 수는 $${cEq(w, r)}$`,
        `따라서 구하는 경우의 수는 $${T}-(${a}+${b})=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, m, w, r },
    };
  }
  if (mode === 3) {
    const N = randInt(rng, 8, 12);
    const x = randInt(rng, 2, N - 1);
    const T = nCr(N, 2);
    const cx = nCr(x, 2);
    const K = T - cx;
    return {
      content: `회원이 $${N}$명인 동아리에서 $2$명의 운영자를 뽑으려고 한다. 남자 회원이 적어도 한 명 포함되도록 뽑는 경우의 수가 $${K}$일 때, 이 동아리의 남자 회원 수를 구하시오.`,
      answer: numAnswer(N - x),
      solution: [
        `$${N}$명 중에서 $2$명을 뽑는 경우의 수는 $${cEq(N, 2)}$`,
        `여자 회원 수를 $x$${ira("x")} 하면 여자 회원만 $2$명을 뽑는 경우의 수는 $${cTex("x", 2)}$이므로 $${T}-${cTex("x", 2)}=${K}$, 즉 $${cTex("x", 2)}=${cx}$`,
        `$\\dfrac{x(x-1)}{2\\times 1}=${cx}$에서 $x(x-1)=${2 * cx}=${x}\\times ${x - 1}$`,
        `$x$${eun("x")} 자연수이므로 $x=${x}$`,
        `따라서 남자 회원 수는 $${N}-${x}=${N - x}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, N, K },
    };
  }
  const m = randInt(rng, 4, 6);
  const w = randInt(rng, 3, 6);
  const T = nCr(m + w, 4);
  const none = nCr(m, 4);
  const one = nCr(m, 3) * w;
  const ans = T - (none + one);
  return {
    content: `남학생 $${m}$명과 여학생 $${w}$명 중에서 $4$명을 뽑을 때, 여학생이 적어도 $2$명 포함되도록 뽑는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `$${m + w}$명 중에서 $4$명을 뽑는 경우의 수는 $${cEq(m + w, 4)}$`,
      `여학생을 한 명도 뽑지 않는 경우의 수는 $${cEq(m, 4)}$`,
      `여학생을 $1$명만 뽑는 경우의 수는 $${cTex(m, 3)}\\times ${cTex(w, 1)}=${nCr(m, 3)}\\times ${w}=${one}$`,
      `따라서 구하는 경우의 수는 $${T}-(${none}+${one})=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, m, w },
  };
}

// ───────────────────────────── 05 ─────────────────────────────
// 특정한 것을 포함하거나 포함하지 않는 조합의 수
// 꼴 0 (기본·대표): 두 사람 중 한 명만 — 한 명은 넣고 한 명은 빼고, 그 반대
// 꼴 1 (기본): 특정한 k 명을 모두 포함 — 먼저 뽑았다고 보고 나머지에서
// 꼴 2 (기본): 특정한 두 사람을 모두 빼고
// 꼴 3 (응용): 어떤 수의 배수는 모두 넣고 다른 수의 배수는 빼고
// 꼴 4 (응용): 가장 큰 수가 t 이상 — 가장 큰 수로 나누어 더하기
// 꼴 5 (심화하): 두 사람이 동아리 둘씩 — 공통 동아리 개수 조건

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 5);
  if (mode === 0) {
    const n = randInt(rng, 7, 12);
    const r = randInt(rng, 3, Math.min(6, n - 3));
    const x = nCr(n - 2, r - 1);
    const ans = 2 * x;
    return {
      content: `A, B를 포함한 $${n}$명의 지원자 중에서 $${r}$명을 뽑을 때, A와 B 중 한 명만 뽑히는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `A는 뽑히고 B는 뽑히지 않는 경우의 수는 A, B를 제외한 $${n - 2}$명 중에서 $${r - 1}$명을 뽑는 경우의 수와 같으므로 $${cEq(n - 2, r - 1)}$`,
        `B는 뽑히고 A는 뽑히지 않는 경우의 수도 $${x}$`,
        `따라서 구하는 경우의 수는 $${x}+${x}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, n, r },
    };
  }
  if (mode === 1) {
    const k = randInt(rng, 2, 5);
    const N = randInt(rng, k + 4, 14);
    const r = randInt(rng, k + 1, N - 2);
    const ans = nCr(N - k, r - k);
    return {
      content: `$1$학년 선수 $${k}$명을 포함하여 모두 $${N}$명의 선수가 있는 팀에서 경기에 나갈 선수 $${r}$명을 뽑을 때, $1$학년 선수가 모두 포함되도록 뽑는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$1$학년 선수 $${k}$명을 먼저 뽑았다고 생각하면 나머지 $${N - k}$명 중에서 $${r - k}$명을 뽑으면 된다.`,
        `따라서 구하는 경우의 수는 $${cEq(N - k, r - k)}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, k, N, r },
    };
  }
  if (mode === 2) {
    const n = randInt(rng, 7, 12);
    const r = randInt(rng, 2, Math.min(5, n - 3));
    const ans = nCr(n - 2, r);
    return {
      content: `A, B를 포함한 $${n}$명의 학생 중에서 당번 $${r}$명을 뽑을 때, A, B가 모두 뽑히지 않는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `A, B를 제외한 $${n - 2}$명 중에서 $${r}$명을 뽑으면 된다.`,
        `따라서 구하는 경우의 수는 $${cEq(n - 2, r)}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, n, r },
    };
  }
  if (mode === 3)
    return attempt<Body>((): Body | null => {
      const N = randInt(rng, 9, 12);
      const [a, b] = distinctInts(rng, 3, 5, 2) as [number, number];
      // 3·4·5 는 서로소라 최소공배수가 곱이다 — N 을 넘어야 두 배수가 안 겹친다.
      if (a * b <= N) return null;
      const A = Array.from(
        { length: Math.floor(N / a) },
        (_, i) => a * (i + 1),
      );
      const B = Array.from(
        { length: Math.floor(N / b) },
        (_, i) => b * (i + 1),
      );
      const rest = N - A.length - B.length;
      const r = randInt(rng, A.length + 1, A.length + rest - 1);
      const pick = r - A.length;
      if (pick < 1 || rest - pick < 1) return null;
      const ans = nCr(rest, pick);
      return {
        content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 $${r}$장의 카드를 동시에 뽑을 때, $${a}$의 배수가 적힌 카드는 모두 포함하고 $${b}$의 배수가 적힌 카드는 포함하지 않도록 뽑는 경우의 수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${a}$의 배수가 적힌 카드 ${listTex(A)}의 $${A.length}$장은 모두 포함하고, $${b}$의 배수가 적힌 카드 ${listTex(B)}의 $${B.length}$장은 포함하지 않아야 한다.`,
          `따라서 나머지 $${rest}$장의 카드 중에서 $${pick}$장을 뽑으면 되므로 구하는 경우의 수는 $${cEq(rest, pick)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, N, a, b, r },
      };
    });
  if (mode === 4) {
    const N = randInt(rng, 6, 9);
    const t = randInt(rng, N - 2, N - 1);
    const ms = Array.from({ length: N - t + 1 }, (_, i) => t + i);
    const parts = ms.map((m) => nCr(m - 1, 2));
    const ans = sum(parts);
    return {
      content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$개의 공이 들어 있는 주머니에서 $3$개의 공을 동시에 꺼낼 때, 꺼낸 공에 적힌 수 중에서 가장 큰 수가 $${t}$ 이상인 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        ...ms.map(
          (m) =>
            `가장 큰 수가 $${m}$인 경우는 $${m}$보다 작은 $${m - 1}$개의 수 중에서 $2$개를 뽑는 경우이므로 $${cEq(m - 1, 2)}$`,
        ),
        `따라서 구하는 경우의 수는 $${sumTex(parts)}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, N, t },
    };
  }
  const n = randInt(rng, 4, 7);
  const kind = randInt(rng, 0, 2);
  const first = nCr(n, 2);
  const none = nCr(n - 2, 2);
  const one = 2 * (n - 2);
  const x = first * none;
  const y = first * one;
  const ans = kind === 0 ? x + y : kind === 1 ? y : x;
  const cond =
    kind === 0 ? "$1$개 이하인" : kind === 1 ? "$1$개인" : "하나도 없는";
  const lines = [`A가 $2$개의 동아리를 택하는 경우의 수는 $${cEq(n, 2)}$`];
  if (kind !== 1) {
    lines.push(
      `B가 A와 겹치지 않게 나머지 $${n - 2}$개 중에서 $2$개를 택하는 경우의 수는 $${cEq(n - 2, 2)}$이므로 공통으로 가입하는 동아리가 없는 경우의 수는 $${first}\\times ${none}=${x}$`,
    );
  }
  if (kind !== 2) {
    lines.push(
      `B가 A가 택한 $2$개 중 $1$개와 나머지 $${n - 2}$개 중 $1$개를 택하는 경우의 수는 $${cTex(2, 1)}\\times ${cTex(n - 2, 1)}=${one}$이므로 공통으로 가입하는 동아리가 $1$개인 경우의 수는 $${first}\\times ${one}=${y}$`,
    );
  }
  lines.push(
    kind === 0
      ? `따라서 구하는 경우의 수는 $${x}+${y}=${ans}$`
      : `따라서 구하는 경우의 수는 $${ans}$`,
  );
  return {
    content: `두 학생 A, B가 서로 다른 $${n}$개의 동아리 중에서 각각 $2$개씩 택하여 가입하려고 한다. A와 B가 공통으로 가입하는 동아리가 ${cond} 경우의 수를 구하시오. (단, 가입 순서는 생각하지 않는다.)`,
    answer: numAnswer(ans),
    solution: lines.join("\n"),
    difficulty: "심화하",
    facts: { mode, n, kind },
  };
}

// ───────────────────────────── 06 ─────────────────────────────
// 뽑아서 나열하는 경우의 수 — (뽑는 경우의 수) × (나열하는 경우의 수)
// 꼴 0 (기본·대표): 두 사람을 모두 넣어 뽑고 이웃하게 세우기
// 꼴 1 (응용): 과일·채소를 골라 일렬로 진열
// 꼴 2 (응용): 홀수·짝수 숫자를 골라 자연수 만들기
// 꼴 3 (응용): 특정한 한 명을 넣어 뽑아 세우는 경우의 수로 회원 수
// 꼴 4 (응용): 한 숫자는 넣고 한 숫자는 빼고 골라 자연수 만들기
// 꼴 5 (응용): 어른·어린이를 골라 어린이끼리 이웃하지 않게 세우기

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 5);
  if (mode === 0) {
    const n = randInt(rng, 6, 9);
    const r = randInt(rng, 3, 5);
    const c = nCr(n - 2, r - 2);
    const f = fact(r - 1);
    const ans = c * f * 2;
    return {
      content: `A, B를 포함한 $${n}$명 중에서 $${r}$명을 뽑아 일렬로 세울 때, A, B를 모두 포함하고 A와 B가 서로 이웃하도록 세우는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `A, B를 제외한 $${n - 2}$명 중에서 $${r - 2}$명을 뽑는 경우의 수는 $${cEq(n - 2, r - 2)}$`,
        `A와 B를 한 사람으로 생각하여 $${r - 1}$명을 일렬로 세우는 경우의 수는 $${factEq(r - 1)}$`,
        `A와 B가 자리를 바꾸는 경우의 수는 $2!=2$`,
        `따라서 구하는 경우의 수는 $${timesTex([c, f, 2])}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, n, r },
    };
  }
  if (mode === 1) {
    const a = randInt(rng, 4, 6);
    const b = randInt(rng, 3, 5);
    const p = randInt(rng, 2, 3);
    const q = randInt(rng, 1, 2);
    const x = nCr(a, p);
    const y = nCr(b, q);
    const f = fact(p + q);
    const ans = x * y * f;
    return {
      content: `서로 다른 과일 $${a}$개와 서로 다른 채소 $${b}$개 중에서 과일 $${p}$개와 채소 $${q}$개를 택하여 일렬로 진열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `과일 $${p}$개를 택하는 경우의 수는 $${cEq(a, p)}$`,
        `채소 $${q}$개를 택하는 경우의 수는 $${cEq(b, q)}$`,
        `택한 $${p + q}$개를 일렬로 진열하는 경우의 수는 $${factEq(p + q)}$`,
        `따라서 구하는 경우의 수는 $${timesTex([x, y, f])}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b, p, q },
    };
  }
  if (mode === 2) {
    const [p, q] = pickOne(rng, [
      [1, 2],
      [2, 1],
      [2, 2],
    ] as const);
    const x = nCr(5, p);
    const y = nCr(4, q);
    const f = fact(p + q);
    const ans = x * y * f;
    return {
      content: `$1$부터 $9$까지의 자연수 중에서 서로 다른 홀수 $${p}$개와 서로 다른 짝수 $${q}$개를 택하여 모두 한 번씩 사용하여 만들 수 있는 ${digitWord(p + q)} 자연수의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `홀수 $1$, $3$, $5$, $7$, $9$ 중에서 $${p}$개를 택하는 경우의 수는 $${cEq(5, p)}$`,
        `짝수 $2$, $4$, $6$, $8$ 중에서 $${q}$개를 택하는 경우의 수는 $${cEq(4, q)}$`,
        `택한 $${p + q}$개의 숫자를 일렬로 나열하는 경우의 수는 $${factEq(p + q)}$`,
        `따라서 구하는 자연수의 개수는 $${timesTex([x, y, f])}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q },
    };
  }
  if (mode === 3) {
    const r = randInt(rng, 2, 3);
    const n = randInt(rng, r + 2, 9);
    const c = nCr(n - 1, r - 1);
    const K = c * fact(r);
    return {
      content: `어느 동아리의 회원 중에서 특정한 한 명을 포함하여 $${r}$명을 뽑아 일렬로 세우는 경우의 수가 $${K}$일 때, 이 동아리의 회원 수를 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `동아리의 회원 수를 $n$${ira("n")} 하면 특정한 한 명을 포함하여 $${r}$명을 뽑는 경우의 수는 $${cTex("n-1", r - 1)}$`,
        `뽑은 $${r}$명을 일렬로 세우는 경우의 수는 $${factEq(r)}$`,
        `즉 $${cTex("n-1", r - 1)}\\times ${fact(r)}=${K}$이므로 $${cTex("n-1", r - 1)}=${c}$`,
        r === 2
          ? `$n-1=${c}$`
          : `$\\dfrac{(n-1)(n-2)}{2\\times 1}=${c}$에서 $(n-1)(n-2)=${2 * c}=${n - 1}\\times ${n - 2}$`,
        `$n$은 자연수이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, r, K },
    };
  }
  if (mode === 4) {
    const N = randInt(rng, 6, 9);
    const k = randInt(rng, 3, 4);
    const [x, y] = distinctInts(rng, 1, N, 2) as [number, number];
    const c = nCr(N - 2, k - 1);
    const f = fact(k);
    const ans = c * f;
    const xs = String(x);
    const ys = String(y);
    return {
      content: `$1$부터 $${N}$까지의 자연수 중에서 서로 다른 $${k}$개를 택하여 ${digitWord(k)} 자연수를 만들려고 한다. 이때 $${x}$${eun(xs)} 포함하고 $${y}$${eun(ys)} 포함하지 않는 자연수의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${x}$${eul(xs)} 이미 택했다고 생각하고, $${x}$, $${y}$${eul(ys)} 제외한 $${N - 2}$개의 숫자 중에서 $${k - 1}$개를 택하는 경우의 수는 $${cEq(N - 2, k - 1)}$`,
        `택한 $${k}$개의 숫자를 일렬로 나열하는 경우의 수는 $${factEq(k)}$`,
        `따라서 구하는 자연수의 개수는 $${c}\\times ${f}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, N, k, x, y },
    };
  }
  const a = randInt(rng, 4, 6);
  const c = randInt(rng, 3, 5);
  const p = randInt(rng, 2, 3);
  const q = 2;
  const x = nCr(a, p);
  const y = nCr(c, q);
  const f = fact(p);
  const P = nPr(p + 1, q);
  const ans = x * y * f * P;
  return {
    content: `어른 $${a}$명과 어린이 $${c}$명 중에서 어른 $${p}$명과 어린이 $${q}$명을 뽑아 일렬로 세울 때, 어린이끼리 이웃하지 않도록 세우는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `어른 $${p}$명을 뽑는 경우의 수는 $${cEq(a, p)}$`,
      `어린이 $${q}$명을 뽑는 경우의 수는 $${cEq(c, q)}$`,
      `뽑은 어른 $${p}$명을 일렬로 세우는 경우의 수는 $${factEq(p)}$`,
      `어른의 사이사이와 양 끝의 $${p + 1}$개의 자리 중 $${q}$개의 자리에 어린이를 세우는 경우의 수는 $${pTex(p + 1, q)}=${P}$`,
      `따라서 구하는 경우의 수는 $${timesTex([x, y, f, P])}=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, a, c, p },
  };
}

// ───────────────────────────── 07 ─────────────────────────────
// 직선의 개수
// 꼴 0 (기본·대표): 어느 세 점도 한 직선 위에 있지 않은 n 개의 점 — ₙC₂
// 꼴 1 (응용): 평행한 두 직선 위의 점 — 겹쳐 센 직선을 빼고 두 직선을 더한다
// 꼴 2 (심화하): 가로·세로 간격이 같은 격자점 — 세 점 이상 지나는 직선마다 겹침을 뺀다

/** 격자점 a×b 에서 두 점이 정하는 직선을 **실제로 모아** 「직선 위의 점 수 → 직선 수」로. */
function gridLines(a: number, b: number): Map<number, number> {
  const pts: [number, number][] = [];
  for (let j = 0; j < b; j += 1)
    for (let i = 0; i < a; i += 1) pts.push([i, j]);
  const lines = new Map<string, number>();
  for (let s = 0; s < pts.length; s += 1) {
    for (let t = s + 1; t < pts.length; t += 1) {
      const [x1, y1] = pts[s]!;
      const [x2, y2] = pts[t]!;
      let A = y2 - y1;
      let B = x1 - x2;
      let C = -(A * x1 + B * y1);
      const g = gcd(gcd(A, B), C) || 1;
      A /= g;
      B /= g;
      C /= g;
      if (A < 0 || (A === 0 && B < 0)) {
        A = -A;
        B = -B;
        C = -C;
      }
      const key = `${A},${B},${C}`;
      if (!lines.has(key)) {
        lines.set(key, pts.filter(([x, y]) => A * x + B * y + C === 0).length);
      }
    }
  }
  const byK = new Map<number, number>();
  for (const k of lines.values()) byK.set(k, (byK.get(k) ?? 0) + 1);
  return byK;
}

const GRIDS: readonly (readonly [number, number])[] = [
  [3, 3],
  [4, 3],
  [5, 3],
  [4, 4],
];

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0) {
    const kind = randInt(rng, 0, 1);
    const n = randInt(rng, 5, 12);
    return {
      content:
        kind === 0
          ? `원 위에 같은 간격으로 $${n}$개의 점이 놓여 있다. 이 중 두 점을 이어서 만들 수 있는 서로 다른 직선의 개수를 구하시오.`
          : `한 평면 위에 있는 서로 다른 $${n}$개의 점 중에서 어느 세 점도 한 직선 위에 있지 않을 때, 두 점을 이어서 만들 수 있는 서로 다른 직선의 개수를 구하시오.`,
      answer: numAnswer(nCr(n, 2)),
      solution: [
        `${kind === 0 ? "원 위의 " : ""}어느 세 점도 한 직선 위에 있지 않으므로 두 점을 택할 때마다 서로 다른 직선이 하나씩 정해진다.`,
        `따라서 구하는 직선의 개수는 $${cEq(n, 2)}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, kind, n },
    };
  }
  if (mode === 1) {
    const p = randInt(rng, 3, 6);
    const q = randInt(rng, 3, 5);
    const T = nCr(p + q, 2);
    const a = nCr(p, 2);
    const b = nCr(q, 2);
    const ans = T - a - b + 2;
    return {
      content: `평행한 두 직선 $l$, $m$ 위에 각각 $${p}$개, $${q}$개의 점이 있다. 이 $${p + q}$개의 점 중에서 두 점을 이어서 만들 수 있는 서로 다른 직선의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${p + q}$개의 점 중에서 $2$개를 택하는 경우의 수는 $${cEq(p + q, 2)}$`,
        `직선 $l$ 위의 $${p}$개의 점 중에서 $2$개를 택하는 $${cEq(p, 2)}$가지는 모두 직선 $l$ 하나를 만든다.`,
        `직선 $m$ 위의 $${q}$개의 점 중에서 $2$개를 택하는 $${cEq(q, 2)}$가지는 모두 직선 $m$ 하나를 만든다.`,
        `따라서 구하는 직선의 개수는 $${T}-${a}-${b}+2=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q },
    };
  }
  const [a, b] = pickOne(rng, GRIDS);
  const N = a * b;
  const T = nCr(N, 2);
  const byK = gridLines(a, b);
  const ks = [...byK.keys()].filter((k) => k >= 3).sort((x, y) => x - y);
  const ans = [...byK.values()].reduce((s, v) => s + v, 0);
  const over = ks.map((k) => `${byK.get(k)!}\\times ${nCr(k, 2) - 1}`);
  return {
    content: `가로, 세로의 간격이 모두 같도록 한 줄에 $${a}$개씩 $${b}$줄로 놓인 $${N}$개의 점이 있다. 이 중 두 점을 이어서 만들 수 있는 서로 다른 직선의 개수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `$${N}$개의 점 중에서 $2$개를 택하는 경우의 수는 $${cEq(N, 2)}$`,
      ...ks.map(
        (k) =>
          `$${k}$개의 점을 지나는 직선은 $${byK.get(k)!}$개이고, 이 직선마다 $${cTex(k, 2)}=${nCr(k, 2)}$가지를 한 직선으로 세어야 하므로 $${nCr(k, 2) - 1}$가지씩 더 세었다.`,
      ),
      `따라서 구하는 직선의 개수는 $${T}-${over.join("-")}=${ans}$`,
    ].join("\n"),
    difficulty: "심화하",
    facts: { mode, a, b },
  };
}

// ───────────────────────────── 08 ─────────────────────────────
// 대각선의 개수 — ₙC₂ − n
// 꼴 0 (기본·대표): 정n각형의 대각선
// 꼴 1 (응용): 두 다각형의 대각선의 개수의 합
// 꼴 2 (응용): 대각선의 개수로 꼭짓점의 개수 되묻기
// 꼴 3 (응용): 한 꼭짓점에서 그은 대각선의 개수로 다각형을 정하고 전체 대각선

const SINO = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

/** 다각형 이름 — 「십일각형」. 아라비아 숫자로 쓰지 않는다(`arabicPolygons`). */
function polygonName(n: number): string {
  const t = Math.floor(n / 10);
  const u = n % 10;
  const tens = t === 0 ? "" : t === 1 ? "십" : `${SINO[t]!}십`;
  return `${tens}${SINO[u]!}각형`;
}

function diagonals(n: number): number {
  return nCr(n, 2) - n;
}

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const n = randInt(rng, 5, 15);
    const name = polygonName(n);
    const ans = diagonals(n);
    return {
      content: `정${name}의 대각선의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `${name}의 $${n}$개의 꼭짓점 중에서 $2$개를 택하여 만든 선분 $${nCr(n, 2)}$개 가운데 변 $${n}$개를 빼면 대각선이 된다.`,
        `따라서 구하는 대각선의 개수는 $${cTex(n, 2)}-${n}=${nCr(n, 2)}-${n}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, n },
    };
  }
  if (mode === 1) {
    const [n1, n2] = distinctInts(rng, 5, 14, 2).sort((x, y) => x - y) as [
      number,
      number,
    ];
    const d1 = diagonals(n1);
    const d2 = diagonals(n2);
    return {
      content: `${polygonName(n1)}과 ${polygonName(n2)}의 대각선의 개수의 합을 구하시오.`,
      answer: numAnswer(d1 + d2),
      solution: [
        `${polygonName(n1)}의 대각선의 개수는 $${cTex(n1, 2)}-${n1}=${nCr(n1, 2)}-${n1}=${d1}$`,
        `${polygonName(n2)}의 대각선의 개수는 $${cTex(n2, 2)}-${n2}=${nCr(n2, 2)}-${n2}=${d2}$`,
        `따라서 구하는 합은 $${d1}+${d2}=${d1 + d2}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, n1, n2 },
    };
  }
  if (mode === 2) {
    const n = randInt(rng, 5, 15);
    const K = diagonals(n);
    return {
      content: `대각선의 개수가 $${K}$인 다각형의 꼭짓점의 개수를 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `구하는 다각형의 꼭짓점의 개수를 $n$${ira("n")} 하면 $${cTex("n", 2)}-n=${K}$`,
        `$\\dfrac{n(n-1)}{2}-n=${K}$에서 $n^{2}-3n-${2 * K}=0$, 즉 $(n+${n - 3})(n-${n})=0$`,
        `$n\\ge 4$이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, K },
    };
  }
  const d = randInt(rng, 3, 12);
  const n = d + 3;
  const ans = diagonals(n);
  return {
    content: `한 꼭짓점에서 그을 수 있는 대각선의 개수가 $${d}$인 다각형의 대각선의 개수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `꼭짓점이 $n$개인 다각형의 한 꼭짓점에서 그을 수 있는 대각선의 개수는 $n-3$이므로 $n-3=${d}$, 즉 $n=${n}$`,
      `따라서 구하는 대각선의 개수는 $${cTex(n, 2)}-${n}=${nCr(n, 2)}-${n}=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, d },
  };
}

// ───────────────────────────── 09 ─────────────────────────────
// 다각형의 개수 - 꼭짓점
// 꼴 0 (기본·대표): 반원 — 지름 위 p 개 · 호 위 q 개에서 삼각형(지름 위 세 점만 뺀다)
// 꼴 1 (응용): 평행한 두 직선 위의 점으로 사각형 · 삼각형
// 꼴 2 (응용): 격자점으로 삼각형 — 한 직선 위의 세 점을 뺀다
// 꼴 3 (응용): 원 위의 같은 간격의 점으로 직각삼각형 · 직각삼각형이 아닌 삼각형

const TRIANGLE_GRIDS: readonly (readonly [number, number])[] = [
  [4, 3],
  [5, 3],
  [4, 4],
];

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const p = randInt(rng, 3, 5);
    const q = randInt(rng, 2, 5);
    const T = nCr(p + q, 3);
    const L = nCr(p, 3);
    const ans = T - L;
    return {
      content: `반원의 지름 위에 양 끝점을 포함하여 $${p}$개의 점이 있고, 호 위에 양 끝점을 제외하고 $${q}$개의 점이 있다. 이 $${p + q}$개의 점 중에서 $3$개의 점을 꼭짓점으로 하는 삼각형의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${p + q}$개의 점 중에서 $3$개를 택하는 경우의 수는 $${cEq(p + q, 3)}$`,
        `지름 위의 $${p}$개의 점 중에서 $3$개를 택하면 삼각형이 만들어지지 않으므로 그 경우의 수 $${cEq(p, 3)}$${eul(String(L))} 뺀다.`,
        `따라서 구하는 삼각형의 개수는 $${T}-${L}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, p, q },
    };
  }
  if (mode === 1) {
    const kind = randInt(rng, 0, 1);
    const p = randInt(rng, 3, 6);
    const q = randInt(rng, 2, 5);
    const a = nCr(p, 2);
    const b = nCr(q, 2);
    const head = `평행한 두 직선 $l$, $m$ 위에 각각 $${p}$개, $${q}$개의 점이 있다.`;
    if (kind === 0) {
      const ans = a * b;
      return {
        content: `${head} 이 중에서 $4$개의 점을 꼭짓점으로 하는 사각형의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `사각형이 되려면 직선 $l$ 위에서 $2$개, 직선 $m$ 위에서 $2$개의 점을 택해야 한다.`,
          `따라서 구하는 사각형의 개수는 $${cTex(p, 2)}\\times ${cTex(q, 2)}=${a}\\times ${b}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, p, q },
      };
    }
    const x = a * q;
    const y = p * b;
    return {
      content: `${head} 이 중에서 $3$개의 점을 꼭짓점으로 하는 삼각형의 개수를 구하시오.`,
      answer: numAnswer(x + y),
      solution: [
        `직선 $l$ 위에서 $2$개, 직선 $m$ 위에서 $1$개를 택하는 경우의 수는 $${cTex(p, 2)}\\times ${cTex(q, 1)}=${a}\\times ${q}=${x}$`,
        `직선 $l$ 위에서 $1$개, 직선 $m$ 위에서 $2$개를 택하는 경우의 수는 $${cTex(p, 1)}\\times ${cTex(q, 2)}=${p}\\times ${b}=${y}$`,
        `따라서 구하는 삼각형의 개수는 $${x}+${y}=${x + y}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, kind, p, q },
    };
  }
  if (mode === 2) {
    const [a, b] = pickOne(rng, TRIANGLE_GRIDS);
    const N = a * b;
    const T = nCr(N, 3);
    const byK = gridLines(a, b);
    const ks = [...byK.keys()].filter((k) => k >= 3).sort((x, y) => x - y);
    const bad = ks.map((k) => nCr(k, 3) * byK.get(k)!);
    const ans = T - sum(bad);
    return {
      content: `가로, 세로의 간격이 모두 같도록 한 줄에 $${a}$개씩 $${b}$줄로 놓인 $${N}$개의 점이 있다. 이 중에서 $3$개의 점을 꼭짓점으로 하는 삼각형의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${N}$개의 점 중에서 $3$개를 택하는 경우의 수는 $${cEq(N, 3)}$`,
        ...ks.map(
          (k) =>
            `$${k}$개의 점을 지나는 직선이 $${byK.get(k)!}$개 있고, 한 직선 위의 세 점으로는 삼각형이 만들어지지 않으므로 그 직선마다 $${cEq(k, 3)}$가지를 뺀다.`,
        ),
        `따라서 구하는 삼각형의 개수는 $${T}-${ks.map((k) => `${nCr(k, 3)}\\times ${byK.get(k)!}`).join("-")}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b },
    };
  }
  const kind = randInt(rng, 0, 1);
  const k = pickOne(rng, [3, 4, 5, 7]);
  const R = k * (2 * k - 2);
  const T = nCr(2 * k, 3);
  const lines = [
    `원에 내접하는 삼각형이 직각삼각형이 되려면 한 변이 원의 지름이어야 한다.`,
    `$${2 * k}$개의 점으로 만들 수 있는 지름은 $${k}$개이고, 지름 하나에 대하여 나머지 $${2 * k - 2}$개의 점 중 하나를 택하면 직각삼각형이 되므로 직각삼각형의 개수는 $${k}\\times ${2 * k - 2}=${R}$`,
  ];
  if (kind === 1) {
    lines.push(
      `$${2 * k}$개의 점 중에서 $3$개를 택하는 경우의 수는 $${cEq(2 * k, 3)}$이므로 구하는 삼각형의 개수는 $${T}-${R}=${T - R}$`,
    );
  }
  return {
    content: `원 위에 같은 간격으로 $${2 * k}$개의 점이 놓여 있다. 이 중에서 $3$개의 점을 꼭짓점으로 하는 삼각형 중 ${kind === 0 ? "직각삼각형" : "직각삼각형이 아닌 삼각형"}의 개수를 구하시오.`,
    answer: numAnswer(kind === 0 ? R : T - R),
    solution: lines.join("\n"),
    difficulty: "응용",
    facts: { mode, kind, k },
  };
}

// ───────────────────────────── 10 ─────────────────────────────
// 다각형의 개수 - 변
// 꼴 0 (기본·대표): 두 방향의 평행선 — ₘC₂ × ₙC₂
// 꼴 1 (응용): 정사각형을 붙여 만든 직사각형 도형 — 정사각형이 아닌 직사각형
// 꼴 2 (심화하): 평행사변형의 개수로 평행선의 수 되묻기
// 꼴 3 (심화하): 세 방향의 평행선 — 두 방향씩 짝지어 더한다

const SQUARE_BOARDS: readonly (readonly [number, number])[] = [
  [3, 2],
  [4, 3],
  [4, 4],
  [5, 3],
  [5, 4],
];

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const m = randInt(rng, 3, 6);
    const n = randInt(rng, 3, 7);
    const a = nCr(m, 2);
    const b = nCr(n, 2);
    return {
      content: `$${m}$개의 평행선과 이와 평행하지 않은 $${n}$개의 평행선이 서로 만날 때, 이 평행선으로 만들 수 있는 평행사변형의 개수를 구하시오.`,
      answer: numAnswer(a * b),
      solution: [
        `$${m}$개의 평행선 중에서 $2$개, $${n}$개의 평행선 중에서 $2$개를 택하면 평행사변형이 하나 만들어진다.`,
        `따라서 구하는 평행사변형의 개수는 $${cTex(m, 2)}\\times ${cTex(n, 2)}=${a}\\times ${b}=${a * b}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, m, n },
    };
  }
  if (mode === 1) {
    const [a, b] = pickOne(rng, SQUARE_BOARDS);
    const x = nCr(b + 1, 2);
    const y = nCr(a + 1, 2);
    const R = x * y;
    const sizes = Array.from({ length: Math.min(a, b) }, (_, i) => i + 1);
    const counts = sizes.map((s) => (a - s + 1) * (b - s + 1));
    const S = sum(counts);
    return {
      content: `한 변의 길이가 $1$인 정사각형 $${a * b}$개를 가로로 $${a}$개, 세로로 $${b}$개씩 붙여 만든 직사각형 모양의 도형이 있다. 이 도형의 선으로 만들 수 있는 사각형 중에서 정사각형이 아닌 직사각형의 개수를 구하시오.`,
      answer: numAnswer(R - S),
      solution: [
        `가로 방향의 선 $${b + 1}$개 중에서 $2$개, 세로 방향의 선 $${a + 1}$개 중에서 $2$개를 택하면 직사각형이 하나 만들어지므로 직사각형의 개수는 $${cTex(b + 1, 2)}\\times ${cTex(a + 1, 2)}=${x}\\times ${y}=${R}$`,
        `정사각형은 한 변의 길이가 ${sizes.map((s) => `$${s}$`).join(", ")}인 것이 각각 ${counts.map((c) => `$${c}$개`).join(", ")}이므로 모두 $${sumTex(counts)}=${S}$개`,
        `따라서 구하는 직사각형의 개수는 $${R}-${S}=${R - S}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b },
    };
  }
  if (mode === 2) {
    const n = randInt(rng, 4, 8);
    const K = nCr(n, 2) * nCr(n - 1, 2);
    return {
      content: `평면 위에 $n$개의 평행선과 이와 평행하지 않은 $(n-1)$개의 평행선이 있다. 이 평행선으로 만들 수 있는 평행사변형의 개수가 $${K}$일 때, 자연수 $n$의 값을 구하시오. (단, $n\\ge 3$)`,
      answer: numAnswer(n),
      solution: [
        `$${cTex("n", 2)}\\times ${cTex("n-1", 2)}=${K}$에서 $\\dfrac{n(n-1)}{2}\\times \\dfrac{(n-1)(n-2)}{2}=${K}$`,
        `$n(n-1)^{2}(n-2)=${4 * K}=${n}\\times ${n - 1}^{2}\\times ${n - 2}$`,
        `$n\\ge 3$일 때 $n(n-1)^{2}(n-2)$의 값은 $n$이 커질수록 커지므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, K },
    };
  }
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 2, 5);
  const c = randInt(rng, 2, 5);
  const [A, B, Cc] = [nCr(a, 2), nCr(b, 2), nCr(c, 2)];
  const parts = [A * B, A * Cc, B * Cc];
  const ans = sum(parts);
  return {
    content: `방향이 서로 다른 세 종류의 평행선이 각각 $${a}$개, $${b}$개, $${c}$개 있다. 이 직선들로 만들 수 있는 평행사변형의 개수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `평행사변형은 두 종류의 평행선에서 각각 $2$개씩 택하면 하나 만들어진다.`,
      `첫째와 둘째 종류로 만드는 평행사변형은 $${cTex(a, 2)}\\times ${cTex(b, 2)}=${parts[0]}$개`,
      `첫째와 셋째 종류로 만드는 평행사변형은 $${cTex(a, 2)}\\times ${cTex(c, 2)}=${parts[1]}$개`,
      `둘째와 셋째 종류로 만드는 평행사변형은 $${cTex(b, 2)}\\times ${cTex(c, 2)}=${parts[2]}$개`,
      `따라서 구하는 평행사변형의 개수는 $${sumTex(parts)}=${ans}$`,
    ].join("\n"),
    difficulty: "심화하",
    facts: { mode, a, b, c },
  };
}

// ───────────────────────────── 나누기 공용 ─────────────────────────────

/** n 을 k 개의 양의 정수로 나눈 것(큰 것부터, 각 ≤ max) 전부. */
function partitions(n: number, k: number, max: number): number[][] {
  if (k === 0) return n === 0 ? [[]] : [];
  const out: number[][] = [];
  for (let first = Math.min(n - (k - 1), max); first >= 1; first -= 1) {
    for (const rest of partitions(n - first, k - 1, first)) {
      out.push([first, ...rest]);
    }
  }
  return out;
}

/**
 * 서로 다른 n 개를 크기 sizes 의 묶음으로 **나누는** 경우의 수와 그 식 — 크기가 같은 묶음이 m 개면
 * 그 순서만 바뀐 것이 같은 나눔이므로 m! 로 나눈다.
 */
function split(
  n: number,
  sizes: readonly number[],
): { tex: string; value: number } {
  let left = n;
  let value = 1;
  const parts: string[] = [];
  for (const s of sizes) {
    parts.push(cTex(left, s));
    value *= nCr(left, s);
    left -= s;
  }
  if (left !== 0)
    throw new Error(`묶음 크기의 합이 ${n} 이 아닙니다: ${sizes}`);
  const mult = new Map<number, number>();
  for (const s of sizes) mult.set(s, (mult.get(s) ?? 0) + 1);
  const divs = [...mult.values()].filter((m) => m >= 2);
  for (const m of divs) value /= fact(m);
  return {
    tex: [...parts, ...divs.map((m) => `\\dfrac{1}{${m}!}`)].join("\\times "),
    value,
  };
}

/** `$4$개, $1$개, $1$개` */
function sizesTex(sizes: readonly number[], unit: string): string {
  return sizes.map((s) => `$${s}$${unit}`).join(", ");
}

// ───────────────────────────── 11 ─────────────────────────────
// 분할하는 경우의 수 — 같은 크기 묶음은 k! 로 나눈다
// 꼴 0 (기본·대표): 두 묶음으로 나누는 두 방법의 차
// 꼴 1 (응용): 세 묶음 — 같은 크기가 있으면 2!·3! 로 나누기
// 꼴 2 (심화하): 똑같은 필통에 빈 필통 없이 — 크기의 모든 경우를 더한다
// 꼴 3 (심화하): 두 조에 여학생이 적어도 한 명씩 — 한 조에 몰리는 경우를 뺀다

const THREE_WAY: Readonly<Record<number, readonly (readonly number[])[]>> = {
  6: [
    [3, 2, 1],
    [2, 2, 2],
    [4, 1, 1],
  ],
  7: [
    [4, 2, 1],
    [3, 2, 2],
    [3, 3, 1],
  ],
  8: [
    [5, 2, 1],
    [4, 2, 2],
    [3, 3, 2],
  ],
};

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const n = pickOne(rng, [6, 8, 10]);
      const h = n / 2;
      const p = randInt(rng, 1, h - 1);
      const A = split(n, [h, h]);
      const B = split(n, [n - p, p]);
      if (A.value === B.value) return null;
      const bigger = B.value > A.value;
      const expr = bigger ? "b-a" : "a-b";
      const ans = Math.abs(B.value - A.value);
      return {
        content: `서로 다른 $${n}$개의 구슬을 $${h}$개씩 두 묶음으로 나누는 경우의 수를 $a$, $${n - p}$개, $${p}$개의 두 묶음으로 나누는 경우의 수를 $b$${ira("b")} 할 때, $${expr}$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${n}$개를 $${h}$개, $${h}$개로 나누는 경우의 수는 $a=${A.tex}=${A.value}$`,
          `$${n}$개를 $${n - p}$개, $${p}$개로 나누는 경우의 수는 $b=${B.tex}=${B.value}$`,
          `따라서 $${expr}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, n, p },
      };
    });
  if (mode === 1) {
    const n = pickOne(rng, [6, 7, 8]);
    const sizes = pickOne(rng, THREE_WAY[n]!);
    const S = split(n, sizes);
    const same = sizes.length - new Set(sizes).size + 1;
    return {
      content: `서로 다른 $${n}$권의 책을 ${sizesTex(sizes, "권")}의 세 묶음으로 나누는 경우의 수를 구하시오.`,
      answer: numAnswer(S.value),
      solution: [
        `$${n}$권 중에서 차례로 ${sizesTex(sizes, "권")}을 택하는 경우의 수를 곱한다.`,
        same >= 2
          ? `이때 크기가 같은 묶음 $${same}$개는 순서만 바뀌어도 같은 나눔이므로 $${factEq(same)}$${ro(factEq(same))} 나눈다.`
          : `세 묶음의 크기가 모두 다르므로 나누지 않는다.`,
        `따라서 구하는 경우의 수는 $${S.tex}=${S.value}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, n, s1: sizes[0]!, s2: sizes[1]!, s3: sizes[2]! },
    };
  }
  if (mode === 2) {
    const [n, k] = pickOne(rng, [
      [5, 2],
      [6, 2],
      [7, 2],
      [5, 3],
      [7, 3],
    ] as const);
    const ps = partitions(n, k, n);
    const vals = ps.map((sz) => split(n, sz));
    const ans = sum(vals.map((v) => v.value));
    return {
      content: `서로 다른 볼펜 $${n}$자루를 똑같은 필통 $${k}$개에 빈 필통이 없도록 나누어 넣는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `필통이 똑같으므로 볼펜을 빈 묶음 없이 $${k}$개의 묶음으로 나누는 경우의 수와 같다.`,
        ...ps.map(
          (sz, i) =>
            `${sizesTex(sz, "자루")}로 나누는 경우의 수는 $${vals[i]!.tex}=${vals[i]!.value}$`,
        ),
        `따라서 구하는 경우의 수는 $${sumTex(vals.map((v) => v.value))}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, n, k },
    };
  }
  const h = randInt(rng, 3, 6);
  const g = randInt(rng, 2, h - 1);
  const b = 2 * h - g;
  const T = split(2 * h, [h, h]);
  const x = nCr(b, h - g);
  const ans = T.value - x;
  return {
    content: `여학생 $${g}$명과 남학생 $${b}$명을 $${h}$명씩 두 조로 나눌 때, 각 조에 적어도 한 명의 여학생이 포함되도록 나누는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `$${2 * h}$명을 $${h}$명, $${h}$명으로 나누는 경우의 수는 $${T.tex}=${T.value}$`,
      `여학생 $${g}$명이 모두 같은 조가 되는 경우의 수는 남학생 $${b}$명 중에서 여학생과 같은 조가 될 $${h - g}$명을 뽑는 경우의 수와 같으므로 $${cEq(b, h - g)}$`,
      `따라서 구하는 경우의 수는 $${T.value}-${x}=${ans}$`,
    ].join("\n"),
    difficulty: "심화하",
    facts: { mode, g, b },
  };
}

// ───────────────────────────── 12 ─────────────────────────────
// 분배하는 경우의 수 — (묶음으로 나누는 경우의 수) × (묶음 수)!
// 꼴 0 (기본·대표): 정해진 크기의 세 묶음을 세 사람에게
// 꼴 1 (응용): 모든 학생이 적어도 하나씩 받도록
// 꼴 2 (응용): 엘리베이터 — 내리는 층을 고르고 사람을 나누어 배정
// 꼴 3 (심화하): 관람차 — 칸마다 정원이 있고 어른은 정해진 칸에

const DEAL: readonly (readonly number[])[] = [
  [2, 1, 1],
  [2, 2, 1],
  [3, 1, 1],
  [3, 2, 1],
  [2, 2, 2],
  [4, 1, 1],
];

const LIFT: Readonly<Record<number, readonly (readonly number[])[]>> = {
  5: [
    [2, 2, 1],
    [3, 1, 1],
  ],
  6: [
    [3, 2, 1],
    [2, 2, 2],
  ],
  7: [
    [3, 2, 2],
    [3, 3, 1],
    [4, 2, 1],
  ],
};

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const sizes = pickOne(rng, DEAL);
    const n = sum(sizes);
    const S = split(n, sizes);
    const ans = S.value * 6;
    return {
      content: `서로 다른 사탕 $${n}$개를 ${sizesTex(sizes, "개")}의 세 묶음으로 나누어 세 사람 A, B, C에게 한 묶음씩 나누어 주는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${n}$개를 ${sizesTex(sizes, "개")}의 세 묶음으로 나누는 경우의 수는 $${S.tex}=${S.value}$`,
        `이 세 묶음을 세 사람에게 나누어 주는 경우의 수는 $3!=6$`,
        `따라서 구하는 경우의 수는 $${S.value}\\times 6=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, s1: sizes[0]!, s2: sizes[1]!, s3: sizes[2]! },
    };
  }
  if (mode === 1) {
    const [n, k] = pickOne(rng, [
      [4, 2],
      [4, 3],
      [5, 2],
      [6, 2],
      [6, 3],
    ] as const);
    const ps = partitions(n, k, n);
    const vals = ps.map((sz) => split(n, sz));
    const W = sum(vals.map((v) => v.value));
    const ans = W * fact(k);
    return {
      content: `서로 다른 상품 $${n}$개를 학생 $${k}$명에게 나누어 줄 때, 모든 학생이 적어도 한 개의 상품을 받도록 나누어 주는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        ...ps.map(
          (sz, i) =>
            `상품을 ${sizesTex(sz, "개")}로 나누는 경우의 수는 $${vals[i]!.tex}=${vals[i]!.value}$`,
        ),
        vals.length > 1
          ? `따라서 $${k}$개의 묶음으로 나누는 경우의 수는 $${sumTex(vals.map((v) => v.value))}=${W}$`
          : `따라서 $${k}$개의 묶음으로 나누는 경우의 수는 $${W}$`,
        `이 $${k}$개의 묶음을 $${k}$명에게 나누어 주는 경우의 수는 $${factEq(k)}$이므로 구하는 경우의 수는 $${W}\\times ${fact(k)}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, n, k },
    };
  }
  if (mode === 2) {
    const F = pickOne(rng, [5, 7]);
    const P = pickOne(rng, [5, 6, 7]);
    const sizes = pickOne(rng, LIFT[P]!);
    const x = nCr(F - 1, 3);
    const S = split(P, sizes);
    const ans = x * S.value * 6;
    return {
      content: `$${F}$층짜리 건물의 $1$층에서 $${P}$명이 엘리베이터를 함께 탄 후 $${F}$층까지 올라가는 동안 서로 다른 $3$개의 층에서 각각 ${sizesTex(sizes, "명")}이 내리는 경우의 수를 구하시오. (단, 엘리베이터에 새로 타는 사람은 없다.)`,
      answer: numAnswer(ans),
      solution: [
        `$2$층부터 $${F}$층까지 $${F - 1}$개의 층 중에서 사람들이 내리는 $3$개의 층을 택하는 경우의 수는 $${cEq(F - 1, 3)}$`,
        `$${P}$명을 ${sizesTex(sizes, "명")}의 세 조로 나누는 경우의 수는 $${S.tex}=${S.value}$`,
        `세 조를 택한 $3$개의 층에 배정하는 경우의 수는 $3!=6$`,
        `따라서 구하는 경우의 수는 $${timesTex([x, S.value, 6])}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, F, s1: sizes[0]!, s2: sizes[1]!, s3: sizes[2]! },
    };
  }
  const [m, c] = pickOne(rng, [
    [3, 5],
    [3, 6],
    [4, 8],
    [4, 9],
  ] as const);
  const ps = partitions(c, 3, m - 1);
  const vals = ps.map((sz) => split(c, sz));
  const W = sum(vals.map((v) => v.value));
  const ans = W * 6;
  return {
    content: `어느 관람차의 한 칸에는 최대 $${m}$명까지 탈 수 있다. 어른 $3$명과 어린이 $${c}$명이 비어 있는 세 칸에 나누어 타는데, 어른은 한 칸에 한 명씩 정해진 칸에 타고 어린이는 반드시 어른과 함께 타야 한다. 이때 $${3 + c}$명이 세 칸에 나누어 타는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `어른이 한 칸에 한 명씩 타므로 칸마다 어린이는 $${m - 1}$명까지 탈 수 있다.`,
      ...ps.map(
        (sz, i) =>
          `어린이 $${c}$명을 ${sizesTex(sz, "명")}의 세 조로 나누는 경우의 수는 $${vals[i]!.tex}=${vals[i]!.value}$`,
      ),
      `세 조를 어른이 한 명씩 탄 세 칸에 배정하는 경우의 수는 $3!=6$`,
      `따라서 구하는 경우의 수는 $${W}\\times 6=${ans}$`,
    ].join("\n"),
    difficulty: "심화하",
    facts: { mode, m, c },
  };
}

// ───────────────────────────── 13 ─────────────────────────────
// 대진표 작성하기 — 대진 방식은 그림 대신 글로 빠짐없이 적는다
// 꼴 0 (기본·대표): 두 조로 나누고 조 안의 대진을 정하는 경우의 수
// 꼴 1 (응용): A팀이 한 번만 이기면 결승전에 오르게
// 꼴 2 (심화하): A팀과 B팀이 결승전에서만 만날 수 있게

/** n 팀 대진표의 두 조 크기(큰 조 먼저). */
const BRACKET: Readonly<Record<number, readonly [number, number]>> = {
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [4, 3],
  8: [4, 4],
};

/** 조 안의 대진 방식 — 글. */
const GROUP_RULE: Readonly<Record<number, string>> = {
  2: "두 팀이 경기를 하고",
  3: "한 팀은 부전승으로 올라가고 나머지 두 팀이 먼저 경기를 한 뒤 그 승자가 부전승 팀과 경기를 하고",
  4: "두 팀씩 짝을 지어 경기를 한 뒤 두 승자가 다시 경기를 하고",
};

/** 조 안의 대진을 정하는 경우의 수 — 3팀은 부전승 팀, 4팀은 짝짓기. */
const GROUP_WAYS: Readonly<Record<number, number>> = { 2: 1, 3: 3, 4: 3 };

function bracketText(n: number): string {
  const [s1, s2] = BRACKET[n]!;
  const rule =
    s1 === s2
      ? `$${n}$개의 팀을 $${s1}$팀씩 두 조로 나누고, 각 조에서는 ${GROUP_RULE[s1]!}`
      : `$${n}$개의 팀을 $${s1}$팀인 조와 $${s2}$팀인 조로 나누고, $${s1}$팀인 조에서는 ${GROUP_RULE[s1]!}, $${s2}$팀인 조에서는 ${GROUP_RULE[s2]!}`;
  return `$${n}$개의 팀이 토너먼트 방식으로 시합을 한다. ${rule}, 두 조의 승자끼리 결승전을 한다.`;
}

/** 조 안의 대진을 정하는 경우의 수를 말하는 줄. */
function groupWaysLine(s: number, both: boolean): string | null {
  if (s === 3) {
    return `${both ? "각 조에서" : "$3$팀인 조에서"} 부전승으로 올라가는 한 팀을 정하는 경우의 수는 ${both ? "각각 " : ""}$${cTex(3, 1)}=3$`;
  }
  if (s === 4) {
    return `${both ? "각 조의" : "$4$팀인 조의"} $4$팀을 $2$팀씩 짝짓는 경우의 수는 ${both ? "각각 " : ""}$${cTex(4, 2)}\\times ${cTex(2, 2)}\\times \\dfrac{1}{2!}=3$`;
  }
  return null;
}

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0) {
    const n = pickOne(rng, [4, 5, 6, 7, 8]);
    const [s1, s2] = BRACKET[n]!;
    const S = split(n, [s1, s2]);
    const factors = [S.value, GROUP_WAYS[s1]!, GROUP_WAYS[s2]!].filter(
      (f, i) => i === 0 || f > 1,
    );
    const ans = factors.reduce((a, b) => a * b, 1);
    const lines = [
      `$${n}$개의 팀을 $${s1}$팀, $${s2}$팀의 두 조로 나누는 경우의 수는 $${S.tex}=${S.value}$`,
    ];
    if (s1 === s2) {
      const l = groupWaysLine(s1, true);
      if (l) lines.push(l);
    } else {
      for (const s of [s1, s2]) {
        const l = groupWaysLine(s, false);
        if (l) lines.push(l);
      }
    }
    lines.push(
      factors.length > 1
        ? `따라서 구하는 경우의 수는 $${timesTex(factors)}=${ans}$`
        : `따라서 구하는 경우의 수는 $${ans}$`,
    );
    return {
      content: `${bracketText(n)} 이와 같이 대진표를 작성하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: lines.join("\n"),
      difficulty: "기본",
      facts: { mode, n },
    };
  }
  if (mode === 1) {
    const n = pickOne(rng, [5, 6, 7]);
    const lines: string[] = [];
    let ans: number;
    if (n === 5) {
      const x = 4 * 3;
      const y = nCr(4, 2);
      ans = x + y;
      lines.push(
        `A팀이 한 번만 이기고 결승전에 오르려면 A팀이 $2$팀인 조에 있거나 $3$팀인 조에서 부전승으로 올라가야 한다.`,
        `A팀이 $2$팀인 조에 있는 경우, A팀과 경기할 팀을 정하는 경우의 수는 $${cTex(4, 1)}=4$이고 나머지 $3$팀인 조에서 부전승 팀을 정하는 경우의 수는 $3$이므로 $4\\times 3=${x}$`,
        `A팀이 $3$팀인 조에서 부전승으로 올라가는 경우, A팀과 같은 조가 될 두 팀을 정하는 경우의 수는 $${cEq(4, 2)}$`,
        `따라서 구하는 경우의 수는 $${x}+${y}=${ans}$`,
      );
    } else if (n === 6) {
      const x = nCr(5, 2);
      ans = x * 3;
      lines.push(
        `A팀이 한 번만 이기고 결승전에 오르려면 A팀이 부전승으로 올라가야 한다.`,
        `A팀과 같은 조가 될 두 팀을 나머지 $5$팀 중에서 택하는 경우의 수는 $${cEq(5, 2)}$`,
        `다른 조의 $3$팀 중에서 부전승으로 올라가는 한 팀을 정하는 경우의 수는 $${cTex(3, 1)}=3$`,
        `따라서 구하는 경우의 수는 $${x}\\times 3=${ans}$`,
      );
    } else {
      const x = nCr(6, 2);
      ans = x * 3;
      lines.push(
        `A팀이 한 번만 이기고 결승전에 오르려면 A팀이 $3$팀인 조에서 부전승으로 올라가야 한다.`,
        `A팀과 같은 조가 될 두 팀을 나머지 $6$팀 중에서 택하는 경우의 수는 $${cEq(6, 2)}$`,
        `나머지 $4$팀을 $2$팀씩 짝짓는 경우의 수는 $${cTex(4, 2)}\\times ${cTex(2, 2)}\\times \\dfrac{1}{2!}=3$`,
        `따라서 구하는 경우의 수는 $${x}\\times 3=${ans}$`,
      );
    }
    return {
      content: `${bracketText(n)} 이와 같이 대진표를 작성할 때, A팀이 한 번만 이기면 결승전에 오르도록 작성하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: lines.join("\n"),
      difficulty: "응용",
      facts: { mode, n },
    };
  }
  const n = pickOne(rng, [5, 6, 7, 8]);
  const [s1, s2] = BRACKET[n]!;
  const w = GROUP_WAYS[s1]! * GROUP_WAYS[s2]!;
  const lines = [
    `A팀과 B팀이 결승전에서만 만나려면 두 팀이 서로 다른 조에 있어야 한다.`,
  ];
  let ans: number;
  if (s1 === s2) {
    const x = nCr(n - 2, s1 - 1);
    ans = x * w;
    lines.push(
      `A팀과 같은 조가 될 $${s1 - 1}$팀을 B팀을 제외한 $${n - 2}$팀 중에서 택하는 경우의 수는 $${cEq(n - 2, s1 - 1)}$`,
      `각 조의 대진을 정하는 경우의 수는 각각 $${GROUP_WAYS[s1]!}$이므로 구하는 경우의 수는 $${timesTex([x, GROUP_WAYS[s1]!, GROUP_WAYS[s2]!])}=${ans}$`,
    );
  } else {
    const x1 = nCr(n - 2, s1 - 1);
    const x2 = nCr(n - 2, s2 - 1);
    const y1 = x1 * w;
    const y2 = x2 * w;
    ans = y1 + y2;
    lines.push(
      `A팀이 $${s1}$팀인 조에 있는 경우, A팀과 같은 조가 될 $${s1 - 1}$팀을 B팀을 제외한 $${n - 2}$팀 중에서 택하는 경우의 수는 $${cEq(n - 2, s1 - 1)}$이고, 두 조의 대진을 정하면 $${timesTex([x1, GROUP_WAYS[s1]!, GROUP_WAYS[s2]!])}=${y1}$`,
      `A팀이 $${s2}$팀인 조에 있는 경우, A팀과 같은 조가 될 $${s2 - 1}$팀을 B팀을 제외한 $${n - 2}$팀 중에서 택하는 경우의 수는 $${cEq(n - 2, s2 - 1)}$이고, 두 조의 대진을 정하면 $${timesTex([x2, GROUP_WAYS[s1]!, GROUP_WAYS[s2]!])}=${y2}$`,
      `따라서 구하는 경우의 수는 $${y1}+${y2}=${ans}$`,
    );
  }
  return {
    content: `${bracketText(n)} 이와 같이 대진표를 작성할 때, A팀과 B팀이 결승전에서만 만날 수 있도록 작성하는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: lines.join("\n"),
    difficulty: "심화하",
    facts: { mode, n },
  };
}

// ───────────────────────────── 등록 ─────────────────────────────

function entry(
  number: string,
  title: string,
  unitSection: string,
  make: (rng: Rng) => Body,
): HighTypeEntry {
  const meta = {
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType: number,
    rpmTitle: title,
  };
  return {
    key: `${BOOK}|${MINOR}|${number}`,
    ...meta,
    handler: (rng: Rng): HighProblem => ({ ...meta, ...make(rng) }),
  };
}

/** 색인의 유형 번호는 보존하고, 표시 제목의 OCR 잔재와 어순만 바로잡았다. */
export const H1_COMB: HighTypeEntry[] = [
  entry("01", "조합의 수 계산", SEC.조합, t01),
  entry("02", "조합의 수를 이용한 증명", SEC.조합, t02),
  entry("03", "조합의 수", SEC.조합, t03),
  entry("04", "‘적어도’의 조건이 있는 조합의 수", SEC.조합, t04),
  entry("05", "특정한 것을 포함하거나 포함하지 않는 조합의 수", SEC.조합, t05),
  entry("06", "뽑아서 나열하는 경우의 수", SEC.조합, t06),
  entry("07", "직선의 개수", SEC.조합, t07),
  entry("08", "대각선의 개수", SEC.조합, t08),
  entry("09", "다각형의 개수 - 꼭짓점", SEC.조합, t09),
  entry("10", "다각형의 개수 - 변", SEC.조합, t10),
  entry("11", "분할하는 경우의 수", SEC.조나누기, t11),
  entry("12", "분배하는 경우의 수", SEC.조나누기, t12),
  entry("13", "대진표 작성하기", SEC.조나누기, t13),
];

/** 조합 13유형은 전부 그림 없이 성립해 보류가 없다(대진표는 글로 적었다 — 머리말). */
export const H1_COMB_HOLD: HighHold[] = [];
