/**
 * 갈래 B 보강 유형(`MID_SUP_B`) — **RPM 색인 밖에서 지은 유형**을 지키는 시험.
 *
 * ## 왜 따로 있나
 *
 * 모듈 명부(`M1_EXPR`·`M2_RATIONAL`·`M2_GEO_SIM`)는 「RPM 색인 그대로」를 잠그는
 * 시험을 하나씩 달고 있다. 지은 유형을 그 명부에 섞으면 그 가드가 통째로 빨개지고,
 * 초록으로 만드는 유일한 길은 **가드를 무르는 것**이다. 그래서 지은 것은 명부 밖
 * (`midSupB.ts`)에 두고 여기서 지킨다 — 그러면 명부 가드도 살고 지은 것도 검사된다.
 *
 * ## 무엇을 재나 — **값이 아닌 축을 일부러 여럿 둔다**
 *
 * 2026-08-27 에 이 유형들에서 나온 결함은 **값 검산도 렌더 검사도 구조적으로 못
 * 보는 것**이 대부분이었다. 그래서 축을 나눠 둔다:
 *
 *  ⑴ **죽은 백슬래시** — 템플릿 리터럴이 홑 `\` 를 먹어 지면에 `0.overline{6}` ·
 *     `9<TAB>imes` · `4,mathrm{cm}` 이 나갔다(448자리). KaTeX 는 **에러로 안 본다.**
 *  ⑵ **`.math-raw` 중립 폴백** — `\begin{cases}` 줄바꿈이 `\x` 로 죽어 날 LaTeX 가
 *     그대로 나갔다. 붉지도 `katex-error` 도 아니라 **열쇠 둘로는 못 봤다**(32자리).
 *  ⑶ **조사** — 「$7$를 더하여」는 값도 LaTeX 도 옳다. 제품 규칙(`josaFaults`)이 참이다.
 *  ⑷ **수식 밖 숫자** — `${n}번째` (16자리).
 *  ⑸ **값** — 유형마다 발문에서 **다시 세어** 정답과 맞대는 검산.
 *  ⑹ **명부** — 지은 번호가 색인 번호대를 가로채지 않았나, 키가 겹치지 않나,
 *     `generate.ts` 에 실제로 등록됐나.
 *
 * ⚠️ ⑴~⑷ 는 **음성 대조군을 같이 둔다.** 「잡는가」만 물으면 「멀쩡한 것을 잡는가」는
 *    구조적으로 안 보이고, 거짓 경보는 가드를 끈다(CLAUDE.md 2026-08-20).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers, josaFaults } from "@/lib/elementary/rules";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "@/lib/middle/generate";
import { eulReul, euroRo } from "@/lib/middle/m2Josa";
import { MID_SUP_B } from "@/lib/middle/midSupB";

const SEED = 20260827;
const SEEDS = [20260827, 7, 4242, 99991] as const;
const REPO = path.resolve(__dirname, "../../..");

// ══════════════════════════════════════════════════════════════
//  ⑴ 죽은 백슬래시 — **원본**을 어휘 분석해서 센다
// ══════════════════════════════════════════════════════════════

/**
 * 템플릿 리터럴 안에서 **JS 가 먹어 버리는 홑 백슬래시**를 찾는다.
 *
 * 왜 산출물이 아니라 원본인가: 산출물에서 「맨 LaTeX 이름」을 세려면 이름 목록을
 * 손으로 적어야 하고, 목록에 없는 부류는 구조적으로 0이 된다(2026-08-18).
 * 원본에서는 규칙이 **하나**다 — `\\` 와 줄바꿈 `\n` 만 뜻이 살고 나머지는 잃는다:
 *   `\overline`→`overline` · `\times`→<TAB>imes · `\frac`→<FF>rac · `\,`→`,`
 *
 * ⚠️ `\n` 을 통째로 봐주면 **`\ne`(≠)·`\neq`·`\not`·`\nu` 가 새 나간다** —
 *    실제로 `$5\ne0$` 이 「$5<줄바꿈>e0$」으로 지면에 나갔다. 그래서 `\n` 뒤에
 *    영문이 오면서 **수식 `$…$` 안**일 때만 잡는다(수식 밖 「\nA반의 …」는 정상).
 */
export function deadBackslashes(src: string): { line: number; next: string }[] {
  const out: { line: number; next: string }[] = [];
  let line = 1;
  const stack: string[] = ["code"];
  const top = (): string => stack[stack.length - 1]!;
  let inMath = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (top() === "tpl") {
      if (c === "\\") {
        if (n === "\\") {
          i += 2;
          continue;
        }
        if (inMath && n === "n" && /[A-Za-z]/.test(src[i + 2] ?? "")) {
          out.push({ line, next: `n${src[i + 2]}` });
          i += 2;
          continue;
        }
        if (n !== "n" && n !== "`" && n !== "$") out.push({ line, next: n! });
        i += 2;
        continue;
      }
      if (c === "$" && n === "{") {
        stack.push("expr");
        i += 2;
        continue;
      }
      if (c === "$") {
        inMath = !inMath;
        i += 1;
        continue;
      }
      if (c === "`") {
        stack.pop();
        inMath = false;
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      i += 1;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i += 1;
        else if (src[i] === "\n") line += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (c === "`") {
      stack.push("tpl");
      inMath = false;
      i += 1;
      continue;
    }
    if (c === "{") {
      stack.push("brace");
      i += 1;
      continue;
    }
    if (c === "}") {
      if (top() === "brace" || top() === "expr") stack.pop();
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}

// ══════════════════════════════════════════════════════════════
//  ⑶ 조사 — 제품 규칙이 «안 재는» 축 둘만 여기서 더 본다
// ══════════════════════════════════════════════════════════════

/**
 * 도구격 「(으)로」 — `josaFaults` 의 짝 목록에 없다. 참은 `m2Josa.euroRo` 다
 * (규칙을 옮겨 적지 않는다).
 */
export function euroRoFaults(text: string): string[] {
  const bad: string[] = [];
  const re = /\$[^$]*?(-?\d+)\$ ?(으로|로)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    if (euroRo(Number(m[1])) !== m[2]) bad.push(m[0]);
    m = re.exec(text);
  }
  return bad;
}

/**
 * 수식이 **분수로 끝나는** 것 — 「$\dfrac{35}{110}$을」.
 *
 * 분수는 **분모를 먼저, 분자를 나중에** 읽는다(「백십분의 삼십오」). 그래서 소리의
 * 끝은 **분자**다. `josaFaults` 는 이 규칙을 알지만 정규식이 `\frac{…}{…}` 만 보고
 * **`\dfrac` 은 못 본다**(`\d` 가 사이에 낀다) — 우리 지면은 전부 `\dfrac` 이라
 * 그 축이 통째로 「안 잼」이었다. 2026-08-27 에 새 유형 둘이 그 자리로 샜다.
 */
export function dfracJosaFaults(text: string): string[] {
  const FLIP: Record<string, string> = {
    을: "를",
    이: "가",
    과: "와",
    은: "는",
  };
  const HEAD: Record<string, string> = {
    을: "을",
    를: "을",
    이: "이",
    가: "이",
    과: "과",
    와: "과",
    은: "은",
    는: "은",
  };
  const bad: string[] = [];
  const re =
    /\\d?frac\{(-?\d+)\}\{[^{}]*\}\$ ?(을|를|이|가|과|와|은|는)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    const head = HEAD[m[2]!]!;
    const want = eulReul(Number(m[1])) === "을" ? head : FLIP[head]!;
    if (m[2] !== want) bad.push(m[0]);
    m = re.exec(text);
  }
  return bad;
}

/**
 * 수식이 **문자로 끝나는** 것 — 「$-4x-3y$을」.
 *
 * 소리의 끝은 계수가 아니라 **마지막 문자**다(`x` 는 「엑스」, `y` 는 「와이」).
 * `josaFaults` 는 끝이 숫자일 때만 재므로 이 자리는 통째로 「안 잼」이다 —
 * 2026-08-27 에 새 유형 셋이 그 자리로 샜고 **눈으로 훑다** 걸렸다.
 *
 * ⚠️ 받침이 있는 문자가 셋 있다: `l`(엘) · `m`(엠) · `n`(엔). 표에 없는 문자는
 *    **판정하지 않는다** — 모르는 소리를 찍으면 거짓 경보가 되고, 거짓 경보는
 *    가드를 끈다(2026-08-20).
 */
const VAR_BATCHIM: Record<string, boolean> = {
  a: false, // 에이
  b: false, // 비
  c: false, // 씨
  d: false, // 디
  k: false, // 케이
  l: true, // 엘
  m: true, // 엠
  n: true, // 엔
  p: false, // 피
  q: false, // 큐
  r: false, // 아르
  s: false, // 에스
  t: false, // 티
  x: false, // 엑스
  y: false, // 와이
  z: false, // 제트
};

export function varTailJosaFaults(text: string): string[] {
  const NEEDS: Record<string, boolean> = {
    을: true,
    를: false,
    이: true,
    가: false,
    과: true,
    와: false,
    은: true,
    는: false,
  };
  const bad: string[] = [];
  const re = /\$[^$]*?([A-Za-z])\$ ?(을|를|이|가|과|와|은|는)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    const want = VAR_BATCHIM[m[1]!.toLowerCase()];
    if (want !== undefined && NEEDS[m[2]!] !== want) bad.push(m[0]);
    m = re.exec(text);
  }
  return bad;
}

/**
 * 수식이 `\overline{숫자}` 로 끝나는 것 — 순환소수 `0.\overline{8}` 은 「영 점 팔」
 * 이라 소리의 끝이 그 숫자다. `josaFaults` 는 끝이 `}` 라 **「안 잼」**으로 넘긴다
 * (그 함수 머리말이 「못 재는 것은 «통과»가 아니라 «안 잼»이다」라고 적어 둔 자리).
 */
export function overlineJosaFaults(text: string): string[] {
  const FLIP: Record<string, string> = {
    을: "를",
    이: "가",
    과: "와",
    은: "는",
  };
  const HEAD: Record<string, string> = {
    을: "을",
    를: "을",
    이: "이",
    가: "이",
    과: "과",
    와: "과",
    은: "은",
    는: "은",
  };
  const bad: string[] = [];
  const re =
    /\$[^$]*\\overline\{(\d+)\}\$ ?(을|를|이|가|과|와|은|는)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    const head = HEAD[m[2]!]!;
    const want = eulReul(Number(m[1])) === "을" ? head : FLIP[head]!;
    if (m[2] !== want) bad.push(m[0]);
    m = re.exec(text);
  }
  return bad;
}

// ══════════════════════════════════════════════════════════════
//  ⑸ 값 검산 — 발문에서 **다시 센다** (생성기 헬퍼를 되부르지 않는다)
// ══════════════════════════════════════════════════════════════

/** `$…$` 안의 첫 정수들을 순서대로. 지면 글자 그대로에서 읽는다. */
function nums(text: string): number[] {
  return (text.match(/-?\d+/g) ?? []).map(Number);
}

/** `\dfrac{a}{b}` 또는 정수 하나를 유리수로 읽는다. */
function rational(tex: string): { n: number; d: number } {
  const f = tex.match(/\\dfrac\{(-?\d+)\}\{(-?\d+)\}/);
  if (f) return { n: Number(f[1]), d: Number(f[2]) };
  const i = tex.match(/-?\d+/);
  if (!i) throw new Error(`수를 못 읽었다: ${tex}`);
  return { n: Number(i[0]), d: 1 };
}

function eq(a: { n: number; d: number }, b: { n: number; d: number }): boolean {
  return a.n * b.d === b.n * a.d;
}

/** `0.\overline{k}` 들을 순서대로 유리수(k/9 · k/99)로. */
function repeating(text: string): { n: number; d: number }[] {
  return [...text.matchAll(/0\.\\overline\{(\d+)\}/g)].map((m) => {
    const s = m[1]!;
    return { n: Number(s), d: Math.pow(10, s.length) - 1 };
  });
}

type Check = (p: { content: string; answer: string; solution: string }) => void;

/**
 * 유형마다 검산 하나. **발문에 실제로 찍힌 수**로 다시 계산한다 —
 * 생성기의 헬퍼를 되부르면 동어반복이라 아무것도 안 지킨다(브리프 §4).
 */
const CHECKS: Record<string, Check> = {
  // ── 중1 등식의 성질 ────────────────────────────────────────
  "1-1|일차방정식의 풀이|19": ({ content, answer }) => {
    // 「등식 $ax=v$의 양변에 $b$를 더하여」 → 답은 $ax+b=v+b$
    const [a, v, b] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    const got = nums(answer);
    expect(got).toEqual([a, b, v! + b!]);
  },
  "1-1|일차방정식의 풀이|20": ({ content, answer }) => {
    const [a, b, v] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([a, v! - b!]);
  },
  "1-1|일차방정식의 풀이|21": ({ content, answer }) => {
    const [x, a] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([a, a! * x!]);
  },
  "1-1|일차방정식의 풀이|22": ({ content, answer }) => {
    const [a, v] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([v! / a!]);
  },
  "1-1|일차방정식의 풀이|23": ({ content, answer }) => {
    const [a, b, v] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([(v! - b!) / a!]);
  },
  "1-1|일차방정식의 풀이|24": ({ content, answer }) => {
    // 「$ax+b=v$의 양변에 $k$를 곱하니 $cx+d=w$」 → $k=c/a$ 이고 $d=kb$, $w=kv$
    const [a, b, v, c, d, w] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    const k = Number(nums(answer)[0]);
    expect(c! / a!).toBe(k);
    expect(d).toBe(k * b!);
    expect(w).toBe(k * v!);
  },
  "1-1|일차방정식의 풀이|25": ({ content, answer }) => {
    // 「등식 $ax+b=v$의 양변에서 $b$를 뺀 뒤 … $x=r$이 되었다」 — 네 번째 수는
    // 되풀이된 $b$ 라 건너뛴다.
    const [a, b, v, , r] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(a! * r! + b!).toBe(v);
    expect(nums(answer)).toEqual([a]);
  },
  // ── 중1 일차방정식의 활용(해의 응용) ──────────────────────
  "1-1|일차방정식의 풀이|26": ({ content, answer }) => {
    // 「$px+a=v$의 해가 $x=r$」 → $a=v-pr$
    const [p, v, r] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([v! - p! * r!]);
  },
  "1-1|일차방정식의 풀이|27": ({ content, answer }) => {
    // 「$px=w$, $qx-b=c$의 해가 같다」 → $b=q(w/p)-c$
    const [p, w, q, c] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([q! * (w! / p!) - c!]);
  },
  "1-1|일차방정식의 풀이|28": ({ content, answer }) => {
    // 「$\dfrac{x+a}{k}=v$의 해가 $x=b$」 → $a=kv-b$
    const [k, v, b] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([k! * v! - b!]);
  },
  "1-1|일차방정식의 풀이|29": ({ content, answer }) => {
    // 「$ax-q=c$의 해가 자연수 $r$」 → $a=(c+q)/r$.
    // ⚠️ `nums` 는 부호를 **붙여서** 읽는다 — `ax-2` 는 `-2` 다. 그래서 뺀다.
    const [mq, c, r] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(nums(answer)).toEqual([(c! - mq!) / r!]);
  },
  "1-1|일차방정식의 풀이|30": ({ content, answer }) => {
    // 「$(a-p)x=c$ 가 해를 갖지 않는다」 → $a=p$ (그리고 $c\ne0$ 이어야 한다).
    // `nums` 가 `-p` 로 읽으므로 부호를 되돌린다.
    const [mp, c] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(c).not.toBe(0);
    expect(nums(answer)).toEqual([-mp!]);
  },
  "1-1|일차방정식의 풀이|31": ({ content, answer }) => {
    // 「$a(x+b)=px+pb$ 의 해가 무수히 많다」 → $a=p$ 이고 상수항이 맞아야 한다
    const [b, p, pb] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(pb).toBe(p! * b!);
    expect(nums(answer)).toEqual([p]);
  },
  // ── 중2 순환소수를 포함한 식의 계산 ───────────────────────
  "2-1|유리수와 순환소수|21": ({ content, answer }) => {
    const [u, v] = repeating(content);
    const s = { n: u!.n * v!.d + v!.n * u!.d, d: u!.d * v!.d };
    expect(eq(rational(answer), s)).toBe(true);
  },
  "2-1|유리수와 순환소수|22": ({ content, answer }) => {
    const [u, v] = repeating(content);
    const s = { n: u!.n * v!.d - v!.n * u!.d, d: u!.d * v!.d };
    expect(eq(rational(answer), s)).toBe(true);
  },
  "2-1|유리수와 순환소수|23": ({ content, answer }) => {
    const [u] = repeating(content);
    expect(eq(rational(answer), { n: 9 * u!.n, d: u!.d })).toBe(true);
  },
  "2-1|유리수와 순환소수|24": ({ content, answer }) => {
    const [u] = repeating(content);
    expect(eq(rational(answer), { n: 99 * u!.n, d: u!.d })).toBe(true);
  },
  "2-1|유리수와 순환소수|25": ({ content, answer }) => {
    // 「$x+0.\overline{a}=b$」 → $x=b-a/9$
    const [u] = repeating(content);
    const b = Number(content.match(/=(\d+)\$/)![1]);
    expect(eq(rational(answer), { n: b * u!.d - u!.n, d: u!.d })).toBe(true);
  },
  "2-1|유리수와 순환소수|26": ({ content, answer }) => {
    const [u, v] = repeating(content);
    const s = { n: u!.n * v!.d + v!.n * u!.d, d: 2 * u!.d * v!.d };
    expect(eq(rational(answer), s)).toBe(true);
  },
  "2-1|유리수와 순환소수|27": ({ content, answer }) => {
    // 「$0.\overline{ab}$의 기약분수의 분자+분모」 — 여기서 다시 약분한다
    const block = Number(content.match(/\\overline\{(\d+)\}/)![1]);
    const g = gcd2(block, 99);
    expect(nums(answer)).toEqual([block / g + 99 / g]);
    // 순환마디가 한 자리의 되풀이(`11`·`22`)면 두 자리 순환소수가 아니다
    expect(block % 11).not.toBe(0);
  },
  "2-1|유리수와 순환소수|28": ({ content, answer }) => {
    // 「$x=0.\overline{a}$일 때 $9x+b$」 → $9x=a$ 이므로 $a+b$
    const a = Number(content.match(/\\overline\{(\d+)\}/)![1]);
    const b = Number(content.match(/\$9x\+(\d+)\$/)![1]);
    expect(nums(answer)).toEqual([a + b]);
  },
  // ── 중1 문자의 사용과 식의 값 ─────────────────────────────
  "1-1|문자의 사용과 식의 계산|50": ({ content, answer }) => {
    // 단위 환산 — **여기서 다시 환산한다**
    const spans = content.match(/\$[^$]*\$/g)!.join(" ");
    const [a, b] = nums(spans);
    const got = nums(answer)[0]!;
    expect(content.includes("km") ? a! * b! * 1000 : a! * 40).toBe(got);
  },
  "1-1|문자의 사용과 식의 계산|51": ({ content, answer }) => {
    // 「$px-qy=k$일 때 $mpx-mqy+c$」 — 배수 관계를 **여기서 확인**한다
    const [p, q, k, mp, mq, c] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(mp! % p!).toBe(0);
    expect(mq! / q!).toBe(mp! / p!);
    expect(nums(answer)).toEqual([(mp! / p!) * k! + c!]);
  },
  // ── 중1 각 ────────────────────────────────────────────────
  "1-2|기본 도형|50": ({ content, answer }) => {
    const [total, n] = nums(content.match(/\$[^$]*\$/g)!.join(" "));
    expect(total! % n!).toBe(0);
    expect(nums(answer)).toEqual([total! / n!]);
  },
  "1-2|기본 도형|51": ({ content, answer }) => {
    const angles = [...content.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) =>
      Number(m[1]),
    );
    expect(angles).toHaveLength(5);
    expect(nums(answer)).toEqual([
      angles.filter((a) => a > 90 && a < 180).length,
    ]);
  },
  // ── 중3 인수분해 ──────────────────────────────────────────
  "3-1|다항식의 인수분해|50": ({ content, answer }) => {
    // 지면의 이차식을 읽어 **여기서 인수분해한다** — 그리고 갈래가 하나인지 센다
    const m = content.match(/\$(\d*)x\^2\+(\d+)x\+(\d+)\$/)!;
    const c = m[1] === "" ? 1 : Number(m[1]);
    const mid = Number(m[2]);
    const tail = Number(m[3]);
    const found: number[] = [];
    for (let b = 1; b <= tail; b += 1) {
      if (tail % b !== 0) continue;
      const d = tail / b;
      if (d + b * c === mid) found.push(b + d);
    }
    expect(
      new Set(found).size,
      `인수분해가 하나로 안 정해진다: ${content}`,
    ).toBe(1);
    expect(nums(answer)).toEqual([found[0]]);
  },
  // ── 중2 다항식의 덧셈과 뺄셈 / 곱셈과 나눗셈 ───────────────
  //
  // 계수를 옮겨 적지 않는다 — 지면의 식을 **여러 점에서 재어** 같은 값인지 본다.
  // 그래서 부호·괄호·계수 $1$ 생략이 틀려도 여기서 걸린다.
  "2-1|다항식의 계산|50": (p) => expectPolyIdentity(p, (A, B) => A + B),
  "2-1|다항식의 계산|51": (p) => expectPolyIdentity(p, (A, B) => A - B),
  "2-1|다항식의 계산|52": ({ content, answer }) => {
    // 「어떤 식에 $P$를 더했더니 $S$」 → 답 $= S-P$
    const [P, S] = content
      .match(/\$[^$]*\$/g)!
      .slice(0, 2)
      .map(stripDollar);
    for (const [x, y] of SAMPLE_POINTS)
      expect(
        evalPoly(stripDollar(answer), x, y) + evalPoly(P!, x, y),
        `${answer} + ${P} @(${x},${y})`,
      ).toBeCloseTo(evalPoly(S!, x, y), 9);
  },
  "2-1|다항식의 계산|53": (p) => expectMonoIdentity(p, "mul"),
  "2-1|다항식의 계산|54": (p) => expectMonoIdentity(p, "div"),
  "2-1|다항식의 계산|55": ({ content, answer }) => {
    // 「어떤 식에 $kx$를 곱했더니 $S$」 → 답 $\times kx = S$
    const [M, S] = content
      .match(/\$[^$]*\$/g)!
      .slice(0, 2)
      .map(stripDollar);
    for (const [x, y] of SAMPLE_POINTS)
      expect(
        evalPoly(stripDollar(answer), x, y) * evalPoly(M!, x, y),
      ).toBeCloseTo(evalPoly(S!, x, y), 9);
  },
  "2-1|다항식의 계산|56": ({ content, answer }) => {
    // 「어떤 식을 $kx$로 나누었더니 $Q$」 → 답 $= Q\times kx$
    const [M, Q] = content
      .match(/\$[^$]*\$/g)!
      .slice(0, 2)
      .map(stripDollar);
    for (const [x, y] of SAMPLE_POINTS)
      expect(evalPoly(stripDollar(answer), x, y)).toBeCloseTo(
        evalPoly(Q!, x, y) * evalPoly(M!, x, y),
        9,
      );
  },
  // ── 중2 유리수와 소수 ─────────────────────────────────────
  "2-1|유리수와 순환소수|36": ({ content, answer }) => {
    // 「$\dfrac{a}{b}$를 유한소수로」 — **여기서 직접 나눠** 소수를 만든다
    const [a, b] = nums(content.match(/\\dfrac\{[^}]*\}\{[^}]*\}/)![0]);
    const dec = answer.match(/0\.(\d+)/)![1]!;
    expect(a! * Math.pow(10, dec.length)).toBe(b! * Number(dec));
    expect(dec.endsWith("0"), "꼬리 0 이 남았다").toBe(false);
    // 분모가 $2^m5^n$ 인가 — 아니면 유한소수가 아니다
    let d = b!;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    expect(d).toBe(1);
  },
  "2-1|유리수와 순환소수|37": ({ content, answer }) => {
    const [, b] = nums(content.match(/\\dfrac\{[^}]*\}\{[^}]*\}/)![0]);
    const mul = nums(answer)[0]!;
    const prod = b! * mul;
    // 곱한 뒤 $10$의 거듭제곱인가
    expect(Math.pow(10, Math.round(Math.log10(prod)))).toBe(prod);
    // **가장 작은** 자연수인가 — 더 작은 것으로는 안 된다
    for (let t = 1; t < mul; t += 1) {
      const p = b! * t;
      expect(Math.pow(10, Math.round(Math.log10(p))) === p).toBe(false);
    }
  },
  "2-1|유리수와 순환소수|38": ({ content, answer }) => {
    const [a, b] = nums(content.match(/\\dfrac\{[^}]*\}\{[^}]*\}/)![0]);
    expect(nums(answer)).toEqual([b! / gcd2(a!, b!)]);
    expect(gcd2(a!, b!)).toBeGreaterThan(1); // 약분이 되어야 물음이 된다
  },
  "2-1|유리수와 순환소수|39": ({ content, answer }) => {
    // 분모가 `2^{m}\times5^{n}` 꼴로 적혀 있다 — 지수를 지면에서 읽는다
    // 중괄호가 한 겹 중첩된다(`2^{3}\times5^{2}`). 게으른 매칭으로 `}$` 까지.
    const den = content.match(/\\dfrac\{\d+\}\{(.*?)\}\$/)![1]!;
    const expOf = (base: number): number => {
      if (!den.includes(String(base))) return 0;
      const withExp = den.match(new RegExp(`${base}\\^\\{(\\d+)\\}`));
      return withExp ? Number(withExp[1]) : 1;
    };
    expect(nums(answer)).toEqual([Math.max(expOf(2), expOf(5))]);
  },
  // ── 중2 순환소수 ──────────────────────────────────────────
  "2-1|유리수와 순환소수|30": ({ content, answer }) => {
    // 「$0.abab\cdots$의 순환마디」 — 펼친 소수에서 되풀이를 **직접 찾는다**
    const laid = content.match(/0\.(\d+)\\cdots/)![1]!;
    const cyc = answer.match(/\d+/)![0];
    expect(
      laid.startsWith(
        cyc.repeat(Math.ceil(laid.length / cyc.length)).slice(0, laid.length),
      ),
    ).toBe(true);
  },
  "2-1|유리수와 순환소수|31": ({ content, answer }) => {
    const laid = content.match(/0\.(\d+)\\cdots/)![1]!;
    const cyc = answer.match(/\\overline\{(\d+)\}/)![1]!;
    expect(laid.slice(0, cyc.length)).toBe(cyc);
    expect(laid.slice(cyc.length, cyc.length * 2)).toBe(cyc);
  },
  "2-1|유리수와 순환소수|32": ({ content, answer }) => {
    const cyc = content.match(/\\overline\{(\d+)\}/)![1]!;
    expect(nums(answer)[0]).toBe(cyc.length);
  },
  "2-1|유리수와 순환소수|33": ({ content, answer }) => {
    const cyc = content.match(/\\overline\{(\d+)\}/)![1]!;
    const n = Number(content.match(/아래 \$(\d+)\$번째/)![1]);
    expect(nums(answer)[0]).toBe(Number(cyc[(n - 1) % cyc.length]));
  },
  "2-1|유리수와 순환소수|34": ({ content, answer }) => {
    const [a, b] = [...content.matchAll(/\\overline\{(\d+)\}/g)].map((m) =>
      Number(m[1]),
    );
    const want = Math.max(a!, b!);
    expect(Number(answer.match(/\\overline\{(\d+)\}/)![1])).toBe(want);
  },
  "2-1|유리수와 순환소수|35": ({ content, answer }) => {
    const [intPart, laid] = content.match(/(\d+)\.(\d+)\\cdots/)!.slice(1);
    const got = nums(answer);
    expect(got[0]).toBe(Number(intPart));
    expect(String(got[1])).toBe(laid!.slice(0, String(got[1]).length));
  },
  // ── 중2 연립방정식의 풀이 — **해를 대입해서** 잰다 ────────
  ...Object.fromEntries(
    ["21", "22", "23", "24", "25", "26", "27"].map((t) => [
      `2-1|연립일차방정식|${t}`,
      ((p) => {
        const [x, y] = nums(p.answer);
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        for (const eqTex of casesRows(p.content)) {
          expect(evalLinear(eqTex, x!, y!), `${eqTex} @ (${x},${y})`).toBe(0);
        }
      }) as Check,
    ]),
  ),
  "2-1|연립일차방정식|28": (p) => {
    // 「해 $(x,y)$일 때 $qx+py$」 — 두 식을 풀어 **여기서** 값을 낸다
    const rows = casesRows(p.content);
    const sol = solveTwo(rows[0]!, rows[1]!);
    const m = p.content.match(/\$(\d+)x\+(\d+)y\$의 값/)!;
    expect(nums(p.answer)[0]).toBe(Number(m[1]) * sol.x + Number(m[2]) * sol.y);
  },
  // ── 중2 닮은 도형의 넓이의 비와 부피의 비 ─────────────────
  "2-2|도형의 닮음|30": ({ content, answer }) => {
    const [A, B] = nums(content.match(/\$[^$]*\$/)![0]);
    const [p, q] = nums(answer);
    expect(p! * p!).toBe(A);
    expect(q! * q!).toBe(B);
    expect(gcd2(p!, q!)).toBe(1);
  },
  "2-2|도형의 닮음|31": ({ content, answer }) => {
    const spans = content.match(/\$[^$]*\$/g)!;
    const [p, q] = nums(spans[0]!);
    const small = nums(spans[1]!)[0]!;
    expect(nums(answer)[0]).toBe((small * q! * q!) / (p! * p!));
  },
  "2-2|도형의 닮음|32": ({ content, answer }) => {
    const [p, q] = nums(content.match(/\$[^$]*\$/)![0]);
    const [A, B] = nums(answer);
    expect(A).toBe(p! ** 3);
    expect(B).toBe(q! ** 3);
    expect(gcd2(p!, q!)).toBe(1);
  },
  "2-2|도형의 닮음|33": ({ content, answer }) => {
    const [A, B] = nums(content.match(/\$[^$]*\$/)![0]);
    const [p, q] = nums(answer);
    expect(p! ** 3).toBe(A);
    expect(q! ** 3).toBe(B);
    expect(gcd2(p!, q!)).toBe(1);
  },
  "2-2|도형의 닮음|34": ({ content, answer }) => {
    const spans = content.match(/\$[^$]*\$/g)!;
    const [p, q] = nums(spans[0]!);
    const small = nums(spans[1]!)[0]!;
    expect(nums(answer)[0]).toBe((small * q! * q!) / (p! * p!));
  },
  "2-2|도형의 닮음|35": ({ content, answer }) => {
    const spans = content.match(/\$[^$]*\$/g)!;
    const [p, q] = nums(spans[0]!);
    const small = nums(spans[1]!)[0]!;
    expect(nums(answer)[0]).toBe((small * q! ** 3) / p! ** 3);
  },
  // ── 중2 삼각형의 각의 이등분선 ────────────────────────────
  "2-2|평행선 사이의 선분의 길이의 비|12": ({ content, answer }) => {
    const { AB, AC, BC } = segs(content);
    expect(nums(answer)[0]).toBe((BC! * AB!) / (AB! + AC!));
  },
  "2-2|평행선 사이의 선분의 길이의 비|13": ({ content, answer }) => {
    const { AB, AC, BD } = segs(content);
    const DC = (BD! * AC!) / AB!;
    expect(nums(answer)[0]).toBe(AB! + AC! + BD! + DC);
  },
  "2-2|평행선 사이의 선분의 길이의 비|14": ({ content, answer }) => {
    const { AC, BD, DC } = segs(content);
    expect(nums(answer)[0]).toBe((AC! * BD!) / DC!);
  },
  "2-2|평행선 사이의 선분의 길이의 비|15": ({ content, answer }) => {
    const m = content.match(/=(\d+):(\d+)\$/)!;
    const [p, q] = [Number(m[1]), Number(m[2])];
    const abd = Number(content.match(/넓이가 \$(\d+)/)![1]);
    expect(nums(answer)[0]).toBe(abd + (abd * q) / p);
  },
  "2-2|평행선 사이의 선분의 길이의 비|16": ({ content, answer }) => {
    // 각의 이등분선의 성질의 **역** — 두 비가 같아야 성립한다
    const { AB, AC, BD, DC } = segs(content);
    expect(AB! * DC!).toBe(AC! * BD!);
    expect(nums(answer)[0]).toBe(
      Number(content.match(/\\angle BAD=(\d+)\^/)![1]),
    );
  },
  "2-2|평행선 사이의 선분의 길이의 비|17": ({ content, answer }) => {
    const { AB, AC, BC } = segs(content);
    expect(nums(answer)[0]).toBe((BC! * AC!) / (AB! - AC!));
  },
  "2-2|평행선 사이의 선분의 길이의 비|18": ({ content, answer }) => {
    const m = content.match(/=(\d+):(\d+)\$/)!;
    const [p, q] = [Number(m[1]), Number(m[2])];
    const cd = Number(content.match(/\\overline\{CD\}=(\d+)/)![1]);
    expect(nums(answer)[0]).toBe(((p - q) * cd) / q);
  },
  "2-2|평행선 사이의 선분의 길이의 비|19": ({ content, answer }) => {
    const { AB, AC, BC } = segs(content);
    // 삼각형이 되는가 — 발문 자체가 성립하는지부터 본다
    expect(AB! + AC!).toBeGreaterThan(BC!);
    expect(Math.abs(AB! - AC!)).toBeLessThan(BC!);
    const DC = (BC! * AC!) / (AB! + AC!);
    const CE = (BC! * AC!) / (AB! - AC!);
    expect(nums(answer)[0]).toBe(DC + CE);
  },
};

/** `\begin{cases}A\\B\end{cases}` 의 두 줄. */
function casesRows(content: string): string[] {
  const m = content.match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
  if (!m) throw new Error(`cases 를 못 찾았다: ${content}`);
  const rows = m[1]!.split("\\\\");
  if (rows.length !== 2) throw new Error(`cases 줄이 둘이 아니다: ${m[1]}`);
  return rows;
}

/** `ax+by=c` 꼴(괄호·분수 포함)을 $(x,y)$ 에서 재어 **좌변−우변**을 낸다. */
function evalLinear(tex: string, x: number, y: number): number {
  const js = tex
    .replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))")
    .replace(/\\times/g, "*")
    .replace(/(\d)\s*([xy(])/g, "$1*$2")
    .replace(/\)\s*\(/g, ")*(")
    .replace(/([xy])\s*\(/g, "$1*(");
  const [lhs, rhs] = js.split("=");
  if (rhs === undefined) throw new Error(`등호가 없다: ${tex}`);
  const f = (s: string): number =>
    Function("x", "y", `"use strict";return (${s});`)(x, y) as number;
  return f(lhs!) - f(rhs);
}

/** 두 일차식을 여기서 직접 푼다 — 생성기의 해를 안 믿는다. */
function solveTwo(r1: string, r2: string): { x: number; y: number } {
  // $f(x,y)=0$ 두 개를 정수 격자에서 찾는다 (해는 2..9 범위로 만든다)
  for (let x = -30; x <= 30; x += 1)
    for (let y = -30; y <= 30; y += 1)
      if (evalLinear(r1, x, y) === 0 && evalLinear(r2, x, y) === 0)
        return { x, y };
  throw new Error(`해를 못 찾았다: ${r1} / ${r2}`);
}

// ── 다항식 검산 소품 — 지면의 식을 **대입해서** 잰다 ────────────────

/** $(x, y)$ 표본. 부호·계수가 틀리면 어느 한 점에서 갈린다. */
const SAMPLE_POINTS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 3],
  [-1, 2],
  [3, -2],
  [5, 7],
];

function stripDollar(s: string): string {
  return s.replace(/^\$|\$$/g, "");
}

/** `3x^2-4xy+2y` 꼴을 $(x,y)$ 에서 잰다. LaTeX 는 `\times`·`\div` 만 나온다. */
export function evalPoly(tex: string, x: number, y: number): number {
  const js = tex
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\^\{(-?\d+)\}/g, "**($1)")
    .replace(/\^(-?\d)/g, "**($1)")
    .replace(/(\d)\s*([xy(])/g, "$1*$2")
    .replace(/([xy])\s*([xy(])/g, "$1*$2")
    .replace(/\)\s*\(/g, ")*(");
  return Function("x", "y", `"use strict";return (${js});`)(x, y) as number;
}

/** 「$A=…$, $B=…$일 때 $A\pm B$」 — 지면의 세 식을 대입해 항등식인지 본다. */
function expectPolyIdentity(
  p: { content: string; answer: string },
  op: (a: number, b: number) => number,
): void {
  const spans = p.content.match(/\$[^$]*\$/g)!;
  const A = stripDollar(spans[0]!).replace(/^A=/, "");
  const B = stripDollar(spans[1]!).replace(/^B=/, "");
  for (const [x, y] of SAMPLE_POINTS)
    // ⚠️ `toBe` 는 `-0` 과 `0` 을 다르게 본다 — 계수가 상쇄되면 그 자리가 난다.
    expect(
      evalPoly(stripDollar(p.answer), x, y),
      `${p.answer} @(${x},${y})`,
    ).toBeCloseTo(op(evalPoly(A, x, y), evalPoly(B, x, y)), 9);
}

/** 「$A=…$일 때 $kx\times A$」 또는 「$A\div kx$」. */
function expectMonoIdentity(
  p: { content: string; answer: string },
  kind: "mul" | "div",
): void {
  const spans = p.content.match(/\$[^$]*\$/g)!;
  const A = stripDollar(spans[0]!).replace(/^A=/, "");
  const k = Number(stripDollar(spans[1]!).match(/(\d+)x/)![1]);
  for (const [x, y] of SAMPLE_POINTS) {
    if (kind === "div" && k * x === 0) continue;
    const want =
      kind === "mul" ? k * x * evalPoly(A, x, y) : evalPoly(A, x, y) / (k * x);
    expect(evalPoly(stripDollar(p.answer), x, y)).toBeCloseTo(want, 9);
  }
}

/** 발문에 적힌 선분 길이들. */
function segs(content: string): Record<string, number | undefined> {
  const out: Record<string, number> = {};
  for (const m of content.matchAll(/\\overline\{([A-Z]{2})\}=(\d+)/g))
    out[m[1]!] = Number(m[2]);
  return out;
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

// ══════════════════════════════════════════════════════════════
//  시험
// ══════════════════════════════════════════════════════════════

describe("[갈래 B] 지은 유형 명부", () => {
  it("전부 `generate.ts` 에 등록돼 있고 키가 겹치지 않는다", () => {
    const reg = new Set(registeredTypes().map((e) => e.key));
    const missing = MID_SUP_B.filter((e) => !reg.has(e.key)).map((e) => e.key);
    expect(missing, "midSupB 에 있는데 등록표에 없다").toEqual([]);
    const keys = MID_SUP_B.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(MID_SUP_B.length).toBeGreaterThan(0);
  });

  it("지은 번호는 RPM 색인 번호대를 **가로채지 않는다**", () => {
    // 색인 번호대(01..max) 안의 빈 칸을 쓰면 RPM 이 그 번호를 쓰는 날 겹친다.
    // (같은 규칙을 `middleTypeCoverage.test.ts` 가 등록표 전량에 댄다 — 여기서는
    //  이 갈래 몫만 다시 본다. 한쪽이 지워져도 다른 쪽이 남는다.)
    const catalog = JSON.parse(
      readFileSync(
        path.resolve(REPO, "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    const bad: string[] = [];
    for (const e of MID_SUP_B) {
      const inMinor = (catalog[e.rpmBook]?.types ?? []).filter(
        (t) => t.minor === e.rpmMinor,
      );
      expect(inMinor.length, `${e.key}: 색인에 없는 중단원`).toBeGreaterThan(0);
      const max = Math.max(...inMinor.map((t) => Number(t.number)));
      if (Number(e.rpmType) <= max) bad.push(`${e.key} (색인 최대 ${max})`);
      if (inMinor.some((t) => t.title === e.rpmTitle))
        bad.push(`${e.key}: 제목이 색인 유형과 같다`);
    }
    expect(bad).toEqual([]);
  });

  it("검산표가 지은 유형을 **빠짐없이** 덮는다 — 분모를 지킨다", () => {
    const uncovered = MID_SUP_B.filter((e) => !CHECKS[e.key]).map((e) => e.key);
    expect(
      uncovered,
      `검산이 없는 유형 ${uncovered.length}개 — 유형을 더했으면 검산도 같이 쓸 것`,
    ).toEqual([]);
  });
});

describe("[갈래 B] 지면 — 값이 맞아도 흉할 수 있는 축", () => {
  const files = [
    "combo.ts",
    "m1Expr.ts",
    "m1Solid.ts",
    "m2GeoSim.ts",
    "m2GeoTri.ts",
    "m2Mono.ts",
    "m2Pytha.ts",
    "m2Rational.ts",
    "midSupB.ts",
  ];

  it("⑴ 템플릿 리터럴에서 죽은 백슬래시가 없다 (내 파일 전량)", () => {
    const bad: string[] = [];
    for (const f of files) {
      const p = path.resolve(REPO, "src/lib/middle", f);
      const src = readFileSync(p, "utf8");
      const lines = src.split(/\r?\n/);
      for (const h of deadBackslashes(src))
        bad.push(`${f}:${h.line} [\\${h.next}]  ${lines[h.line - 1]?.trim()}`);
    }
    expect(bad.slice(0, 6), `죽은 백슬래시 ${bad.length}자리`).toEqual([]);
  });

  it("🔴 ⑴ 의 눈금 — 죽는 자리를 실제로 잡고, 멀쩡한 것은 안 잡는다", () => {
    // 양성: 홑 `\overline` · `\,` · 수식 안 `\ne`
    expect(deadBackslashes("const a = `$\\overline{AB}$`;").length).toBe(1);
    expect(deadBackslashes("const a = `$3\\,cm$`;").length).toBe(1);
    expect(deadBackslashes("const a = `$5\\ne0$`;").length).toBe(1);
    // 음성: 겹백슬래시 · 수식 **밖**의 줄바꿈 뒤 영문 · 주석 안의 인용
    expect(deadBackslashes("const a = `$\\\\overline{AB}$`;")).toEqual([]);
    expect(
      deadBackslashes("const a = `합이다.\\nA반의 값은 $3$이다.`;"),
    ).toEqual([]);
    expect(deadBackslashes("// `\\overline{AB}` 를 쓴다\n")).toEqual([]);
    expect(deadBackslashes("/** `\\dfrac{1}{2}` */\n")).toEqual([]);
  });

  it("⑵ 제품 렌더러가 붉은 글자·`math-raw` 폴백 없이 그린다", () => {
    const bad: string[] = [];
    for (const e of MID_SUP_B)
      for (const seed of SEEDS)
        for (const f of ["content", "answer", "solution"] as const) {
          const text = String(generateMiddleProblem(e.key, seed)[f] ?? "");
          if (!text) continue;
          const html = renderMathHtml(text);
          if (
            html.includes("katex-error") ||
            html.includes("#cc0000") ||
            html.includes("math-raw")
          )
            bad.push(`${e.key} ${f}: ${text.slice(0, 90)}`);
        }
    expect(bad.slice(0, 4), `지면이 깨진 자리 ${bad.length}`).toEqual([]);
  });

  it("🔴 ⑵ 의 눈금 — `math-raw` 폴백을 실제로 잡는다", () => {
    // `\begin{cases}` 의 줄바꿈이 `\x` 로 죽은 그 모양. 붉지도 `katex-error` 도 아니다.
    const broken = renderMathHtml("$\\begin{cases}x+y=5\\x-y=1\\end{cases}$");
    expect(broken.includes("katex-error") || broken.includes("#cc0000")).toBe(
      false,
    );
    expect(broken.includes("math-raw")).toBe(true);
    // 멀쩡한 것은 안 잡는다
    expect(
      renderMathHtml("$\\begin{cases}x+y=5\\\\x-y=1\\end{cases}$"),
    ).not.toContain("math-raw");
  });

  it("⑶ 수식 뒤 조사가 수의 «읽는 소리»와 맞는다", () => {
    const bad: string[] = [];
    for (const e of MID_SUP_B)
      for (const seed of SEEDS)
        for (const f of ["content", "answer", "solution"] as const) {
          const t = String(generateMiddleProblem(e.key, seed)[f] ?? "");
          for (const b of [
            ...josaFaults(t),
            ...euroRoFaults(t),
            ...overlineJosaFaults(t),
            ...dfracJosaFaults(t),
            ...varTailJosaFaults(t),
          ])
            bad.push(`${e.key} ${f}: ${b}`);
        }
    expect(bad.slice(0, 6), `조사가 어긋난 자리 ${bad.length}`).toEqual([]);
  });

  it("🔴 ⑶ 의 눈금 — 틀린 것만 잡는다", () => {
    expect(euroRoFaults("$3$로 나누면")).toHaveLength(1);
    expect(euroRoFaults("$3$으로 나누면")).toHaveLength(0);
    expect(euroRoFaults("$5$로 나누면")).toHaveLength(0);
    expect(overlineJosaFaults("$0.\\overline{3}$를 계산")).toHaveLength(1);
    expect(overlineJosaFaults("$0.\\overline{3}$을 계산")).toHaveLength(0);
    expect(overlineJosaFaults("$0.\\overline{2}$를 계산")).toHaveLength(0);
    // 분수는 **분자**가 소리의 끝 — 「백십분의 삼십오를」
    expect(dfracJosaFaults("$\\dfrac{35}{110}$을 기약")).toHaveLength(1);
    expect(dfracJosaFaults("$\\dfrac{35}{110}$를 기약")).toHaveLength(0);
    expect(dfracJosaFaults("$\\dfrac{7}{110}$을 기약")).toHaveLength(0);
    // 문자로 끝나면 소리의 끝은 **그 문자**다 — 「…와이를」
    expect(varTailJosaFaults("$-4x-3y$을 더했더니")).toHaveLength(1);
    expect(varTailJosaFaults("$-4x-3y$를 더했더니")).toHaveLength(0);
    expect(varTailJosaFaults("$2n$를 더했더니")).toHaveLength(1); // 엔 — 받침
    expect(varTailJosaFaults("$2n$을 더했더니")).toHaveLength(0);
    // 표에 없는 문자는 **판정하지 않는다** (모르는 소리를 찍지 않는다)
    expect(varTailJosaFaults("$2f$을 더했더니")).toHaveLength(0);
    // 서술격 조사(계사)는 조사가 아니다 — 잡으면 거짓 경보가 쏟아진다
    expect(josaFaults("합은 $75$이다.")).toEqual([]);
  });

  it("⑷ 숫자가 KaTeX 밖에 없다", () => {
    const bad: string[] = [];
    for (const e of MID_SUP_B)
      for (const seed of SEEDS)
        for (const f of ["content", "answer", "solution"] as const) {
          const t = String(generateMiddleProblem(e.key, seed)[f] ?? "");
          const hits = bareNumbers(t);
          if (hits.length) bad.push(`${e.key} ${f}: [${hits.join(",")}] ${t}`);
        }
    expect(bad.slice(0, 4), `수식 밖 숫자 ${bad.length}자리`).toEqual([]);
  });
});

describe("[갈래 B] 값 — 발문에서 다시 센다", () => {
  for (const e of MID_SUP_B) {
    describe(`${e.unitSection} ${e.key}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, SEED, 1);
        const b = generateMiddleProblem(e.key, SEED, 1);
        expect(a).toEqual(b);
      });

      it("씨앗·변형 24개를 독립 검산한다", () => {
        const check = CHECKS[e.key];
        expect(check, `${e.key} 검산 없음`).toBeDefined();
        for (const seed of SEEDS)
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            check!(p);
          }
      });

      it("변형 3개가 서로 다른 발문으로 나온다", () => {
        const set = generateMiddleSet(e.key, SEED, 3);
        expect(new Set(set.map((p) => p.content)).size).toBe(3);
      });
    });
  }
});
