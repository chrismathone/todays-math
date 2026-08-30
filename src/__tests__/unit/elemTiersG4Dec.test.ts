/**
 * 초4 2-3 「소수의 덧셈과 뺄셈」 4단 확대 (D-72) — 소단원 일곱. 초4 2학기 둘째 트랜치.
 *
 * **참은 발문에서 온다.** 발문에 적힌 수만 읽어 답을 **독립 재도출**한다 — 생성기도
 * 제품 상수(`dec1`·`dec2`·`dec3`·`DEC1_POOL`)도 안 쓴다. 소수는 이 파일에서도 **정수 스케일**
 * (`scale`·`fmt`)로만 다룬다. 부동소수점으로 견주면 시험 쪽이 먼저 틀린다.
 *
 * 이 트랜치가 지켜야 하는 것 셋 —
 *  ㉠ **꼬리 $0$ 금지**(「$7.0$」·「$0.30$」). 발문·정답·해설 **셋 다** 센다.
 *  ㉡ **자릿수 약속**: 가장 깊은 자리 = 이름이 약속한 자리. 「전부 같은 dp」로는 안 잠근다 —
 *     그러면 「$5.63$ 에서 $0.4$ 대신 $0.04$ 를 뺐다」는 **오개념 문항 자체가 죽는다.**
 *  ㉢ **초3 1-6-6·1-6-7 과 안 겹침**. 이름이 닮았고, 설계 때 실제로 뽑아 보니 초안 둘이
 *     그대로 초3 것이었다. 가르는 것은 **자릿수**다(초3 은 한 자리뿐 — 음성 대조군으로 센다).
 *
 * ⚠️ **이 파일은 초3 1-6(g3 소유)의 산출물을 읽는다.** g3 이 그 소단원을 건드리면 여기가
 * 빨개질 수 있다. 그때 의심할 곳은 초4 가 아니라 «두 학년이 같은 문형을 쓰게 됐는가» 다.
 * 고칠 쪽은 **그 문형이 자기 소단원 이름의 약속을 덜 담고 있는 쪽**이고, 판단은 팀장이 가른다.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = [
  "2-3-1",
  "2-3-2",
  "2-3-3",
  "2-3-4",
  "2-3-5",
  "2-3-6",
  "2-3-7",
] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);
const WIDE = Array.from({ length: 200 }, (_, i) => 31337 + i * 104729);
const SWEEP = Array.from({ length: 1200 }, (_, i) => 20260823 + i * 7919);

/** 이름이 약속하는 «가장 깊은 소수 자리». 2-3-2·2-3-3 은 이름이 자리를 안 걸므로 상한만 둔다. */
const DEEPEST: Record<string, number> = {
  "2-3-1": 3,
  "2-3-2": 3,
  "2-3-3": 3,
  "2-3-4": 1,
  "2-3-5": 1,
  "2-3-6": 2,
  "2-3-7": 2,
};

/** 이름이 「소수 N 자리 수의 …」라고 못 박은 소단원. 발문의 가장 깊은 자리가 곧 N 이어야 한다. */
const NAMED_PLACES: Record<string, number> = {
  "2-3-4": 1,
  "2-3-5": 1,
  "2-3-6": 2,
  "2-3-7": 2,
};

function unitOf(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(code),
  );
  expect(u, `${grade} ${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function gen(code: string, seed: number, tier?: ElemTier) {
  return generateElementaryProblem(unitOf("초4", code), seed, tier);
}

/* ─────────────────────── 도구 (제품을 안 쓴다) ─────────────────────── */

/** 소수 문자열을 **정수 스케일**로. `"3.3"` → `{ i: 33, dp: 1 }`. 부동소수점을 안 거친다. */
function scale(text: string): { i: number; dp: number } {
  const [w, f = ""] = text.split(".");
  return { i: Number(`${w}${f}`), dp: f.length };
}

/** 정수 스케일 값을 소수 문자열로. `fmt(33, 3)` → `"0.033"`. */
function fmt(i: number, dp: number): string {
  if (dp === 0) return String(i);
  const s = String(i).padStart(dp + 1, "0");
  return `${s.slice(0, s.length - dp)}.${s.slice(s.length - dp)}`;
}

/** 그 소수를 `dp` 자리 정수 스케일로. 자릿수가 다른 둘을 견줄 때 **자리를 맞춘다**. */
function atDp(text: string, dp: number): number {
  const s = scale(text);
  return s.i * 10 ** (dp - s.dp);
}

/** 소수점을 오른쪽으로 `k` 칸(음수면 왼쪽). 자릿수만 바뀌고 숫자는 그대로다. */
function shift(text: string, k: number): string {
  const { i, dp } = scale(text);
  return fmt(i, Math.max(0, dp - k));
}

/** 본문에 적힌 소수를 나온 차례대로. 정수는 안 센다. */
function decsIn(text: string): string[] {
  return [...text.matchAll(/\d+\.\d+/g)].map((m) => m[0]);
}

/** 소수점 아래 자릿수 — **글자로** 센다. `0.30` 을 수로 읽으면 $0.3$ 이 되어 못 본다. */
function placesIn(text: string): number[] {
  return decsIn(text).map((d) => d.split(".")[1]!.length);
}

/** 꼬리 $0$ 이 붙은 소수. 「$7.0$」·「$0.30$」이 지면에 나가면 안 된다. */
function tailZeros(text: string): string[] {
  return decsIn(text).filter((d) => d.endsWith("0"));
}

/** 수를 가린 골격. 「같은 문장인데 수만 다른」 겹침을 여기서 본다. */
function skeleton(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "⟨수⟩")
    .replace(/\s+/g, " ")
    .trim();
}

const one = (text: string, re: RegExp): string => {
  const m = text.match(re);
  expect(m, `못 읽음 ${re} ← ${text}`).toBeTruthy();
  return m![1]!;
};

/* ─────────────────────── 값의 참을 발문에서 ─────────────────────── */

const REDERIVE: Record<string, (content: string) => string> = {
  // ── 2-3-1 소수 두 자리 수, 세 자리 수 알아보기
  // 방향이 표준과 반대다 — 수를 주고 «$0.001$이 몇 개인가» 를 묻는다.
  "2-3-1|연산": (c) => `$${scale(decsIn(c)[0]!).i}$개`,
  "2-3-1|기본": (c) => {
    const a = Number(one(c, /\$0\.1\$이 \$(\d+)\$개/));
    const b = Number(one(c, /\$0\.01\$이 \$(\d+)\$개/));
    const d = Number(one(c, /\$0\.001\$이 \$(\d+)\$개/));
    return `$${fmt(a * 100 + b * 10 + d, 3)}$`;
  },
  // 소수 둘째·셋째 자리 숫자가 «나타내는 수» 를 각각 만들어 더한다.
  "2-3-1|응용": (c) => {
    const digits = one(c, /\$\d+\.(\d{3})\$에서/);
    return `$${fmt(Number(digits[1]) * 10 + Number(digits[2]), 3)}$`;
  },
  "2-3-1|심화하": (c) => {
    const w = Number(one(c, /자연수 부분은 \$(\d+)\$/));
    const a = Number(one(c, /소수 첫째 자리 숫자는 \$(\d+)\$/));
    const k = Number(one(c, /보다 \$(\d+)\$ 큰/));
    const j = Number(one(c, /보다 \$(\d+)\$ 작은/));
    return `$${fmt(w * 1000 + a * 100 + (a + k) * 10 + (a + k - j), 3)}$`;
  },

  // ── 2-3-2 소수의 크기 비교하기
  "2-3-2|연산": (c) => {
    const vs = decsIn(c);
    const sorted = [...vs].sort((x, y) => scale(y).i - scale(x).i);
    return sorted.map((v) => `$${v}$`).join(", ");
  },
  "2-3-2|기본": (c) => {
    const first = one(c, /^(\S+?)의 무게는/);
    const second = one(c, /이고, (\S+?)의 무게는/);
    const [x, y] = decsIn(c);
    // 자릿수가 달라도 «정수 스케일 + 자리 맞춤» 으로 견준다 — 글자 길이로 견주면 오개념 그대로다.
    const dp = Math.max(scale(x!).dp, scale(y!).dp);
    const xv = scale(x!).i * 10 ** (dp - scale(x!).dp);
    const yv = scale(y!).i * 10 ** (dp - scale(y!).dp);
    return xv > yv ? first : second;
  },
  "2-3-2|응용": (c) => {
    const [lo, hi] = decsIn(c);
    return `$${scale(hi!).i - scale(lo!).i - 1}$개`;
  },
  "2-3-2|심화하": (c) => {
    const [lo, hi] = decsIn(c);
    const d = Number(one(c, /소수 둘째 자리 숫자가 \$(\d+)\$인/));
    const out: string[] = [];
    for (let v = scale(lo!).i + 1; v < scale(hi!).i; v += 1) {
      if (v % 10 === d) out.push(`$${fmt(v, 2)}$`);
    }
    return out.join(", ");
  },

  // ── 2-3-3 소수 사이의 관계 (소수점 이동만 — 곱셈·나눗셈을 쓰지 않는다)
  // 연산은 «몇 배인가» — 자릿수 차이가 곧 답이다.
  "2-3-3|연산": (c) => {
    const [big, small] = decsIn(c);
    return `$${10 ** (scale(small!).dp - scale(big!).dp)}$배`;
  },
  // 기본은 되짚기 — 「어떤 수의 k 배가 X」 에서 X 의 소수점을 왼쪽으로 옮긴다.
  "2-3-3|기본": (c) => {
    const k = Number(one(c, /어떤 수의 \$(\d+)\$배가/));
    return `$${shift(decsIn(c)[0]!, -(k === 100 ? 2 : 1))}$`;
  },
  "2-3-3|응용": (c) => `$${shift(decsIn(c)[0]!, -1)}$`,
  "2-3-3|심화하": (c) => {
    const given = decsIn(c)[0];
    if (given !== undefined) {
      // 「어떤 수의 1/10 이 X」 → 어떤 수는 X 를 오른쪽으로 한 칸, 그 10배는 한 칸 더.
      return `$${shift(given, 2)}$`;
    }
    // 「어떤 수의 100 배가 N」 → 어떤 수는 N 을 왼쪽 두 칸, 그 1/10 은 한 칸 더.
    const nInt = one(c, /\$(\d+)\$입니다/);
    return `$${fmt(Number(nInt), 3)}$`;
  },

  // ── 2-3-4 소수 한 자리 수의 덧셈
  "2-3-4|연산": (c) => {
    const [x, y] = decsIn(c);
    return `$${fmt(scale(x!).i + scale(y!).i, 1)}$`;
  },
  "2-3-4|기본": (c) => {
    const [x, y] = decsIn(c);
    return `$${fmt(scale(x!).i + scale(y!).i, 1)}$`;
  },
  "2-3-4|응용": (c) => {
    const vs = decsIn(c).map((d) => scale(d).i);
    return `$${fmt(
      vs.reduce((s, v) => s + v, 0),
      1,
    )}$`;
  },
  // 수 카드 — 만들 수 있는 짝을 **전부 만들어** 합이 가장 큰 것을 고른다.
  "2-3-4|심화하": (c) => {
    const cards = [
      ...one(c, /수 카드 ((?:\$\d+\$(?:, )?){4})/).matchAll(/\d+/g),
    ]
      .map((m) => Number(m[0]))
      .slice(0, 4);
    let best = 0;
    for (const [i, j, k, l] of PERM4) {
      const sum = (cards[i]! + cards[k]!) * 10 + cards[j]! + cards[l]!;
      if (sum > best) best = sum;
    }
    return `$${fmt(best, 1)}$`;
  },

  // ── 2-3-5 소수 한 자리 수의 뺄셈
  "2-3-5|연산": (c) => {
    const [x, y] = decsIn(c);
    return `$${fmt(scale(x!).i - scale(y!).i, 1)}$`;
  },
  "2-3-5|기본": (c) => {
    const [full, now] = decsIn(c);
    return `$${fmt(scale(full!).i - scale(now!).i, 1)}$`;
  },
  // 「기준보다 p 작은 수」와 「기준보다 q 큰 수」의 차는 기준이 지워져 `p+q` 다.
  "2-3-5|응용": (c) => {
    const vs = decsIn(c); // [기준, 아래 폭, 기준, 위 폭]
    return `$${fmt(scale(vs[1]!).i + scale(vs[3]!).i, 1)}$`;
  },
  // 뺄 것을 더했다 — 되짚어 한 번, 바르게 한 번 더 뺀다.
  "2-3-5|심화하": (c) => {
    const [sub, wrong] = decsIn(c);
    return `$${fmt(scale(wrong!).i - scale(sub!).i * 2, 1)}$`;
  },

  // ── 2-3-6 소수 두 자리 수의 덧셈
  "2-3-6|연산": (c) => {
    const [x, y] = decsIn(c);
    return `$${fmt(scale(x!).i + scale(y!).i, 2)}$`;
  },
  "2-3-6|기본": (c) => {
    const [x, y] = decsIn(c);
    return `$${fmt(scale(x!).i + scale(y!).i, 2)}$`;
  },
  // 어떤 수 = 알려진 수 − 폭. 물은 것은 「어떤 수 + 알려진 수」다.
  "2-3-6|응용": (c) => {
    const [gap, known] = decsIn(c);
    return `$${fmt(scale(known!).i * 2 - scale(gap!).i, 2)}$`;
  },
  // 두 자리를 바꿔 쓴 값으로 더했다 — 그 값을 빼서 되짚고 바른 값을 더한다.
  "2-3-6|심화하": (c) => {
    const [right, wrongAdd, got] = decsIn(c);
    return `$${fmt(scale(got!).i - scale(wrongAdd!).i + scale(right!).i, 2)}$`;
  },

  // ── 2-3-7 소수 두 자리 수의 뺄셈
  "2-3-7|연산": (c) => {
    const [x, y] = decsIn(c);
    return `$${fmt(scale(x!).i - scale(y!).i, 2)}$`;
  },
  // 목표는 소수 한 자리, 달린 거리는 두 자리 — **자리를 맞춘 뒤** 뺀다.
  "2-3-7|기본": (c) => {
    const [goal, done] = decsIn(c);
    return `$${fmt(atDp(goal!, 2) - atDp(done!, 2), 2)}$`;
  },
  "2-3-7|응용": (c) => {
    const [first, left, second] = decsIn(c);
    const some = scale(first!).i + scale(left!).i;
    return `$${fmt(some - scale(second!).i, 2)}$`;
  },
  // 세 수의 짝을 **전부** 견주어 가장 작은 차를 고른다.
  "2-3-7|심화하": (c) => {
    const vs = decsIn(c).map((d) => scale(d).i);
    let best = Infinity;
    for (let i = 0; i < vs.length; i += 1) {
      for (let j = i + 1; j < vs.length; j += 1) {
        best = Math.min(best, Math.abs(vs[i]! - vs[j]!));
      }
    }
    return `$${fmt(best, 2)}$`;
  },

  /* ── 확대 갈래 (D-113 둘째 물결, 2026-08-31) ───────────────────────────
   *
   * 이 자리는 **저절로 늘어난다** — `tiersOf(unit)` 를 도는 시험이라 소단원에
   * `심화중`·`심화상` 을 등록하는 순간 「재도출이 없다」로 빨개진다(D-113 ⑺ 의 설계).
   * 아래는 그 요구에 답한 것이고, **발문만 읽어** 답을 다시 세운다.
   */

  // 창이 자연수부·첫째·둘째를 굳히고 「셋째 = 첫째 + 둘째」가 넷째를 굳힌다.
  "2-3-1|심화중": (c) => {
    const m = Number(one(c, /\$0\.01\$이 \$(\d+)\$개인 수보다 크고/));
    const a = Math.floor(m / 10) % 10;
    const b = m % 10;
    return `$${m * 10 + a + b}$개`;
  },
  // 방향은 주고 칸 수를 안 준다 — 「소수 한 자리 수 / 두 자리 수」가 하나를 고른다.
  "2-3-3|심화중": (c) => {
    // `shift` 는 `dp` 를 $0$ 에서 자른다 — 여기서도 **정수 스케일 그대로** 다룬다.
    const { i, dp } = scale(one(c, /\$(0\.\d\d)\$[이가] 되었습니다/));
    const text = (d: number) => (d >= 0 ? fmt(i, d) : String(i * 10 ** -d));
    // 왼쪽으로 한 자리 옮겨 그 값이 되는 수는 `dp-1`, 두 자리면 `dp-2` 다.
    const picked = c.includes("어떤 수는 두 자리 수") ? dp - 2 : dp - 1;
    return `$${text(picked - 2)}$`;
  },
  // 방향도 칸 수도 안 준다 — 후보 넷을 실제로 $100$배 해 자릿수와 견준다.
  "2-3-3|심화상": (c) => {
    // ⚠️ `shift` 를 못 쓴다 — 그 헬퍼는 `dp` 를 $0$ 에서 **자른다**. 「$29$ 의 $100$배」가
    //    `29` 로 나와 후보 셋이 살아남았다(실측). **정수 스케일 그대로** 다룬다.
    const { i, dp } = scale(one(c, /\$(\d\.\d)\$[이가] 되었습니다/));
    const text = (d: number) => (d >= 0 ? fmt(i, d) : String(i * 10 ** -d));
    const digits = (d: number) => (d <= 0 ? text(d).length : 0);
    const want = c.includes("두 자리 수일 때") ? 2 : 4;
    // 소수점을 왼쪽·오른쪽으로 한 칸·두 칸 — 되짚기가 만드는 후보 넷이다.
    const alive = [dp + 2, dp + 1, dp - 1, dp - 2].filter(
      (d) => digits(d - 2) === want,
    );
    expect(alive, `2-3-3 심화상 후보가 하나가 아니다: ${c}`).toHaveLength(1);
    return `$${text(alive[0]!)}$`;
  },
  // 합이 범위로만 → 후보 아홉 → 「일의 자리 + 소수 첫째 자리 = s」가 하나를 고른다.
  "2-3-4|심화중": (c) => {
    const add = scale(decsIn(c)[0]!).i;
    const lo = Number(one(c, /합이 \$(\d+)\$보다 크고/));
    const s = Number(one(c, /합이 \$(\d+)\$일 때/));
    const base = lo * 10 - add;
    const alive: number[] = [];
    for (let k = 1; k <= 9; k += 1) {
      const v = base + k;
      if (v % 10 !== 0 && Math.floor(v / 10) + (v % 10) === s) alive.push(v);
    }
    expect(alive, `2-3-4 심화중 후보가 하나가 아니다: ${c}`).toHaveLength(1);
    return `$${fmt(alive[0]!, 1)}$`;
  },
  // 되짚는 자리가 반대(빼는 수)이고 굳힘도 「차」다.
  "2-3-5|심화중": (c) => {
    const from = scale(decsIn(c)[0]!).i;
    const lo = Number(one(c, /차가 \$(\d+)\$보다 크고/));
    const k = Number(one(c, /일의 자리 숫자보다 \$(\d+)\$ 클 때/));
    const base = from - (lo + 1) * 10;
    const alive: number[] = [];
    for (let j = 1; j <= 9; j += 1) {
      const v = base + j;
      if (v % 10 !== 0 && (v % 10) - Math.floor(v / 10) === k) alive.push(v);
    }
    expect(alive, `2-3-5 심화중 후보가 하나가 아니다: ${c}`).toHaveLength(1);
    return `$${fmt(alive[0]!, 1)}$`;
  },
  // 소수 첫째 자리 숫자만 감춘다 — **받아올림**이 그 자리를 굳힌다.
  "2-3-6|심화중": (c) => {
    const w = Number(one(c, /자연수 부분은 \$(\d+)\$이고/));
    const b = Number(one(c, /소수 둘째 자리 숫자는 \$(\d+)\$입니다/));
    const add = scale(decsIn(c)[0]!).i;
    const p = Number(one(c, /첫째 자리 숫자가 \$(\d+)\$[이가] 되었습니다/));
    const carry = b + (add % 10) >= 10 ? 1 : 0;
    const a = p - (Math.floor(add / 10) % 10) - carry;
    return `$${fmt(w * 100 + a * 10 + b, 2)}$`;
  },
  // 2-3-6 의 짝 — **받아내림**.
  "2-3-7|심화중": (c) => {
    const big = scale(decsIn(c)[0]!).i;
    const w = Number(one(c, /자연수 부분은 \$(\d+)\$이고/));
    const b = Number(one(c, /소수 둘째 자리 숫자는 \$(\d+)\$일 때/));
    const p = Number(one(c, /첫째 자리 숫자가 \$(\d+)\$[이가] 되었습니다/));
    const borrow = big % 10 < b ? 1 : 0;
    const a = (Math.floor(big / 10) % 10) - borrow - p;
    return `$${fmt(w * 100 + a * 10 + b, 2)}$`;
  },
};

/** 넉 장을 두 소수에 늘어놓는 모든 차례. 「가장 큰 합」을 전수로 확인하는 데 쓴다. */
const PERM4: number[][] = (() => {
  const out: number[][] = [];
  for (let a = 0; a < 4; a += 1) {
    for (let b = 0; b < 4; b += 1) {
      for (let d = 0; d < 4; d += 1) {
        for (let e = 0; e < 4; e += 1) {
          if (new Set([a, b, d, e]).size === 4) out.push([a, b, d, e]);
        }
      }
    }
  }
  return out;
})();

/* ─────────────────────────────── 시험 ─────────────────────────────── */

describe("초4 2-3 소수의 덧셈과 뺄셈 — 4단 등록", () => {
  it.each(CODES)("%s 는 네 갈래가 다 있다", (code) => {
    expectCoreTiers(unitOf("초4", code), code);
  });
});

/**
 * 전량 쓸기 두 건의 시간 한계 — **기본 $5$초로는 모자란다.**
 *
 * 실측(2026-08-23): 놀고 있는 컴퓨터에서 각각 **4,565ms · 4,475ms** 다. 기본 한계의
 * $91\%$ 라 다른 세션이 무엇이든 돌리면 넘어간다. 그러면 vitest 가 **실패**로 적는데,
 * 그 실패가 변이 하네스에 **가짜 빨강**으로 실린다 — 이 저장소가 여러 번 적은
 * 「죽은 가드」의 **반대편**이다. 실제로 `G4_MUTS` 첫 회차에서 삼각형 부등식 변이가
 * 이 검사를 떨어뜨린 것으로 찍혔고, 통제 재현에서는 **안 떨어졌다.** 판정 자체는
 * 옳았지만(내 시험 넷이 물었다) **적힌 이름이 틀렸다.** 관계없는 변이가 「잡혔다」로
 * 읽히면 장식인 가드를 가드로 착각한다.
 *
 * 쓸기를 줄이지 않고 한계를 올린다 — 표본을 줄이면 그때부터 못 보는 자리가 생긴다.
 */
/**
 * 🔴 20초로는 **관문에서 되풀이해 터졌다** — 2026-08-27 하루에만 세 번(갈래 A 도
 *    자기 보고서에 「타임아웃, 내 변경과 무관」이라 적었다). 실측:
 *
 *      단독 실행      이 파일 전체 15.95초 (이 쓸기가 그 대부분)
 *      관문 안        같은 파일 **50.2초** — 워커 여럿이 CPU 를 나눠 쓴다
 *
 *    단독 16초에 한도 20초면 부하가 조금만 걸려도 넘는다. 그리고 **터진 것이
 *    결함처럼 보인다** — 실제로 오늘 세 번 다 「실패 1」로 읽혔고, 그때마다
 *    단독으로 다시 돌려 결백을 확인해야 했다. 늘 우는 가드는 꺼진다.
 *
 *    ⚠️ 쓸기를 줄여 시간을 맞추면 **그때부터 못 보는 자리가 생긴다.** 한도만
 *    올린다 — 관문 실측(50초)의 곱절 가까이 두어 「진짜로 멈춘 것」만 문다.
 */
const SWEEP_MS = 90_000;

describe("소수의 꼴 — 꼬리 $0$ 과 자릿수", () => {
  it(
    "발문·정답·해설 어디에도 꼬리 $0$ 이 없다",
    () => {
      const bad: string[] = [];
      for (const code of CODES) {
        for (const tier of [undefined, ...tiersOf(unitOf("초4", code))]) {
          for (const seed of SWEEP) {
            const p = gen(code, seed, tier);
            for (const [where, text] of [
              ["발문", p.content],
              ["정답", p.answer],
              ["해설", p.solution],
            ] as const) {
              for (const d of tailZeros(text)) {
                bad.push(`${code} «${tier ?? "표준"}» s${seed} ${where}: ${d}`);
              }
            }
          }
        }
      }
      expect(bad.slice(0, 5)).toEqual([]);
    },
    SWEEP_MS,
  );

  it(
    "이름이 약속한 자리보다 깊은 소수가 없다 (발문·정답·해설)",
    () => {
      const bad: string[] = [];
      for (const code of CODES) {
        for (const tier of tiersOf(unitOf("초4", code))) {
          for (const seed of SWEEP) {
            const p = gen(code, seed, tier);
            const all = [
              ...placesIn(p.content),
              ...placesIn(p.answer),
              ...placesIn(p.solution),
            ];
            const deepest = Math.max(0, ...all);
            if (deepest > DEEPEST[code]!) {
              bad.push(
                `${code} «${tier}» s${seed}: ${deepest}자리 — ${p.content}`,
              );
            }
          }
        }
      }
      expect(bad.slice(0, 5)).toEqual([]);
    },
    SWEEP_MS,
  );

  /*
   * 이름이 「소수 N 자리 수의 …」인 넷은 **발문의 가장 깊은 자리가 곧 N** 이어야 한다.
   *
   * ⚠️ 「전부 N 자리」가 아니라 「가장 깊은 것이 N」이다. 2-3-7 기본은 목표가 소수 한 자리,
   * 달린 거리가 두 자리다 — **자리를 맞추어 빼는 것**이 그 소단원이 가르치는 바로 그것이라
   * dp 가 섞여야 성립한다. 더 엄하게 조이면 그 문항이 죽는다(리드 승인 2026-08-23).
   */
  it.each(Object.keys(NAMED_PLACES))(
    "%s 는 발문의 가장 깊은 자리가 이름이 약속한 자리다",
    (code) => {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          const places = placesIn(p.content);
          expect(places.length, `${code} «${tier}» s${seed}`).toBeGreaterThan(
            0,
          );
          expect(
            Math.max(...places),
            `${code} «${tier}» s${seed}: ${p.content}`,
          ).toBe(NAMED_PLACES[code]!);
        }
      }
    },
  );
});

/*
 * 눈검수로 찾아 **고친** 자리를 그 자리에서 잠근다(리드 기준 2026-08-23).
 * 「고쳤다」와 「고친 것이 지켜진다」는 다른 말이고, 되돌려도 초록이면 안 고친 것과 같다.
 */
describe("눈으로 찾아 고친 자리 — 전수 쓸기로 잠근다", () => {
  it("2-3-5 응용은 위·아래 폭이 서로 다르다", () => {
    const bad: string[] = [];
    for (const seed of SWEEP) {
      const p = gen("2-3-5", seed, "응용");
      const vs = decsIn(p.content); // [기준, 아래 폭, 기준, 위 폭]
      if (vs[1] === vs[3]) bad.push(`s${seed}: ${p.content}`);
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("2-3-6 응용·심화의 「어떤 수」는 $1$ 보다 크다", () => {
    // 되짚은 값이 $0$ 이하이면 「어떤 수」가 음수가 되어 초4 범위 밖이다.
    const bad: string[] = [];
    for (const tier of ["응용", "심화하"] as const) {
      for (const seed of SWEEP) {
        const p = gen("2-3-6", seed, tier);
        for (const d of decsIn(p.solution)) {
          if (d.startsWith("-")) bad.push(`«${tier}» s${seed}: ${p.solution}`);
        }
        expect(p.answer, `«${tier}» s${seed}`).not.toMatch(/-\d/);
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });
});

describe("초3 1-6 과 가르는 것은 «자릿수»다", () => {
  const G3 = ["1-6-6", "1-6-7"] as const;

  it("2-3-1·2-3-2 발문에는 두 자리 이상 소수가 있다", () => {
    const bad: string[] = [];
    for (const code of ["2-3-1", "2-3-2"] as const) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          if (!placesIn(p.content).some((d) => d >= 2)) {
            bad.push(`${code} «${tier}» s${seed}: ${p.content}`);
          }
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  // 음성 대조군 — 이것이 없으면 위 판별자가 «가르는지» 알 수 없다.
  it("초3 1-6-6·1-6-7 은 소수 한 자리뿐이다", () => {
    const deep: string[] = [];
    let seen = 0;
    for (const code of G3) {
      for (const tier of [undefined, ...tiersOf(unitOf("초3", code))]) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf("초3", code), seed, tier);
          for (const d of placesIn(p.content)) {
            seen += 1;
            if (d >= 2)
              deep.push(`초3 ${code} «${tier ?? "표준"}»: ${p.content}`);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(50);
    expect(deep.slice(0, 3)).toEqual([]);
  });

  it("초3 1-6-6·1-6-7 과 발문도 골격도 안 겹친다", () => {
    const mine = new Map<string, string>();
    const skel = new Map<string, string>();
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          mine.set(p.content, `초4 ${code} «${tier}»`);
          skel.set(skeleton(p.content), `초4 ${code} «${tier}»`);
        }
      }
    }
    const hit: string[] = [];
    for (const code of G3) {
      for (const tier of [undefined, ...tiersOf(unitOf("초3", code))]) {
        for (const seed of WIDE) {
          const p = generateElementaryProblem(unitOf("초3", code), seed, tier);
          if (mine.has(p.content)) hit.push(`발문 ${mine.get(p.content)}`);
          const near = skel.get(skeleton(p.content));
          if (near) hit.push(`골격 ${near} ≈ 초3 ${code}: ${p.content}`);
        }
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });
});

describe("값 — 발문만 읽어 다시 세운다", () => {
  it("답이 재도출과 글자까지 같다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        const rederive = REDERIVE[`${code}|${tier}`];
        expect(rederive, `${code} «${tier}» 재도출이 없다`).toBeTruthy();
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const want = rederive!(p.content);
          if (p.answer !== want) {
            bad.push(`${code} «${tier}» s${seed}: 답 ${p.answer} ≠ ${want}`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe("겹침 — 같은 소단원의 표준과", () => {
  it("표준과 발문도 골격도 안 겹친다 (R5)", () => {
    const mine = new Map<string, string>();
    const skel = new Map<string, string>();
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          mine.set(p.content, `${code} «${tier}»`);
          skel.set(skeleton(p.content), `${code} «${tier}»`);
        }
      }
    }
    const hit: string[] = [];
    for (const code of CODES) {
      for (const seed of WIDE) {
        const p = gen(code, seed);
        if (mine.has(p.content))
          hit.push(`표준 ${code} = ${mine.get(p.content)}`);
        const near = skel.get(skeleton(p.content));
        if (near) hit.push(`표준 ${code} ≈ ${near}: ${p.content}`);
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });
});

describe("겹침 — 2-3 안에서 소단원끼리", () => {
  /*
   * 소단원이 일곱이고 넷이 「더하기·빼기」다. 묻는 말을 안 갈라 두면 **다른 소단원의 갈래끼리**
   * 골격이 같아진다 — 한 대단원 안이라 같은 시험지에 함께 실릴 수 있다.
   * (표준↔갈래는 아래 R5 검사가, 초3↔초4 는 위 검사가 본다. 여기는 **갈래↔갈래**다.)
   */
  it("서로 다른 소단원의 갈래끼리 골격이 안 겹친다", () => {
    const seen = new Map<string, string>();
    const hit: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of SEEDS) {
          const sk = skeleton(gen(code, seed, tier).content);
          const prev = seen.get(sk);
          if (prev === undefined) seen.set(sk, `${code} «${tier}»`);
          else if (!prev.startsWith(code))
            hit.push(`${prev} ≈ ${code} «${tier}»: ${sk}`);
        }
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });
});

describe("변형 — 씨앗이 바뀌면 발문이 바뀐다", () => {
  it("갈래마다 씨앗 16개에서 발문이 8가지 이상", () => {
    const thin: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        const seen = new Set(SEEDS.map((s) => gen(code, s, tier).content));
        if (seen.size < 8) thin.push(`${code} «${tier}» ${seen.size}가지`);
      }
    }
    expect(thin).toEqual([]);
  });
});

describe("자체 눈금 — 이 파일의 도구가 살아 있는가", () => {
  it("정수 스케일로 읽고 쓴다", () => {
    expect(scale("3.3")).toEqual({ i: 33, dp: 1 });
    expect(scale("0.035")).toEqual({ i: 35, dp: 3 });
    expect(fmt(33, 3)).toBe("0.033");
    expect(fmt(114, 1)).toBe("11.4");
    expect(fmt(35, 0)).toBe("35");
  });

  it("소수점을 옮긴다", () => {
    expect(shift("3.3", -2)).toBe("0.033");
    expect(shift("1.35", -1)).toBe("0.135");
    expect(shift("0.83", 2)).toBe("83");
  });

  it("꼬리 $0$ 을 실제로 잡고 멀쩡한 것은 통과시킨다", () => {
    expect(tailZeros("$0.030$을 나타내고")).toEqual(["0.030"]);
    expect(tailZeros("$7.0$")).toEqual(["7.0"]);
    expect(tailZeros("$0.035$, $11.4$, $100$배")).toEqual([]);
  });

  it("자릿수를 글자로 센다", () => {
    // 수로 읽으면 `0.30` 이 $0.3$ 이 되어 두 자리인 것을 못 본다.
    expect(placesIn("$0.30$")).toEqual([2]);
    expect(placesIn("$100$배")).toEqual([]);
  });

  /*
   * 「이름이 약속한 자리보다 깊은 소수」 가드는 **변이 시험으로 확인할 수 없다.**
   * 지금 제품에는 `dec4` 가 없어 네 자리를 찍을 방법이 아예 없고, 값을 바꾸면 값 검사가
   * 먼저 문다 — 「같은 값인데 더 깊다」는 꼬리 $0$ 말고는 수학적으로 불가능하다.
   *
   * 그 가드는 **앞으로** 들어올 것을 막는다($0.53$ 의 $\frac{1}{100}$ 은 $0.0053$ — 값은
   * 맞는데 초4 밖이다). 그러니 「0건」이 «깨끗»인지 «못 셈»인지 여기서 갈라 둔다 —
   * 판정기에 **일부러 깊은 입력**을 먹여 실제로 세는지 본다.
   */
  it("네 자리 소수를 실제로 «깊다»고 센다 (변이로는 못 미치는 가드)", () => {
    expect(placesIn("$0.0053$")).toEqual([4]);
    expect(Math.max(...placesIn("$1.2$, $0.0053$"))).toBe(4);
    expect(Math.max(0, ...placesIn("$1.2$"))).toBe(1);
  });
});
