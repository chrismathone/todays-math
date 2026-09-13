/**
 * 고등 정답 수식 → 값 — **제품(`src/lib/high/numbers.ts`)을 안 부르고** 다시 적은 읽개.
 *
 * 고등 답은 `$2\sqrt{3}$`·`$\dfrac{-1\pm\sqrt{3}i}{2}$`·`$3-2i$` 같은 **식**이다. 유형 시험은
 * `facts` 로 답의 «값»을 따로 세우고, 지면의 답을 이 읽개로 값으로 바꿔 맞댄다
 * (`high-engine-plan.md` §1-2). 제품의 표기 함수를 불러 비교하면 둘이 같이 틀린다.
 *
 * 읽는 것: 정수 · `\dfrac{}{}`·`\frac{}{}` · `\sqrt{}` · `i` · 괄호 · 붙여 쓴 곱 · `+ - \pm \mp`.
 * `\pm`·`\mp` 는 값을 **둘로** 가른다. 그 밖의 꼴은 **던진다** — 조용히 통과시키지 않는다.
 * 근호 안이 음수면 던진다(지면 표기는 `\sqrt{3}i` 다 — `\sqrt{-3}` 은 답의 꼴이 아니다).
 */

export type Cx = { re: number; im: number };

type Tok =
  | { k: "num"; v: number }
  | { k: "i" }
  | { k: "sqrt" }
  | { k: "frac" }
  | { k: "op"; v: "+" | "-" | "pm" | "mp" }
  | { k: "(" | ")" | "{" | "}" };

function tokenize(src: string): Tok[] {
  const s = src.replace(/\s+/g, "");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const num = /^\d+/.exec(rest);
    if (num) {
      out.push({ k: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const cmd = /^\\(dfrac|frac|sqrt|pm|mp)(?![a-zA-Z])/.exec(rest);
    if (cmd) {
      const name = cmd[1]!;
      if (name === "dfrac" || name === "frac") out.push({ k: "frac" });
      else if (name === "sqrt") out.push({ k: "sqrt" });
      else out.push({ k: "op", v: name as "pm" | "mp" });
      i += cmd[0].length;
      continue;
    }
    const ch = s[i]!;
    if (ch === "i") out.push({ k: "i" });
    else if (ch === "+" || ch === "-") out.push({ k: "op", v: ch });
    else if (ch === "(" || ch === ")" || ch === "{" || ch === "}")
      out.push({ k: ch });
    else
      throw new Error(
        `정답 수식을 못 읽는다 — «${rest.slice(0, 16)}» (${src})`,
      );
    i += 1;
  }
  return out;
}

const add = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im });
const neg = (a: Cx): Cx => ({ re: -a.re, im: -a.im });
const mul = (a: Cx, b: Cx): Cx => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

function div(a: Cx, b: Cx): Cx {
  const n = b.re * b.re + b.im * b.im;
  if (n === 0) throw new Error("정답 수식에 0 으로 나누기가 있다");
  return {
    re: (a.re * b.re + a.im * b.im) / n,
    im: (a.im * b.re - a.re * b.im) / n,
  };
}

function cross(xs: Cx[], ys: Cx[], f: (x: Cx, y: Cx) => Cx[]): Cx[] {
  const out: Cx[] = [];
  for (const x of xs) for (const y of ys) out.push(...f(x, y));
  return out;
}

class Parser {
  private pos = 0;

  constructor(
    private readonly toks: Tok[],
    private readonly src: string,
  ) {}

  private fail(why: string): never {
    throw new Error(`정답 수식을 못 읽는다 — ${why} (${this.src})`);
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private take(k: Tok["k"]): void {
    const t = this.toks[this.pos];
    if (!t || t.k !== k) this.fail(`«${k}» 가 와야 할 자리`);
    this.pos += 1;
  }

  parseAll(): Cx[] {
    const v = this.expr();
    if (this.pos !== this.toks.length) this.fail("끝에 남은 조각");
    return v;
  }

  private expr(): Cx[] {
    let acc: Cx[];
    const first = this.peek();
    if (first?.k === "op") {
      this.pos += 1;
      const t = this.term();
      acc =
        first.v === "+"
          ? t
          : first.v === "-"
            ? t.map(neg)
            : t.flatMap((x) => [x, neg(x)]);
    } else {
      acc = this.term();
    }
    for (let t = this.peek(); t?.k === "op"; t = this.peek()) {
      this.pos += 1;
      const rhs = this.term();
      const op = t.v;
      acc = cross(acc, rhs, (a, b) =>
        op === "+"
          ? [add(a, b)]
          : op === "-"
            ? [add(a, neg(b))]
            : op === "pm"
              ? [add(a, b), add(a, neg(b))]
              : [add(a, neg(b)), add(a, b)],
      );
    }
    return acc;
  }

  private startsFactor(t: Tok | undefined): boolean {
    return (
      t !== undefined &&
      (t.k === "num" ||
        t.k === "i" ||
        t.k === "sqrt" ||
        t.k === "frac" ||
        t.k === "(")
    );
  }

  private term(): Cx[] {
    let acc = this.factor();
    while (this.startsFactor(this.peek())) {
      acc = cross(acc, this.factor(), (a, b) => [mul(a, b)]);
    }
    return acc;
  }

  private group(): Cx[] {
    this.take("{");
    const v = this.expr();
    this.take("}");
    return v;
  }

  private factor(): Cx[] {
    const t = this.peek();
    if (!t) this.fail("수가 와야 할 자리에서 끝났다");
    this.pos += 1;
    switch (t.k) {
      case "num":
        return [{ re: t.v, im: 0 }];
      case "i":
        return [{ re: 0, im: 1 }];
      case "sqrt":
        return this.group().map((x) => {
          if (x.im !== 0 || x.re < 0) this.fail("근호 안이 음수이거나 허수");
          return { re: Math.sqrt(x.re), im: 0 };
        });
      case "frac": {
        const top = this.group();
        const bottom = this.group();
        return cross(top, bottom, (a, b) => [div(a, b)]);
      }
      case "(": {
        const v = this.expr();
        this.take(")");
        return v;
      }
      default:
        return this.fail(`«${t.k}» 로 시작하는 수`);
    }
  }
}

/** 수식 몸통(`$` 없이)을 값으로 — `\pm` 이 있으면 값이 둘. */
export function readValues(tex: string): Cx[] {
  return new Parser(tokenize(tex), tex).parseAll();
}

/** 정답 `$…$` 한 덩어리를 값으로. 덩어리가 아니면 던진다. */
export function readAnswerValues(answer: string): Cx[] {
  const m = /^\$([^$]+)\$$/.exec(answer.trim());
  if (!m) throw new Error(`정답이 수식 한 덩어리가 아니다: ${answer}`);
  return readValues(m[1]!);
}

/** 두 값 묶음이 (순서 무관) 같은가. */
export function sameValues(
  a: readonly Cx[],
  b: readonly Cx[],
  eps = 1e-9,
): boolean {
  if (a.length !== b.length) return false;
  const sort = (xs: readonly Cx[]) =>
    [...xs].sort((p, q) => p.re - q.re || p.im - q.im);
  const sa = sort(a);
  const sb = sort(b);
  return sa.every(
    (x, i) =>
      Math.abs(x.re - sb[i]!.re) <= eps && Math.abs(x.im - sb[i]!.im) <= eps,
  );
}
