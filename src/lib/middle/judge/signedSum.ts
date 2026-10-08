/**
 * **지면에 찍힌 덧셈 · 뺄셈 등식을 다시 잰다** — 판정형 «계산이 옳지 않은 것은?»의 `truthOf`.
 *
 *   `$\left(+\dfrac{1}{2}\right)-\left(-3\right)=\dfrac{7}{2}$`  →  true
 *
 * 🔴 생성기의 셈(`m1Calc` 의 `addQ` · 약분)을 **다시 부르지 않는다** — 같은 셈으로 다시 재면 동어반복이다.
 *    여기서는 글을 읽어 **약분 없이 BigInt 교차곱**으로 견준다(`sn·D === N·sd`). 동치를 글자로 보지 않는다
 *    (합의안 §2 Q2 «동치는 문자열이 아니라 유리수 교차곱으로»).
 *
 * 읽는 꼴은 우리 엔진이 찍는 그것 하나다 — 항은 `\left(±…\right)`, 사이는 `+` · `-`, 오른쪽은 부호 붙은 정수 ·
 * 분수. 그 밖의 꼴이면 null(«못 읽음» — 등록부가 그 문항을 안 낸다). 넓게 읽으려 애쓰지 않는다.
 */

type Frac = { n: bigint; d: bigint };

// ⚠️ `0n` 리터럴을 쓰지 않는다 — tsconfig target 이 ES2017 이라 tsc 가 TS2737 로 문다(vitest 는 타입을 안 봐 초록이다).
const ZERO = BigInt(0);
const ONE = BigInt(1);
const MINUS = BigInt(-1);

const TERM =
  /^([+-])?\\left\(([+-])(?:\\dfrac\{(\d+)\}\{(\d+)\}|(\d+))\\right\)/;
const RIGHT = /^(-)?(?:\\dfrac\{(\d+)\}\{(\d+)\}|(\d+))$/;

function readLeft(src: string): Frac | null {
  let rest = src;
  let acc: Frac = { n: ZERO, d: ONE };
  let first = true;
  while (rest.length > 0) {
    const m = TERM.exec(rest);
    if (!m) return null;
    const [whole, op, sign, fn, fd, int] = m;
    // 첫 항 앞에는 연산 기호가 없고, 둘째부터는 반드시 있다.
    if (first === (op !== undefined)) return null;
    const n = BigInt(fn ?? int!);
    const d = BigInt(fd ?? "1");
    if (d === ZERO) return null;
    const signed =
      (sign === "-" ? MINUS : ONE) * (op === "-" ? MINUS : ONE) * n;
    acc = { n: acc.n * d + signed * acc.d, d: acc.d * d };
    rest = rest.slice(whole.length);
    first = false;
  }
  return first ? null : acc;
}

function readRight(src: string): Frac | null {
  const m = RIGHT.exec(src);
  if (!m) return null;
  const [, minus, fn, fd, int] = m;
  const d = BigInt(fd ?? "1");
  if (d === ZERO) return null;
  return { n: (minus ? MINUS : ONE) * BigInt(fn ?? int!), d };
}

/** 참이면 true · 거짓이면 false · 이 꼴이 아니면 null. */
export function signedSumTruth(choiceText: string): boolean | null {
  const t = choiceText.trim();
  if (!t.startsWith("$") || !t.endsWith("$") || t.length < 3) return null;
  const body = t.slice(1, -1).replace(/\s+/g, "");
  const parts = body.split("=");
  if (parts.length !== 2) return null;
  const left = readLeft(parts[0]!);
  const right = readRight(parts[1]!);
  if (!left || !right) return null;
  return left.n * right.d === right.n * left.d;
}
